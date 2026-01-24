import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    host: "0.0.0.0", // 允许通过 IP 访问
    port: 5173, // 你可以根据需要修改端口
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  esbuild: {
    // 生产环境移除 console 和 debugger
    drop: process.env.NODE_ENV === "production" ? ["console", "debugger"] : [],
  },
});
