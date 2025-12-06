# 📧 Hostinger Mail Gönderimi - Basit Kurulum

Vercel olmadan, sadece Hostinger SMTP ile e-posta gönderimi.

## ✅ Hazır Olanlar

- ✅ `server/server.js` - Node.js/Express backend sunucusu
- ✅ `server/package.json` - Bağımlılıklar
- ✅ `src/services/emailService.ts` - Client-side servis (güncellendi)

## 🚀 Kurulum Adımları

### 1. Backend Sunucusunu Kurun

```bash
cd server
npm install
```

### 2. Environment Variables Ayarlayın

`server/.env` dosyası oluşturun:

```env
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=mail@revpad.net
SMTP_PASSWORD=.Revpad2301
SMTP_FROM=Revium ERP <mail@revpad.net>
PORT=3000
```

### 3. Sunucuyu Başlatın

```bash
npm start
```

Sunucu `http://localhost:3000` adresinde çalışacak.

### 4. Client-Side'da API URL'ini Ayarlayın

Proje kök dizininde `.env` dosyası oluşturun:

```env
VITE_EMAIL_API_URL=http://localhost:3000/api/send-email
```

Production'da:

```env
VITE_EMAIL_API_URL=http://your-server.com/api/send-email
```

## 🌐 Hostinger'da Çalıştırma

### VPS/Cloud Hosting (Önerilen)

1. Hostinger VPS veya Cloud hosting paketi alın
2. Node.js yükleyin
3. Projeyi yükleyin
4. PM2 ile çalıştırın:

```bash
npm install -g pm2
cd server
pm2 start server.js --name email-server
pm2 save
pm2 startup
```

### Shared Hosting

Shared hosting'de Node.js desteği sınırlı olabilir. Bu durumda:
- Hostinger'ın Node.js desteğini kontrol edin
- Veya VPS/Cloud hosting paketi kullanın

## ✅ Test

1. Backend sunucusunu başlatın: `cd server && npm start`
2. Uygulamada bir bildirim oluşturun
3. E-posta gönderilmeli

## 📝 API Endpoint

```
POST http://your-server.com/api/send-email
Content-Type: application/json

{
  "to": "kullanici@example.com",
  "subject": "Test",
  "html": "<h1>Test</h1>"
}
```

## 🔧 Sorun Giderme

### Sunucu çalışmıyor

- Node.js yüklü mü kontrol edin: `node --version`
- Port 3000 kullanımda mı kontrol edin
- `.env` dosyasının doğru olduğundan emin olun

### E-posta gönderilmiyor

- Backend sunucusunun çalıştığından emin olun
- SMTP bilgilerini kontrol edin
- Hostinger e-posta hesabının aktif olduğundan emin olun
- Backend loglarını kontrol edin

## 📚 Detaylar

Daha fazla bilgi için: `server/README.md`

