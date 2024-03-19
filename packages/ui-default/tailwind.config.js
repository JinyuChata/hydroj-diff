/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./templates/**/*.{html,ts,jsx,tsx,jsx}",
    "./pages/**/*.{html,ts,jsx,tsx,jsx}",
    "./components/**/*.{html,ts,jsx,tsx,jsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [require("@tailwindcss/typography")],
};
