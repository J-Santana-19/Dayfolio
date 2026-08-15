import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: path.resolve(projectRoot, "github-pages"),
  base: "/Dayfolio/",
  publicDir: path.resolve(projectRoot, "public"),
  plugins: [react()],
  resolve: {
    alias: {
      "@": projectRoot,
    },
  },
  build: {
    outDir: path.resolve(projectRoot, "dist-pages"),
    emptyOutDir: true,
  },
});
