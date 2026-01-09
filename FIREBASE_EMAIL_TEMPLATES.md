# Firebase Authentication E-posta Şablonları

Bu dosya Firebase Console'da kullanılacak e-posta şablon mesajlarını içerir.

## Firebase Console'da Şablon Özelleştirme

1. Firebase Console'a gidin: https://console.firebase.google.com
2. Projenizi seçin
3. **Authentication** > **Templates** bölümüne gidin
4. İlgili şablonu seçin ve aşağıdaki mesajları kopyalayın

---

## 1. Email Address Verification (E-posta Doğrulama)

### Subject (Konu):
```
Revium ERP Suite - E-posta Adresinizi Doğrulayın
```

### Email Body (E-posta İçeriği):
```
Merhaba %DISPLAYNAME%,

Revium ERP Suite'e hoş geldiniz! Hesabınız başarıyla oluşturuldu.

E-posta adresinizi doğrulamak için aşağıdaki bağlantıya tıklayın:

%LINK%

Bu bağlantıya tıkladıktan sonra hesabınız aktifleşecek ve tüm özellikleri kullanmaya başlayabileceksiniz.

E-posta doğrulaması yapılmadan bazı özellikleri kullanamayabilirsiniz.

---

Önemli Güvenlik Notları:
• Bu bağlantıyı yalnızca siz kullanmalısınız
• Bağlantıyı başka biriyle paylaşmayın
• Eğer bu hesabı siz oluşturmadıysanız, bu e-postayı yok sayın

---

Bu e-posta Revium ERP Suite tarafından otomatik olarak gönderilmiştir.
E-posta bildirimlerini ayarlardan yönetebilirsiniz.

%APPNAME% Ekibi
```

### HTML Version (HTML Versiyonu - Opsiyonel):
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>E-posta Doğrulama - Revium ERP Suite</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Revium ERP Suite</h1>
  </div>
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
    <h2 style="color: #333; margin-top: 0; font-size: 20px; margin-bottom: 15px;">E-posta Adresinizi Doğrulayın</h2>
    <div style="background: #fff; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e5e7eb;">
      <p style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0 0 15px 0;">
        Merhaba <strong>%DISPLAYNAME%</strong>,
      </p>
      <p style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0 0 15px 0;">
        Revium ERP Suite'e hoş geldiniz! Hesabınız başarıyla oluşturuldu.
      </p>
      <p style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0 0 15px 0;">
        E-posta adresinizi doğrulamak için aşağıdaki butona tıklayın:
      </p>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="%LINK%" style="display: inline-block; background: #667eea; color: white; padding: 14px 35px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);">E-posta Adresimi Doğrula</a>
    </div>
    <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
      <strong style="color: #333;">Bilgilendirme:</strong><br>
      <span style="color: #666;">E-posta doğrulaması yapılmadan bazı özellikleri kullanamayabilirsiniz. Bu bağlantıya tıkladıktan sonra hesabınız aktifleşecek ve tüm özellikleri kullanmaya başlayabileceksiniz.</span>
    </div>
    <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
      <strong style="color: #333;">⚠️ Güvenlik Uyarısı:</strong><br>
      <span style="color: #666;">• Bu bağlantıyı yalnızca siz kullanmalısınız<br>
      • Bağlantıyı başka biriyle paylaşmayın<br>
      • Eğer bu hesabı siz oluşturmadıysanız, bu e-postayı yok sayın</span>
    </div>
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
    <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
      Bu e-posta Revium ERP Suite tarafından otomatik olarak gönderilmiştir.<br>
      E-posta bildirimlerini ayarlardan yönetebilirsiniz.
    </p>
  </div>
</body>
</html>
```

---

## 2. Password Reset (Şifre Sıfırlama)

### Subject (Konu):
```
Revium ERP Suite - Şifre Sıfırlama Talebi
```

### Email Body (E-posta İçeriği):
```
Merhaba %DISPLAYNAME%,

%EMAIL% e-posta adresi için şifre sıfırlama talebi aldık.

Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın:

%LINK%

