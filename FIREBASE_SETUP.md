# Firebase Kurulum Rehberi

## 🚀 Hızlı Başlangıç

### 1. Firebase Console'da Proje Oluşturun

1. https://console.firebase.google.com/ adresine gidin
2. "Add project" veya "Proje ekle" butonuna tıklayın
3. Proje adını girin (örn: `revium-erp`)
4. Google Analytics'i isteğe bağlı olarak etkinleştirin
5. "Create project" / "Proje oluştur" butonuna tıklayın

### 2. Web Uygulaması Ekleyin

1. Firebase Console'da projenizi açın
2. Sol menüden ⚙️ **Project Settings** (Proje Ayarları) seçin
3. Aşağı kaydırın ve **Your apps** bölümüne gelin
4. **Web** (</>) ikonuna tıklayın
5. Uygulama adını girin (örn: `Revium ERP Web`)
6. "Register app" / "Uygulamayı kaydet" butonuna tıklayın

### 3. Config Değerlerini Alın

Config objesi şu şekilde görünecek:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123def456"
};
```

Bu değerleri kopyalayın.

### 4. .env Dosyasını Düzenleyin

Proje kök dizinindeki `.env` dosyasını açın ve değerleri girin:

```env
VITE_FIREBASE_API_KEY=AIzaSyC...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123def456
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.firebaseio.com/
```

**Not:** `MEASUREMENT_ID` ve `DATABASE_URL` opsiyoneldir.

### 5. Firebase Servislerini Etkinleştirin

#### Authentication (Zorunlu)

1. Sol menüden **Authentication** seçin
2. "Get started" / "Başlayın" butonuna tıklayın
3. **Sign-in method** sekmesine gidin
4. **Email/Password** provider'ını seçin
5. **Enable** butonuna tıklayın
6. **Save** butonuna tıklayın

#### Firestore Database (Zorunlu)

1. Sol menüden **Firestore Database** seçin
2. "Create database" / "Veritabanı oluştur" butonuna tıklayın
3. **Start in test mode** seçeneğini seçin (geliştirme için)
4. Location seçin (örn: `europe-west1`)
5. "Enable" / "Etkinleştir" butonuna tıklayın

#### Storage (Opsiyonel - Dosya yüklemeleri için)

1. Sol menüden **Storage** seçin
2. "Get started" / "Başlayın" butonuna tıklayın
3. Test mode'da başlatın
4. Location seçin
5. "Done" / "Tamam" butonuna tıklayın

### 6. Firestore Security Rules (ÖNEMLİ!)

Firestore Database > Rules sekmesine gidin ve şu kuralları ekleyin:

**Yöntem 1: Firebase Console'dan (Önerilen)**
1. Firebase Console'da Firestore Database > Rules sekmesine gidin
2. Aşağıdaki kuralları kopyalayıp yapıştırın
3. "Publish" butonuna tıklayın

**Yöntem 2: firestore.rules dosyasını kullan**
Proje kök dizininde `firestore.rules` dosyası oluşturuldu. Bu dosyayı Firebase CLI ile deploy edebilirsiniz.

**Geliştirme için Test Mode (Hızlı başlangıç):**
Eğer hızlıca test etmek istiyorsanız, geçici olarak test mode kullanabilirsiniz:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2025, 12, 31);
    }
  }
}
```

**⚠️ UYARI:** Test mode sadece geliştirme için! Production'da mutlaka proper rules kullanın!

**Production için Güvenli Kurallar:**
`firestore.rules` dosyasındaki kuralları kullanın (proje kök dizininde).

### 7. Dev Server'ı Yeniden Başlatın

`.env` dosyasını kaydettikten sonra:

```bash
npm run dev
```

## ✅ Kontrol Listesi

- [ ] Firebase projesi oluşturuldu
- [ ] Web uygulaması eklendi
- [ ] Config değerleri `.env` dosyasına eklendi
- [ ] Authentication etkinleştirildi (Email/Password)
- [ ] Firestore Database oluşturuldu
- [ ] Security rules ayarlandı
- [ ] Dev server yeniden başlatıldı

## 🔍 Sorun Giderme

### "Firebase configuration is missing" hatası

- `.env` dosyasının proje kök dizininde olduğundan emin olun
- `.env` dosyasındaki değerlerin boş olmadığından emin olun
- Dev server'ı yeniden başlatın

### "Cannot read properties of undefined" hatası

- Firebase config değerlerinin doğru olduğundan emin olun
- Browser console'da hata mesajlarını kontrol edin
- `.env` dosyasını kaydettiğinizden emin olun

### Authentication çalışmıyor

- Firebase Console'da Authentication'ın etkin olduğundan emin olun
- Email/Password provider'ının enable olduğundan emin olun
- Browser console'da hata mesajlarını kontrol edin

## 📚 Daha Fazla Bilgi

- [Firebase Dokümantasyonu](https://firebase.google.com/docs)
- [Firebase Console](https://console.firebase.google.com/)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)

