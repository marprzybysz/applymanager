import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(() => ({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    proxy: {
      "/api": {
        target: process.env.VITE_API_PROXY_TARGET || "http://localhost:3000",
        changeOrigin: true
      }
    }
  },
  envPrefix: ["VITE_"],
  build: {
    target: "es2020"
  }
}));
