/**
 * NeuroGrid AI — Node Manager
 * Core in-memory store with MongoDB sync.
 * Manages network topology: nodes + edges.
 */

const { v4: uuidv4 } = require('uuid');
const { NodeStatus, NodeRole } = require('../../../shared/nodeTypes');

// ─── Initial Seed Topology ────────────────────────────────────────────────────
const SEED_NODES = [
  {
    id: 'node-alpha',
    name: 'Alpha Base',
    role: NodeRole.GATEWAY,
    status: NodeStatus.ACTIVE,
    battery: 95,
    signalStrength: 0.92,
    reliability: 0.97,
    latency: 11,
    x: 420, y: 280,
    description: 'Primary command gateway with satellite uplink',
  },
  {
    id: 'node-beta',
    name: 'Beta Relay',
    role: NodeRole.RELAY,
    status: NodeStatus.ACTIVE,
    battery: 78,
    signalStrength: 0.85,
    reliability: 0.88,
    latency: 18,
    x: 640, y: 190,
    description: 'High-altitude relay tower, sector 2',
  },
  {
    id: 'node-gamma',
    name: 'Gamma Hub',
    role: NodeRole.RELAY,
    status: NodeStatus.ACTIVE,
    battery: 62,
    signalStrength: 0.76,
    reliability: 0.82,
    latency: 27,
    x: 720, y: 380,
    description: 'Central mesh hub connecting east sector',
  },
  {
    id: 'node-delta',
    name: 'Delta Field',
    role: NodeRole.ENDPOINT,
    status: NodeStatus.ACTIVE,
    battery: 45,
    signalStrength: 0.68,
    reliability: 0.75,
    latency: 36,
    x: 520, y: 490,
    description: 'Field rescue team device, sector 4',
  },
  {
    id: 'node-epsilon',
    name: 'Epsilon Mesh',
    role: NodeRole.RELAY,
    status: NodeStatus.ACTIVE,
    battery: 88,
    signalStrength: 0.91,
    reliability: 0.93,
    latency: 14,
    x: 290, y: 440,
    description: 'West sector mesh relay with amplified antenna',
  },
  {
    id: 'node-zeta',
    name: 'Zeta Point',
    role: NodeRole.ENDPOINT,
    status: NodeStatus.DEGRADED,
    battery: 24,
    signalStrength: 0.52,
    reliability: 0.61,
    latency: 52,
    x: 180, y: 190,
    description: 'Remote endpoint — low battery warning',
  },
  {
    id: 'node-eta',
    name: 'Eta Sector',
    role: NodeRole.RELAY,
    status: NodeStatus.ACTIVE,
    battery: 71,
    signalStrength: 0.81,
    reliability: 0.86,
    latency: 22,
    x: 560, y: 340,
    description: 'Central sector relay with redundant links',
  },
  {
    id: 'node-theta',
    name: 'Theta Net',
    role: NodeRole.GATEWAY,
    status: NodeStatus.ACTIVE,
    battery: 91,
    signalStrength: 0.89,
    reliability: 0.94,
    latency: 13,
    x: 350, y: 140,
    description: 'Secondary gateway — backup internet access point',
  },
  {
    id: 'node-iota',
    name: 'Iota Drone',
    role: NodeRole.SATELLITE,
    status: NodeStatus.ACTIVE,
    battery: 55,
    signalStrength: 0.95,
    reliability: 0.90,
    latency: 8,
    x: 480, y: 100,
    description: 'Aerial drone relay — wide coverage, mobile',
  },
  {
    id: 'node-kappa',
    name: 'Kappa Forward',
    role: NodeRole.ENDPOINT,
    status: NodeStatus.ACTIVE,
    battery: 67,
    signalStrength: 0.73,
    reliability: 0.78,
    latency: 31,
    x: 800, y: 260,
    description: 'Forward operating base, eastern perimeter',
  },
];

