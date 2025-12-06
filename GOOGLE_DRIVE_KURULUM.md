# 📁 Google Drive Kurulum Rehberi

## ⚠️ Durum

Health check'te `"drive": { "configured": false }` görünüyorsa, Google Drive henüz yapılandırılmamış demektir.

## 📋 Gereksinimler

1. **Google Cloud Console'da OAuth 2.0 Credentials**
2. **Backend sunucusu çalışıyor olmalı** (`http://localhost:3000`)
3. **OAuth flow'u tamamlanmalı** (bir kez yapılır)

## 🔧 Kurulum Adımları

### 1. Google Cloud Console'da OAuth Credentials Oluşturma

1. [Google Cloud Console](https://console.cloud.google.com/)'a gidin
2. Proje seçin veya yeni proje oluşturun
3. **APIs & Services > Credentials** bölümüne gidin
4. **Create Credentials > OAuth client ID** seçin
5. **Application type:** Web application
6. **Authorized redirect URIs** ekleyin:
   - Development: `http://localhost:3000/oauth2/callback`
   - Production: `https://revpad.net/oauth2/callback`
7. **Client ID** ve **Client Secret**'ı kopyalayın

### 2. Backend .env Dosyasını Güncelleme

`server/.env` dosyasına şu satırları ekleyin:

```env
# Google Drive OAuth
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2/callback

# Opsiyonel: Drive klasör ID'leri
GOOGLE_DRIVE_FOLDER_ID=your-folder-id
GOOGLE_DRIVE_TASKS_FOLDER_ID=your-tasks-folder-id
GOOGLE_DRIVE_REPORTS_FOLDER_ID=your-reports-folder-id

# Opsiyonel: Public link ayarı (varsayılan: true)
GOOGLE_DRIVE_PUBLIC_LINKS=true
```

### 3. Backend'i Yeniden Başlatma

```bash
# Backend'i durdurun (Ctrl+C)
# Sonra tekrar başlatın
npm run backend
```

### 4. OAuth Yetkilendirmesi (İlk Kurulum)

1. Tarayıcıda şu URL'i açın:
   ```
   http://localhost:3000/api/drive/auth-url
   ```

2. Dönen JSON'daki `url` değerini kopyalayın ve tarayıcıda açın

3. Google hesabınızla giriş yapın ve izinleri verin

4. OAuth callback tamamlandıktan sonra `server/drive-token.json` dosyası otomatik oluşturulacak

### 5. Test Etme

Health check yapın:

```bash
curl http://localhost:3000/health
```

Başarılı yanıt:
```json
{
  "status": "OK",
  "drive": {
    "configured": true
  }
}
```

## 🚀 Production'da Kurulum

### 1. Production .env Ayarları

Hostinger sunucusundaki `server/.env` dosyasına:

```env
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=https://revpad.net/oauth2/callback
```

### 2. OAuth Yetkilendirmesi (Production)

1. Production'da şu URL'i açın:
   ```
   https://revpad.net/api/drive/auth-url
   ```

2. Dönen URL'i tarayıcıda açın ve izinleri verin

3. `server/drive-token.json` dosyası sunucuda oluşturulacak

### 3. drive-token.json Dosyasını Yedekleme

⚠️ **ÖNEMLİ:** `drive-token.json` dosyasını yedekleyin! Bu dosya olmadan Drive çalışmaz.

```bash
# Sunucuda yedek al
cp server/drive-token.json server/drive-token.json.backup
```

## 📝 Kullanım

### Frontend'den Drive'a Dosya Yükleme

```typescript
import { uploadFileToDrive } from '@/services/driveService';

const file = new File(['content'], 'test.txt', { type: 'text/plain' });

const result = await uploadFileToDrive(file, {
  type: 'task', // veya 'report', 'general'
  fileName: 'test.txt',
  makePublic: true
});

console.log('File ID:', result.fileId);
console.log('View Link:', result.webViewLink);
```

### Drive'dan Dosya Silme

```typescript
import { deleteDriveFile } from '@/services/driveService';

await deleteDriveFile('file-id-here');
```

## 🔍 Sorun Giderme

### Drive "configured: false" Görünüyor

1. `.env` dosyasında `GOOGLE_CLIENT_ID` ve `GOOGLE_CLIENT_SECRET` var mı kontrol edin
2. Backend'i yeniden başlatın
3. Health check yapın: `http://localhost:3000/health`

### "Google Drive yetkilendirmesi bulunamadı" Hatası

1. OAuth flow'u tamamlanmamış olabilir
2. `http://localhost:3000/api/drive/auth-url` URL'ini açın
3. Dönen URL'i tarayıcıda açıp izinleri verin
4. `server/drive-token.json` dosyasının oluştuğunu kontrol edin

### "drive-token.json" Dosyası Yok

1. OAuth flow'u tamamlayın (yukarıdaki adım 4)
2. Dosya `server/` klasöründe oluşmalı
3. Dosya yoksa, OAuth flow'u tekrar yapın

### Production'da Drive Çalışmıyor

1. Production `.env` dosyasını kontrol edin
2. `GOOGLE_REDIRECT_URI` production URL'i olmalı: `https://revpad.net/oauth2/callback`
3. Google Cloud Console'da redirect URI'nin ekli olduğundan emin olun
4. `drive-token.json` dosyasının sunucuda olduğunu kontrol edin

## ✅ Kontrol Listesi

- [ ] Google Cloud Console'da OAuth credentials oluşturuldu
- [ ] `server/.env` dosyasına Google credentials eklendi
- [ ] Backend yeniden başlatıldı
- [ ] OAuth flow tamamlandı (`/api/drive/auth-url`)
- [ ] `server/drive-token.json` dosyası oluşturuldu
- [ ] Health check'te `"drive": { "configured": true }` görünüyor
- [ ] Test dosya yüklemesi başarılı

## 📚 API Endpoints

- `GET /api/drive/auth-url` - OAuth URL al
- `GET /oauth2/callback` - OAuth callback (otomatik)
- `POST /api/drive/upload` - Dosya yükle
- `DELETE /api/drive/files/:fileId` - Dosya sil

## 🔒 Güvenlik Notları

- `drive-token.json` dosyasını `.gitignore`'a ekleyin
- Client Secret'ı asla public repository'ye yüklemeyin
- Production'da HTTPS kullanın
- `drive-token.json` dosyasını düzenli olarak yedekleyin

