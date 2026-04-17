/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        "bg-main": "#040A1D",
        "bg-card": "#11192B",
        "line-soft": "#24314A",
        "text-soft": "#8E9AB0",
        brand: "#3B82F6",
      },
      boxShadow: {
        card: "0 6px 24px rgba(0, 0, 0, 0.3)",
      },
    },
  },
  plugins: [],
}

