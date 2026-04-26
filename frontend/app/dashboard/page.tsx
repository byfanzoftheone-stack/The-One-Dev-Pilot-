'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getProjects, getMe, getAgentStatus } from '@/lib/api';
import WorkspaceShell from '@/components/WorkspaceShell';
import RepoCard from '@/components/RepoCard';
import { Plus, Zap, Globe, Server, GitBranch, TrendingUp, ChevronRight } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [agentStatus, setAgentStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getProjects(), getMe(), getAgentStatus()])
      .then(([pRes, uRes, aRes]) => {
        setProjects(pRes.data.projects);
        setUser(uRes.data.user);
        setAgentStatus(aRes.data);
      })
      .catch(() => router.replace('/'))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = (alias: string) => setProjects(p => p.filter(x => x.alias !== alias));
  const handleDeploy = (deployId: string, alias: string) => {};

  const liveCount = projects.filter(p => p.status === 'deployed').length;
  const totalDeploys = user?.deploy_count || 0;
  const tier = user?.tier || 'free';

  return (
    <WorkspaceShell>
      <div className="stagger space-y-6">

        {/* Hero header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-3xl text-white">
              Your <span className="text-purple-400">Ecosystem</span>
            </h1>
            <p className="text-[var(--dim)] text-sm mt-1">
              {projects.length} project{projects.length !== 1 ? 's' : ''} · {liveCount} live
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard/new')}
            className="btn-primary text-sm"
          >
            <Plus size={15} /> New Project
          </button>
        </div>

        {/* Stats bento row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Projects', value: projects.length, icon: GitBranch, color: 'text-purple-400' },
            { label: 'Live', value: liveCount, icon: Globe, color: 'text-emerald-400' },
            { label: 'Deploys', value: totalDeploys, icon: Zap, color: 'text-amber-400' },
            { label: 'Tier', value: tier.toUpperCase(), icon: TrendingUp, color: `tier-${tier} text-xs rounded-md px-2 py-0.5` },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="glass-card rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[var(--dim)] text-xs">{label}</span>
                <Icon size={14} className={label === 'Tier' ? 'text-[var(--dim)]' : color} />
              </div>
              <div className={`font-display text-2xl text-white ${label === 'Tier' ? 'text-base' : ''}`}>
                {label === 'Tier'
                  ? <span className={`text-sm font-mono font-medium tier-${tier} rounded-md px-2 py-0.5`}>{value}</span>
                  : value}
              </div>
            </div>
          ))}
        </div>

        {/* AI status banner — if no Claude key */}
        {agentStatus && !agentStatus.ai_available && (
          <div
            onClick={() => router.push('/dashboard/settings')}
            className="glass-card rounded-xl p-4 flex items-center justify-between cursor-pointer border-purple-500/20 hover:border-purple-500/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-600/20 flex items-center justify-center">
                <Zap size={15} className="text-purple-400" />
              </div>
              <div>
                <p className="text-white text-sm font-medium">Add your Claude API key</p>
                <p className="text-[var(--dim)] text-xs">Unlock AI audit, fix, and chat for your projects</p>
              </div>
            </div>
            <ChevronRight size={15} className="text-[var(--dim)]" />
          </div>
        )}

        {/* Upgrade banner — free tier */}
        {tier === 'free' && projects.length >= 2 && (
          <div className="glass-card rounded-xl p-4 flex items-center justify-between border-amber-500/20">
            <div>
              <p className="text-amber-300 text-sm font-medium">Free tier: {projects.length}/3 projects</p>
              <p className="text-[var(--dim)] text-xs">Upgrade to Pro for unlimited projects + AI features</p>
            </div>
            <a
              href="https://devpilot.app/upgrade" target="_blank" rel="noopener"
              className="text-xs bg-amber-500/15 text-amber-300 border border-amber-500/25 rounded-lg px-3 py-1.5 hover:bg-amber-500/25 transition-colors"
            >
              Upgrade →
            </a>
          </div>
        )}

        {/* Projects grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="glass-card rounded-2xl p-5 space-y-3 animate-pulse">
                <div className="h-4 bg-white/5 rounded-lg w-1/3" />
                <div className="h-6 bg-white/5 rounded-lg w-2/3" />
                <div className="h-3 bg-white/5 rounded-lg w-full" />
                <div className="h-3 bg-white/5 rounded-lg w-3/4" />
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-5">
              <Plus size={24} className="text-purple-400" />
            </div>
            <h3 className="font-display text-xl text-white mb-2">No projects yet</h3>
            <p className="text-[var(--dim)] text-sm mb-6">Create your first project and deploy in minutes</p>
            <button onClick={() => router.push('/dashboard/new')} className="btn-primary">
              <Plus size={15} /> Create First Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {projects.map((project) => (
              <RepoCard
                key={project.id}
                project={project}
                onDeploy={handleDeploy}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </WorkspaceShell>
  );
}
