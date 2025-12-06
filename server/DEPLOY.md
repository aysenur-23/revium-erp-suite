# 🚀 Production Deploy Kılavuzu

## 📋 Ön Gereksinimler

1. **Node.js** (v18 veya üzeri)
2. **PM2** (Process Manager - opsiyonel ama önerilir)
3. **Hostinger** hosting hesabı (Node.js desteği ile)

## 🔧 Kurulum Adımları

### 1. Dosyaları Sunucuya Yükle

```bash
# Tüm server klasörünü Hostinger'a yükle
scp -r server/* user@revpad.net:/path/to/server/
```

### 2. Environment Variables Ayarla

```bash
# Sunucuda .env dosyası oluştur
cd /path/to/server
cp .env.example .env
nano .env  # veya vi .env
```

**Gerekli değişkenler:**
- `SMTP_HOST=smtp.hostinger.com`
- `SMTP_PORT=465`
- `SMTP_USER=mail@revpad.net`
- `SMTP_PASSWORD=your-password`
- `SMTP_FROM=noreply@reviumtech.com`

### 3. Bağımlılıkları Yükle

```bash
cd /path/to/server
npm install --production
```

### 4. Backend'i Başlat

#### Seçenek 1: PM2 ile (Önerilen)

```bash
# PM2'yi global olarak yükle
npm install -g pm2

# Backend'i PM2 ile başlat
pm2 start server.js --name revium-api

# PM2'yi sistem başlangıcında çalışacak şekilde ayarla
pm2 startup
pm2 save
```

#### Seçenek 2: Node.js ile Doğrudan

```bash
# Arka planda çalıştır
nohup node server.js > server.log 2>&1 &

# veya screen kullan
screen -S revium-api
node server.js
# Ctrl+A, D ile çık
```

### 5. Port ve Reverse Proxy Ayarları

Hostinger'da Node.js uygulamanızı port 3000'de çalıştırın ve reverse proxy ayarlayın:

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

### 6. Health Check

Backend'in çalıştığını kontrol edin:

```bash
curl https://revpad.net/health
```

Beklenen yanıt:
```json
{
  "status": "OK",
  "service": "Email & Drive Server",
  "timestamp": "2024-...",
  "smtp": {
    "configured": true,
    "status": "connected",
    "host": "smtp.hostinger.com",
    "port": "465"
  },
  "drive": {
    "configured": true
  }
}
```

## 🔄 Güncelleme

```bash
# 1. Yeni dosyaları yükle
scp -r server/* user@revpad.net:/path/to/server/

# 2. Bağımlılıkları güncelle
cd /path/to/server
npm install --production

# 3. PM2 ile yeniden başlat
pm2 restart revium-api

# veya Node.js ile
pkill -f "node server.js"
nohup node server.js > server.log 2>&1 &
```

## 📊 Monitoring

### PM2 ile

```bash
# Durumu kontrol et
pm2 status

# Logları görüntüle
pm2 logs revium-api

# CPU/Memory kullanımı
pm2 monit
```

### Manuel

```bash
# Process'i kontrol et
ps aux | grep "node server.js"

# Logları görüntüle
tail -f server.log
```

## 🐛 Sorun Giderme

### Backend çalışmıyor

1. Port kontrolü:
```bash
netstat -tulpn | grep 3000
```

2. Log kontrolü:
```bash
pm2 logs revium-api
# veya
tail -f server.log
```

3. Environment variables kontrolü:
```bash
cat .env
```

### CORS hatası

- `server.js`'deki CORS ayarlarını kontrol edin
- Backend'in doğru port'ta çalıştığından emin olun
- Reverse proxy ayarlarını kontrol edin

### SMTP hatası

- `.env` dosyasındaki SMTP bilgilerini kontrol edin
- Hostinger SMTP ayarlarını doğrulayın
- Firewall'da port 465'in açık olduğundan emin olun

## ✅ Deploy Checklist

- [ ] Dosyalar sunucuya yüklendi
- [ ] `.env` dosyası oluşturuldu ve dolduruldu
- [ ] `npm install --production` çalıştırıldı
- [ ] Backend başlatıldı (PM2 veya nohup)
- [ ] Health check başarılı (`/health`)
- [ ] Reverse proxy ayarlandı
- [ ] E-posta test edildi
- [ ] Google Drive (opsiyonel) yapılandırıldı

## 📞 Destek

Sorun yaşarsanız:
1. Log dosyalarını kontrol edin
2. Health check endpoint'ini test edin
3. Environment variables'ı doğrulayın
4. PM2/process durumunu kontrol edin

