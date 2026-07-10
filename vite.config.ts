import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  base: '/book_store_frontend/',
  server: {
    port: 5174,
    host: true,
  },
});
