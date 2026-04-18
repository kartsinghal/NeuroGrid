/**
 * NeuroGrid AI — Shared Configuration
 * Used by both backend engine and frontend constants
 */

module.exports = {
  // Dijkstra edge weight formula coefficients
  ROUTING_WEIGHTS: {
    latency: 0.30,     // 30% — lower is better
    signal: 0.30,      // 30% — lower signal = higher cost
    reliability: 0.20, // 20% — lower reliability = higher cost
    battery: 0.20,     // 20% — lower battery = higher cost
  },

  // Simulation engine timing
  SIMULATION: {
    BATTERY_DRAIN_RATE: 0.15,  // % per tick
    TICK_INTERVAL_MS: 3000,    // 3 seconds per simulation tick
    SIGNAL_FLUCTUATION: 0.04,  // max signal change per tick
    SELF_HEAL_CHANCE: 0.12,    // 12% chance per tick for failed node recovery
    NODE_FAIL_CHANCE: 0.025,   // 2.5% chance per tick when degraded
    DEGRADATION_THRESHOLD: 30, // battery % at which node enters degraded state
    CRITICAL_THRESHOLD: 10,    // battery % at which node auto-fails
  },

  // Latency buckets (ms)
  LATENCY: {
    EXCELLENT: 20,
    GOOD: 50,
    FAIR: 100,
    POOR: 200,
  },

  // Default node parameters
  NODE_DEFAULTS: {
    battery: 100,
    signalStrength: 1.0,
    reliability: 0.90,
    latency: 20,
    status: 'active',
    role: 'relay',
  },

  // WebSocket event names (shared contract)
  EVENTS: {
    NODE_UPDATE: 'node:update',
    NODE_FAILED: 'node:failed',
    NODE_RECOVERED: 'node:recovered',
    NODE_ADDED: 'node:added',
    NODE_REMOVED: 'node:removed',
    MESSAGE_SENT: 'message:sent',
    ROUTE_SELECTED: 'route:selected',
    NETWORK_STATE: 'network:state',
    SOS_TRIGGERED: 'sos:triggered',
    SOS_PROPAGATING: 'sos:propagating',
    SOS_COMPLETE: 'sos:complete',
    SIMULATE_ACTION: 'simulate:action',
    INTERNET_TOGGLE: 'internet:toggle',
    NETWORK_STATUS: 'network:status',
    SELF_HEAL: 'network:selfheal',
  },

  // Network topology constants
  NETWORK: {
    MAX_NODES: 20,
    MIN_EDGE_DISTANCE: 80,   // px — minimum distance for edge creation
    MAX_EDGE_DISTANCE: 300,  // px — maximum distance for connectivity
    DEFAULT_EDGE_SIGNAL: 0.8,
    SOS_COLOR: '#ff0040',
    ACTIVE_ROUTE_COLOR: '#00ff88',
    PARTICLE_SPEED_MS: 800,  // ms per hop
  },
};
