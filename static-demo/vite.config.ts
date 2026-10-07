import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// No Workers, D1, R2, SSR or environment secrets enter this build.
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  publicDir: false,
  define: { __DEMO_NEUTRAL__: "true" },
  plugins: [react()],
  build: {
    outDir: "../outputs/static-demo/site",
    emptyOutDir: true,
  },
});
