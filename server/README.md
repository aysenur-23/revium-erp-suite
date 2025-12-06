# 📧 Hostinger SMTP E-posta Sunucusu

Basit Node.js/Express sunucusu ile Hostinger SMTP üzerinden e-posta gönderimi.

## 🚀 Hızlı Kurulum

### 1. Bağımlılıkları Yükleyin

```bash
cd server
npm install
```

### 2. Environment Variables Ayarlayın

`.env` dosyası oluşturun:

```bash
cp .env.example .env
```

`.env` dosyasını düzenleyin:

```
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

## 🌐 Hostinger'da Çalıştırma

### Seçenek 1: Hostinger VPS/Cloud Hosting

1. Node.js desteği olan bir hosting paketi seçin
2. Projeyi FTP/SFTP ile yükleyin
3. SSH ile bağlanın
4. PM2 ile çalıştırın:

```bash
npm install -g pm2
pm2 start server.js --name email-server
pm2 save
pm2 startup
```

### Seçenek 2: Hostinger Shared Hosting

Shared hosting'de Node.js desteği sınırlı olabilir. Bu durumda:
- Hostinger'ın Node.js desteğini kontrol edin
- Veya VPS/Cloud hosting paketi kullanın

## 📝 API Kullanımı

### E-posta Gönder

```javascript
POST http://your-server.com/api/send-email
Content-Type: application/json

{
  "to": "kullanici@example.com",
  "subject": "Test E-posta",
  "html": "<h1>Merhaba!</h1><p>Bu bir test e-postasıdır.</p>"
}
```

### Response

```json
{
  "success": true,
  "messageId": "<message-id>"
}
```

## 🔧 Client-Side Entegrasyon

`src/services/emailService.ts` dosyasında API URL'ini güncelleyin:

```typescript
const apiUrl = "http://your-server.com/api/send-email";
```

Veya environment variable kullanın:

```typescript
const apiUrl = import.meta.env.VITE_EMAIL_API_URL || "http://localhost:3000/api/send-email";
```

## 🔒 Güvenlik

- `.env` dosyasını `.gitignore`'a ekleyin
- Production'da HTTPS kullanın
- Rate limiting ekleyin (isteğe bağlı)
- API key authentication ekleyin (isteğe bağlı)

## 📚 PM2 Komutları

```bash
# Sunucuyu başlat
pm2 start server.js --name email-server

# Durumu kontrol et
pm2 status

# Logları görüntüle
pm2 logs email-server

# Yeniden başlat
pm2 restart email-server

# Durdur
pm2 stop email-server

# Sil
pm2 delete email-server
```

