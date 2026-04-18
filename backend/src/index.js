/**
 * NeuroGrid AI — Backend Entry Point
 * Express + Socket.IO + AI Engine bootstrap
 */

require('dotenv').config();
require('express-async-errors');

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { connect: connectDB, getMode } = require('./config/db');
const nodeManager = require('./engine/NodeManager');
const routingEngine = require('./engine/RoutingEngine');
const simulationEngine = require('./engine/SimulationEngine');
const EventSystem = require('./engine/EventSystem');

const nodesRouter = require('./routes/nodes');
const messagesRouter = require('./routes/messages');
const simulateRouter = require('./routes/simulate');
const networkRouter = require('./routes/network');

const app = express();
const server = http.createServer(app);

// ─── Socket.IO Setup ──────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingInterval: 10000,
  pingTimeout: 5000,
});

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

// ─── REST Routes ──────────────────────────────────────────────────────────────
app.use('/api/nodes', nodesRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/simulate', simulateRouter);
app.use('/api/network', networkRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'operational',
    dbMode: getMode(),
    nodes: nodeManager.getAllNodes().length,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    timestamp: new Date().toISOString(),
  });
});

// ─── Bootstrap ────────────────────────────────────────────────────────────────
const bootstrap = async () => {
  // Connect to database (Atlas → Local → Memory)
  const dbMode = await connectDB();

  // Initialize Event System with Socket.IO
  const eventSystem = new EventSystem(io);

  // Wire simulation engine to event system
  simulationEngine.setEventEmitter(eventSystem);

  // Inject eventSystem into routes via app.locals
  app.locals.eventSystem = eventSystem;
  app.locals.nodeManager = nodeManager;
  app.locals.routingEngine = routingEngine;
  app.locals.simulationEngine = simulationEngine;

  // Handle new socket connections
  io.on('connection', (socket) => {
    eventSystem.handleConnection(socket);
  });

  // Auto-start simulation
  if (process.env.SIMULATION_AUTO_START !== 'false') {
    simulationEngine.start();
  }

  // Start HTTP server
  const PORT = parseInt(process.env.PORT || '5000', 10);
  server.listen(PORT, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════╗');
    console.log('║         🧠 NeuroGrid AI Backend          ║');
    console.log('╠══════════════════════════════════════════╣');
    console.log(`║  HTTP   → http://localhost:${PORT}          ║`);
    console.log(`║  WS     → ws://localhost:${PORT}            ║`);
    console.log(`║  DB     → ${dbMode.padEnd(30)}║`);
    console.log(`║  Nodes  → ${String(nodeManager.getAllNodes().length).padEnd(30)}║`);
    console.log('╚══════════════════════════════════════════╝');
    console.log('');
  });

  // Graceful shutdown
  const shutdown = async (signal) => {
    console.log(`\n🛑 Received ${signal} — shutting down gracefully...`);
    simulationEngine.stop();
    server.close(() => process.exit(0));
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

bootstrap().catch(err => {
  console.error('❌ Bootstrap failed:', err);
  process.exit(1);
});
