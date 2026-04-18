const express = require('express');
const router = express.Router();

/** POST /api/simulate — Execute a simulation action */
router.post('/', (req, res) => {
  const { simulationEngine } = req.app.locals;
  const { action, payload } = req.body;

  let result;
  switch (action) {
    case 'FAIL_NODE':       result = simulationEngine.failNode(payload?.nodeId); break;
    case 'RECOVER_NODE':    result = simulationEngine.recoverNode(payload?.nodeId); break;
    case 'ADD_NODE':        result = simulationEngine.addNode(payload || {}); break;
    case 'REMOVE_NODE':     result = simulationEngine.removeNode(payload?.nodeId); break;
    case 'SET_SIGNAL':      result = simulationEngine.setNodeSignal(payload?.nodeId, payload?.signal); break;
    case 'SET_BATTERY':     result = simulationEngine.setNodeBattery(payload?.nodeId, payload?.battery); break;
    case 'TOGGLE_INTERNET': result = simulationEngine.toggleInternet(); break;
    case 'TRIGGER_STORM':   result = simulationEngine.triggerStorm(); break;
    case 'RESET_NETWORK':   result = simulationEngine.resetNetwork(); break;
    default:
      return res.status(400).json({ error: `Unknown action: ${action}` });
  }

  res.json({ action, result });
});

/** POST /api/simulate/start — Start simulation engine */
router.post('/start', (req, res) => {
  const { simulationEngine } = req.app.locals;
  simulationEngine.start();
  res.json({ status: 'started' });
});

/** POST /api/simulate/stop — Stop simulation engine */
router.post('/stop', (req, res) => {
  const { simulationEngine } = req.app.locals;
  simulationEngine.stop();
  res.json({ status: 'stopped' });
});

module.exports = router;
