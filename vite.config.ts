import { defineConfig } from "vite";

export default defineConfig({
  // nothing special needed for a plain TS library playground
  root: ".",
  server: {
    port: 3000,
    open: true,
  },
});
