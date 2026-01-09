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
    // Development performans optimizasyonları
    hmr: {
      overlay: false, // HMR overlay'i kapat (daha hızlı)
    },
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
      "firebase/storage"
    ], // React ve önemli kütüphaneleri önceden yükle
    exclude: ["pdfGenerator", "jspdf", "html2canvas"], // PDF generator'ı exclude et (sadece gerektiğinde yüklensin)
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
    // Chunk size optimization
    reportCompressedSize: false, // Build hızını artırır
    // Chunk size limit'i artır (daha az chunk = daha az HTTP request)
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      // Tree shaking için
      treeshake: {
        moduleSideEffects: 'no-external',
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false,
      },
      output: {
<<<<<<< HEAD
        // Chunk bağımlılıklarını ayarla - React core önce yüklenmeli
        // Bu, React'e bağımlı chunk'ların React yüklenmeden önce çalışmasını önler
        // Not: Bu özellik Vite/Rollup tarafından otomatik yönetilir, ama manuel kontrol için
        // manualChunks kullanıyoruz
        
        // Vendor chunk'ları - Performans için chunk'ları ayır
        // Optimized: Daha iyi chunk splitting (Firebase ayrı, UI libraries ayrı)
        // ÖNEMLİ: Eski çalışan versiyonla aynı chunk yapısı
        // vendor-react: Tüm React bağımlılıkları (React, React DOM, Radix UI, React Router, React Hook Form, TanStack Query, vb.)
        // vendor-firebase: Firebase
        // lucide-react: Icons
        // chunk-admin: Admin sayfası
        // Bu yapı forwardRef hatasını önler çünkü tüm React bağımlılıkları tek chunk'ta
        manualChunks: (id) => {
          // Admin sayfası - React'e bağımlı olduğu için ÖNCE kontrol et
          // chunk-admin'ı vendor-react'a ekliyoruz çünkü React'e bağımlı
          if (id.includes('pages/Admin') || id.includes('components/Admin')) {
            return 'vendor-react';
          }
          
          // React core + React utilities + TanStack Query + lucide-react - TÜMÜ BİRLEŞTİRİLDİ
          // Tüm React bağımlılıkları vendor-react'a ekleniyor
          // Bu, forwardRef hatasını önler çünkü React her zaman önce yüklenir
          if (id.includes('node_modules/react') || 
              id.includes('node_modules/react-dom') ||
              id.includes('@radix-ui') ||
              id.includes('node_modules/next-themes') ||
=======
        // Vendor chunk'ları - Performans için chunk'ları ayır
        manualChunks: (id) => {
          // React vendor chunk'ları - ÖNCE kontrol et
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          
          // Radix UI - React'e bağımlı, React ile aynı chunk'ta olmalı
          if (id.includes('@radix-ui')) {
            return 'vendor-react';
          }
          
          // React Router - React'e bağımlı
          if (id.includes('node_modules/react-router')) {
            return 'vendor-react';
          }
          
          // TanStack Query - React'e bağımlı
          if (id.includes('@tanstack')) {
            return 'vendor-react';
          }
          
          // React'e bağımlı TÜM kütüphaneler - React ile aynı chunk'ta
          // Güvenli tarafta olmak için tüm "react" içeren kütüphaneleri React chunk'ına al
          if (id.includes('node_modules/next-themes') ||
              id.includes('node_modules/react-hook-form') ||
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
              id.includes('node_modules/sonner') ||
              id.includes('node_modules/vaul') ||
              id.includes('node_modules/cmdk') ||
              id.includes('node_modules/react-day-picker') ||
              id.includes('node_modules/react-resizable-panels') ||
              id.includes('node_modules/@hello-pangea/dnd') ||
              id.includes('node_modules/embla-carousel-react') ||
              id.includes('node_modules/input-otp') ||
<<<<<<< HEAD
              id.includes('node_modules/react-router') ||
              id.includes('node_modules/react-hook-form') ||
              id.includes('node_modules/@hookform') ||
              id.includes('@tanstack') ||
              id.includes('lucide-react')) {
            return 'vendor-react';
          }
          
          // Firebase - tüm Firebase modüllerini bir chunk'a topla (büyük, ayrı tut)
=======
              id.includes('node_modules/recharts') ||
              id.includes('node_modules/@hookform') ||
              id.includes('node_modules/class-variance-authority') ||
              id.includes('node_modules/clsx') ||
              id.includes('node_modules/tailwind-merge') ||
              id.includes('node_modules/tailwindcss-animate') ||
              id.includes('node_modules/zod') ||
              id.includes('node_modules/date-fns')) {
            return 'vendor-react';
          }
          
          // lucide-react'ı ayrı chunk'a ayır
          if (id.includes('lucide-react')) {
            return 'lucide-react';
          }
          
          // Firebase - tüm Firebase modüllerini bir chunk'a topla
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
          if (id.includes('node_modules/firebase') || id.includes('firebase')) {
            return 'vendor-firebase';
          }
          
          // PDF Generator - büyük chunk, ayrı tut
<<<<<<< HEAD
          if (id.includes('pdfGenerator') || id.includes('jspdf') || id.includes('html2canvas') || id.includes('jspdf-autotable')) {
            return 'vendor-pdf';
          }
          
          // Diğer vendor kütüphaneleri - React'e bağımlı olanları vendor-react'a ekle
          if (id.includes('node_modules')) {
            const lowerId = id.toLowerCase();
            if (lowerId.includes('react') || 
                id.includes('/react') || 
                id.includes('\\react') ||
                id.includes('react-') ||
                id.includes('@react')) {
              // React'e bağımlı ama yukarıdaki kategorilere girmeyen kütüphaneler
              return 'vendor-react';
            }
            // React'e bağımlı olmayan kütüphaneler - undefined döndür (Vite otomatik chunk'a ekler)
            return undefined;
=======
          if (id.includes('pdfGenerator') || id.includes('jspdf') || id.includes('html2canvas')) {
            return 'vendor-pdf';
          }
          
          // Admin sayfası - büyük chunk, ayrı tut
          if (id.includes('pages/Admin') || id.includes('components/Admin')) {
            return 'chunk-admin';
          }
          
          // Diğer vendor kütüphaneleri - Sadece gerçekten React'e bağımlı olmayanlar
          if (id.includes('node_modules')) {
            // Kalan tüm node_modules kütüphanelerini de React chunk'ına al (güvenli tarafta ol)
            return 'vendor-react';
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
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
<<<<<<< HEAD
=======
    chunkSizeWarningLimit: 1000,
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
  },
}));
