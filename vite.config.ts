import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  server: {
    port: 3000,
    open: true,
  },
  // config for github page
  base: "/symbolic",
  build: {
      outDir: "docs",
    },
});
