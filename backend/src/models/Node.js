const mongoose = require('mongoose');

const NodeSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['gateway', 'relay', 'endpoint', 'satellite'], default: 'relay' },
  status: { type: String, enum: ['active', 'degraded', 'offline', 'recovering'], default: 'active' },
  battery: { type: Number, min: 0, max: 100, default: 100 },
  signalStrength: { type: Number, min: 0, max: 1, default: 0.85 },
  reliability: { type: Number, min: 0, max: 1, default: 0.90 },
  latency: { type: Number, min: 0, default: 20 },
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  description: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Node', NodeSchema);
