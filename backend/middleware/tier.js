const requireTier = (minTier) => {
  const tiers = { free: 0, pro: 1, team: 2 };
  return (req, res, next) => {
    const userTier = req.user?.tier || 'free';
    if (tiers[userTier] >= tiers[minTier]) return next();
    return res.status(403).json({
      error: `This feature requires ${minTier} tier`,
      upgrade_url: 'https://devpilot.app/upgrade',
      current_tier: userTier,
      required_tier: minTier
    });
  };
};

const checkRepoLimit = async (req, res, next) => {
  if (req.user?.tier !== 'free') return next();
  try {
    const result = await global.pool.query(
      'SELECT COUNT(*) FROM projects WHERE user_id = $1',
      [req.user.id]
    );
    if (parseInt(result.rows[0].count) >= 3) {
      return res.status(403).json({
        error: 'Free tier limit: 3 projects',
        upgrade_url: 'https://devpilot.app/upgrade',
        current_tier: 'free'
      });
    }
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { requireTier, checkRepoLimit };
