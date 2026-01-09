import jsPDF, { jsPDFOptions } from "jspdf";
import autoTable, { CellHookData as AutoTableCellHookData } from "jspdf-autotable";
import { REV_LOGO_DATA_URI } from "@/assets/rev-logo-base64";
import { ROBOTO_REGULAR_BASE64, ROBOTO_BOLD_BASE64 } from "@/assets/fonts/roboto-base64";

// Sabit şirket bilgileri - cache'lenmiş, değişmeyen değerler
const COMPANY_INFO = {
  name: "Revium Ltd. Şti.",
  address: "Fevzi Cakmak Mah. Milenyum Cad. No:81",
  city: "Karatay/KONYA",
  email: "info@reviumtech.com",
  website: "www.reviumtech.com",
  phone: "+90 (551) 829-1613",
  fullAddress: "Fevzi Cakmak Mah. Milenyum Cad. No:81, Karatay/KONYA",
  contactInfo: "info@reviumtech.com | www.reviumtech.com | +90 (551) 829-1613",
  headerAddress: "Fevzi Cakmak Mah. Milenyum Cad. No:81",
} as const;

// PDF sabit değerleri - cache'lenmiş
const PDF_CONSTANTS = {
  margin: 50,
  headerHeight: 120, // Header içeriği için yeterli yükseklik
  footerHeight: 50,
  logoSize: 40, // 50 → 40 (daha küçük)
  footerLogoSize: 28, // 32 → 28 (daha küçük)
  // Profesyonel renk paleti - modern ve minimal
  primaryColor: [30, 58, 138] as [number, number, number], // Koyu mavi - profesyonel
  mutedColor: [71, 85, 105] as [number, number, number], // Koyu gri-mavi
  accentColor: [59, 130, 246] as [number, number, number], // Açık mavi vurgu
  successColor: [16, 185, 129] as [number, number, number], // Yeşil - başarı
  warningColor: [245, 158, 11] as [number, number, number], // Turuncu - uyarı
  errorColor: [239, 68, 68] as [number, number, number], // Kırmızı - hata
  // Kart boyutları ve spacing - Web sayfasındaki değerler (küçültülmüş)
  cardHeight: 95, // 120 → 95 (daha kompakt)
  cardGap: 12, // 16 → 12 (daha az boşluk)
  cardPadding: 14, // 18 → 14 (daha kompakt)
  cardHeaderPadding: 10, // 12 → 10 (daha az padding)
  // Tablo başlık boyutları
  tableHeaderHeight: 32, // 36 → 32 (daha kompakt)
  tableHeaderPadding: 8, // 10 → 8
  tableHeaderSpacing: 24, // 30 → 24
  // Section spacing - Web sayfasındaki gibi (space-y-6 = 24px)
  sectionSpacing: 20, // 24 → 20 (daha kompakt)
  tableSpacing: 20, // 24 → 20 (daha kompakt)
  // Font boyutları - Web sayfasındaki değerler (küçültülmüş)
  fontSizeCardTitle: 12, // 14 → 12 (daha küçük)
  fontSizeCardValue: 24, // 30 → 24 (daha küçük)
  fontSizeCardDescription: 11, // 12 → 11 (daha küçük)
  fontSizeTableHeader: 16, // 18 → 16 (daha küçük)
  fontSizeTableBody: 11,
  fontSizeTableHeaderText: 12,
} as const;

// Profesyonel renk paleti - modern, minimal ve sofistike
const TAILWIND_COLORS = {
  // Profesyonel kart renkleri - nötr ve minimal
  cardBackground: [248, 250, 252] as [number, number, number], // Çok açık gri - kart arka planı
  cardBorder: [226, 232, 240] as [number, number, number], // Açık gri - kart border
  cardText: [71, 85, 105] as [number, number, number], // Koyu gri-mavi - kart metin
  // Primary kart (vurgulu) - Web sayfasındaki renkler
  primaryCardBg: [255, 255, 255] as [number, number, number], // Beyaz (rgba(221, 83, 53, 0.05) overlay ile)
  primaryCardBorder: [221, 83, 53] as [number, number, number], // Kırmızı-turuncu (web: border-[rgb(221,83,53)])
  primaryCardValue: [221, 83, 53] as [number, number, number], // Kırmızı-turuncu (text-primary)
  // Success kart (yeşil tonları) - Web sayfasındaki renkler
  successCardBg: [240, 253, 244] as [number, number, number], // Çok açık yeşil (web: bg-[rgb(240,253,244)])
  successCardBorder: [187, 247, 208] as [number, number, number], // Açık yeşil (web: border-[rgb(187,247,208)])
  successCardValue: [22, 163, 74] as [number, number, number], // Yeşil (web: text-green-600)
  // Info kart (mavi tonları) - Web sayfasındaki renkler
  infoCardBg: [239, 246, 255] as [number, number, number], // Çok açık mavi (web: bg-[rgb(239,246,255)])
  infoCardBorder: [191, 219, 254] as [number, number, number], // Açık mavi (web: border-[rgb(191,219,254)])
  infoCardValue: [37, 99, 235] as [number, number, number], // Koyu mavi (web: text-blue-600)
  // Warning kart (turuncu tonları - daha yumuşak)
  warningCardBg: [255, 251, 235] as [number, number, number], // Çok açık turuncu
  warningCardBorder: [253, 230, 138] as [number, number, number], // Açık turuncu
  warningCardValue: [217, 119, 6] as [number, number, number], // Koyu turuncu
  // Error kart (kırmızı tonları - daha yumuşak)
  errorCardBg: [254, 242, 242] as [number, number, number], // Çok açık kırmızı
  errorCardBorder: [254, 202, 202] as [number, number, number], // Açık kırmızı
  errorCardValue: [220, 38, 38] as [number, number, number], // Koyu kırmızı
  // Gray palette - profesyonel tonlar
  gray50: [249, 250, 251] as [number, number, number],
  gray100: [243, 244, 246] as [number, number, number],
  gray200: [229, 231, 235] as [number, number, number],
  gray300: [209, 213, 219] as [number, number, number],
  gray500: [107, 114, 128] as [number, number, number],
  gray600: [71, 85, 105] as [number, number, number], // Güncellenmiş - daha profesyonel
  gray700: [51, 65, 85] as [number, number, number], // Yeni - orta koyu
  gray800: [30, 41, 59] as [number, number, number], // Güncellenmiş - daha koyu
  gray900: [15, 23, 42] as [number, number, number], // Güncellenmiş - çok koyu
  // White
  white: [255, 255, 255] as [number, number, number],
  // Eski renkler - geriye dönük uyumluluk için (kullanılmıyor ama referans için)
  green50: [240, 253, 250] as [number, number, number],
  green200: [167, 243, 208] as [number, number, number],
  green500: [16, 185, 129] as [number, number, number],
  green600: [5, 150, 105] as [number, number, number],
  blue50: [239, 246, 255] as [number, number, number],
  blue200: [191, 219, 254] as [number, number, number],
  blue500: [59, 130, 246] as [number, number, number],
  blue600: [37, 99, 235] as [number, number, number],
  red50: [254, 242, 242] as [number, number, number],
  red200: [254, 202, 202] as [number, number, number],
  red500: [239, 68, 68] as [number, number, number],
  red600: [220, 38, 38] as [number, number, number],
  emerald50: [240, 253, 250] as [number, number, number],
  emerald200: [167, 243, 208] as [number, number, number],
  emerald500: [16, 185, 129] as [number, number, number],
  emerald600: [5, 150, 105] as [number, number, number],
  purple50: [250, 245, 255] as [number, number, number],
  purple200: [233, 213, 255] as [number, number, number],
  purple500: [168, 85, 247] as [number, number, number],
  purple600: [147, 51, 234] as [number, number, number],
} as const;

// PDF Template Layout - Sabit alanlar ve dinamik içerik alanları
interface PDFTemplateLayout {
  // Sabit alanlar (her sayfada aynı)
  background: {
    startY: number;
    endY: number;
  };
  header: {
    startY: number;
    endY: number;
    contentStartY: number; // Dinamik içeriğin başlayacağı Y pozisyonu
  };
  footer: {
    startY: number;
    endY: number;
  };
  // Dinamik içerik alanı
  contentArea: {
    startY: number;
    endY: number;
    width: number;
    leftMargin: number;
    rightMargin: number;
  };
}

// İstatistik Kartı Tipi - sabit tasarım, dinamik değerler
interface StatCardConfig {
  title: string;
  value: string | number;
  description?: string;
  color: {
    background: [number, number, number];
    border: [number, number, number];
    text: [number, number, number];
    value: [number, number, number];
  };
}

// Tablo Başlık Konfigürasyonu - sabit tasarım
interface TableHeaderConfig {
  title: string;
  backgroundColor?: [number, number, number];
  textColor?: [number, number, number];
  borderColor?: [number, number, number];
}

// PDF Template oluştur - sabit layout hesaplamaları
const createPDFTemplate = (doc: jsPDFWithFontStatus): PDFTemplateLayout => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const mar = PDF_CONSTANTS.margin;
  
  return {
    background: {
      startY: 0,
      endY: pageHeight,
    },
    header: {
      startY: 0,
      endY: PDF_CONSTANTS.headerHeight,
      contentStartY: PDF_CONSTANTS.headerHeight + 50, // Header'dan sonra 50px boşluk (30 → 50, altında ek boşluk)
    },
    footer: {
      startY: pageHeight - PDF_CONSTANTS.footerHeight,
      endY: pageHeight,
    },
    contentArea: {
      startY: PDF_CONSTANTS.headerHeight + 50, // Header'dan sonra başlar (30 → 50, altında ek boşluk)
      endY: pageHeight - PDF_CONSTANTS.footerHeight - 20, // Footer'dan önce biter (20px boşluk)
      width: pageWidth - (mar * 2),
      leftMargin: mar,
      rightMargin: mar,
    },
  };
};

// Kart boyutlarını hesapla - standardize edilmiş helper fonksiyon
const calculateCardDimensions = (contentWidth: number, cardCount: number): { width: number; gap: number } => {
  const gap = PDF_CONSTANTS.cardGap;
  if (cardCount === 3) {
    return {
      width: (contentWidth - (2 * gap)) / 3,
      gap: gap,
    };
  } else if (cardCount === 4) {
    // 4 kart için gap'i daha da küçült (taşmayı önlemek için)
    const reducedGap = 8; // 12 → 8 (daha kompakt)
    return {
      width: (contentWidth - (3 * reducedGap)) / 4,
      gap: reducedGap,
    };
  } else {
    // Varsayılan: 3 kart
    return {
      width: (contentWidth - (2 * gap)) / 3,
      gap: gap,
    };
  }
};

// Ortak safeText helper fonksiyonu - tüm raporlarda kullanılabilir
// Türkçe karakterleri ASCII'ye çevir (sadece Helvetica için, Roboto destekliyor)
const transliterateTurkish = (text: string): string => {
  const turkishMap: Record<string, string> = {
    'ç': 'c', 'Ç': 'C',
    'ğ': 'g', 'Ğ': 'G',
    'ı': 'i', 'İ': 'I',
    'ö': 'o', 'Ö': 'O',
    'ş': 's', 'Ş': 'S',
    'ü': 'u', 'Ü': 'U',
  };
  return text.replace(/[çÇğĞıİöÖşŞüÜ]/g, (char) => turkishMap[char] || char);
};

// AutoTable verilerini transliterate et - head ve body için
const transliterateTableData = (data: (string | number)[][] | null | undefined): (string | number)[][] => {
  if (!data || !Array.isArray(data)) {
    return [];
  }
  return data.map((row) => {
    if (!Array.isArray(row)) {
      return [];
    }
    return row.map((cell) => {
      if (typeof cell === 'string') {
        return transliterateTurkish(cell);
      }
      return cell;
    });
  });
};

const createSafeText = (doc: jsPDFWithFontStatus) => {
  // jsPDF'in Roboto font'u ile Türkçe karakter desteği sınırlı
  // Bu yüzden her zaman Türkçe karakterleri transliterate ediyoruz
  return (text: string, x: number, y: number, fontSize: number, isBold: boolean = false) => {
    // Her zaman transliterate et
    const processedText = transliterateTurkish(text);
    
    // Font yüklenmemişse veya yükleme başarısızsa direkt helvetica kullan
    if (!doc._robotoFontLoaded || doc._robotoFontLoadFailed) {
      try {
        doc.setFont("helvetica", isBold ? "bold" : "normal");
        doc.setFontSize(fontSize);
        doc.text(processedText, x, y);
      } catch (error: unknown) {
        // Hata durumunda sessizce devam et
      }
      return;
    }
    
    // Roboto kullanmayı dene - ÇOK AGRESİF YAKLAŞIM
    // Font'u MUTLAKA Roboto olarak ayarla - daha fazla deneme
    let fontSet = false;
    for (let i = 0; i < 10; i++) {
      try {
        doc.setFont("Roboto", isBold ? "bold" : "normal");
        const currentFont = doc.getFont();
        if (currentFont && isRobotoName(currentFont.fontName)) {
          fontSet = true;
          break;
        }
      } catch {
        // Tekrar dene
      }
    }
    
    if (!fontSet) {
      // Font ayarlanamadı, Helvetica'ya geç
      try {
        doc.setFont("helvetica", isBold ? "bold" : "normal");
        doc.setFontSize(fontSize);
        doc.text(processedText, x, y);
        doc._robotoFontLoaded = false;
        doc._robotoFontLoadFailed = true;
      } catch {
        // Son çare
      }
      return;
    }
    
    // Font Roboto, ama Türkçe karakterleri transliterate edilmiş text ile yaz
    doc.setFontSize(fontSize);
    try {
      // Text yazmadan önce font'u tekrar kontrol et ve ayarla - daha agresif
      let fontVerified = false;
      for (let i = 0; i < 10; i++) {
        try {
          doc.setFont("Roboto", isBold ? "bold" : "normal");
          doc.setFontSize(fontSize);
          const verifyFont = doc.getFont();
          if (verifyFont && isRobotoName(verifyFont.fontName)) {
            fontVerified = true;
            break;
          }
        } catch {
          // Tekrar dene
        }
      }
      
      if (!fontVerified) {
        // Font ayarlanamadı, font listesini kontrol et
        try {
          const fontList = doc.getFontList();
          const hasRoboto = fontList && Object.keys(fontList).some((key) => isRobotoName(key));
          if (hasRoboto) {
            // Font listesinde var, tekrar ayarla
            for (let i = 0; i < 10; i++) {
              try {
                doc.setFont("Roboto", isBold ? "bold" : "normal");
                doc.setFontSize(fontSize);
                const checkFont = doc.getFont();
                if (checkFont && isRobotoName(checkFont.fontName)) {
                  fontVerified = true;
                  break;
                }
              } catch {
                // Tekrar dene
              }
            }
          }
        } catch {
          // Font listesi alınamadı
        }
      }
      
      // Font doğrulandı, text'i yaz - ama önce tekrar kontrol et
      if (fontVerified) {
        // Text yazmadan hemen önce font'u tekrar ayarla ve doğrula
        let finalFontSet = false;
        for (let i = 0; i < 5; i++) {
          try {
            doc.setFont("Roboto", isBold ? "bold" : "normal");
            doc.setFontSize(fontSize);
            const finalCheck = doc.getFont();
            if (finalCheck && isRobotoName(finalCheck.fontName)) {
              finalFontSet = true;
              break;
            }
          } catch {
            // Tekrar dene
          }
        }
        
        if (finalFontSet) {
          // Font kesinlikle Roboto, ama jsPDF ş, İ, ğ karakterlerini desteklemiyor
          // Bu yüzden processedText zaten transliterate edilmiş (fonksiyon başında)
          // Text yazmadan hemen önce font'u bir kez daha kontrol et ve ayarla
          try {
            // Font'u kesinlikle Roboto olarak ayarla - ÇOK AGRESİF
            for (let i = 0; i < 15; i++) {
              try {
                doc.setFont("Roboto", isBold ? "bold" : "normal");
                doc.setFontSize(fontSize);
                const verifyFont = doc.getFont();
                if (verifyFont && isRobotoName(verifyFont.fontName)) {
                  break;
                }
              } catch {
                // Tekrar dene
              }
            }
            
            // Roboto font yüklü, ama Türkçe karakterleri transliterate edilmiş text ile yaz
            doc.setFont("Roboto", isBold ? "bold" : "normal");
            doc.setFontSize(fontSize);
            doc.text(processedText, x, y);
          } catch (textError) {
            // Text yazma hatası - font sorunu olabilir
            // Önce font'u tekrar ayarla ve tekrar dene
            try {
              for (let i = 0; i < 10; i++) {
                try {
                  doc.setFont("Roboto", isBold ? "bold" : "normal");
                  doc.setFontSize(fontSize);
                  const checkFont = doc.getFont();
                  if (checkFont && isRobotoName(checkFont.fontName)) {
                    // Roboto font yüklü, transliterate edilmiş text ile yaz
                    doc.text(processedText, x, y);
                    return;
                  }
                } catch {
                  // Tekrar dene
                }
              }
            } catch {
              // Font ayarlanamadı, Helvetica'ya geç
            }
            // Tüm denemeler başarısız, Helvetica'ya geç
            doc.setFont("helvetica", isBold ? "bold" : "normal");
            doc.setFontSize(fontSize);
            doc.text(processedText, x, y);
          }
        } else {
          // Font ayarlanamadı, Helvetica'ya geç
          doc.setFont("helvetica", isBold ? "bold" : "normal");
          doc.setFontSize(fontSize);
          doc.text(processedText, x, y);
        }
      } else {
        // Font doğrulanamadı, Helvetica'ya geç
        doc.setFont("helvetica", isBold ? "bold" : "normal");
        doc.setFontSize(fontSize);
        doc.text(processedText, x, y);
      }
    } catch (textError) {
      // Text yazma hatası - font sorunu olabilir
      // Font'u tekrar ayarla ve tekrar dene - daha agresif
      try {
        for (let i = 0; i < 5; i++) {
          try {
            doc.setFont("Roboto", isBold ? "bold" : "normal");
            doc.setFontSize(fontSize);
            const checkFont = doc.getFont();
            if (checkFont && isRobotoName(checkFont.fontName)) {
              // Roboto font yüklü, transliterate edilmiş text ile yaz
              doc.text(processedText, x, y);
              return;
            }
          } catch {
            // Tekrar dene
          }
        }
        // Tüm denemeler başarısız, Helvetica'ya geç
        doc.setFont("helvetica", isBold ? "bold" : "normal");
        doc.setFontSize(fontSize);
        doc.text(processedText, x, y);
      } catch (retryError) {
        // Son çare: sessizce devam et
      }
    }
  };
};

// Arka plan template'i - sabit, her sayfada aynı
const drawPDFBackground = (doc: jsPDFWithFontStatus, template: PDFTemplateLayout) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const [primaryR, primaryG, primaryB] = PDF_CONSTANTS.primaryColor;
  
  // Header background - profesyonel ve minimal (daha hafif)
  doc.setFillColor(primaryR, primaryG, primaryB);
  doc.setGState(doc.GState({ opacity: 0.04 })); // Daha hafif: 0.08 → 0.04
  doc.rect(0, 0, pageWidth, PDF_CONSTANTS.headerHeight, "F");
  doc.setGState(doc.GState({ opacity: 1 }));
  
  // Footer background - sabit (profesyonel gri)
  const footerY = doc.internal.pageSize.getHeight() - PDF_CONSTANTS.footerHeight;
  doc.setFillColor(TAILWIND_COLORS.gray50[0], TAILWIND_COLORS.gray50[1], TAILWIND_COLORS.gray50[2]);
  doc.rect(0, footerY, pageWidth, PDF_CONSTANTS.footerHeight, "F");
};

// Sabit İstatistik Kartı Çizme Fonksiyonu - profesyonel ve sade tasarım
const drawStatCard = (
  doc: jsPDFWithFontStatus,
  x: number,
  y: number,
  width: number,
  height: number,
  config: StatCardConfig
): void => {
  const safeText = createSafeText(doc);
  const [bgR, bgG, bgB] = config.color.background;
  const [borderR, borderG, borderB] = config.color.border;
  const [textR, textG, textB] = config.color.text;
  const [valueR, valueG, valueB] = config.color.value;
  
  // Primary kart için özel arka plan (opacity ile) - Web sayfasındaki gibi
  const isPrimaryCard = borderR === TAILWIND_COLORS.primaryCardBorder[0] && 
                       borderG === TAILWIND_COLORS.primaryCardBorder[1] && 
                       borderB === TAILWIND_COLORS.primaryCardBorder[2] &&
                       bgR === TAILWIND_COLORS.white[0] && 
                       bgG === TAILWIND_COLORS.white[1] && 
                       bgB === TAILWIND_COLORS.white[2];
  
  if (isPrimaryCard) {
    // Primary kart için hafif arka plan (web: rgba(221, 83, 53, 0.05))
    doc.setFillColor(borderR, borderG, borderB);
    doc.setGState(doc.GState({ opacity: 0.05 }));
    doc.roundedRect(x, y, width, height, 6, 6, "F");
    doc.setGState(doc.GState({ opacity: 1 }));
  } else {
    // Normal kart arka planı
    doc.setFillColor(bgR, bgG, bgB);
    doc.roundedRect(x, y, width, height, 6, 6, "F");
  }
  
  // Border - Web sayfasındaki gibi (2pt kalınlık - border-2)
  doc.setDrawColor(borderR, borderG, borderB);
  doc.setLineWidth(2);
  doc.roundedRect(x, y, width, height, 6, 6, "S");
  
  // Başlık - Web sayfasındaki gibi (küçültülmüş spacing)
  // Title: y + cardPadding (14px) + title baseline (~12px) = y + 26
  doc.setTextColor(textR, textG, textB);
  safeText(config.title, x + PDF_CONSTANTS.cardPadding, y + 26, PDF_CONSTANTS.fontSizeCardTitle, true);
  
  // Değer - Web sayfasındaki gibi (küçültülmüş spacing)
  // Value: title'dan sonra (10px) + value baseline (~24px) = y + 26 + 10 + 24 = y + 60
  const valueText = typeof config.value === 'number' ? config.value.toString() : config.value;
  doc.setTextColor(valueR, valueG, valueB);
  safeText(valueText, x + PDF_CONSTANTS.cardPadding, y + 60, PDF_CONSTANTS.fontSizeCardValue, true);
  
  // Açıklama - Web sayfasındaki gibi (küçültülmüş spacing)
  // Description: value'dan sonra (4px) + description baseline (~11px) = y + 60 + 4 + 11 = y + 75
  if (config.description) {
    doc.setTextColor(textR, textG, textB);
    safeText(config.description, x + PDF_CONSTANTS.cardPadding, y + 75, PDF_CONSTANTS.fontSizeCardDescription, false);
  }
  
  doc.setTextColor(0, 0, 0);
};

// Profesyonel Tablo Başlığı Çizme Fonksiyonu - profesyonel ve sade tasarım
const drawProfessionalTableHeader = (
  doc: jsPDFWithFontStatus,
  x: number,
  y: number,
  width: number,
  config: TableHeaderConfig
): number => {
  const safeText = createSafeText(doc);
  const [primaryR, primaryG, primaryB] = PDF_CONSTANTS.primaryColor;
  
  // Web sayfasındaki renkler - bg-[rgb(249,250,251)] border-b
  const bgColor = config.backgroundColor || TAILWIND_COLORS.gray50; // Web: bg-[rgb(249,250,251)]
  const textColor = config.textColor || PDF_CONSTANTS.primaryColor; // Web: text-primary
  const borderColor = config.borderColor || [229, 231, 235]; // Web: border-b (gray200)
  
  // Başlık için arka plan - Web sayfasındaki gibi (bg-[rgb(249,250,251)])
  doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
  doc.roundedRect(x, y - PDF_CONSTANTS.tableHeaderPadding, width, PDF_CONSTANTS.tableHeaderHeight, 4, 4, "F");
  
  // Alt border - Web sayfasındaki gibi (border-b)
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(1);
  doc.line(x, y + PDF_CONSTANTS.tableHeaderHeight - PDF_CONSTANTS.tableHeaderPadding, x + width, y + PDF_CONSTANTS.tableHeaderHeight - PDF_CONSTANTS.tableHeaderPadding);
  
  // Başlık text - Web sayfasındaki gibi (text-lg font-bold = 18px, bold)
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  // Font'u bold yap
  if (doc._robotoFontLoaded && !doc._robotoFontLoadFailed) {
    doc.setFont("Roboto", "bold");
  } else {
    doc.setFont("helvetica", "bold");
  }
  safeText(config.title, x + 10, y + PDF_CONSTANTS.tableHeaderPadding, PDF_CONSTANTS.fontSizeTableHeader, true); // Küçültülmüş: 18 → 16
  doc.setTextColor(0, 0, 0);
  
  // Başlıktan sonraki Y pozisyonu: headerHeight + padding + spacing (iyileştirilmiş)
  // Yeterli boşluk için optimize edildi
  return y + PDF_CONSTANTS.tableHeaderHeight + PDF_CONSTANTS.tableHeaderSpacing - 2; // Daha kompakt (-2px)
};

