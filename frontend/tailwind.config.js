/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#e7fbe9',
          100: '#d2f7d7',
          200: '#a8ebba',
          300: '#7adf9c',
          400: '#49d97d',
          500: '#25D366',
          600: '#1ebd5a',
          700: '#128C7E',
          800: '#0d6e63',
          900: '#075E54'
        }
      }
    }
  },
  plugins: [],
};