const SEED_EDGES = [
  { id: 'e-1',  source: 'node-alpha',   target: 'node-theta',   signalStrength: 0.90, latency: 12 },
  { id: 'e-2',  source: 'node-alpha',   target: 'node-epsilon', signalStrength: 0.85, latency: 16 },
  { id: 'e-3',  source: 'node-alpha',   target: 'node-eta',     signalStrength: 0.88, latency: 15 },
  { id: 'e-4',  source: 'node-theta',   target: 'node-iota',    signalStrength: 0.92, latency: 10 },
  { id: 'e-5',  source: 'node-theta',   target: 'node-beta',    signalStrength: 0.84, latency: 18 },
  { id: 'e-6',  source: 'node-iota',    target: 'node-beta',    signalStrength: 0.95, latency: 9  },
  { id: 'e-7',  source: 'node-beta',    target: 'node-gamma',   signalStrength: 0.80, latency: 22 },
  { id: 'e-8',  source: 'node-beta',    target: 'node-kappa',   signalStrength: 0.78, latency: 25 },
  { id: 'e-9',  source: 'node-gamma',   target: 'node-kappa',   signalStrength: 0.76, latency: 28 },
  { id: 'e-10', source: 'node-gamma',   target: 'node-eta',     signalStrength: 0.82, latency: 20 },
  { id: 'e-11', source: 'node-gamma',   target: 'node-delta',   signalStrength: 0.72, latency: 33 },
  { id: 'e-12', source: 'node-eta',     target: 'node-delta',   signalStrength: 0.77, latency: 28 },
  { id: 'e-13', source: 'node-epsilon', target: 'node-delta',   signalStrength: 0.80, latency: 24 },
  { id: 'e-14', source: 'node-epsilon', target: 'node-zeta',    signalStrength: 0.56, latency: 48 },
  { id: 'e-15', source: 'node-theta',   target: 'node-zeta',    signalStrength: 0.60, latency: 44 },
  { id: 'e-16', source: 'node-alpha',   target: 'node-iota',    signalStrength: 0.93, latency: 11 },
];

// ─── Node Manager Class ───────────────────────────────────────────────────────
class NodeManager {
  constructor() {
    this.nodes = new Map();
    this.edges = new Map();
    this.internetEnabled = true;
    this._seed();
  }

  _seed() {
    SEED_NODES.forEach(n => this.nodes.set(n.id, { ...n, createdAt: new Date(), updatedAt: new Date() }));
    SEED_EDGES.forEach(e => this.edges.set(e.id, { ...e, createdAt: new Date() }));
    console.log(`🌐 [NodeManager] Seeded ${this.nodes.size} nodes, ${this.edges.size} edges`);
  }

  // ── Getters ────────────────────────────────────────────────────────────────

  getAllNodes() {
    return Array.from(this.nodes.values());
  }

  getAllEdges() {
    // Filter edges referencing offline nodes based on their endpoint status
    return Array.from(this.edges.values()).filter(edge => {
      const src = this.nodes.get(edge.source);
      const tgt = this.nodes.get(edge.target);
      return src && tgt; // Edge exists only if both nodes exist
    });
  }

  getActiveEdges() {
    return Array.from(this.edges.values()).filter(edge => {
      const src = this.nodes.get(edge.source);
      const tgt = this.nodes.get(edge.target);
      return src && tgt && src.status !== NodeStatus.OFFLINE && tgt.status !== NodeStatus.OFFLINE;
    });
  }

  getNode(id) {
    return this.nodes.get(id) || null;
  }

  getNetworkStats() {
    const nodes = this.getAllNodes();
    const active = nodes.filter(n => n.status === NodeStatus.ACTIVE);
    const degraded = nodes.filter(n => n.status === NodeStatus.DEGRADED);
    const offline = nodes.filter(n => n.status === NodeStatus.OFFLINE);

    return {
      total: nodes.length,
      active: active.length,
      degraded: degraded.length,
      offline: offline.length,
      avgLatency: active.length ? Math.round(active.reduce((s, n) => s + n.latency, 0) / active.length) : 0,
      avgSignal: active.length ? parseFloat((active.reduce((s, n) => s + n.signalStrength, 0) / active.length).toFixed(2)) : 0,
      avgBattery: active.length ? parseFloat((active.reduce((s, n) => s + n.battery, 0) / active.length).toFixed(1)) : 0,
      edgeCount: this.getActiveEdges().length,
      internetEnabled: this.internetEnabled,
    };
  }

  getFullNetworkState() {
    return {
      nodes: this.getAllNodes(),
      edges: this.getAllEdges(),
      stats: this.getNetworkStats(),
      internetEnabled: this.internetEnabled,
      timestamp: new Date().toISOString(),
    };
  }

  // ── Mutations ──────────────────────────────────────────────────────────────

