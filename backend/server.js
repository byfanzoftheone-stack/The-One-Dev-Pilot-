require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');

// ── Database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10
});

// ── App setup
const app = express();
const server = http.createServer(app);

// ── Socket.IO — real-time deploy logs
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Export pool + io for routes
global.pool = pool;
global.io = io;

// ── Security
app.use(helmet({ contentSecurityPolicy: false }));
app.set('trust proxy', 1);

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use('/api', limiter);

// ── CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// ── Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Sessions
app.use(session({
  store: new pgSession({ pool, tableName: 'sessions', createTableIfMissing: false }),
  secret: process.env.SESSION_SECRET || 'devpilot-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

// ── Routes
app.use('/api/health', require('./routes/health'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/deploy', require('./routes/deploy'));
app.use('/api/vault', require('./routes/vault'));
app.use('/api/agents', require('./routes/agents'));
app.use('/api/keys', require('./routes/keys'));

// ── Socket.IO — terminal streaming
require('./socket/terminal')(io);

// ── Health root
app.get('/health', (req, res) => res.json({
  status: 'ok',
  service: 'devpilot-api',
  version: '1.0.0',
  timestamp: new Date().toISOString()
}));

// ── 404
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// ── Error handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ── Start
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n🚀 DevPilot API running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   ENV: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = { app, server, io, pool };
