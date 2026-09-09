/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      spacing: {
        4.5: "1.125rem",
      },
      colors: {
        green: {
          900: "#12281C",
          800: "#1B3A28",
          700: "#25502F",
        },
        amber: {
          600: "#B9791C",
          100: "#F6E7CE",
        },
        paper: "#FAF7F1",
        ink: "#1E2621",
        inksoft: "#5C685F",
        line: "#E6E1D6",
        brand: {
          red: "#B23B2E",
          blue: "#2F5D8A",
        },
      },
      borderRadius: {
        card: "10px",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
