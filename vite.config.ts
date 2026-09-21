import { defineConfig } from "vite";

export default defineConfig({
  // nothing special needed for a plain TS library playground
  root: ".",
  base: "/symbolic",
  build: {
      outDir: "docs",
    },
  server: {
    port: 3000,
    open: true,
  },
});
