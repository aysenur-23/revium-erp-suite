@echo off
REM Backend Başlatma Scripti (Batch)
REM Bu script backend sunucusunu başlatır

echo 🚀 Backend sunucusu başlatılıyor...

cd server

REM .env dosyası kontrolü
if not exist .env (
    echo ❌ .env dosyası bulunamadı!
    echo 📝 Lütfen server/.env dosyasını oluşturun
    pause
    exit /b 1
)

REM Node.js kontrolü
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js bulunamadı! Lütfen Node.js yükleyin.
    pause
    exit /b 1
)

REM Bağımlılıkları kontrol et
if not exist node_modules (
    echo 📦 Bağımlılıklar yükleniyor...
    call npm install
)

REM Backend'i başlat
echo.
echo 📧 Backend sunucusu başlatılıyor...
echo 📍 URL: http://localhost:3000
echo 🔍 Health Check: http://localhost:3000/health
echo.
echo ⚠️  Backend'i durdurmak için Ctrl+C tuşlarına basın
echo.

node server.js

pause

