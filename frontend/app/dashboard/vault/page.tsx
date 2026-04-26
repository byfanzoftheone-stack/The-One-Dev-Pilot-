'use client';
import React, { useEffect, useState } from 'react';
import WorkspaceShell from '@/components/WorkspaceShell';
import { getVaultItems, saveVaultItem, deleteVaultItem } from '@/lib/api';
import { Database, Plus, Trash2, Search, FileText, Zap, Code, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const typeIcon: Record<string, React.ReactNode> = {
  build:   <Zap size={13} className="text-amber-400" />,
  pattern: <Code size={13} className="text-purple-400" />,
  prompt:  <FileText size={13} className="text-blue-400" />,
};

const typeLabel: Record<string, string> = {
  build: 'Build', pattern: 'Pattern', prompt: 'Prompt',
};

export default function VaultPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', content: '', type: 'pattern', tags: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getVaultItems()
      .then(r => setItems(r.data.items))
      .finally(() => setLoading(false));
  }, []);

  const handleAdd = async () => {
    if (!newItem.name.trim()) return;
    setSaving(true);
    try {
      const res = await saveVaultItem({
        ...newItem,
        tags: newItem.tags.split(',').map(t => t.trim()).filter(Boolean)
      });
      setItems(i => [res.data.item, ...i]);
      setNewItem({ name: '', content: '', type: 'pattern', tags: '' });
      setAdding(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this vault item?')) return;
    await deleteVaultItem(id);
    setItems(i => i.filter(x => x.id !== id));
  };

  const filtered = items.filter(item => {
    const matchType = filter === 'all' || item.type === filter;
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase()) || item.content?.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  return (
    <WorkspaceShell>
      <div className="stagger space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl text-white flex items-center gap-3">
              <Database size={24} className="text-purple-400" />
              BrainVault
            </h1>
            <p className="text-[var(--dim)] text-sm mt-1">
              {items.length} pattern{items.length !== 1 ? 's' : ''} · learned from every build
            </p>
          </div>
          <button
            onClick={() => setAdding(!adding)}
            className="btn-primary text-sm"
          >
            <Plus size={15} /> Save Pattern
          </button>
        </div>

        {/* Add form */}
        {adding && (
          <div className="glass-card rounded-2xl p-5 space-y-4">
            <h3 className="text-white text-sm font-medium">Save to Vault</h3>
            <div className="grid grid-cols-2 gap-3">
              <input
                className="input-base"
                placeholder="Pattern name"
                value={newItem.name}
                onChange={e => setNewItem(n => ({ ...n, name: e.target.value }))}
              />
              <select
                className="input-base"
                value={newItem.type}
                onChange={e => setNewItem(n => ({ ...n, type: e.target.value }))}
              >
                <option value="pattern">Pattern</option>
                <option value="build">Build Record</option>
                <option value="prompt">Prompt</option>
              </select>
            </div>
            <textarea
              className="input-base font-mono text-xs"
              placeholder="Pattern content, code snippet, or notes..."
              rows={5}
              value={newItem.content}
              onChange={e => setNewItem(n => ({ ...n, content: e.target.value }))}
            />
            <input
              className="input-base"
              placeholder="Tags (comma separated): railway, env-vars, nextjs..."
              value={newItem.tags}
              onChange={e => setNewItem(n => ({ ...n, tags: e.target.value }))}
            />
            <div className="flex gap-2">
              <button onClick={handleAdd} disabled={saving} className="btn-primary text-sm">
                {saving ? 'Saving...' : 'Save to Vault'}
              </button>
              <button onClick={() => setAdding(false)} className="btn-ghost text-sm">Cancel</button>
            </div>
          </div>
        )}

        {/* Filter + search */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-1">
            {['all', 'build', 'pattern', 'prompt'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs capitalize transition-all ${
                  filter === f ? 'bg-purple-600/20 text-purple-300' : 'text-[var(--dim)] hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="flex-1 relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--dim)]" />
            <input
              className="input-base pl-8 text-sm"
              placeholder="Search vault..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Items */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="glass-card rounded-xl h-16 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Database size={32} className="text-[var(--muted)] mx-auto mb-3" />
            <p className="text-[var(--dim)] text-sm">
              {search ? 'No matches found' : 'Vault is empty — patterns save automatically after each deploy'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(item => (
              <div key={item.id} className="glass-card rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-4"
                  onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                >
                  <div className="flex items-center gap-3">
                    {typeIcon[item.type] || typeIcon.pattern}
                    <div className="text-left">
                      <p className="text-white text-sm font-medium">{item.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[var(--muted)] text-xs capitalize">{typeLabel[item.type]}</span>
                        {item.tags?.slice(0,3).map((t: string) => (
                          <span key={t} className="text-[10px] bg-purple-500/10 text-purple-400 rounded px-1.5 py-0.5">{t}</span>
                        ))}
                        <span className="text-[var(--muted)] text-xs">
                          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(item.id); }}
                      className="p-1.5 rounded-lg text-[var(--dim)] hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                    {expanded === item.id ? <ChevronUp size={13} className="text-[var(--dim)]" /> : <ChevronDown size={13} className="text-[var(--dim)]" />}
                  </div>
                </button>
                {expanded === item.id && item.content && (
                  <div className="border-t border-[var(--border)] px-4 py-3">
                    <pre className="font-mono text-xs text-[var(--dim)] whitespace-pre-wrap max-h-64 overflow-y-auto">
                      {item.content}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </WorkspaceShell>
  );
}
