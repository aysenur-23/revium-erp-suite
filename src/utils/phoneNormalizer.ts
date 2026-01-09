/**
 * Telefon numarası normalizasyon fonksiyonu
 * Türkiye telefon numaralarını standart formata çevirir: +905551234567
 */

/**
 * Telefon numarasını normalize eder
 * @param phone - Normalize edilecek telefon numarası
 * @returns Normalize edilmiş telefon numarası (örn: +905551234567) veya null
 */
export const normalizePhone = (phone: string | null | undefined): string | null => {
  if (!phone) return null;
  
  // Sadece rakamları al
  const digits = phone.replace(/\D/g, '');
  
  // Boşsa null döndür
  if (digits.length === 0) return null;
  
  // Türkiye telefon numarası kontrolü
  // 10 haneli (5XX XXX XX XX) veya 11 haneli (0 5XX XXX XX XX) veya 13 haneli (+90 5XX XXX XX XX)
  let normalized = digits;
  
  // 0 ile başlıyorsa kaldır (0 555 123 4567 -> 5551234567)
  if (normalized.startsWith('0')) {
    normalized = normalized.substring(1);
  }
  
  // +90 ile başlıyorsa kaldır (+90 555 123 4567 -> 5551234567)
  if (normalized.startsWith('90') && normalized.length >= 12) {
    normalized = normalized.substring(2);
  }
  
  // 10 haneli olmalı (5XX XXX XX XX)
  if (normalized.length === 10) {
    // Türkiye cep telefonu kontrolü (5 ile başlamalı)
    if (normalized.startsWith('5')) {
      return `+90${normalized}`;
    }
  }
  
  // Eğer zaten +90 ile başlıyorsa ve doğru formattaysa olduğu gibi döndür
  if (phone.trim().startsWith('+90') && digits.length >= 12) {
    const withoutPlus = digits.substring(2); // +90'yı kaldır
    if (withoutPlus.length === 10 && withoutPlus.startsWith('5')) {
      return `+90${withoutPlus}`;
    }
  }
  
  // Geçersiz format ise null döndür
  return null;
};

/**
 * Telefon numarasını görüntüleme formatına çevirir
 * @param phone - Normalize edilmiş telefon numarası
 * @returns Görüntüleme formatı (örn: +90 555 123 45 67)
 */
export const formatPhoneForDisplay = (phone: string | null | undefined): string => {
  if (!phone) return '';
  
  // Sadece rakamları al
  const digits = phone.replace(/\D/g, '');
  
  // +90 ile başlıyorsa (normalize edilmiş format: +905551234567)
  if (phone.startsWith('+90') && digits.length === 12) {
    const number = digits.substring(2); // 90'yı kaldır
    return `+90 ${number.substring(0, 3)} ${number.substring(3, 6)} ${number.substring(6, 8)} ${number.substring(8, 10)}`;
  }
  
  // 90 ile başlıyorsa (sadece rakamlar: 905551234567)
  if (digits.startsWith('90') && digits.length === 12) {
    const number = digits.substring(2); // 90'yı kaldır
    return `+90 ${number.substring(0, 3)} ${number.substring(3, 6)} ${number.substring(6, 8)} ${number.substring(8, 10)}`;
  }
  
  // 10 haneli ise (5XX XXX XX XX)
  if (digits.length === 10 && digits.startsWith('5')) {
    return `+90 ${digits.substring(0, 3)} ${digits.substring(3, 6)} ${digits.substring(6, 8)} ${digits.substring(8, 10)}`;
  }
  
  // 11 haneli ve 0 ile başlıyorsa (0537 709 98 43)
  if (digits.length === 11 && digits.startsWith('0')) {
    const number = digits.substring(1); // 0'ı kaldır
    return `+90 ${number.substring(0, 3)} ${number.substring(3, 6)} ${number.substring(6, 8)} ${number.substring(8, 10)}`;
  }
  
  // Diğer durumlarda olduğu gibi döndür
  return phone;
};

/**
 * Telefon numarasını tel: linki için formatlar (sadece rakamlar, +90 ile başlar)
 * @param phone - Telefon numarası
 * @returns tel: linki için format (örn: +905551234567)
 */
export const formatPhoneForTelLink = (phone: string | null | undefined): string => {
  if (!phone) return '';
  
  // Normalize edilmiş telefon numarasını al
  const normalized = normalizePhone(phone);
  if (!normalized) return phone; // Normalize edilemezse olduğu gibi döndür
  
  return normalized;
};

/**
 * Telefon numarasını gerçek zamanlı olarak formatlar (input için)
 * Kullanıcı yazarken +90 5xx xxx xxxx formatında gösterir
 * @param value - Input değeri
 * @returns Formatlanmış telefon numarası
 */
export const formatPhoneInput = (value: string): string => {
  // Sadece rakamları al
  const digits = value.replace(/\D/g, '');
  
  // Boşsa boş döndür
  if (digits.length === 0) return '';
  
  // +90 ile başlamalı
  let formatted = '+90 ';
  let number = digits;
  
  // 90 ile başlıyorsa (ülke kodu), 90'yı kaldır
  if (digits.startsWith('90') && digits.length > 2) {
    number = digits.substring(2);
  } else if (digits.startsWith('0') && digits.length > 1) {
    // 0 ile başlıyorsa kaldır
    number = digits.substring(1);
  }
  
  // 5 ile başlamalı (Türkiye cep telefonu)
  // Eğer 5 ile başlamıyorsa ve rakam varsa, sadece +90 5 göster
  if (number.length > 0 && !number.startsWith('5')) {
    return '+90 5';
  }
  
  // Maksimum 10 rakam (5xx xxx xx xx)
  const maxDigits = 10;
  const limitedNumber = number.substring(0, maxDigits);
  
  // Formatla: +90 5xx xxx xxxx
  if (limitedNumber.length <= 3) {
    // İlk 3 rakam (5xx)
    formatted += limitedNumber;
  } else if (limitedNumber.length <= 6) {
    // İlk 6 rakam (5xx xxx)
    formatted += `${limitedNumber.substring(0, 3)} ${limitedNumber.substring(3)}`;
  } else if (limitedNumber.length <= 8) {
    // İlk 8 rakam (5xx xxx xx)
    formatted += `${limitedNumber.substring(0, 3)} ${limitedNumber.substring(3, 6)} ${limitedNumber.substring(6)}`;
  } else {
    // Tüm rakamlar (5xx xxx xx xx)
    formatted += `${limitedNumber.substring(0, 3)} ${limitedNumber.substring(3, 6)} ${limitedNumber.substring(6, 8)} ${limitedNumber.substring(8, 10)}`;
  }
  
  return formatted;
};

