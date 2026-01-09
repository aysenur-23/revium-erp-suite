/**
 * Authentication Configuration
 * Merkezi auth ayarları - tüm auth ile ilgili flag'ler burada
 */

/**
 * Email verification flag - Email doğrulaması zorunlu mu?
 * true: Kullanıcılar email doğrulamadan giriş yapamaz
 * false: Email doğrulaması opsiyonel, kullanıcılar doğrulamadan giriş yapabilir
 */
export const REQUIRE_EMAIL_VERIFICATION = true;

/**
 * Silinmiş hesapların aynı email ile yeniden kayıt olmasına izin ver
 * true: Silinmiş hesaplar aynı email ile tekrar kayıt olabilir
 * false: Silinmiş hesaplar aynı email ile kayıt olamaz
 */
export const ALLOW_DELETED_ACCOUNT_REREGISTRATION = true;

/**
 * Google ile kayıt olanlara email doğrulaması zorunlu mu?
 * true: Google kullanıcıları için de email doğrulaması gerekli (Google zaten doğruluyor)
 * false: Google kullanıcıları için email doğrulaması atlanır
 */
export const REQUIRE_GOOGLE_EMAIL_VERIFICATION = false;

/**
 * Yeni kullanıcılara otomatik doğrulama emaili gönder
 */
export const AUTO_SEND_VERIFICATION_EMAIL = true;

/**
 * Giriş denemelerinde email doğrulanmamışsa yeni email gönder
 */
export const RESEND_VERIFICATION_ON_LOGIN = true;

/**
 * Email doğrulama bağlantısı süresi (saniye)
 * Firebase varsayılanı: 1 saat
 */
export const EMAIL_VERIFICATION_EXPIRY = 3600;
