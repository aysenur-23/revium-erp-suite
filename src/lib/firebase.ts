/**
 * Firebase Configuration
 * Frontend Firebase SDK initialization
 */

import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAnalytics, Analytics } from "firebase/analytics";
import { getAuth, Auth } from "firebase/auth";
import { getDatabase, Database } from "firebase/database";
import { getFirestore, Firestore, initializeFirestore, CACHE_SIZE_UNLIMITED, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
// Config values are read from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "",
  // Realtime Database URL
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || ""
};

const normalizeStorageBucket = (bucket: string) => {
  if (!bucket) return bucket;
  if (bucket.includes(".firebasestorage.app")) {
    // Sadece development'ta log göster (sessizce handle et)
    // console.warn kaldırıldı - gereksiz bilgilendirme
    return bucket.replace(".firebasestorage.app", ".appspot.com");
  }
  return bucket;
};

const normalizedFirebaseConfig = {
  ...firebaseConfig,
  storageBucket: normalizeStorageBucket(firebaseConfig.storageBucket),
};

// Check if Firebase config is valid
const isFirebaseConfigValid = normalizedFirebaseConfig.apiKey && normalizedFirebaseConfig.projectId;

// Initialize Firebase
let app: FirebaseApp | undefined = undefined;
let analytics: Analytics | null = null;
let auth: Auth | null = null;
let database: Database | null = null;
let firestore: Firestore | null = null;
let storage: FirebaseStorage | null = null;

