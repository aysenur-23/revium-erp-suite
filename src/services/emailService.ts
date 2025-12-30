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
  
  // Production modunda environment variable yoksa direkt fallback URL kullan
  // Development modunda environment variable yoksa localhost kullan
  const isProduction = import.meta.env.PROD;
  const fallbackUrl = isProduction ? "https://revpad.net/api/send-email/" : null;
  
  // Eğer primary URL yoksa
  if (!primaryUrl) {
    if (isProduction) {
      // Production'da environment variable yoksa fallback URL'i primary olarak kullan
      primaryUrl = fallbackUrl!;
    } else {
      // Development'ta localhost backend'i kullan
      primaryUrl = "http://localhost:3000/api/send-email/";
    }
  } else {
    // Primary URL var - localhost kontrolü yap
    const isLocalhost = primaryUrl.includes('localhost') || primaryUrl.includes('127.0.0.1');
    
    if (isLocalhost) {
      // Localhost URL - sadece development'ta kullan
      if (!isProduction) {
        primaryUrl = "http://localhost:3000/api/send-email/";
      } else {
        // Production'da localhost URL kullanılamaz - fallback'e geç
        primaryUrl = fallbackUrl!;
      }
    } else {
      // Production URL - formatını düzelt
      if (!primaryUrl.endsWith('/send-email') && !primaryUrl.endsWith('/send-email/')) {
        // URL'in sonuna /send-email/ ekle (trailing slash ile)
        primaryUrl = primaryUrl.replace(/\/$/, "") + "/send-email/";
      } else if (primaryUrl.endsWith('/send-email') && !primaryUrl.endsWith('/send-email/')) {
        // Trailing slash ekle
        primaryUrl = primaryUrl + "/";
      }
    }
  }
  
  // Timeout ile fetch (8 saniye - email gönderimi biraz daha uzun sürebilir)
  const fetchWithTimeout = async (url: string, options: RequestInit, timeout = 8000): Promise<Response> => {
    try {
      // Önce OPTIONS preflight request'i gönder (CORS için)
      // Ama eğer bu başarısız olursa direkt POST'u dene (bazı sunucular preflight'a gerek duymaz)
      const response = await Promise.race([
        fetch(url, {
          ...options,
          // CORS için gerekli header'lar
          headers: {
            ...options.headers,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          // CORS hatalarını handle et
          mode: 'cors',
          credentials: 'omit', // CORS için credentials gönderme
        }),
        new Promise<Response>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), timeout)
        ),
      ]);
      return response;
    } catch (error) {
      // Network hatalarını handle et
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('CORS') || 
          errorMsg.includes('Failed to fetch') || 
          errorMsg.includes('ERR_') ||
          errorMsg.includes('Redirect is not allowed') ||
          errorMsg.includes('preflight')) {
        // Network/CORS hatası - normal bir durum (email servisi çalışmıyor olabilir)
        return Promise.reject(new Error("NetworkError"));
      }
      return Promise.reject(error);
    }
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
            // Başarılı
            return { success: true };
          } else {
            // API başarısız döndü - fallback'e geç
            throw new Error(result.error || "Email API başarısız");
          }
        } else {
          // JSON değilse, endpoint yanlış - fallback'e geç
          throw new Error("Email API JSON döndürmüyor");
        }
      } else {
        // Response başarısız - fallback'e geç
        const errorText = await response.text().catch(() => "");
        throw new Error(`Email API hatası (${response.status}): ${errorText.substring(0, 100)}`);
      }
    } catch (error: unknown) {
      // Primary URL bağlantısı başarısız, fallback'e geç
      const errorMsg = error instanceof Error ? error.message : String(error);
      // Network hataları normal (backend çalışmıyor veya CORS sorunu), fallback'e geç
      // CORS hatalarını sessizce handle et
      if (!errorMsg.includes('NetworkError') && !errorMsg.includes('ERR_') && !errorMsg.includes('CORS')) {
        // Network/CORS hatası değilse, gerçek bir sorun olabilir - log göster
        if (import.meta.env.DEV) {
          console.debug(`Primary email API hatası: ${errorMsg}`);
        }
      }
    }
  }
  
  // Fallback URL'i dene (sadece production modunda ve fallback URL varsa)
  if (fallbackUrl) {
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
        // Email hataları normal, sessizce handle et
        return { success: false, error: "E-posta servisi şu an meşgul" };
      }

      const result = await response.json().catch(() => ({}));
      
      if (response.ok && result.success) {
        // Başarılı
        return { success: true };
      } else {
        // Response başarısız
        const errorMessage = result.error || `E-posta servisi yanıt vermedi (${response.status})`;
        return { success: false, error: errorMessage };
      }
    } catch (fallbackError: unknown) {
      // Fallback de başarısız oldu
      const fallbackErrorMsg = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
      if (isProduction) {
        return {
          success: false,
          error: "E-posta servisine erişilemedi. Lütfen daha sonra tekrar deneyin veya sistem yöneticisiyle iletişime geçin."
        };
      } else {
        return {
          success: false,
          error: "E-posta servisine erişilemedi. Backend server'ın çalıştığından emin olun (http://localhost:3000)"
        };
      }
    }
  } else {
    // Development modunda ve localhost başarısız oldu - hata döndür
    return {
      success: false,
      error: "E-posta servisine erişilemedi. Backend server'ın çalıştığından emin olun (http://localhost:3000)"
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
      if (import.meta.env.DEV) {
        if (import.meta.env.DEV) {
          console.error("E-posta API hatası:", error);
        }
      }
      return { success: false, error: error.message || "E-posta gönderilemedi" };
    }

    const result = await response.json();
    return { success: true };
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      if (import.meta.env.DEV) {
        console.error("E-posta gönderme hatası:", error);
      }
    }
    return { success: false, error: error instanceof Error ? error.message : "E-posta gönderilemedi" };
  }
};