Bu bağlantı 1 saat içinde geçerliliğini yitirecektir.

---

Önemli Güvenlik Notları:
• Bu bağlantıyı yalnızca siz kullanmalısınız
• Bağlantıyı başka biriyle paylaşmayın
• Eğer bu talebi siz yapmadıysanız, bu e-postayı yok sayabilirsiniz
• Eğer bu talebi siz yapmadıysanız, hesabınızın güvenliği için lütfen şifrenizi değiştirin

---

Bu e-posta Revium ERP Suite tarafından otomatik olarak gönderilmiştir.
Bu bağlantı 1 saat içinde geçerliliğini yitirecektir.

%APPNAME% Ekibi
```

### HTML Version (HTML Versiyonu - Opsiyonel):
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Şifre Sıfırlama - Revium ERP Suite</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Revium ERP Suite</h1>
  </div>
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
    <h2 style="color: #333; margin-top: 0; font-size: 20px; margin-bottom: 15px;">Şifre Sıfırlama Talebi</h2>
    <div style="background: #fff; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e5e7eb;">
      <p style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0 0 15px 0;">
        Merhaba <strong>%DISPLAYNAME%</strong>,
      </p>
      <p style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0 0 15px 0;">
        <strong>%EMAIL%</strong> e-posta adresi için şifre sıfırlama talebi aldık. Eğer bu talebi siz yapmadıysanız, bu e-postayı yok sayabilirsiniz.
      </p>
      <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
        <strong style="color: #333;">İstek Bilgileri:</strong><br>
        <span style="color: #666;">E-posta: %EMAIL%</span><br>
        <span style="color: #666;">Bu bağlantı 1 saat içinde geçerliliğini yitirecektir</span>
      </div>
      <p style="color: #374151; font-size: 16px; line-height: 1.8; margin: 15px 0 0 0;">
        Şifrenizi sıfırlamak için aşağıdaki butona tıklayın:
      </p>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="%LINK%" style="display: inline-block; background: #667eea; color: white; padding: 14px 35px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);">Şifremi Sıfırla</a>
    </div>
    <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
      <strong style="color: #333;">⚠️ Güvenlik Uyarısı:</strong><br>
      <span style="color: #666;">Bu bağlantı 1 saat içinde geçerlidir. Bağlantıyı yalnızca siz kullanmalısınız. Başka biriyle paylaşmayın.</span>
    </div>
    <div style="background: #fee2e2; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444; margin: 20px 0;">
      <p style="color: #991b1b; font-size: 14px; line-height: 1.6; margin: 0;">
        <strong>Önemli:</strong> Eğer bu talebi siz yapmadıysanız, hesabınızın güvenliği için lütfen şifrenizi değiştirin ve bize bildirin.
      </p>
    </div>
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
    <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
      Bu e-posta Revium ERP Suite tarafından otomatik olarak gönderilmiştir.<br>
      Bu bağlantı 1 saat içinde geçerliliğini yitirecektir.
    </p>
  </div>
</body>
</html>
```

---

## Firebase Değişkenleri

Firebase Authentication şablonlarında kullanabileceğiniz değişkenler:

- `%DISPLAYNAME%` - Kullanıcının görünen adı
- `%EMAIL%` - Kullanıcının e-posta adresi
- `%LINK%` - Doğrulama/sıfırlama bağlantısı (otomatik eklenir)
- `%APPNAME%` - Uygulama adı (Firebase Console'dan ayarlanır)

---

## Kullanım Notları

1. **Plain Text vs HTML**: Firebase hem plain text hem de HTML versiyonlarını destekler. HTML versiyonu daha görsel ve profesyonel görünür.

2. **Değişkenler**: Firebase otomatik olarak değişkenleri değiştirir. `%LINK%` değişkeni mutlaka kullanılmalıdır.

3. **Test**: Şablonları kaydettikten sonra test e-postası göndererek kontrol edin.

4. **Güvenlik**: Bağlantılar otomatik olarak güvenli token içerir ve belirli bir süre sonra geçersiz olur.

