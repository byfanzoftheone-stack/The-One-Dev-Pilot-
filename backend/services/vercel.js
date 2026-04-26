const axios = require('axios');

const base = (teamId) => teamId ? `?teamId=${teamId}` : '';

const headers = (token) => ({ Authorization: `Bearer ${token}` });

const getProject = async (token, name, teamId) => {
  try {
    const res = await axios.get(
      `https://api.vercel.com/v9/projects/${name}${base(teamId)}`,
      { headers: headers(token) }
    );
    return res.data;
  } catch { return null; }
};

const createProject = async (token, name, ghUser, repo, teamId, framework = 'nextjs') => {
  try {
    const res = await axios.post(
      `https://api.vercel.com/v10/projects${base(teamId)}`,
      { name, framework, gitRepository: { type: 'github', repo: `${ghUser}/${repo}` } },
      { headers: { ...headers(token), 'Content-Type': 'application/json' } }
    );
    return res.data;
  } catch (err) {
    return { error: err.response?.data?.error?.message || err.message };
  }
};

const setEnv = async (token, project, key, value, teamId) => {
  const param = base(teamId);
  // Delete existing
  try {
    const existing = await axios.get(
      `https://api.vercel.com/v9/projects/${project}/env${param}`,
      { headers: headers(token) }
    );
    const found = existing.data?.envs?.find(e => e.key === key);
    if (found) {
      await axios.delete(
        `https://api.vercel.com/v9/projects/${project}/env/${found.id}${param}`,
        { headers: headers(token) }
      );
    }
  } catch {}
  // Set new
  try {
    await axios.post(
      `https://api.vercel.com/v10/projects/${project}/env${param}`,
      { key, value, type: 'plain', target: ['production', 'preview', 'development'] },
      { headers: { ...headers(token), 'Content-Type': 'application/json' } }
    );
    return true;
  } catch { return false; }
};

const getEnvs = async (token, project, teamId) => {
  try {
    const res = await axios.get(
      `https://api.vercel.com/v9/projects/${project}/env${base(teamId)}`,
      { headers: headers(token) }
    );
    return res.data?.envs || [];
  } catch { return []; }
};

const triggerDeploy = async (token, project, ghUser, repo, teamId) => {
  const param = teamId ? `?teamId=${teamId}&forceNew=1` : '?forceNew=1';
  try {
    const res = await axios.post(
      `https://api.vercel.com/v13/deployments${param}`,
      { name: project, target: 'production', gitSource: { type: 'github', org: ghUser, repo, ref: 'main' } },
      { headers: { ...headers(token), 'Content-Type': 'application/json' } }
    );
    return res.data;
  } catch (err) {
    return { error: err.response?.data?.error?.message || err.message };
  }
};

const listProjects = async (token, teamId) => {
  try {
    const res = await axios.get(
      `https://api.vercel.com/v9/projects${base(teamId)}&limit=100`,
      { headers: headers(token) }
    );
    return res.data?.projects || [];
  } catch { return []; }
};

const getDeployments = async (token, projectId, teamId, limit = 5) => {
  try {
    const param = teamId
      ? `?projectId=${projectId}&teamId=${teamId}&limit=${limit}`
      : `?projectId=${projectId}&limit=${limit}`;
    const res = await axios.get(
      `https://api.vercel.com/v6/deployments${param}`,
      { headers: headers(token) }
    );
    return res.data?.deployments || [];
  } catch { return []; }
};

module.exports = {
  getProject, createProject, setEnv, getEnvs,
  triggerDeploy, listProjects, getDeployments
};
