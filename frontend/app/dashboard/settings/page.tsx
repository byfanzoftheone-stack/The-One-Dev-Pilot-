'use client';
import React, { useEffect, useState } from 'react';
import WorkspaceShell from '@/components/WorkspaceShell';
import { getMe, updateProfile, getKeys, saveKey, deleteKey } from '@/lib/api';
import { Settings, Key, User, Check, Eye, EyeOff, Trash2, ExternalLink, ChevronRight, Shield } from 'lucide-react';

const KEY_META: Record<string, { label: string; placeholder: string; color: string; hint: string }> = {
  github:  { label: 'GitHub PAT', placeholder: 'ghp_xxxx or github_pat_xxx', color: 'text-white', hint: 'github.com/settings/tokens — needs: repo, workflow' },
  claude:  { label: 'Claude API Key', placeholder: 'sk-ant-api03-xxx', color: 'text-orange-300', hint: 'console.anthropic.com — required for AI audit/fix/chat' },
  railway: { label: 'Railway Token', placeholder: 'xxxxxxxx-xxxx-xxxx', color: 'text-pink-300', hint: 'railway.app/account/tokens' },
  vercel:  { label: 'Vercel Token', placeholder: 'xxxxxxxxxxxxxxxx', color: 'text-blue-300', hint: 'vercel.com/account/tokens' },
};

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [keys, setKeys] = useState<Record<string, boolean>>({});
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [show, setShow] = useState<Record<string, boolean>>({});
  const [profile, setProfile] = useState({ gh_user: '', vercel_team_id: '' });
  const [savingKey, setSavingKey] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [saved, setSaved] = useState('');
  const [licenseInput, setLicenseInput] = useState('');
  const [activatingLicense, setActivatingLicense] = useState(false);

  useEffect(() => {
    Promise.all([getMe(), getKeys()]).then(([uRes, kRes]) => {
      setUser(uRes.data.user);
      setProfile({ gh_user: uRes.data.user.gh_user || '', vercel_team_id: uRes.data.user.vercel_team_id || '' });
      const keyMap: Record<string, boolean> = {};
      kRes.data.keys.forEach((k: any) => { keyMap[k.key_name] = true; });
      setKeys(keyMap);
    });
  }, []);

  const handleSaveKey = async (name: string) => {
    if (!inputs[name]?.trim()) return;
    setSavingKey(name);
    try {
      await saveKey(name, inputs[name].trim());
      setKeys(k => ({ ...k, [name]: true }));
      setInputs(i => ({ ...i, [name]: '' }));
      setSaved(name);
      setTimeout(() => setSaved(''), 2000);
    } finally {
      setSavingKey('');
    }
  };

  const handleDeleteKey = async (name: string) => {
    if (!confirm(`Remove ${KEY_META[name].label}?`)) return;
    await deleteKey(name);
    setKeys(k => ({ ...k, [name]: false }));
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await updateProfile(profile);
      setSaved('profile');
      setTimeout(() => setSaved(''), 2000);
    } finally {
      setSavingProfile(false);
    }
  };

  const tier = user?.tier || 'free';
  const xpPercent = user ? ((user.xp % 500) / 500) * 100 : 0;
  const levelNames = ['Deployer', 'Builder', 'Architect', 'Pilot'];
  const levelName = levelNames[Math.min((user?.level || 1) - 1, 3)];

  return (
    <WorkspaceShell>
      <div className="stagger space-y-5 max-w-xl">
        <h1 className="font-display text-3xl text-white flex items-center gap-3">
          <Settings size={24} className="text-purple-400" /> Settings
        </h1>

        {/* Profile / XP card */}
        {user && (
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white text-sm font-medium flex items-center gap-2"><User size={14} /> Profile</h2>
              <span className={`text-xs px-2 py-0.5 rounded-md font-mono tier-${tier}`}>{tier.toUpperCase()}</span>
            </div>

            {/* XP */}
            <div className="mb-5 p-3 bg-purple-600/8 border border-purple-500/15 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-purple-300 text-xs font-medium">Level {user.level} — {levelName}</span>
                <span className="text-[var(--dim)] text-xs font-mono">{user.xp % 500}/500 XP</span>
              </div>
              <div className="xp-bar"><div className="xp-fill" style={{ width: `${xpPercent}%` }} /></div>
              <div className="flex items-center gap-4 mt-2 text-[11px] text-[var(--dim)]">
                <span>{user.deploy_count} deploys</span>
                <span>{user.fix_count} AI fixes</span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[var(--text)] text-xs font-medium mb-1.5 block">GitHub Username / Org</label>
                <input
                  className="input-base text-sm"
                  placeholder="byfanzoftheone-stack"
                  value={profile.gh_user}
                  onChange={e => setProfile(p => ({ ...p, gh_user: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-[var(--text)] text-xs font-medium mb-1.5 block">Vercel Team ID</label>
                <input
                  className="input-base text-sm font-mono"
                  placeholder="team_xxxxxxxxxxxxxxxx"
                  value={profile.vercel_team_id}
                  onChange={e => setProfile(p => ({ ...p, vercel_team_id: e.target.value }))}
                />
              </div>
              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="btn-primary text-sm w-full justify-center"
              >
                {saved === 'profile' ? <><Check size={14} /> Saved!</> : savingProfile ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>
        )}

        {/* API Keys */}
        <div className="glass-card rounded-2xl p-5">
          <h2 className="text-white text-sm font-medium flex items-center gap-2 mb-1">
            <Key size={14} className="text-purple-400" /> API Keys
          </h2>
          <p className="text-[var(--dim)] text-xs mb-5 flex items-center gap-1">
            <Shield size={11} /> Encrypted at rest · never exposed
          </p>

          <div className="space-y-5">
            {Object.entries(KEY_META).map(([name, meta]) => (
              <div key={name}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className={`text-xs font-medium ${meta.color}`}>{meta.label}</label>
                    <a
                      href={name === 'github' ? 'https://github.com/settings/tokens' :
                            name === 'claude' ? 'https://console.anthropic.com' :
                            name === 'railway' ? 'https://railway.app/account/tokens' :
                            'https://vercel.com/account/tokens'}
                      target="_blank" rel="noopener"
                      className="text-[var(--dim)] text-[11px] flex items-center gap-1 hover:text-purple-300 transition-colors"
                    >
                      {meta.hint} <ExternalLink size={9} />
                    </a>
                  </div>
                  {keys[name] && (
                    <div className="flex items-center gap-1">
                      <Check size={12} className="text-emerald-400" />
                      <span className="text-emerald-400 text-xs">Set</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type={show[name] ? 'text' : 'password'}
                      className="input-base text-sm font-mono pr-10"
                      placeholder={keys[name] ? '••••••••••••• (update)' : meta.placeholder}
                      value={inputs[name] || ''}
                      onChange={e => setInputs(i => ({ ...i, [name]: e.target.value }))}
                    />
                    <button
                      onClick={() => setShow(s => ({ ...s, [name]: !s[name] }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--dim)]"
                    >
                      {show[name] ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                  <button
                    onClick={() => handleSaveKey(name)}
                    disabled={!inputs[name]?.trim() || savingKey === name}
                    className="px-3 py-2 rounded-xl bg-purple-600/15 text-purple-300 border border-purple-500/20 text-xs hover:bg-purple-600/25 disabled:opacity-40 transition-all min-w-[52px]"
                  >
                    {saved === name ? <Check size={13} /> : savingKey === name ? '...' : 'Save'}
                  </button>
                  {keys[name] && (
                    <button
                      onClick={() => handleDeleteKey(name)}
                      className="px-3 py-2 rounded-xl bg-red-500/8 text-red-400 border border-red-500/15 text-xs hover:bg-red-500/15 transition-all"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* License / Upgrade */}
        <div className="glass-card rounded-2xl p-5">
          <h2 className="text-white text-sm font-medium mb-4">License</h2>
          {tier === 'free' ? (
            <>
              <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-4 mb-4">
                <p className="text-amber-300 text-sm font-medium">You're on the Free tier</p>
                <p className="text-[var(--dim)] text-xs mt-1">3 projects max · no AI features</p>
              </div>
              <div className="space-y-3">
                <input
                  className="input-base text-sm font-mono"
                  placeholder="DPLT-XXXX-XXXX-XXXX"
                  value={licenseInput}
                  onChange={e => setLicenseInput(e.target.value.toUpperCase())}
                />
                <button className="btn-primary w-full justify-center text-sm">
                  Activate License
                </button>
                <a
                  href="https://devpilot.app/upgrade"
                  target="_blank" rel="noopener"
                  className="flex items-center justify-center gap-2 text-amber-300 text-sm hover:text-amber-200 transition-colors"
                >
                  Get Pro for $9/mo <ExternalLink size={12} />
                </a>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-purple-600/10 border border-purple-500/20 rounded-xl">
              <Check size={16} className="text-emerald-400" />
              <div>
                <p className="text-white text-sm">Active: <span className={`tier-${tier} text-xs px-1.5 py-0.5 rounded`}>{tier.toUpperCase()}</span></p>
                <p className="text-[var(--dim)] text-xs mt-0.5">All features unlocked</p>
              </div>
            </div>
          )}
        </div>

        {/* Stack info */}
        <div className="glass-card rounded-xl p-4">
          <p className="text-[var(--dim)] text-xs font-mono mb-2 text-center">DevPilot v1.0 · by FanzoftheOne</p>
          <div className="flex items-center justify-center gap-3 text-[11px] text-[var(--muted)]">
            <span>Next.js 15</span>·<span>Express</span>·<span>Railway</span>·<span>Vercel</span>·<span>Claude AI</span>
          </div>
        </div>
      </div>
    </WorkspaceShell>
  );
}
