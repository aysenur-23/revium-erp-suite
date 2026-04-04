/**
 * Google Drive Service - Firebase Authentication Entegrasyonu
 * Firebase Authentication ile giriş yapıldığında Google Access Token kullanır
 * Ayrı OAuth flow'a gerek yok
 */

import { auth } from "@/lib/firebase";
import { GoogleAuthProvider, signInWithPopup, getAdditionalUserInfo } from "firebase/auth";

export type DriveUploadType = "report" | "task" | "general";

export interface DriveUploadOptions {
  fileName?: string;
  type?: DriveUploadType;
  folderId?: string;
  metadata?: Record<string, any>;
  makePublic?: boolean;
}

export interface DriveUploadResponse {
  success: boolean;
  fileId: string;
  webViewLink?: string;
  webContentLink?: string;
}

// Token storage key
const DRIVE_TOKEN_KEY = "revium_drive_token";
const DRIVE_TOKEN_EXPIRY_KEY = "revium_drive_token_expiry";

/**
 * Firebase Authentication'dan Google Access Token al
 */
const getGoogleAccessToken = async (): Promise<string> => {
  if (!auth?.currentUser) {
    throw new Error("Kullanıcı giriş yapmamış. Lütfen önce giriş yapın.");
  }

  const user = auth.currentUser;
  
  // Kullanıcı Google provider ile giriş yapmış mı kontrol et
  const isGoogleProvider = user.providerData.some(
    (provider) => provider.providerId === "google.com"
  );

  if (!isGoogleProvider) {
    // Google provider ile giriş yapılmamış, Google ile bağlan
    const provider = new GoogleAuthProvider();
    provider.addScope("https://www.googleapis.com/auth/drive.file");
    
    try {
      const credential = await signInWithPopup(auth, provider);
      const oauthCredential = GoogleAuthProvider.credentialFromResult(credential);
      
      if (!oauthCredential?.accessToken) {
        throw new Error("Google Drive erişim token'ı alınamadı");
      }

      // Token'ı kaydet
      const expiresIn = 3600; // 1 saat
      saveToken(oauthCredential.accessToken, expiresIn);
      
      return oauthCredential.accessToken;
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        if (import.meta.env.DEV) {
          console.error("Google token alma hatası:", error);
        }
      }
      
      if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === "auth/popup-closed-by-user") {
        throw new Error("Google bağlantısı iptal edildi.");
      }
      
      throw new Error(error instanceof Error ? error.message : "Google token alınamadı");
    }
  }

  // Google provider ile giriş yapılmış, mevcut token'ı kullan
  // Firebase Authentication'dan Google Access Token almak için
  // kullanıcının ID token'ını kullanarak Google OAuth token'ı alabiliriz
  // Ancak bu mümkün değil, bu yüzden kullanıcıyı yeniden Google ile giriş yapmaya yönlendirmeliyiz
  // Ya da stored token'ı kullan
  
  // Stored token yoksa, kullanıcıyı Google ile yeniden giriş yapmaya yönlendir
  const storedToken = getStoredToken();
  if (!storedToken) {
    // Token yok, kullanıcıyı Google ile bağlanmaya yönlendir
    const provider = new GoogleAuthProvider();
    provider.addScope("https://www.googleapis.com/auth/drive.file");
    
    try {
      const credential = await signInWithPopup(auth, provider);
      const oauthCredential = GoogleAuthProvider.credentialFromResult(credential);
      
      if (!oauthCredential?.accessToken) {
        throw new Error("Google Drive erişim token'ı alınamadı");
      }

      // Token'ı kaydet
      const expiresIn = 3600; // 1 saat
      saveToken(oauthCredential.accessToken, expiresIn);
      
      return oauthCredential.accessToken;
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        if (import.meta.env.DEV) {
          console.error("Google token alma hatası:", error);
        }
      }
      
      if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === "auth/popup-closed-by-user") {
        throw new Error("Google bağlantısı iptal edildi.");
      }
      
      throw new Error(error instanceof Error ? error.message : "Google token alınamadı");
    }
  }

  return storedToken;
};

/**
 * Access token'ı localStorage'a kaydet
 */
const saveToken = (token: string, expiresIn: number): void => {
  const expiryTime = Date.now() + expiresIn * 1000;
  localStorage.setItem(DRIVE_TOKEN_KEY, token);
  localStorage.setItem(DRIVE_TOKEN_EXPIRY_KEY, expiryTime.toString());
};

/**
 * Access token'ı localStorage'dan al
 */
