/**
 * E-posta Gönderim Servisi (Hostinger SMTP)
 * Node.js/Express backend sunucusu üzerinden e-posta gönderimi
 * 
 * Kurulum:
 * 1. server/ klasörüne gidin: cd server
 * 2. Bağımlılıkları yükleyin: npm install
 * 3. .env dosyası oluşturun (server/.env.example'dan kopyalayın)
 * 4. Sunucuyu başlatın: npm start
 * 5. API URL'ini .env dosyasına ekleyin: VITE_EMAIL_API_URL=http://your-server.com/api/send-email
 */

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * E-posta gönder (Node.js backend sunucusu üzerinden - Hostinger SMTP)
 * Geliştirilmiş hata yönetimi ve retry mekanizması ile
 */
export const sendEmail = async (options: EmailOptions): Promise<{ success: boolean; error?: string }> => {
  // Önce environment variable'dan al
  let primaryUrl = import.meta.env.VITE_EMAIL_API_URL || 
                   import.meta.env.VITE_API_URL;
  
  // Eğer primary URL yoksa veya localhost ise, localhost backend'i kullan
  if (!primaryUrl || primaryUrl.includes('localhost') || primaryUrl.includes('127.0.0.1')) {
    // Localhost backend'i kullan (port 3000)
    primaryUrl = "http://localhost:3000/api/send-email";
  } else if (!primaryUrl.endsWith('/send-email') && !primaryUrl.endsWith('/send-email/')) {
    // URL'in sonuna /send-email ekle
    primaryUrl = primaryUrl.replace(/\/$/, "") + "/send-email";
  }
  
  // Fallback URL (production) - Sadece localhost başarısız olursa kullan
  const fallbackUrl = "https://revpad.net/api/send-email";
  
  // Timeout ile fetch (8 saniye - email gönderimi biraz daha uzun sürebilir)
  const fetchWithTimeout = (url: string, options: RequestInit, timeout = 8000): Promise<Response> => {
    return Promise.race([
      fetch(url, {
        ...options,
        // CORS için gerekli header'lar
        headers: {
          ...options.headers,
          'Accept': 'application/json',
        },
        // CORS hatalarını sessizce handle et
        mode: 'cors',
      }).catch((error) => {
        // CORS ve network hatalarını sessizce handle et
        const errorMsg = error?.message || String(error);
        if (errorMsg.includes('CORS') || errorMsg.includes('Failed to fetch') || errorMsg.includes('ERR_')) {
          // Sessizce reject et, konsola log basma
          return Promise.reject(new Error("NetworkError"));
        }
        return Promise.reject(error);
      }),
      new Promise<Response>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), timeout)
      ),
    ]);
  };
  
  // Önce primary URL'i dene (localhost backend veya production)
  if (primaryUrl) {
    try {
      const response = await fetchWithTimeout(primaryUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          to: options.to,
          subject: options.subject,
          html: options.html,
        }),
      });

      if (response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const result = await response.json();
          if (result.success) {
            // Başarılı - hem dev hem production'da log göster (kritik işlem)
            if (import.meta.env.DEV) {
              console.log(`✅ E-posta başarıyla gönderildi (primary): ${options.to}`);
            }
            return { success: true };
          } else {
            // API başarısız döndü - fallback'e geç
            if (import.meta.env.DEV) {
              console.warn(`⚠️ Primary email API başarısız: ${result.error || 'Bilinmeyen hata'}, fallback'e geçiliyor`);
            }
          }
        } else {
          // JSON değilse, endpoint yanlış - fallback'e geç
          if (import.meta.env.DEV) {
            console.warn("⚠️ Primary email API JSON döndürmüyor, fallback'e geçiliyor");
          }
        }
      } else {
        // Response başarısız - fallback'e geç
        if (import.meta.env.DEV) {
          const errorText = await response.text().catch(() => "");
          console.warn(`⚠️ Primary email API hatası (${response.status}), fallback'e geçiliyor:`, errorText.substring(0, 100));
        }
      }
    } catch (error: any) {
      // Primary URL bağlantısı başarısız, fallback'e geç
      // Development'ta hata mesajını göster (debug için)
      if (import.meta.env.DEV) {
        const errorMsg = error?.message || String(error);
        if (errorMsg.includes('ERR_CONNECTION_REFUSED')) {
          console.warn(`⚠️ Localhost backend çalışmıyor (${primaryUrl}). Fallback URL'e geçiliyor...`);
        } else if (errorMsg.includes('CORS')) {
          console.warn(`⚠️ CORS hatası (${primaryUrl}). Fallback URL'e geçiliyor...`);
        }
      }
    }
  }
  
  // Fallback URL'i dene (her zaman production URL)
  try {
    const response = await fetchWithTimeout(fallbackUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        to: options.to,
        subject: options.subject,
        html: options.html,
      }),
    });

    // Content-Type kontrolü - JSON değilse hata
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      // HTML veya başka bir format döndüyse, API endpoint'i yanlış
      const errorText = await response.text().catch(() => "");
      if (import.meta.env.DEV) {
        console.warn(`⚠️ Fallback API JSON döndürmüyor. Response: ${errorText.substring(0, 200)}`);
      }
      return { success: false, error: "E-posta servisi şu an meşgul" };
    }

    const result = await response.json().catch(() => ({}));
    
    if (response.ok && result.success) {
      // Başarılı
      if (import.meta.env.DEV) {
        console.log(`✅ E-posta gönderildi: ${options.to}`);
      }
      return { success: true };
    } else {
      // Response başarısız
      const errorMessage = result.error || `E-posta servisi yanıt vermedi (${response.status})`;
      if (import.meta.env.DEV) {
        console.debug(`ℹ️ ${errorMessage}`);
      }
      return { success: false, error: errorMessage };
    }
  } catch (error: any) {
    // Hata yakalandı
    let errorMessage = error?.message || String(error) || "E-posta gönderilemedi";
    
    // CORS ve bağlantı hatalarını tespit et
    const isCorsError = errorMessage.includes('CORS') || 
                       errorMessage.includes('Access-Control-Allow-Origin') ||
                       errorMessage.includes('ERR_CONNECTION_REFUSED') ||
                       errorMessage.includes('ERR_FAILED');
    const isNetworkError = errorMessage.includes('Failed to fetch') ||
                          errorMessage.includes('NetworkError');
    const isTimeoutError = errorMessage.includes('Timeout');
    
    // Development'ta hataları sessizce logla
    if (import.meta.env.DEV) {
      if (isCorsError || isNetworkError || errorMessage.includes('ERR_CONNECTION_REFUSED')) {
        console.debug(`ℹ️ E-posta sunucusuna erişilemedi (Backend kapalı olabilir). İşlem devam ediyor...`);
      } else {
        console.debug("ℹ️ E-posta gönderilemedi:", errorMessage);
      }
    }
    
    // Kullanıcıya hata gösterme, sessizce başarısız ol
    return { 
      success: false, // Hata olduğunu belirt ama UI'da gösterme
      error: "E-posta servisine erişilemedi"
    };
  }
};

