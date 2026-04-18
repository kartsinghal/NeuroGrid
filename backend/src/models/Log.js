const mongoose = require('mongoose');

const LogSchema = new mongoose.Schema({
  level: { type: String, enum: ['info', 'success', 'warning', 'error', 'system', 'sos'], default: 'info' },
  message: { type: String, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

LogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Log', LogSchema);
