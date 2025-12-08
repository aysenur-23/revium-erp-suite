import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Initialize Firebase
import "./lib/firebase";

// Make setTeamLeader function available globally for console usage
import { setUserAsTeamLeader } from "./utils/setTeamLeader";
import { setUserAsAdmin } from "./utils/setAdmin";
import { setSuperAdmin } from "./utils/setSuperAdmin";
import { testEmailService } from "./services/emailService";

if (typeof window !== "undefined") {
  (window as any).setTeamLeader = setUserAsTeamLeader;
  (window as any).setAdmin = setUserAsAdmin;
  (window as any).setSuperAdmin = setSuperAdmin;
  (window as any).testEmail = testEmailService;
  (window as any).testEmailService = testEmailService; // Alias for convenience
  // Sadece development'ta log göster
  if (import.meta.env.DEV) {
    console.log("💡 Konsol komutları aktif:");
    console.log("- await setTeamLeader('email@example.com')");
    console.log("- await setAdmin('email@example.com')");
    console.log("- await setSuperAdmin('email@example.com')");
    console.log("- await testEmail('your-email@example.com') // E-posta servisini test et");
    console.log("- await testEmailService('your-email@example.com') // E-posta servisini test et (alias)");
  }
}

// Error handler for unhandled errors
window.addEventListener('error', (event) => {
  // Suppress QUIC protocol errors - they're non-critical
  const errorMessage = event.error?.message || event.message || '';
  if (errorMessage.includes('quic') || errorMessage.includes('QUIC') || errorMessage.includes('protocol')) {
    // QUIC protocol errors are non-critical and can be safely ignored
    if (import.meta.env.DEV) {
      console.warn('QUIC protocol error (non-critical, safely ignored):', errorMessage);
    }
    event.preventDefault(); // Prevent error from propagating
    return;
  }
  
  // Suppress AuthProvider errors during initial render - they're handled by ErrorBoundary
  if (errorMessage.includes('useAuth must be used within an AuthProvider')) {
    // This error is handled by React Error Boundary and App structure
    // Don't log it as it's expected during initial render
    event.preventDefault();
    return;
  }
  
  // Suppress Firestore persistence errors - they're non-critical
  if (errorMessage.includes('already been started') && errorMessage.includes('persistence')) {
    // Firestore persistence errors are non-critical and can be safely ignored
    // Persistence will work on next app load or in other tabs
    if (import.meta.env.DEV) {
      console.warn('Firestore persistence error (non-critical, safely ignored):', errorMessage);
    }
    event.preventDefault();
    return;
  }
  
  console.error('Global error:', event.error);
  if (event.error && event.error.message) {
    console.error('Error message:', event.error.message);
    console.error('Error stack:', event.error.stack);
  }
});

window.addEventListener('unhandledrejection', (event) => {
  // Suppress QUIC protocol errors - they're non-critical
  const errorMessage = event.reason?.message || String(event.reason) || '';
  if (errorMessage.includes('quic') || errorMessage.includes('QUIC') || errorMessage.includes('protocol')) {
    // QUIC protocol errors are non-critical and can be safely ignored
    if (import.meta.env.DEV) {
      console.warn('QUIC protocol error (non-critical, safely ignored):', errorMessage);
    }
    event.preventDefault(); // Prevent error from propagating
    return;
  }
  
  // Suppress AuthProvider errors during initial render
  if (errorMessage.includes('useAuth must be used within an AuthProvider')) {
    // This error is handled by React Error Boundary
    event.preventDefault();
    return;
  }
  
  // Suppress Firestore persistence errors - they're non-critical
  if (errorMessage.includes('already been started') && errorMessage.includes('persistence')) {
    // Firestore persistence errors are non-critical and can be safely ignored
    if (import.meta.env.DEV) {
      console.warn('Firestore persistence error (non-critical, safely ignored):', errorMessage);
    }
    event.preventDefault();
    return;
  }
  
  console.error('Unhandled promise rejection:', event.reason);
});

try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element (#root) bulunamadı. index.html dosyasını kontrol edin.");
  }
  
  // Check if React is loaded
  if (typeof createRoot === 'undefined') {
    throw new Error("React yüklenemedi. JavaScript dosyalarının doğru yüklendiğinden emin olun.");
  }
  
  const root = createRoot(rootElement);
  root.render(<App />);
} catch (error) {
  console.error("Uygulama render hatası:", error);
  
  // More detailed error information
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : '';
  
  // Clear body and show error
  document.body.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; height: 100vh; flex-direction: column; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px;">
      <div style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 800px; width: 100%;">
        <h1 style="color: #dc2626; margin: 0 0 16px 0; font-size: 24px;">⚠️ Uygulama Yüklenemedi</h1>
        <p style="color: #666; margin: 0 0 24px 0; line-height: 1.6;">
          Uygulama başlatılırken bir hata oluştu. Lütfen aşağıdaki adımları deneyin:
        </p>
        <ol style="color: #666; margin: 0 0 24px 0; padding-left: 24px; line-height: 1.8;">
          <li>Sayfayı yenileyin (Ctrl + Shift + R veya Cmd + Shift + R)</li>
          <li>Tarayıcı cache'ini temizleyin</li>
          <li>Konsolu kontrol edin (F12) ve hata mesajlarını inceleyin</li>
          <li>Eğer sorun devam ederse, lütfen teknik ekiple iletişime geçin</li>
        </ol>
        <details style="margin-top: 24px;">
          <summary style="color: #666; cursor: pointer; font-weight: 500; margin-bottom: 12px;">Hata Detayları (Genişletmek için tıklayın)</summary>
          <pre style="background: #f5f5f5; padding: 16px; border-radius: 6px; overflow: auto; font-size: 12px; line-height: 1.5; color: #333; margin: 0;">
${errorMessage}${errorStack ? '\n\n' + errorStack : ''}
          </pre>
        </details>
        <button onclick="window.location.reload()" style="margin-top: 24px; padding: 12px 24px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500;">
          Sayfayı Yenile
        </button>
      </div>
    </div>
  `;
}
