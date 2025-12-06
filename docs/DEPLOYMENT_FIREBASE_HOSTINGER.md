# Firebase + Hostinger Deployment Rehberi

## Genel Bakış

Bu proje artık tamamen Firebase backend kullanmaktadır. Hostinger'da sadece statik dosyalar servis edilir.

## Ön Gereksinimler

1. Firebase projesi oluşturulmuş olmalı
2. Firebase Authentication etkinleştirilmiş olmalı
3. Firestore Database oluşturulmuş olmalı
4. Firebase config değerleri hazır olmalı

## Local Geliştirme

### 1. Bağımlılıkları Yükle

```bash
npm install
```

### 2. Environment Dosyalarını Ayarla

`.env.local` dosyası oluşturun (`.env.example`'dan kopyalayın):

```env
VITE_FIREBASE_API_KEY=your-api-key-here
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id
VITE_FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.firebaseio.com/
```

### 3. Development Server'ı Başlat

```bash
npm run dev
```

Uygulama `http://localhost:5173` adresinde çalışacaktır.

## Production Build

### 1. Production Environment Dosyası

`.env.production` dosyası oluşturun ve production Firebase config değerlerini girin:

```env
VITE_FIREBASE_API_KEY=production-api-key
VITE_FIREBASE_AUTH_DOMAIN=production-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=production-project-id
VITE_FIREBASE_STORAGE_BUCKET=production-project-id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=production-messaging-sender-id
VITE_FIREBASE_APP_ID=production-app-id
VITE_FIREBASE_MEASUREMENT_ID=production-measurement-id
VITE_FIREBASE_DATABASE_URL=https://production-project-id-default-rtdb.firebaseio.com/
```

### 2. Build Al

```bash
npm run build:hostinger
```

Bu komut:
- Frontend'i build eder
- `dist` klasörünü `public_html` klasörüne kopyalar
- SPA için `.htaccess` dosyası oluşturur

### 3. Build Çıktısını Kontrol Et

`public_html` klasöründe şunlar olmalı:
- `index.html`
- `assets/` klasörü (JS, CSS dosyaları)
- `.htaccess` dosyası
- Diğer statik dosyalar (favicon, robots.txt, vb.)

## Hostinger'a Deployment

### 1. Dosyaları Yükle

`public_html` klasöründeki **TÜM** dosyaları Hostinger'ın `public_html` klasörüne yükleyin.

**Önemli:** 
- PHP dosyalarına gerek yok
- `api/` klasörüne gerek yok
- Sadece statik dosyalar yeterli

### 2. Firebase Console Ayarları

#### Authentication

1. Firebase Console > Authentication > Settings
2. **Authorized domains** bölümüne production domain'inizi ekleyin:
   - `revpad.net` (veya kendi domain'iniz)

#### Email Templates

1. Authentication > Templates
2. **Email address verification** template'ini düzenleyin:
   - Action URL: `https://revpad.net/verify-email` (production domain'iniz)
3. **Password reset** template'ini düzenleyin:
   - Action URL: `https://revpad.net/reset-password`

#### Firestore Security Rules

1. Firestore Database > Rules
2. Güvenlik kurallarını yapılandırın (örnek kurallar `docs/FIREBASE_BACKEND_DESIGN.md` dosyasında)

### 3. Test Et

1. Production URL'inize gidin
2. Kayıt ol / Giriş yap işlemlerini test edin
3. Email doğrulama linklerinin çalıştığını kontrol edin
4. Temel işlevleri test edin (görev oluşturma, müşteri ekleme, vb.)

## Sorun Giderme

### Build Hatası

- `.env.production` dosyasının doğru yapılandırıldığından emin olun
- Firebase config değerlerinin doğru olduğunu kontrol edin

### Authentication Hatası

- Firebase Console'da Authentication'ın etkin olduğunu kontrol edin
- Authorized domains listesinde production domain'inizin olduğundan emin olun
- Email/Password provider'ın etkin olduğunu kontrol edin

### Firestore Hatası

- Firestore Database'in oluşturulduğundan emin olun
- Security rules'ın doğru yapılandırıldığını kontrol edin
- Koleksiyonların doğru isimlerle oluşturulduğunu kontrol edin

### SPA Routing Hatası

- `.htaccess` dosyasının `public_html` klasöründe olduğundan emin olun
- Hostinger'da mod_rewrite'in aktif olduğundan emin olun

## Notlar

- **PHP/Composer artık gerekli değildir**
- Backend tamamen Firebase üzerindedir
- Hostinger'da sadece statik dosyalar servis edilir
- Tüm API çağrıları Firebase'e gider
- Email gönderimi Firebase Authentication tarafından yapılır

