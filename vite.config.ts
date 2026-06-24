import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    host: true,
    proxy: {
      "/api": {
        target: "https://bookstore-backend-g0f7bzbvargjedc7.australiaeast-01.azurewebsites.net",
        changeOrigin: true,
      },
    },
  },
});
