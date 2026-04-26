const axios = require('axios');

const RAILWAY_API = 'https://backboard.railway.app/graphql/v2';

const gql = async (token, query) => {
  const res = await axios.post(RAILWAY_API, { query }, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  });
  return res.data;
};

const getProjectId = async (token, name) => {
  const data = await gql(token, `{ me { projects { edges { node { id name } } } } }`);
  const projects = data?.data?.me?.projects?.edges || [];
  const match = projects.find(e => e.node.name.toLowerCase().includes(name.toLowerCase()));
  return match?.node?.id || null;
};

const getEnvironmentId = async (token, projectId) => {
  const data = await gql(token, `{ project(id: "${projectId}") { environments { edges { node { id name } } } } }`);
  const envs = data?.data?.project?.environments?.edges || [];
  const prod = envs.find(e => e.node.name === 'production');
  return prod?.node?.id || envs[0]?.node?.id || null;
};

const getServiceId = async (token, projectId) => {
  const data = await gql(token, `{ project(id: "${projectId}") { services { edges { node { id name } } } } }`);
  const svcs = data?.data?.project?.services?.edges || [];
  return svcs[0]?.node?.id || null;
};

const getDomain = async (token, serviceId, envId) => {
  const data = await gql(token, `{ serviceInstance(serviceId: "${serviceId}", environmentId: "${envId}") { domains { serviceDomains { domain } } } }`);
  const domains = data?.data?.serviceInstance?.domains?.serviceDomains || [];
  return domains[0] ? `https://${domains[0].domain}` : null;
};

const getVars = async (token, projectId, envId) => {
  const data = await gql(token, `{ variables(projectId: "${projectId}", environmentId: "${envId}") }`);
  return data?.data?.variables || {};
};

const setVars = async (token, projectId, serviceId, envId, vars) => {
  const varsJson = JSON.stringify(vars).replace(/"([^"]+)":/g, '"$1":');
  await gql(token, `mutation { variableCollectionUpsert(input: { projectId: "${projectId}", serviceId: "${serviceId}", environmentId: "${envId}", variables: ${JSON.stringify(vars)} }) }`);
};

const listProjects = async (token) => {
  const data = await gql(token, `{ me { projects { edges { node { id name services { edges { node { id name source { repo } } } } } } } } }`);
  return data?.data?.me?.projects?.edges?.map(e => e.node) || [];
};

const getDeployStatus = async (token, serviceId, envId) => {
  const data = await gql(token, `{ serviceInstance(serviceId: "${serviceId}", environmentId: "${envId}") { latestDeployment { id status } } }`);
  return data?.data?.serviceInstance?.latestDeployment || null;
};

module.exports = {
  gql, getProjectId, getEnvironmentId, getServiceId,
  getDomain, getVars, setVars, listProjects, getDeployStatus
};
