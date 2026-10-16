import { defineConfig } from "vite";

export default defineConfig({
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  base: "./",
  build: {
    outDir: "dist",
    assetsInlineLimit: 0,
  },
});
