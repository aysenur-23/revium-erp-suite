# 🚨 PRODUCTION DEPLOY - KRİTİK NOTLAR

## ⚠️ ŞU ANDA ÇALIŞMAYAN ÖZELLİKLER

### 1. E-posta Servisi (CORS Hatası)
**Sorun:** Production backend'de (`https://revpad.net/api/send-email`) CORS hatası var.

**Hata:**
```
Access to fetch at 'https://revpad.net/api/send-email' from origin 'http://localhost:5173' 
has been blocked by CORS policy: Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**Çözüm:** Backend sunucusunu production'a deploy etmeniz gerekiyor.

---

## 📋 PRODUCTION DEPLOY ADIMLARI

### 1. Backend Sunucusunu Deploy Et

#### A. Hostinger'a Bağlan
```bash
# SSH ile bağlan
ssh user@revpad.net
```

#### B. Backend Dosyalarını Yükle
```bash
# server/ klasörünü Hostinger'a yükle
scp -r server/* user@revpad.net:/path/to/server/
```

#### C. Environment Variables Ayarla
Hostinger'da `.env` dosyası oluştur:
```bash
cd /path/to/server
nano .env
```

**Gerekli değişkenler:**
```env
PORT=3000
NODE_ENV=production

SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=mail@revpad.net
SMTP_PASSWORD=your-password
SMTP_FROM=noreply@reviumtech.com
```

#### D. Bağımlılıkları Yükle ve Başlat
```bash
cd /path/to/server
npm install --production
pm2 start server.js --name revium-api
pm2 save
pm2 startup
```

#### E. Reverse Proxy Ayarla
Hostinger'da Apache veya Nginx ayarlarını yapın:

**Apache (.htaccess):**
```apache
<IfModule mod_proxy.c>
    ProxyPreserveHost On
    ProxyPass /api http://localhost:3000/api
    ProxyPassReverse /api http://localhost:3000/api
</IfModule>
```

**Nginx:**
```nginx
location /api {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

### 2. Test Et

```bash
# Health check
curl https://revpad.net/health

# E-posta test
curl -X POST https://revpad.net/api/send-email \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5173" \
  -d '{"to":"test@example.com","subject":"Test","html":"<p>Test</p>"}'
```

---

## 🔧 CSP HATASI İÇİN

CSP hatası Chrome extension'ından kaynaklanıyor olabilir. 

**Çözüm:**
1. Chrome extension'ını devre dışı bırakın (ID: `1e9df4b0-9567-4c6e-9c9c-b8da53920924`)
2. Hard refresh yapın (Ctrl+Shift+R)
3. Tarayıcı cache'ini temizleyin

**Not:** Bu hata uygulamanın çalışmasını etkilemiyor, sadece console'da görünüyor.

---

## ✅ DEPLOY SONRASI KONTROL LİSTESİ

- [ ] Backend sunucusu çalışıyor mu? (`https://revpad.net/health`)
- [ ] CORS ayarları doğru mu? (OPTIONS request'leri çalışıyor mu?)
- [ ] E-posta servisi çalışıyor mu? (`/api/send-email`)
- [ ] Google Drive servisi çalışıyor mu? (`/api/drive/upload`)
- [ ] Frontend build yapıldı mı? (`npm run build:hostinger`)
- [ ] Frontend production'a deploy edildi mi?

---

## 🐛 SORUN GİDERME

### Backend çalışmıyor
```bash
# Process kontrolü
pm2 status
pm2 logs revium-api

# Port kontrolü
netstat -tulpn | grep 3000
```

### CORS hatası devam ediyor
1. Backend'in çalıştığından emin olun
2. OPTIONS request'lerinin çalıştığını kontrol edin
3. Reverse proxy ayarlarını kontrol edin
4. Backend'i yeniden başlatın: `pm2 restart revium-api`

### E-posta gönderilemiyor
1. SMTP bilgilerini kontrol edin (`.env` dosyası)
2. Backend loglarını kontrol edin: `pm2 logs revium-api`
3. SMTP port'unun açık olduğundan emin olun (465)

---

## 📞 DESTEK

Sorun yaşarsanız:
1. Backend loglarını kontrol edin: `pm2 logs revium-api`
2. Health check yapın: `curl https://revpad.net/health`
3. CORS test edin: Browser DevTools → Network → OPTIONS request kontrolü

