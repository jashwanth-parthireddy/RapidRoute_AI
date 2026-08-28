/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fff1f1',
          100: '#ffd7d7',
          200: '#ffb3b3',
          300: '#ff7b7b',
          400: '#ff4040',
          500: '#f51c1c',
          600: '#e00',
          700: '#c00',
          800: '#a00',
          900: '#800',
        },
        dark: {
          900: '#0a0a0f',
          800: '#0f0f1a',
          700: '#141424',
          600: '#1a1a2e',
          500: '#1f1f3a',
          400: '#252548',
        },
        accent: {
          cyan:   '#00d4ff',
          green:  '#00ff88',
          amber:  '#ffb800',
          red:    '#ff3b3b',
          purple: '#7c3aed',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow':    'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'ping-slow':     'ping 2s cubic-bezier(0,0,0.2,1) infinite',
        'slide-in':      'slideIn 0.3s ease-out',
        'fade-in':       'fadeIn 0.4s ease-out',
        'emergency-glow':'emergencyGlow 1.5s ease-in-out infinite',
      },
      keyframes: {
        slideIn:       { from: { transform: 'translateY(-10px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        fadeIn:        { from: { opacity: '0' }, to: { opacity: '1' } },
        emergencyGlow: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(239,68,68,0.5), 0 0 20px rgba(239,68,68,0.2)' },
          '50%':      { boxShadow: '0 0 20px rgba(239,68,68,0.8), 0 0 40px rgba(239,68,68,0.4)' },
        },
      },
      backdropBlur: { xs: '2px' },
    },
  },
  plugins: [],
}
