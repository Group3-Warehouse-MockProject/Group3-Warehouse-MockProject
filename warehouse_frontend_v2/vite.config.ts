import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    // TanStack Start: xử lý SSR, file-based routing và server entry (Nitro)
    tanstackStart({
      server: { entry: "./src/server.ts" },
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    // Hỗ trợ path alias "@/*" từ tsconfig.json (thay thế vite-tsconfig-paths)
    tsconfigPaths: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  preview: {
    allowedHosts: ["techstock-fe.onrender.com"],
  },
});
