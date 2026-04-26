require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10
});

global.pool = pool;

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
  }
});
global.io = io;

app.use(helmet({ contentSecurityPolicy: false }));
app.set('trust proxy', 1);
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o.trim()))) return cb(null, true);
    cb(null, true);
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Simple memory session fallback — no pg dependency on boot
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'devpilot-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
};

// Try pg session store, fall back to memory
try {
  const pgSession = require('connect-pg-simple')(session);
  sessionConfig.store = new pgSession({ pool, tableName: 'sessions', createTableIfMissing: true });
  console.log('Using PostgreSQL session store');
} catch (e) {
  console.log('Using memory session store:', e.message);
}

app.use(session(sessionConfig));

app.use('/api/health', require('./routes/health'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/deploy', require('./routes/deploy'));
app.use('/api/vault', require('./routes/vault'));
app.use('/api/agents', require('./routes/agents'));
app.use('/api/keys', require('./routes/keys'));

require('./socket/terminal')(io);

app.get('/health', (req, res) => res.json({
  status: 'ok', service: 'devpilot-api', version: '1.0.0',
  timestamp: new Date().toISOString()
}));

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n🚀 DevPilot API running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   ENV: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = { app, server, io, pool };
