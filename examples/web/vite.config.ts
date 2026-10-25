import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  // Keep the standalone lab independent of a parent checkout's PostCSS config.
  css: { postcss: { plugins: [] } },
  server: {
    host: "127.0.0.1",
    port: 4177,
    fs: { allow: [fileURLToPath(new URL("../..", import.meta.url))] },
  },
  build: { outDir: "build", emptyOutDir: true },
});
