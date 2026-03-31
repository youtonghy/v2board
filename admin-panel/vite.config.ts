import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/assets/admin-v2/",
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, "../public/assets/admin-v2"),
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        entryFileNames: "index.js",
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: assetInfo =>
          assetInfo.name && assetInfo.name.endsWith(".css")
            ? "index.css"
            : "assets/[name]-[hash][extname]"
      }
    }
  }
});
