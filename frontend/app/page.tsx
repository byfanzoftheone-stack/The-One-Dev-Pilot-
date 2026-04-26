'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { login, getMe } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');

  useEffect(() => {
    getMe().then(() => router.replace('/dashboard')).catch(() => setChecking(false));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;
    setLoading(true); setError('');
    try {
      const trimmed = key.trim().toUpperCase();
      if (trimmed !== 'FREE' && !trimmed.startsWith('DPLT-')) {
        setError('Invalid key format. Use DPLT-XXXX-XXXX-XXXX or type FREE to start.');
        setLoading(false); return;
      }
      await login(key.trim());
      router.replace('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Check your key.');
    } finally {
      setLoading(false);
    }
  };

  const handleFree = () => { setKey('FREE'); setHint('Free tier: 3 projects, core deploy commands.'); };

  if (checking) {
    return (
      <div className="min-h-screen dot-grid violet-glow flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen dot-grid violet-glow flex flex-col items-center justify-center px-4">
      {/* Background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-600/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-violet-500/6 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-fade-up">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/30 mb-5 shadow-glow">
            <span className="text-2xl">🚀</span>
          </div>
          <h1 className="font-display text-4xl text-white mb-2">DevPilot</h1>
          <p className="text-[var(--dim)] text-sm tracking-widest uppercase font-sans">
            The One Dev Pilot · by FanzoftheOne
          </p>
        </div>

        {/* Card */}
        <div className="glass-card rounded-2xl p-8">
          <h2 className="font-sans text-lg font-medium text-white mb-1">Enter your license key</h2>
          <p className="text-[var(--dim)] text-sm mb-6">
            Deploy full-stack apps from your phone. No laptop needed.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="text"
                value={key}
                onChange={e => { setKey(e.target.value); setError(''); setHint(''); }}
                placeholder="DPLT-XXXX-XXXX-XXXX"
                className="input-base font-mono text-sm"
                autoComplete="off"
                autoCapitalize="characters"
                disabled={loading}
              />
              {hint && <p className="text-[var(--dim)] text-xs mt-2">{hint}</p>}
              {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
            </div>

            <button type="submit" className="btn-primary w-full justify-center text-sm" disabled={loading || !key.trim()}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Launching...
                </span>
              ) : 'Launch DevPilot →'}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-[var(--border)]">
            <button
              onClick={handleFree}
              className="w-full text-center text-[var(--dim)] text-xs hover:text-[var(--text)] transition-colors py-2"
            >
              Start free (3 projects) — no key needed
            </button>
          </div>
        </div>

        {/* Tier info */}
        <div className="mt-5 grid grid-cols-3 gap-3 text-center">
          {[
            { tier: 'Free', price: '$0', features: '3 repos' },
            { tier: 'Pro', price: '$9/mo', features: 'Unlimited + AI' },
            { tier: 'Team', price: '$29/mo', features: 'Multi-user' },
          ].map(({ tier, price, features }) => (
            <div key={tier} className="rounded-xl p-3 border border-[var(--border)] bg-[var(--surface)]">
              <div className="text-white text-xs font-medium">{tier}</div>
              <div className="text-purple-400 text-xs font-mono mt-1">{price}</div>
              <div className="text-[var(--dim)] text-xs mt-1">{features}</div>
            </div>
          ))}
        </div>

        <p className="text-center text-[var(--dim)] text-xs mt-5">
          Get a Pro key at{' '}
          <a href="https://devpilot.app/upgrade" target="_blank" rel="noopener" className="text-purple-400 hover:text-purple-300">
            devpilot.app/upgrade
          </a>
        </p>
      </div>
    </div>
  );
}
