const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { requireAuth, loadUser } = require('../middleware/auth');

router.use(loadUser, requireAuth);

const ENCRYPTION_KEY = (process.env.ENCRYPTION_KEY || 'devpilot-dev-key-32chars-replace!!').padEnd(32).slice(0, 32);
const IV_LENGTH = 16;

const encrypt = (text) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  return iv.toString('hex') + ':' + Buffer.concat([cipher.update(text), cipher.final()]).toString('hex');
};

const decrypt = (text) => {
  try {
    const [ivHex, encrypted] = text.split(':');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), Buffer.from(ivHex, 'hex'));
    return Buffer.concat([decipher.update(Buffer.from(encrypted, 'hex')), decipher.final()]).toString();
  } catch { return null; }
};

// ── GET /api/keys — list key names (never values)
router.get('/', async (req, res) => {
  try {
    const result = await global.pool.query(
      'SELECT key_name, created_at FROM api_keys WHERE user_id = $1',
      [req.session.userId]
    );
    res.json({ keys: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/keys — save/update a key
router.post('/', async (req, res) => {
  const { key_name, value } = req.body;
  const valid = ['github', 'claude', 'railway', 'vercel'];
  if (!valid.includes(key_name)) return res.status(400).json({ error: 'Invalid key name' });
  if (!value) return res.status(400).json({ error: 'Value required' });
  try {
    await global.pool.query(`
      INSERT INTO api_keys (user_id, key_name, encrypted_value)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, key_name) DO UPDATE SET encrypted_value = $3
    `, [req.session.userId, key_name, encrypt(value)]);
    res.json({ success: true, key_name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/keys/:name
router.delete('/:name', async (req, res) => {
  try {
    await global.pool.query(
      'DELETE FROM api_keys WHERE user_id = $1 AND key_name = $2',
      [req.session.userId, req.params.name]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Internal: get decrypted key for a user
const getUserKey = async (userId, keyName) => {
  try {
    const result = await global.pool.query(
      'SELECT encrypted_value FROM api_keys WHERE user_id = $1 AND key_name = $2',
      [userId, keyName]
    );
    if (!result.rows[0]) return null;
    return decrypt(result.rows[0].encrypted_value);
  } catch { return null; }
};

module.exports = router;
module.exports.getUserKey = getUserKey;
