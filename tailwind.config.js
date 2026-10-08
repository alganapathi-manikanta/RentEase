/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#182B52',
        secondary: '#303B78',
        accent: '#D6B36A',
        champagne: '#F0D18A',
        background: '#080F22',
        card: '#131F3D',
        textPrimary: '#F4F7FF',
        textSecondary: '#AAB6D2',
        border: '#33446F',
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
