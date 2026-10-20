/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#14263D', // Midnight Navy
        secondary: '#0D1929', // Deep Navy
        accent: '#D5A348', // Champagne Gold
        champagne: '#D5A348',
        pearl: '#F3F6FA',
        frosted: 'rgba(255, 255, 255, 0.78)',
        background: '#F3F6FA',
        card: '#FFFFFF',
        textPrimary: '#1B2638',
        textSecondary: '#65748B',
        border: 'rgba(20, 38, 61, 0.08)',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        body: ['"Inter"', 'sans-serif'],
      },
      boxShadow: {
        lux: '0 10px 30px rgba(20, 38, 61, 0.08)',
        soft: '0 6px 18px rgba(20, 38, 61, 0.05)',
        glass: '0 8px 32px 0 rgba(20, 38, 61, 0.08)',
        gold: '0 0 20px rgba(213, 163, 72, 0.25)',
      },
      backdropBlur: {
        xs: '2px',
      },
      borderRadius: {
        '12': '12px',
        '16': '16px',
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
};
