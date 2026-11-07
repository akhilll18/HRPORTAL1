import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import onasBrand from "./brand/onasBrandPlugin.mjs";

// base "./" lets the build run from any folder or static host (GitHub Pages included).
// inlineDynamicImports keeps one bundle (the Word generator included) so the app can also ship as a single HTML file.
export default defineConfig({
  // onasBrand(): re-skins the existing colours to the ONAS logo palette at build time (ONAS_BRAND=off to disable).
  plugins: [onasBrand(), react()],
  base: "./",
  // Generative AI: during `npm run dev`, /api/ai is forwarded to the key-holding proxy (`npm run ai-proxy`).
  server: { proxy: { "/api": { target: "http://localhost:8787", changeOrigin: true } } },
  build: { rollupOptions: { output: { inlineDynamicImports: true } }, chunkSizeWarningLimit: 2500 },
});
