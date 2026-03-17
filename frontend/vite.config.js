import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://backend:3001", // 'backend' is the service name in your docker-compose
        changeOrigin: true,
      },
    },
  },
});