/**
 * E-posta servisini test et
 * Bu fonksiyon email servisinin çalışıp çalışmadığını test eder
 */
export const testEmailService = async (testEmail: string): Promise<{ success: boolean; error?: string; details?: Record<string, unknown> }> => {
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

    if (import.meta.env.DEV) {
      console.log("📧 E-posta servisi test ediliyor...");
      console.log("📧 Test e-postası:", testEmail);
      console.log("📧 Primary URL:", primaryUrl || "Yok");
      console.log("📧 Fallback URL:", fallbackUrl);
      console.log("📧 Primary localhost mu?", isPrimaryLocalhost);
    }

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
      if (import.meta.env.DEV) {
        console.log("✅ E-posta başarıyla gönderildi! Lütfen e-posta kutunuzu kontrol edin.");
      }
    } else {
      if (import.meta.env.DEV) {
        console.error("❌ E-posta gönderilemedi:", result.error || "Bilinmeyen hata");
      }
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : (String(error) || "E-posta testi başarısız oldu");
    if (import.meta.env.DEV) {
      if (import.meta.env.DEV) {
        console.error("❌ E-posta testi hatası:", errorMessage);
      }
    }
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
  relatedId?: string | null,
  metadata?: Record<string, unknown> | null
): Promise<{ success: boolean; error?: string }> => {
  const appUrl = import.meta.env.VITE_APP_URL || "https://revpad.net";
  let actionUrl = `${appUrl}/tasks`;

  // Talep bildirimleri kontrolü (öncelikli - diğer kontrollerden önce)
  if (type === "system" && metadata && (metadata.requestType || message?.includes('talep'))) {
    actionUrl = `${appUrl}/requests`;
  } else if (relatedId && ["task_assigned", "task_updated", "task_completed", "task_created", "task_approval"].includes(type)) {
    actionUrl = `${appUrl}/tasks?taskId=${relatedId}`;
  } else if (relatedId && ["order_created", "order_updated"].includes(type)) {
    actionUrl = `${appUrl}/orders`;
  } else if (type === "role_changed") {
    actionUrl = `${appUrl}/admin`;
  }

  // Metadata'dan ek bilgileri çıkar
  const formatDate = (date: unknown): string => {
    if (!date) return "";
    try {
      // Firestore Timestamp kontrolü
      if (date && typeof date === 'object' && 'seconds' in date && 'nanoseconds' in date) {
        // Firestore Timestamp objesi
        const timestamp = date as { seconds: number; nanoseconds?: number };
        const dateObj = new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000);
        return dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      }
      if (date instanceof Date) {
        return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      }
      if (typeof date === 'string') {
        // Timestamp string formatını kontrol et (Timestamp(seconds=..., nanoseconds=...) gibi)
        if (date.includes('Timestamp(') || date.includes('seconds=')) {
          // Timestamp string'ini parse et
          const secondsMatch = date.match(/seconds=(\d+)/);
          if (secondsMatch) {
            const seconds = parseInt(secondsMatch[1], 10);
            const dateObj = new Date(seconds * 1000);
            return dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
          }
        }
        return new Date(date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      }
      // Timestamp objesi gibi görünüyorsa (seconds ve nanoseconds property'leri varsa)
      if (typeof date === 'object' && date !== null && 'seconds' in date) {
        const timestamp = date as { seconds: number; nanoseconds?: number };
        const dateObj = new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000);
        return dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      }
      // Diğer durumlarda string'e çevir ama Timestamp string'ini parse et
      const dateStr = String(date);
      if (dateStr.includes('Timestamp(') || dateStr.includes('seconds=')) {
        const secondsMatch = dateStr.match(/seconds=(\d+)/);
        if (secondsMatch) {
          const seconds = parseInt(secondsMatch[1], 10);
          const dateObj = new Date(seconds * 1000);
          return dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        }
      }
      // Timestamp formatı değilse, boş string döndür (gösterme)
      return "";
    } catch {
      // Hata durumunda boş string döndür (Timestamp gösterilmesin)
      return "";
    }
  };

  // Durum etiketleri
  const getStatusLabel = (status: unknown): string => {
    if (!status || typeof status !== 'string') return String(status || '');
    const statusMap: Record<string, string> = {
      pending: "Beklemede",
      in_progress: "Devam Ediyor",
      completed: "Tamamlandı",
      cancelled: "İptal Edildi",
      draft: "Taslak",
      confirmed: "Onaylandı",
      in_production: "Üretimde",
      quality_check: "Kalite Kontrol",
      shipped: "Kargoda",
      delivered: "Teslim Edildi",
      on_hold: "Beklemede",
    };
    return statusMap[status] || status;
  };

  // Ek bilgi bölümü oluştur
  let additionalInfo = "";
  if (metadata) {
    const infoItems: string[] = [];
    
    // Talep detayları (sistem bildirimi ve requestType varsa)
    if (type === "system" && metadata.requestType) {
      const typeLabels: Record<string, string> = {
        leave: "İzin",
        purchase: "Satın Alma",
        advance: "Avans",
        expense: "Gider",
        other: "Diğer",
      };
      const requestTypeLabel = typeLabels[metadata.requestType as string] || metadata.requestType;
      
      infoItems.push(`<div style="background: #fff; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 15px 0;">
        <h3 style="color: #333; margin-top: 0; margin-bottom: 15px; font-size: 18px;">Talep Detayları</h3>
        <div style="margin-bottom: 12px;"><strong style="color: #333;">Talep Tipi:</strong> <span style="color: #666;">${requestTypeLabel}</span></div>
        ${metadata.requestTitle ? `<div style="margin-bottom: 12px;"><strong style="color: #333;">Talep Başlığı:</strong> <span style="color: #666;">${metadata.requestTitle}</span></div>` : ''}
        ${metadata.requestDescription ? `<div style="margin-bottom: 12px;"><strong style="color: #333;">Açıklama:</strong><br><span style="color: #666; line-height: 1.6;">${metadata.requestDescription}</span></div>` : ''}
        ${metadata.amount ? `<div style="margin-bottom: 12px;"><strong style="color: #333;">Tutar:</strong> <span style="color: #666;">${metadata.amount} ${metadata.currency || 'TL'}</span></div>` : ''}
        ${metadata.creatorName ? `<div style="margin-bottom: 12px;"><strong style="color: #333;">Talep Eden:</strong> <span style="color: #666;">${metadata.creatorName}</span></div>` : ''}
        ${metadata.createdAt ? `<div style="margin-bottom: 0;"><strong style="color: #333;">Talep Tarihi:</strong> <span style="color: #666;">${formatDate(metadata.createdAt)}</span></div>` : ''}
      </div>`);
    }
    
    // Durum değişikliği bilgisi
    if (metadata.oldStatus && metadata.newStatus) {
      const oldStatusLabel = getStatusLabel(metadata.oldStatus);
      const newStatusLabel = getStatusLabel(metadata.newStatus);
      infoItems.push(`<div style="background: #fff; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea; margin: 15px 0;"><strong style="color: #333;">Durum Değişikliği:</strong><br><span style="color: #666;">${oldStatusLabel} → ${newStatusLabel}</span></div>`);
    }
    
    // Tarih bilgisi
    if (metadata.updatedAt || metadata.createdAt) {
      const dateStr = formatDate(metadata.updatedAt || metadata.createdAt);
      if (dateStr) {
        infoItems.push(`<div style="background: #fff; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981; margin: 15px 0;"><strong style="color: #333;">İşlem Zamanı:</strong><br><span style="color: #666;">${dateStr}</span></div>`);
      }
    }
    
    // Öncelik bilgisi
    if (metadata.priority) {
      const { getPriorityLabel } = await import("@/utils/priority");
      const priorityLabel = getPriorityLabel(metadata.priority as number);
      infoItems.push(`<div style="background: #fff; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 15px 0;"><strong style="color: #333;">Öncelik:</strong><br><span style="color: #666;">${priorityLabel}</span></div>`);
    }
    
    // Bitiş tarihi
    if (metadata.dueDate) {
      const dueDateStr = formatDate(metadata.dueDate);
      if (dueDateStr) {
        infoItems.push(`<div style="background: #fff; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444; margin: 15px 0;"><strong style="color: #333;">Bitiş Tarihi:</strong><br><span style="color: #666;">${dueDateStr}</span></div>`);
      }
    }
    
    if (infoItems.length > 0) {
      additionalInfo = `<div style="margin: 20px 0;">${infoItems.join('')}</div>`;
    }
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
    <h2 style="color: #333; margin-top: 0; font-size: 20px; margin-bottom: 15px;">${title}</h2>
    <div style="background: #fff; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e5e7eb;">
      <p style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0;">${message}</p>
    </div>
    ${additionalInfo}
    ${relatedId ? `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${actionUrl}" style="display: inline-block; background: #667eea; color: white; padding: 14px 35px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3); transition: all 0.3s;">Detayları Görüntüle</a>
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

/**
 * Kayıt hoş geldin e-postası gönder
 */
export const sendWelcomeEmail = async (
  userEmail: string,
  fullName: string
): Promise<{ success: boolean; error?: string }> => {
  const appUrl = import.meta.env.VITE_APP_URL || "https://revpad.net";
  const registrationTime = new Date().toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hoş Geldiniz - Revium ERP Suite</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Revium ERP Suite</h1>
  </div>
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
    <h2 style="color: #333; margin-top: 0; font-size: 20px; margin-bottom: 15px;">Hoş Geldiniz!</h2>
    <div style="background: #fff; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e5e7eb;">
      <p style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0 0 15px 0;">
        Merhaba <strong>${fullName}</strong>,
      </p>
      <p style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0 0 15px 0;">
        Revium ERP Suite'e kaydolduğunuz için teşekkür ederiz! Hesabınız başarıyla oluşturuldu.
      </p>
      <p style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0 0 15px 0;">
        Hesabınızı aktifleştirmek için lütfen e-posta adresinize gönderilen doğrulama bağlantısına tıklayın. E-posta doğrulaması yapılmadan bazı özellikleri kullanamayabilirsiniz.
      </p>
      <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
        <strong style="color: #333;">Kayıt Bilgileri:</strong><br>
        <span style="color: #666;">E-posta: ${userEmail}</span><br>
        <span style="color: #666;">Kayıt Zamanı: ${registrationTime}</span>
      </div>
      <p style="color: #374151; font-size: 16px; line-height: 1.8; margin: 15px 0 0 0;">
        E-posta doğrulamasından sonra sisteme giriş yapabilir ve tüm özellikleri kullanmaya başlayabilirsiniz.
      </p>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${appUrl}/auth" style="display: inline-block; background: #667eea; color: white; padding: 14px 35px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3); transition: all 0.3s;">Giriş Yap</a>
    </div>
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
    <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
      Bu e-posta Revium ERP Suite tarafından otomatik olarak gönderilmiştir.<br>
      Eğer bu hesabı siz oluşturmadıysanız, lütfen bu e-postayı yok sayın.
    </p>
  </div>
</body>
</html>
  `.trim();

  const result = await sendEmail({
    to: userEmail,
    subject: "Hoş Geldiniz - Revium ERP Suite",
    html: emailHtml,
  });
  
  return result;
};

/**
 * Şifre sıfırlama e-postası gönder (özel şablon)
 */
export const sendPasswordResetEmailCustom = async (
  userEmail: string,
  resetLink: string
): Promise<{ success: boolean; error?: string }> => {
  const appUrl = import.meta.env.VITE_APP_URL || "https://revpad.net";
  const requestTime = new Date().toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const emailHtml = `
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
        Merhaba,
      </p>
      <p style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0 0 15px 0;">
        <strong>${userEmail}</strong> e-posta adresi için şifre sıfırlama talebi aldık. Eğer bu talebi siz yapmadıysanız, bu e-postayı yok sayabilirsiniz.
      </p>
      <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
        <strong style="color: #333;">⚠️ Güvenlik Uyarısı:</strong><br>
        <span style="color: #666;">Bu bağlantı 1 saat içinde geçerlidir. Bağlantıyı yalnızca siz kullanmalısınız. Başka biriyle paylaşmayın.</span>
      </div>
      <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
        <strong style="color: #333;">İstek Bilgileri:</strong><br>
        <span style="color: #666;">E-posta: ${userEmail}</span><br>
        <span style="color: #666;">İstek Zamanı: ${requestTime}</span>
      </div>
      <p style="color: #374151; font-size: 16px; line-height: 1.8; margin: 15px 0 0 0;">
        Şifrenizi sıfırlamak için aşağıdaki butona tıklayın:
      </p>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetLink}" style="display: inline-block; background: #667eea; color: white; padding: 14px 35px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3); transition: all 0.3s;">Şifremi Sıfırla</a>
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
  `.trim();

  const result = await sendEmail({
    to: userEmail,
    subject: "Şifre Sıfırlama - Revium ERP Suite",
    html: emailHtml,
  });
  
  return result;
};


