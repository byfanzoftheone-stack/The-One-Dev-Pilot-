const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { requireAuth, loadUser } = require('../middleware/auth');

router.use(loadUser);

// ── POST /api/auth/login — license key auth
router.post('/login', async (req, res) => {
  const { license_key } = req.body;
  if (!license_key) return res.status(400).json({ error: 'License key required' });

  const pool = global.pool;
  try {
    // Determine tier from key format
    let tier = 'free';
    const key = license_key.trim().toUpperCase();
    if (key.startsWith('DPLT-TEAM-')) tier = 'team';
    else if (key.startsWith('DPLT-')) tier = 'pro';
    else if (key === 'FREE') tier = 'free';
    else return res.status(401).json({ error: 'Invalid license key format' });

    // Upsert user
    const result = await pool.query(`
      INSERT INTO users (license_key, tier, last_active)
      VALUES ($1, $2, NOW())
      ON CONFLICT (license_key) DO UPDATE
        SET tier = $2, last_active = NOW()
      RETURNING id, tier, gh_user, vercel_team_id, xp, level, deploy_count, fix_count
    `, [key === 'FREE' ? `FREE-${crypto.randomBytes(8).toString('hex')}` : key, tier]);

    const user = result.rows[0];
    req.session.userId = user.id;
    await req.session.save();

    res.json({ success: true, user: { ...user, license_key: key } });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ── GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await global.pool.query(
      'SELECT id, tier, gh_user, vercel_team_id, xp, level, deploy_count, fix_count, created_at FROM users WHERE id = $1',
      [req.session.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

// ── PATCH /api/auth/profile — save GitHub user + Vercel team ID
router.patch('/profile', requireAuth, async (req, res) => {
  const { gh_user, vercel_team_id } = req.body;
  try {
    const result = await global.pool.query(
      'UPDATE users SET gh_user = $1, vercel_team_id = $2 WHERE id = $3 RETURNING *',
      [gh_user, vercel_team_id, req.session.userId]
    );
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── XP helper (exported for other routes)
const addXP = async (userId, amount, pool) => {
  const xpPerLevel = 500;
  await pool.query(`
    UPDATE users SET
      xp = xp + $1,
      level = GREATEST(1, FLOOR((xp + $1) / $2) + 1)
    WHERE id = $3
  `, [amount, xpPerLevel, userId]);
};

module.exports = router;
module.exports.addXP = addXP;
