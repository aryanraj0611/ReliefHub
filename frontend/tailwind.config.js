/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Base surfaces — deep navy command-center palette
        navy: {
          950: '#060b18',
          900: '#0b1221',
          800: '#101a2e',
          700: '#162038',
          600: '#1e2d4a',
        },
        slate: {
          750: '#263347',
        },
        // Severity accent system
        critical: '#ef4444',   // red-500
        high:     '#f97316',   // orange-500
        medium:   '#f59e0b',   // amber-500
        low:      '#22c55e',   // green-500
        // Role badge colors
        role: {
          citizen:     '#6366f1', // indigo
          eoc:         '#ef4444', // red
          rescue_team: '#f97316', // orange
          hospital:    '#06b6d4', // cyan
          shelter:     '#8b5cf6', // violet
          volunteer:   '#22c55e', // green
          ngo:         '#f59e0b', // amber
          admin:       '#ec4899', // pink
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        panel: '0 4px 24px rgba(0,0,0,0.4)',
        glow:  '0 0 12px rgba(239,68,68,0.35)',
      },
    },
  },
  plugins: [],
};