// Eski fonksiyon için alias (geriye dönük uyumluluk)
const drawTableHeader = drawProfessionalTableHeader;

// Profesyonel Tablo Stil Konfigürasyonu - tüm tablolarda kullanılacak
interface ProfessionalTableStyles {
  headStyles: Record<string, unknown>;
  bodyStyles: Record<string, unknown>;
  styles: Record<string, unknown>;
  alternateRowStyles: Record<string, unknown>;
}

const createProfessionalTableStyles = (
  doc: jsPDFWithFontStatus,
  options?: {
    headerFontSize?: number;
    bodyFontSize?: number;
    cellPadding?: { top: number; right: number; bottom: number; left: number };
  }
): ProfessionalTableStyles => {
  // Standardize edilmiş varsayılan değerler
  const headerFontSize = options?.headerFontSize || PDF_CONSTANTS.fontSizeTableHeaderText;
  const bodyFontSize = options?.bodyFontSize || PDF_CONSTANTS.fontSizeTableBody;
  const cellPadding = options?.cellPadding || { top: 10, right: 12, bottom: 10, left: 12 };
  
  // Font'u zorla Roboto yap - ÇOK AGRESİF YAKLAŞIM
  // Font'un gerçekten yüklü olduğunu kontrol et ve MUTLAKA Roboto kullan
  let fontName = "helvetica";
  if (doc._robotoFontLoaded && !doc._robotoFontLoadFailed) {
    // Font'u zorla Roboto olarak ayarla - daha fazla deneme
    for (let i = 0; i < 10; i++) {
      try {
        doc.setFont("Roboto", "normal");
        const currentFont = doc.getFont();
        if (currentFont && isRobotoName(currentFont.fontName)) {
          fontName = "Roboto";
          break;
        }
      } catch {
        // Tekrar dene
      }
    }
    
    // Font listesinde Roboto var mı kontrol et
    if (fontName === "helvetica") {
      try {
        const fontList = doc.getFontList();
        if (fontList && Object.keys(fontList).some((key) => isRobotoName(key))) {
          // Font listesinde var, zorla kullan
          fontName = "Roboto";
          // Font'u tekrar ayarla
          for (let i = 0; i < 5; i++) {
            try {
              doc.setFont("Roboto", "normal");
              const currentFont = doc.getFont();
              if (currentFont && isRobotoName(currentFont.fontName)) {
                break;
              }
            } catch {
              // Tekrar dene
            }
          }
        }
      } catch {
        // Font listesi alınamadı
      }
    }
  }
  
  return {
    headStyles: {
      fillColor: [249, 250, 251], // Web: bg-gray-50/50 (gray50 with opacity, PDF'te tam gray50)
      textColor: [30, 41, 59], // Koyu gri-mavi - Web: text-muted-foreground
      fontStyle: "bold", // Web: font-semibold (bold kullanıyoruz)
      fontSize: headerFontSize,
      font: fontName, // Zorla Roboto veya helvetica
      halign: "center", // Başlıklar ortalanmış
      lineColor: TAILWIND_COLORS.gray200, // gray-200
      lineWidth: { top: 0, bottom: 1, left: 0, right: 0 }, // Sadece alt border - Web: border-b
      cellPadding: cellPadding,
      minCellHeight: 40, // Minimum satır yüksekliği
      overflow: 'linebreak', // Metin taşmasını önle
      wrap: true, // Metin sarmalama
    },
    bodyStyles: {
      fillColor: [255, 255, 255], // Web: beyaz arka plan
      textColor: [30, 41, 59], // Koyu gri-mavi - Web: text-foreground
      fontSize: bodyFontSize,
      font: fontName, // Zorla Roboto veya helvetica
      fontStyle: "normal", // Web: font-medium (normal kullanıyoruz)
      lineColor: TAILWIND_COLORS.gray200, // gray-200
      lineWidth: { bottom: 1, top: 0, left: 0, right: 0 }, // Sadece alt border
      cellPadding: cellPadding,
      minCellHeight: 40, // Minimum satır yüksekliği
      overflow: 'linebreak', // Metin taşmasını önle
      wrap: true, // Metin sarmalama
    },
    styles: {
      font: fontName, // Zorla Roboto veya helvetica
      fontStyle: "normal",
      fontSize: bodyFontSize,
      cellPadding: cellPadding,
      minCellHeight: 40, // Minimum satır yüksekliği
      overflow: 'linebreak', // Metin taşmasını önle
      wrap: true, // Metin sarmalama
    },
    alternateRowStyles: {
      fillColor: TAILWIND_COLORS.gray50, // gray-50 - alternatif satırlar (çok açık)
    },
  };
};

// Tablo sayfa sığmazsa yeni sayfa ekle
const ensureTableFitsPage = (
  doc: jsPDFWithFontStatus,
  currentY: number,
  requiredHeight: number,
  margin: number = 40,
  titleForNextPage?: string
): number => {
  const pageHeight = doc.internal.pageSize.getHeight();
  const footerHeight = PDF_CONSTANTS.footerHeight;
  
  // Eğer tablo sayfa sığmazsa yeni sayfa ekle (daha fazla boşluk bırak)
  const minSpaceNeeded = requiredHeight + 70; // 70pt ekstra boşluk (50pt'den artırıldı)
  if (currentY + minSpaceNeeded > pageHeight - footerHeight - margin) {
    doc.addPage();
    let nextY = margin + 30; // Üstten 30pt daha fazla boşluk (20pt'den artırıldı)
    
    // Yeni sayfada template'i uygula
    const template = createPDFTemplate(doc);
    drawPDFBackground(doc, template);
    
    // "(devam)" etiketi kaldırıldı - kullanıcı isteği
    
    return nextY;
  }
  
  return currentY;
};

// Sabit Özet Bölümü Çizme Fonksiyonu - tasarım sabit, veriler dinamik
const drawSummarySection = (
  doc: jsPDFWithFontStatus,
  x: number,
  y: number,
  width: number,
  title: string,
  data: Array<[string, string]>,
  headerColor: [number, number, number] = PDF_CONSTANTS.primaryColor
): number => {
  const safeText = createSafeText(doc);
  const [headerR, headerG, headerB] = headerColor;
  
  // Özet başlık arka planı - sabit tasarım
  doc.setFillColor(headerR, headerG, headerB);
  doc.roundedRect(x, y, width, 40, 5, 5, "F");
  doc.setDrawColor(headerR, headerG, headerB);
  doc.roundedRect(x, y, width, 40, 5, 5, "S");
  
  // Dekoratif çizgi - sabit tasarım
  doc.setDrawColor(255, 255, 255);
  doc.setGState(doc.GState({ opacity: 0.3 }));
  doc.setLineWidth(1);
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.line(x + 5, y + 38, pageWidth - x - 5, y + 38);
  doc.setGState(doc.GState({ opacity: 1 }));
  
  // Başlık text - dinamik (daha okunabilir font size)
  doc.setTextColor(255, 255, 255);
  safeText(title, x + 15, y + 26, 19, true); // İyileştirildi: 18px → 19px
  doc.setTextColor(0, 0, 0);
  
  const summaryY = y + 50;
  
  // Font'u zorla Roboto olarak ayarla (autoTable öncesi)
  forceRobotoFont(doc, "normal");
  
  // Özet tablosu - sabit stil, dinamik veriler
  autoTable(doc, {
    startY: summaryY,
    head: transliterateTableData([['Metrik', 'Değer']]),
    body: transliterateTableData(data),
    margin: { left: x, right: x },
    willDrawCell: createWillDrawCell(doc),
    headStyles: { 
      fillColor: [headerR, headerG, headerB],
      textColor: [255, 255, 255], 
      fontStyle: "bold", 
      fontSize: 12,
      font: getFontName(doc),
      lineColor: [headerR, headerG, headerB],
      lineWidth: { top: 1, bottom: 1, left: 1, right: 1 },
      cellPadding: { top: 12, right: 14, bottom: 12, left: 14 }
    },
    bodyStyles: { 
      textColor: [31, 41, 55],
      fontSize: 11,
      font: getFontName(doc),
      lineColor: [229, 231, 235],
      lineWidth: { bottom: 1 },
      cellPadding: { top: 12, right: 14, bottom: 12, left: 14 }
    },
    styles: { 
      font: getFontName(doc), 
      fontStyle: "normal", 
      fontSize: 11,
      cellPadding: { top: 12, right: 14, bottom: 12, left: 14 }
    },
    columnStyles: {
      0: { cellWidth: "auto", halign: "left", fontStyle: "bold" },
      1: { cellWidth: 150, halign: "right", fontStyle: "bold", textColor: [headerR, headerG, headerB] },
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251]
    },
  });
  
  const finalY = (doc.lastAutoTable?.finalY || summaryY) + 50; // Optimize edilmiş boşluk: 50pt
  return finalY;
};

// Font yükleme durumunu takip etmek için doc objesine property ekle
interface jsPDFWithFontStatus extends jsPDF {
  _robotoFontLoaded?: boolean;
  _robotoFontLoadFailed?: boolean; // Font yükleme başarısız olduysa tekrar deneme
  _robotoSupportsTurkish?: boolean; // Font'un Türkçe karakterleri destekleyip desteklemediği
  _turkishCharsTested?: boolean; // Türkçe karakter testi yapıldı mı?
  lastAutoTable?: {
    finalY?: number;
  };
}

// Font URLs (Google Fonts CDN) - Artık kullanılmıyor ama referans için tutulabilir veya silinebilir
// const ROBOTO_REGULAR_URL = "https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf";
// const ROBOTO_BOLD_URL = "https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlfBBc9.ttf";

// Font cache - Base64 import edildiği için gerek kalmadı
// const fontCache: Record<string, string> = {};

// Fetch font and convert to base64 - Artık kullanılmıyor
// const fetchFont = async (url: string): Promise<string> => { ... };

const isRobotoName = (fontName?: string): boolean => {
  if (!fontName) return false;
  return fontName.toLowerCase().includes("roboto");
};

// Güçlendirilmiş Font Yönetimi
const registerFonts = async (doc: jsPDFWithFontStatus) => {
  // Eğer font zaten yüklendiyse tekrar yükleme
  if (doc._robotoFontLoaded && !doc._robotoFontLoadFailed) {
    // Font'un gerçekten yüklü olduğunu doğrula
    try {
      const currentFont = doc.getFont();
      if (currentFont && isRobotoName(currentFont.fontName)) {
        // Font yüklü, Türkçe karakter desteğini test et
        try {
          doc.setFontSize(12);
          doc.text("İğüşöç", -1000, -1000);
          return; // Font zaten yüklü ve çalışıyor
        } catch (testError) {
          // Türkçe karakter testi başarısız, ama font yüklü olabilir
          // Font'u yeniden yükle
          doc._robotoFontLoaded = false;
        }
      } else {
        // Font yüklü değil, yeniden yükle
        doc._robotoFontLoaded = false;
      }
    } catch {
      // Font kontrolü başarısız, yeniden yükle
      doc._robotoFontLoaded = false;
    }
  }

  // Eğer daha önce yükleme başarısız olduysa, tekrar dene (flag'i reset et)
  if (doc._robotoFontLoadFailed) {
    // Bir kez daha deneme şansı ver
    doc._robotoFontLoadFailed = false;
    // Devam et, font yükleme işlemini tekrar dene
  }

  // Font string'lerinin kesilmiş olup olmadığını kontrol et
  // Eğer "..." ile bitiyorsa, font string'leri kesilmiş demektir
  // Ayrıca string'lerin çok kısa olup olmadığını kontrol et (base64 font'lar genellikle çok uzun olur)
  if (ROBOTO_REGULAR_BASE64.endsWith('...') || ROBOTO_BOLD_BASE64.endsWith('...') ||
      ROBOTO_REGULAR_BASE64.length < 1000 || ROBOTO_BOLD_BASE64.length < 1000) {
    doc.setFont("helvetica", "normal");
    doc._robotoFontLoaded = false;
    doc._robotoFontLoadFailed = true;
    return;
  }

  try {
    // Base64 string'lerin düzgün formatta olduğundan emin ol
    // Önce data: prefix'i varsa temizle
    let cleanRegular = ROBOTO_REGULAR_BASE64.replace(/^data:.*?,/, '').trim();
    let cleanBold = ROBOTO_BOLD_BASE64.replace(/^data:.*?,/, '').trim();
    
    
    // "..." gibi kesilme işaretlerini kaldır (eğer varsa)
    cleanRegular = cleanRegular.replace(/\.\.\.$/, '').trim();
    cleanBold = cleanBold.replace(/\.\.\.$/, '').trim();
    
    // Eğer string'ler boşsa, direkt helvetica'ya geç
    if (!cleanRegular || !cleanBold || cleanRegular.length === 0 || cleanBold.length === 0) {
      throw new Error("Font base64 string'leri boş");
    }
    
    // Tüm whitespace karakterlerini kaldır (boşluk, tab, newline, vb.)
    cleanRegular = cleanRegular.replace(/\s+/g, '');
    cleanBold = cleanBold.replace(/\s+/g, '');
    
    // Sadece geçerli base64 karakterlerini tut (A-Z, a-z, 0-9, +, /, =)
    cleanRegular = cleanRegular.replace(/[^A-Za-z0-9+/=]/g, '');
    cleanBold = cleanBold.replace(/[^A-Za-z0-9+/=]/g, '');

    // Padding düzeltmesi (Base64 string uzunluğu 4'ün katı olmalı)
    const regularPadding = (4 - (cleanRegular.length % 4)) % 4;
    const boldPadding = (4 - (cleanBold.length % 4)) % 4;
    cleanRegular += '='.repeat(regularPadding);
    cleanBold += '='.repeat(boldPadding);

    if (cleanRegular.length === 0 || cleanBold.length === 0) {
      throw new Error("Font base64 string'leri boş");
    }

    // Add to VFS - her adımda hata kontrolü yap
    try {
      doc.addFileToVFS("Roboto-Regular.ttf", cleanRegular);
      doc.addFileToVFS("Roboto-Bold.ttf", cleanBold);
    } catch (vfsError) {
      throw new Error("Font VFS'e eklenemedi: " + vfsError);
    }

    // Add fonts - her adımda hata kontrolü yap
    // ÖNEMLİ: Font'u eklemeden önce VFS'de olduğundan emin ol
    try {
      const fontListBefore = doc.getFontList();
      
      // Font'u ekle - font adı "Roboto" olmalı
      doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
      
      // Font'un eklendiğini doğrula
      const fontListAfterRegular = doc.getFontList();
      const hasRobotoRegular = fontListAfterRegular && Object.keys(fontListAfterRegular).some((key) => isRobotoName(key));
      
      
      if (!hasRobotoRegular) {
        throw new Error("Roboto Regular font eklenemedi");
      }
      
      doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");
      
      // Font'un eklendiğini doğrula
      const fontListAfterBold = doc.getFontList();
      const hasRobotoBold = fontListAfterBold && Object.keys(fontListAfterBold).some((key) => isRobotoName(key));
      
      if (!hasRobotoBold) {
        // Roboto Bold font eklenemedi, ama Regular yüklü
      }
    } catch (addFontError) {
      // Font eklenemedi, VFS'den temizle
      try {
        // VFS'den silmek için bir yöntem yok, ama flag'i set edelim
      } catch (error) {
        // VFS'den silmek için bir yöntem yok, ama flag'i set edelim
      }
      throw new Error("Font eklenemedi: " + addFontError);
    }

    // Set default font ve test et
    try {
      doc.setFont("Roboto", "normal");
      
      const fontAfterSet = doc.getFont();
    } catch (setFontError) {
      throw new Error("Font ayarlanamadı: " + setFontError);
    }
    
    // Font'un gerçekten yüklendiğini test et - basit bir text yazmayı dene
    try {
      const fontList = doc.getFontList();
      // Font listesinde Roboto var mı kontrol et
      const hasRoboto =
        fontList &&
        Object.keys(fontList).some((fontKey) => isRobotoName(fontKey));
      
      
      if (!hasRoboto) {
        throw new Error("Roboto font listesinde bulunamadı");
      }
      // Font'un gerçekten çalıştığını test et - Türkçe karakter testi
      const currentFont = doc.getFont();
      if (!currentFont || !isRobotoName(currentFont.fontName)) {
        throw new Error("Font ayarlandı ama font name eşleşmiyor");
      }
      
      // Türkçe karakter testi - "İğüşöç" karakterlerini test et - daha kapsamlı test
      // Özellikle ş, ç, ğ, İ karakterlerini test et (kullanıcının belirttiği karakterler)
      let turkishTestPassed = false;
      try {
        doc.setFontSize(12);
        // Test text'i yaz (görünmez bir yere) - tüm Türkçe karakterleri test et
        // Özellikle ş, ç, ğ, İ karakterlerini test et (kullanıcının belirttiği karakterler)
        const testText = "İğüşöçÇĞÜŞÖÇşçğİŞÇĞ";
        
        // Font'u tekrar ayarla ve test et - daha agresif
        for (let i = 0; i < 5; i++) {
          try {
            doc.setFont("Roboto", "normal");
            doc.setFontSize(12);
            const checkFont = doc.getFont();
            if (checkFont && isRobotoName(checkFont.fontName)) {
              // Font Roboto, test text'i yaz
          doc.text(testText, -1000, -1000);
              turkishTestPassed = true;
              break;
            }
          } catch {
            // Tekrar dene
          }
        }
        
        if (!turkishTestPassed) {
          // Türkçe karakter testi başarısız, ama font yüklü olabilir
          // Font listesini kontrol et
          try {
            const fontList = doc.getFontList();
            const hasRoboto = fontList && Object.keys(fontList).some((key) => isRobotoName(key));
            if (hasRoboto) {
              // Font listesinde var, yükleme başarılı sayılabilir
              turkishTestPassed = true;
            }
          } catch {
            // Font listesi alınamadı
          }
        }
        
        // Font'un gerçekten çalıştığını doğrula
        const verifyFont = doc.getFont();
        if (verifyFont && isRobotoName(verifyFont.fontName) && turkishTestPassed) {
          doc._robotoFontLoaded = true;
          doc._robotoFontLoadFailed = false;
          // Font yüklü ve ayarlanmış - Türkçe karakterleri destekliyor
        } else if (turkishTestPassed) {
          // Türkçe test başarılı ama font adı eşleşmiyor, yine de kabul et
          doc._robotoFontLoaded = true;
          doc._robotoFontLoadFailed = false;
        } else {
          throw new Error("Font test sonrası doğrulama başarısız");
        }
      } catch (textWriteError) {
        // Text yazma hatası - font Türkçe karakterleri desteklemiyor olabilir
        // Ama yine de font yüklü olabilir, bu yüzden devam et
        // Font listesinde varsa kabul et
        try {
        const fontList = doc.getFontList();
          const hasRoboto = fontList && Object.keys(fontList).some((key) => isRobotoName(key));
        const currentFont = doc.getFont();
        if (hasRoboto && currentFont && isRobotoName(currentFont.fontName)) {
          doc._robotoFontLoaded = true;
            doc._robotoFontLoadFailed = false;
        } else {
            throw new Error("Font test başarısız: " + textWriteError);
          }
        } catch (finalError) {
          throw new Error("Font test başarısız: " + textWriteError);
        }
      }
    } catch (fontTestError) {
      // Font test başarısız, helvetica'ya geç
      doc.setFont("helvetica", "normal");
      throw new Error("Font yüklendi ama kullanılamıyor: " + fontTestError);
    }
  } catch (e) {
    doc.setFont("helvetica", "normal");
    doc._robotoFontLoaded = false;
    doc._robotoFontLoadFailed = true; // Bir daha deneme
  }
};

const safeSetFont = (doc: jsPDFWithFontStatus, style: "normal" | "bold" = "normal") => {
  // Font yüklenmemişse veya yükleme başarısızsa direkt helvetica kullan
  if (!doc._robotoFontLoaded || doc._robotoFontLoadFailed) {
    try {
      doc.setFont("helvetica", style);
    } catch {
      // Helvetica bile başarısız olursa hiçbir şey yapma
    }
    return;
  }

  // Roboto font'unu zorla ayarla - daha agresif yaklaşım
  
  let attempts = 0;
  let fontSet = false;
  const maxAttempts = 3;

  while (attempts < maxAttempts && !fontSet) {
    try {
      // Roboto font'unu kullanmayı dene
      doc.setFont("Roboto", style);
      
      // Font'un gerçekten ayarlandığını kontrol et - daha sıkı kontrol
      const currentFont = doc.getFont();
      if (currentFont && isRobotoName(currentFont.fontName)) {
        // Font başarıyla ayarlandı, doğrula
        // Türkçe karakter testi yap (görünmez yere)
        try {
          doc.setFontSize(12);
          doc.text("İğüşöç", -1000, -1000);
          fontSet = true;
          break;
        } catch (testError) {
          // Test başarısız ama font yüklü olabilir, font listesini kontrol et
          const fontList = doc.getFontList();
          const hasRoboto = fontList && Object.keys(fontList).some((key) => isRobotoName(key));
          if (hasRoboto) {
            fontSet = true;
            break;
          }
        }
      }
      
      attempts++;
      if (attempts < maxAttempts) {
        // Kısa bir bekleme (synchronous delay simülasyonu)
        // Tekrar dene
      }
    } catch (error) {
      attempts++;
      if (attempts >= maxAttempts) {
        // Tüm denemeler başarısız, helvetica'ya geç
        try {
          doc.setFont("helvetica", style);
          doc._robotoFontLoaded = false;
          doc._robotoFontLoadFailed = true;
        } catch {
          // Son çare: hiçbir şey yapma
        }
        return;
      }
    }
  }

  // Font ayarlanamadıysa helvetica'ya geri dön
  if (!fontSet) {
    try {
      doc.setFont("helvetica", style);
      doc._robotoFontLoaded = false;
      doc._robotoFontLoadFailed = true;
    } catch {
      // Son çare: hiçbir şey yapma
    }
  }
};

// Güçlendirilmiş Tipografi Ayarları
const applyDocumentTypography = (doc: jsPDFWithFontStatus) => {
  doc.setLineHeightFactor(1.5); // Profesyonel satır aralığı (1.4 → 1.5)
  
  // Font'u ÇOK AGRESİF şekilde ayarla - MUTLAKA Roboto kullan
  if (doc._robotoFontLoaded && !doc._robotoFontLoadFailed) {
    // Font'u 10 kez deneyerek zorla Roboto olarak ayarla
    let fontSet = false;
    for (let i = 0; i < 10; i++) {
      try {
        doc.setFont("Roboto", "normal");
        const currentFont = doc.getFont();
        if (currentFont && isRobotoName(currentFont.fontName)) {
          fontSet = true;
          break;
        }
      } catch {
        // Tekrar dene
      }
    }
    
    if (!fontSet) {
      // Font ayarlanamadı, Helvetica'ya geç
      doc.setFont("helvetica", "normal");
      doc._robotoFontLoaded = false;
      doc._robotoFontLoadFailed = true;
    } else {
      // Font başarıyla ayarlandı, doğrula
      const verifyFont = doc.getFont();
      if (verifyFont && isRobotoName(verifyFont.fontName)) {
      }
    }
  } else {
    doc.setFont("helvetica", "normal");
  }
  
  doc.setFontSize(11); // Profesyonel font boyutu
};

// Font'u zorla Roboto olarak ayarla - helper fonksiyon
const forceRobotoFont = (doc: jsPDFWithFontStatus, style: "normal" | "bold" = "normal") => {
  if (doc._robotoFontLoaded && !doc._robotoFontLoadFailed) {
    for (let i = 0; i < 10; i++) {
      try {
        doc.setFont("Roboto", style);
        const currentFont = doc.getFont();
        if (currentFont && isRobotoName(currentFont.fontName)) {
          return true;
        }
      } catch {
        // Tekrar dene
      }
    }
  }
  return false;
};

