/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#eef2f8',
          100: '#d5dee9',
          200: '#a8bdd1',
          300: '#7a9cba',
          400: '#4d7ba3',
          500: '#2b5a85',
          600: '#1f4566',
          700: '#123E73',
          800: '#0D2747',
          900: '#071A33',
          950: '#04101f',
        },
        accent: {
          50: '#eaf2ff',
          100: '#d0e6ff',
          200: '#a3cdff',
          300: '#6faaff',
          400: '#4a90f5',
          500: '#2F80ED',
          600: '#1a6bc7',
          700: '#1559a3',
          800: '#11477f',
          900: '#0d3560',
          950: '#082445',
        },
        emergency: {
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
        },
        secondary: {
          400: '#B8C7D9',
          500: '#9aaec4',
          600: '#7d94ad',
        },
      },
      animation: {
        'slide-in': 'slideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fadeIn 0.25s ease-out',
        'pulse-ring': 'pulseRing 2s ease-out infinite',
        'pop-in': 'popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateY(-12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulseRing: {
          '0%': { boxShadow: '0 0 0 0 rgba(47, 128, 237, 0.5)' },
          '70%': { boxShadow: '0 0 0 10px rgba(47, 128, 237, 0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(47, 128, 237, 0)' },
        },
        popIn: {
          '0%': { transform: 'scale(0.92)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
