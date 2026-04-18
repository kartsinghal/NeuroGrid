const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  sourceId: { type: String, required: true },
  targetId: { type: String },
  content: { type: String, required: true },
  type: { type: String, enum: ['normal', 'sos', 'system', 'ack'], default: 'normal' },
  route: {
    path: [String],
    explanation: String,
    score: Number,
    hops: Number,
    feasible: Boolean,
  },
  status: { type: String, enum: ['sent', 'delivered', 'failed'], default: 'sent' },
}, { timestamps: true });

module.exports = mongoose.model('Message', MessageSchema);
