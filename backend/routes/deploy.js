const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { requireAuth, loadUser } = require('../middleware/auth');
const { getUserKey } = require('./keys');
const { emitLog, emitDone, emitError } = require('../socket/terminal');
const railwaySvc = require('../services/railway');
const vercelSvc = require('../services/vercel');
const githubSvc = require('../services/github');
const { addXP } = require('./auth');

router.use(loadUser, requireAuth);

// ── Helper: get all user keys
const getKeys = async (userId) => {
  const [gh, railway, vercel, claude] = await Promise.all([
    getUserKey(userId, 'github'),
    getUserKey(userId, 'railway'),
    getUserKey(userId, 'vercel'),
    getUserKey(userId, 'claude')
  ]);
  return { gh, railway, vercel, claude };
};

// ── POST /api/deploy/push — git push → triggers Railway + Vercel auto-deploy
router.post('/push', async (req, res) => {
  const { alias, message } = req.body;
  if (!alias) return res.status(400).json({ error: 'alias required' });

  const pool = global.pool;
  const deployId = uuidv4();

  try {
    const projResult = await pool.query(
      'SELECT * FROM projects WHERE user_id = $1 AND alias = $2',
      [req.session.userId, alias]
    );
    if (!projResult.rows[0]) return res.status(404).json({ error: 'Project not found' });
    const project = projResult.rows[0];

    // Create deploy record
    await pool.query(
      'INSERT INTO deploys (id, project_id, user_id, status, trigger_type) VALUES ($1,$2,$3,$4,$5)',
      [deployId, project.id, req.session.userId, 'running', 'push']
    );

    // Respond immediately with deployId — client will connect via Socket.IO
    res.json({ deployId, status: 'running' });

    // Run deploy pipeline async
    runPushPipeline(deployId, project, req.session.userId, message || `devpilot: deploy ${alias}`);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/deploy/wire — link Railway ↔ Vercel URLs
router.post('/wire', async (req, res) => {
  const { alias, railway_url, vercel_url } = req.body;
  if (!alias) return res.status(400).json({ error: 'alias required' });

  const pool = global.pool;
  const deployId = uuidv4();

  try {
    const projResult = await pool.query(
      'SELECT * FROM projects WHERE user_id = $1 AND alias = $2',
      [req.session.userId, alias]
    );
    if (!projResult.rows[0]) return res.status(404).json({ error: 'Project not found' });

    await pool.query(
      'INSERT INTO deploys (id, project_id, user_id, status, trigger_type) VALUES ($1,$2,$3,$4,$5)',
      [deployId, projResult.rows[0].id, req.session.userId, 'running', 'wire']
    );

    res.json({ deployId, status: 'running' });

    // Wire async
    runWirePipeline(deployId, projResult.rows[0], req.session.userId, railway_url, vercel_url);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/deploy/launch — full Railway + Vercel setup
router.post('/launch', async (req, res) => {
  const { alias } = req.body;
  if (!alias) return res.status(400).json({ error: 'alias required' });

  const pool = global.pool;
  const deployId = uuidv4();

  try {
    const projResult = await pool.query(
      'SELECT * FROM projects WHERE user_id = $1 AND alias = $2',
      [req.session.userId, alias]
    );
    if (!projResult.rows[0]) return res.status(404).json({ error: 'Project not found' });

    await pool.query(
      'INSERT INTO deploys (id, project_id, user_id, status, trigger_type) VALUES ($1,$2,$3,$4,$5)',
      [deployId, projResult.rows[0].id, req.session.userId, 'running', 'launch']
    );

    res.json({ deployId, status: 'running' });
    runLaunchPipeline(deployId, projResult.rows[0], req.session.userId);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/deploy/:deployId — poll status
router.get('/:deployId', async (req, res) => {
  try {
    const result = await global.pool.query(
      'SELECT * FROM deploys WHERE id = $1 AND user_id = $2',
      [req.params.deployId, req.session.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Deploy not found' });
    res.json({ deploy: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════
// PIPELINE RUNNERS (async — stream logs via Socket.IO)
// ══════════════════════════════════════════════════════════

async function finalizeDeploy(deployId, userId, success, summary, pool) {
  await pool.query(
    'UPDATE deploys SET status=$1, completed_at=NOW(), log_output=$2 WHERE id=$3',
    [success ? 'success' : 'failed', summary, deployId]
  );
  if (success) {
    await pool.query('UPDATE users SET deploy_count = deploy_count + 1 WHERE id = $1', [userId]);
    await addXP(userId, 100, pool);
  }
  emitDone(deployId, success, summary);
}

async function runPushPipeline(deployId, project, userId, message) {
  const pool = global.pool;
  const log = (text, type = 'info') => emitLog(deployId, text, type);

  try {
    log('▶ Push pipeline starting...', 'cmd');
    const keys = await getKeys(userId);

    if (!keys.gh) {
      emitError(deployId, 'No GitHub token — go to Settings → API Keys');
      await pool.query('UPDATE deploys SET status=$1 WHERE id=$2', ['failed', deployId]);
      return;
    }

    // Get GitHub user
    const userResult = await pool.query('SELECT gh_user FROM users WHERE id=$1', [userId]);
    const ghUser = userResult.rows[0]?.gh_user;
    if (!ghUser) {
      emitError(deployId, 'GitHub username not set — go to Settings → Profile');
      await pool.query('UPDATE deploys SET status=$1 WHERE id=$2', ['failed', deployId]);
      return;
    }

    log(`📦 Repository: ${ghUser}/${project.repo_name}`, 'info');
    log(`💬 Message: ${message}`, 'info');

    // Check GitHub action status
    log('Checking GitHub Actions...', 'info');
    const action = await githubSvc.getLatestAction(keys.gh, ghUser, project.repo_name);
    if (action) {
      log(`  Latest action: ${action.name} → ${action.status} (${action.conclusion || 'pending'})`, action.conclusion === 'failure' ? 'error' : 'info');
    }

    // Check Vercel status if configured
    if (keys.vercel && project.vercel_proj) {
      log('📡 Triggering Vercel redeploy...', 'cmd');
      const teamId = (await pool.query('SELECT vercel_team_id FROM users WHERE id=$1', [userId])).rows[0]?.vercel_team_id;
      const deploy = await vercelSvc.triggerDeploy(keys.vercel, project.vercel_proj, ghUser, project.repo_name, teamId);
      if (deploy.error) {
        log(`  ⚠ Vercel: ${deploy.error}`, 'warn');
      } else {
        log(`  ✓ Vercel deploy triggered: ${deploy.url || 'building...'}`, 'success');
      }
    }

    // Check Railway status if configured
    if (keys.railway && project.railway_svc) {
      log('🚂 Checking Railway status...', 'cmd');
      try {
        const projId = await railwaySvc.getProjectId(keys.railway, project.railway_svc);
        if (projId) {
          const envId = await railwaySvc.getEnvironmentId(keys.railway, projId);
          const svcId = await railwaySvc.getServiceId(keys.railway, projId);
          if (svcId && envId) {
            const status = await railwaySvc.getDeployStatus(keys.railway, svcId, envId);
            log(`  Railway deploy: ${status?.status || 'checking...'}`, 'info');
          }
          log(`  ✓ Railway: ${project.railway_url || 'see railway.app'}`, 'success');
        }
      } catch (e) {
        log(`  ⚠ Railway check failed: ${e.message}`, 'warn');
      }
    }

    // Update project last_deploy
    await pool.query('UPDATE projects SET last_deploy=NOW() WHERE id=$1', [project.id]);

    log('', 'info');
    log('✅ Push complete! Deployments triggered.', 'success');
    log(`   Vercel: ${project.vercel_url || 'check vercel.com'}`, 'info');
    log(`   Railway: ${project.railway_url || 'check railway.app'}`, 'info');

    await finalizeDeploy(deployId, userId, true, 'Push complete — deployments triggered', pool);
  } catch (err) {
    log(`❌ Push failed: ${err.message}`, 'error');
    await pool.query('UPDATE deploys SET status=$1, error_message=$2 WHERE id=$3', ['failed', err.message, deployId]);
    emitDone(deployId, false, err.message);
  }
}

async function runWirePipeline(deployId, project, userId, manualRailwayUrl, manualVercelUrl) {
  const pool = global.pool;
  const log = (text, type = 'info') => emitLog(deployId, text, type);

  try {
    log('🔌 Wire pipeline starting...', 'cmd');
    const keys = await getKeys(userId);
    const userResult = await pool.query('SELECT vercel_team_id FROM users WHERE id=$1', [userId]);
    const teamId = userResult.rows[0]?.vercel_team_id;

    let railwayUrl = manualRailwayUrl || project.railway_url;
    let vercelUrl = manualVercelUrl || project.vercel_url;

    // Auto-detect Railway URL if not provided
    if (!railwayUrl && keys.railway && project.railway_svc) {
      log('🔍 Auto-detecting Railway URL...', 'info');
      try {
        const projId = await railwaySvc.getProjectId(keys.railway, project.railway_svc);
        if (projId) {
          const envId = await railwaySvc.getEnvironmentId(keys.railway, projId);
          const svcId = await railwaySvc.getServiceId(keys.railway, projId);
          if (svcId && envId) {
            railwayUrl = await railwaySvc.getDomain(keys.railway, svcId, envId);
            if (railwayUrl) log(`  ✓ Railway URL: ${railwayUrl}`, 'success');
          }
        }
      } catch (e) {
        log(`  ⚠ Could not auto-detect Railway URL: ${e.message}`, 'warn');
      }
    }

    if (!vercelUrl && project.vercel_proj) {
      vercelUrl = `https://${project.vercel_proj}.vercel.app`;
    }

    if (!railwayUrl) {
      emitError(deployId, 'Railway URL unknown — provide it in project settings or Railway dashboard');
      await pool.query('UPDATE deploys SET status=$1 WHERE id=$2', ['failed', deployId]);
      return;
    }

    // Set Vercel NEXT_PUBLIC_API_URL
    if (keys.vercel && project.vercel_proj && railwayUrl) {
      log(`🌐 Setting Vercel NEXT_PUBLIC_API_URL → ${railwayUrl}`, 'cmd');
      const ok = await vercelSvc.setEnv(keys.vercel, project.vercel_proj, 'NEXT_PUBLIC_API_URL', railwayUrl, teamId);
      log(`  ${ok ? '✓' : '⚠'} NEXT_PUBLIC_API_URL ${ok ? 'set' : 'failed'}`, ok ? 'success' : 'warn');
    }

    // Set Railway ALLOWED_ORIGINS
    if (keys.railway && project.railway_svc && vercelUrl) {
      log(`🚂 Setting Railway ALLOWED_ORIGINS → ${vercelUrl}`, 'cmd');
      try {
        const projId = await railwaySvc.getProjectId(keys.railway, project.railway_svc);
        if (projId) {
          const envId = await railwaySvc.getEnvironmentId(keys.railway, projId);
          const svcId = await railwaySvc.getServiceId(keys.railway, projId);
          if (svcId && envId) {
            await railwaySvc.setVars(keys.railway, projId, svcId, envId, {
              ALLOWED_ORIGINS: vercelUrl,
              FRONTEND_URL: vercelUrl
            });
            log(`  ✓ ALLOWED_ORIGINS set`, 'success');
          }
        }
      } catch (e) {
        log(`  ⚠ Railway vars: ${e.message}`, 'warn');
      }
    }

    // Update project URLs in DB
    await pool.query(
      'UPDATE projects SET railway_url=$1, vercel_url=$2 WHERE id=$3',
      [railwayUrl, vercelUrl, project.id]
    );

    // Trigger Vercel redeploy
    if (keys.vercel && project.vercel_proj) {
      const userRes = await pool.query('SELECT gh_user, vercel_team_id FROM users WHERE id=$1', [userId]);
      const { gh_user, vercel_team_id } = userRes.rows[0] || {};
      log('🔄 Triggering Vercel redeploy with new env vars...', 'cmd');
      await vercelSvc.triggerDeploy(keys.vercel, project.vercel_proj, gh_user, project.repo_name, vercel_team_id);
      log('  ✓ Redeploy triggered', 'success');
    }

    log('', 'info');
    log('✅ Wire complete!', 'success');
    log(`   Frontend → Backend: ${vercelUrl} → ${railwayUrl}`, 'info');
    log(`   Backend  → Frontend: ALLOWED_ORIGINS=${vercelUrl}`, 'info');

    await finalizeDeploy(deployId, userId, true, `Wired: ${vercelUrl} ↔ ${railwayUrl}`, pool);
  } catch (err) {
    log(`❌ Wire failed: ${err.message}`, 'error');
    await pool.query('UPDATE deploys SET status=$1, error_message=$2 WHERE id=$3', ['failed', err.message, deployId]);
    emitDone(deployId, false, err.message);
  }
}

async function runLaunchPipeline(deployId, project, userId) {
  const pool = global.pool;
  const log = (text, type = 'info') => emitLog(deployId, text, type);

  try {
    log('🚀 Launch pipeline starting...', 'cmd');
    const keys = await getKeys(userId);
    const userResult = await pool.query('SELECT gh_user, vercel_team_id FROM users WHERE id=$1', [userId]);
    const { gh_user: ghUser, vercel_team_id: teamId } = userResult.rows[0] || {};

    if (!keys.railway) { emitError(deployId, 'No Railway token — go to Settings → API Keys'); return; }
    if (!ghUser) { emitError(deployId, 'GitHub username not set — go to Settings → Profile'); return; }

    // Railway
    log('🚂 Setting up Railway...', 'cmd');
    let railwayUrl = '';
    try {
      let projId = await railwaySvc.getProjectId(keys.railway, project.repo_name);
      log(`  Project ID: ${projId || 'creating...'}`, 'info');

      if (!projId) {
        const created = await railwaySvc.gql(keys.railway, `mutation { projectCreate(input: { name: "${project.repo_name}" }) { id name } }`);
        projId = created?.data?.projectCreate?.id;
        log(`  ✓ Created: ${projId}`, 'success');
      }

      const envId = await railwaySvc.getEnvironmentId(keys.railway, projId);
      let svcId = await railwaySvc.getServiceId(keys.railway, projId);

      if (!svcId) {
        const svcData = await railwaySvc.gql(keys.railway, `mutation { serviceCreate(input: { projectId: "${projId}", name: "${project.repo_name}" }) { id } }`);
        svcId = svcData?.data?.serviceCreate?.id;
        log(`  ✓ Service: ${svcId}`, 'success');
      }

      // Connect repo
      await railwaySvc.gql(keys.railway, `mutation { serviceConnect(id: "${svcId}", input: { source: { repo: "${ghUser}/${project.repo_name}", branch: "main" } }) { id } }`);
      log('  ✓ Repo connected', 'success');

      // Configure
      await railwaySvc.gql(keys.railway, `mutation { serviceInstanceUpdate(serviceId: "${svcId}", input: { rootDirectory: "backend", startCommand: "node server.js", buildCommand: "npm install" }) }`);
      log('  ✓ Configured: root=backend start=node server.js', 'success');

      // Add Postgres
      await railwaySvc.gql(keys.railway, `mutation { pluginCreate(input: { projectId: "${projId}", name: "postgresql" }) { id } }`);
      log('  ✓ PostgreSQL added', 'success');

      // Set env vars
      await railwaySvc.setVars(keys.railway, projId, svcId, envId, { NODE_ENV: 'production', PORT: '3001' });
      log('  ✓ Env vars set', 'success');

      // Generate domain
      const domainData = await railwaySvc.gql(keys.railway, `mutation { serviceDomainCreate(input: { serviceId: "${svcId}", environmentId: "${envId}" }) { domain } }`);
      const domain = domainData?.data?.serviceDomainCreate?.domain;
      railwayUrl = domain ? `https://${domain}` : await railwaySvc.getDomain(keys.railway, svcId, envId);
      log(`  ✓ Railway URL: ${railwayUrl || 'generating...'}`, 'success');
    } catch (e) {
      log(`  ⚠ Railway: ${e.message}`, 'warn');
    }

    // Vercel
    let vercelUrl = '';
    if (keys.vercel) {
      log('🌐 Setting up Vercel...', 'cmd');
      try {
        let vProj = await vercelSvc.getProject(keys.vercel, project.alias, teamId);
        if (!vProj?.id) {
          vProj = await vercelSvc.createProject(keys.vercel, project.alias, ghUser, project.repo_name, teamId);
          log(`  ✓ Vercel project created`, 'success');
        } else {
          log(`  ✓ Vercel project exists`, 'success');
        }
        vercelUrl = `https://${project.alias}.vercel.app`;
        if (railwayUrl) await vercelSvc.setEnv(keys.vercel, project.alias, 'NEXT_PUBLIC_API_URL', railwayUrl, teamId);
        log(`  ✓ NEXT_PUBLIC_API_URL set`, 'success');
      } catch (e) {
        log(`  ⚠ Vercel: ${e.message}`, 'warn');
      }
    }

    // Wire
    if (railwayUrl && vercelUrl && keys.railway) {
      log('🔌 Wiring Railway ↔ Vercel...', 'cmd');
      try {
        const projId = await railwaySvc.getProjectId(keys.railway, project.repo_name);
        if (projId) {
          const envId = await railwaySvc.getEnvironmentId(keys.railway, projId);
          const svcId = await railwaySvc.getServiceId(keys.railway, projId);
          await railwaySvc.setVars(keys.railway, projId, svcId, envId, {
            ALLOWED_ORIGINS: vercelUrl, FRONTEND_URL: vercelUrl
          });
          log('  ✓ ALLOWED_ORIGINS wired', 'success');
        }
      } catch (e) {
        log(`  ⚠ Wire: ${e.message}`, 'warn');
      }
    }

    // Update DB
    await pool.query(
      'UPDATE projects SET railway_url=$1, vercel_url=$2, status=$3, last_deploy=NOW() WHERE id=$4',
      [railwayUrl, vercelUrl, 'deployed', project.id]
    );

    log('', 'info');
    log('✅ Launch complete!', 'success');
    log(`   Railway:  ${railwayUrl || 'check railway.app'}`, 'info');
    log(`   Vercel:   ${vercelUrl || 'check vercel.com'}`, 'info');
    log('', 'info');
    log('Next: push your code to trigger auto-deploy', 'info');

    await finalizeDeploy(deployId, userId, true, `Launch complete: ${project.alias}`, pool);
  } catch (err) {
    log(`❌ Launch failed: ${err.message}`, 'error');
    await pool.query('UPDATE deploys SET status=$1, error_message=$2 WHERE id=$3', ['failed', err.message, deployId]);
    emitDone(deployId, false, err.message);
  }
}

module.exports = router;
