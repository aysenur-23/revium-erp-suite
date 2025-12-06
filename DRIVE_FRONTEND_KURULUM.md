# 📁 Google Drive Frontend Entegrasyonu - API'siz Kullanım

## 🎯 Genel Bakış

Artık Google Drive işlemleri **API'ye gerek kalmadan** direkt frontend'den yapılıyor. Google Identity Services (GIS) ve Drive API REST kullanılarak tüm işlemler tarayıcıda gerçekleştiriliyor.

---

## ✅ Avantajlar

1. **Backend API'ye gerek yok** - Tüm işlemler frontend'de
2. **Daha hızlı** - Doğrudan Google API'ye bağlanma
3. **Daha güvenli** - Token'lar sadece kullanıcının tarayıcısında
4. **Kolay kurulum** - Sadece Google Client ID gerekli

---

## 🔧 Kurulum Adımları

### 1. Google Cloud Console'da OAuth Credentials Oluşturma

1. [Google Cloud Console](https://console.cloud.google.com/)'a gidin
2. Proje seçin veya yeni proje oluşturun
3. **APIs & Services > Credentials** bölümüne gidin
4. **Create Credentials > OAuth client ID** seçin
5. **Application type:** Web application
6. **Authorized JavaScript origins** ekleyin:
   - Development: `http://localhost:5173`
   - Production: `https://revpad.net`
7. **Authorized redirect URIs** ekleyin:
   - Development: `http://localhost:5173`
   - Production: `https://revpad.net`
8. **Client ID**'yi kopyalayın

### 2. Environment Variables Ayarlama

`.env` veya `.env.local` dosyasına ekleyin:

```env
# Google Drive OAuth (Frontend)
VITE_GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com

# Opsiyonel: Google API Key (bazı durumlarda gerekli olabilir)
VITE_GOOGLE_API_KEY=your-api-key-here

# Opsiyonel: Drive klasör ID'leri
VITE_GOOGLE_DRIVE_TASKS_FOLDER_ID=your-tasks-folder-id
VITE_GOOGLE_DRIVE_REPORTS_FOLDER_ID=your-reports-folder-id
```

### 3. index.html Kontrolü

`index.html` dosyasında Google Identity Services script'lerinin yüklendiğinden emin olun:

```html
<!-- Google APIs JavaScript Client Library -->
<script src="https://apis.google.com/js/api.js"></script>
<script src="https://accounts.google.com/gsi/client"></script>
```

**Not:** Bu script'ler otomatik olarak eklenmiştir.

### 4. Content Security Policy (CSP)

`index.html`'deki CSP ayarları Google API'leri için güncellenmiştir:
- `https://accounts.google.com` eklendi
- `https://*.googleapis.com` zaten mevcut

---

## 🚀 Kullanım

### Frontend'den Drive'a Dosya Yükleme

```typescript
import { uploadFileToDrive, authorizeDrive } from '@/services/driveService';

// Önce yetkilendirme yap (ilk kullanımda)
await authorizeDrive();

// Dosya yükle
const file = new File(['content'], 'test.txt', { type: 'text/plain' });

const result = await uploadFileToDrive(file, {
  type: 'task', // veya 'report', 'general'
  fileName: 'test.txt',
  makePublic: true // Herkese açık link
});

console.log('File ID:', result.fileId);
console.log('View Link:', result.webViewLink);
```

### Drive Yetkilendirme Kontrolü

```typescript
import { isDriveAuthorized, authorizeDrive } from '@/services/driveService';

// Yetkilendirme var mı kontrol et
const isAuthorized = await isDriveAuthorized();

if (!isAuthorized) {
  // Yetkilendirme yap
  await authorizeDrive();
}
```

### Drive Yetkilendirmesini Kaldırma

```typescript
import { revokeDriveAccess } from '@/services/driveService';

await revokeDriveAccess();
```

### Drive'dan Dosya Silme

```typescript
import { deleteDriveFile } from '@/services/driveService';

await deleteDriveFile('file-id-here');
```

---

## 🔄 Otomatik Token Yönetimi

- **Token Storage:** Access token'lar `localStorage`'da saklanır
- **Token Expiry:** Token'lar otomatik olarak süresi dolduğunda yenilenir
- **Auto Refresh:** Token süresi dolduğunda otomatik olarak yeni token istenir

---

## 📝 Mevcut Kullanım Yerleri

Drive servisi şu yerlerde kullanılıyor:

1. **Görev Ekleri** (`uploadTaskAttachment`)
   - Görev detay modal'da dosya yükleme
   - Task inline form'da dosya yükleme

2. **PDF Raporları** (`uploadReportPDF`)
   - Satış raporları
   - Üretim raporları
   - Müşteri raporları
   - Mali raporlar

3. **Dosya Silme** (`deleteDriveFile`)
   - Görev eklerini silme
   - Rapor dosyalarını silme

---

## 🔍 Sorun Giderme

### "Google Client ID bulunamadı" Hatası

1. `.env` dosyasında `VITE_GOOGLE_CLIENT_ID` var mı kontrol edin
2. Environment variable'ı yeniden yüklemek için development server'ı yeniden başlatın
3. Production'da build sonrası environment variable'ların yüklendiğinden emin olun

### "Google Identity Services yüklenemedi" Hatası

1. İnternet bağlantınızı kontrol edin
2. `index.html`'de Google script'lerinin yüklendiğinden emin olun
3. Tarayıcı console'da hata var mı kontrol edin
4. CSP ayarlarının Google API'lerine izin verdiğinden emin olun

### "Yetkilendirme hatası" (401)

1. Token süresi dolmuş olabilir - otomatik yenilenir
2. Kullanıcı yetkilendirmeyi iptal etmiş olabilir - tekrar yetkilendirme yapın
3. Google Client ID yanlış olabilir - kontrol edin

### "Depolama kotası dolmuş" (507)

1. Google Drive depolama alanınızı kontrol edin
2. Eski dosyaları silin
3. Google Drive depolama planınızı yükseltin

### Token localStorage'da saklanıyor mu?

- **Evet**, token'lar `localStorage`'da saklanır
- Token'lar sadece kullanıcının tarayıcısında, sunucuya gönderilmez
- Token süresi dolduğunda otomatik olarak yenilenir

---

## 🔒 Güvenlik Notları

1. **Client ID Public:** Client ID public olabilir (güvenli)
2. **Token Storage:** Token'lar sadece kullanıcının tarayıcısında saklanır
3. **HTTPS:** Production'da mutlaka HTTPS kullanın
4. **CSP:** Content Security Policy ayarları Google API'leri için yapılandırılmıştır

---

## 📊 Backend API vs Frontend Direct

### Eski Yöntem (Backend API)
- ❌ Backend sunucusu gerekli
- ❌ Backend'de token yönetimi
- ❌ API endpoint'leri gerekli
- ❌ CORS ayarları gerekli

### Yeni Yöntem (Frontend Direct)
- ✅ Backend sunucusu gerekmez
- ✅ Token'lar sadece tarayıcıda
- ✅ Direkt Google API'ye bağlanma
- ✅ Daha hızlı ve güvenli

---

## ✅ Kontrol Listesi

- [ ] Google Cloud Console'da OAuth credentials oluşturuldu
- [ ] `VITE_GOOGLE_CLIENT_ID` environment variable'ı ayarlandı
- [ ] `index.html`'de Google script'leri yüklü
- [ ] CSP ayarları Google API'leri için yapılandırıldı
- [ ] Development server yeniden başlatıldı
- [ ] İlk Drive yetkilendirmesi yapıldı
- [ ] Test dosya yüklemesi başarılı

---

## 🎉 Sonuç

Artık Google Drive işlemleri **tamamen frontend'de** yapılıyor. Backend API'ye gerek yok! 

Kullanıcılar ilk kullanımda Google ile giriş yapıp Drive yetkilendirmesi yaptıktan sonra, tüm dosya işlemleri otomatik olarak çalışacak.

---

**Son Güncelleme:** 2024-11-28

