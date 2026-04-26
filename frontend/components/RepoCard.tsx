'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, Zap, GitBranch, Globe, Server, Trash2, MoreVertical, Play, Link } from 'lucide-react';
import { triggerPush, triggerWire, deleteProject } from '@/lib/api';

interface Project {
  id: string;
  alias: string;
  repo_name: string;
  description?: string;
  railway_url?: string;
  vercel_url?: string;
  railway_svc?: string;
  vercel_proj?: string;
  status?: string;
  last_deploy?: string;
  last_deploy_info?: any;
}

interface Props {
  project: Project;
  onDeploy: (deployId: string, alias: string) => void;
  onDelete: (alias: string) => void;
}

const statusConfig: Record<string, { dot: string; label: string }> = {
  deployed: { dot: 'live', label: 'Live' },
  building: { dot: 'building', label: 'Building' },
  failed:   { dot: 'failed', label: 'Failed' },
  unknown:  { dot: 'unknown', label: 'Unknown' },
};

export default function RepoCard({ project, onDeploy, onDelete }: Props) {
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [wiring, setWiring] = useState(false);

  const status = statusConfig[project.status || 'unknown'] || statusConfig.unknown;

  const handleDeploy = async () => {
    setDeploying(true);
    try {
      const res = await triggerPush(project.alias, `devpilot: deploy ${project.alias}`);
      onDeploy(res.data.deployId, project.alias);
      router.push(`/dashboard/deploy/${project.alias}?deployId=${res.data.deployId}`);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Deploy failed');
    } finally {
      setDeploying(false);
    }
  };

  const handleWire = async () => {
    setWiring(true);
    try {
      const res = await triggerWire(project.alias);
      onDeploy(res.data.deployId, project.alias);
      router.push(`/dashboard/deploy/${project.alias}?deployId=${res.data.deployId}`);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Wire failed');
    } finally {
      setWiring(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete ${project.alias}? This cannot be undone.`)) return;
    try { await deleteProject(project.alias); onDelete(project.alias); }
    catch {}
  };

  const lastDeploy = project.last_deploy
    ? new Date(project.last_deploy).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'Never';

  return (
    <div className="glass-card rounded-2xl p-5 relative group">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`status-dot ${status.dot}`} />
            <span className="text-[var(--dim)] text-xs">{status.label}</span>
          </div>
          <h3 className="font-display text-lg text-white leading-tight truncate">{project.alias}</h3>
          <p className="text-[var(--dim)] text-xs font-mono truncate mt-0.5">{project.repo_name}</p>
        </div>

        {/* Menu */}
        <div className="relative ml-2">
          <button
            onClick={() => setMenu(!menu)}
            className="p-1.5 rounded-lg text-[var(--dim)] hover:text-white hover:bg-white/5 transition-all"
          >
            <MoreVertical size={15} />
          </button>
          {menu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
              <div className="absolute right-0 top-8 z-20 bg-[var(--card)] border border-[var(--border)] rounded-xl p-1.5 min-w-[140px] shadow-card">
                <button
                  onClick={() => { setMenu(false); router.push(`/dashboard/deploy/${project.alias}`); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[var(--text)] hover:bg-white/5 rounded-lg"
                >
                  <GitBranch size={12} /> View Deploys
                </button>
                <button
                  onClick={() => { setMenu(false); handleWire(); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[var(--text)] hover:bg-white/5 rounded-lg"
                >
                  <Link size={12} /> Wire URLs
                </button>
                <div className="border-t border-[var(--border)] my-1" />
                <button
                  onClick={() => { setMenu(false); handleDelete(); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-lg"
                >
                  <Trash2 size={12} /> Remove
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Description */}
      {project.description && (
        <p className="text-[var(--dim)] text-xs mb-4 line-clamp-2">{project.description}</p>
      )}

      {/* URLs */}
      <div className="space-y-1.5 mb-4">
        {project.vercel_url && (
          <a
            href={project.vercel_url} target="_blank" rel="noopener"
            className="flex items-center gap-2 text-xs text-[var(--dim)] hover:text-purple-300 transition-colors truncate group/link"
          >
            <Globe size={11} className="text-purple-400 flex-shrink-0" />
            <span className="truncate">{project.vercel_url.replace('https://', '')}</span>
            <ExternalLink size={10} className="opacity-0 group-hover/link:opacity-100 flex-shrink-0" />
          </a>
        )}
        {project.railway_url && (
          <a
            href={project.railway_url} target="_blank" rel="noopener"
            className="flex items-center gap-2 text-xs text-[var(--dim)] hover:text-emerald-300 transition-colors truncate group/link"
          >
            <Server size={11} className="text-emerald-400 flex-shrink-0" />
            <span className="truncate">{project.railway_url.replace('https://', '')}</span>
            <ExternalLink size={10} className="opacity-0 group-hover/link:opacity-100 flex-shrink-0" />
          </a>
        )}
        {!project.vercel_url && !project.railway_url && (
          <p className="text-[var(--muted)] text-xs">No URLs yet — launch to deploy</p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
        <span className="text-[var(--muted)] text-xs">Last: {lastDeploy}</span>
        <button
          onClick={handleDeploy}
          disabled={deploying || wiring}
          className="flex items-center gap-1.5 text-xs bg-purple-600/15 text-purple-300 hover:bg-purple-600/25 border border-purple-500/20 rounded-lg px-3 py-1.5 transition-all disabled:opacity-50"
        >
          {deploying ? (
            <span className="w-3 h-3 border border-purple-400 border-t-transparent rounded-full animate-spin" />
          ) : <Play size={11} />}
          {deploying ? 'Pushing...' : 'Push'}
        </button>
      </div>
    </div>
  );
}
