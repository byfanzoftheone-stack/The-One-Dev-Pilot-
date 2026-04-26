const axios = require('axios');

const headers = (token) => ({
  Authorization: `token ${token}`,
  Accept: 'application/vnd.github.v3+json',
  'Content-Type': 'application/json'
});

const createRepo = async (token, ghUser, repoName, isPrivate = true, description = '') => {
  // Try org first
  try {
    const res = await axios.post(
      `https://api.github.com/orgs/${ghUser}/repos`,
      { name: repoName, private: isPrivate, auto_init: true, description },
      { headers: headers(token) }
    );
    return res.data;
  } catch {}
  // Fall back to user
  try {
    const res = await axios.post(
      'https://api.github.com/user/repos',
      { name: repoName, private: isPrivate, auto_init: true, description },
      { headers: headers(token) }
    );
    return res.data;
  } catch (err) {
    return { error: err.response?.data?.message || err.message };
  }
};

const repoExists = async (token, ghUser, repoName) => {
  try {
    await axios.get(`https://api.github.com/repos/${ghUser}/${repoName}`, { headers: headers(token) });
    return true;
  } catch { return false; }
};

const listRepos = async (token, ghUser) => {
  try {
    const res = await axios.get(
      `https://api.github.com/orgs/${ghUser}/repos?per_page=100&sort=updated`,
      { headers: headers(token) }
    );
    return res.data;
  } catch {
    try {
      const res = await axios.get(
        'https://api.github.com/user/repos?per_page=100&sort=updated',
        { headers: headers(token) }
      );
      return res.data;
    } catch { return []; }
  }
};

const getLatestAction = async (token, ghUser, repoName) => {
  try {
    const res = await axios.get(
      `https://api.github.com/repos/${ghUser}/${repoName}/actions/runs?per_page=1`,
      { headers: headers(token) }
    );
    return res.data?.workflow_runs?.[0] || null;
  } catch { return null; }
};

const getRepo = async (token, ghUser, repoName) => {
  try {
    const res = await axios.get(
      `https://api.github.com/repos/${ghUser}/${repoName}`,
      { headers: headers(token) }
    );
    return res.data;
  } catch { return null; }
};

module.exports = { createRepo, repoExists, listRepos, getLatestAction, getRepo };
