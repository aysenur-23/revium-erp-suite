# Firebase Yapılandırması Kontrol Rehberi

## ⚠️ Önemli: Firebase Yapılandırması Eksik

Konsolda şu hataları görüyorsanız:

```
⚠️  Firebase yapılandırması eksik!
Firebase Auth is not initialized
Expected first argument to collection() to be a CollectionReference
```

Bu, `.env` dosyasında Firebase yapılandırma değişkenlerinin eksik olduğu anlamına gelir.

## 🔧 Çözüm Adımları

### 1. Firebase Console'dan Config Değerlerini Alın

1. https://console.firebase.google.com/ adresine gidin
2. Projenizi seçin (örn: `revpad-15232`)
3. ⚙️ **Project Settings** (Proje Ayarları) → **Your apps** → **Web app** → **Config**

### 2. Config Değerlerini Kopyalayın

Config objesi şu şekilde görünecek:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC...",
  authDomain: "revpad-15232.firebaseapp.com",
  projectId: "revpad-15232",
  storageBucket: "revpad-15232.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123def456"
};
```

### 3. .env Dosyasını Düzenleyin

Proje kök dizinindeki `.env` dosyasını açın ve şu değişkenleri ekleyin:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSyC...
VITE_FIREBASE_AUTH_DOMAIN=revpad-15232.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=revpad-15232
VITE_FIREBASE_STORAGE_BUCKET=revpad-15232.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123def456

# E-posta API (Mevcut)
VITE_EMAIL_API_URL=http://localhost:3000/api/send-email
VITE_APP_URL=https://revpad.net
```

### 4. Uygulamayı Yeniden Başlatın

`.env` dosyasını kaydettikten sonra:

```bash
# Development server'ı durdurun (Ctrl+C)
# Sonra tekrar başlatın
npm run dev
```

**Not:** Vite, `.env` dosyasındaki değişiklikleri sadece uygulama başlatıldığında okur. Bu yüzden değişikliklerden sonra uygulamayı yeniden başlatmanız gerekir.

## ✅ Kontrol

Yapılandırma doğruysa, konsolda şu mesajları görmemelisiniz:

- ❌ `Firebase yapılandırması eksik!`
- ❌ `Firebase Auth is not initialized`
- ❌ `Expected first argument to collection() to be a CollectionReference`

Bunun yerine uygulama normal şekilde çalışmalı ve Firebase servisleri başlatılmalı.

## 🔍 Sorun Giderme

### Hata: "Firebase başlatılamadı - config eksik"

**Çözüm:** `.env` dosyasında tüm `VITE_FIREBASE_*` değişkenlerinin doğru olduğundan emin olun.

### Hata: "Firebase Auth is not initialized"

**Çözüm:** Firebase Console'da **Authentication** servisinin etkin olduğundan emin olun:
1. Firebase Console → **Authentication** → **Get started**
2. **Sign-in method** → **Email/Password** → **Enable**

### Hata: "Expected first argument to collection() to be a CollectionReference"

**Çözüm:** Bu hata, Firebase yapılandırması eksik olduğunda oluşur. `.env` dosyasını kontrol edin ve uygulamayı yeniden başlatın.

---

**Not:** `.env` dosyası Git'e commit edilmemelidir (`.gitignore`'da olmalı). Production'da bu değişkenler hosting platformunun environment variables bölümüne eklenmelidir.

