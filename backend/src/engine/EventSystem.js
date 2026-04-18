/**
 * NeuroGrid AI — Event System
 * Central Socket.IO broadcast hub.
 * Bridges the simulation engine / routing engine to connected WebSocket clients.
 */

const { v4: uuidv4 } = require('uuid');
const { EVENTS } = require('../../../shared/config');
const { NodeStatus, MessageType, LogLevel } = require('../../../shared/nodeTypes');
const nodeManager = require('./NodeManager');
const routingEngine = require('./RoutingEngine');

class EventSystem {
  /**
   * @param {import('socket.io').Server} io - Socket.IO server instance
   */
  constructor(io) {
    this.io = io;
    this.messageHistory = []; // In-memory log (synced to DB when available)
  }

  // ── Server → Client Emitters ───────────────────────────────────────────────

  emitNodeUpdate(node) {
    this.io.emit(EVENTS.NODE_UPDATE, node);
  }

  emitNodeFailed(node, reason = 'unknown') {
    console.log(`💀 [Event] Node failed: ${node.name} (${reason})`);
    this.io.emit(EVENTS.NODE_FAILED, {
      nodeId: node.id,
      nodeName: node.name,
      reason,
      timestamp: new Date().toISOString(),
      node,
    });
    this._addLog(LogLevel.ERROR, `Node ${node.name} went offline (${reason})`);
  }

  emitNodeRecovered(node) {
    console.log(`💚 [Event] Node recovered: ${node.name}`);
    this.io.emit(EVENTS.NODE_RECOVERED, {
      nodeId: node.id,
      nodeName: node.name,
      node,
      timestamp: new Date().toISOString(),
    });
    this._addLog(LogLevel.SUCCESS, `Self-healing: Node ${node.name} recovered`);
  }

  emitNodeAdded(node) {
    this.io.emit(EVENTS.NODE_ADDED, { node, timestamp: new Date().toISOString() });
    this._addLog(LogLevel.INFO, `Node ${node.name} joined the network`);
  }

  emitNodeRemoved(nodeId) {
    this.io.emit(EVENTS.NODE_REMOVED, { nodeId, timestamp: new Date().toISOString() });
  }

  emitNetworkState() {
    const state = nodeManager.getFullNetworkState();
    this.io.emit(EVENTS.NETWORK_STATE, state);
  }

  emitInternetToggle(enabled) {
    this.io.emit(EVENTS.INTERNET_TOGGLE, { enabled, timestamp: new Date().toISOString() });
    this._addLog(
      enabled ? LogLevel.SUCCESS : LogLevel.WARNING,
      enabled ? 'Internet uplink restored — mesh backup deactivated' : 'Internet uplink DOWN — mesh-only mode active'
    );
  }

  emitRouteSelected(routeData) {
    this.io.emit(EVENTS.ROUTE_SELECTED, routeData);
  }

  emitMessageSent(messageData) {
    this.io.emit(EVENTS.MESSAGE_SENT, messageData);
  }

  emitSOSPropagating(data) {
    this.io.emit(EVENTS.SOS_PROPAGATING, data);
  }

  emitSOSComplete(data) {
    this.io.emit(EVENTS.SOS_COMPLETE, data);
  }

  // ── Client → Server Handlers ───────────────────────────────────────────────

