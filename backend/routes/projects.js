const express = require('express');
const router = express.Router();
const { requireAuth, loadUser } = require('../middleware/auth');
const { checkRepoLimit } = require('../middleware/tier');

router.use(loadUser, requireAuth);

// ── GET /api/projects — list all
router.get('/', async (req, res) => {
  try {
    const result = await global.pool.query(`
      SELECT p.*,
        (SELECT row_to_json(d) FROM deploys d WHERE d.project_id = p.id ORDER BY d.triggered_at DESC LIMIT 1) as last_deploy_info
      FROM projects p
      WHERE p.user_id = $1
      ORDER BY p.created_at DESC
    `, [req.session.userId]);
    res.json({ projects: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/projects/:alias
router.get('/:alias', async (req, res) => {
  try {
    const result = await global.pool.query(
      'SELECT * FROM projects WHERE user_id = $1 AND alias = $2',
      [req.session.userId, req.params.alias]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Project not found' });
    res.json({ project: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/projects — register project
router.post('/', checkRepoLimit, async (req, res) => {
  const { alias, repo_name, description, railway_svc, railway_url, vercel_proj, vercel_url, stack } = req.body;
  if (!alias || !repo_name) return res.status(400).json({ error: 'alias and repo_name required' });
  try {
    const result = await global.pool.query(`
      INSERT INTO projects (user_id, alias, repo_name, description, railway_svc, railway_url, vercel_proj, vercel_url, stack)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (user_id, alias) DO UPDATE SET
        repo_name=$3, description=$4, railway_svc=$5, railway_url=$6,
        vercel_proj=$7, vercel_url=$8, stack=$9
      RETURNING *
    `, [req.session.userId, alias, repo_name, description || '',
        railway_svc || '', railway_url || '', vercel_proj || '', vercel_url || '',
        JSON.stringify(stack || {})]);
    res.json({ project: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/projects/:alias — update
router.patch('/:alias', async (req, res) => {
  const fields = ['repo_name','description','railway_svc','railway_url','vercel_proj','vercel_url','status','stack'];
  const updates = [];
  const values = [];
  let i = 1;
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = $${i++}`);
      values.push(f === 'stack' ? JSON.stringify(req.body[f]) : req.body[f]);
    }
  }
  if (!updates.length) return res.status(400).json({ error: 'No fields to update' });
  values.push(req.session.userId, req.params.alias);
  try {
    const result = await global.pool.query(
      `UPDATE projects SET ${updates.join(',')} WHERE user_id = $${i++} AND alias = $${i} RETURNING *`,
      values
    );
    res.json({ project: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/projects/:alias
router.delete('/:alias', async (req, res) => {
  try {
    await global.pool.query(
      'DELETE FROM projects WHERE user_id = $1 AND alias = $2',
      [req.session.userId, req.params.alias]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/projects/:alias/deploys — deploy history
router.get('/:alias/deploys', async (req, res) => {
  try {
    const proj = await global.pool.query(
      'SELECT id FROM projects WHERE user_id = $1 AND alias = $2',
      [req.session.userId, req.params.alias]
    );
    if (!proj.rows[0]) return res.status(404).json({ error: 'Project not found' });
    const deploys = await global.pool.query(
      'SELECT * FROM deploys WHERE project_id = $1 ORDER BY triggered_at DESC LIMIT 20',
      [proj.rows[0].id]
    );
    res.json({ deploys: deploys.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
