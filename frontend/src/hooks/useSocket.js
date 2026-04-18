import { useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import useNetworkStore from '../store/networkStore';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

// Singleton socket
let socket = null;

export function useSocket() {
  const {
    setFullNetwork,
    updateNode,
    addNode,
    removeNode,
    addLog,
    setActiveRoute,
    addParticle,
    removeParticle,
    addMessage,
    setMessages,
    setSosActive,
    setSosOverlayActive,
    setSosRoutes,
    addSosRoute,
    setConnected,
    setInternetEnabled,
    addRouteToHistory,
    flashNode,
    setCurrentHopStep,
    clearCurrentHopStep,
    setMessageHopPath,
    clearMessageHopPath,
    addAiDecision,
  } = useNetworkStore();

  const particleTimers = useRef(new Map());
  const hopStepTimers  = useRef(new Map());

  useEffect(() => {
    // Initialize socket once
    if (!socket) {
      socket = io(BACKEND_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: Infinity,
        timeout: 10000,
      });
    }

    // ── Connect / Disconnect ─────────────────────────────────────────────────
    const onConnect = () => {
      setConnected(true);
      addLog({ level: 'system', message: '🔗 Connected to NeuroGrid command server', timestamp: new Date().toISOString() });
    };

    const onDisconnect = (reason) => {
      setConnected(false);
      addLog({ level: 'warning', message: `⚠️ Connection lost (${reason}) — reconnecting...`, timestamp: new Date().toISOString() });
    };

    const onReconnect = () => {
      setConnected(true);
      addLog({ level: 'success', message: '✅ Reconnected to server', timestamp: new Date().toISOString() });
    };

    // ── Network State ────────────────────────────────────────────────────────
    const onNetworkState = (data) => {
      setFullNetwork(data);
    };

    // ── Node Events ──────────────────────────────────────────────────────────
    const onNodeUpdate = (node) => updateNode(node.id, node);

    const onNodeFailed = (data) => {
      updateNode(data.nodeId, { status: 'offline', signalStrength: 0 });
      addLog({ level: 'error', message: `💀 ${data.nodeName} went offline (${data.reason || 'failure'})`, timestamp: data.timestamp });
    };

    const onNodeRecovered = (data) => {
      updateNode(data.nodeId, data.node);
      flashNode(data.nodeId); // Flash on recovery
      addLog({ level: 'success', message: `💚 Self-heal: ${data.nodeName} recovered`, timestamp: data.timestamp });
    };

    const onNodeAdded = (data) => {
      addNode(data.node);
      addLog({ level: 'info', message: `➕ Node ${data.node.name} joined the network`, timestamp: data.timestamp });
    };

    const onNodeRemoved = (data) => {
      removeNode(data.nodeId);
      addLog({ level: 'info', message: `➖ Node removed from network`, timestamp: data.timestamp });
    };

    // ── Route Events ─────────────────────────────────────────────
    const onRouteSelected = (route) => {
      setActiveRoute(route);
      addRouteToHistory({ ...route, timestamp: Date.now() });

      // Log AI reasoning
      addAiDecision({
        explanation: route.explanation,
        routePath: route.path,
        score: route.score,
        hops: route.hops,
      });

      if (route.explanation) {
        addLog({ level: 'info', message: route.explanation, timestamp: new Date().toISOString() });
      }

      // Clear route highlight after 10 seconds
      setTimeout(() => setActiveRoute(null), 10000);
    };

    // ── Message Events ──────────────────────────────────────────
    const onMessageSent = (message) => {
      addMessage(message);

      if (!message.route?.path || message.route.path.length < 2) return;

      const path = message.route.path;
      const isSOS  = message.type === 'sos';
      const color  = isSOS ? '#ff0040' : '#00f5ff';
      const hopDelay   = isSOS ? 350 : 580;  // ms between hops
      const travelMs   = isSOS ? 550 : 750;  // ms for single hop travel

      // Store path metadata for hop indicator
      setMessageHopPath(message.id, {
        path,
        isSOS,
        color,
        totalHops: path.length - 1,
        label: message.content?.slice(0, 24) || 'MESSAGE',
      });

      // Animate a particle per hop with staggered delay
      path.forEach((nodeId, i) => {
        if (i >= path.length - 1) return;
        const delay     = i * (hopDelay + travelMs / 2);
        const particleId = `${message.id}-hop-${i}`;

        // Hop step indicator timer
        const hopTimer = setTimeout(() => {
          setCurrentHopStep({
            messageId: message.id,
            fromId: nodeId,
            toId: path[i + 1],
            hopIndex: i,
            totalHops: path.length - 1,
            isSOS,
            color,
          });
        }, delay);
        hopStepTimers.current.set(`hop-${message.id}-${i}`, hopTimer);

        const timer = setTimeout(() => {
          addParticle({
            id: particleId,
            source: nodeId,
            target: path[i + 1],
            color,
            isSOS,
            progress: 0,
          });

          // Flash destination node when particle arrives
          setTimeout(() => flashNode(path[i + 1]), travelMs);

          // Auto-remove particle after animation
          const removeTimer = setTimeout(() => {
            removeParticle(particleId);
          }, travelMs + 200);
          particleTimers.current.set(`rm-${particleId}`, removeTimer);
        }, delay);

        particleTimers.current.set(particleId, timer);
      });

      // Clear hop step after all hops complete
      const totalDuration = (path.length - 1) * (hopDelay + travelMs / 2) + travelMs + 400;
      const clearTimer = setTimeout(() => {
        clearCurrentHopStep();
        clearMessageHopPath(message.id);
      }, totalDuration);
      hopStepTimers.current.set(`clear-${message.id}`, clearTimer);
    };

    // ── SOS Events ─────────────────────────────────────────────
    const onSOSTriggered = (data) => {
      setSosActive(true);
      setSosOverlayActive(true);     // Flash entire UI red
      setSosRoutes(data.routes || []);
      addLog({ level: 'sos', message: `🚨 SOS from ${data.sourceName} — ${data.totalReachable} nodes reachable`, timestamp: data.timestamp });
      // Turn off overlay flash after 4.5s
      setTimeout(() => setSosOverlayActive(false), 4500);
    };

    const onSOSPropagating = (data) => {
      addSosRoute(data.route);
      // Trigger particle along this SOS route
      if (data.route?.path?.length > 0) {
        const path = data.route.path;
        const hopDelay  = 320;
        const travelMs  = 500;

        path.forEach((nodeId, i) => {
          if (i >= path.length - 1) return;
          const particleId = `sos-${data.sosId}-r${data.hopIndex}-h${i}`;
          const delay = i * (hopDelay + travelMs / 2);

          setTimeout(() => {
            // Show hop step for SOS
            setCurrentHopStep({
              messageId: `sos-${data.sosId}`,
              fromId: nodeId,
              toId: path[i + 1],
              hopIndex: i,
              totalHops: path.length - 1,
              isSOS: true,
              color: '#ff0040',
            });

            addParticle({ id: particleId, source: nodeId, target: path[i + 1], color: '#ff0040', isSOS: true });
            setTimeout(() => flashNode(path[i + 1]), travelMs);
            setTimeout(() => removeParticle(particleId), travelMs + 200);
          }, delay);
        });

        // Clear hop step after SOS propagation
        const totalDuration = path.length * (hopDelay + travelMs / 2) + travelMs + 500;
        setTimeout(() => clearCurrentHopStep(), totalDuration);
      }
    };

    const onSOSComplete = () => {
      setTimeout(() => {
        setSosActive(false);
        setSosRoutes([]);
        clearCurrentHopStep();
      }, 3000);
    };

    // ── Logs ─────────────────────────────────────────────────────────────────
    const onLogEntry = (log) => addLog(log);
    const onMessageHistory = (messages) => setMessages(messages);

    // ── Internet Toggle ───────────────────────────────────────────────────────
    const onInternetToggle = (data) => {
      setInternetEnabled(data.enabled);
      addLog({
        level: data.enabled ? 'success' : 'warning',
        message: data.enabled ? '🌐 Internet uplink restored' : '📡 Mesh-only mode — internet offline',
        timestamp: new Date().toISOString(),
      });
    };

    // ── Register Listeners ───────────────────────────────────────────────────
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('reconnect', onReconnect);
    socket.on('network:state', onNetworkState);
    socket.on('node:update', onNodeUpdate);
    socket.on('node:failed', onNodeFailed);
    socket.on('node:recovered', onNodeRecovered);
    socket.on('node:added', onNodeAdded);
    socket.on('node:removed', onNodeRemoved);
    socket.on('route:selected', onRouteSelected);
    socket.on('message:sent', onMessageSent);
    socket.on('sos:triggered', onSOSTriggered);
    socket.on('sos:propagating', onSOSPropagating);
    socket.on('sos:complete', onSOSComplete);
    socket.on('log:entry', onLogEntry);
    socket.on('message:history', onMessageHistory);
    socket.on('internet:toggle', onInternetToggle);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('reconnect', onReconnect);
      socket.off('network:state', onNetworkState);
      socket.off('node:update', onNodeUpdate);
      socket.off('node:failed', onNodeFailed);
      socket.off('node:recovered', onNodeRecovered);
      socket.off('node:added', onNodeAdded);
      socket.off('node:removed', onNodeRemoved);
      socket.off('route:selected', onRouteSelected);
      socket.off('message:sent', onMessageSent);
      socket.off('sos:triggered', onSOSTriggered);
      socket.off('sos:propagating', onSOSPropagating);
      socket.off('sos:complete', onSOSComplete);
      socket.off('log:entry', onLogEntry);
      socket.off('message:history', onMessageHistory);
      socket.off('internet:toggle', onInternetToggle);
    };
  }, []);

  // ── Emit Helpers ────────────────────────────────────────────────────────────
  const sendMessage = useCallback((sourceId, targetId, content, type = 'normal') => {
    socket?.emit('message:send', {
      sourceId, targetId, content, type,
      messageId: `msg-${Date.now()}`,
    });
  }, []);

  const triggerSOS = useCallback((nodeId) => {
    socket?.emit('sos:triggered', { nodeId, content: '🚨 EMERGENCY SOS — All units respond immediately!' });
  }, []);

  const simulateAction = useCallback((type, payload = {}) => {
    socket?.emit('simulate:action', { type, payload });
  }, []);

  const getSocket = useCallback(() => socket, []);

  return { sendMessage, triggerSOS, simulateAction, getSocket };
}
