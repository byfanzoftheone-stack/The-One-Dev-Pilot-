'use client';
import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getMe, logout } from '@/lib/api';
import {
  LayoutGrid, Zap, Database, Settings, Plus,
  LogOut, ChevronUp
} from 'lucide-react';

const NAV = [
  { href: '/dashboard', icon: LayoutGrid, label: 'Projects' },
  { href: '/dashboard/new', icon: Plus, label: 'New' },
  { href: '/dashboard/vault', icon: Database, label: 'Vault' },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
];

export default function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [xpAnim, setXpAnim] = useState(false);

  useEffect(() => {
    getMe()
      .then(r => { setUser(r.data.user); setTimeout(() => setXpAnim(true), 300); })
      .catch(() => router.replace('/'))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen dot-grid flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[var(--dim)] text-sm font-mono">Initializing DevPilot...</p>
        </div>
      </div>
    );
  }

  const xpPercent = user ? ((user.xp % 500) / 500) * 100 : 0;
  const levelName = ['Deployer','Builder','Architect','Pilot'][Math.min((user?.level || 1) - 1, 3)];

  return (
    <div className="min-h-screen dot-grid violet-glow flex flex-col">
      {/* Background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-64 bg-purple-600/6 rounded-full blur-3xl" />
      </div>

      {/* Top bar */}
      <header className="relative z-10 border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-xl px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
              <Zap size={14} className="text-purple-400" />
            </div>
            <div>
              <span className="font-display text-base text-white">DevPilot</span>
              <span className="text-[var(--dim)] text-xs ml-2 font-mono">by FanzoftheOne</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* XP */}
            {user && (
              <div className="hidden sm:flex items-center gap-3">
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-md font-mono font-medium tier-${user.tier}`}>
                      {user.tier.toUpperCase()}
                    </span>
                    <span className="text-[var(--dim)] text-xs">Lv.{user.level} {levelName}</span>
                  </div>
                  <div className="xp-bar w-24 mt-1">
                    <div className="xp-fill" style={{ width: xpAnim ? `${xpPercent}%` : '0%' }} />
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-[var(--dim)] hover:text-[var(--text)] text-xs transition-colors"
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">Exit</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1 max-w-5xl mx-auto w-full px-4 py-6 pb-28">
        {children}
      </main>

      {/* Floating bottom dock */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-1 bg-[var(--surface)]/90 backdrop-blur-2xl border border-[var(--border)] rounded-2xl px-3 py-2 shadow-card">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            return (
              <button
                key={href}
                onClick={() => router.push(href)}
                className={`
                  relative flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all
                  ${active
                    ? 'bg-purple-600/20 text-purple-300'
                    : 'text-[var(--dim)] hover:text-[var(--text)] hover:bg-white/5'}
                `}
              >
                <Icon size={18} />
                <span className="text-[10px] font-medium">{label}</span>
                {active && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-purple-400 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
