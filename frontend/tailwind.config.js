/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f5ff',
          100: '#e0ebff',
          200: '#c7d9fe',
          300: '#a3c0fd',
          400: '#759afb',
          500: '#4f75f6',
          600: '#3856eb',
          700: '#2c42d7',
          800: '#2836ae',
          900: '#25318a',
          950: '#1b2055',
        },
        dark: {
          900: '#0F1117',
          800: '#161922',
          700: '#1E2330',
          600: '#282F40',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
