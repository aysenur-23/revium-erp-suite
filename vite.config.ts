import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { cspPlugin } from "./vite-plugin-csp";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Base path - Development'ta root, production'da root (Hostinger için)
  base: process.env.VITE_BASE_PATH || '/',
  server: {
    host: "::",
    port: 5173,
  },
  plugins: [
    react(), 
    cspPlugin(),
    // Favicon plugin - rev-favicon.png'yi favicon.ico olarak kopyala
    {
      name: 'copy-favicon',
      closeBundle() {
        const src = path.resolve(__dirname, 'public/rev-favicon.png');
        const dest = path.resolve(__dirname, 'dist/favicon.ico');
        // Eski favicon.ico'yu sil (varsa)
        if (fs.existsSync(dest)) {
          fs.unlinkSync(dest);
        }
        // rev-favicon.png'yi favicon.ico olarak kopyala
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest);
          console.log('✅ favicon.ico oluşturuldu (rev-favicon.png\'den)');
        } else {
          console.warn('⚠️ rev-favicon.png bulunamadı!');
        }
      }
    }
  ],
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
        // Vendor chunk'ları - Performans için chunk'ları ayır
        manualChunks: (id) => {
          // lucide-react'ı ayrı chunk'a ayır
          if (id.includes('lucide-react')) {
            return 'lucide-react';
          }
          
          // React vendor chunk'ları
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          
          // React Router
          if (id.includes('node_modules/react-router')) {
            return 'vendor-router';
          }
          
          // Firebase - tüm Firebase modüllerini bir chunk'a topla
          if (id.includes('node_modules/firebase') || id.includes('firebase')) {
            return 'vendor-firebase';
          }
          
          // PDF Generator - büyük chunk, ayrı tut
          if (id.includes('pdfGenerator') || id.includes('jspdf') || id.includes('html2canvas')) {
            return 'vendor-pdf';
          }
          
          // Admin sayfası - büyük chunk, ayrı tut
          if (id.includes('pages/Admin') || id.includes('components/Admin')) {
            return 'chunk-admin';
          }
          
          // Diğer vendor kütüphaneleri
          if (id.includes('node_modules')) {
            // TanStack Query
            if (id.includes('@tanstack')) {
              return 'vendor-query';
            }
            // Radix UI
            if (id.includes('@radix-ui')) {
              return 'vendor-radix';
            }
            // Diğer vendor'lar
            return 'vendor-other';
          }
          
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
