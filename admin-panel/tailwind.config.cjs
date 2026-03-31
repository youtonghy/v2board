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
        accent: "#1388ef",
        accentSoft: "#e9f4ff",
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
              50: "#eef8ff",
              100: "#d8edff",
              200: "#bae0ff",
              300: "#8bcbff",
              400: "#54aeff",
              500: "#2b93f6",
              600: "#1388ef",
              700: "#0b6fc9",
              800: "#0e5aa3",
              900: "#124c85",
              DEFAULT: "#1388ef",
              foreground: "#ffffff"
            }
          }
        }
      }
    })
  ]
};