const getFontName = (doc?: jsPDFWithFontStatus): string => {
  // Roboto font yüklüyse ve başarısız olmadıysa kullan
  if (doc?._robotoFontLoaded && !doc?._robotoFontLoadFailed) {
    // Font'un gerçekten yüklü olduğunu kontrol et
    try {
      // Önce mevcut font'u kontrol et
      const currentFont = doc?.getFont();
      if (currentFont && isRobotoName(currentFont.fontName)) {
        return "Roboto";
      }
      
      // Font listesini kontrol et
      const fontList = doc?.getFontList();
      if (fontList && Object.keys(fontList).some((key) => isRobotoName(key))) {
        // Font listesinde var, zorla ayarla
        try {
          doc?.setFont("Roboto", "normal");
          const verifyFont = doc?.getFont();
          if (verifyFont && isRobotoName(verifyFont.fontName)) {
            return "Roboto";
          }
        } catch {
          // Font ayarlanamadı
        }
        // Yine de Roboto döndür - font listesinde var
        return "Roboto";
      }
    } catch (error) {
      // Font kontrolü başarısız, ama yine de Roboto dene
      if (doc?._robotoFontLoaded && !doc?._robotoFontLoadFailed) {
        return "Roboto";
      }
    }
  }
  // Eğer Roboto yüklenemezse, Helvetica kullan (autoTable için)
  // Helvetica Türkçe karakterleri desteklemez ama en azından çalışır
  return "helvetica";
};

// Güçlendirilmiş Türkçe Karakter Desteği - willDrawCell hook'u (didParseCell yerine)
// willDrawCell daha geç çalışır ve font ayarlarının override edilmesini önler
interface CellHookData {
  cell?: {
    text?: string | string[];
    fontStyle?: string;
    font?: string;
    styles?: {
      font?: string;
      fontStyle?: string;
      fontSize?: number;
  };
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };
  row?: {
    index?: number;
  };
  column?: {
    index?: number;
  };
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

const createWillDrawCell = (doc: jsPDFWithFontStatus) => {
  return (data: CellHookData) => {
    if (!data.cell) return;
    
    const cell = data.cell;
    
    // Font style'ı belirle
    const fontStyle = (cell.fontStyle === "bold" || cell.styles?.fontStyle === "bold" || cell.styles?.font === "bold") ? "bold" : "normal";
    
    // Eğer Roboto font yüklüyse, font'u zorla ayarla
    if (doc._robotoFontLoaded && !doc._robotoFontLoadFailed) {
      try {
        // Font'u güvenli şekilde ayarla - daha agresif
        safeSetFont(doc, fontStyle);
        
        // Font'un gerçekten Roboto olduğunu kontrol et - daha sıkı kontrol
        let attempts = 0;
        let fontVerified = false;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts && !fontVerified) {
          try {
            doc.setFont("Roboto", fontStyle);
            const currentFont = doc.getFont();
            if (currentFont && isRobotoName(currentFont.fontName)) {
              fontVerified = true;
              break;
            }
            attempts++;
          } catch {
            attempts++;
            if (attempts >= maxAttempts) break;
          }
        }
        
        // cell.styles'i mutlaka ayarla
        if (!cell.styles) {
          cell.styles = {};
        }
        
        if (fontVerified) {
          // Font Roboto - cell.styles.font kullan (willDrawCell'de bu daha etkili)
          cell.styles.font = "Roboto";
          cell.styles.fontStyle = fontStyle;
          
          // jsPDF'in Roboto font'u ile Türkçe karakter desteği sınırlı
          // Bu yüzden her zaman transliterate ediyoruz
          if (cell.text && typeof cell.text === 'string') {
            try {
              cell.text = transliterateTurkish(cell.text);
            } catch {
              // Text değiştirilemez, devam et
            }
          } else if (cell.text && Array.isArray(cell.text)) {
            try {
              cell.text = (cell.text as string[]).map((item: unknown): string => {
                if (typeof item === 'string') {
                  return transliterateTurkish(item);
                }
                return String(item);
              });
            } catch {
              // Text değiştirilemez, devam et
            }
          }
          // Font ayarlaması için string kontrolü yap
          const textString = typeof cell.text === 'string' ? cell.text : (Array.isArray(cell.text) ? (cell.text as string[]).join(' ') : '');
          if (textString) {
            // Font'u zorla ayarla - Roboto kullan
            try {
              const fontList = doc.getFontList();
              const hasRoboto = fontList && Object.keys(fontList).some((key) => isRobotoName(key));
              if (hasRoboto) {
                // Font listesinde var, zorla ayarla
                for (let i = 0; i < 10; i++) {
                  try {
                    doc.setFont("Roboto", fontStyle);
                    if (cell.styles?.fontSize) {
                      doc.setFontSize(cell.styles.fontSize);
                    }
                    const verifyFont = doc.getFont();
                    if (verifyFont && isRobotoName(verifyFont.fontName)) {
                      break;
                    }
                  } catch {
                    // Tekrar dene
                  }
                }
              }
            } catch {
              // Font listesi alınamadı, yine de zorla ayarla
              try {
                doc.setFont("Roboto", fontStyle);
                if (cell.styles?.fontSize) {
                  doc.setFontSize(cell.styles.fontSize);
                }
              } catch {
                // Font ayarlanamadı
              }
            }
          } else {
            // Text yok, normal font ayarlaması yap
            for (let i = 0; i < 5; i++) {
              try {
                doc.setFont("Roboto", fontStyle);
                const verifyFont = doc.getFont();
                if (verifyFont && isRobotoName(verifyFont.fontName)) {
                  break;
                }
              } catch {
                // Tekrar dene
              }
            }
          }
        } else {
          // Font Roboto değilse, Helvetica'ya geç
          cell.styles.font = "helvetica";
          cell.styles.fontStyle = fontStyle;
          
          // Helvetica Türkçe karakterleri desteklemiyor, transliterate et
          if (cell.text && typeof cell.text === 'string') {
            try {
              cell.text = transliterateTurkish(cell.text);
            } catch {
              // Text değiştirilemez, devam et
            }
          } else if (cell.text && Array.isArray(cell.text)) {
            try {
              cell.text = (cell.text as string[]).map((item: unknown): string => {
                if (typeof item === 'string') {
                  return transliterateTurkish(item);
          }
                return String(item);
              });
            } catch {
              // Text değiştirilemez, devam et
        }
          }
        }
      } catch {
        // Font ayarlama hatası, Helvetica'ya geç
        if (!cell.styles) {
          cell.styles = {};
        }
        cell.styles.font = "helvetica";
        cell.styles.fontStyle = fontStyle;
      }
    } else {
      // Helvetica kullanılıyorsa veya font yüklenmemişse
      if (!cell.styles) {
        cell.styles = {};
      }
      cell.styles.font = "helvetica";
      cell.styles.fontStyle = fontStyle;
      
      // Helvetica Türkçe karakterleri desteklemiyor, transliterate et
      if (cell.text) {
        if (typeof cell.text === 'string') {
        try {
          cell.text = transliterateTurkish(cell.text);
        } catch {
          // Text değiştirilemez, devam et
        }
        } else if (Array.isArray(cell.text)) {
          try {
            cell.text = (cell.text as string[]).map((item: unknown): string => {
              if (typeof item === 'string') {
                return transliterateTurkish(item);
              }
              return String(item);
            });
          } catch {
            // Text değiştirilemez, devam et
          }
        }
      }
    }
  };
};

// Eski didParseCell hook'u - geriye dönük uyumluluk için (kullanılmıyor ama silmiyoruz)
const createDidParseCell = (doc: jsPDFWithFontStatus) => {
  return (data: CellHookData) => {
    // willDrawCell kullanıyoruz, bu fonksiyon artık kullanılmıyor
    // Ama bazı yerlerde hala didParseCell kullanılıyor olabilir, bu yüzden willDrawCell'i çağır
    return createWillDrawCell(doc)(data);
  };
};

// PDF oluşturma helper fonksiyonu
const createPdf = (options: jsPDFOptions = { format: "a4", unit: "pt" }) => {
  const doc = new jsPDF(options) as jsPDFWithFontStatus;
  return doc;
};

// Ortak yardımcı fonksiyonlar
const formatDate = (dateStr: string) => {
  if (!dateStr || dateStr.trim() === "") return "-";
  try {
    const date = new Date(dateStr);
    // Geçersiz tarih kontrolü
    if (isNaN(date.getTime()) || !isFinite(date.getTime())) {
      return "-";
    }
    const months = [
      "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
      "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
    ];
    // Görseldeki format: "20 Ağustos 2025" (ay ve yıl arasında boşluk var)
    const day = date.getDate();
    const monthIndex = date.getMonth();
    const year = date.getFullYear();
    
    // Geçerli değerler kontrolü - tüm değerlerin geçerli olduğundan emin ol
    if (isNaN(day) || isNaN(monthIndex) || isNaN(year) || 
        monthIndex < 0 || monthIndex > 11 || 
        day < 1 || day > 31 || 
        year < 1900 || year > 2100) {
      return "-";
    }
    
    const month = months[monthIndex];
    if (!month) {
      return "-";
    }
    
    return `${day} ${month} ${year}`;
  } catch (error) {
    return "-";
  }
};

const formatDateShort = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('tr-TR');
};

type TotalsSummary = {
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
};

const ensureSpace = (
  doc: jsPDF,
  currentY: number,
  requiredHeight: number,
  margin = 40,
  titleForNextPage?: string
) => {
  const pageHeight = doc.internal.pageSize.getHeight();
  const footerHeight = PDF_CONSTANTS.footerHeight;
  
  // Daha fazla boşluk bırak (70pt ekstra - 50pt'den artırıldı)
  const minSpaceNeeded = requiredHeight + 70;
  if (currentY + minSpaceNeeded > pageHeight - footerHeight - margin) {
    doc.addPage();
    let nextY = margin + 30; // Üstten 30pt daha fazla boşluk (20pt'den artırıldı)
    
    // Yeni sayfada template'i uygula
    const template = createPDFTemplate(doc as jsPDFWithFontStatus);
    drawPDFBackground(doc as jsPDFWithFontStatus, template);
    
    if (titleForNextPage) {
      const safeText = createSafeText(doc as jsPDFWithFontStatus);
      safeSetFont(doc as jsPDFWithFontStatus, "bold");
      // "(devam)" etiketi kaldırıldı - kullanıcı isteği
    }
    return nextY;
  }
  return currentY;
};

const formatCurrency = (value: number, currency = "₺") => {
  const safeValue = Number.isFinite(value) ? value : 0;
  // Binlik ayırıcılar ile formatla (web UI ile uyumlu)
  const formatted = safeValue.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `${currency}${formatted}`;
};

// Optimize edilmiş helper fonksiyonlar - tüm PDF'lerde kullanılabilir
const safeNumber = (value: unknown): number => {
  const num = Number(value);
  return (isNaN(num) || !isFinite(num)) ? 0 : num;
};

