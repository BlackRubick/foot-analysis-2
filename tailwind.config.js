/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        clinical: {
          background: '#0f172a',
          surface: '#020617',
          primary: '#0ea5e9',
          primarySoft: '#06b6d4',
          accent: '#22c55e'
        }
      }
    },
  },
  plugins: [],
};