const { heroui } = require("@heroui/react");

module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        canvas: "#f4f7f9",
        ink: "#11212d",
        accent: "#ff7a18",
        accentSoft: "#fff0e5",
        panel: "#ffffff",
        line: "#d9e3ea"
      },
      boxShadow: {
        panel: "0 24px 60px rgba(17, 33, 45, 0.08)"
      },
      borderRadius: {
        panel: "1.5rem"
      }
    }
  },
  plugins: [
    heroui({
      themes: {
        fantasticAdmin: {
          extend: "light",
          colors: {
            background: "#f4f7f9",
            foreground: "#11212d",
            primary: {
              50: "#fff5ed",
              100: "#ffe7d3",
              200: "#ffd0a7",
              300: "#ffb577",
              400: "#ff963f",
              500: "#ff7a18",
              600: "#f05c00",
              700: "#c74600",
              800: "#9e3907",
              900: "#7f310b",
              DEFAULT: "#ff7a18",
              foreground: "#ffffff"
            }
          }
        }
      }
    })
  ]
};
