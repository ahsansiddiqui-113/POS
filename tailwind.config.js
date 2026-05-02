/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f0f9ff",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
        },
        success: {
          500: "#10b981",
          600: "#059669",
        },
        danger: {
          500: "#ef4444",
          600: "#dc2626",
        },
        warning: {
          500: "#f59e0b",
          600: "#d97706",
        },
      },
      animation: {
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
  ],
};
