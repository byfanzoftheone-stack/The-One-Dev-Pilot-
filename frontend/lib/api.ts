import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
  timeout: 30000,
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

// Auth
export const login = (license_key: string) => api.post('/auth/login', { license_key });
export const logout = () => api.post('/auth/logout');
export const getMe = () => api.get('/auth/me');
export const updateProfile = (data: any) => api.patch('/auth/profile', data);

// Projects
export const getProjects = () => api.get('/projects');
export const getProject = (alias: string) => api.get(`/projects/${alias}`);
export const createProject = (data: any) => api.post('/projects', data);
export const updateProject = (alias: string, data: any) => api.patch(`/projects/${alias}`, data);
export const deleteProject = (alias: string) => api.delete(`/projects/${alias}`);
export const getProjectDeploys = (alias: string) => api.get(`/projects/${alias}/deploys`);

// Deploy
export const triggerPush = (alias: string, message?: string) => api.post('/deploy/push', { alias, message });
export const triggerWire = (alias: string, railway_url?: string, vercel_url?: string) => api.post('/deploy/wire', { alias, railway_url, vercel_url });
export const triggerLaunch = (alias: string) => api.post('/deploy/launch', { alias });
export const getDeploy = (deployId: string) => api.get(`/deploy/${deployId}`);

// Vault
export const getVaultItems = (type?: string) => api.get('/vault', { params: type ? { type } : {} });
export const saveVaultItem = (data: any) => api.post('/vault', data);
export const deleteVaultItem = (id: string) => api.delete(`/vault/${id}`);
export const searchVault = (q: string) => api.get('/vault/search', { params: { q } });

// AI Agents
export const auditProject = (alias: string, source_context?: string) => api.post('/agents/audit', { alias, source_context });
export const fixCode = (alias: string, description: string, source_context?: string) => api.post('/agents/fix', { alias, description, source_context });
export const chatWithAgent = (alias: string, question: string, context?: string) => api.post('/agents/chat', { alias, question, context });
export const getAgentSuggestions = (alias: string) => api.post('/agents/suggest', { alias });
export const getAgentStatus = () => api.get('/agents/status');

// API Keys
export const getKeys = () => api.get('/keys');
export const saveKey = (key_name: string, value: string) => api.post('/keys', { key_name, value });
export const deleteKey = (name: string) => api.delete(`/keys/${name}`);

export const SOCKET_URL = API_URL;
export default api;
