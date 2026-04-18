const express = require('express');
const router = express.Router();

/** GET /api/network/state — Full network snapshot */
router.get('/state', (req, res) => {
  const { nodeManager } = req.app.locals;
  res.json(nodeManager.getFullNetworkState());
});

/** GET /api/network/stats — Network statistics */
router.get('/stats', (req, res) => {
  const { nodeManager } = req.app.locals;
  res.json(nodeManager.getNetworkStats());
});

/** GET /api/network/route — Compute optimal route between two nodes */
router.get('/route', (req, res) => {
  const { nodeManager, routingEngine } = req.app.locals;
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'from and to query params required' });

  const nodes = nodeManager.getAllNodes();
  const edges = nodeManager.getActiveEdges();
  const route = routingEngine.findOptimalRoute(nodes, edges, from, to);

  res.json({ route });
});

/** GET /api/network/health — Network health score */
router.get('/health', (req, res) => {
  const { nodeManager, routingEngine } = req.app.locals;
  const nodes = nodeManager.getAllNodes();
  const edges = nodeManager.getActiveEdges();
  const healthScore = routingEngine.computeNetworkHealth(nodes, edges);
  const stats = nodeManager.getNetworkStats();

  res.json({
    healthScore,
    ...stats,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
