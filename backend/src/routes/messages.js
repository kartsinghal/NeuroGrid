const express = require('express');
const router = express.Router();

/** POST /api/messages/send — Send a message with AI routing */
router.post('/send', (req, res) => {
  const { nodeManager, routingEngine, eventSystem } = req.app.locals;
  const { sourceId, targetId, content, type = 'normal' } = req.body;

  if (!sourceId || !targetId) {
    return res.status(400).json({ error: 'sourceId and targetId are required' });
  }

  const nodes = nodeManager.getAllNodes();
  const edges = nodeManager.getActiveEdges();
  const route = routingEngine.findOptimalRoute(nodes, edges, sourceId, targetId);

  const message = {
    id: require('uuid').v4(),
    sourceId, targetId, content, type, route,
    timestamp: new Date().toISOString(),
    status: route.feasible ? 'delivered' : 'failed',
  };

  eventSystem.emitRouteSelected(route);
  eventSystem.emitMessageSent(message);

  res.json({ message });
});

/** GET /api/messages/history — Get message history */
router.get('/history', (req, res) => {
  const { eventSystem } = req.app.locals;
  res.json({
    messages: eventSystem.messageHistory.slice(-50),
    count: eventSystem.messageHistory.length,
  });
});

module.exports = router;
