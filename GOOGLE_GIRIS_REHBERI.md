# 🔐 Google ile Giriş Yapma Rehberi

## 🚀 Hızlı Başlangıç

### 1. Development Server'ı Başlatın

```bash
npm run dev
```

Server başladıktan sonra şu adrese gidin:
**http://localhost:5173/auth**

---

## 📋 Adım Adım Giriş

### Adım 1: Auth Sayfasına Gidin

Tarayıcınızda şu adresi açın:
```
http://localhost:5173/auth
```

### Adım 2: Google ile Giriş Butonunu Bulun

Auth sayfasında:
- **"Giriş Yap"** sekmesinde
- E-posta/şifre formunun altında
- **"Google ile Giriş Yap"** butonunu göreceksiniz

### Adım 3: Google ile Giriş Yapın

1. **"Google ile Giriş Yap"** butonuna tıklayın
2. Google hesabınızı seçin
3. İzinleri onaylayın (Drive erişimi için)
4. Giriş tamamlanır

### Adım 4: Otomatik Olarak

Giriş sonrası:
- ✅ Sistemde oturum açmış olursunuz
- ✅ Google Drive erişimi otomatik sağlanır
- ✅ Dosya yükleme işlemleri çalışır
- ✅ Dashboard'a yönlendirilirsiniz

---

## ⚠️ Önemli Kontroller

### Firebase Console'da Google Provider Etkin mi?

1. [Firebase Console](https://console.firebase.google.com/)'a gidin
2. Projenizi seçin (revpad-15232)
3. **Authentication** > **Sign-in method** sekmesine gidin
4. **Google** provider'ını bulun
5. **Enable** toggle'ının açık olduğundan emin olun
6. **Save** butonuna tıklayın

### Environment Variables Kontrolü

`.env` dosyanızda şu değişken olmalı:

```env
VITE_GOOGLE_CLIENT_ID=189145988180-ifbkkgbb9cbqn283m71q06131isao1gu.apps.googleusercontent.com
```

**Not:** Değişiklik yaptıysanız dev server'ı yeniden başlatın.

---

## 🐛 Sorun Giderme

### "Google provider is not enabled" Hatası

**Çözüm:**
- Firebase Console'da Google provider'ı Enable yapın
- Sayfayı yenileyin

### "Popup blocked" Hatası

**Çözüm:**
- Tarayıcı popup engelleyicisini kapatın
- Tarayıcı ayarlarından popup'lara izin verin

### "Invalid client ID" Hatası

**Çözüm:**
- `.env` dosyasındaki `VITE_GOOGLE_CLIENT_ID` değerini kontrol edin
- Dev server'ı yeniden başlatın (`Ctrl+C` sonra `npm run dev`)

### Buton Görünmüyor

**Çözüm:**
- Sayfayı yenileyin (F5)
- Browser console'da hata var mı kontrol edin
- Dev server'ın çalıştığından emin olun

---

## ✅ Başarılı Giriş Sonrası

Giriş başarılı olduğunda:

1. **Dashboard'a yönlendirilirsiniz**
2. **Drive erişimi otomatik sağlanır**
3. **Settings > Google Drive** sekmesinde "Yetkilendirildi" görürsünüz
4. **Dosya yükleme işlemleri çalışır**

---

## 📝 Notlar

- Google ile giriş yaptığınızda hem sistemde giriş yapmış hem de Drive erişimi sağlamış olursunuz
- Token'lar localStorage'da saklanır ve otomatik yenilenir
- İlk girişte Google hesabınızla bağlantı kurulur
- Sonraki girişlerde otomatik olarak Drive erişimi sağlanır

---

**Son Güncelleme:** 2024-11-28