const getStoredToken = (): string | null => {
  const token = localStorage.getItem(DRIVE_TOKEN_KEY);
  const expiry = localStorage.getItem(DRIVE_TOKEN_EXPIRY_KEY);

  if (!token || !expiry) {
    return null;
  }

  // Token süresi dolmuş mu kontrol et
  if (Date.now() > parseInt(expiry, 10)) {
    localStorage.removeItem(DRIVE_TOKEN_KEY);
    localStorage.removeItem(DRIVE_TOKEN_EXPIRY_KEY);
    return null;
  }

  return token;
};

/**
 * Access token'ı al veya yenile
 */
const getAccessToken = async (): Promise<string> => {
  // Önce stored token'ı kontrol et
  const storedToken = getStoredToken();
  if (storedToken) {
    return storedToken;
  }

  // Yeni token al (Firebase Authentication'dan)
  return await getGoogleAccessToken();
};

/**
 * Kullanıcıyı Google Drive'a yetkilendir (Google ile giriş)
 */
export const authorizeDrive = async (): Promise<boolean> => {
  try {
    if (!auth) {
      throw new Error("Firebase Authentication başlatılmamış");
    }

    const provider = new GoogleAuthProvider();
    provider.addScope("https://www.googleapis.com/auth/drive.file");
    
    const credential = await signInWithPopup(auth, provider);
    const oauthCredential = GoogleAuthProvider.credentialFromResult(credential);
    
    if (!oauthCredential?.accessToken) {
      throw new Error("Google Drive erişim token'ı alınamadı");
    }

    // Token'ı kaydet
    const expiresIn = 3600; // 1 saat
    saveToken(oauthCredential.accessToken, expiresIn);
    
    return true;
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      if (import.meta.env.DEV) {
        console.error("Drive authorization error:", error);
      }
    }
    
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === "auth/popup-closed-by-user") {
      throw new Error("Google bağlantısı iptal edildi.");
    }
    
    throw new Error(error?.message || "Google Drive yetkilendirmesi başarısız oldu");
  }
};

/**
 * Kullanıcının Drive yetkilendirmesi var mı kontrol et
 */
export const isDriveAuthorized = async (): Promise<boolean> => {
  try {
    // Token var mı kontrol et
    const token = getStoredToken();
    if (token) {
      return true;
    }

    // Kullanıcı Google provider ile giriş yapmış mı kontrol et
    if (auth?.currentUser) {
      const isGoogleProvider = auth.currentUser.providerData.some(
        (provider) => provider.providerId === "google.com"
      );
      return isGoogleProvider;
    }

    return false;
  } catch {
    return false;
  }
};

/**
 * Drive yetkilendirmesini kaldır
 */
export const revokeDriveAccess = async (): Promise<void> => {
  try {
    localStorage.removeItem(DRIVE_TOKEN_KEY);
    localStorage.removeItem(DRIVE_TOKEN_EXPIRY_KEY);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Drive revoke error:", error);
    }
  }
};

/**
 * Dosyayı Google Drive'a yükle
 */