const safeFormatCurrency = (value: number): string => {
  const safeVal = safeNumber(value);
  // Daha okunabilir format: binlik ayırıcılar ve 2 ondalık basamak
  const formatted = safeVal.toLocaleString("tr-TR", { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
  return `₺${formatted}`;
};

const drawInfoCard = (
  doc: jsPDF,
  {
    x,
    y,
    width,
    title,
    rows,
  }: { x: number; y: number; width: number; title: string; rows: Array<{ label: string; value?: string }> }
) => {
  const padding = 16;
  const innerWidth = width - padding * 2;
  const preparedRows = rows.map((row) => ({
    label: row.label,
    lines: doc.splitTextToSize(row.value && row.value.trim() ? row.value : "-", innerWidth),
  }));
  const baseHeight = padding + 18;
  const rowsHeight = preparedRows.reduce((sum, row) => sum + 12 + row.lines.length * 14 + 6, 0);
  const height = baseHeight + rowsHeight + padding / 2;

  doc.setFillColor(248, 249, 252);
  doc.setDrawColor(229, 234, 244);
  doc.roundedRect(x, y, width, height, 10, 10, "F");
  doc.roundedRect(x, y, width, height, 10, 10, "S");

  const safeText = createSafeText(doc as jsPDFWithFontStatus);
  let cursorY = y + padding;
  safeText(title, x + padding, cursorY, 12, true);
  cursorY += 18;

  preparedRows.forEach((row) => {
    safeText(row.label.toUpperCase(), x + padding, cursorY, 9, true);
    cursorY += 12;

    row.lines.forEach((line) => {
      safeText(line, x + padding, cursorY, 11, false);
      cursorY += 14;
    });
    cursorY += 6;
  });

  doc.setTextColor(0, 0, 0);
  return height;
};

const drawTermsBlock = (
  doc: jsPDF,
  { x, y, width, terms }: { x: number; y: number; width: number; terms?: string[] }
) => {
  const padding = 16;
  const innerWidth = width - padding * 2;
  const termsList = (terms && terms.length > 0 ? terms : ["Özel şart belirtilmemiştir."]).filter(
    (term) => term && term.trim()
  );
  const termLines = termsList.flatMap((term) => doc.splitTextToSize(`• ${term}`, innerWidth));
  const height = padding * 2 + 18 + termLines.length * 14;

  doc.setFillColor(253, 253, 255);
  doc.setDrawColor(229, 234, 244);
  doc.roundedRect(x, y, width, height, 10, 10, "F");
  doc.roundedRect(x, y, width, height, 10, 10, "S");

  const safeText = createSafeText(doc as jsPDFWithFontStatus);
  let cursorY = y + padding;
  safeText("Şartlar", x + padding, cursorY, 12, true);
  cursorY += 18;

  termLines.forEach((line) => {
    safeText(line, x + padding, cursorY, 11, false);
    cursorY += 14;
  });

  doc.setTextColor(0, 0, 0);
  return height;
};

const drawSummaryBlock = (
  doc: jsPDF,
  {
    x,
    y,
    width,
    totals,
    currency,
    taxRate,
  }: { x: number; y: number; width: number; totals: TotalsSummary; currency: string; taxRate: number }
) => {
  const padding = 16;
  const rows: Array<{ label: string; value: string; isAccent?: boolean }> = [];

  if ((totals.discount || 0) > 0) {
    rows.push({
      label: "Toplam İskonto",
      value: `-${formatCurrency(totals.discount, currency)}`,
      isAccent: true,
    });
  }

  rows.push(
    { label: "Ara Toplam", value: formatCurrency(totals.subtotal, currency) },
    { label: `KDV (%${taxRate || 0})`, value: formatCurrency(totals.tax, currency) }
  );

  const contentHeight = rows.length * 20 + 40;
  const height = padding * 2 + contentHeight + 32;

  doc.setFillColor(248, 249, 252);
  doc.setDrawColor(229, 234, 244);
  doc.roundedRect(x, y, width, height, 10, 10, "F");
  doc.roundedRect(x, y, width, height, 10, 10, "S");

  const safeText = createSafeText(doc as jsPDFWithFontStatus);
  let cursorY = y + padding;
  safeText("Ödeme Özeti", x + padding, cursorY, 12, true);
  cursorY += 18;

  rows.forEach((row) => {
    safeText(row.label, x + padding, cursorY, 10, true);
    
    const valueWidth = doc.getTextWidth(row.value);
    safeText(row.value, x + width - padding - valueWidth, cursorY, row.isAccent ? 11 : 11, row.isAccent);
    cursorY += 20;
  });

  doc.setDrawColor(229, 234, 244);
  doc.line(x + padding, cursorY, x + width - padding, cursorY);
  cursorY += 18;

  safeText("GENEL TOPLAM", x + padding, cursorY, 13, true);

  const grandTotalText = formatCurrency(totals.grandTotal, currency);
  const grandTotalWidth = doc.getTextWidth(grandTotalText);
  safeText(grandTotalText, x + width - padding - grandTotalWidth, cursorY, 16, true);

  doc.setTextColor(0, 0, 0);
  return height;
};

// Header template'i - sabit komponentler + dinamik içerik
const drawPDFHeader = (doc: jsPDFWithFontStatus, template: PDFTemplateLayout, title: string, reportDate: string, startDate?: string, endDate?: string) => {
  const mar = PDF_CONSTANTS.margin;
  const pageWidth = doc.internal.pageSize.getWidth();
  const logoSize = PDF_CONSTANTS.logoSize;
  const [primaryR, primaryG, primaryB] = PDF_CONSTANTS.primaryColor;
  const [mutedR, mutedG, mutedB] = PDF_CONSTANTS.mutedColor;
  
  // Header çizgisi header içeriğinden SONRA çizilecek (drawPDFHeader içinde)
  
  const safeText = createSafeText(doc);
  
  // Font'u Roboto olarak ayarla
  if (doc._robotoFontLoaded && !doc._robotoFontLoadFailed) {
    for (let i = 0; i < 10; i++) {
      try {
        doc.setFont("Roboto", "normal");
        const currentFont = doc.getFont();
        if (currentFont && isRobotoName(currentFont.fontName)) {
          break;
        }
      } catch {
        // Tekrar dene
      }
    }
  }
  
  // YENİ HEADER TASARIMI: Logo sol, Başlık orta, Tarih/Şirket bilgileri sağ
  
  // === SOL TARAF: Logo ve REVIUM (en solda, margin içinde) ===
  const logoX = mar; // En solda, margin'den başlar
  const logoY = 35; // Üstten 35px (25 → 35, üstte ek boşluk)
  const logoFramePadding = 2; // Çerçeve padding'i
  const logoFrameSize = logoSize + (logoFramePadding * 2); // Çerçeve boyutu
  
  // Logo için arka plan kutusu - minimal
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(logoX - logoFramePadding, logoY - logoFramePadding, logoFrameSize, logoFrameSize, 4, 4, "F");
  doc.setDrawColor(primaryR, primaryG, primaryB);
  doc.setGState(doc.GState({ opacity: 0.1 }));
  doc.setLineWidth(1);
  doc.roundedRect(logoX - logoFramePadding, logoY - logoFramePadding, logoFrameSize, logoFrameSize, 4, 4, "S");
  doc.setGState(doc.GState({ opacity: 1 }));
  
  try {
    doc.addImage(REV_LOGO_DATA_URI, 'PNG', logoX, logoY, logoSize, logoSize);
  } catch (error) {
    // Logo eklenemezse sessizce devam et
  }
  
  // REVIUM brand name - logonun ÇERÇEVESİNİN altında ORTALANMIŞ
  doc.setTextColor(primaryR, primaryG, primaryB);
  // REVIUM text genişliğini hesapla ve logonun çerçevesinin ortasına hizala
  if (doc._robotoFontLoaded && !doc._robotoFontLoadFailed) {
    doc.setFont("Roboto", "bold");
    doc.setFontSize(14);
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
  }
  const reviumTextWidth = doc.getTextWidth("REVIUM");
  const reviumX = logoX - logoFramePadding + (logoFrameSize / 2) - (reviumTextWidth / 2); // Çerçeve ortasına hizala
  const reviumY = logoY + logoSize + logoFramePadding + 12; // Logo + çerçeve altından 12px aşağı (6 → 12, daha aşağı)
  safeText("REVIUM", reviumX, reviumY, 14, true);
  doc.setTextColor(0, 0, 0);
  
  // === ORTA TARAF: Başlık (sayfa genişliğinde ortalanmış) ===
  // Başlığı sayfa genişliğinde ortala
  const titleY = 45; // Üstten 45px (35 → 45, üstte ek boşluk)
  
  // Report title - dinamik (sayfa genişliğinde ortada)
  doc.setTextColor(primaryR, primaryG, primaryB);
  if (doc._robotoFontLoaded && !doc._robotoFontLoadFailed) {
    for (let i = 0; i < 10; i++) {
      try {
        doc.setFont("Roboto", "bold");
        const currentFont = doc.getFont();
        if (currentFont && isRobotoName(currentFont.fontName)) {
          break;
        }
      } catch {
        // Tekrar dene
      }
    }
    doc.setFontSize(22);
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
  }
  
  // Başlık genişliğini hesapla ve sayfa genişliğinde ortala
  const titleWidth = doc.getTextWidth(title);
  const titleStartX = (pageWidth - titleWidth) / 2; // Sayfa genişliğinin ortası
  
  safeText(title, titleStartX, titleY, 22, true);
  
  // Title altında ince çizgi
  doc.setDrawColor(primaryR, primaryG, primaryB);
  doc.setGState(doc.GState({ opacity: 0.2 }));
  doc.setLineWidth(1.5);
  doc.line(titleStartX, titleY + 7, titleStartX + titleWidth, titleY + 7);
  doc.setGState(doc.GState({ opacity: 1 }));
  doc.setTextColor(0, 0, 0);
  
  // === SAĞ TARAF: Tarih (en üst) ve Şirket Bilgileri (altında) ===
  const rightSectionX = pageWidth - mar - 200; // Sağdan 200px içeride (taşmaması için)
  let rightSectionY = 30; // En üstten başlar (20 → 30, üstte ek boşluk)
  
  // Telefon numarası genişliğini hesapla (referans pozisyon için - önce hesapla)
  if (doc._robotoFontLoaded && !doc._robotoFontLoadFailed) {
    doc.setFont("Roboto", "normal");
    doc.setFontSize(8);
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
  }
  const phoneText = "+90 (551) 829-1613";
  const phoneTextWidth = doc.getTextWidth(phoneText);
  const phoneX = pageWidth - mar - phoneTextWidth; // Sağa hizalı - referans pozisyon
  
  // "2025" metninin genişliğini hesapla (sağa kaydırma miktarı için)
  if (doc._robotoFontLoaded && !doc._robotoFontLoadFailed) {
    doc.setFont("Roboto", "normal");
    doc.setFontSize(9);
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
  }
  const year2025Width = doc.getTextWidth("2025");
  // Tüm bilgileri "2025" genişliği kadar sağa kaydır
  const rightInfoX = phoneX - year2025Width;
  
  // 1. TARİH BİLGİLERİ - Telefon numarasıyla aynı hizaya alındı, "2025" genişliği kadar sağa kaydırıldı
  doc.setTextColor(mutedR, mutedG, mutedB);
  
  if (startDate && endDate) {
    // Dönem bilgisi - sağa kaydırılmış pozisyon
    safeText(`Dönem: ${formatDateShort(startDate)} - ${formatDateShort(endDate)}`, rightInfoX, rightSectionY, 9, false);
    
    // Rapor tarihi (altında, sağa kaydırılmış pozisyon)
    rightSectionY += 12; // Bir sonraki satır için boşluk
    safeText(`Tarih: ${reportDate}`, rightInfoX, rightSectionY, 9, true);
    
    rightSectionY += 15; // Şirket bilgileri için boşluk
  } else {
    // Sadece rapor tarihi varsa
    safeText(`Tarih: ${reportDate}`, rightInfoX, rightSectionY, 9, true);
    
    rightSectionY += 15; // Şirket bilgileri için boşluk
  }
  
  doc.setTextColor(0, 0, 0);
  
  // 2. ŞİRKET BİLGİLERİ - Tarih altında, YETERLİ BOŞLUKLA (sağa kaydırılmış pozisyon)
  let companyInfoY = rightSectionY; // Tarih bilgilerinden sonra başlar
  
  // Tüm bilgiler sağa kaydırılmış X pozisyonundan hizalı
  doc.setTextColor(mutedR, mutedG, mutedB);
  // Adres - ilk satır (Milenyum Cad. alt satıra alındı)
  safeText("Fevzi Cakmak Mah.", rightInfoX, companyInfoY, 8, false); // Sağa kaydırılmış pozisyon
  companyInfoY += 10; // Satırlar arası boşluk
  safeText("Milenyum Cad. No:81", rightInfoX, companyInfoY, 8, false); // Milenyum Cad. alt satırda
  companyInfoY += 10; // Satırlar arası boşluk
  safeText(COMPANY_INFO.city, rightInfoX, companyInfoY, 8, false); // Sağa kaydırılmış pozisyon
  companyInfoY += 10;
  // Email - alt satırda (sağa kaydırılmış pozisyon)
  safeText("info@reviumtech.com", rightInfoX, companyInfoY, 8, false);
  companyInfoY += 10;
  // Website - alt satırda (sağa kaydırılmış pozisyon)
  safeText("www.reviumtech.com", rightInfoX, companyInfoY, 8, false);
  companyInfoY += 10;
  // Telefon numarası - sağa kaydırılmış pozisyon (ama telefon numarası kendisi sağa hizalı kalacak)
  // Telefon numarasını sağa hizalı tutmak için, rightInfoX'ten başlayıp genişliğini hesaplayarak sağa hizala
  if (doc._robotoFontLoaded && !doc._robotoFontLoadFailed) {
    doc.setFont("Roboto", "normal");
    doc.setFontSize(8);
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
  }
  const phoneXAligned = rightInfoX; // Sağa kaydırılmış pozisyon, ama telefon numarası kendisi sağa hizalı değil, soldan başlıyor
  safeText(phoneText, phoneXAligned, companyInfoY, 8, false);
  doc.setTextColor(0, 0, 0);
  
  // Header'ın son pozisyonunu hesapla (sol taraftaki logo+REVIUM veya sağ taraftaki şirket bilgileri, hangisi daha aşağıdaysa)
  const leftSectionEndY = reviumY + 8; // REVIUM yazısı + boşluk (daha aşağıda olduğu için)
  const headerEndY = Math.max(leftSectionEndY, companyInfoY + 8); // Her iki taraftan da en aşağıdaki pozisyon
  
  // Header alt çizgisi - header içeriğinden SONRA çiz (istatistiklerin üstünde olması için)
  doc.setDrawColor(primaryR, primaryG, primaryB);
  doc.setLineWidth(2);
  doc.line(mar, headerEndY + 5, pageWidth - mar, headerEndY + 5); // Header içeriğinden 5px aşağıda
  
  // Dekoratif çizgi - sabit (daha hafif)
  doc.setDrawColor(primaryR, primaryG, primaryB);
  doc.setGState(doc.GState({ opacity: 0.2 }));
  doc.setLineWidth(1);
  doc.line(mar, headerEndY + 8, pageWidth - mar, headerEndY + 8); // Ana çizgiden 3px aşağıda
  doc.setGState(doc.GState({ opacity: 1 }));
  
  // Template'in contentStartY'sini güncelle - header'dan sonra yeterli boşluk (altında ek boşluk)
  return headerEndY + 50; // Header'dan sonra 50px boşluk (30 → 50, altında ek boşluk, içerik aşağı kaydırıldı)
};

// Footer template'i - sabit komponentler + dinamik sayfa numarası
const drawPDFFooter = (doc: jsPDFWithFontStatus, template: PDFTemplateLayout, pageNumber?: number, totalPages?: number) => {
  const mar = PDF_CONSTANTS.margin;
  const pageWidth = doc.internal.pageSize.getWidth();
  const footerY = template.footer.startY;
  const footerLogoSize = PDF_CONSTANTS.footerLogoSize;
  const [primaryR, primaryG, primaryB] = PDF_CONSTANTS.primaryColor;
  const [mutedR, mutedG, mutedB] = PDF_CONSTANTS.mutedColor;
  
  // Footer üst çizgisi - sabit (daha ince ve profesyonel)
  doc.setDrawColor(primaryR, primaryG, primaryB);
  doc.setLineWidth(1.5); // Daha ince: 2 → 1.5
  doc.line(mar, footerY - 18, pageWidth - mar, footerY - 18);
  
  // Dekoratif çizgi - sabit (daha hafif)
  doc.setDrawColor(primaryR, primaryG, primaryB);
  doc.setGState(doc.GState({ opacity: 0.2 })); // Daha hafif: 0.3 → 0.2
  doc.setLineWidth(1);
  doc.line(mar, footerY - 15, pageWidth - mar, footerY - 15);
  doc.setGState(doc.GState({ opacity: 1 }));
  
  const safeText = createSafeText(doc);
  
  // Footer bilgileri - sol taraf - sabit bilgiler, cache'lenmiş
  doc.setTextColor(mutedR, mutedG, mutedB);
  safeText(COMPANY_INFO.name, mar, footerY, 10, true);
  safeText(COMPANY_INFO.fullAddress, mar, footerY + 12, 9, false);
  safeText(COMPANY_INFO.contactInfo, mar, footerY + 24, 9, false);
  doc.setTextColor(0, 0, 0);
  
  // Sayfa numarası kaldırıldı - kullanıcı isteği
  
  // Footer logo - sabit komponent
  const footerLogoX = pageWidth - mar - footerLogoSize - 120;
  const footerLogoY = footerY - 3;
  
  // Logo için arka plan kutusu - sabit
  try {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(footerLogoX - 3, footerLogoY - 3, footerLogoSize + 6, footerLogoSize + 6, 4, 4, "F");
    doc.setDrawColor(primaryR, primaryG, primaryB);
    doc.setGState(doc.GState({ opacity: 0.2 }));
    doc.setLineWidth(1);
    doc.roundedRect(footerLogoX - 3, footerLogoY - 3, footerLogoSize + 6, footerLogoSize + 6, 4, 4, "S");
    doc.setGState(doc.GState({ opacity: 1 }));
    
    try {
      doc.addImage(REV_LOGO_DATA_URI, 'PNG', footerLogoX, footerLogoY, footerLogoSize, footerLogoSize);
    } catch (error) {
      // Logo eklenemezse sessizce devam et
    }
    
    doc.setTextColor(primaryR, primaryG, primaryB);
    safeText("REVIUM", footerLogoX + footerLogoSize + 8, footerY + 10, 12, true);
    doc.setTextColor(0, 0, 0);
  } catch (logoError) {
  }
};

// PDF Template sistemi - tüm sayfalar için sabit layout
const applyPDFTemplate = (
  doc: jsPDFWithFontStatus,
  title: string,
  reportDate: string,
  startDate?: string,
  endDate?: string
): PDFTemplateLayout => {
  // Template layout'u oluştur
  const template = createPDFTemplate(doc);
  
  // Arka planı çiz (sabit)
  drawPDFBackground(doc, template);
  
  // Header'ı çiz (sabit + dinamik)
  const contentStartY = drawPDFHeader(doc, template, title, reportDate, startDate, endDate);
  
  // Content area'yı güncelle (header'dan sonraki gerçek başlangıç pozisyonu)
  template.contentArea.startY = contentStartY;
  
  return template;
};

// Yeni sayfa için template uygula
const applyPDFTemplateToNewPage = (doc: jsPDFWithFontStatus, template: PDFTemplateLayout) => {
  // Yeni sayfa için template'i yeniden hesapla
  const newTemplate = createPDFTemplate(doc);
  
  // Arka planı çiz
  drawPDFBackground(doc, newTemplate);
  
  // Header'ı çiz (sadece sabit kısımlar, dinamik içerik yok)
  const mar = PDF_CONSTANTS.margin;
  const pageWidth = doc.internal.pageSize.getWidth();
  const logoSize = PDF_CONSTANTS.logoSize;
  const [primaryR, primaryG, primaryB] = PDF_CONSTANTS.primaryColor;
  const [mutedR, mutedG, mutedB] = PDF_CONSTANTS.mutedColor;
  
  // Header alt çizgisi
  doc.setDrawColor(primaryR, primaryG, primaryB);
  doc.setLineWidth(3);
  doc.line(mar, newTemplate.header.endY, pageWidth - mar, newTemplate.header.endY);
  
  // Logo ve şirket bilgileri (sadece sabit kısımlar)
  const rightX = pageWidth - mar - 200;
  const logoY = 28;
  
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(rightX - 5, logoY - 5, logoSize + 10, logoSize + 10, 4, 4, "F");
  doc.setDrawColor(primaryR, primaryG, primaryB);
  doc.setGState(doc.GState({ opacity: 0.1 })); // Daha hafif: 0.2 → 0.1
  doc.setLineWidth(1);
  doc.roundedRect(rightX - 5, logoY - 5, logoSize + 10, logoSize + 10, 4, 4, "S");
  doc.setGState(doc.GState({ opacity: 1 }));
  
  try {
    doc.addImage(REV_LOGO_DATA_URI, 'PNG', rightX, logoY, logoSize, logoSize);
  } catch (error) {
    // Logo eklenemezse sessizce devam et
  }
  
  const safeText = createSafeText(doc);
  doc.setTextColor(primaryR, primaryG, primaryB);
  safeText("REVIUM", rightX + logoSize + 10, 58, 24, true);
  doc.setTextColor(mutedR, mutedG, mutedB);
  safeText(COMPANY_INFO.headerAddress, rightX, 75, 10, false);
  safeText(COMPANY_INFO.city, rightX, 87, 10, false);
  safeText(COMPANY_INFO.contactInfo, rightX, 99, 10, false);
  doc.setTextColor(0, 0, 0);
  
  return newTemplate;
};

interface SalesReportData {
  totalRevenue?: number;
  totalOrders?: number;
  activeCustomers?: number;
  avgOrderValue?: number; // Web sayfasından gelen hesaplanmış değer
  orders?: Array<{
    status?: string;
    total?: number;
    totalAmount?: number;
    total_amount?: number;
    subtotal?: number;
  }>;
  topProducts?: Array<{
    name?: string;
    quantity?: number;
    revenue?: number;
  }>;
}

export const generateSalesReportPDF = async (data: SalesReportData, startDate: string, endDate: string) => {
  const doc = createPdf({ format: "a4", unit: "pt" });
  
  // Font'u MUTLAKA yükle - daha agresif yaklaşım
  try {
  await registerFonts(doc);
  } catch (fontError) {
    // Font yükleme hatası, tekrar dene
    try {
      await registerFonts(doc);
    } catch (retryError) {
      // İkinci deneme de başarısız, devam et
    }
  }
  
  // Font'un gerçekten yüklendiğini doğrula - daha agresif kontrol
  if (!doc._robotoFontLoaded || doc._robotoFontLoadFailed) {
    // Font yüklenemedi, tekrar dene
    try {
      await registerFonts(doc);
    } catch (retryError) {
      // Font yüklenemedi, devam et
    }
  }
  
  // Font'u zorla Roboto olarak ayarla
  if (doc._robotoFontLoaded && !doc._robotoFontLoadFailed) {
    for (let i = 0; i < 10; i++) {
      try {
        doc.setFont("Roboto", "normal");
      const currentFont = doc.getFont();
      if (currentFont && isRobotoName(currentFont.fontName)) {
        break;
      }
      } catch {
        // Tekrar dene
    }
    }
  }
  
  applyDocumentTypography(doc);
  
  const reportDate = formatDate(new Date().toISOString());
  
  // PDF Template'i uygula - sabit layout + dinamik içerik
  const template = applyPDFTemplate(doc, "SATIŞ RAPORU", reportDate, startDate, endDate);
  
  // Font'u tekrar kontrol et ve ayarla
  if (doc._robotoFontLoaded && !doc._robotoFontLoadFailed) {
    for (let i = 0; i < 5; i++) {
      try {
        doc.setFont("Roboto", "normal");
    const currentFont = doc.getFont();
        if (currentFont && isRobotoName(currentFont.fontName)) {
          break;
        }
      } catch {
        // Tekrar dene
      }
    }
  }
  
  // Dinamik içerik alanından başla (iyileştirilmiş spacing)
  let currentY = template.contentArea.startY + 5; // Header'dan sonra ekstra 5px boşluk
  const contentWidth = template.contentArea.width;
  const mar = template.contentArea.leftMargin;
  
  const safeText = createSafeText(doc);
  const [primaryR, primaryG, primaryB] = PDF_CONSTANTS.primaryColor;
  const [mutedR, mutedG, mutedB] = PDF_CONSTANTS.mutedColor;
  
  // İstatistik Kartları - Sabit tasarım, dinamik değerler (standardize edilmiş)
  const cardDimensions = calculateCardDimensions(contentWidth, 3);
  const cardWidth = cardDimensions.width;
  const cardGap = cardDimensions.gap;
  const cardHeight = PDF_CONSTANTS.cardHeight;
  let cardX = mar;
  
  // Kart 1: Toplam Gelir - Web sayfasındaki gibi (aynı veriler)
  const totalRevenue = safeNumber(data.totalRevenue);
  // Web sayfasında avgOrderValue zaten hesaplanmış geliyor, aynısını kullan
  const avgOrderValue = safeNumber(data.avgOrderValue ?? (data.totalOrders && data.totalOrders > 0 ? totalRevenue / data.totalOrders : 0));
  drawStatCard(doc, cardX, currentY, cardWidth, cardHeight, {
    title: "Toplam Gelir",
    value: safeFormatCurrency(totalRevenue),
    description: `Ortalama: ${safeFormatCurrency(avgOrderValue)}`,
    color: {
      background: TAILWIND_COLORS.primaryCardBg,
      border: TAILWIND_COLORS.primaryCardBorder,
      text: TAILWIND_COLORS.cardText,
      value: TAILWIND_COLORS.primaryCardValue,
    },
  });
  
  // Kart 2: Toplam Sipariş - profesyonel ve minimal (info)
  cardX += cardWidth + cardGap;
  const totalOrders = safeNumber(data.totalOrders);
  drawStatCard(doc, cardX, currentY, cardWidth, cardHeight, {
    title: "Toplam Sipariş",
    value: totalOrders.toString(),
    description: "Tarih aralığında",
    color: {
      background: TAILWIND_COLORS.infoCardBg,
      border: TAILWIND_COLORS.infoCardBorder,
      text: TAILWIND_COLORS.cardText,
      value: TAILWIND_COLORS.infoCardValue,
    },
  });
  
  // Kart 3: Aktif Müşteri - profesyonel ve minimal (success)
  cardX += cardWidth + cardGap;
  const activeCustomers = safeNumber(data.activeCustomers);
  drawStatCard(doc, cardX, currentY, cardWidth, cardHeight, {
    title: "Aktif Müşteri",
    value: activeCustomers.toString(),
    description: "Sipariş veren müşteri",
    color: {
      background: TAILWIND_COLORS.successCardBg,
      border: TAILWIND_COLORS.successCardBorder,
      text: TAILWIND_COLORS.cardText,
      value: TAILWIND_COLORS.successCardValue,
    },
  });
  
  currentY += cardHeight + PDF_CONSTANTS.sectionSpacing + 5; // Kartlar ve tablolar arası boşluk - iyileştirilmiş (ekstra 5px)
  
  // Sipariş Durumu Dağılımı Tablosu - sabit başlık tasarımı (iyileştirilmiş)
  if (data.orders && data.orders.length > 0) {
    // Tablolar arası boşluk kontrolü
    currentY = ensureSpace(doc, currentY, 200, mar, "Sipariş Durumu Dağılımı");
    currentY = drawTableHeader(doc, mar, currentY, 300, {
      title: "Sipariş Durumu Dağılımı",
      backgroundColor: TAILWIND_COLORS.gray50, // Web: bg-[rgb(249,250,251)]
      textColor: PDF_CONSTANTS.primaryColor, // Web: text-primary
      borderColor: [229, 231, 235], // Web: border-b (gray200)
    });
    
    const statusMap = new Map<string, { count: number; total: number }>();
    data.orders?.forEach((order) => {
      const status = order.status || "Bilinmeyen";
      const total = safeNumber(order.total ?? order.totalAmount ?? order.total_amount ?? order.subtotal ?? 0);
      if (!statusMap.has(status)) {
        statusMap.set(status, { count: 0, total: 0 });
      }
      const stat = statusMap.get(status)!;
      stat.count += 1;
      stat.total += total;
    });
    
    const statusLabels: Record<string, string> = {
      draft: "Taslak",
      pending: "Beklemede",
      confirmed: "Onaylandı",
      planned: "Planlandı",
      in_production: "Üretimde",
      in_progress: "Üretimde",
      quality_check: "Kalite Kontrol",
      on_hold: "Beklemede",
      completed: "Tamamlandı",
      shipped: "Kargoda",
      delivered: "Teslim Edildi",
      cancelled: "İptal",
    };
    
    const totalOrders = data.orders.length;
    const statusTableData = Array.from(statusMap.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .map(([status, data]) => [
        statusLabels[status] || status,
        data.count.toString(),
        safeFormatCurrency(data.total),
        totalOrders > 0 ? `${((data.count / totalOrders) * 100).toFixed(1)}%` : "0%"
      ]);
    
    // Profesyonel tablo stilleri kullan - Web sayfasındaki gibi
    const tableStyles = createProfessionalTableStyles(doc, {
      headerFontSize: 12,
      bodyFontSize: 11,
      cellPadding: { top: 12, right: 14, bottom: 12, left: 14 }
    });
    // Web sayfasındaki tablo stilleri (zaten createProfessionalTableStyles'da ayarlandı)
    tableStyles.bodyStyles.overflow = 'linebreak';
    tableStyles.styles.overflow = 'linebreak';
    
    // Sayfa sığma kontrolü
    currentY = ensureTableFitsPage(doc, currentY, 200, mar, "Sipariş Durumu Dağılımı");
    
    // Tablo genişliğini sayfa genişliğine göre ayarla
    const currentPageWidth = doc.internal.pageSize.getWidth();
    const tableWidth = currentPageWidth - (mar * 2);
    
    // Font'u zorla Roboto olarak ayarla (autoTable öncesi)
    forceRobotoFont(doc, "normal");
    
    autoTable(doc, {
      startY: currentY,
      head: transliterateTableData([['Durum', 'Sipariş Sayısı', 'Toplam Tutar', 'Oran']]),
      body: transliterateTableData(statusTableData),
      margin: { left: mar, right: mar },
      tableWidth: tableWidth,
      willDrawCell: createWillDrawCell(doc),
      ...tableStyles,
      columnStyles: {
        0: { cellWidth: tableWidth * 0.35, halign: "center", overflow: 'linebreak', fontStyle: "normal" }, // Ortalanmış
        1: { cellWidth: tableWidth * 0.20, halign: "center", fontStyle: "bold" }, // Ortalanmış
        2: { cellWidth: tableWidth * 0.25, halign: "center", fontStyle: "bold", textColor: PDF_CONSTANTS.primaryColor }, // Ortalanmış
        3: { cellWidth: tableWidth * 0.20, halign: "center", fontStyle: "bold", textColor: [107, 114, 128] }, // Ortalanmış
      },
    });
    
    // Tablo sonrası currentY'yi güvenli şekilde güncelle - yeterli boşluk
    const tableEndY = doc.lastAutoTable?.finalY;
    if (tableEndY && tableEndY > currentY) {
      currentY = tableEndY + PDF_CONSTANTS.tableSpacing; // Tablo sonrası boşluk - standardize edilmiş
    } else {
      currentY += PDF_CONSTANTS.tableSpacing; // Fallback: eğer lastAutoTable yoksa
    }
  }
  
  // En Çok Satan Ürünler Tablosu - sabit başlık tasarımı
  if (data.topProducts && data.topProducts.length > 0) {
    // Tablolar arası boşluk kontrolü
    currentY = ensureSpace(doc, currentY, 200, mar, "En Çok Satan Ürünler");
    currentY = drawTableHeader(doc, mar, currentY, 300, {
      title: "En Çok Satan Ürünler",
      backgroundColor: TAILWIND_COLORS.gray50, // Web: bg-[rgb(249,250,251)]
      textColor: PDF_CONSTANTS.primaryColor, // Web: text-primary
      borderColor: [229, 231, 235], // Web: border-b (gray200)
    });
    
    // Web sayfasındaki gibi - sadece ilk 10 ürün, TOPLAM satırı yok
    const topProductsData = data.topProducts?.slice(0, 10).map((p, index: number) => [
      `#${index + 1}`,
      p.name || '-',
      safeNumber(p.quantity).toString(),
      safeFormatCurrency(safeNumber(p.revenue))
    ]) || [];
    
    // Profesyonel tablo stilleri kullan - Web sayfasındaki gibi
    const tableStyles2 = createProfessionalTableStyles(doc, {
      headerFontSize: 12,
      bodyFontSize: 11,
      cellPadding: { top: 12, right: 14, bottom: 12, left: 14 }
    });
    // Web sayfasındaki tablo stilleri (zaten createProfessionalTableStyles'da ayarlandı)
    tableStyles2.bodyStyles.overflow = 'linebreak';
    tableStyles2.styles.overflow = 'linebreak';
    
    // Sayfa sığma kontrolü
    currentY = ensureTableFitsPage(doc, currentY, 200, mar, "En Çok Satan Ürünler");
    
    // Tablo genişliğini sayfa genişliğine göre ayarla
    const currentPageWidth2 = doc.internal.pageSize.getWidth();
    const tableWidth2 = currentPageWidth2 - (mar * 2);
    
    // Font'u zorla Roboto olarak ayarla (autoTable öncesi)
    forceRobotoFont(doc, "normal");
    
    autoTable(doc, {
      startY: currentY,
      head: transliterateTableData([['Sıra', 'Ürün Adı', 'Adet', 'Gelir']]),
      body: transliterateTableData(topProductsData),
      margin: { left: mar, right: mar },
      tableWidth: tableWidth2,
      willDrawCell: createWillDrawCell(doc),
      ...tableStyles2,
      columnStyles: {
        0: { cellWidth: tableWidth2 * 0.10, halign: "center", fontStyle: "normal", textColor: [107, 114, 128] }, // Ortalanmış
        1: { cellWidth: tableWidth2 * 0.50, halign: "center", fontStyle: "normal", overflow: 'linebreak' }, // Ortalanmış
        2: { cellWidth: tableWidth2 * 0.15, halign: "center", fontStyle: "bold" }, // Ortalanmış
        3: { cellWidth: tableWidth2 * 0.25, halign: "center", fontStyle: "bold", textColor: PDF_CONSTANTS.primaryColor }, // Ortalanmış
      },
    });
    
    // Tablo sonrası currentY'yi güvenli şekilde güncelle
    const tableEndY2 = doc.lastAutoTable?.finalY;
    if (tableEndY2 && tableEndY2 > currentY) {
      currentY = tableEndY2 + PDF_CONSTANTS.tableSpacing;
    } else {
      currentY += PDF_CONSTANTS.tableSpacing;
    }
  }
  
  // Web sayfasında sadece 3 bölüm var: Kartlar, Sipariş Durumu Dağılımı, En Çok Satan Ürünler
  // Ekstra bölümler (Müşteri Bazlı Analiz, Zaman Bazlı Analiz, Özet) kaldırıldı
  
  // Sayfa numaralarını ekle - template footer kullan
  try {
    const totalPages = doc.internal.pages.length - 1;
    if (totalPages > 0) {
      for (let i = 1; i <= totalPages; i++) {
        try {
          doc.setPage(i);
          const pageTemplate = createPDFTemplate(doc);
          drawPDFFooter(doc, pageTemplate, i, totalPages);
        } catch (pageError) {
          // Devam et, diğer sayfaları eklemeye çalış
        }
      }
    }
  } catch (footerError) {
    // Footer hatası kritik değil, PDF'i yine de döndür
  }
  
  // PDF'i güvenli bir şekilde oluştur
  try {
    const blob = doc.output('blob');
    if (!blob || blob.size === 0) {
      throw new Error("PDF blob boş veya geçersiz");
    }
    return blob;
  } catch (outputError) {
    throw new Error("PDF oluşturulamadı: " + (outputError instanceof Error ? outputError.message : "Bilinmeyen hata"));
  }
};

interface ProductionReportData {
  totalOrders?: number;
  completed?: number;
  completionRate?: number;
  statusDistribution?: Record<string, number>;
  topProducts?: Array<{
    name?: string;
    quantity?: number;
    orders?: number;
  }>;
}

export const generateProductionReportPDF = async (data: ProductionReportData, startDate: string, endDate: string) => {
  const doc = createPdf({ format: "a4", unit: "pt" });
  
  // Font'u MUTLAKA yükle - daha agresif yaklaşım
  try {
  await registerFonts(doc);
  } catch (fontError) {
    // Font yükleme hatası, tekrar dene
    try {
      await registerFonts(doc);
    } catch (retryError) {
      // İkinci deneme de başarısız, devam et
    }
  }
  
  // Font'un gerçekten yüklendiğini doğrula - daha agresif kontrol
  if (!doc._robotoFontLoaded || doc._robotoFontLoadFailed) {
    // Font yüklenemedi, tekrar dene
    try {
      await registerFonts(doc);
    } catch (retryError) {
      // Font yüklenemedi, devam et
    }
  }
  
  // Font'u zorla Roboto olarak ayarla
  if (doc._robotoFontLoaded && !doc._robotoFontLoadFailed) {
    for (let i = 0; i < 10; i++) {
      try {
        doc.setFont("Roboto", "normal");
      const currentFont = doc.getFont();
      if (currentFont && isRobotoName(currentFont.fontName)) {
        break;
      }
      } catch {
        // Tekrar dene
    }
    }
  }
  
  applyDocumentTypography(doc);
  
  const reportDate = formatDate(new Date().toISOString()); // Dinamik
  
  // PDF Template'i uygula
  const template = applyPDFTemplate(doc, "ÜRETİM RAPORU", reportDate, startDate, endDate);
  
  // Font'u tekrar kontrol et ve ayarla
  if (doc._robotoFontLoaded && !doc._robotoFontLoadFailed) {
    for (let i = 0; i < 5; i++) {
      try {
        doc.setFont("Roboto", "normal");
    const currentFont = doc.getFont();
        if (currentFont && isRobotoName(currentFont.fontName)) {
          break;
        }
      } catch {
        // Tekrar dene
      }
    }
  }
  
  // Dinamik içerik alanından başla
  let currentY = template.contentArea.startY;
  const contentWidth = template.contentArea.width;
  const mar = template.contentArea.leftMargin;
  
  const safeText = createSafeText(doc);
  const [primaryR, primaryG, primaryB] = PDF_CONSTANTS.primaryColor;
  const [mutedR, mutedG, mutedB] = PDF_CONSTANTS.mutedColor;
  
  // İstatistik Kartları - Profesyonel tasarım, dinamik değerler
  const cardWidth = (contentWidth - 32) / 3;
  const cardHeight = 110; // Daha ferah: 100 → 110
  const cardGap = 16;
  let cardX = mar;
  
  // Kart 1: Toplam Sipariş - profesyonel ve sade
  const totalOrders = safeNumber(data.totalOrders);
  drawStatCard(doc, cardX, currentY, cardWidth, cardHeight, {
    title: "Toplam Sipariş",
    value: totalOrders.toString(),
    description: "Tarih aralığında",
    color: {
      background: TAILWIND_COLORS.infoCardBg,
      border: TAILWIND_COLORS.infoCardBorder,
      text: TAILWIND_COLORS.cardText,
      value: TAILWIND_COLORS.infoCardValue,
    },
  });
  
  // Kart 2: Tamamlanan - profesyonel ve sade
  cardX += cardWidth + cardGap;
  const completed = safeNumber(data.completed);
  drawStatCard(doc, cardX, currentY, cardWidth, cardHeight, {
    title: "Tamamlanan",
    value: completed.toString(),
    description: "Başarıyla tamamlandı",
    color: {
      background: TAILWIND_COLORS.successCardBg,
      border: TAILWIND_COLORS.successCardBorder,
      text: TAILWIND_COLORS.cardText,
      value: TAILWIND_COLORS.successCardValue,
    },
  });
  
  // Kart 3: Tamamlanma Oranı - profesyonel ve sade
  cardX += cardWidth + cardGap;
  const completionRate = safeNumber(data.completionRate);
  drawStatCard(doc, cardX, currentY, cardWidth, cardHeight, {
    title: "Tamamlanma Oranı",
    value: `${completionRate.toFixed(1)}%`,
    description: "Başarı oranı",
    color: {
      background: TAILWIND_COLORS.primaryCardBg,
      border: TAILWIND_COLORS.primaryCardBorder,
      text: TAILWIND_COLORS.cardText,
      value: TAILWIND_COLORS.primaryCardValue,
    },
  });
  
  currentY += cardHeight + PDF_CONSTANTS.sectionSpacing; // Kartlar ve tablolar arası boşluk - standardize edilmiş
  
  // Durum Dağılımı Tablosu - sabit başlık tasarımı
  if (data.statusDistribution) {
    // Tablolar arası boşluk kontrolü
    currentY = ensureSpace(doc, currentY, 200, mar, "Durum Dağılımı");
    currentY = drawTableHeader(doc, mar, currentY, 250, {
      title: "Durum Dağılımı",
      backgroundColor: [249, 250, 251],
      textColor: PDF_CONSTANTS.primaryColor,
      borderColor: PDF_CONSTANTS.primaryColor,
    });
    
    const statusLabels: Record<string, string> = {
      planned: "Planlandı",
      in_production: "Üretimde",
      quality_check: "Kalite Kontrol",
      completed: "Tamamlandı",
      on_hold: "Beklemede"
    };
    
    const totalOrders = safeNumber(data.totalOrders);
    const statusData = Object.entries(data.statusDistribution)
      .filter(([_, value]) => safeNumber(value as number) > 0)
      .sort((a, b) => safeNumber(b[1] as number) - safeNumber(a[1] as number))
      .map(([key, value]) => {
        const count = safeNumber(value as number);
        const percentage = totalOrders > 0 ? `${((count / totalOrders) * 100).toFixed(1)}%` : "0%";
        return [
          statusLabels[key] || key,
          count.toString(),
          percentage
        ];
      });
    
    // Profesyonel tablo stilleri kullan
    const tableStyles = createProfessionalTableStyles(doc, {
      headerFontSize: 12,
      bodyFontSize: 11,
      cellPadding: { top: 12, right: 14, bottom: 12, left: 14 }
    });
    // Header rengi zaten createProfessionalTableStyles'da primaryColor olarak ayarlandı
    // Burada override etmeye gerek yok, ama tutarlılık için bırakıyoruz
    tableStyles.headStyles.fillColor = PDF_CONSTANTS.primaryColor;
    tableStyles.headStyles.textColor = [255, 255, 255];
    tableStyles.headStyles.halign = "center";
    tableStyles.bodyStyles.overflow = 'linebreak';
    tableStyles.styles.overflow = 'linebreak';
    
    // Sayfa sığma kontrolü
    currentY = ensureTableFitsPage(doc, currentY, 200, mar, "Durum Dağılımı");
    
    // Tablo genişliğini sayfa genişliğine göre ayarla
    const currentPageWidth = doc.internal.pageSize.getWidth();
    const tableWidth = currentPageWidth - (mar * 2);
    
    // Font'u zorla Roboto olarak ayarla (autoTable öncesi)
    forceRobotoFont(doc, "normal");
    
    autoTable(doc, {
      startY: currentY,
      head: transliterateTableData([['Durum', 'Sipariş Sayısı', 'Oran']]),
      body: transliterateTableData(statusData),
      margin: { left: mar, right: mar },
      tableWidth: tableWidth,
      willDrawCell: createWillDrawCell(doc),
      ...tableStyles,
      columnStyles: {
        0: { cellWidth: tableWidth * 0.50, halign: "left", overflow: 'linebreak' }, // %50
        1: { cellWidth: tableWidth * 0.25, halign: "right", fontStyle: "bold" }, // %25
        2: { cellWidth: tableWidth * 0.25, halign: "right", fontStyle: "bold", textColor: [107, 114, 128] }, // %25
      },
    });
    
    // Tablo sonrası currentY'yi güvenli şekilde güncelle - yeterli boşluk
    const tableEndY = doc.lastAutoTable?.finalY;
    if (tableEndY && tableEndY > currentY) {
      currentY = tableEndY + PDF_CONSTANTS.tableSpacing; // Tablo sonrası boşluk - standardize edilmiş
    } else {
      currentY += PDF_CONSTANTS.tableSpacing; // Fallback: eğer lastAutoTable yoksa
    }
  }
  
  // En Çok Üretilen Ürünler - daha vurgulu başlık
  if (data.topProducts && data.topProducts.length > 0) {
    // Tablo genişliğini sayfa genişliğine göre ayarla
    const pageWidthProd = doc.internal.pageSize.getWidth();
    const tableWidthProd = pageWidthProd - (mar * 2);
    
    // Tablolar arası boşluk kontrolü
    currentY = ensureSpace(doc, currentY, 200, mar, "En Çok Üretilen Ürünler");
    currentY = drawTableHeader(doc, mar, currentY, tableWidthProd, {
      title: "En Çok Üretilen Ürünler",
      backgroundColor: [249, 250, 251],
      textColor: PDF_CONSTANTS.primaryColor,
      borderColor: PDF_CONSTANTS.primaryColor,
    });
    
    const topProductsData = data.topProducts?.slice(0, 10).map((p, index: number) => [
      `#${index + 1}`,
      p.name || '-',
      safeNumber(p.quantity).toString(),
      safeNumber(p.orders).toString()
    ]);
    
    // Özet satırı ekle
    const totalQuantity = data.topProducts?.slice(0, 10).reduce((sum: number, p) => sum + safeNumber(p.quantity), 0) || 0;
    const totalOrders = data.topProducts?.slice(0, 10).reduce((sum: number, p) => sum + safeNumber(p.orders), 0) || 0;
    topProductsData.push([
      'TOPLAM',
      '',
      totalQuantity.toString(),
      totalOrders.toString()
    ]);
    
    // Profesyonel tablo stilleri kullan
    const tableStyles2 = createProfessionalTableStyles(doc, {
      headerFontSize: 12,
      bodyFontSize: 11,
      cellPadding: { top: 12, right: 14, bottom: 12, left: 14 }
    });
    tableStyles2.headStyles.fillColor = [59, 130, 246];
    tableStyles2.headStyles.textColor = [255, 255, 255];
    tableStyles2.headStyles.halign = "center";
    tableStyles2.bodyStyles.overflow = 'linebreak';
    tableStyles2.styles.overflow = 'linebreak';
    
    // Sayfa sığma kontrolü
    currentY = ensureTableFitsPage(doc, currentY, 200, mar, "En Çok Üretilen Ürünler");
    
    // Tablo genişliğini sayfa genişliğine göre ayarla
    const currentPageWidth2 = doc.internal.pageSize.getWidth();
    const tableWidth2 = currentPageWidth2 - (mar * 2);
    
    // Font'u zorla Roboto olarak ayarla (autoTable öncesi)
    forceRobotoFont(doc, "normal");
    
    autoTable(doc, {
      startY: currentY,
      head: transliterateTableData([['Sıra', 'Ürün Adı', 'Miktar', 'Sipariş Sayısı']]),
      body: transliterateTableData(topProductsData),
      margin: { left: mar, right: mar },
      tableWidth: tableWidth2,
      willDrawCell: createWillDrawCell(doc),
      ...tableStyles2,
      columnStyles: {
        0: { cellWidth: tableWidth2 * 0.10, halign: "left", textColor: [107, 114, 128] }, // %10
        1: { cellWidth: tableWidth2 * 0.50, halign: "left", overflow: 'linebreak' }, // %50
        2: { cellWidth: tableWidth2 * 0.20, halign: "right", fontStyle: "bold" }, // %20
        3: { cellWidth: tableWidth2 * 0.20, halign: "right", fontStyle: "bold" }, // %20
      },
    });
    
    // Tablo sonrası currentY'yi güvenli şekilde güncelle - yeterli boşluk
    const tableEndY = doc.lastAutoTable?.finalY;
    if (tableEndY && tableEndY > currentY) {
      currentY = tableEndY + PDF_CONSTANTS.tableSpacing; // Tablo sonrası boşluk - standardize edilmiş
    } else {
      currentY += PDF_CONSTANTS.tableSpacing; // Fallback: eğer lastAutoTable yoksa
    }
  }
  
  // Üretim Verimliliği Analizi - Yeni detaylı bölüm
  if (data.topProducts && data.topProducts.length > 0) {
    currentY = ensureSpace(doc, currentY, 200, mar, "Üretim Verimliliği");
    
    const efficiencyData = data.topProducts?.slice(0, 10).map((p, index: number) => {
      const quantity = safeNumber(p.quantity);
      const orders = safeNumber(p.orders);
      const avgPerOrder = orders > 0 ? (quantity / orders).toFixed(1) : "0";
      const productName = (p.name || '-').length > 25 ? (p.name || '-').substring(0, 25) + "..." : (p.name || '-');
      return [
        `#${index + 1}`,
        productName,
        quantity.toString(),
        orders.toString(),
        avgPerOrder
      ];
    });
    
    // Tablo genişliğini sayfa genişliğine göre ayarla
    const pageWidth3 = doc.internal.pageSize.getWidth();
    const tableWidth3 = pageWidth3 - (mar * 2);
    
    // Tablolar arası boşluk kontrolü
    currentY = ensureSpace(doc, currentY, 200, mar, "Ürün Bazlı Üretim Verimliliği");
    currentY = drawTableHeader(doc, mar, currentY, tableWidth3, {
      title: "Ürün Bazlı Üretim Verimliliği",
      backgroundColor: [249, 250, 251],
      textColor: PDF_CONSTANTS.primaryColor,
      borderColor: PDF_CONSTANTS.primaryColor,
    });
    
    // Profesyonel tablo stilleri kullan
    const tableStyles3 = createProfessionalTableStyles(doc, {
      headerFontSize: 12,
      bodyFontSize: 11,
      cellPadding: { top: 12, right: 14, bottom: 12, left: 14 }
    });
    tableStyles3.headStyles.fillColor = [59, 130, 246];
    tableStyles3.headStyles.textColor = [255, 255, 255];
    tableStyles3.headStyles.halign = "center";
    tableStyles3.bodyStyles.overflow = 'linebreak';
    tableStyles3.styles.overflow = 'linebreak';
    
    // Sayfa sığma kontrolü
    currentY = ensureTableFitsPage(doc, currentY, 200, mar, "Ürün Bazlı Üretim Verimliliği");
    
    // Tablo genişliğini sayfa genişliğine göre ayarla
    const currentPageWidth3 = doc.internal.pageSize.getWidth();
    const currentTableWidth3 = currentPageWidth3 - (mar * 2);
    
    autoTable(doc, {
      startY: currentY,
      head: transliterateTableData([['Sıra', 'Ürün', 'Toplam Miktar', 'Sipariş', 'Ortalama/Sipariş']]),
      body: transliterateTableData(efficiencyData),
      margin: { left: mar, right: mar },
      tableWidth: currentTableWidth3,
      willDrawCell: createWillDrawCell(doc),
      ...tableStyles3,
      columnStyles: {
        0: { cellWidth: currentTableWidth3 * 0.08, halign: "left", textColor: [107, 114, 128] }, // %8
        1: { cellWidth: currentTableWidth3 * 0.40, halign: "left", overflow: 'linebreak' }, // %40
        2: { cellWidth: currentTableWidth3 * 0.18, halign: "right", fontStyle: "bold" }, // %18
        3: { cellWidth: currentTableWidth3 * 0.15, halign: "right", fontStyle: "bold" }, // %15
        4: { cellWidth: currentTableWidth3 * 0.19, halign: "right", textColor: [107, 114, 128] }, // %19
      },
    });
    
    // Tablo sonrası currentY'yi güvenli şekilde güncelle - yeterli boşluk
    const tableEndY = doc.lastAutoTable?.finalY;
    if (tableEndY && tableEndY > currentY) {
      currentY = tableEndY + PDF_CONSTANTS.tableSpacing; // Tablo sonrası boşluk - standardize edilmiş
    } else {
      currentY += PDF_CONSTANTS.tableSpacing; // Fallback: eğer lastAutoTable yoksa
    }
  }
  
  // Özet Bölümü - sabit tasarım, dinamik veriler
  currentY = (doc.lastAutoTable?.finalY || currentY) + 50; // Optimize edilmiş boşluk: 50pt
  currentY = ensureSpace(doc, currentY, 100, mar, "Özet");
  
  const onHold = safeNumber((data as any).onHold || 0);
  const inProduction = safeNumber((data as any).inProduction || 0);
  const planned = safeNumber(data.statusDistribution?.planned || 0);
  const qualityCheck = safeNumber(data.statusDistribution?.quality_check || 0);
  
  const summaryData: Array<[string, string]> = [
    ['Toplam Sipariş', totalOrders.toString()],
    ['Tamamlanan', completed.toString()],
    ['Tamamlanma Oranı', `${completionRate.toFixed(1)}%`],
    ['Beklemede', onHold.toString()],
    ['Üretimde', inProduction.toString()],
    ['Planlandı', planned.toString()],
    ['Kalite Kontrol', qualityCheck.toString()],
    ['En Çok Üretilen Ürün Sayısı', data.topProducts ? data.topProducts.length.toString() : "0"],
  ];
  
  currentY = drawSummarySection(doc, mar, currentY, contentWidth, "Rapor Özeti", summaryData, [37, 99, 235]);
  
  // Sayfa numaralarını ekle - template footer kullan
  try {
    const totalPages = doc.internal.pages.length - 1;
    if (totalPages > 0) {
      for (let i = 1; i <= totalPages; i++) {
        try {
          doc.setPage(i);
          const pageTemplate = createPDFTemplate(doc);
          drawPDFFooter(doc, pageTemplate, i, totalPages);
        } catch (pageError) {
          // Devam et, diğer sayfaları eklemeye çalış
        }
      }
    }
  } catch (footerError) {
    // Footer hatası kritik değil, PDF'i yine de döndür
  }
  
  // PDF'i güvenli bir şekilde oluştur
  try {
    const blob = doc.output('blob');
    if (!blob || blob.size === 0) {
      throw new Error("PDF blob boş veya geçersiz");
    }
    return blob;
  } catch (outputError) {
    throw new Error("PDF oluşturulamadı: " + (outputError instanceof Error ? outputError.message : "Bilinmeyen hata"));
  }
};

interface CustomerReportData {
  totalCustomers?: number;
  activeCustomers?: number;
  newCustomers?: number;
  topCustomers?: Array<{
    name?: string;
    total?: number;
    orders?: number;
    lastOrderDate?: string | Date;
  }>;
  customerSegments?: {
    high?: number;
    medium?: number;
    low?: number;
  };
}

export const generateCustomerReportPDF = async (data: CustomerReportData, startDate: string, endDate: string) => {
  const doc = createPdf({ format: "a4", unit: "pt" });
  
  // Font'u MUTLAKA yükle - daha agresif yaklaşım
  try {
  await registerFonts(doc);
  } catch (fontError) {
    // Font yükleme hatası, tekrar dene
    try {
      await registerFonts(doc);
    } catch (retryError) {
      // İkinci deneme de başarısız, devam et
    }
  }
  
  // Font'un gerçekten yüklendiğini doğrula - daha agresif kontrol
  if (!doc._robotoFontLoaded || doc._robotoFontLoadFailed) {
    // Font yüklenemedi, tekrar dene
    try {
      await registerFonts(doc);
    } catch (retryError) {
      // Font yüklenemedi, devam et
    }
  }
  
  // Font'u zorla Roboto olarak ayarla
  if (doc._robotoFontLoaded && !doc._robotoFontLoadFailed) {
    for (let i = 0; i < 10; i++) {
      try {
        doc.setFont("Roboto", "normal");
      const currentFont = doc.getFont();
      if (currentFont && isRobotoName(currentFont.fontName)) {
        break;
      }
      } catch {
        // Tekrar dene
    }
    }
  }
  
  applyDocumentTypography(doc);
  
  const reportDate = formatDate(new Date().toISOString()); // Dinamik
  
  // PDF Template'i uygula - Türkçe karakterler için font kontrolü
  const template = applyPDFTemplate(doc, "MÜŞTERİ RAPORU", reportDate, startDate, endDate);
  
  // Font'u tekrar kontrol et ve ayarla
  if (doc._robotoFontLoaded && !doc._robotoFontLoadFailed) {
    for (let i = 0; i < 5; i++) {
      try {
        doc.setFont("Roboto", "normal");
    const currentFont = doc.getFont();
        if (currentFont && isRobotoName(currentFont.fontName)) {
          break;
        }
      } catch {
        // Tekrar dene
      }
    }
  }
  
  // Dinamik içerik alanından başla
  let currentY = template.contentArea.startY;
  const contentWidth = template.contentArea.width;
  const mar = template.contentArea.leftMargin;
  
  const safeText = createSafeText(doc);
  const [primaryR, primaryG, primaryB] = PDF_CONSTANTS.primaryColor;
  const [mutedR, mutedG, mutedB] = PDF_CONSTANTS.mutedColor;
  
  // İstatistik Kartları - Profesyonel tasarım, dinamik değerler
  const cardWidth = (contentWidth - 32) / 3;
  const cardHeight = 110; // Daha ferah: 100 → 110
  const cardGap = 16;
  let cardX = mar;
  
  // Kart 1: Toplam Müşteri - profesyonel ve sade
  const totalCustomers = safeNumber(data.totalCustomers);
  drawStatCard(doc, cardX, currentY, cardWidth, cardHeight, {
    title: "Toplam Müşteri",
    value: totalCustomers.toString(),
    description: "Tüm müşteriler",
    color: {
      background: TAILWIND_COLORS.cardBackground,
      border: TAILWIND_COLORS.cardBorder,
      text: TAILWIND_COLORS.cardText,
      value: TAILWIND_COLORS.gray700,
    },
  });
  
  // Kart 2: Aktif Müşteri - profesyonel ve sade
  cardX += cardWidth + cardGap;
  const activeCustomers = safeNumber(data.activeCustomers);
  drawStatCard(doc, cardX, currentY, cardWidth, cardHeight, {
    title: "Aktif Müşteri",
    value: activeCustomers.toString(),
    description: "Sipariş veren müşteri",
    color: {
      background: TAILWIND_COLORS.successCardBg,
      border: TAILWIND_COLORS.successCardBorder,
      text: TAILWIND_COLORS.cardText,
      value: TAILWIND_COLORS.successCardValue,
    },
  });
  
  // Kart 3: Yeni Müşteri - profesyonel ve sade
  cardX += cardWidth + cardGap;
  const newCustomers = safeNumber(data.newCustomers);
  drawStatCard(doc, cardX, currentY, cardWidth, cardHeight, {
    title: "Yeni Müşteri",
    value: newCustomers.toString(),
    description: "Tarih aralığında",
    color: {
      background: TAILWIND_COLORS.infoCardBg,
      border: TAILWIND_COLORS.infoCardBorder,
      text: TAILWIND_COLORS.cardText,
      value: TAILWIND_COLORS.infoCardValue,
    },
  });
  
  currentY += cardHeight + PDF_CONSTANTS.sectionSpacing; // Kartlar ve tablolar arası boşluk - standardize edilmiş
  
  // Müşteri Segmentasyonu Tablosu - sayfadaki sıralamayla uyumlu (önce Segmentasyonu, sonra En Değerli Müşteriler)
  if ((data as any).segments) {
    // Tablo genişliğini sayfa genişliğine göre ayarla
    const pageWidthSeg = doc.internal.pageSize.getWidth();
    const tableWidthSeg = pageWidthSeg - (mar * 2);
    
    // Tablolar arası boşluk kontrolü
    currentY = ensureSpace(doc, currentY, 200, mar, "Müşteri Segmentasyonu");
    currentY = drawTableHeader(doc, mar, currentY, tableWidthSeg, {
      title: "Müşteri Segmentasyonu",
      backgroundColor: [249, 250, 251],
      textColor: PDF_CONSTANTS.primaryColor,
      borderColor: PDF_CONSTANTS.primaryColor,
    });
    
    // Profesyonel tablo stilleri kullan
    const tableStyles2 = createProfessionalTableStyles(doc, {
      headerFontSize: 12,
      bodyFontSize: 11,
      cellPadding: { top: 12, right: 14, bottom: 12, left: 14 }
    });
    tableStyles2.headStyles.fillColor = [59, 130, 246];
    tableStyles2.headStyles.textColor = [255, 255, 255];
    tableStyles2.headStyles.halign = "center";
    tableStyles2.bodyStyles.overflow = 'linebreak';
    tableStyles2.styles.overflow = 'linebreak';
    
    // Sayfa sığma kontrolü
    currentY = ensureTableFitsPage(doc, currentY, 150, mar, "Müşteri Segmentasyonu");
    
    // Tablo genişliğini sayfa genişliğine göre ayarla
    const currentPageWidthSeg = doc.internal.pageSize.getWidth();
    const currentTableWidthSeg = currentPageWidthSeg - (mar * 2);
    
    // Font'u zorla Roboto olarak ayarla (autoTable öncesi)
    forceRobotoFont(doc, "normal");
    
    autoTable(doc, {
      startY: currentY,
      head: transliterateTableData([['Segment', 'Müşteri Sayısı']]),
      body: transliterateTableData([
        ['Yüksek Değerli (>₺50K)', safeNumber((data as any).segments.high).toString()],
        ['Orta Değerli (₺10K-₺50K)', safeNumber((data as any).segments.medium).toString()],
        ['Düşük Değerli (<₺10K)', safeNumber((data as any).segments.low).toString()],
      ]),
      margin: { left: mar, right: mar },
      tableWidth: currentTableWidthSeg,
      willDrawCell: createWillDrawCell(doc),
      ...tableStyles2,
      columnStyles: {
        0: { cellWidth: currentTableWidthSeg * 0.70, halign: "left", overflow: 'linebreak' }, // %70
        1: { cellWidth: currentTableWidthSeg * 0.30, halign: "right", fontStyle: "bold" }, // %30
      },
    });
    
    // Tablo sonrası currentY'yi güvenli şekilde güncelle
    const tableEndY2 = doc.lastAutoTable?.finalY;
    if (tableEndY2 && tableEndY2 > currentY) {
      currentY = tableEndY2 + 50; // Optimize edilmiş boşluk: 50pt
    } else {
      currentY += PDF_CONSTANTS.tableSpacing; // Fallback: eğer lastAutoTable yoksa
    }
  }
  
  // En Değerli Müşteriler Tablosu - sayfadaki sıralamayla uyumlu (Müşteri Segmentasyonu'ndan sonra)
  if (data.topCustomers && data.topCustomers.length > 0) {
    // Tablo genişliğini sayfa genişliğine göre ayarla
    const pageWidth = doc.internal.pageSize.getWidth();
    const tableWidth = pageWidth - (mar * 2);
    
    // Tablolar arası boşluk kontrolü
    currentY = ensureSpace(doc, currentY, 200, mar, "En Değerli Müşteriler");
    currentY = drawTableHeader(doc, mar, currentY, tableWidth, {
      title: "En Değerli Müşteriler",
      backgroundColor: TAILWIND_COLORS.gray100,
      textColor: PDF_CONSTANTS.primaryColor,
      borderColor: PDF_CONSTANTS.primaryColor,
    });
    
    // Profesyonel tablo stilleri kullan
    const tableStyles = createProfessionalTableStyles(doc, {
      headerFontSize: 12,
      bodyFontSize: 11,
      cellPadding: { top: 12, right: 14, bottom: 12, left: 14 }
    });
    // Header rengi zaten createProfessionalTableStyles'da ayarlandı
    // Override etmeye gerek yok
    tableStyles.headStyles.halign = "center";
    tableStyles.bodyStyles.overflow = 'linebreak';
    tableStyles.styles.overflow = 'linebreak';
    
    // Sayfa sığma kontrolü
    currentY = ensureTableFitsPage(doc, currentY, 200, mar, "En Değerli Müşteriler");
    
    // Tablo genişliğini sayfa genişliğine göre ayarla
    const currentPageWidth = doc.internal.pageSize.getWidth();
    const currentTableWidth = currentPageWidth - (mar * 2);
    
    // Font'u zorla Roboto olarak ayarla (autoTable öncesi)
    forceRobotoFont(doc, "normal");
    
    autoTable(doc, {
      startY: currentY,
      head: transliterateTableData([['Sıra', 'Müşteri', 'Sipariş Sayısı', 'Toplam Harcama']]),
      body: transliterateTableData(
        data.topCustomers?.slice(0, 10).map((c, index: number) => [
        `#${index + 1}`,
        c.name || '-',
        safeNumber(c.orders).toString(),
        safeFormatCurrency(safeNumber(c.total))
        ]) || []
      ),
      margin: { left: mar, right: mar },
      tableWidth: currentTableWidth,
      willDrawCell: createWillDrawCell(doc),
      ...tableStyles,
      columnStyles: {
        0: { cellWidth: currentTableWidth * 0.10, halign: "left", textColor: TAILWIND_COLORS.gray500 }, // %10
        1: { cellWidth: currentTableWidth * 0.40, halign: "left", overflow: 'linebreak' }, // %40
        2: { cellWidth: currentTableWidth * 0.20, halign: "right", fontStyle: "bold" }, // %20
        3: { cellWidth: currentTableWidth * 0.30, halign: "right", fontStyle: "bold", textColor: PDF_CONSTANTS.primaryColor }, // %30
      },
    });
    
    // Tablo sonrası currentY'yi güvenli şekilde güncelle
    const tableEndY = doc.lastAutoTable?.finalY;
    if (tableEndY && tableEndY > currentY) {
      currentY = tableEndY + 50; // Optimize edilmiş boşluk: 50pt
    } else {
      currentY += PDF_CONSTANTS.tableSpacing; // Fallback: eğer lastAutoTable yoksa
    }
  }
  
  // Müşteri Detay Analizi - Yeni detaylı bölüm
  if (data.topCustomers && data.topCustomers.length > 0) {
    // Tablo sonrası currentY'yi güvenli şekilde güncelle - minimum 30pt boşluk
    const tableEndY2 = doc.lastAutoTable?.finalY;
    if (tableEndY2 && tableEndY2 > currentY) {
      currentY = tableEndY2 + 60; // Tablo sonrası boşluk artırıldı: 30 → 60
    } else {
      currentY += PDF_CONSTANTS.tableSpacing; // Fallback: eğer lastAutoTable yoksa
    }
    currentY = ensureSpace(doc, currentY, 200, mar, "Müşteri Detay Analizi");
    
    // Müşteri bazlı sipariş frekansı ve değer analizi
    const customerDetailData = data.topCustomers?.slice(0, 15).map((c, index: number) => {
      const orders = safeNumber(c.orders);
      const total = safeNumber(c.total);
      const avgOrderValue = orders > 0 ? (total / orders) : 0;
      const customerName = (c.name || '-').length > 30 ? (c.name || '-').substring(0, 30) + "..." : (c.name || '-');
      
      return [
        `#${index + 1}`,
        customerName,
        orders.toString(),
        safeFormatCurrency(total),
        safeFormatCurrency(avgOrderValue),
        total >= 50000 ? "Yüksek" : total >= 10000 ? "Orta" : "Düşük"
      ];
    });
    
    // Tablo genişliğini sayfa genişliğine göre ayarla
    const pageWidth5 = doc.internal.pageSize.getWidth();
    const tableWidth5 = pageWidth5 - (mar * 2);
    
    // Tablolar arası boşluk kontrolü
    currentY = ensureSpace(doc, currentY, 300, mar, "Müşteri Detay Analizi");
    currentY = drawTableHeader(doc, mar, currentY, tableWidth5, {
      title: "Müşteri Detay Analizi (Top 15)",
      backgroundColor: [249, 250, 251],
      textColor: PDF_CONSTANTS.primaryColor,
      borderColor: PDF_CONSTANTS.primaryColor,
    });
    
    // Profesyonel tablo stilleri kullan
    const tableStyles3 = createProfessionalTableStyles(doc, {
      headerFontSize: 12,
      bodyFontSize: 11,
      cellPadding: { top: 12, right: 14, bottom: 12, left: 14 }
    });
    tableStyles3.headStyles.fillColor = [59, 130, 246];
    tableStyles3.headStyles.textColor = [255, 255, 255];
    tableStyles3.headStyles.halign = "center";
    tableStyles3.bodyStyles.overflow = 'linebreak';
    tableStyles3.styles.overflow = 'linebreak';
    
    // Sayfa sığma kontrolü
    currentY = ensureTableFitsPage(doc, currentY, 200, mar, "Müşteri Detay Analizi");
    
    autoTable(doc, {
      startY: currentY,
      head: transliterateTableData([['Sıra', 'Müşteri', 'Sipariş', 'Toplam', 'Ortalama', 'Segment']]),
      body: transliterateTableData(customerDetailData),
      margin: { left: mar, right: mar },
      tableWidth: tableWidth5,
      willDrawCell: createWillDrawCell(doc),
      ...tableStyles3,
      columnStyles: {
        0: { cellWidth: tableWidth5 * 0.07, halign: "left", textColor: [107, 114, 128] }, // %7
        1: { cellWidth: tableWidth5 * 0.30, halign: "left", overflow: 'linebreak' }, // %30
        2: { cellWidth: tableWidth5 * 0.12, halign: "right", fontStyle: "bold" }, // %12
        3: { cellWidth: tableWidth5 * 0.20, halign: "right", fontStyle: "bold", textColor: PDF_CONSTANTS.primaryColor }, // %20
        4: { cellWidth: tableWidth5 * 0.18, halign: "right", textColor: [107, 114, 128] }, // %18
        5: { cellWidth: tableWidth5 * 0.13, halign: "center", fontStyle: "bold" }, // %13
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251]
      },
      didDrawCell: (data: CellHookData) => {
        // Segment renklendirme
        if (data.column?.index === 5 && data.cell?.text) {
          const segment = data.cell.text.toString();
          const x = data.cell?.x ?? data.x ?? 0;
          const y = data.cell?.y ?? data.y ?? 0;
          const width = data.cell?.width ?? data.width ?? 0;
          const height = data.cell?.height ?? data.height ?? 0;
          if (segment === "Yüksek") {
            doc.setFillColor(240, 253, 244);
            doc.rect(x, y, width, height, "F");
            doc.setTextColor(22, 163, 74);
          } else if (segment === "Orta") {
            doc.setFillColor(254, 249, 195);
            doc.rect(x, y, width, height, "F");
            doc.setTextColor(217, 119, 6);
          } else {
            doc.setFillColor(254, 242, 242);
            doc.rect(x, y, width, height, "F");
            doc.setTextColor(220, 38, 38);
          }
        }
      },
    });
    
    // Tablo sonrası currentY'yi güvenli şekilde güncelle - minimum 30pt boşluk
    const tableEndY3 = doc.lastAutoTable?.finalY;
    if (tableEndY3 && tableEndY3 > currentY) {
      currentY = tableEndY3 + 30; // Standart boşluk: 30pt
    } else {
      currentY += 30; // Fallback: eğer lastAutoTable yoksa
    }
  }
  
  // Müşteri Trend Analizi - Yeni bölüm
  if (data.newCustomers !== undefined) {
    currentY = ensureSpace(doc, currentY, 150, mar, "Müşteri Trend Analizi");
    
    const retentionRate = safeNumber(data.totalCustomers) > 0 
      ? ((safeNumber(data.totalCustomers) - safeNumber(data.newCustomers)) / safeNumber(data.totalCustomers) * 100).toFixed(1)
      : "0";
    const activeRate = safeNumber(data.totalCustomers) > 0
      ? (safeNumber(data.activeCustomers) / safeNumber(data.totalCustomers) * 100).toFixed(1)
      : "0";
    
    const trendData: Array<[string, string]> = [
      ['Yeni Müşteri Oranı', `${(safeNumber(data.newCustomers) / Math.max(safeNumber(data.totalCustomers), 1) * 100).toFixed(1)}%`],
      ['Müşteri Tutma Oranı', `${retentionRate}%`],
      ['Aktif Müşteri Oranı', `${activeRate}%`],
      ['Segment Dağılımı (Yüksek)', `${safeNumber((data as any).segments?.high || 0)} müşteri`],
      ['Segment Dağılımı (Orta)', `${safeNumber((data as any).segments?.medium || 0)} müşteri`],
      ['Segment Dağılımı (Düşük)', `${safeNumber((data as any).segments?.low || 0)} müşteri`],
    ];
    
    currentY = drawSummarySection(doc, mar, currentY, contentWidth, "Müşteri Trend Analizi", trendData, [147, 51, 234]);
  }
  
  // Özet Bölümü - sabit tasarım, dinamik veriler
  currentY = (doc.lastAutoTable?.finalY || currentY) + 50; // Optimize edilmiş boşluk: 50pt
  currentY = ensureSpace(doc, currentY, 100, mar, "Özet");
  
  const summaryData: Array<[string, string]> = [
    ['Toplam Müşteri', safeNumber(data.totalCustomers).toString()],
    ['Aktif Müşteri', safeNumber(data.activeCustomers).toString()],
    ['Yeni Müşteri', safeNumber(data.newCustomers).toString()],
    ['Yüksek Değerli Müşteri', safeNumber((data as any).segments?.high || 0).toString()],
    ['Orta Değerli Müşteri', safeNumber((data as any).segments?.medium || 0).toString()],
    ['Düşük Değerli Müşteri', safeNumber((data as any).segments?.low || 0).toString()],
    ['En Değerli Müşteri Sayısı', data.topCustomers ? data.topCustomers.length.toString() : "0"],
  ];
  
  currentY = drawSummarySection(doc, mar, currentY, contentWidth, "Rapor Özeti", summaryData, [147, 51, 234]);
  
  // Sayfa numaralarını ekle - template footer kullan
  try {
    const totalPages = doc.internal.pages.length - 1;
    if (totalPages > 0) {
      for (let i = 1; i <= totalPages; i++) {
        try {
          doc.setPage(i);
          const pageTemplate = createPDFTemplate(doc);
          drawPDFFooter(doc, pageTemplate, i, totalPages);
        } catch (pageError) {
          // Devam et, diğer sayfaları eklemeye çalış
        }
      }
    }
  } catch (footerError) {
    // Footer hatası kritik değil, PDF'i yine de döndür
  }
  
  // PDF'i güvenli bir şekilde oluştur
  try {
    const blob = doc.output('blob');
    if (!blob || blob.size === 0) {
      throw new Error("PDF blob boş veya geçersiz");
    }
    return blob;
  } catch (outputError) {
    throw new Error("PDF oluşturulamadı: " + (outputError instanceof Error ? outputError.message : "Bilinmeyen hata"));
  }
};

interface FinancialReportData {
  totalRevenue?: number;
  totalCost?: number;
  grossProfit?: number;
  profitMargin?: number;
  monthlyTrend?: Array<{
    month?: string;
    revenue?: number;
    cost?: number;
    profit?: number;
  }>;
  topProfitableProducts?: Array<{
    name?: string;
    revenue?: number;
    cost?: number;
    profit?: number;
  }>;
  segments?: {
    high?: number;
    medium?: number;
    low?: number;
  };
  topCustomers?: Array<{
    name?: string;
    total?: number;
  }>;
}

export const generateFinancialReportPDF = async (data: FinancialReportData, startDate: string, endDate: string) => {
  const doc = createPdf({ format: "a4", unit: "pt" });
  
  // Font'u MUTLAKA yükle - daha agresif yaklaşım
  try {
  await registerFonts(doc);
  } catch (fontError) {
    // Font yükleme hatası, tekrar dene
    try {
      await registerFonts(doc);
    } catch (retryError) {
      // İkinci deneme de başarısız, devam et
    }
  }
  
  // Font'un gerçekten yüklendiğini doğrula - daha agresif kontrol
  if (!doc._robotoFontLoaded || doc._robotoFontLoadFailed) {
    // Font yüklenemedi, tekrar dene
    try {
      await registerFonts(doc);
    } catch (retryError) {
      // Font yüklenemedi, devam et
    }
  }
  
  // Font'u zorla Roboto olarak ayarla
  if (doc._robotoFontLoaded && !doc._robotoFontLoadFailed) {
    for (let i = 0; i < 10; i++) {
      try {
        doc.setFont("Roboto", "normal");
      const currentFont = doc.getFont();
      if (currentFont && isRobotoName(currentFont.fontName)) {
        break;
      }
      } catch {
        // Tekrar dene
    }
    }
  }
  
  applyDocumentTypography(doc);
  
  const reportDate = formatDate(new Date().toISOString()); // Dinamik
  
  // PDF Template'i uygula - Türkçe karakterler için font kontrolü
  const template = applyPDFTemplate(doc, "MALİ RAPOR", reportDate, startDate, endDate);
  
  // Font'u tekrar kontrol et ve ayarla
  if (doc._robotoFontLoaded && !doc._robotoFontLoadFailed) {
    for (let i = 0; i < 5; i++) {
      try {
        doc.setFont("Roboto", "normal");
    const currentFont = doc.getFont();
        if (currentFont && isRobotoName(currentFont.fontName)) {
          break;
        }
      } catch {
        // Tekrar dene
      }
    }
  }
  
  // Dinamik içerik alanından başla
  let currentY = template.contentArea.startY;
  const contentWidth = template.contentArea.width;
  const mar = template.contentArea.leftMargin;
  
  const safeText = createSafeText(doc);
  const [primaryR, primaryG, primaryB] = PDF_CONSTANTS.primaryColor;
  const [mutedR, mutedG, mutedB] = PDF_CONSTANTS.mutedColor;
  
  // İstatistik Kartları - Profesyonel tasarım (4 kart) - standardize edilmiş
  const cardDimensions = calculateCardDimensions(contentWidth, 4);
  const cardWidth = cardDimensions.width;
  const cardGap = cardDimensions.gap;
  const cardHeight = PDF_CONSTANTS.cardHeight;
  let cardX = mar;
  
  // Kart 1: Toplam Gelir (Green) - profesyonel ve sade
  const totalRevenue = safeNumber(data.totalRevenue);
  drawStatCard(doc, cardX, currentY, cardWidth, cardHeight, {
    title: "Toplam Gelir",
    value: safeFormatCurrency(totalRevenue),
    description: "Toplam ciro",
    color: {
      background: TAILWIND_COLORS.successCardBg,
      border: TAILWIND_COLORS.successCardBorder,
      text: TAILWIND_COLORS.cardText,
      value: TAILWIND_COLORS.successCardValue,
    },
  });
  
  // Kart 2: Toplam Gider (Red) - profesyonel ve sade
  cardX += cardWidth + cardGap;
  const totalCost = safeNumber(data.totalCost);
  drawStatCard(doc, cardX, currentY, cardWidth, cardHeight, {
    title: "Toplam Gider",
    value: safeFormatCurrency(totalCost),
    description: "Toplam maliyet",
    color: {
      background: TAILWIND_COLORS.errorCardBg,
      border: TAILWIND_COLORS.errorCardBorder,
      text: TAILWIND_COLORS.cardText,
      value: TAILWIND_COLORS.errorCardValue,
    },
  });
  
  // Kart 3: Brüt Kar (Emerald) - profesyonel ve sade
  cardX += cardWidth + cardGap;
  const grossProfit = safeNumber(data.grossProfit);
  drawStatCard(doc, cardX, currentY, cardWidth, cardHeight, {
    title: "Brüt Kar",
    value: safeFormatCurrency(grossProfit),
    description: "Net kar",
    color: {
      background: TAILWIND_COLORS.successCardBg,
      border: TAILWIND_COLORS.successCardBorder,
      text: TAILWIND_COLORS.cardText,
      value: TAILWIND_COLORS.successCardValue,
    },
  });
  
  // Kart 4: Kar Marjı (Primary) - profesyonel ve sade
  cardX += cardWidth + cardGap;
  const profitMargin = safeNumber(data.profitMargin);
  drawStatCard(doc, cardX, currentY, cardWidth, cardHeight, {
    title: "Kar Marjı",
    value: `${profitMargin.toFixed(1)}%`,
    description: "Karlılık oranı",
    color: {
      background: TAILWIND_COLORS.primaryCardBg,
      border: TAILWIND_COLORS.primaryCardBorder,
      text: TAILWIND_COLORS.cardText,
      value: TAILWIND_COLORS.primaryCardValue,
    },
  });
  
  currentY += cardHeight + PDF_CONSTANTS.sectionSpacing; // Kartlar ve tablolar arası boşluk - standardize edilmiş
  
  // Aylık Trend Tablosu - sayfadaki sıralamayla uyumlu (önce Aylık Trend, sonra En Karlı Ürünler)
  if (data.monthlyTrend && data.monthlyTrend.length > 0) {
    // Tablo genişliğini sayfa genişliğine göre ayarla
    const pageWidthTrend = doc.internal.pageSize.getWidth();
    const tableWidthTrend = pageWidthTrend - (mar * 2);
    
    // Tablolar arası boşluk kontrolü
    currentY = ensureSpace(doc, currentY, 200, mar, "Aylık Trend");
    currentY = drawTableHeader(doc, mar, currentY, tableWidthTrend, {
      title: "Aylık Gelir-Gider-Kar Trendi",
      backgroundColor: TAILWIND_COLORS.gray100,
      textColor: PDF_CONSTANTS.primaryColor,
      borderColor: PDF_CONSTANTS.primaryColor,
    });
    
    const monthLabels: Record<string, string> = {
      '01': 'Ocak', '02': 'Şubat', '03': 'Mart', '04': 'Nisan',
      '05': 'Mayıs', '06': 'Haziran', '07': 'Temmuz', '08': 'Ağustos',
      '09': 'Eylül', '10': 'Ekim', '11': 'Kasım', '12': 'Aralık'
    };
    
    const trendData = data.monthlyTrend?.map((item) => {
      const [year, month] = item.month.split('-');
      const monthLabel = monthLabels[month] || month;
      return [
        `${monthLabel} ${year}`,
        safeFormatCurrency(safeNumber(item.revenue || 0)),
        safeFormatCurrency(safeNumber(item.cost || 0)),
        safeFormatCurrency(safeNumber(item.profit || 0))
      ];
    });
    
    // Profesyonel tablo stilleri kullan (özel header rengi ile)
    const tableStyles2 = createProfessionalTableStyles(doc, {
      headerFontSize: 12,
      bodyFontSize: 11,
      cellPadding: { top: 12, right: 14, bottom: 12, left: 14 }
    });
    tableStyles2.headStyles.fillColor = PDF_CONSTANTS.primaryColor; // Primary color
    tableStyles2.headStyles.textColor = [255, 255, 255]; // White text
    tableStyles2.headStyles.halign = "center";
    tableStyles2.bodyStyles.overflow = 'linebreak';
    tableStyles2.styles.overflow = 'linebreak';
    
    // Sayfa sığma kontrolü
    currentY = ensureTableFitsPage(doc, currentY, 200, mar, "Aylık Gelir-Gider-Kar Trendi");
    
    // Tablo genişliğini sayfa genişliğine göre ayarla
    const currentPageWidth2 = doc.internal.pageSize.getWidth();
    const currentTableWidth2 = currentPageWidth2 - (mar * 2);
    
    // Font'u zorla Roboto olarak ayarla (autoTable öncesi)
    forceRobotoFont(doc, "normal");
    
    autoTable(doc, {
      startY: currentY,
      head: transliterateTableData([['Ay', 'Gelir', 'Gider', 'Kar']]),
      body: transliterateTableData(trendData),
      margin: { left: mar, right: mar },
      tableWidth: currentTableWidth2,
      willDrawCell: createWillDrawCell(doc),
      ...tableStyles2,
      columnStyles: {
        0: { cellWidth: currentTableWidth2 * 0.25, halign: "left" },  // %25
        1: { cellWidth: currentTableWidth2 * 0.25, halign: "right" }, // %25
        2: { cellWidth: currentTableWidth2 * 0.25, halign: "right" }, // %25
        3: { cellWidth: currentTableWidth2 * 0.25, halign: "right" }, // %25
      },
    });
    
    // Tablo sonrası currentY'yi güvenli şekilde güncelle
    const trendTableEndY = doc.lastAutoTable?.finalY;
    if (trendTableEndY && trendTableEndY > currentY) {
      currentY = trendTableEndY + 50; // Optimize edilmiş boşluk: 50pt
    } else {
      currentY += PDF_CONSTANTS.tableSpacing; // Fallback: eğer lastAutoTable yoksa
    }
  }
  
  // En Karlı Ürünler Tablosu - sayfadaki sıralamayla uyumlu (Aylık Trend'den sonra)
  if (data.topProfitableProducts && data.topProfitableProducts.length > 0) {
    // Tablo genişliğini sayfa genişliğine göre ayarla
    const pageWidth = doc.internal.pageSize.getWidth();
    const tableWidth = pageWidth - (mar * 2);
    
    // Tablolar arası boşluk kontrolü
    currentY = ensureSpace(doc, currentY, 200, mar, "En Karlı Ürünler");
    currentY = drawTableHeader(doc, mar, currentY, tableWidth, {
      title: "En Karlı Ürünler",
      backgroundColor: TAILWIND_COLORS.gray100,
      textColor: PDF_CONSTANTS.primaryColor,
      borderColor: PDF_CONSTANTS.primaryColor,
    });
    
    // Profesyonel tablo stilleri kullan
    const tableStyles = createProfessionalTableStyles(doc, {
      headerFontSize: 12,
      bodyFontSize: 11,
      cellPadding: { top: 12, right: 14, bottom: 12, left: 14 }
    });
    // Header rengi zaten createProfessionalTableStyles'da ayarlandı
    // Override etmeye gerek yok
    tableStyles.headStyles.halign = "center";
    tableStyles.bodyStyles.overflow = 'linebreak';
    tableStyles.styles.overflow = 'linebreak';
    
    // Sayfa sığma kontrolü
    currentY = ensureTableFitsPage(doc, currentY, 200, mar, "En Karlı Ürünler");
    
    // Tablo genişliğini sayfa genişliğine göre ayarla
    const currentPageWidth = doc.internal.pageSize.getWidth();
    const currentTableWidth = currentPageWidth - (mar * 2);
    
    // Font'u zorla Roboto olarak ayarla (autoTable öncesi)
    forceRobotoFont(doc, "normal");
    
    autoTable(doc, {
      startY: currentY,
      head: transliterateTableData([['Sıra', 'Ürün', 'Gelir', 'Gider', 'Kar']]),
      body: transliterateTableData(
        data.topProfitableProducts?.slice(0, 10).map((p, index: number) => [
        `#${index + 1}`,
        p.name || '-',
        safeFormatCurrency(safeNumber(p.revenue)),
        safeFormatCurrency(safeNumber(p.cost)),
        safeFormatCurrency(safeNumber(p.profit))
        ]) || []
      ),
      margin: { left: mar, right: mar },
      tableWidth: currentTableWidth,
      willDrawCell: createWillDrawCell(doc),
      ...tableStyles,
      columnStyles: {
        0: { cellWidth: currentTableWidth * 0.08, halign: "left", textColor: TAILWIND_COLORS.gray500 }, // %8
        1: { cellWidth: currentTableWidth * 0.40, halign: "left", overflow: 'linebreak' }, // %40
        2: { cellWidth: currentTableWidth * 0.17, halign: "right", fontStyle: "bold", textColor: PDF_CONSTANTS.successColor }, // %17
        3: { cellWidth: currentTableWidth * 0.17, halign: "right", fontStyle: "bold", textColor: PDF_CONSTANTS.errorColor }, // %17
        4: { cellWidth: currentTableWidth * 0.18, halign: "right", fontStyle: "bold", textColor: PDF_CONSTANTS.successColor }, // %18
      },
    });
    
    // Tablo sonrası currentY'yi güvenli şekilde güncelle
    const productsTableEndY = doc.lastAutoTable?.finalY;
    if (productsTableEndY && productsTableEndY > currentY) {
      currentY = productsTableEndY + 50; // Optimize edilmiş boşluk: 50pt
    } else {
      currentY += PDF_CONSTANTS.tableSpacing; // Fallback: eğer lastAutoTable yoksa
    }
  }
  
  // Gider Kalemleri Analizi - Yeni detaylı bölüm
  if ((data as any).costBreakdown || (data as any).expenseCategories) {
    // Tablo sonrası currentY'yi güvenli şekilde güncelle - yeterli boşluk
    const tableEndY = doc.lastAutoTable?.finalY;
    if (tableEndY && tableEndY > currentY) {
      currentY = tableEndY + PDF_CONSTANTS.tableSpacing; // Tablo sonrası boşluk - standardize edilmiş
    } else {
      currentY += PDF_CONSTANTS.tableSpacing; // Fallback: eğer lastAutoTable yoksa
    }
    currentY = ensureSpace(doc, currentY, 200, mar, "Gider Kalemleri Analizi");
    
    const costData = (data as any).costBreakdown || (data as any).expenseCategories || [];
    if (costData.length > 0) {
      // En Karlı Ürünler tablosu gibi sıra numarası ile
      const costTableData = costData.map((item: { category?: string; name?: string; amount?: number; total?: number; percentage?: number }, index: number) => {
        const category = item.category || item.name || "Bilinmeyen";
        const amount = safeNumber(item.amount || item.total || 0);
        const percentage = item.percentage !== undefined 
          ? item.percentage.toFixed(1)
          : (safeNumber(data.totalCost) > 0 
            ? ((amount / safeNumber(data.totalCost)) * 100).toFixed(1)
            : "0");
        return [
          `#${index + 1}`,
          category.length > 30 ? category.substring(0, 30) + "..." : category,
          safeFormatCurrency(amount),
          `${percentage}%`
        ];
      });
      
      // Tablo genişliğini sayfa genişliğine göre ayarla
      const pageWidth3 = doc.internal.pageSize.getWidth();
      const tableWidth3 = pageWidth3 - (mar * 2);
      
      // Tablolar arası boşluk kontrolü
      currentY = ensureSpace(doc, currentY, 200, mar, "Gider Kalemleri Analizi");
      currentY = drawTableHeader(doc, mar, currentY, tableWidth3, {
        title: "Gider Kalemleri Analizi",
        backgroundColor: TAILWIND_COLORS.gray100,
        textColor: PDF_CONSTANTS.primaryColor,
        borderColor: PDF_CONSTANTS.primaryColor,
      });
      
      // Profesyonel tablo stilleri kullan
      const tableStyles3 = createProfessionalTableStyles(doc, {
        headerFontSize: 12,
        bodyFontSize: 11,
        cellPadding: { top: 12, right: 14, bottom: 12, left: 14 }
      });
      tableStyles3.headStyles.fillColor = [59, 130, 246];
      tableStyles3.headStyles.textColor = [255, 255, 255];
      tableStyles3.headStyles.halign = "center";
      tableStyles3.bodyStyles.overflow = 'linebreak';
      tableStyles3.styles.overflow = 'linebreak';
      
      // Sayfa sığma kontrolü
      currentY = ensureTableFitsPage(doc, currentY, 200, mar, "Gider Kalemleri Analizi");
      
      // Tablo genişliğini sayfa genişliğine göre ayarla
      const currentPageWidth3 = doc.internal.pageSize.getWidth();
      const currentTableWidth3 = currentPageWidth3 - (mar * 2);
      
      // Font'u zorla Roboto olarak ayarla (autoTable öncesi)
      forceRobotoFont(doc, "normal");

      autoTable(doc, {
        startY: currentY,
        head: transliterateTableData([['Sıra', 'Gider Kalemi', 'Tutar', 'Oran']]),
        body: transliterateTableData(costTableData),
        margin: { left: mar, right: mar },
        tableWidth: currentTableWidth3,
        willDrawCell: createWillDrawCell(doc),
        ...tableStyles3,
        columnStyles: {
          0: { cellWidth: currentTableWidth3 * 0.08, halign: "left", textColor: TAILWIND_COLORS.gray500 }, // %8 - Sıra
          1: { cellWidth: currentTableWidth3 * 0.40, halign: "left", overflow: 'linebreak' }, // %40 - Gider Kalemi
          2: { cellWidth: currentTableWidth3 * 0.30, halign: "right", fontStyle: "bold", textColor: PDF_CONSTANTS.errorColor }, // %30 - Tutar
          3: { cellWidth: currentTableWidth3 * 0.22, halign: "right", textColor: TAILWIND_COLORS.gray500 }, // %22 - Oran
        },
      });
      
      // Tablo sonrası currentY'yi güvenli şekilde güncelle - yeterli boşluk
    const tableEndY = doc.lastAutoTable?.finalY;
    if (tableEndY && tableEndY > currentY) {
      currentY = tableEndY + PDF_CONSTANTS.tableSpacing; // Tablo sonrası boşluk - standardize edilmiş
    } else {
      currentY += PDF_CONSTANTS.tableSpacing; // Fallback: eğer lastAutoTable yoksa
    }
    }
  }
  
  // Kar Analizi Detayı - Yeni bölüm
  currentY = ensureSpace(doc, currentY, 150, mar, "Kar Analizi Detayı");
  
  const profitMarginValue = safeNumber(data.profitMargin);
  const revenue = safeNumber(data.totalRevenue);
  const cost = safeNumber(data.totalCost);
  const profit = safeNumber(data.grossProfit);
  const avgMonthlyRevenue = data.monthlyTrend && data.monthlyTrend.length > 0 
    ? safeNumber(data.totalRevenue) / data.monthlyTrend.length 
    : 0;
  const avgMonthlyCost = data.monthlyTrend && data.monthlyTrend.length > 0
    ? safeNumber(data.totalCost) / data.monthlyTrend.length
    : 0;
  const avgMonthlyProfit = avgMonthlyRevenue - avgMonthlyCost;
  const profitGrowth = data.monthlyTrend && data.monthlyTrend.length >= 2
    ? ((data.monthlyTrend[data.monthlyTrend.length - 1].profit || 0) - (data.monthlyTrend[0].profit || 0))
    : 0;
  
  const profitAnalysisData: Array<[string, string]> = [
    ['Toplam Gelir', safeFormatCurrency(revenue)],
    ['Toplam Gider', safeFormatCurrency(cost)],
    ['Brüt Kar', safeFormatCurrency(profit)],
    ['Kar Marjı', `${profitMarginValue.toFixed(1)}%`],
    ['Ortalama Aylık Gelir', safeFormatCurrency(avgMonthlyRevenue)],
    ['Ortalama Aylık Gider', safeFormatCurrency(avgMonthlyCost)],
    ['Ortalama Aylık Kar', safeFormatCurrency(avgMonthlyProfit)],
    ['Kar Büyümesi', profitGrowth > 0 ? `+${safeFormatCurrency(profitGrowth)}` : safeFormatCurrency(profitGrowth)],
  ];
  
  currentY = drawSummarySection(doc, mar, currentY, contentWidth, "Kar Analizi Detayı", profitAnalysisData, [5, 150, 105]);
  
  // Özet Bölümü - sabit tasarım, dinamik veriler
  currentY = (doc.lastAutoTable?.finalY || currentY) + 50; // Optimize edilmiş boşluk: 50pt
  currentY = ensureSpace(doc, currentY, 100, mar, "Özet");
  
  const summaryData: Array<[string, string]> = [
    ['Toplam Gelir', safeFormatCurrency(safeNumber(data.totalRevenue))],
    ['Toplam Gider', safeFormatCurrency(safeNumber(data.totalCost))],
    ['Brüt Kar', safeFormatCurrency(safeNumber(data.grossProfit))],
    ['Kar Marjı', `${safeNumber(data.profitMargin).toFixed(1)}%`],
    ['Ortalama Aylık Gelir', data.monthlyTrend && data.monthlyTrend.length > 0 
      ? safeFormatCurrency(safeNumber(data.totalRevenue) / data.monthlyTrend.length) 
      : safeFormatCurrency(0)],
    ['Aylık Trend Verisi', data.monthlyTrend ? `${data.monthlyTrend.length} ay` : "0 ay"],
    ['En Karlı Ürün Sayısı', data.topProfitableProducts ? data.topProfitableProducts.length.toString() : "0"],
  ];
  
  currentY = drawSummarySection(doc, mar, currentY, contentWidth, "Rapor Özeti", summaryData, [5, 150, 105]);
  
  // Sayfa numaralarını ekle - template footer kullan
  try {
    const totalPages = doc.internal.pages.length - 1;
    if (totalPages > 0) {
      for (let i = 1; i <= totalPages; i++) {
        try {
          doc.setPage(i);
          const pageTemplate = createPDFTemplate(doc);
          drawPDFFooter(doc, pageTemplate, i, totalPages);
        } catch (pageError) {
          // Devam et, diğer sayfaları eklemeye çalış
        }
      }
    }
  } catch (footerError) {
    // Footer hatası kritik değil, PDF'i yine de döndür
  }
  
  // PDF'i güvenli bir şekilde oluştur
  try {
    const blob = doc.output('blob');
    if (!blob || blob.size === 0) {
      throw new Error("PDF blob boş veya geçersiz");
    }
    return blob;
  } catch (outputError) {
    throw new Error("PDF oluşturulamadı: " + (outputError instanceof Error ? outputError.message : "Bilinmeyen hata"));
  }
};

interface SalesOfferPayload {
  quoteNumber: string;
  quoteDate: string;
  validUntil: string;
  customerName: string;
  customerCompany: string;
  customerAddress?: string;
  customerPhone?: string;
  customerEmail?: string;
  projectName: string;
  deliveryTerms: string;
  paymentTerms: string;
  notes: string;
  currency: string;
  taxRate: number;
  discountRate: number;
  items: Array<{ description: string; quantity: number; unitPrice: number; discount?: number }>;
  totals: {
    subtotal: number;
    discount: number;
    tax: number;
    grandTotal: number;
  };
  terms?: string[];
}

/**
 * Kullanıcı istatistikleri PDF'i oluştur
 */
interface UserStatsReportData {
  userName: string;
  userEmail: string;
  total: number;
  accepted: number;
  rejected: number;
  pending: number;
  completed: number;
  active: number;
  assignments: Array<{
    taskTitle: string;
    status: string;
    assignedAt: Date | string;
    completedAt?: Date | string | null;
  }>;
}

export const generateUserStatsPDF = async (userStats: UserStatsReportData): Promise<Blob> => {
  const doc = createPdf({ format: "a4", unit: "pt" });
  await registerFonts(doc);
  
  // Font'un gerçekten yüklendiğini doğrula
  if (doc._robotoFontLoaded && !doc._robotoFontLoadFailed) {
    const currentFont = doc.getFont();
    if (!currentFont || !isRobotoName(currentFont.fontName)) {
      await registerFonts(doc);
    }
  }
  
  const reportDate = formatDate(new Date().toISOString());

  // PDF Template'i uygula
  const template = applyPDFTemplate(doc, "Kullanıcı Performans Raporu", reportDate);
  let yPos = template.contentArea.startY;
  const mar = template.contentArea.leftMargin;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  const safeTextUser = createSafeText(doc);
  const safeSetFontUser = (bold: boolean = false) => {
    safeSetFont(doc, bold ? "bold" : "normal");
  };

  // Kullanıcı bilgileri kartı
  const cardHeight = 110; // Daha ferah: 100 → 110
  const cardY = yPos;
  doc.setFillColor(TAILWIND_COLORS.gray50[0], TAILWIND_COLORS.gray50[1], TAILWIND_COLORS.gray50[2]);
  doc.setDrawColor(TAILWIND_COLORS.gray200[0], TAILWIND_COLORS.gray200[1], TAILWIND_COLORS.gray200[2]);
  doc.setLineWidth(1.5);
  doc.roundedRect(mar, cardY, pageWidth - 2 * mar, cardHeight, 6, 6, "F");
  doc.roundedRect(mar, cardY, pageWidth - 2 * mar, cardHeight, 6, 6, "S");
  
  safeSetFontUser(true);
  doc.setTextColor(31, 41, 55);
  safeTextUser("Kullanıcı Bilgileri", mar + 15, cardY + 20, 16);
  
  safeSetFontUser(false);
  doc.setTextColor(75, 85, 99);
  safeTextUser(`Kullanıcı Adı: ${userStats.userName}`, mar + 15, cardY + 45, 12);
  safeTextUser(`E-posta: ${userStats.userEmail}`, mar + 15, cardY + 65, 12);
  safeTextUser(`Rapor Tarihi: ${new Date().toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" })}`, mar + 15, cardY + 85, 12);
  
  yPos = cardY + cardHeight + 30;

  // İstatistik kartları (3 sütun)
  safeSetFontUser(true);
  doc.setTextColor(31, 41, 55);
  safeTextUser("Performans Özeti", mar, yPos, 18);
  yPos += 30;

  const cardWidth = (pageWidth - 2 * mar - 20) / 3;
  const statCards = [
    { label: "Toplam Görev", value: userStats.total, color: [59, 130, 246], icon: "📊" },
    { label: "Tamamlanan", value: userStats.completed, color: [34, 197, 94], icon: "✅" },
    { label: "Aktif", value: userStats.active, color: [251, 191, 36], icon: "🔄" },
  ];

  statCards.forEach((stat, index) => {
    const cardX = mar + index * (cardWidth + 10);
    const statCardHeight = 90;
    
    // Gradient efekti simülasyonu
    doc.setFillColor(stat.color[0], stat.color[1], stat.color[2], 0.1);
    doc.setDrawColor(stat.color[0], stat.color[1], stat.color[2], 0.3);
    doc.setLineWidth(1.5);
    doc.roundedRect(cardX, yPos, cardWidth, statCardHeight, 6, 6, "F");
    doc.roundedRect(cardX, yPos, cardWidth, statCardHeight, 6, 6, "S");
    
    // İkon ve değer
    safeSetFontUser(true);
    doc.setTextColor(stat.color[0], stat.color[1], stat.color[2]);
    safeTextUser(stat.value.toString(), cardX + 15, yPos + 25, 28);
    
    safeSetFontUser(false);
    doc.setTextColor(75, 85, 99);
    safeTextUser(stat.label, cardX + 15, yPos + 55, 11);
  });

  yPos += 110;

  // Detaylı istatistikler tablosu
  if (yPos > pageHeight - 200) {
    doc.addPage();
    yPos = mar;
  }

  safeSetFontUser(true);
  doc.setTextColor(31, 41, 55);
  safeTextUser("Detaylı İstatistikler", mar, yPos, 18);
  yPos += 25;

  const detailedStats = [
    ["Metrik", "Değer", "Oran"],
    ["Toplam Görev", userStats.total.toString(), "%100"],
    ["Tamamlanan", userStats.completed.toString(), userStats.total > 0 ? `%${Math.round((userStats.completed / userStats.total) * 100)}` : "%0"],
    ["Kabul Edilen", userStats.accepted.toString(), userStats.total > 0 ? `%${Math.round((userStats.accepted / userStats.total) * 100)}` : "%0"],
    ["Beklemede", userStats.pending.toString(), userStats.total > 0 ? `%${Math.round((userStats.pending / userStats.total) * 100)}` : "%0"],
    ["Reddedilen", userStats.rejected.toString(), userStats.total > 0 ? `%${Math.round((userStats.rejected / userStats.total) * 100)}` : "%0"],
    ["Aktif Görevler", userStats.active.toString(), userStats.total > 0 ? `%${Math.round((userStats.active / userStats.total) * 100)}` : "%0"],
  ];

  // Detaylı istatistikler için profesyonel tablo stilleri
  const detailedTableStyles = createProfessionalTableStyles(doc, {
    headerFontSize: 12,
    bodyFontSize: 11,
    cellPadding: { top: 12, right: 14, bottom: 12, left: 14 }
  });
  detailedTableStyles.headStyles.fillColor = [59, 130, 246];
  detailedTableStyles.headStyles.textColor = [255, 255, 255];
  detailedTableStyles.headStyles.halign = "center";
  detailedTableStyles.bodyStyles.halign = "center";
  detailedTableStyles.bodyStyles.textColor = [31, 41, 55];
  
  const currentPageWidth = doc.internal.pageSize.getWidth();
  const detailedTableWidth = currentPageWidth - (mar * 2);
  
  autoTable(doc, {
    startY: yPos,
    head: [detailedStats[0]],
    body: detailedStats.slice(1),
    willDrawCell: createWillDrawCell(doc),
    margin: { left: mar, right: mar },
    tableWidth: detailedTableWidth,
    ...detailedTableStyles,
    columnStyles: {
      0: { cellWidth: detailedTableWidth * 0.50, halign: "left" }, // %50 - metrik adı için
      1: { cellWidth: detailedTableWidth * 0.25, halign: "center" }, // %25 - değer için
      2: { cellWidth: detailedTableWidth * 0.25, halign: "center" }, // %25 - oran için
    },
  });

  yPos = (doc.lastAutoTable?.finalY || yPos) + 30;

  // Görev listesi
  if (userStats.assignments.length > 0) {
    if (yPos > pageHeight - 150) {
      doc.addPage();
      yPos = mar;
    }

    safeSetFontUser(true);
    doc.setTextColor(31, 41, 55);
    safeTextUser("Görev Detayları", mar, yPos, 18);
    yPos += 25;

    const statusLabels: Record<string, string> = {
      "pending": "Beklemede",
      "accepted": "Kabul Edildi",
      "rejected": "Reddedildi",
      "completed": "Tamamlandı",
      "in_progress": "Devam Ediyor",
    };

    const assignmentRows = userStats.assignments.map((assignment) => {
      const assignedDate = assignment.assignedAt instanceof Date
        ? assignment.assignedAt
        : new Date(assignment.assignedAt);
      const completedDate = assignment.completedAt
        ? (assignment.completedAt instanceof Date
          ? assignment.completedAt
          : new Date(assignment.completedAt))
        : null;

      return [
        assignment.taskTitle,
        statusLabels[assignment.status] || assignment.status,
        assignedDate.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" }),
        completedDate
          ? completedDate.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" })
          : "-",
      ];
    });

    // Profesyonel tablo stilleri kullan (özel header rengi ile)
    const tableStyles = createProfessionalTableStyles(doc, {
      headerFontSize: 12,
      bodyFontSize: 11,
      cellPadding: { top: 12, right: 14, bottom: 12, left: 14 }
    });
    // Header rengi zaten createProfessionalTableStyles'da primaryColor olarak ayarlandı
    // Burada override etmeye gerek yok, ama tutarlılık için bırakıyoruz
    tableStyles.headStyles.fillColor = PDF_CONSTANTS.primaryColor; // Blue
    tableStyles.headStyles.textColor = [255, 255, 255]; // White
    tableStyles.headStyles.halign = "center";
    tableStyles.bodyStyles.halign = "left";
    tableStyles.bodyStyles.overflow = 'linebreak';
    tableStyles.styles.overflow = 'linebreak';
    
    // Sayfa sığma kontrolü
    yPos = ensureTableFitsPage(doc, yPos, 200, mar, "Görev Detayları");
    
    // Tablo genişliğini sayfa genişliğine göre ayarla
    const currentPageWidth = doc.internal.pageSize.getWidth();
    const tableWidth = currentPageWidth - (mar * 2);
    
    autoTable(doc, {
      startY: yPos,
      head: [["Görev Başlığı", "Durum", "Atanma Tarihi", "Tamamlanma Tarihi"]],
      body: assignmentRows,
      margin: { left: mar, right: mar },
      tableWidth: tableWidth,
      willDrawCell: createWillDrawCell(doc),
      ...tableStyles,
      columnStyles: {
        0: { cellWidth: tableWidth * 0.40, halign: "left", overflow: 'linebreak' }, // %40 - görev başlığı için daha fazla alan
        1: { cellWidth: tableWidth * 0.20, halign: "center" }, // %20
        2: { cellWidth: tableWidth * 0.20, halign: "center" }, // %20
        3: { cellWidth: tableWidth * 0.20, halign: "center" }, // %20
      },
    });
  }

  // Özet bölümü
  const finalY = doc.lastAutoTable?.finalY || yPos;
  if (finalY < pageHeight - 120) {
    yPos = finalY + 30;
    
    // Özet metnini hazırla
    const completionRate = userStats.total > 0 ? Math.round((userStats.completed / userStats.total) * 100) : 0;
    const summaryText = `${userStats.userName} kullanıcısı toplam ${userStats.total} görev almış, ${userStats.completed} görevi tamamlamıştır. Tamamlanma oranı: %${completionRate}`;
    
    // Metni satırlara böl (maksimum genişlik kontrolü)
    const currentPageWidth = doc.internal.pageSize.getWidth();
    const maxWidth = currentPageWidth - 2 * mar - 30; // 30pt padding
    const lines = doc.splitTextToSize(summaryText, maxWidth);
    const lineHeight = 14;
    const summaryHeight = Math.max(70, 20 + (lines.length * lineHeight) + 10); // Minimum 70pt, dinamik yükseklik
    
    // Sayfa sığmazsa yeni sayfa ekle
    if (yPos + summaryHeight > pageHeight - 100) {
      doc.addPage();
      const template = createPDFTemplate(doc);
      drawPDFBackground(doc, template);
      yPos = mar + 30;
    }
    
    safeSetFontUser(true);
    doc.setTextColor(255, 255, 255);
    doc.setFillColor(59, 130, 246);
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(1.5);
    const summaryPageWidth = doc.internal.pageSize.getWidth();
    doc.roundedRect(mar, yPos, summaryPageWidth - 2 * mar, summaryHeight, 6, 6, "F");
    doc.roundedRect(mar, yPos, summaryPageWidth - 2 * mar, summaryHeight, 6, 6, "S");
    
    safeTextUser("Özet", mar + 15, yPos + 20, 16);
    
    safeSetFontUser(false);
    doc.setTextColor(255, 255, 255);
    // Metni satır satır yaz
    lines.forEach((line: string, index: number) => {
      safeTextUser(line, mar + 15, yPos + 40 + (index * lineHeight), 11);
    });
  }

  // Footer'ı ekle
  try {
    const finalTemplate = createPDFTemplate(doc);
    drawPDFFooter(doc, finalTemplate);
  } catch (footerError) {
    // Footer hatası kritik değil, PDF'i yine de döndür
  }
  
  // PDF'i güvenli bir şekilde oluştur
  try {
    const blob = doc.output("blob");
    if (!blob || blob.size === 0) {
      throw new Error("PDF blob boş veya geçersiz");
    }
    return blob;
  } catch (outputError) {
    throw new Error("PDF oluşturulamadı: " + (outputError instanceof Error ? outputError.message : "Bilinmeyen hata"));
  }
};

/**
 * PDF Generation Summary:
 * - Library: jsPDF + jspdf-autotable (programmatic PDF generation, NOT html2canvas or react-pdf)
 * - File: src/services/pdfGenerator.ts -> generateSalesOfferPDF()
 * - A4 Dimensions: 595pt (width) x 842pt (height) in portrait
 * - Margins: 40pt on all sides
 * - Content Width: 515pt (595 - 80)
 * 
 * Layout Constraints:
 * - Header: Top 20% of page (max 170pt)
 * - Table: Central area with percentage-based column widths
 * - Notes/Totals: Bottom area, split 50/50
 * - Footer: Fixed 60pt at bottom
 * 
 * Column Widths (percentage-based to fit A4):
 * - No: 8% (~41pt)
 * - Ürün Adı: 48% (~247pt)
 * - Adet: 10% (~52pt)
 * - Birim Fiyat: 17% (~88pt)
 * - Toplam: 17% (~88pt)
 */
export const generateSalesOfferPDF = async (payload: SalesOfferPayload) => {
  const doc = createPdf({ format: "a4", unit: "pt" });
  await registerFonts(doc);
  
  // Font'un gerçekten yüklendiğini doğrula
  if (doc._robotoFontLoaded && !doc._robotoFontLoadFailed) {
    const currentFont = doc.getFont();
    if (!currentFont || !isRobotoName(currentFont.fontName)) {
      await registerFonts(doc);
    }
  }
  
  applyDocumentTypography(doc);
  
  // A4 dimensions and margins - FIXED VALUES
  const mar = 40; // Margin on all sides
  const pageWidth = 595; // A4 width in pt
  const pageHeight = 842; // A4 height in pt
  const contentWidth = pageWidth - (mar * 2); // 515pt usable width
  
  // Verify actual page size matches expected A4
  const actualWidth = doc.internal.pageSize.getWidth();
  const actualHeight = doc.internal.pageSize.getHeight();
  if (Math.abs(actualWidth - pageWidth) > 1 || Math.abs(actualHeight - pageHeight) > 1) {
  }

  // Header - Form Preview Style
  // Logo ve Şirket Bilgileri (Sağ Üst)
  const logoWidth = 40;
  const logoHeight = 40;
  const logoX = pageWidth - mar - 160; // Logo ve text için alan ayır
  
  // Helper functions
  const safeNumber = (value: unknown): number => {
    const num = Number(value);
    return (isNaN(num) || !isFinite(num)) ? 0 : num;
  };
  
  const safeFormatCurrency = (value: number, currency: string): string => {
    const safeVal = safeNumber(value);
    // Türkçe locale kullan (web UI ile uyumlu)
    return `${currency}${safeVal.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  // Create safeText helper with color support - createSafeText kullan
  const baseSafeText = createSafeText(doc);
  const safeText = (text: string, x: number, y: number, fontSize: number, isBold: boolean = false, color?: [number, number, number]) => {
    try {
      // Renk ayarla
      if (color) {
        doc.setTextColor(color[0], color[1], color[2]);
      }
      
      // createSafeText kullan (Türkçe karakter desteği ile)
      baseSafeText(text, x, y, fontSize, isBold);
      
      // Renk sıfırla
      if (color) {
        doc.setTextColor(0, 0, 0);
      }
    } catch (error) {
      // Hata durumunda fallback
      try {
        doc.setFont("helvetica", isBold ? "bold" : "normal");
        doc.setFontSize(fontSize);
        // Problemli karakterleri transliterate et
        const hasProblematicChars = /[şŞİğĞ]/.test(text);
        const safeTextFallback = hasProblematicChars ? transliterateTurkish(text) : text;
        if (color) {
          doc.setTextColor(color[0], color[1], color[2]);
        }
        doc.text(safeTextFallback, x, y);
        doc.setTextColor(0, 0, 0);
      } catch (fallbackError) {
      }
    }
  };
  
  // Background: Light grey diagonal/triangular panel on the left side
  try {
    doc.setFillColor(243, 244, 246); // gray-100 - light grey
    doc.setGState(doc.GState({ opacity: 0.3 }));
    
    // Diagonal triangular shape on the left
    // Create a polygon-like shape using multiple rectangles
    const bgStartX = 0;
    const bgStartY = 0;
    const bgWidth = 200; // Width of the grey panel
    const bgHeight = pageHeight;
    
    // Draw diagonal shape
    doc.rect(bgStartX, bgStartY, bgWidth, bgHeight, "F");
    
    // Reset opacity
    doc.setGState(doc.GState({ opacity: 1 }));
  } catch (error) {
  }
  
  // Header Y position - Optimized for A4 (top 20% of page = ~170pt max)
  const headerY = 45; // Reduced from 50
  
  // Left Side: Title - Two lines: "SATIŞ TEKLİFİ" and "FORMU"
  // Reduced font size slightly for better fit
  safeText("SATIŞ TEKLİFİ", mar, headerY, 30, true); // Reduced from 32
  safeText("FORMU", mar, headerY + 36, 30, true); // Reduced from 32, adjusted spacing
  
  // Customer Info Block - Left side, aligned with title
  const customerBlockY = headerY + 90; // Reduced from 100 for tighter spacing
  safeText("Müşteri", mar, customerBlockY, 14, true);
  
  const customerName = payload.customerName || "";
  const customerCompany = payload.customerCompany || "";
  const customerAddress = payload.customerAddress || "";
  const customerPhone = payload.customerPhone || "";
  const customerEmail = payload.customerEmail || "";
  
  let customerY = customerBlockY + 24;
  
  // Customer name/company (prioritize customerName over customerCompany)
  const customerText = customerName || customerCompany || "";
  if (customerText) {
    safeSetFont(doc, "normal");
    doc.setFontSize(14);
    const customerLines = doc.splitTextToSize(customerText, 280);
    customerLines.forEach((line: string) => {
      doc.setTextColor(31, 41, 55); // gray-800
      safeText(line, mar, customerY, 14, false);
      doc.setTextColor(0, 0, 0);
      customerY += 18;
    });
  }
  
  // Additional customer details (address, phone, email) - each on a new line
  const customerDetails: string[] = [];
  if (customerAddress) customerDetails.push(customerAddress);
  if (customerPhone) customerDetails.push(customerPhone);
  if (customerEmail) customerDetails.push(customerEmail);
  
  customerDetails.forEach((detail) => {
    doc.setTextColor(107, 114, 128); // gray-500
    safeSetFont(doc, "normal");
    doc.setFontSize(11);
    const detailLines = doc.splitTextToSize(detail, 280);
    detailLines.forEach((line: string) => {
      safeText(line, mar, customerY, 11, false);
      customerY += 14;
    });
    doc.setTextColor(0, 0, 0);
  });

  // Right Side: Logo & Company Info - Top right
  const rightContentX = pageWidth - mar;
  const companyInfoY = headerY;
  const headerLogoSize = 40; // 50 → 40 (daha küçük logo)
  
  // Logo - sağ üst köşede, doğru pozisyonda
  try {
    const logoX = rightContentX - headerLogoSize;
    doc.addImage(REV_LOGO_DATA_URI, 'PNG', logoX, companyInfoY, headerLogoSize, headerLogoSize);
  } catch (error) {
  }
  
  // Company address block - under logo, right-aligned (daha kompakt)
  const addressLines = [
    COMPANY_INFO.address,
    COMPANY_INFO.city,
    COMPANY_INFO.email,
    COMPANY_INFO.website,
    COMPANY_INFO.phone
  ];
  
  let addrY = companyInfoY + headerLogoSize + 10; // 14 → 10 (daha az boşluk)
  safeSetFont(doc, "normal");
  doc.setFontSize(9); // 10 → 9 (daha küçük font)
  addressLines.forEach(line => {
    try {
      const lineWidth = doc.getTextWidth(line);
      doc.setTextColor(75, 85, 99); // gray-600
      safeText(line, rightContentX - lineWidth, addrY, 9, false);
      doc.setTextColor(0, 0, 0);
      addrY += 11; // 13 → 11 (daha kompakt satır aralığı)
    } catch (error) {
      addrY += 11;
    }
  });

  // Date Info - Right side, şirket bilgilerinden sonra (üst üste binmeyi önlemek için)
  // Şirket bilgileri: addrY başlangıç + (5 satır * 11pt) = companyInfoY + headerLogoSize + 10 + 55 = companyInfoY + 105
  const dateInfoY = companyInfoY + headerLogoSize + 10 + (addressLines.length * 11) + 12; // Şirket bilgilerinden sonra 12pt boşluk
  
  // Format dates in Turkish format: "20 Ağustos 2025"
  const formatDateTurkish = (dateStr: string | Date): string => {
    try {
      const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
      if (isNaN(date.getTime())) {
        // If already formatted (contains Turkish month names), return as is
        if (typeof dateStr === 'string' && (dateStr.includes('Ocak') || dateStr.includes('Şubat') || dateStr.includes('Mart') || dateStr.includes('Nisan') || dateStr.includes('Mayıs') || dateStr.includes('Haziran') || dateStr.includes('Temmuz') || dateStr.includes('Ağustos') || dateStr.includes('Eylül') || dateStr.includes('Ekim') || dateStr.includes('Kasım') || dateStr.includes('Aralık'))) {
          return dateStr;
        }
        return formatDate(String(dateStr));
      }
      const months = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
      return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    } catch (error) {
      return formatDate(String(dateStr));
    }
  };
  
  // Tarih - sağa yaslı
  const dateLabel = "Tarih:";
  let dateValue: string = "-";
  try {
    dateValue = formatDateTurkish(payload.quoteDate);
  } catch (error) {
    dateValue = "-";
  }
  
  safeSetFont(doc, "bold");
  doc.setFontSize(14);
  const dateLabelWidth = doc.getTextWidth(dateLabel);
  safeSetFont(doc, "normal");
  doc.setFontSize(14);
  const dateValueWidth = doc.getTextWidth(dateValue);
  const dateX = rightContentX - dateValueWidth;
  safeText(dateLabel, dateX - dateLabelWidth - 6, dateInfoY, 14, true);
  doc.setTextColor(55, 65, 81); // gray-700
  safeText(dateValue, dateX, dateInfoY, 14, false);
  doc.setTextColor(0, 0, 0);
  
  // Geçerlilik Tarihi - sağa yaslı, altında
  const validLabel = "Geçerlilik Tarihi:";
  let validValue: string = "-";
  try {
    validValue = formatDateTurkish(payload.validUntil);
  } catch (error) {
    validValue = "-";
  }
  
  safeSetFont(doc, "bold");
  doc.setFontSize(14);
  const validLabelWidth = doc.getTextWidth(validLabel);
  safeSetFont(doc, "normal");
  doc.setFontSize(14);
  const validValueWidth = doc.getTextWidth(validValue);
  const validX = rightContentX - validValueWidth;
  safeText(validLabel, validX - validLabelWidth - 6, dateInfoY + 22, 14, true);
  doc.setTextColor(55, 65, 81); // gray-700
  safeText(validValue, validX, dateInfoY + 22, 14, false);
  doc.setTextColor(0, 0, 0);
  
  // Table starts after customer/date blocks - ensure enough space
  // Optimized spacing for A4 layout
  const maxBottomY = Math.max(customerY, dateInfoY + 40); // Reduced from 45
  let currentY = maxBottomY + 30; // Reduced from 35 for tighter layout
  
  // Products Table - Full width with columns: No, Ürün Adı, Adet, Birim Fiyat, Toplam
  const items = Array.isArray(payload.items) ? payload.items.filter(item => item.description && item.description.trim() !== "") : [];
  
  const tableBody = items.map((item, index) => {
    const unitPrice = safeNumber(item.unitPrice);
    const quantity = safeNumber(item.quantity);
    const discount = safeNumber(item.discount || 0);
    const lineTotal = (quantity * unitPrice) - discount;
    
    return [
      (index + 1).toString(), // No (1-based)
      item.description || "-", // Ürün Adı (supports multi-line)
      quantity.toString(), // Adet
      safeFormatCurrency(unitPrice, payload.currency || "$"), // Birim Fiyat
      safeFormatCurrency(lineTotal, payload.currency || "$"), // Toplam
    ];
  });

  const tableHead = [["No", "Ürün Adı", "Adet", "Birim Fiyat", "Toplam"]];
  
  let startY = currentY;
  const baseDidParseCell = createDidParseCell(doc);
  
  // Alternatif satır renkleri için özel didParseCell
  const didParseCell = (data: { row?: { index?: number }; cell?: { styles?: { fillColor?: number[] } } }) => {
    // Base fonksiyonu çağır
    if (baseDidParseCell) {
      baseDidParseCell(data);
    }
    
    // Body satırları için alternatif renk (header hariç, index 0 header)
    if (data.row && data.row.index !== undefined && data.cell && data.cell.styles) {
      const rowIndex = data.row.index;
      // Header index 0, body satırları 1'den başlar
      if (rowIndex > 0) {
        // Çift satırlar için alternatif renk (2, 4, 6, ... - 0-based değil, 1-based body)
        if ((rowIndex - 1) % 2 === 1) {
          data.cell.styles.fillColor = [248, 250, 252]; // slate-50
        } else {
          data.cell.styles.fillColor = [255, 255, 255]; // Beyaz
        }
      }
    }
  };
  
  // Dinamik tablo genişliği hesaplama (diğer tablolarla tutarlı)
  const dynamicPageWidth = doc.internal.pageSize.getWidth();
  const tableWidth = dynamicPageWidth - (mar * 2);
  
  // Profesyonel tablo stilleri kullan (modern UI/UX kurallarına uygun)
  const tableStyles = createProfessionalTableStyles(doc, {
    headerFontSize: 11,
    bodyFontSize: 10,
    cellPadding: { top: 12, right: 14, bottom: 12, left: 14 }
  });
  
  // Modern, profesyonel renk paleti
  tableStyles.headStyles.fillColor = [15, 23, 42]; // slate-900 - daha koyu, profesyonel
  tableStyles.headStyles.textColor = [255, 255, 255]; // White
  tableStyles.headStyles.halign = "center";
  tableStyles.headStyles.fontStyle = "bold";
  tableStyles.headStyles.fontSize = 11;
  tableStyles.headStyles.lineColor = [15, 23, 42]; // slate-900 border
  tableStyles.headStyles.lineWidth = { top: 0, bottom: 2, left: 0, right: 0 }; // Kalın alt border
  tableStyles.headStyles.cellPadding = { top: 12, right: 14, bottom: 12, left: 14 };
  tableStyles.headStyles.minCellHeight = 36;
  
  // Body stilleri - daha temiz ve okunabilir
  tableStyles.bodyStyles.fillColor = [255, 255, 255]; // Beyaz
  tableStyles.bodyStyles.textColor = [30, 41, 59]; // slate-700 - daha koyu, okunabilir
  tableStyles.bodyStyles.fontSize = 10;
  tableStyles.bodyStyles.fontStyle = "normal";
  tableStyles.bodyStyles.lineColor = [226, 232, 240]; // slate-200 - daha açık border
  tableStyles.bodyStyles.lineWidth = { bottom: 0.5, top: 0, left: 0, right: 0 }; // İnce alt border
  tableStyles.bodyStyles.cellPadding = { top: 12, right: 14, bottom: 12, left: 14 };
  tableStyles.bodyStyles.minCellHeight = 32;
  tableStyles.bodyStyles.overflow = 'linebreak';
  
  // Alternatif satır renkleri (zebra striping) - daha profesyonel
  tableStyles.alternateRowStyles.fillColor = [248, 250, 252]; // slate-50 - çok açık gri
  tableStyles.styles.overflow = 'linebreak';
  
  // Sayfa sığma kontrolü
  startY = ensureTableFitsPage(doc, startY, 300, mar, "Ürün Listesi");
  
  // Font'u zorla Roboto olarak ayarla (autoTable öncesi)
  forceRobotoFont(doc, "normal");
  
  autoTable(doc, {
    head: transliterateTableData(tableHead),
    body: transliterateTableData(tableBody.length === 0
      ? [["", "Kalem bilgisi girilmedi", "", "", ""]]
      : tableBody),
    startY,
    margin: { left: mar, right: mar },
    didParseCell: didParseCell,
    tableWidth: tableWidth, // Dinamik genişlik kullan
    ...tableStyles,
    columnStyles: {
      0: { 
        cellWidth: tableWidth * 0.08, 
        halign: "center",
        textColor: [71, 85, 105], // slate-600 - daha yumuşak
        fontStyle: "normal"
      }, // %8 - No
      1: { 
        cellWidth: tableWidth * 0.48, 
        halign: "left", 
        overflow: 'linebreak',
        textColor: [15, 23, 42], // slate-900 - ürün adı daha koyu
        fontStyle: "normal"
      }, // %48 - Ürün Adı
      2: { 
        cellWidth: tableWidth * 0.10, 
        halign: "center",
        textColor: [30, 41, 59], // slate-700
        fontStyle: "normal"
      }, // %10 - Adet
      3: { 
        cellWidth: tableWidth * 0.17, 
        halign: "right",
        textColor: [30, 41, 59], // slate-700
        fontStyle: "normal"
      }, // %17 - Birim Fiyat
      4: { 
        cellWidth: tableWidth * 0.17, 
        halign: "right",
        textColor: [15, 23, 42], // slate-900 - toplam daha vurgulu
        fontStyle: "bold" // Toplam sütunu bold
      }, // %17 - Toplam
    },
  });

  // Get actual table end position - minimum 30pt boşluk (diğer tablolarla tutarlı)
  let tableEndY = (doc.lastAutoTable?.finalY || startY);
  if (doc.lastAutoTable?.finalY) {
    tableEndY = doc.lastAutoTable.finalY + 50; // Optimize edilmiş boşluk: 50pt
    } else {
    tableEndY = startY + 50; // Fallback: eğer lastAutoTable yoksa
  }

  // Layout: Left (Notes) - Right (Totals) at bottom
  // Calculate available space - ensure footer doesn't overlap
  const footerReservedSpace = 70; // Space reserved for footer (reduced from 80)
  const minSpaceForNotesAndTotals = 180; // Minimum space needed (reduced from 200)
  const availableSpace = pageHeight - tableEndY - footerReservedSpace;
  
  // Check if we need a new page for notes/totals
  let notesStartY = tableEndY + 25; // Reduced from 30
  if (availableSpace < minSpaceForNotesAndTotals) {
    doc.addPage();
    notesStartY = 45; // Reduced from 50
    tableEndY = notesStartY - 25; // Reset for new page
  }
  
  // Left Column: Notes area (bottom left)
  // Optimized for A4: exactly half width minus gap
  let notesY = notesStartY;
  const notesWidth = (contentWidth / 2) - 15; // Gap between columns: 15pt
  
  // Collect all notes/terms
  const allNotes: string[] = [];
  if (payload.notes && payload.notes.trim() !== "") {
    allNotes.push(payload.notes);
  }
  if (payload.deliveryTerms && payload.deliveryTerms.trim() !== "") {
    allNotes.push(`Teslimat: ${payload.deliveryTerms}`);
  }
  if (payload.paymentTerms && payload.paymentTerms.trim() !== "") {
    allNotes.push(`Ödeme: ${payload.paymentTerms}`);
  }
  if (payload.terms && payload.terms.length > 0) {
    allNotes.push(...payload.terms);
  }
  
  // Render notes with bullet points
  allNotes.forEach((note) => {
    try {
      safeSetFont(doc, "normal");
      doc.setFontSize(11);
      doc.setTextColor(107, 114, 128); // gray-500
      safeText("•", mar, notesY, 11, false);
      doc.setTextColor(0, 0, 0);
      
      // Wrap text
      const noteLines = doc.splitTextToSize(note, notesWidth - 15);
      let noteLineY = notesY;
      noteLines.forEach((line: string) => {
        doc.setTextColor(75, 85, 99); // gray-600
        safeText(line, mar + 12, noteLineY, 11, false);
        doc.setTextColor(0, 0, 0);
        noteLineY += 14;
      });
      notesY += (noteLines.length * 14) + 6;
    } catch (error) {
      notesY += 16;
    }
  });
  
  // Right Column: Totals (bottom right, aligned)
  const totals = payload.totals || { subtotal: 0, discount: 0, tax: 0, grandTotal: 0 };
  const currency = payload.currency || "$";
  
  const safeSubtotal = safeNumber(totals.subtotal);
  const safeDiscount = safeNumber(totals.discount);
  const safeTax = safeNumber(totals.tax);
  const safeGrandTotal = safeNumber(totals.grandTotal);
  const safeTaxRate = safeNumber(payload.taxRate || 20);
  
  // Right column X position - ensure proper alignment
  // Start at middle of page + gap
  const rightColX = mar + (contentWidth / 2) + 15; // Gap: 15pt (matches notesWidth gap)
  
  // Start totals from same Y as notes
  let totalsY = notesStartY;
  
  // Helper for right aligned totals row
  // Optimized font sizes for A4
  const drawTotalRow = (label: string, value: string, isBold = false, isGrandTotal = false) => {
    try {
      const fontSize = isGrandTotal ? 14 : 12; // Reduced: 16→14, 14→12
      safeSetFont(doc, isBold || isGrandTotal ? "bold" : "normal");
      doc.setFontSize(fontSize);
      
      const valueWidth = doc.getTextWidth(value);
      
      // Label on left side of totals area, value on right
      safeText(label, rightColX, totalsY, fontSize, isBold || isGrandTotal);
      safeText(value, rightContentX - valueWidth, totalsY, fontSize, isBold || isGrandTotal);
      
      totalsY += isGrandTotal ? 22 : 18; // Reduced spacing: 26→22, 20→18
    } catch (error) {
      totalsY += isGrandTotal ? 20 : 18; // Reduced spacing
    }
  };
  
  // Discount (if any)
  if (safeDiscount > 0) {
    drawTotalRow("Toplam İskonto:", `-${safeFormatCurrency(safeDiscount, currency)}`);
  }
  
  // Ara Toplam
  drawTotalRow("Ara Toplam:", safeFormatCurrency(safeSubtotal, currency));
  
  // KDV
  drawTotalRow(`KDV (%${safeTaxRate.toFixed(0)}):`, safeFormatCurrency(safeTax, currency));
  
  // Separator line
  doc.setDrawColor(107, 114, 128); // gray-500
  doc.setLineWidth(1.5);
  doc.line(rightColX, totalsY - 6, rightContentX, totalsY - 6);
  totalsY += 10;
  
  // GENEL TOPLAM (bold, bigger) - Optimized for A4
  const grandTotalLabel = "GENEL TOPLAM:";
  const grandTotalValue = safeFormatCurrency(safeGrandTotal, currency);
  
  safeSetFont(doc, "bold");
  doc.setFontSize(14); // Reduced from 16 for better fit
  const grandTotalValueWidth = doc.getTextWidth(grandTotalValue);
  safeText(grandTotalLabel, rightColX, totalsY, 14, true);
  safeText(grandTotalValue, rightContentX - grandTotalValueWidth, totalsY, 14, true);

  // Footer - Bottom of page, ensure it doesn't overlap content
  // Optimized spacing for A4
  const maxContentY = Math.max(notesY, totalsY) + 15; // Reduced from 20
  const footerHeight = 55; // Reduced from 60
  const footerBottomY = pageHeight - footerHeight;
  
  // Check if content overlaps footer area
  if (maxContentY > footerBottomY - 25) { // Reduced threshold from 30
    // Content too close to footer, add new page for footer
    doc.addPage();
  }
  
  // Draw footer on current page (or new page if added)
  const currentPageHeight = doc.internal.pageSize.getHeight();
  const footerY = currentPageHeight - footerHeight;
  
  // Footer separator line
  doc.setDrawColor(209, 213, 219); // gray-300
  doc.setLineWidth(1);
  doc.line(mar, footerY - 10, rightContentX, footerY - 10);
  
  // Left: Company legal info
  safeSetFont(doc, "bold");
  doc.setFontSize(10);
  doc.setTextColor(31, 41, 55); // gray-800
  safeText(COMPANY_INFO.name, mar, footerY, 10, true);
  doc.setTextColor(0, 0, 0);
  
  safeSetFont(doc, "normal");
  doc.setFontSize(9);
  doc.setTextColor(75, 85, 99); // gray-600
  safeText(COMPANY_INFO.fullAddress, mar, footerY + 12, 9, false);
  safeText(`${COMPANY_INFO.email} | ${COMPANY_INFO.website} | ${COMPANY_INFO.phone}`, mar, footerY + 22, 9, false);
  doc.setTextColor(0, 0, 0);
  
  // Right: Logo (smaller size, bottom-right aligned)
  try {
    const footerLogoSize = 28;
    const logoX = rightContentX - footerLogoSize;
    doc.addImage(REV_LOGO_DATA_URI, 'PNG', logoX, footerY, footerLogoSize, footerLogoSize);
  } catch (error) {
  }

  // PDF'i güvenli bir şekilde oluştur
  try {
    const blob = doc.output("blob");
    if (!blob || blob.size === 0) {
      throw new Error("PDF blob boş veya geçersiz");
    }
    return blob;
  } catch (outputError) {
    throw new Error("PDF oluşturulamadı: " + (outputError instanceof Error ? outputError.message : "Bilinmeyen hata"));
  }
};
