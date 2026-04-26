'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import WorkspaceShell from '@/components/WorkspaceShell';
import { createProject, triggerLaunch } from '@/lib/api';
import { ArrowLeft, Rocket, Globe, Server, Database, Check } from 'lucide-react';

export default function NewProjectPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    alias: '', repo_name: '', description: '',
    railway_svc: '', vercel_proj: '',
    railway_url: '', vercel_url: '',
    has_backend: true, has_frontend: true,
  });
  const [saving, setSaving] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<any>(null);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleCreate = async () => {
    if (!form.alias.trim() || !form.repo_name.trim()) {
      setError('Alias and repo name are required'); return;
    }
    setSaving(true); setError('');
    try {
      const res = await createProject({
        alias: form.alias.toLowerCase().replace(/\s/g, '-'),
        repo_name: form.repo_name,
        description: form.description,
        railway_svc: form.railway_svc,
        vercel_proj: form.vercel_proj,
        railway_url: form.railway_url,
        vercel_url: form.vercel_url,
        stack: { has_backend: form.has_backend, has_frontend: form.has_frontend }
      });
      setCreated(res.data.project);
      setStep(3);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create project');
    } finally {
      setSaving(false);
    }
  };

  const handleLaunch = async () => {
    if (!created) return;
    setLaunching(true);
    try {
      const res = await triggerLaunch(created.alias);
      router.push(`/dashboard/deploy/${created.alias}?deployId=${res.data.deployId}`);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Launch failed');
      setLaunching(false);
    }
  };

  return (
    <WorkspaceShell>
      <div className="max-w-xl mx-auto stagger">
        {/* Back */}
        <button
          onClick={() => step > 1 ? setStep(s => s - 1) : router.back()}
          className="flex items-center gap-2 text-[var(--dim)] hover:text-white text-sm mb-6 transition-colors"
        >
          <ArrowLeft size={15} /> Back
        </button>

        <h1 className="font-display text-3xl text-white mb-1">
          {step === 3 ? 'Project Ready' : 'New Project'}
        </h1>
        <p className="text-[var(--dim)] text-sm mb-8">
          {step === 1 && 'Define your project identity'}
          {step === 2 && 'Connect Railway and Vercel (optional — fill in later)'}
          {step === 3 && 'Your project is registered. Launch it now or push code first.'}
        </p>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <React.Fragment key={s}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono transition-all ${
                s < step ? 'bg-purple-600 text-white' :
                s === step ? 'bg-purple-600/30 border border-purple-500 text-purple-300' :
                'bg-[var(--border)] text-[var(--dim)]'
              }`}>
                {s < step ? <Check size={12} /> : s}
              </div>
              {s < 3 && <div className={`flex-1 h-px ${s < step ? 'bg-purple-600' : 'bg-[var(--border)]'}`} />}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Identity */}
        {step === 1 && (
          <div className="glass-card rounded-2xl p-6 space-y-5">
            <div>
              <label className="text-[var(--text)] text-sm font-medium mb-2 block">Alias *</label>
              <input
                className="input-base"
                placeholder="cookbook, my-app, velasco..."
                value={form.alias}
                onChange={e => set('alias', e.target.value.toLowerCase().replace(/\s/g, '-'))}
              />
              <p className="text-[var(--dim)] text-xs mt-1.5">Shortname you'll use in commands</p>
            </div>
            <div>
              <label className="text-[var(--text)] text-sm font-medium mb-2 block">GitHub Repo Name *</label>
              <input
                className="input-base"
                placeholder="Grandma-Carols-cook-book"
                value={form.repo_name}
                onChange={e => set('repo_name', e.target.value)}
              />
              <p className="text-[var(--dim)] text-xs mt-1.5">Exact name from your GitHub org</p>
            </div>
            <div>
              <label className="text-[var(--text)] text-sm font-medium mb-2 block">Description</label>
              <input
                className="input-base"
                placeholder="What does this project do?"
                value={form.description}
                onChange={e => set('description', e.target.value)}
              />
            </div>
            <div>
              <label className="text-[var(--text)] text-sm font-medium mb-3 block">Stack</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'has_backend', icon: Server, label: 'Backend', sub: 'Express → Railway' },
                  { key: 'has_frontend', icon: Globe, label: 'Frontend', sub: 'Next.js → Vercel' },
                ].map(({ key, icon: Icon, label, sub }) => (
                  <button
                    key={key}
                    onClick={() => set(key, !form[key as keyof typeof form])}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      form[key as keyof typeof form]
                        ? 'border-purple-500/40 bg-purple-600/10'
                        : 'border-[var(--border)] bg-transparent'
                    }`}
                  >
                    <Icon size={16} className={form[key as keyof typeof form] ? 'text-purple-400' : 'text-[var(--dim)]'} />
                    <p className="text-white text-sm mt-2">{label}</p>
                    <p className="text-[var(--dim)] text-xs">{sub}</p>
                  </button>
                ))}
              </div>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              onClick={() => { if (!form.alias || !form.repo_name) { setError('Alias and repo name required'); return; } setError(''); setStep(2); }}
              className="btn-primary w-full justify-center"
            >
              Next →
            </button>
          </div>
        )}

        {/* Step 2: Platform links */}
        {step === 2 && (
          <div className="glass-card rounded-2xl p-6 space-y-5">
            <p className="text-[var(--dim)] text-xs bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
              These are optional — DevPilot can auto-discover them during Launch, or you can fill in after deployment.
            </p>
            {form.has_backend && (
              <>
                <div>
                  <label className="text-[var(--text)] text-sm font-medium mb-2 block flex items-center gap-2">
                    <Server size={13} className="text-emerald-400" /> Railway Service Name
                  </label>
                  <input
                    className="input-base"
                    placeholder="my-app-backend"
                    value={form.railway_svc}
                    onChange={e => set('railway_svc', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[var(--text)] text-sm font-medium mb-2 block">Railway URL</label>
                  <input
                    className="input-base"
                    placeholder="https://xxx.up.railway.app"
                    value={form.railway_url}
                    onChange={e => set('railway_url', e.target.value)}
                  />
                </div>
              </>
            )}
            {form.has_frontend && (
              <>
                <div>
                  <label className="text-[var(--text)] text-sm font-medium mb-2 block flex items-center gap-2">
                    <Globe size={13} className="text-purple-400" /> Vercel Project Name
                  </label>
                  <input
                    className="input-base"
                    placeholder="my-app"
                    value={form.vercel_proj}
                    onChange={e => set('vercel_proj', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[var(--text)] text-sm font-medium mb-2 block">Vercel URL</label>
                  <input
                    className="input-base"
                    placeholder="https://my-app.vercel.app"
                    value={form.vercel_url}
                    onChange={e => set('vercel_url', e.target.value)}
                  />
                </div>
              </>
            )}
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button onClick={handleCreate} disabled={saving} className="btn-primary w-full justify-center">
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </span>
              ) : 'Register Project →'}
            </button>
          </div>
        )}

        {/* Step 3: Launch or push */}
        {step === 3 && created && (
          <div className="space-y-4">
            <div className="glass-card rounded-2xl p-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mx-auto mb-4">
                <Check size={24} className="text-emerald-400" />
              </div>
              <h3 className="font-display text-xl text-white mb-1">{created.alias} registered!</h3>
              <p className="text-[var(--dim)] text-sm">{created.repo_name}</p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={handleLaunch}
                disabled={launching}
                className="btn-primary w-full justify-center py-4"
              >
                {launching ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Launching pipeline...
                  </span>
                ) : (
                  <>
                    <Rocket size={16} /> Launch Now (Railway + Vercel)
                  </>
                )}
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="btn-ghost w-full justify-center"
              >
                I'll push code manually later
              </button>
            </div>

            <div className="glass-card rounded-xl p-4 space-y-1">
              <p className="text-[var(--dim)] text-xs font-mono">Manual deploy pattern:</p>
              <p className="text-purple-300 text-xs font-mono">cd ~/Repos/{created.repo_name}</p>
              <p className="text-purple-300 text-xs font-mono">git add . && git commit -m "deploy" && git push origin main</p>
            </div>
          </div>
        )}
      </div>
    </WorkspaceShell>
  );
}
