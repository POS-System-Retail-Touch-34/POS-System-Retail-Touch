/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          '50': '#f0f4ff',
          '100': '#e0eaff',
          '200': '#c7d7fe',
          '300': '#a5bafd',
          '400': '#8194fb',
          '500': '#6272f8',
          '600': '#4f52ed',
          '700': '#4040d2',
          '800': '#3535ab',
          '900': '#2f3188',
          '950': '#1c1d52',
        },
        dark: {
          '50': '#f8fafc',
          '100': '#f1f5f9',
          '200': '#e2e8f0',
          '800': '#1e293b',
          '850': '#172033',
          '900': '#0f172a',
          '950': '#020617',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          'sans-serif',
        ],
      },
      animation: {
        shimmer: 'shimmer 1.5s infinite',
        'slide-in': 'slideIn 0.2s ease-out',
        'fade-in': 'fadeIn 0.15s ease-out',
      },
      keyframes: {
        shimmer: {
          '0%': {
            backgroundPosition: '-200% 0',
          },
          '100%': {
            backgroundPosition: '200% 0',
          },
        },
        slideIn: {
          '0%': {
            transform: 'translateY(-8px)',
            opacity: 0,
          },
          '100%': {
            transform: 'translateY(0)',
            opacity: 1,
          },
        },
        fadeIn: {
          '0%': {
            opacity: 0,
          },
          '100%': {
            opacity: 1,
          },
        },
      },
    },
  },
  plugins: [],
}
