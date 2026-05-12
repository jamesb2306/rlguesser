/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Bebas Neue"', '"Playfair Display"', 'Georgia', 'serif'],
        heading: ['"Playfair Display"', 'Georgia', 'serif'],
        body:    ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono:    ['"IBM Plex Mono"', 'monospace'],
      },
      colors: {
        pitch: {
          DEFAULT: '#0a1a0f',
          50:  '#f0f7f1',
          100: '#d6edda',
          200: '#a8d6b0',
          300: '#6db87a',
          400: '#3d9450',
          500: '#1e6b30',
          600: '#0f4a1e',
          700: '#0a3315',
          800: '#07220e',
          900: '#04140a',
        },
        mud: {
          DEFAULT: '#c8a96e',
          50:  '#fdf8ef',
          100: '#f5e9cc',
          200: '#ead199',
          300: '#dab967',
          400: '#c8a96e',
          500: '#b08940',
          600: '#8a6a2e',
          700: '#664f22',
          800: '#433417',
          900: '#221a0c',
        },
        chalk: '#f5f0e8',
        scarlet: '#c41e3a',
        amber:  '#f5a623',
      },
      backgroundImage: {
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
      },
      boxShadow: {
        'card':  '4px 6px 24px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)',
        'card-hover': '6px 10px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
      },
      animation: {
        'shimmer': 'shimmer 2.5s ease-in-out infinite',
        'deal':    'deal 0.4s cubic-bezier(0.22,1,0.36,1) forwards',
        'reveal':  'reveal 0.5s cubic-bezier(0.22,1,0.36,1) forwards',
        'shake':   'shake 0.35s ease-in-out',
        'score-pop': 'scorePop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards',
      },
      keyframes: {
        shimmer: {
          '0%,100%': { opacity: '0.6' },
          '50%':     { opacity: '1' },
        },
        deal: {
          '0%':   { opacity: '0', transform: 'translateY(-20px) rotate(-2deg)' },
          '100%': { opacity: '1', transform: 'translateY(0) rotate(0deg)' },
        },
        reveal: {
          '0%':   { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shake: {
          '0%,100%': { transform: 'translateX(0)' },
          '20%':     { transform: 'translateX(-6px)' },
          '40%':     { transform: 'translateX(6px)' },
          '60%':     { transform: 'translateX(-4px)' },
          '80%':     { transform: 'translateX(4px)' },
        },
        scorePop: {
          '0%':   { opacity: '0', transform: 'scale(0.5) translateY(8px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
