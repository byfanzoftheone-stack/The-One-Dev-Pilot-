'use client';
import React, { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import WorkspaceShell from '@/components/WorkspaceShell';
import LiveTerminal from '@/components/LiveTerminal';
import { getProject, getProjectDeploys, triggerPush, triggerWire, triggerLaunch } from '@/lib/api';
import { ArrowLeft, Play, Link, Rocket, Clock, CheckCircle, XCircle, Loader } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const statusIcon = (s: string) => {
  if (s === 'success') return <CheckCircle size={13} className="text-emerald-400" />;
  if (s === 'failed') return <XCircle size={13} className="text-red-400" />;
  if (s === 'running') return <Loader size={13} className="text-amber-400 animate-spin" />;
  return <Clock size={13} className="text-[var(--dim)]" />;
};

export default function DeployPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const alias = params.alias as string;
  const initialDeployId = searchParams.get('deployId') || '';

  const [project, setProject] = useState<any>(null);
  const [deploys, setDeploys] = useState<any[]>([]);
  const [activeDeployId, setActiveDeployId] = useState(initialDeployId);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState('');

  useEffect(() => {
    Promise.all([getProject(alias), getProjectDeploys(alias)])
      .then(([pRes, dRes]) => { setProject(pRes.data.project); setDeploys(dRes.data.deploys); })
      .catch(() => router.replace('/dashboard'))
      .finally(() => setLoading(false));
  }, [alias]);

  const run = async (type: string) => {
    setDeploying(type);
    try {
      let res;
      if (type === 'push') res = await triggerPush(alias);
      else if (type === 'wire') res = await triggerWire(alias);
      else if (type === 'launch') res = await triggerLaunch(alias);
      if (res?.data?.deployId) {
        setActiveDeployId(res.data.deployId);
        setDeploys(d => [{ id: res.data.deployId, status: 'running', trigger_type: type, triggered_at: new Date().toISOString() }, ...d]);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to start');
    } finally {
      setDeploying('');
    }
  };

  if (loading) return (
    <WorkspaceShell>
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </WorkspaceShell>
  );

  return (
    <WorkspaceShell>
      <div className="space-y-5 stagger">
        <button onClick={() => router.push('/dashboard')} className="flex items-center gap-2 text-[var(--dim)] hover:text-white text-sm transition-colors">
          <ArrowLeft size={15} /> Dashboard
        </button>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl text-white">{alias}</h1>
            <p className="text-[var(--dim)] text-xs font-mono mt-0.5">{project?.repo_name}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => run('push')}
              disabled={!!deploying}
              className="flex items-center gap-1.5 text-xs bg-purple-600/15 text-purple-300 hover:bg-purple-600/25 border border-purple-500/20 rounded-lg px-3 py-2 transition-all disabled:opacity-50"
            >
              {deploying === 'push' ? <Loader size={12} className="animate-spin" /> : <Play size={12} />}
              Push
            </button>
            <button
              onClick={() => run('wire')}
              disabled={!!deploying}
              className="flex items-center gap-1.5 text-xs bg-[var(--surface)] text-[var(--dim)] hover:text-white border border-[var(--border)] rounded-lg px-3 py-2 transition-all disabled:opacity-50"
            >
              {deploying === 'wire' ? <Loader size={12} className="animate-spin" /> : <Link size={12} />}
              Wire
            </button>
            <button
              onClick={() => run('launch')}
              disabled={!!deploying}
              className="flex items-center gap-1.5 text-xs bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg px-3 py-2 transition-all disabled:opacity-50"
            >
              {deploying === 'launch' ? <Loader size={12} className="animate-spin" /> : <Rocket size={12} />}
              Launch
            </button>
          </div>
        </div>

        {/* Live terminal */}
        {activeDeployId ? (
          <LiveTerminal deployId={activeDeployId} alias={alias} />
        ) : (
          <div className="terminal flex items-center justify-center" style={{ minHeight: '280px' }}>
            <div className="text-center">
              <p className="font-mono text-[var(--muted)] text-sm mb-2">No active deploy</p>
              <p className="text-[var(--dim)] text-xs">Push, Wire, or Launch to start a pipeline</p>
            </div>
          </div>
        )}

        {/* Deploy history */}
        <div className="glass-card rounded-2xl p-5">
          <h2 className="text-white text-sm font-medium mb-4">Deploy History</h2>
          {deploys.length === 0 ? (
            <p className="text-[var(--muted)] text-sm text-center py-4">No deploys yet</p>
          ) : (
            <div className="space-y-2">
              {deploys.map(d => (
                <button
                  key={d.id}
                  onClick={() => setActiveDeployId(d.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all text-left ${
                    d.id === activeDeployId
                      ? 'bg-purple-600/10 border border-purple-500/20'
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {statusIcon(d.status)}
                    <div>
                      <p className="text-white text-xs font-mono">{d.id.slice(0, 12)}...</p>
                      <p className="text-[var(--dim)] text-[11px] capitalize">{d.trigger_type}</p>
                    </div>
                  </div>
                  <span className="text-[var(--dim)] text-[11px]">
                    {formatDistanceToNow(new Date(d.triggered_at), { addSuffix: true })}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </WorkspaceShell>
  );
}
