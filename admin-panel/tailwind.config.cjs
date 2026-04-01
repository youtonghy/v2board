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
      fontFamily: {
        sans: ["var(--font-sans)"]
      },
      colors: {
        canvas: "var(--background)",
        ink: "var(--foreground)",
        accent: "var(--accent)",
        accentSoft: "var(--surface-secondary)",
        panel: "var(--surface)",
        surface: "var(--surface)",
        surfaceSoft: "var(--surface-secondary)",
        surfaceMuted: "var(--surface-tertiary)",
        line: "var(--border)"
      },
      boxShadow: {
        panel: "var(--surface-shadow)"
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
            background: "#f6f8fb",
            foreground: "#0f1720",
            primary: {
              50: "#eef7ff",
              100: "#d8ecff",
              200: "#badeff",
              300: "#8bcbff",
              400: "#54aeff",
              500: "#2b93f6",
              600: "#1388ef",
              700: "#0d72cf",
              800: "#0f5fa7",
              900: "#104d86",
              DEFAULT: "#1388ef",
              foreground: "#ffffff"
            }
          }
        }
      }
    })
  ]
};
