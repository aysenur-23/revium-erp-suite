import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { cspPlugin } from "./vite-plugin-csp";

export default defineConfig(() => ({
  base: process.env.VITE_BASE_PATH || "/",
  server: {
    host: "::",
    port: 5173,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    cspPlugin(),
    {
      name: "copy-favicon",
      closeBundle() {
        const src = path.resolve(__dirname, "public/rev-favicon.png");
        const dest = path.resolve(__dirname, "dist/favicon.ico");

        if (fs.existsSync(dest)) {
          fs.unlinkSync(dest);
        }

        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest);
          console.log("favicon.ico created from rev-favicon.png");
        } else {
          console.warn("rev-favicon.png was not found");
        }
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "lucide-react",
      "@radix-ui/react-dialog",
      "@radix-ui/react-select",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-tooltip",
      "@radix-ui/react-accordion",
      "@radix-ui/react-alert-dialog",
      "@radix-ui/react-avatar",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-collapsible",
      "@radix-ui/react-context-menu",
      "@radix-ui/react-popover",
      "@radix-ui/react-tabs",
      "@tanstack/react-query",
      "sonner",
      "class-variance-authority",
      "clsx",
      "tailwind-merge",
      "firebase/app",
      "firebase/auth",
      "firebase/firestore",
      "firebase/storage",
    ],
    exclude: ["pdfGenerator", "jspdf", "html2canvas"],
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: false,
    minify: "esbuild",
    target: ["es2015", "edge88", "firefox78", "chrome87", "safari14"],
    cssCodeSplit: true,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      treeshake: {
        moduleSideEffects: "no-external",
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false,
      },
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules/firebase") || id.includes("/firebase/")) {
            return "vendor-firebase";
          }

          if (
            id.includes("pdfGenerator") ||
            id.includes("jspdf") ||
            id.includes("html2canvas") ||
            id.includes("jspdf-autotable")
          ) {
            return "vendor-pdf";
          }

          if (
            id.includes("node_modules/react") ||
            id.includes("node_modules/react-dom") ||
            id.includes("@radix-ui") ||
            id.includes("node_modules/react-router") ||
            id.includes("node_modules/react-hook-form") ||
            id.includes("node_modules/@hookform") ||
            id.includes("@tanstack") ||
            id.includes("node_modules/next-themes") ||
            id.includes("node_modules/sonner") ||
            id.includes("node_modules/vaul") ||
            id.includes("node_modules/cmdk") ||
            id.includes("node_modules/react-day-picker") ||
            id.includes("node_modules/react-resizable-panels") ||
            id.includes("node_modules/@hello-pangea/dnd") ||
            id.includes("node_modules/embla-carousel-react") ||
            id.includes("node_modules/input-otp") ||
            id.includes("node_modules/recharts") ||
            id.includes("node_modules/class-variance-authority") ||
            id.includes("node_modules/clsx") ||
            id.includes("node_modules/tailwind-merge") ||
            id.includes("node_modules/tailwindcss-animate") ||
            id.includes("node_modules/zod") ||
            id.includes("node_modules/date-fns") ||
            id.includes("lucide-react") ||
            id.includes("pages/Admin") ||
            id.includes("components/Admin")
          ) {
            return "vendor-react";
          }

          return undefined;
        },
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split(".") || [];
          const ext = info[info.length - 1];

          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext || "")) {
            return "assets/images/[name]-[hash][extname]";
          }

          if (/woff2?|eot|ttf|otf/i.test(ext || "")) {
            return "assets/fonts/[name]-[hash][extname]";
          }

          return "assets/[name]-[hash][extname]";
        },
      },
    },
  },
}));
