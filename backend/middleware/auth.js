// Require valid session / user
const requireAuth = (req, res, next) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
};

// Attach user to req from DB
const loadUser = async (req, res, next) => {
  if (!req.session?.userId) return next();
  try {
    const result = await global.pool.query(
      'SELECT id, tier, gh_user, vercel_team_id, xp, level, deploy_count, fix_count FROM users WHERE id = $1',
      [req.session.userId]
    );
    if (result.rows[0]) req.user = result.rows[0];
  } catch (err) {
    console.error('loadUser error:', err.message);
  }
  next();
};

module.exports = { requireAuth, loadUser };
