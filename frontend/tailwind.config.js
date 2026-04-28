/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        verdict: {
          biased: {
            bg: '#fef2f2',
            border: '#fca5a5',
            text: '#dc2626',
          },
          borderline: {
            bg: '#fffbeb',
            border: '#fcd34d',
            text: '#d97706',
          },
          fair: {
            bg: '#f0fdf4',
            border: '#86efac',
            text: '#16a34a',
          },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