export const uploadFileToDrive = async (
  file: File | Blob,
  options: DriveUploadOptions = {}
): Promise<DriveUploadResponse> => {
  try {
    // Access token al
    const accessToken = await getAccessToken();

    // Dosyayı File'a çevir
    const fileBlob = file instanceof File ? file : new File([file], options.fileName || "file", { type: file.type });

    // Metadata oluştur
    const metadata: Record<string, unknown> = {
      name: options.fileName || fileBlob.name,
      mimeType: fileBlob.type || "application/octet-stream",
    };

    // Klasör ID'si varsa ekle
    if (options.folderId) {
      metadata.parents = [options.folderId];
    } else if (options.type === "task") {
      const taskFolderId = import.meta.env.VITE_GOOGLE_DRIVE_TASKS_FOLDER_ID;
      if (taskFolderId) {
        metadata.parents = [taskFolderId];
      }
    } else if (options.type === "report") {
      const reportFolderId = import.meta.env.VITE_GOOGLE_DRIVE_REPORTS_FOLDER_ID;
      if (reportFolderId) {
        metadata.parents = [reportFolderId];
      }
    }

    // Metadata properties ekle
    if (options.metadata) {
      metadata.properties = options.metadata;
    }

    // Multipart upload için boundary oluştur
    const boundary = "----WebKitFormBoundary" + Math.random().toString(36).substring(2);
    const delimiter = "\r\n--" + boundary + "\r\n";
    const closeDelimiter = "\r\n--" + boundary + "--";

    // Multipart body oluştur (doğru format)
    const metadataPart = `Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`;
    const filePart = `Content-Type: ${fileBlob.type || "application/octet-stream"}\r\n\r\n`;

    // File'ı ArrayBuffer'a çevir
    const fileBuffer = await fileBlob.arrayBuffer();
    const fileUint8 = new Uint8Array(fileBuffer);

    // Multipart body'yi manuel oluştur (string + binary)
    const textEncoder = new TextEncoder();
    const parts: Uint8Array[] = [
      textEncoder.encode(delimiter),
      textEncoder.encode(metadataPart),
      textEncoder.encode(delimiter),
      textEncoder.encode(filePart),
      fileUint8,
      textEncoder.encode(closeDelimiter),
    ];

    // Tüm parçaları birleştir
    const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const part of parts) {
      combined.set(part, offset);
      offset += part.length;
    }

    // Body'yi Blob'a çevir
    const bodyBlob = new Blob([combined], { type: `multipart/related; boundary=${boundary}` });

    // Drive API'ye yükle
    const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,webContentLink", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: bodyBlob,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      let errorMessage = errorData.error?.message || "Dosya yükleme başarısız oldu";

      if (response.status === 401) {
        // Token geçersiz, temizle ve tekrar dene
        localStorage.removeItem(DRIVE_TOKEN_KEY);
        localStorage.removeItem(DRIVE_TOKEN_EXPIRY_KEY);
        errorMessage = "Yetkilendirme hatası. Lütfen tekrar deneyin.";
      } else if (response.status === 403) {
        errorMessage = "Google Drive izni yok. Lütfen yetkilendirme yapın.";
      } else if (response.status === 507) {
        errorMessage = "Google Drive depolama kotası dolmuş.";
      }

      throw new Error(errorMessage);
    }

    const result = await response.json();

    if (!result.id) {
      throw new Error("Dosya yükleme başarısız oldu");
    }

    const fileId = result.id;

    // Public link isteniyorsa izin ver
    if (options.makePublic !== false) {
      try {
        await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            role: "reader",
            type: "anyone",
          }),
        });
      } catch (permError) {
        if (import.meta.env.DEV) {
          console.warn("Public permission eklenemedi:", permError);
        }
        // Public permission hatası dosya yüklemesini engellemez
      }
    }

    // Web view link'i oluştur
    const webViewLink = result.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

    return {
      success: true,
      fileId: fileId,
      webViewLink: webViewLink,
      webContentLink: result.webContentLink,
    };
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Drive upload error:", error);
    }

    let errorMessage = "Google Drive yüklemesi başarısız oldu";

    if (error?.message) {
      errorMessage = error.message;
    } else if (typeof error === "string") {
      errorMessage = error;
    }

    // Özel hata mesajları
    if (errorMessage.includes("auth") || errorMessage.includes("unauthorized") || errorMessage.includes("401")) {
      errorMessage = "Google Drive yetkilendirmesi gerekli. Lütfen Google ile giriş yapın.";
    } else if (errorMessage.includes("quota") || errorMessage.includes("storage") || errorMessage.includes("507")) {
      errorMessage = "Google Drive depolama kotası dolmuş. Lütfen depolama alanını kontrol edin.";
    } else if (errorMessage.includes("403")) {
      errorMessage = "Google Drive izni yok. Lütfen Google ile giriş yapın.";
    }

    throw new Error(errorMessage);
  }
};

/**
 * Drive'dan dosya sil
 */
export const deleteDriveFile = async (fileId: string): Promise<void> => {
  if (!fileId || fileId.trim() === "") {
    throw new Error("Geçerli bir Drive dosya ID'si gerekli");
  }

  try {
    // Access token al
    const accessToken = await getAccessToken();

    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      let errorMessage = errorData.error?.message || "Drive dosyası silinemedi";

      if (response.status === 401) {
        // Token geçersiz, temizle
        localStorage.removeItem(DRIVE_TOKEN_KEY);
        localStorage.removeItem(DRIVE_TOKEN_EXPIRY_KEY);
        errorMessage = "Yetkilendirme hatası. Lütfen tekrar deneyin.";
      }

      throw new Error(errorMessage);
    }
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      if (import.meta.env.DEV) {
        console.error("Drive delete error:", error);
      }
    }

    let errorMessage = "Drive dosyası silinemedi";
    if (error instanceof Error && error.message) {
      errorMessage = error.message;
    } else if (typeof error === "string") {
      errorMessage = error;
    }

    throw new Error(errorMessage);
  }
};

/**
 * OAuth URL al (eski API uyumluluğu için)
 * @deprecated Artık Firebase Authentication kullanılıyor
 */
export const getDriveAuthUrl = async (): Promise<string> => {
  // Firebase Authentication ile Google giriş yap
  await authorizeDrive();
  return window.location.href;
};
