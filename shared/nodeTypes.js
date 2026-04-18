/**
 * NeuroGrid AI — Shared Node Type Definitions
 */

const NodeStatus = {
  ACTIVE: 'active',
  DEGRADED: 'degraded',
  OFFLINE: 'offline',
  RECOVERING: 'recovering',
};

const NodeRole = {
  GATEWAY: 'gateway',       // Primary internet-connected node
  RELAY: 'relay',           // Mesh relay node
  ENDPOINT: 'endpoint',     // Terminal device (rescue worker, sensor)
  SATELLITE: 'satellite',   // Satellite uplink node
};

const MessageType = {
  NORMAL: 'normal',
  SOS: 'sos',
  SYSTEM: 'system',
  ACK: 'ack',
};

const SimulationAction = {
  ADD_NODE: 'ADD_NODE',
  REMOVE_NODE: 'REMOVE_NODE',
  FAIL_NODE: 'FAIL_NODE',
  RECOVER_NODE: 'RECOVER_NODE',
  SET_SIGNAL: 'SET_SIGNAL',
  SET_BATTERY: 'SET_BATTERY',
  TOGGLE_INTERNET: 'TOGGLE_INTERNET',
  RESET_NETWORK: 'RESET_NETWORK',
  TRIGGER_STORM: 'TRIGGER_STORM',  // Fails multiple nodes simultaneously
};

const LogLevel = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  SYSTEM: 'system',
  SOS: 'sos',
};

module.exports = { NodeStatus, NodeRole, MessageType, SimulationAction, LogLevel };