  /**
   * Attach all socket event listeners for a new client connection.
   * @param {import('socket.io').Socket} socket
   */
  handleConnection(socket) {
    console.log(`🔌 [Socket] Client connected: ${socket.id}`);

    // Send immediate network state snapshot on connect
    socket.emit(EVENTS.NETWORK_STATE, nodeManager.getFullNetworkState());
    // Send message history
    socket.emit('message:history', this.messageHistory.slice(-50));

    // ── Send Message ───────────────────────────────────────────────────────
    socket.on('message:send', (data) => {
      try {
        const { sourceId, targetId, content, type = MessageType.NORMAL } = data;
        const nodes = nodeManager.getAllNodes();
        const edges = nodeManager.getActiveEdges();

        const route = routingEngine.findOptimalRoute(nodes, edges, sourceId, targetId);

        if (!route.feasible) {
          socket.emit('message:error', { error: route.explanation, messageId: data.messageId });
          return;
        }

        const message = {
          id: uuidv4(),
          sourceId,
          targetId,
          content,
          type,
          route,
          timestamp: new Date().toISOString(),
          status: 'delivered',
        };

        this.messageHistory.push(message);
        if (this.messageHistory.length > 200) this.messageHistory.shift();

        this.emitRouteSelected(route);
        this.emitMessageSent(message);

        this._addLog(
          LogLevel.INFO,
          `Message routed: ${route.sourceName} → ${route.targetName} (${route.hops} hops)`
        );
      } catch (err) {
        console.error('[Event] message:send error:', err);
        socket.emit('message:error', { error: 'Internal routing error' });
      }
    });

    // ── SOS Broadcast ──────────────────────────────────────────────────────
    socket.on(EVENTS.SOS_TRIGGERED, async (data) => {
      try {
        const { nodeId, content = 'EMERGENCY SOS — All units respond!' } = data;
        const nodes = nodeManager.getAllNodes();
        const edges = nodeManager.getActiveEdges();
        const sourceNode = nodeManager.getNode(nodeId);

        if (!sourceNode) {
          socket.emit('error', { error: 'SOS source node not found' });
          return;
        }

        console.log(`🚨 [SOS] Triggered from ${sourceNode.name}`);

        // Find routes to all other nodes
        const allRoutes = routingEngine.findAllRoutes(nodes, edges, nodeId);

        const sosMessage = {
          id: uuidv4(),
          sourceId: nodeId,
          sourceName: sourceNode.name,
          content,
          type: MessageType.SOS,
          routes: allRoutes,
          timestamp: new Date().toISOString(),
          totalReachable: allRoutes.length,
        };

        // Emit SOS propagating with sequential hop animations
        this.io.emit(EVENTS.SOS_TRIGGERED, sosMessage);

        // Stagger SOS route emissions for visual effect
        allRoutes.slice(0, 8).forEach((route, idx) => {
          setTimeout(() => {
            this.emitSOSPropagating({
              sosId: sosMessage.id,
              route,
              hopIndex: idx,
            });
          }, idx * 300);
        });

        setTimeout(() => {
          this.emitSOSComplete({ sosId: sosMessage.id, totalReached: allRoutes.length });
        }, allRoutes.slice(0, 8).length * 300 + 500);

        this.messageHistory.push(sosMessage);
        this._addLog(LogLevel.SOS, `🚨 SOS from ${sourceNode.name} — ${allRoutes.length} nodes reachable`);
      } catch (err) {
        console.error('[Event] sos:triggered error:', err);
      }
    });

    // ── Simulation Actions ─────────────────────────────────────────────────
    socket.on(EVENTS.SIMULATE_ACTION, (action) => {
      try {
        const simEngine = require('./SimulationEngine');
        const { type, payload } = action;

        let result;
        switch (type) {
          case 'FAIL_NODE':       result = simEngine.failNode(payload.nodeId); break;
          case 'RECOVER_NODE':    result = simEngine.recoverNode(payload.nodeId); break;
          case 'ADD_NODE':        result = simEngine.addNode(payload); break;
          case 'REMOVE_NODE':     result = simEngine.removeNode(payload.nodeId); break;
          case 'SET_SIGNAL':      result = simEngine.setNodeSignal(payload.nodeId, payload.signal); break;
          case 'SET_BATTERY':     result = simEngine.setNodeBattery(payload.nodeId, payload.battery); break;
          case 'TOGGLE_INTERNET': result = simEngine.toggleInternet(); break;
          case 'TRIGGER_STORM':   result = simEngine.triggerStorm(); break;
          case 'RESET_NETWORK':   result = simEngine.resetNetwork(); break;
          default:
            socket.emit('simulate:error', { error: `Unknown action: ${type}` });
            return;
        }

        socket.emit('simulate:result', { type, result });
      } catch (err) {
        console.error('[Event] simulate:action error:', err);
        socket.emit('simulate:error', { error: 'Simulation action failed' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔌 [Socket] Client disconnected: ${socket.id}`);
    });
  }

  // ── Internal Helpers ───────────────────────────────────────────────────────

  _addLog(level, message) {
    const log = { id: uuidv4(), level, message, timestamp: new Date().toISOString() };
    this.io.emit('log:entry', log);
  }
}

module.exports = EventSystem;
