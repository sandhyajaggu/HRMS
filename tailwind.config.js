/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { 950: '#0A1F44', 900: '#0F2A5C', 800: '#16366F', 700: '#1E4488' },
        brand: { 50: '#EEF4FF', 100: '#DCE7FE', 500: '#2F6FEB', 600: '#2159D6', 700: '#1B47AB' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'] },
      boxShadow: { card: '0 1px 2px rgba(16,24,40,.04), 0 1px 3px rgba(16,24,40,.06)' },
    },
  },
  plugins: [],
};
