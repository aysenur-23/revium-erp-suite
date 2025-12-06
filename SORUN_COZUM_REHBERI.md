# 🔧 Sorun Çözüm Rehberi

## 📋 Mevcut Sorunlar ve Çözümleri

### 1. ❌ Backend `/health` Endpoint 500 Hatası

**Sorun:** `http://localhost:3000/health` endpoint'i 500 hatası veriyor.

**Çözüm:** ✅ Düzeltildi
- `smtpConfigured` ve `driveConfigured` değişkenleri tanımlandı
- Hata yakalama iyileştirildi

**Test:**
```bash
# Backend'i başlat
cd server
node server.js

# Başka bir terminal'de test et
curl http://localhost:3000/health
```

---

### 2. ❌ Backend Başlatma Sorunu

**Sorun:** Root dizinde `node server.js` çalıştırınca "Cannot find module" hatası.

**Çözüm:** ✅ Düzeltildi
- `package.json`'a `backend` ve `server` script'leri eklendi

**Kullanım:**
```bash
# Root dizinden backend başlat
npm run backend
# veya
npm run server
```

---

### 3. ❌ Email Servisi Localhost Backend'ini Kullanmıyor

**Sorun:** Email servisi production URL'ine gidiyor, localhost backend'ini kullanmıyor.

**Çözüm:** ✅ Düzeltildi
- `src/services/emailService.ts` güncellendi
- Localhost backend'i otomatik kullanılıyor

**Test:**
```javascript
// Browser console'da
await testEmailService('your-email@example.com')
```

---

### 4. ⚠️ CSP Hatası (Chrome Extension)

**Sorun:** `Loading the script 'http://localhost:3000/UA-x-x' violates CSP`

**Açıklama:** Bu hata Chrome extension'ından kaynaklanıyor (ID: `1e9df4b0-9567-4c6e-9c9c-b8da53920924`). Uygulamanın çalışmasını etkilemiyor.

**Çözüm:**
1. Chrome extension'ını devre dışı bırakın
2. Hard refresh yapın (Ctrl+Shift+R)
3. Tarayıcı cache'ini temizleyin

**Not:** CSP'ye `http://localhost:3000/*` ve `http://localhost:5173/*` eklendi ama extension hala hata verebilir.

---

## 🚀 Hızlı Başlangıç

### Backend'i Başlatma

```bash
# Yöntem 1: Root dizinden
npm run backend

# Yöntem 2: Server klasöründen
cd server
node server.js

# Yöntem 3: npm script ile
cd server
npm start
```

### Frontend'i Başlatma

```bash
# Root dizinden
npm start
# veya
npm run dev
```

### Test Etme

1. **Backend Health Check:**
   - Tarayıcıda: `http://localhost:3000/health`
   - Başarılı olmalı: `{"status":"OK",...}`

2. **Email Servisi:**
   - Browser console: `await testEmailService('test@example.com')`
   - Localhost backend kullanmalı

3. **Bildirim Testi:**
   - Bir görev oluşturun veya kullanıcı atayın
   - Console'da `✅ E-posta başarıyla gönderildi` görmelisiniz

---

## 🔍 Sorun Giderme

### Backend çalışmıyor

```bash
# Port kontrolü
netstat -ano | findstr :3000

# Process'i durdur
Get-Process -Name node | Stop-Process -Force

# Yeniden başlat
cd server
node server.js
```

### Email gönderilmiyor

1. Backend çalışıyor mu? (`http://localhost:3000/health`)
2. SMTP bilgileri doğru mu? (`server/.env`)
3. Console'da hata var mı? (F12 → Console)

### CSP hatası devam ediyor

1. Chrome extension'ını devre dışı bırakın
2. Hard refresh (Ctrl+Shift+R)
3. Tarayıcı cache'ini temizleyin
4. Incognito modda test edin

---

## ✅ Kontrol Listesi

- [ ] Backend çalışıyor (`http://localhost:3000/health`)
- [ ] Email servisi localhost backend'ini kullanıyor
- [ ] Bildirimler email gönderiyor
- [ ] CSP hatası sadece console'da (uygulama çalışıyor)

---

## 📞 Destek

Sorun devam ederse:
1. Backend loglarını kontrol edin
2. Browser console'u kontrol edin
3. Network tab'ında API isteklerini kontrol edin

