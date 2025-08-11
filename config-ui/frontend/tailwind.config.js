/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        jira: {
          50: '#f0f9ff',
          500: '#0052cc',
          600: '#0747a6',
          700: '#062e6f'
        }
      }
    },
  },
  plugins: [],
}