import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['DM Serif Display', 'Georgia', 'serif'],
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        pilot: {
          bg: '#08080a',
          surface: '#111115',
          card: '#16161c',
          border: '#1e1e28',
          accent: '#7c3aed',
          'accent-light': '#a855f7',
          gold: '#f59e0b',
          mint: '#10b981',
          red: '#ef4444',
          muted: '#4b4b60',
          text: '#e2e2f0',
          dim: '#6b6b80',
        }
      },
      backgroundImage: {
        'dot-grid': 'radial-gradient(circle, #1e1e28 1px, transparent 1px)',
        'violet-glow': 'radial-gradient(ellipse at top, rgba(124,58,237,0.15) 0%, transparent 60%)',
      },
      backgroundSize: {
        'dot-grid': '24px 24px',
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease forwards',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
        'terminal-cursor': 'terminalCursor 1s step-end infinite',
        'slide-in': 'slideIn 0.3s ease forwards',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        terminalCursor: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
      boxShadow: {
        'card': '0 0 0 1px rgba(124,58,237,0.1), 0 4px 24px rgba(0,0,0,0.4)',
        'card-hover': '0 0 0 1px rgba(124,58,237,0.3), 0 8px 40px rgba(124,58,237,0.15)',
        'glow': '0 0 30px rgba(124,58,237,0.4)',
        'gold': '0 0 20px rgba(245,158,11,0.3)',
      }
    },
  },
  plugins: [],
}

export default config
