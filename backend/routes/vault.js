const express = require('express');
const router = express.Router();
const { requireAuth, loadUser } = require('../middleware/auth');
const r2 = require('../services/r2');

router.use(loadUser, requireAuth);

// ── GET /api/vault — list all vault items
router.get('/', async (req, res) => {
  const { type } = req.query;
  try {
    let query = 'SELECT id,type,name,content,file_url,file_size,tags,created_at FROM vault_items WHERE user_id=$1';
    const params = [req.session.userId];
    if (type) { query += ' AND type=$2'; params.push(type); }
    query += ' ORDER BY created_at DESC';
    const result = await global.pool.query(query, params);
    res.json({ items: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/vault — save pattern or build record
router.post('/', async (req, res) => {
  const { type = 'pattern', name, content, tags = [] } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    let fileUrl = null;
    if (r2.isConfigured() && content) {
      const key = `vault/${req.session.userId}/${type}/${Date.now()}-${name.replace(/\s/g,'-')}.md`;
      fileUrl = await r2.uploadText(key, content);
    }
    const result = await global.pool.query(
      'INSERT INTO vault_items (user_id,type,name,content,file_url,tags) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [req.session.userId, type, name, content || '', fileUrl, tags]
    );
    res.json({ item: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/vault/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await global.pool.query(
      'SELECT * FROM vault_items WHERE id=$1 AND user_id=$2',
      [req.params.id, req.session.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json({ item: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/vault/:id
router.delete('/:id', async (req, res) => {
  try {
    const item = await global.pool.query(
      'SELECT file_url FROM vault_items WHERE id=$1 AND user_id=$2',
      [req.params.id, req.session.userId]
    );
    if (item.rows[0]?.file_url && r2.isConfigured()) {
      // Extract key from URL and delete from R2
      try {
        const url = new URL(item.rows[0].file_url);
        await r2.deleteFile(url.pathname.slice(1));
      } catch {}
    }
    await global.pool.query('DELETE FROM vault_items WHERE id=$1 AND user_id=$2', [req.params.id, req.session.userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/vault/search?q= — search vault
router.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'q required' });
  try {
    const result = await global.pool.query(
      `SELECT id,type,name,content,tags,created_at FROM vault_items 
       WHERE user_id=$1 AND (name ILIKE $2 OR content ILIKE $2 OR $3=ANY(tags))
       ORDER BY created_at DESC LIMIT 20`,
      [req.session.userId, `%${q}%`, q]
    );
    res.json({ items: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/vault/save-build — auto-save after successful deploy
router.post('/save-build', async (req, res) => {
  const { alias, repo_name, railway_url, vercel_url, stack_info } = req.body;
  const content = `# Build Record: ${repo_name}
Date: ${new Date().toISOString()}
Alias: ${alias}

## URLs
Railway: ${railway_url || '—'}
Vercel:  ${vercel_url || '—'}

## Stack
${stack_info || 'Next.js → Vercel + Express → Railway + PostgreSQL'}

## Patterns That Worked
- railway_api_full_launch handles full Railway setup
- vercel_api_full_setup handles full Vercel setup
- Auto-wired NEXT_PUBLIC_API_URL after Railway domain assigned
- Root=backend, Build=npm install, Start=node server.js
`;
  try {
    const result = await global.pool.query(
      'INSERT INTO vault_items (user_id,type,name,content,tags) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [req.session.userId, 'build', `${repo_name}-${new Date().toISOString().slice(0,10)}`, content, [alias, repo_name]]
    );
    res.json({ item: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