// Initialize app only if not already initialized
if (getApps().length === 0) {
  if (!isFirebaseConfigValid) {
    if (import.meta.env.DEV) {
      console.warn('⚠️  Firebase yapılandırması eksik!');
      console.warn('📝 Lütfen .env dosyasında Firebase değişkenlerini tanımlayın.');
      console.warn('');
      console.warn('🔧 Adımlar:');
      console.warn('  1. Firebase Console\'a gidin: https://console.firebase.google.com/');
      console.warn('  2. Proje seçin veya yeni proje oluşturun');
      console.warn('  3. Project Settings > Your apps > Web app > Config');
      console.warn('  4. Config değerlerini kopyalayın');
      console.warn('  5. .env dosyasına yapıştırın');
      console.warn('');
      console.warn('📋 Gerekli değişkenler:');
      console.warn('  VITE_FIREBASE_API_KEY');
      console.warn('  VITE_FIREBASE_AUTH_DOMAIN');
      console.warn('  VITE_FIREBASE_PROJECT_ID');
      console.warn('  VITE_FIREBASE_STORAGE_BUCKET');
      console.warn('  VITE_FIREBASE_MESSAGING_SENDER_ID');
      console.warn('  VITE_FIREBASE_APP_ID');
      console.warn('');
    }
    // Don't throw error, just warn - app can still work in limited mode
  }
  try {
    if (!isFirebaseConfigValid) {
      // Don't initialize Firebase if config is missing
      // This allows the app to load but Firebase features won't work
      if (import.meta.env.DEV) {
        console.warn('⚠️  Firebase başlatılamadı - config eksik, uygulama sınırlı modda çalışacak');
      }
    } else {
      app = initializeApp(normalizedFirebaseConfig);
      
      // Initialize Analytics lazily (only when needed, not on initial load)
      // This improves initial page load performance
<<<<<<< HEAD
      // Optimized: requestIdleCallback kullan veya 3 saniye sonra başlat
      if (typeof window !== 'undefined') {
        const initAnalytics = () => {
=======
      if (typeof window !== 'undefined') {
        // Analytics'i asenkron olarak başlat (performans için)
        setTimeout(() => {
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
          try {
            analytics = getAnalytics(app);
          } catch (error: unknown) {
            // Silently handle - Analytics is not critical for app functionality
            if (import.meta.env.DEV) {
              console.warn('Firebase Analytics initialization failed:', error instanceof Error ? error.message : 'Unknown error');
            }
          }
<<<<<<< HEAD
        };
        
        // requestIdleCallback kullan (tarayıcı müsait olduğunda)
        // Fallback: setTimeout ile 3 saniye sonra (1 saniye → 3 saniye)
        if ('requestIdleCallback' in window) {
          window.requestIdleCallback(
            () => {
              initAnalytics();
            },
            { timeout: 3000 } // Maksimum 3 saniye bekle
          );
        } else {
          // Fallback: setTimeout ile 3 saniye sonra başlat (non-blocking)
          setTimeout(initAnalytics, 3000);
        }
=======
        }, 1000); // 1 saniye sonra başlat (sayfa yüklenmesini engellemesin)
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      }
      
      // Initialize Auth
      try {
        auth = getAuth(app);
        if (!auth) {
          throw new Error('Firebase Auth instance oluşturulamadı');
        }
      } catch (error: unknown) {
        if (import.meta.env.DEV) {
          console.error('❌ Firebase Authentication başlatma hatası:', error instanceof Error ? error.message : 'Unknown error');
        }
        auth = null;
      }
      
      // Initialize Realtime Database (only if URL is provided)
      if (normalizedFirebaseConfig.databaseURL) {
        try {
          database = getDatabase(app);
        } catch (error: unknown) {
          if (import.meta.env.DEV) {
            console.warn('Firebase Realtime Database initialization failed:', error?.message || 'Unknown error');
          }
        }
      } else {
        // Sessizce handle et - gereksiz bilgilendirme
      }
      
      // Initialize Firestore - Performans için persistence'ı kaldırdık
      // Persistence IndexedDB işlemleri yavaşlatıyor, bu yüzden normal Firestore kullanıyoruz
      // Offline desteği gerekirse daha sonra eklenebilir
      try {
        firestore = getFirestore(app);
      } catch (error: unknown) {
        // Silently handle - Firestore might not be critical for app startup
        if (import.meta.env.DEV) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.warn('Firebase Firestore initialization failed:', errorMessage);
        }
      }
      
      // Initialize Storage
      try {
        storage = getStorage(app);
      } catch (error: unknown) {
        if (import.meta.env.DEV) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.warn('Firebase Storage initialization failed:', errorMessage);
        }
      }
    }
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error('Firebase app initialization failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('CONFIGURATION_NOT_FOUND') || errorMessage.includes('configuration')) {
        console.error('❌ Firebase yapılandırması bulunamadı.');
        console.error('📝 Lütfen .env dosyasını kontrol edin ve Firebase değerlerini girin.');
      } else {
        console.error('Firebase başlatma hatası:', errorMessage);
      }
    }
    // Don't throw - allow app to continue
  }
} else {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    app = existingApps[0];
    try {
      auth = getAuth(app);
      if (!auth) {
        if (import.meta.env.DEV) {
          console.warn('Firebase Auth instance bulunamadı, yeniden başlatılıyor...');
        }
        auth = getAuth(app);
      }
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error('Firebase Auth re-initialization failed:', error instanceof Error ? error.message : 'Unknown error');
      }
      auth = null;
    }
    if (normalizedFirebaseConfig.databaseURL) {
      try {
        database = getDatabase(app);
      } catch (error: unknown) {
        if (import.meta.env.DEV) {
          console.warn('Database might not be initialized:', error instanceof Error ? error.message : 'Unknown error');
        }
      }
    }
    try {
      // If Firestore is already initialized (from previous app initialization), just get the existing instance
      // Don't try to re-initialize with persistence as it will fail with "already been started" error
      firestore = getFirestore(app);
    } catch (error: unknown) {
      // Silently handle - Firestore might not be initialized yet or there's an error
      // This is non-critical as Firestore will be initialized when needed
      const errorMessage = error instanceof Error ? error.message : '';
      if (errorMessage.includes('already been started') || errorMessage.includes('already initialized')) {
        // This is expected - Firestore is already initialized, just ignore
      } else if (import.meta.env.DEV) {
        console.warn('Firestore might not be initialized:', errorMessage);
      }
    }
    try {
      storage = getStorage(app);
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.warn('Storage might not be initialized:', error instanceof Error ? error.message : 'Unknown error');
      }
    }
  }
}

// Export with null checks
export { app, analytics, auth, database, firestore, storage };
// Alias for consistency with newer services
export const db = firestore;
export default app;

// Helper to check if Firebase is initialized
export const isFirebaseInitialized = (): boolean => {
  return !!app && !!auth && !!firestore;
};

