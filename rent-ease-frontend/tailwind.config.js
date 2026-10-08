/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#061A33', // Deep Midnight Navy
        secondary: '#0D2748', // Rich Navy
        accent: '#C9A35A', // Luxury Gold
        champagne: '#D8BC7A', // Champagne Gold
        background: '#F8F6F2', // Warm White
        card: '#FFFFFF',
        textPrimary: '#1E293B',
        textSecondary: '#64748B',
        border: '#E5E7EB',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        body: ['"Inter"', 'sans-serif'],
      },
      boxShadow: {
        lux: '0 10px 30px rgba(0,0,0,0.08)',
        soft: '0 6px 18px rgba(0,0,0,0.06)',
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
