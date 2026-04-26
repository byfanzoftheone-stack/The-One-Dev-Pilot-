const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  let dbOk = false;
  try {
    await global.pool.query('SELECT 1');
    dbOk = true;
  } catch {}

  res.json({
    status: 'ok',
    service: 'devpilot-api',
    version: '1.0.0',
    db: dbOk ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
