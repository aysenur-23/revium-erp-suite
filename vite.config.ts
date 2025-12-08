import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { cspPlugin } from "./vite-plugin-csp";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Base path - Development'ta root, production'da root (Hostinger için)
  base: process.env.VITE_BASE_PATH || '/',
  server: {
    host: "::",
    port: 5173,
  },
  plugins: [react(), cspPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"], // React'in birden fazla kopyasını önle
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom", "lucide-react"], // React ve lucide-react'ı önceden yükle
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: false,
    minify: "esbuild",
    // Target modern browsers but with better compatibility
    target: ['es2015', 'edge88', 'firefox78', 'chrome87', 'safari14'],
    // CSS code splitting
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        // Vendor chunk'ları - lucide-react'ı ayrı chunk'a ayır (export sorununu çözer)
        manualChunks: (id) => {
          // lucide-react'ı ayrı chunk'a ayır
          if (id.includes('lucide-react')) {
            return 'lucide-react';
          }
          // Vendor chunk'larını kaldır - Tüm kod tek bundle'da (React yükleme sırası sorununu çözer)
          return undefined;
        },
        // Asset dosyalarını optimize et
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || [];
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext || '')) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/woff2?|eot|ttf|otf/i.test(ext || '')) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
}));
