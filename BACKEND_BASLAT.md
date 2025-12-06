# 🚀 Backend Başlatma Rehberi

## ⚠️ ÖNEMLİ: Backend Çalışmıyor!

Email servisi çalışmıyor çünkü **backend sunucusu çalışmıyor**.

## 📋 Backend'i Başlatma

### Yöntem 1: Script ile (Önerilen - Windows)

**PowerShell:**
```powershell
.\start-backend.ps1
```

**Batch:**
```cmd
start-backend.bat
```

### Yöntem 2: Root Dizinden (npm script)

```bash
npm run backend
```

veya

```bash
npm run server
```

### Yöntem 3: Server Klasöründen

```bash
cd server
node server.js
```

### Yöntem 4: npm start ile

```bash
cd server
npm start
```

## ✅ Backend Çalışıyor mu Kontrol Et

Tarayıcıda veya terminal'de:

```bash
curl http://localhost:3000/health
```

veya tarayıcıda: `http://localhost:3000/health`

**Başarılı yanıt:**
```json
{
  "status": "OK",
  "service": "Email & Drive Server",
  "smtp": {
    "configured": true,
    "status": "connected"
  }
}
```

## 🔧 Sorun Giderme

### Backend başlamıyor

1. **Port kontrolü:**
   ```bash
   netstat -ano | findstr :3000
   ```
   Port kullanılıyorsa, process'i durdurun:
   ```bash
   Get-Process -Name node | Stop-Process -Force
   ```

2. **.env dosyası kontrolü:**
   ```bash
   cd server
   Test-Path .env
   ```
   `.env` dosyası yoksa oluşturun (server/.env):
   ```env
   PORT=3000
   SMTP_HOST=smtp.hostinger.com
   SMTP_PORT=465
   SMTP_USER=mail@revpad.net
   SMTP_PASSWORD=.Revpad2301
   SMTP_FROM=Revium ERP <mail@revpad.net>
   ```

3. **Node.js yüklü mü:**
   ```bash
   node --version
   ```

### Backend çalışıyor ama email gitmiyor

1. **SMTP bilgilerini kontrol edin** (`server/.env`)
2. **Backend loglarını kontrol edin** (terminal'de hata var mı?)
3. **Health check yapın:** `http://localhost:3000/health`

## 📝 Notlar

- Backend **her zaman çalışmalı** - email servisi için gerekli
- Backend durursa, email gönderilemez
- Frontend çalışırken backend de çalışmalı

## 🎯 Hızlı Test

1. Backend'i başlat: 
   - Windows: `.\start-backend.ps1` veya `start-backend.bat`
   - Diğer: `npm run backend`
2. Health check: `http://localhost:3000/health`
3. Email test: Browser console'da `await testEmailService('your-email@example.com')`

## 🔍 Backend Çalışıyor mu Kontrol Et

Backend başladıktan sonra, başka bir terminal'de:

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/health" | ConvertTo-Json
```

**CMD/Bash:**
```bash
curl http://localhost:3000/health
```

**Tarayıcı:**
`http://localhost:3000/health` adresini açın

