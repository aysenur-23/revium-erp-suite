# Backend Başlatma Scripti (PowerShell)
# Bu script backend sunucusunu başlatır ve kontrol eder

Write-Host "🚀 Backend sunucusu başlatılıyor..." -ForegroundColor Cyan

# Port kontrolü
$portInUse = netstat -ano | findstr ":3000"
if ($portInUse) {
    Write-Host "⚠️  Port 3000 kullanılıyor. Mevcut process'ler durduruluyor..." -ForegroundColor Yellow
    Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

# Server klasörüne git
Set-Location -Path "server"

# .env dosyası kontrolü
if (-not (Test-Path ".env")) {
    Write-Host "❌ .env dosyası bulunamadı!" -ForegroundColor Red
    Write-Host "📝 Lütfen server/.env dosyasını oluşturun:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "PORT=3000" -ForegroundColor Gray
    Write-Host "SMTP_HOST=smtp.hostinger.com" -ForegroundColor Gray
    Write-Host "SMTP_PORT=465" -ForegroundColor Gray
    Write-Host "SMTP_USER=mail@revpad.net" -ForegroundColor Gray
    Write-Host "SMTP_PASSWORD=your-password" -ForegroundColor Gray
    Write-Host "SMTP_FROM=Revium ERP <mail@revpad.net>" -ForegroundColor Gray
    Write-Host ""
    Set-Location -Path ".."
    exit 1
}

# Node.js kontrolü
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js bulundu: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js bulunamadı! Lütfen Node.js yükleyin." -ForegroundColor Red
    Set-Location -Path ".."
    exit 1
}

# Bağımlılıkları kontrol et
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Bağımlılıklar yükleniyor..." -ForegroundColor Yellow
    npm install
}

# Backend'i başlat
Write-Host ""
Write-Host "📧 Backend sunucusu başlatılıyor..." -ForegroundColor Cyan
Write-Host "📍 URL: http://localhost:3000" -ForegroundColor Gray
Write-Host "🔍 Health Check: http://localhost:3000/health" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠️  Backend'i durdurmak için Ctrl+C tuşlarına basın" -ForegroundColor Yellow
Write-Host ""

# Backend'i başlat
node server.js