  addNode(data) {
    const id = data.id || `node-${uuidv4().split('-')[0]}`;
    const node = {
      id,
      name: data.name || `Node ${id.slice(-4)}`,
      role: data.role || NodeRole.RELAY,
      status: NodeStatus.ACTIVE,
      battery: data.battery !== undefined ? data.battery : 100,
      signalStrength: data.signalStrength !== undefined ? data.signalStrength : 0.85,
      reliability: data.reliability !== undefined ? data.reliability : 0.88,
      latency: data.latency !== undefined ? data.latency : 20,
      x: data.x || Math.random() * 600 + 100,
      y: data.y || Math.random() * 400 + 100,
      description: data.description || 'Dynamically added node',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.nodes.set(id, node);

    // Auto-connect to nearest active nodes (up to 2)
    const activeNodes = this.getAllNodes().filter(n => n.status !== NodeStatus.OFFLINE && n.id !== id);
    const nearest = activeNodes
      .map(n => ({ node: n, dist: Math.hypot(n.x - node.x, n.y - node.y) }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 2);

    nearest.forEach(({ node: nearNode }) => {
      const edgeId = `e-${uuidv4().split('-')[0]}`;
      this.edges.set(edgeId, {
        id: edgeId,
        source: id,
        target: nearNode.id,
        signalStrength: data.signalStrength || 0.80,
        latency: data.latency || 25,
        createdAt: new Date(),
      });
    });

    return node;
  }

  updateNode(id, updates) {
    const node = this.nodes.get(id);
    if (!node) return null;
    const updated = { ...node, ...updates, updatedAt: new Date() };
    this.nodes.set(id, updated);
    return updated;
  }

  removeNode(id) {
    const node = this.nodes.get(id);
    if (!node) return false;
    this.nodes.delete(id);
    // Remove all edges connected to this node
    for (const [edgeId, edge] of this.edges.entries()) {
      if (edge.source === id || edge.target === id) {
        this.edges.delete(edgeId);
      }
    }
    return true;
  }

  failNode(id) {
    return this.updateNode(id, { status: NodeStatus.OFFLINE, signalStrength: 0 });
  }

  recoverNode(id) {
    const node = this.nodes.get(id);
    if (!node || node.status !== NodeStatus.OFFLINE) return null;
    return this.updateNode(id, {
      status: NodeStatus.DEGRADED,
      battery: Math.min(node.battery + 5, 30),
      signalStrength: 0.45,
      reliability: Math.max(node.reliability - 0.05, 0.5),
    });
  }

  toggleInternet() {
    this.internetEnabled = !this.internetEnabled;
    return this.internetEnabled;
  }

  setInternet(state) {
    this.internetEnabled = state;
    return this.internetEnabled;
  }

  resetNetwork() {
    this.nodes.clear();
    this.edges.clear();
    this._seed();
    return this.getFullNetworkState();
  }

  // ── Simulation Helpers ─────────────────────────────────────────────────────

  drainBattery(nodeId, amount) {
    const node = this.nodes.get(nodeId);
    if (!node || node.status === NodeStatus.OFFLINE) return null;
    const newBattery = Math.max(0, node.battery - amount);
    let newStatus = node.status;
    if (newBattery <= 0) newStatus = NodeStatus.OFFLINE;
    else if (newBattery <= 10) newStatus = NodeStatus.DEGRADED;
    else if (newBattery > 30 && node.status === NodeStatus.DEGRADED) newStatus = NodeStatus.ACTIVE;
    return this.updateNode(nodeId, { battery: parseFloat(newBattery.toFixed(1)), status: newStatus });
  }

  fluctuateSignal(nodeId, amount) {
    const node = this.nodes.get(nodeId);
    if (!node || node.status === NodeStatus.OFFLINE) return null;
    const delta = (Math.random() - 0.5) * 2 * amount;
    const newSignal = Math.min(1, Math.max(0.1, node.signalStrength + delta));
    return this.updateNode(nodeId, { signalStrength: parseFloat(newSignal.toFixed(3)) });
  }

  getRandomActiveNode() {
    const active = this.getAllNodes().filter(n => n.status === NodeStatus.ACTIVE);
    return active.length ? active[Math.floor(Math.random() * active.length)] : null;
  }

  getRandomDegradedOrActive() {
    const cands = this.getAllNodes().filter(n => n.status !== NodeStatus.OFFLINE);
    return cands.length ? cands[Math.floor(Math.random() * cands.length)] : null;
  }
}

// Singleton
const nodeManager = new NodeManager();
module.exports = nodeManager;
