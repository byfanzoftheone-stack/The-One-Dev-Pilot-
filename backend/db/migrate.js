require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running DevPilot database migration...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        license_key VARCHAR(64) UNIQUE,
        tier VARCHAR(16) DEFAULT 'free' CHECK (tier IN ('free','pro','team')),
        gh_user VARCHAR(128),
        vercel_team_id VARCHAR(128),
        xp INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        deploy_count INTEGER DEFAULT 0,
        fix_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_active TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✓ users table');

    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        alias VARCHAR(64) NOT NULL,
        repo_name VARCHAR(256) NOT NULL,
        description TEXT,
        railway_svc VARCHAR(256),
        railway_url TEXT,
        vercel_proj VARCHAR(256),
        vercel_url TEXT,
        status VARCHAR(32) DEFAULT 'unknown',
        stack JSONB DEFAULT '{}',
        last_deploy TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, alias)
      );
    `);
    console.log('✓ projects table');

    await client.query(`
      CREATE TABLE IF NOT EXISTS deploys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(32) DEFAULT 'pending' CHECK (status IN ('pending','running','success','failed')),
        trigger_type VARCHAR(32) DEFAULT 'manual',
        log_output TEXT DEFAULT '',
        error_message TEXT,
        triggered_at TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ
      );
    `);
    console.log('✓ deploys table');

    await client.query(`
      CREATE TABLE IF NOT EXISTS vault_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(32) DEFAULT 'pattern' CHECK (type IN ('build','pattern','zip','prompt')),
        name VARCHAR(256) NOT NULL,
        content TEXT,
        file_url TEXT,
        file_size BIGINT DEFAULT 0,
        tags TEXT[] DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✓ vault_items table');

    await client.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        key_name VARCHAR(64) NOT NULL CHECK (key_name IN ('github','claude','railway','vercel')),
        encrypted_value TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, key_name)
      );
    `);
    console.log('✓ api_keys table');

    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid VARCHAR NOT NULL COLLATE "default",
        sess JSON NOT NULL,
        expire TIMESTAMPTZ NOT NULL,
        CONSTRAINT sessions_pkey PRIMARY KEY (sid)
      );
      CREATE INDEX IF NOT EXISTS sessions_expire_idx ON sessions(expire);
    `);
    console.log('✓ sessions table');

    console.log('\n✅ DevPilot migration complete!');
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
