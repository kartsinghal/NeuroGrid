/**
 * NeuroGrid AI — Simulation Engine
 * Drives the living network: battery drain, signal fluctuation,
 * random node failures, self-healing, and storm events.
 */

const { NodeStatus } = require('../../../shared/nodeTypes');
const { SIMULATION } = require('../../../shared/config');
const nodeManager = require('./NodeManager');

class SimulationEngine {
  constructor() {
    this.running = false;
    this.tickInterval = null;
    this.tickCount = 0;
    this.eventEmitter = null; // Set via setEventEmitter()
    this.slowMode = process.env.SIMULATION_SLOW_MODE === 'true';
    this.tickMs = this.slowMode ? SIMULATION.TICK_INTERVAL_MS * 3 : SIMULATION.TICK_INTERVAL_MS;
  }

  /** Inject event system after creation (avoids circular deps) */
  setEventEmitter(emitter) {
    this.eventEmitter = emitter;
  }

  /** Start the simulation loop */
  start() {
    if (this.running) return;
    this.running = true;
    this.tickInterval = setInterval(() => this.tick(), this.tickMs);
    console.log(`⚙️  [SimEngine] Started — tick every ${this.tickMs}ms`);
  }

  /** Stop the simulation loop */
  stop() {
    if (this.tickInterval) clearInterval(this.tickInterval);
    this.running = false;
    console.log('⏹️  [SimEngine] Stopped');
  }

  /** Called every tick — runs all simulation steps */
  tick() {
    this.tickCount++;
    const nodes = nodeManager.getAllNodes();
    const changedNodes = [];

    nodes.forEach(node => {
      if (node.status === NodeStatus.OFFLINE) {
        // Attempt self-healing
        if (Math.random() < SIMULATION.SELF_HEAL_CHANCE) {
          const recovered = nodeManager.recoverNode(node.id);
          if (recovered) {
            changedNodes.push({ node: recovered, event: 'recovered' });
          }
        }
        return;
      }

      // Battery drain
      const drainAmount = SIMULATION.BATTERY_DRAIN_RATE * (node.role === 'gateway' ? 0.6 : 1);
      const drained = nodeManager.drainBattery(node.id, drainAmount);
      if (drained) {
        // Check if node just went offline from battery depletion
        if (drained.status === NodeStatus.OFFLINE && node.status !== NodeStatus.OFFLINE) {
          changedNodes.push({ node: drained, event: 'failed', reason: 'battery_depleted' });
          return;
        }
      }

      // Signal fluctuation
      const fluctuated = nodeManager.fluctuateSignal(node.id, SIMULATION.SIGNAL_FLUCTUATION);

      // Random failure (only occurs every 5 ticks to avoid chaos)
      if (this.tickCount % 5 === 0 && Math.random() < SIMULATION.NODE_FAIL_CHANCE) {
        if (node.status !== NodeStatus.OFFLINE) {
          const failed = nodeManager.failNode(node.id);
          if (failed) {
            changedNodes.push({ node: failed, event: 'failed', reason: 'random_failure' });
            return;
          }
        }
      }

      // Push updated node (battery + signal changes)
      const latestNode = nodeManager.getNode(node.id);
      if (latestNode) changedNodes.push({ node: latestNode, event: 'update' });
    });

    // Emit events for all changed nodes
    if (this.eventEmitter) {
      changedNodes.forEach(({ node, event, reason }) => {
        if (event === 'failed') {
          this.eventEmitter.emitNodeFailed(node, reason || 'simulation');
        } else if (event === 'recovered') {
          this.eventEmitter.emitNodeRecovered(node);
        } else {
          this.eventEmitter.emitNodeUpdate(node);
        }
      });

      // Broadcast full network state every 5 ticks
      if (this.tickCount % 5 === 0) {
        this.eventEmitter.emitNetworkState();
      }
    }
  }

  // ── Manual Simulation Actions ──────────────────────────────────────────────

  /** Manually fail a specific node */
  failNode(nodeId) {
    const node = nodeManager.getNode(nodeId);
    if (!node || node.status === NodeStatus.OFFLINE) {
      return { success: false, message: 'Node not found or already offline' };
    }
    const failed = nodeManager.failNode(nodeId);
    this.eventEmitter?.emitNodeFailed(failed, 'manual');
    return { success: true, node: failed };
  }

  /** Manually recover a failed node */
  recoverNode(nodeId) {
    const node = nodeManager.getNode(nodeId);
    if (!node || node.status !== NodeStatus.OFFLINE) {
      return { success: false, message: 'Node not found or not offline' };
    }
    const recovered = nodeManager.recoverNode(nodeId);
    if (recovered) {
      this.eventEmitter?.emitNodeRecovered(recovered);
      return { success: true, node: recovered };
    }
    return { success: false, message: 'Recovery failed' };
  }

  /** Set signal strength for a node */
  setNodeSignal(nodeId, signal) {
    const s = Math.min(1, Math.max(0, signal));
    const node = nodeManager.updateNode(nodeId, { signalStrength: s });
    if (node) {
      this.eventEmitter?.emitNodeUpdate(node);
      return { success: true, node };
    }
    return { success: false, message: 'Node not found' };
  }

  /** Set battery level for a node */
  setNodeBattery(nodeId, battery) {
    const b = Math.min(100, Math.max(0, battery));
    const newStatus = b <= 0 ? NodeStatus.OFFLINE : b <= 10 ? NodeStatus.DEGRADED : NodeStatus.ACTIVE;
    const node = nodeManager.updateNode(nodeId, { battery: b, status: newStatus });
    if (node) {
      this.eventEmitter?.emitNodeUpdate(node);
      return { success: true, node };
    }
    return { success: false, message: 'Node not found' };
  }

  /** Trigger a "storm" — fail multiple random nodes */
  triggerStorm() {
    const nodes = nodeManager.getAllNodes().filter(n => n.status !== NodeStatus.OFFLINE);
    const count = Math.max(1, Math.floor(nodes.length * 0.3));
    const shuffled = nodes.sort(() => Math.random() - 0.5).slice(0, count);
    const failed = [];

    shuffled.forEach(node => {
      const f = nodeManager.failNode(node.id);
      if (f) {
        failed.push(f);
        this.eventEmitter?.emitNodeFailed(f, 'storm');
      }
    });

    console.log(`🌩️  [SimEngine] Storm triggered — ${failed.length} nodes failed`);
    this.eventEmitter?.emitNetworkState();
    return { success: true, failedCount: failed.length, nodes: failed };
  }

  /** Toggle internet on/off */
  toggleInternet() {
    const state = nodeManager.toggleInternet();
    this.eventEmitter?.emitInternetToggle(state);
    return { success: true, internetEnabled: state };
  }

  /** Add a new node to the network */
  addNode(data) {
    const node = nodeManager.addNode(data);
    this.eventEmitter?.emitNodeAdded(node);
    this.eventEmitter?.emitNetworkState();
    return { success: true, node };
  }

  /** Remove a node from the network */
  removeNode(nodeId) {
    const node = nodeManager.getNode(nodeId);
    if (!node) return { success: false, message: 'Node not found' };
    nodeManager.removeNode(nodeId);
    this.eventEmitter?.emitNodeRemoved(nodeId);
    this.eventEmitter?.emitNetworkState();
    return { success: true };
  }

  /** Full network reset */
  resetNetwork() {
    const state = nodeManager.resetNetwork();
    this.eventEmitter?.emitNetworkState();
    return { success: true, state };
  }
}

// Singleton
const simulationEngine = new SimulationEngine();
module.exports = simulationEngine;
