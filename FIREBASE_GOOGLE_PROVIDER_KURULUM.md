# 🔐 Firebase Google Provider Kurulumu

## 📋 Genel Bakış

Google ile giriş yapabilmek ve Drive erişimi sağlamak için Firebase Console'da Google provider'ı etkinleştirmeniz gerekiyor.

---

## ✅ Adım Adım Kurulum

### 1. Firebase Console'a Giriş Yapın

1. [Firebase Console](https://console.firebase.google.com/)'a gidin
2. Projenizi seçin (revpad-15232 veya ilgili proje)

### 2. Authentication Ayarlarına Gidin

1. Sol menüden **Authentication** seçin
2. **Sign-in method** sekmesine tıklayın

### 3. Google Provider'ı Etkinleştirin

1. **Google** provider'ını bulun
2. **Enable** toggle'ını açın
3. **Project support email** seçin (veya ekleyin)
4. **Save** butonuna tıklayın

### 4. Google Client ID Kontrolü

Firebase otomatik olarak Google Client ID oluşturur, ancak kendi Client ID'nizi kullanmak istiyorsanız:

1. **Web client ID** alanına şu ID'yi girin:
   ```
   189145988180-ifbkkgbb9cbqn283m71q06131isao1gu.apps.googleusercontent.com
   ```

2. **Web client secret** alanına secret'ı girin (eğer varsa)

3. **Save** butonuna tıklayın

---

## 🔧 Environment Variable Kontrolü

`.env` dosyanızda şu değişken olmalı:

```env
VITE_GOOGLE_CLIENT_ID=189145988180-ifbkkgbb9cbqn283m71q06131isao1gu.apps.googleusercontent.com
```

**Not:** Development server'ı yeniden başlatmanız gerekebilir.

---

## ✅ Test Etme

1. Development server'ı başlatın:
   ```bash
   npm run dev
   ```

2. Auth sayfasına gidin (`/auth`)

3. **"Google ile Giriş Yap"** butonuna tıklayın

4. Google hesabınızla giriş yapın

5. Başarılı giriş sonrası Drive erişimi otomatik olarak sağlanır

---

## 🚨 Sorun Giderme

### "Google provider is not enabled" Hatası

- Firebase Console'da Google provider'ın Enable olduğundan emin olun
- Sayfayı yenileyin ve tekrar deneyin

### "Invalid client ID" Hatası

- `.env` dosyasındaki `VITE_GOOGLE_CLIENT_ID` değerini kontrol edin
- Development server'ı yeniden başlatın
- Firebase Console'daki Client ID ile eşleştiğinden emin olun

### "Popup blocked" Hatası

- Tarayıcı popup engelleyicisini kapatın
- Tarayıcı ayarlarından popup'lara izin verin

### "Access denied" Hatası

- Google Cloud Console'da OAuth consent screen'in yapılandırıldığından emin olun
- Test kullanıcıları ekleyin (gerekirse)

---

## 📝 Notlar

- Google provider etkinleştirildikten sonra kullanıcılar Google hesabıyla giriş yapabilir
- Google ile giriş yapıldığında Drive erişimi otomatik olarak sağlanır
- Token'lar localStorage'da saklanır ve otomatik olarak yenilenir

---

**Son Güncelleme:** 2024-11-28

