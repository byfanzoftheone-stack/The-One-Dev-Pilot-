'use client';
import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '@/lib/api';
import { CheckCircle, XCircle, Terminal, Copy, ChevronDown } from 'lucide-react';

interface LogLine {
  text: string;
  type: 'info' | 'success' | 'error' | 'warn' | 'cmd';
  timestamp: string;
}

interface Props {
  deployId: string;
  alias: string;
  autoScroll?: boolean;
}

const typeColor: Record<string, string> = {
  info:    'text-[#8b8ba0]',
  cmd:     'text-purple-400',
  success: 'text-emerald-400',
  error:   'text-red-400',
  warn:    'text-amber-400',
};

export default function LiveTerminal({ deployId, alias, autoScroll = true }: Props) {
  const [lines, setLines] = useState<LogLine[]>([]);
  const [status, setStatus] = useState<'connecting' | 'running' | 'done' | 'failed'>('connecting');
  const [summary, setSummary] = useState('');
  const [connected, setConnected] = useState(false);
  const [copied, setCopied] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!deployId) return;

    const socket = io(SOCKET_URL, { withCredentials: true, transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setStatus('running');
      socket.emit('deploy:join', deployId);
      setLines(prev => [...prev, {
        text: `Connected to deploy stream: ${deployId.slice(0, 8)}...`,
        type: 'info',
        timestamp: new Date().toISOString()
      }]);
    });

    socket.on('log:line', (data: LogLine) => {
      setLines(prev => [...prev, data]);
    });

    socket.on('log:done', ({ success, summary }: { success: boolean; summary: string }) => {
      setStatus(success ? 'done' : 'failed');
      setSummary(summary);
      setLines(prev => [...prev, {
        text: success ? `✅ ${summary}` : `❌ ${summary}`,
        type: success ? 'success' : 'error',
        timestamp: new Date().toISOString()
      }]);
    });

    socket.on('log:error', ({ message }: { message: string }) => {
      setStatus('failed');
      setLines(prev => [...prev, { text: `❌ ${message}`, type: 'error', timestamp: new Date().toISOString() }]);
    });

    socket.on('disconnect', () => setConnected(false));

    return () => {
      socket.emit('deploy:leave', deployId);
      socket.disconnect();
    };
  }, [deployId]);

  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  const copyLogs = () => {
    navigator.clipboard.writeText(lines.map(l => l.text).join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="terminal flex flex-col" style={{ minHeight: '420px', maxHeight: '520px' }}>
      {/* Terminal header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/60" />
            <div className="w-3 h-3 rounded-full bg-amber-500/60" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
          </div>
          <div className="flex items-center gap-2">
            <Terminal size={12} className="text-[var(--dim)]" />
            <span className="font-mono text-xs text-[var(--dim)]">
              {alias} — deploy:{deployId?.slice(0, 8)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status indicator */}
          <div className="flex items-center gap-1.5">
            {status === 'connecting' && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
            {status === 'running' && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
            {status === 'done' && <CheckCircle size={14} className="text-emerald-400" />}
            {status === 'failed' && <XCircle size={14} className="text-red-400" />}
            <span className="font-mono text-xs text-[var(--dim)] capitalize">{status}</span>
          </div>

          <button onClick={copyLogs} className="text-[var(--dim)] hover:text-white transition-colors">
            {copied ? <CheckCircle size={13} className="text-emerald-400" /> : <Copy size={13} />}
          </button>
        </div>
      </div>

      {/* Log output */}
      <div className="flex-1 overflow-y-auto py-3 space-y-0.5" style={{ scrollbarWidth: 'thin' }}>
        {lines.length === 0 ? (
          <div className="px-5 py-8 text-center text-[var(--muted)] font-mono text-sm">
            <span className="animate-cursor">█</span> Waiting for log stream...
          </div>
        ) : (
          lines.map((line, i) => (
            <div key={i} className={`terminal-line ${typeColor[line.type] || typeColor.info}`}>
              <span className="text-[var(--muted)] select-none mr-3 text-[11px]">
                {new Date(line.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              {line.text || ' '}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Status bar */}
      {(status === 'done' || status === 'failed') && (
        <div className={`px-4 py-2 border-t border-[var(--border)] text-xs font-mono ${status === 'done' ? 'text-emerald-400' : 'text-red-400'}`}>
          {status === 'done' ? '✓' : '✗'} {summary}
        </div>
      )}
    </div>
  );
}