/**
 * Belirli bir URL ile e-posta gönder (helper function)
 */
const sendEmailWithUrl = async (options: EmailOptions, url: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: options.to,
        subject: options.subject,
        html: options.html,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "E-posta gönderilemedi" }));
      console.error("E-posta API hatası:", error);
      return { success: false, error: error.message || "E-posta gönderilemedi" };
    }

    const result = await response.json();
    return { success: true };
  } catch (error: any) {
    console.error("E-posta gönderme hatası:", error);
    return { success: false, error: error.message || "E-posta gönderilemedi" };
  }
};

/**
 * E-posta servisini test et
 * Bu fonksiyon email servisinin çalışıp çalışmadığını test eder
 */
export const testEmailService = async (testEmail: string): Promise<{ success: boolean; error?: string; details?: any }> => {
  if (!testEmail || !testEmail.includes('@')) {
    return {
      success: false,
      error: "Geçerli bir e-posta adresi giriniz",
      details: {
        testEmail,
        timestamp: new Date().toISOString(),
      }
    };
  }

  try {
    const primaryUrl = import.meta.env.VITE_EMAIL_API_URL || import.meta.env.VITE_API_URL;
    const isPrimaryLocalhost = primaryUrl && (primaryUrl.includes('localhost') || primaryUrl.includes('127.0.0.1'));
    
    // Fallback URL - Primary localhost ise production URL kullan
    let fallbackUrl: string;
    if (isPrimaryLocalhost) {
      fallbackUrl = "https://revpad.net/api/send-email";
    } else {
      fallbackUrl = import.meta.env.VITE_EMAIL_API_URL || 
                    import.meta.env.VITE_API_URL?.replace(/\/$/, "") + "/send-email" ||
                    "https://revpad.net/api/send-email";
    }

    console.log("📧 E-posta servisi test ediliyor...");
    console.log("📧 Test e-postası:", testEmail);
    console.log("📧 Primary URL:", primaryUrl || "Yok");
    console.log("📧 Fallback URL:", fallbackUrl);
    console.log("📧 Primary localhost mu?", isPrimaryLocalhost);

    const result = await sendEmail({
      to: testEmail,
      subject: "Revium ERP - E-posta Servisi Test",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Revium ERP Suite</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
            <h2 style="color: #333; margin-top: 0;">✅ E-posta Servisi Testi</h2>
            <p style="color: #666; font-size: 16px;">
              Bu bir test e-postasıdır. Eğer bu e-postayı alıyorsanız, e-posta servisi başarıyla çalışıyor!
            </p>
            <p style="color: #666; font-size: 14px; margin-top: 20px;">
              <strong>Test Zamanı:</strong> ${new Date().toLocaleString('tr-TR')}
            </p>
            <p style="color: #666; font-size: 14px;">
              <strong>API Endpoint:</strong> ${primaryUrl || fallbackUrl}
            </p>
          </div>
        </div>
      `,
    });
    
    if (result.success) {
      console.log("✅ E-posta başarıyla gönderildi! Lütfen e-posta kutunuzu kontrol edin.");
    } else {
      console.error("❌ E-posta gönderilemedi:", result.error || "Bilinmeyen hata");
    }
    
    return {
      success: result.success,
      error: result.error,
      details: {
        testEmail,
        timestamp: new Date().toISOString(),
        primaryUrl: primaryUrl || "Yok",
        fallbackUrl,
        usedUrl: result.success ? (primaryUrl || fallbackUrl) : "Hiçbiri çalışmadı",
      }
    };
  } catch (error: any) {
    const errorMessage = error?.message || String(error) || "E-posta testi başarısız oldu";
    console.error("❌ E-posta testi hatası:", errorMessage);
    return {
      success: false,
      error: errorMessage,
      details: {
        testEmail,
        timestamp: new Date().toISOString(),
        error: String(error),
      }
    };
  }
};

/**
 * Bildirim e-postası gönder
 */
export const sendNotificationEmail = async (
  userEmail: string,
  title: string,
  message: string,
  type: string,
  relatedId?: string | null
): Promise<{ success: boolean; error?: string }> => {
  const appUrl = import.meta.env.VITE_APP_URL || "https://revpad.net";
  let actionUrl = `${appUrl}/tasks`;

  if (relatedId && ["task_assigned", "task_updated", "task_completed", "task_created", "task_approval"].includes(type)) {
    actionUrl = `${appUrl}/tasks?taskId=${relatedId}`;
  } else if (relatedId && ["order_created", "order_updated"].includes(type)) {
    actionUrl = `${appUrl}/orders`;
  } else if (type === "role_changed") {
    actionUrl = `${appUrl}/admin`;
  }

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Revium ERP Suite</h1>
  </div>
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
    <h2 style="color: #333; margin-top: 0; font-size: 20px;">${title}</h2>
    <p style="color: #666; font-size: 16px; margin-bottom: 30px;">${message}</p>
    ${relatedId ? `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${actionUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Detayları Görüntüle</a>
    </div>
    ` : ""}
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
    <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
      Bu e-posta Revium ERP Suite tarafından otomatik olarak gönderilmiştir.<br>
      E-posta bildirimlerini ayarlardan yönetebilirsiniz.
    </p>
  </div>
</body>
</html>
  `.trim();

  const result = await sendEmail({
    to: userEmail,
    subject: `Revium ERP - ${title}`,
    html: emailHtml,
  });
  
  return result;
};


