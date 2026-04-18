import { create } from 'zustand';

const useNetworkStore = create((set, get) => ({
  // ── Network State ──────────────────────────────────────────────────────────
  nodes: [],
  edges: [],
  selectedNode: null,
  activeRoute: null,        // { path, explanation, score, hops }
  particles: [],            // Active animated message particles
  sosActive: false,
  sosOverlayActive: false,  // Triggers full-screen red pulse
  sosRoutes: [],            // Routes from a SOS broadcast
  nodeFlashes: {},          // nodeId -> timestamp of last flash
  routeHistory: [],         // Last 5 routes for intel panel

  // ── Live Hop Tracking ─────────────────────────────────────────────────────
  // Tracks which hop is currently in-flight for a given message
  activeHopIndex: {},       // messageId -> current hop index
  messageHopPaths: {},      // messageId -> { path, isSOS, color, totalHops }
  currentHopStep: null,     // { messageId, fromId, toId, hopIndex, totalHops, isSOS }

  // ── AI Decision Reasoning ─────────────────────────────────────────────────
  aiDecisionLog: [],        // [ { timestamp, explanation, routePath, score, factors } ]
  showRouteTooltip: false,
  routeTooltipData: null,   // { explanation, selectedPath, rejectedCount, score }

  // ── System State ───────────────────────────────────────────────────────────
  isConnected: false,
  networkStatus: {
    total: 0,
    active: 0,
    degraded: 0,
    offline: 0,
    avgLatency: 0,
    avgSignal: 0,
    avgBattery: 0,
    edgeCount: 0,
    internetEnabled: true,
    healthScore: 100,
  },
  internetEnabled: true,

  // ── Logs ───────────────────────────────────────────────────────────────────
  logs: [],
  messages: [],

  // ── UI ─────────────────────────────────────────────────────────────────────
  simPanelOpen: true,

  // ── Node Actions ───────────────────────────────────────────────────────────
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  updateNode: (id, updates) => set(state => ({
    nodes: state.nodes.map(n => n.id === id ? { ...n, ...updates } : n),
  })),

  addNode: (node) => set(state => ({
    nodes: [...state.nodes.filter(n => n.id !== node.id), node],
  })),

  removeNode: (id) => set(state => ({
    nodes: state.nodes.filter(n => n.id !== id),
    edges: state.edges.filter(e => e.source !== id && e.target !== id),
  })),

  setFullNetwork: (data) => {
    const { nodes, edges, stats, internetEnabled } = data;
    set({
      nodes: nodes || [],
      edges: edges || [],
      internetEnabled: internetEnabled !== undefined ? internetEnabled : true,
      networkStatus: {
        total: stats?.total || 0,
        active: stats?.active || 0,
        degraded: stats?.degraded || 0,
        offline: stats?.offline || 0,
        avgLatency: stats?.avgLatency || 0,
        avgSignal: stats?.avgSignal || 0,
        avgBattery: stats?.avgBattery || 0,
        edgeCount: stats?.edgeCount || 0,
        internetEnabled: internetEnabled !== undefined ? internetEnabled : true,
        healthScore: get().networkStatus.healthScore,
      },
    });
  },

  setSelectedNode: (node) => set({ selectedNode: node }),
  clearSelectedNode: () => set({ selectedNode: null }),

  // ── Route / Messaging ──────────────────────────────────────────────────────
  setActiveRoute: (route) => {
    if (!route) {
      return set({
        activeRoute: null,
        showRouteTooltip: false,
        routeTooltipData: null,
        currentHopStep: null,
      });
    }

    // Build AI reasoning tooltip data
    const nodes = get().nodes;
    const routeNodes = route.path?.map(id => nodes.find(n => n.id === id)).filter(Boolean) || [];
    const avgLatency = routeNodes.length
      ? Math.round(routeNodes.reduce((s, n) => s + (n.latency || 30), 0) / routeNodes.length)
      : 30;
    const avgRel = routeNodes.length
      ? (routeNodes.reduce((s, n) => s + (n.reliability || 0.9), 0) / routeNodes.length)
      : 0.9;

    const factors = [];
    if (avgLatency < 35) factors.push('low latency');
    if (avgRel > 0.85) factors.push('high reliability');
    if (route.hops <= 2) factors.push('minimal hops');
    if (route.score > 0.8) factors.push('optimal composite score');

    const tooltipExplanation = factors.length > 0
      ? `Selected path due to ${factors.join(' and ')} (${avgLatency}ms, ${(avgRel * 100).toFixed(0)}% reliable)`
      : route.explanation || `Route selected via AI scoring. Score: ${route.score?.toFixed(3)}`;

    set({
      activeRoute: route,
      showRouteTooltip: true,
      routeTooltipData: {
        explanation: tooltipExplanation,
        selectedPath: route.path,
        hops: route.hops,
        score: route.score,
        avgLatency,
        avgReliability: avgRel,
        factors,
      },
    });

    // Auto-hide tooltip after 8 seconds
    setTimeout(() => {
      if (get().activeRoute === route) {
        set({ showRouteTooltip: false });
      }
    }, 8000);
  },

  clearActiveRoute: () => set({
    activeRoute: null,
    showRouteTooltip: false,
    routeTooltipData: null,
    currentHopStep: null,
  }),

  // ── Particles (message animation) ─────────────────────────────────────────
  addParticle: (particle) => set(state => ({
    particles: [...state.particles, { ...particle, createdAt: Date.now() }],
  })),
  removeParticle: (id) => set(state => ({
    particles: state.particles.filter(p => p.id !== id),
  })),
  clearParticles: () => set({ particles: [] }),

  // ── Live Hop Step Tracking ─────────────────────────────────────────────────
  setCurrentHopStep: (step) => set({ currentHopStep: step }),
  clearCurrentHopStep: () => set({ currentHopStep: null }),

  setMessageHopPath: (messageId, hopData) => set(state => ({
    messageHopPaths: { ...state.messageHopPaths, [messageId]: hopData },
  })),
  clearMessageHopPath: (messageId) => set(state => {
    const paths = { ...state.messageHopPaths };
    delete paths[messageId];
    return { messageHopPaths: paths };
  }),

  // ── SOS ───────────────────────────────────────────────────────────────────
  setSosActive: (active) => set({ sosActive: active }),
  setSosOverlayActive: (active) => set({ sosOverlayActive: active }),
  setSosRoutes: (routes) => set({ sosRoutes: routes }),
  addSosRoute: (route) => set(state => ({
    sosRoutes: [...state.sosRoutes, route],
  })),

  // ── Node Flash ────────────────────────────────────────────────────────────
  flashNode: (nodeId) => set(state => ({
    nodeFlashes: { ...state.nodeFlashes, [nodeId]: Date.now() },
  })),
  clearNodeFlash: (nodeId) => set(state => {
    const flashes = { ...state.nodeFlashes };
    delete flashes[nodeId];
    return { nodeFlashes: flashes };
  }),

  // ── Route History ─────────────────────────────────────────────────────────
  addRouteToHistory: (route) => set(state => ({
    routeHistory: [route, ...state.routeHistory].slice(0, 5),
  })),

  // ── AI Decision Log ───────────────────────────────────────────────────────
  addAiDecision: (decision) => set(state => ({
    aiDecisionLog: [
      { ...decision, timestamp: Date.now() },
      ...state.aiDecisionLog,
    ].slice(0, 10),
  })),

  // ── Connection ────────────────────────────────────────────────────────────
  setConnected: (isConnected) => set({ isConnected }),
  setInternetEnabled: (internetEnabled) => set({ internetEnabled }),

  // ── Logs ──────────────────────────────────────────────────────────────────
  addLog: (log) => set(state => ({
    logs: [{ ...log, id: log.id || Date.now() }, ...state.logs].slice(0, 150),
  })),
  addMessage: (message) => set(state => ({
    messages: [message, ...state.messages].slice(0, 100),
  })),
  setMessages: (messages) => set({ messages }),

  // ── Derived ───────────────────────────────────────────────────────────────
  getNodeById: (id) => get().nodes.find(n => n.id === id) || null,
  getEdgesForNode: (id) => get().edges.filter(e => e.source === id || e.target === id),

  // ── UI ────────────────────────────────────────────────────────────────────
  toggleSimPanel: () => set(state => ({ simPanelOpen: !state.simPanelOpen })),
}));

export default useNetworkStore;
