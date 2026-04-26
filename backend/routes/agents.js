const express = require('express');
const router = express.Router();
const { requireAuth, loadUser } = require('../middleware/auth');
const { requireTier } = require('../middleware/tier');
const { getUserKey } = require('./keys');
const { addXP } = require('./auth');
const claude = require('../services/claude');

router.use(loadUser, requireAuth);

// ── POST /api/agents/audit — Pro+
router.post('/audit', requireTier('pro'), async (req, res) => {
  const { alias, source_context = '' } = req.body;
  if (!alias) return res.status(400).json({ error: 'alias required' });

  const claudeKey = await getUserKey(req.session.userId, 'claude');
  if (!claudeKey) return res.status(400).json({ error: 'Claude API key not set — add in Settings' });

  try {
    const projResult = await global.pool.query(
      'SELECT * FROM projects WHERE user_id=$1 AND alias=$2',
      [req.session.userId, alias]
    );
    if (!projResult.rows[0]) return res.status(404).json({ error: 'Project not found' });

    const result = await claude.auditProject(claudeKey, projResult.rows[0], source_context);

    // Save to vault
    await global.pool.query(
      'INSERT INTO vault_items (user_id,type,name,content,tags) VALUES ($1,$2,$3,$4,$5)',
      [req.session.userId, 'pattern', `audit-${alias}-${new Date().toISOString().slice(0,10)}`, result, [alias, 'audit']]
    );

    await addXP(req.session.userId, 50, global.pool);
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/agents/fix — Pro+
router.post('/fix', requireTier('pro'), async (req, res) => {
  const { alias, description, source_context = '', ts_errors = '' } = req.body;
  if (!alias || !description) return res.status(400).json({ error: 'alias and description required' });

  const claudeKey = await getUserKey(req.session.userId, 'claude');
  if (!claudeKey) return res.status(400).json({ error: 'Claude API key not set' });

  try {
    const result = await claude.fixCode(claudeKey, description, source_context, ts_errors);

    await global.pool.query(
      'UPDATE users SET fix_count = fix_count + 1 WHERE id=$1',
      [req.session.userId]
    );
    await addXP(req.session.userId, 75, global.pool);
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/agents/chat — Pro+
router.post('/chat', requireTier('pro'), async (req, res) => {
  const { alias, question, context = '' } = req.body;
  if (!alias || !question) return res.status(400).json({ error: 'alias and question required' });

  const claudeKey = await getUserKey(req.session.userId, 'claude');
  if (!claudeKey) return res.status(400).json({ error: 'Claude API key not set' });

  try {
    const projResult = await global.pool.query(
      'SELECT * FROM projects WHERE user_id=$1 AND alias=$2',
      [req.session.userId, alias]
    );
    const project = projResult.rows[0] || { alias, repo_name: alias };
    const result = await claude.chatAboutProject(claudeKey, question, project, context);
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/agents/suggest — available to all tiers
router.post('/suggest', async (req, res) => {
  const { alias } = req.body;
  const claudeKey = await getUserKey(req.session.userId, 'claude');
  if (!claudeKey) return res.json({ result: 'Add your Claude API key in Settings to get AI suggestions.' });

  try {
    const projResult = await global.pool.query(
      'SELECT * FROM projects WHERE user_id=$1 AND alias=$2',
      [req.session.userId, alias]
    );
    const project = projResult.rows[0] || { alias, repo_name: alias };
    const result = await claude.suggestUpgrades(claudeKey, project);
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/agents/route — natural language command routing
router.post('/route', async (req, res) => {
  const { input } = req.body;
  if (!input) return res.status(400).json({ error: 'input required' });
  const claudeKey = await getUserKey(req.session.userId, 'claude');
  if (!claudeKey) return res.json({ result: null, raw: null });
  try {
    const last = (await global.pool.query(
      'SELECT alias FROM projects WHERE user_id=$1 ORDER BY last_deploy DESC LIMIT 1',
      [req.session.userId]
    )).rows[0]?.alias || 'none';
    const result = await claude.routeNaturalLanguage(claudeKey, input, `Last project: ${last}`);
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/agents/status — check AI availability
router.get('/status', async (req, res) => {
  const claudeKey = await getUserKey(req.session.userId, 'claude');
  res.json({
    ai_available: !!claudeKey,
    tier: req.user?.tier || 'free',
    can_audit: req.user?.tier !== 'free',
    can_fix: req.user?.tier !== 'free',
    can_chat: req.user?.tier !== 'free'
  });
});

module.exports = router;
