/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#DC2626',
          hover:   '#B91C1C',
          light:   '#FEF2F2',
          border:  '#FECACA',
        },
      },
    },
  },
  plugins: [],
};
