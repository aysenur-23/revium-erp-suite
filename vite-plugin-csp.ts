import type { Plugin } from 'vite';

/**
 * Vite plugin for Content Security Policy headers
 * Ensures CSP is properly set for development server
 */
export function cspPlugin(): Plugin {
  return {
    name: 'csp-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Development için CSP'yi tamamen devre dışı bırakıyoruz
        // Chrome extension CSP override'ını önlemek için
        // Production'da HTTP header'dan CSP uygulanacak
        
        // CSP header'ı kaldır - Development için CSP yok
        // Bu, Chrome extension CSP override'ını önler
        // Not: Production'da sunucu tarafından CSP header'ı eklenecek
        
        next();
      });
    }
  };
}

