# Hostinger Deployment Rehberi

## 📦 Yüklenecek Dosyalar

**Hostinger'a yüklenecek klasör:** `dist/` klasörünün **içindeki tüm dosyalar**

### Adımlar:

1. **Build Yap:**
   ```bash
   npm run build
   ```

2. **Dist Klasörünü Kontrol Et:**
   - `dist/` klasörü oluşturuldu mu?
   - `dist/index.html` var mı?
   - `dist/assets/` klasörü var mı?

3. **Hostinger'a Yükle:**
   - Hostinger File Manager'a giriş yap
   - `public_html` klasörüne git
   - **`dist/` klasörünün içindeki TÜM dosyaları** `public_html` klasörüne yükle
   - **ÖNEMLİ:** `dist/` klasörünü değil, içindeki dosyaları yükle!

### Yüklenecek Dosya Yapısı:

```
public_html/
├── index.html
├── assets/
│   ├── index-*.js
│   ├── index-*.css
│   └── ...
├── rev-favicon.png
├── robots.txt
├── manifest.json
└── browserconfig.xml
```

## ⚙️ Vite Config Ayarları

`vite.config.ts` dosyasında `base` path ayarı var:

```typescript
base: process.env.VITE_BASE_PATH || (mode === 'production' ? '/revium-erp/' : '/')
```

**Eğer site root'ta çalışacaksa:**
- `base: '/'` olmalı (production için)

**Eğer alt klasörde çalışacaksa (örn: `/revium-erp/`):**
- `base: '/revium-erp/'` olmalı

## 🔧 Build Komutları

### Normal Build (Root için):
```bash
npm run build
```

### Alt Klasör için Build:
```bash
VITE_BASE_PATH=/revium-erp/ npm run build
```

## ✅ Kontrol Listesi

- [ ] `npm run build` başarıyla tamamlandı
- [ ] `dist/` klasörü oluşturuldu
- [ ] `dist/index.html` dosyası var
- [ ] `dist/assets/` klasörü var ve içinde JS/CSS dosyaları var
- [ ] Hostinger'a dosyalar yüklendi
- [ ] Site açılıyor
- [ ] PDF indirme çalışıyor
- [ ] Tüm sayfalar çalışıyor

## 🐛 Sorun Giderme

### Site Açılmıyor:
- `base` path'i kontrol et
- `.htaccess` dosyası gerekebilir (SPA routing için)

### PDF İndirme Çalışmıyor:
- Console'da hata var mı kontrol et
- Font yükleme hataları varsa Helvetica fallback kullanılacak

### 404 Hatası:
- `.htaccess` dosyası ekle (aşağıdaki içerikle)

## 📄 .htaccess Dosyası (SPA Routing için)

`public_html/.htaccess` dosyası oluştur:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

## 🚀 Hızlı Deployment

```bash
# 1. Build yap
npm run build

# 2. Dist klasörünü kontrol et
ls -la dist/

# 3. Hostinger File Manager'da:
#    - public_html klasörüne git
#    - dist/ içindeki TÜM dosyaları yükle
#    - .htaccess dosyasını ekle (yukarıdaki içerikle)
```

## 📝 Notlar

- **CSP Hatası:** Chrome extension'dan kaynaklanan CSP hatası normal, site çalışmasını etkilemez
- **PDF Font Hatası:** Font yüklenemezse otomatik olarak Helvetica kullanılacak
- **Base Path:** Eğer site root'ta değilse, `vite.config.ts`'deki `base` path'i güncelle

