import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import { resolve } from "path";
import { loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const apiTarget = env.VITE_API_URL || "http://localhost:38080";

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": resolve(__dirname, "src"),
      },
    },
    server: {
      port: 5174,
      watch: {
        usePolling: true,
        interval: 1000,
      },
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
          ws: true,
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("animejs")) {
              return "vendor-motion";
            }

            if (id.includes("@dnd-kit")) {
              return "vendor-dnd";
            }

            if (
              id.includes("/react/") ||
              id.includes("/react-dom/") ||
              id.includes("/scheduler/")
            ) {
              return "vendor-react";
            }

            if (id.includes("recharts")) {
              return "vendor-chart";
            }

            if (id.includes("sonner")) {
              return "vendor-feedback";
            }

            if (
              id.includes("/design-system/packages/ui/") ||
              id.includes("/design-system/packages/tokens/")
            ) {
              return "vendor-ui";
            }

            if (
              id.includes("@tanstack/react-query") ||
              id.includes("axios") ||
              id.includes("zustand") ||
              id.includes("react-router") ||
              id.includes("i18next") ||
              id.includes("react-i18next")
            ) {
              return "vendor-app";
            }

            if (id.includes("lucide-react")) {
              return "vendor-icons";
            }

            if (id.includes("node_modules")) {
              return "vendor";
            }
          },
        },
      },
    },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      css: false,
      include: ["src/**/*.{test,spec}.{ts,tsx}"],
    },
  };
});
