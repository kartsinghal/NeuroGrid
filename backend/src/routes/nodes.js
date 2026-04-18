const express = require('express');
const router = express.Router();

/** GET /api/nodes — Get all nodes */
router.get('/', (req, res) => {
  const { nodeManager } = req.app.locals;
  const nodes = nodeManager.getAllNodes();
  res.json({ nodes, count: nodes.length, timestamp: new Date().toISOString() });
});

/** GET /api/nodes/:id — Get a single node */
router.get('/:id', (req, res) => {
  const { nodeManager } = req.app.locals;
  const node = nodeManager.getNode(req.params.id);
  if (!node) return res.status(404).json({ error: 'Node not found' });
  res.json({ node });
});

/** POST /api/nodes — Add a new node */
router.post('/', (req, res) => {
  const { simulationEngine } = req.app.locals;
  const result = simulationEngine.addNode(req.body);
  res.status(201).json(result);
});

/** PATCH /api/nodes/:id — Update node properties */
router.patch('/:id', (req, res) => {
  const { nodeManager, eventSystem } = req.app.locals;
  const node = nodeManager.updateNode(req.params.id, req.body);
  if (!node) return res.status(404).json({ error: 'Node not found' });
  eventSystem.emitNodeUpdate(node);
  res.json({ node });
});

/** DELETE /api/nodes/:id — Remove node */
router.delete('/:id', (req, res) => {
  const { simulationEngine } = req.app.locals;
  const result = simulationEngine.removeNode(req.params.id);
  if (!result.success) return res.status(404).json({ error: result.message });
  res.json(result);
});

module.exports = router;
