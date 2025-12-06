import jsPDF, { jsPDFOptions } from "jspdf";
import autoTable from "jspdf-autotable";
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
  margin: 40,
  headerHeight: 130,
  footerHeight: 50,
  logoSize: 50,
  footerLogoSize: 32,
  primaryColor: [221, 83, 53] as [number, number, number],
  mutedColor: [75, 85, 99] as [number, number, number],
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
      contentStartY: PDF_CONSTANTS.headerHeight + 40, // Header'dan sonra 40px boşluk
    },
    footer: {
      startY: pageHeight - PDF_CONSTANTS.footerHeight,
      endY: pageHeight,
    },
    contentArea: {
      startY: PDF_CONSTANTS.headerHeight + 40, // Header'dan sonra başlar
      endY: pageHeight - PDF_CONSTANTS.footerHeight - 20, // Footer'dan önce biter (20px boşluk)
      width: pageWidth - (mar * 2),
      leftMargin: mar,
      rightMargin: mar,
    },
  };
};

// Sabit İstatistik Kartı Çizme Fonksiyonu - tasarım sabit, değerler dinamik
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
  
  // Kart arka planı - sabit tasarım
  doc.setFillColor(bgR, bgG, bgB);
  doc.roundedRect(x, y, width, height, 6, 6, "F");
  
  // Border - sabit tasarım
  doc.setDrawColor(borderR, borderG, borderB);
  doc.setLineWidth(1.5);
  doc.roundedRect(x, y, width, height, 6, 6, "S");
  
  // Shadow efekti simülasyonu - sabit tasarım
  doc.setFillColor(0, 0, 0);
  doc.setGState(doc.GState({ opacity: 0.05 }));
  doc.roundedRect(x + 2, y + 2, width, height, 6, 6, "F");
  doc.setGState(doc.GState({ opacity: 1 }));
  
  // Başlık - profesyonel tasarım (16pt padding)
  doc.setTextColor(textR, textG, textB);
  safeText(config.title, x + 16, y + 22, 15, true);
  
  // Değer - profesyonel tasarım (daha büyük ve net)
  const valueText = typeof config.value === 'number' ? config.value.toString() : config.value;
  doc.setTextColor(valueR, valueG, valueB);
  safeText(valueText, x + 16, y + 58, 32, true);
  
  // Açıklama - profesyonel tasarım (opsiyonel)
  if (config.description) {
    doc.setTextColor(textR, textG, textB);
    safeText(config.description, x + 16, y + 98, 13, false);
  }
  
  doc.setTextColor(0, 0, 0);
};

// Profesyonel Tablo Başlığı Çizme Fonksiyonu - iyileştirilmiş tasarım
const drawProfessionalTableHeader = (
  doc: jsPDFWithFontStatus,
  x: number,
  y: number,
  width: number,
  config: TableHeaderConfig
): number => {
  const safeText = createSafeText(doc);
  const [primaryR, primaryG, primaryB] = PDF_CONSTANTS.primaryColor;
  
  const bgColor = config.backgroundColor || [249, 250, 251];
  const textColor = config.textColor || [primaryR, primaryG, primaryB];
  const borderColor = config.borderColor || [primaryR, primaryG, primaryB];
  
  // Başlık için arka plan - profesyonel tasarım (32pt yükseklik, 8pt üst padding)
  doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
  doc.roundedRect(x, y - 8, width, 32, 4, 4, "F");
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setGState(doc.GState({ opacity: 0.2 }));
  doc.setLineWidth(1);
  doc.roundedRect(x, y - 8, width, 32, 4, 4, "S");
  doc.setGState(doc.GState({ opacity: 1 }));
  
  // Başlık text - profesyonel font size (13px)
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  safeText(config.title, x + 12, y + 8, 13, true);
  doc.setTextColor(0, 0, 0);
  
  return y + 40; // Başlıktan sonraki Y pozisyonu (32pt başlık + 8pt boşluk - artırıldı)
};

// Eski fonksiyon için alias (geriye dönük uyumluluk)
const drawTableHeader = drawProfessionalTableHeader;

// Profesyonel Tablo Stil Konfigürasyonu - tüm tablolarda kullanılacak
interface ProfessionalTableStyles {
  headStyles: any;
  bodyStyles: any;
  styles: any;
  alternateRowStyles: any;
}

const createProfessionalTableStyles = (
  doc: jsPDFWithFontStatus,
  options?: {
    headerFontSize?: number;
    bodyFontSize?: number;
    cellPadding?: { top: number; right: number; bottom: number; left: number };
  }
): ProfessionalTableStyles => {
  const headerFontSize = options?.headerFontSize || 13;
  const bodyFontSize = options?.bodyFontSize || 12;
  const cellPadding = options?.cellPadding || { top: 16, right: 18, bottom: 16, left: 18 };
  
  // Font'u zorla Roboto yap - eğer yüklüyse
  const fontName = (doc._robotoFontLoaded && !doc._robotoFontLoadFailed) ? "Roboto" : "helvetica";
  
  return {
    headStyles: {
      fillColor: [249, 250, 251], // gray-50
      textColor: [17, 24, 39], // gray-900 - koyu siyah
      fontStyle: "bold",
      fontSize: headerFontSize,
      font: fontName, // Zorla Roboto veya helvetica
      lineColor: [209, 213, 219], // gray-300
      lineWidth: { top: 1, bottom: 1, left: 1, right: 1 },
      cellPadding: cellPadding,
      minCellHeight: 50, // Minimum satır yüksekliği - artırıldı
      overflow: 'linebreak', // Metin taşmasını önle
      wrap: true, // Metin sarmalama
    },
    bodyStyles: {
      textColor: [31, 41, 55], // gray-800 - koyu gri
      fontSize: bodyFontSize,
      font: fontName, // Zorla Roboto veya helvetica
      lineColor: [229, 231, 235], // gray-200
      lineWidth: { bottom: 1 },
      cellPadding: cellPadding,
      minCellHeight: 50, // Minimum satır yüksekliği - artırıldı
      overflow: 'linebreak', // Metin taşmasını önle
      wrap: true, // Metin sarmalama
    },
    styles: {
      font: fontName, // Zorla Roboto veya helvetica
      fontStyle: "normal",
      fontSize: bodyFontSize,
      cellPadding: cellPadding,
      minCellHeight: 50, // Minimum satır yüksekliği - artırıldı
      overflow: 'linebreak', // Metin taşmasını önle
      wrap: true, // Metin sarmalama
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251], // gray-50 - alternatif satırlar
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
    
    if (titleForNextPage) {
      const safeText = createSafeText(doc);
      safeSetFont(doc, "bold");
      doc.setFontSize(12);
      doc.setTextColor(120, 129, 149);
      safeText(`${titleForNextPage} (devam)`, margin, nextY, 12, true);
      doc.setTextColor(0, 0, 0);
      nextY += 40; // Başlık sonrası 40pt boşluk (30pt'den artırıldı)
    }
    
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
  
  // Özet tablosu - sabit stil, dinamik veriler
  autoTable(doc, {
    startY: summaryY,
    head: [['Metrik', 'Değer']],
    body: data,
    margin: { left: x, right: x },
    didParseCell: createDidParseCell(doc),
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
  
  const finalY = ((doc as any).lastAutoTable?.finalY || summaryY) + 40; // Standart boşluk: 40pt (20pt'den artırıldı)
  return finalY;
};

// Font yükleme durumunu takip etmek için doc objesine property ekle
interface jsPDFWithFontStatus extends jsPDF {
  _robotoFontLoaded?: boolean;
  _robotoFontLoadFailed?: boolean; // Font yükleme başarısız olduysa tekrar deneme
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
        return; // Font zaten yüklü ve çalışıyor
      }
    } catch {
      // Font kontrolü başarısız, yeniden yükle
      doc._robotoFontLoaded = false;
    }
  }

  // Eğer daha önce yükleme başarısız olduysa, direkt helvetica kullan
  if (doc._robotoFontLoadFailed) {
    doc.setFont("helvetica", "normal");
    return;
  }

  // Font string'lerinin kesilmiş olup olmadığını kontrol et
  // Eğer "..." ile bitiyorsa, font string'leri kesilmiş demektir
  if (ROBOTO_REGULAR_BASE64.endsWith('...') || ROBOTO_BOLD_BASE64.endsWith('...')) {
    console.warn("Font base64 string'leri kesilmiş görünüyor, Helvetica kullanılacak");
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
    try {
      doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
      doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");
    } catch (addFontError) {
      // Font eklenemedi, VFS'den temizle
      try {
        // VFS'den silmek için bir yöntem yok, ama flag'i set edelim
      } catch (error) {
        // VFS'den silmek için bir yöntem yok, ama flag'i set edelim
        console.warn("Font VFS cleanup hatası:", error);
      }
      throw new Error("Font eklenemedi: " + addFontError);
    }

    // Set default font ve test et
    try {
      doc.setFont("Roboto", "normal");
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
      try {
        doc.setFontSize(12);
        // Test text'i yaz (görünmez bir yere) - tüm Türkçe karakterleri test et
        const testText = "İğüşöçÇĞÜŞÖÇ";
        doc.text(testText, -1000, -1000);
        
        // Font'un gerçekten çalıştığını doğrula
        const verifyFont = doc.getFont();
        if (verifyFont && isRobotoName(verifyFont.fontName)) {
          doc._robotoFontLoaded = true;
        } else {
          throw new Error("Font test sonrası doğrulama başarısız");
        }
      } catch (textTestError) {
        // Text yazma başarısız, ama font yüklü olabilir
        // Font listesinde varsa ve font adı doğruysa kabul et
        const fontList = doc.getFontList();
        const hasRoboto = fontList && Object.keys(fontList).some((fontKey) => isRobotoName(fontKey));
        const currentFont = doc.getFont();
        if (hasRoboto && currentFont && isRobotoName(currentFont.fontName)) {
          doc._robotoFontLoaded = true;
        } else {
          throw new Error("Font test başarısız: " + textTestError);
        }
      }
    } catch (fontTestError) {
      // Font test başarısız, helvetica'ya geç
      doc.setFont("helvetica", "normal");
      throw new Error("Font yüklendi ama kullanılamıyor: " + fontTestError);
    }
  } catch (e) {
    console.warn("Font loading failed, falling back to helvetica permanently", e);
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
  
  // Font'u güvenli şekilde ayarla
  if (doc._robotoFontLoaded && !doc._robotoFontLoadFailed) {
    safeSetFont(doc, "normal");
    
    // Font'un gerçekten ayarlandığını doğrula
    try {
      const currentFont = doc.getFont();
      if (!currentFont || !isRobotoName(currentFont.fontName)) {
        // Roboto ayarlanamadı, Helvetica'ya geç
        doc.setFont("helvetica", "normal");
        doc._robotoFontLoaded = false;
        doc._robotoFontLoadFailed = true;
      }
    } catch {
      // Font kontrolü başarısız, Helvetica'ya geç
      doc.setFont("helvetica", "normal");
      doc._robotoFontLoaded = false;
      doc._robotoFontLoadFailed = true;
    }
  } else {
    doc.setFont("helvetica", "normal");
  }
  
  doc.setFontSize(11); // Profesyonel font boyutu
};

const getFontName = (doc?: jsPDFWithFontStatus): string => {
  // Roboto font yüklüyse ve başarısız olmadıysa kullan
  if (doc?._robotoFontLoaded && !doc?._robotoFontLoadFailed) {
    // Font'un gerçekten yüklü olduğunu kontrol et
    try {
      const fontList = doc?.getFontList();
      if (fontList && Object.keys(fontList).some((key) => isRobotoName(key))) {
        return "Roboto";
      }
    } catch (error) {
      // Font listesi alınamazsa Helvetica'ya geç
    }
  }
  // Eğer Roboto yüklenemezse, Helvetica kullan (autoTable için)
  // Helvetica Türkçe karakterleri desteklemez ama en azından çalışır
  return "helvetica";
};

// Güçlendirilmiş Türkçe Karakter Desteği - didParseCell hook'u
const createDidParseCell = (doc: jsPDFWithFontStatus) => {
  return (data: any) => {
    // Eğer Roboto font yüklüyse, text'i olduğu gibi bırak ve font'u zorla ayarla
    if (doc._robotoFontLoaded && !doc._robotoFontLoadFailed) {
      // Roboto font'u kullan, text'i değiştirme - Türkçe karakterleri destekler
      // autoTable için font'u zorla ayarla - her cell'de
      if (data.cell) {
        // Cell'in fontStyle'ına göre font ayarla
        try {
          const cell = data.cell as any;
          const fontStyle = (cell.fontStyle === "bold" || cell.fontStyle === "bold") ? "bold" : "normal";
          
          // Font'u güvenli şekilde ayarla - daha agresif
          safeSetFont(doc, fontStyle);
          
          // Font'un gerçekten Roboto olduğunu kontrol et - daha sıkı kontrol
          let attempts = 0;
          let fontVerified = false;
          const maxAttempts = 3;
          
          while (attempts < maxAttempts && !fontVerified) {
            const currentFont = doc.getFont();
            if (currentFont && isRobotoName(currentFont.fontName)) {
              // Font Roboto, doğrula
              // Türkçe karakter testi yap
              try {
                doc.setFontSize(12);
                doc.text("İğüşöç", -1000, -1000);
                fontVerified = true;
                break;
              } catch (testError) {
                // Test başarısız ama font listesini kontrol et
                const fontList = doc.getFontList();
                const hasRoboto = fontList && Object.keys(fontList).some((key) => isRobotoName(key));
                if (hasRoboto) {
                  fontVerified = true;
                  break;
                }
              }
            }
            
            // Tekrar ayarla
            try {
              doc.setFont("Roboto", fontStyle);
              attempts++;
            } catch {
              break;
            }
          }
          
          if (!fontVerified) {
            // Font Roboto değilse, Helvetica'ya geç ve transliterate et
            doc.setFont("helvetica", fontStyle);
            doc._robotoFontLoaded = false;
            doc._robotoFontLoadFailed = true;
            if (cell.text && typeof cell.text === 'string') {
              cell.text = transliterateTurkish(cell.text);
            }
            cell.font = "helvetica";
          } else {
            // Font Roboto, text'i olduğu gibi bırak - Türkçe karakterler korunur
            cell.font = "Roboto";
          }
          
          cell.fontStyle = fontStyle;
        } catch (error) {
          // Font ayarlama hatası, Helvetica'ya geç
          try {
            doc.setFont("helvetica", "normal");
            if (data.cell && data.cell.text && typeof data.cell.text === 'string') {
              (data.cell as any).text = transliterateTurkish(data.cell.text);
            }
            (data.cell as any).font = "helvetica";
          } catch {
            // Son çare: sessizce devam et
          }
        }
      }
      return;
    } else {
      // Helvetica kullanılıyorsa transliterate et
      if (data.cell && data.cell.text && typeof data.cell.text === 'string') {
        (data.cell as any).text = transliterateTurkish(data.cell.text);
      }
      // Font'u helvetica olarak ayarla
      if (data.cell) {
        (data.cell as any).font = "helvetica";
      }
    }
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
      console.warn("Geçersiz tarih:", dateStr);
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
      console.warn("Geçersiz tarih bileşenleri:", { day, monthIndex, year });
      return "-";
    }
    
    const month = months[monthIndex];
    if (!month) {
      console.warn("Geçersiz ay indeksi:", monthIndex);
      return "-";
    }
    
    return `${day} ${month} ${year}`;
  } catch (error) {
    console.error("Tarih formatlama hatası:", error, dateStr);
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
      doc.setFontSize(12);
      doc.setTextColor(120, 129, 149);
      safeText(`${titleForNextPage} (devam)`, margin, nextY, 12, true);
      doc.setTextColor(0, 0, 0);
      nextY += 40; // Başlık sonrası 40pt boşluk (30pt'den artırıldı)
    }
    return nextY;
  }
  return currentY;
};

const formatCurrency = (value: number, currency = "₺") => {
  const safeValue = Number.isFinite(value) ? value : 0;
  return `${currency}${safeValue.toFixed(2)}`;
};

// Optimize edilmiş helper fonksiyonlar - tüm PDF'lerde kullanılabilir
const safeNumber = (value: any): number => {
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

const createSafeText = (doc: jsPDFWithFontStatus) => {
  // Roboto font yüklüyse Türkçe karakterleri destekler, transliteration'a gerek yok
  return (text: string, x: number, y: number, fontSize: number, isBold: boolean = false) => {
    // Font yüklenmemişse veya yükleme başarısızsa direkt helvetica kullan
    if (!doc._robotoFontLoaded || doc._robotoFontLoadFailed) {
      try {
        doc.setFont("helvetica", isBold ? "bold" : "normal");
        doc.setFontSize(fontSize);
        // Helvetica Türkçe karakterleri desteklemediği için transliterate et
        const safeText = transliterateTurkish(text);
        doc.text(safeText, x, y);
      } catch (error) {
        console.warn(`Text render failed (helvetica fallback): ${text.substring(0, 50)}...`, error);
      }
      return;
    }
    
    // Roboto kullanmayı dene - daha agresif kontrol
    try {
      // Font'u zorla ayarla
      safeSetFont(doc, isBold ? "bold" : "normal");
      
      // Font'un gerçekten Roboto olduğunu doğrula - sıkı kontrol
      const currentFont = doc.getFont();
      if (!currentFont || !isRobotoName(currentFont.fontName)) {
        // Font Roboto değil, Helvetica'ya geç
        doc.setFont("helvetica", isBold ? "bold" : "normal");
        doc._robotoFontLoaded = false;
        doc._robotoFontLoadFailed = true;
        // Helvetica'ya geçtiysek transliterate et
        const safeText = transliterateTurkish(text);
        doc.setFontSize(fontSize);
        doc.text(safeText, x, y);
        return;
      }
      
      // Font Roboto, text'i olduğu gibi yaz (Türkçe karakterler korunur)
      doc.setFontSize(fontSize);
      doc.text(text, x, y);
    } catch (error: any) {
      // Roboto başarısız, Helvetica'ya geç
      try {
        doc.setFont("helvetica", isBold ? "bold" : "normal");
        doc.setFontSize(fontSize);
        // Helvetica Türkçe karakterleri desteklemediği için transliterate et
        const safeText = transliterateTurkish(text);
        doc.text(safeText, x, y);
        doc._robotoFontLoaded = false;
        doc._robotoFontLoadFailed = true;
      } catch (fallbackError) {
        // Son çare: sadece log at, text yazmayı atla
        console.warn(`Text render completely failed: ${text.substring(0, 50)}...`, error, fallbackError);
      }
    }
  };
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

// Arka plan template'i - sabit, her sayfada aynı
const drawPDFBackground = (doc: jsPDFWithFontStatus, template: PDFTemplateLayout) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const [primaryR, primaryG, primaryB] = PDF_CONSTANTS.primaryColor;
  
  // Header background gradient simülasyonu - sabit
  doc.setFillColor(primaryR, primaryG, primaryB);
  doc.setGState(doc.GState({ opacity: 0.08 }));
  doc.rect(0, 0, pageWidth, template.header.endY, "F");
  doc.setGState(doc.GState({ opacity: 0.03 }));
  doc.rect(0, 0, pageWidth, template.header.endY, "F");
  doc.setGState(doc.GState({ opacity: 1 }));
};

// Header template'i - sabit komponentler + dinamik içerik
const drawPDFHeader = (doc: jsPDFWithFontStatus, template: PDFTemplateLayout, title: string, reportDate: string, startDate?: string, endDate?: string) => {
  const mar = PDF_CONSTANTS.margin;
  const pageWidth = doc.internal.pageSize.getWidth();
  const logoSize = PDF_CONSTANTS.logoSize;
  const [primaryR, primaryG, primaryB] = PDF_CONSTANTS.primaryColor;
  const [mutedR, mutedG, mutedB] = PDF_CONSTANTS.mutedColor;
  
  // Header alt çizgisi - sabit
  doc.setDrawColor(primaryR, primaryG, primaryB);
  doc.setLineWidth(3);
  doc.line(mar, template.header.endY, pageWidth - mar, template.header.endY);
  
  // Dekoratif çizgi - sabit
  doc.setDrawColor(primaryR, primaryG, primaryB);
  doc.setGState(doc.GState({ opacity: 0.3 }));
  doc.setLineWidth(1);
  doc.line(mar, template.header.endY + 3, pageWidth - mar, template.header.endY + 3);
  doc.setGState(doc.GState({ opacity: 1 }));
  
  // Logo ve şirket bilgileri (sağ üst) - sabit komponentler
  const rightX = pageWidth - mar - 200;
  const logoY = 28;
  
  // Logo için arka plan kutusu - sabit
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(rightX - 5, logoY - 5, logoSize + 10, logoSize + 10, 4, 4, "F");
  doc.setDrawColor(primaryR, primaryG, primaryB);
  doc.setGState(doc.GState({ opacity: 0.2 }));
  doc.setLineWidth(1);
  doc.roundedRect(rightX - 5, logoY - 5, logoSize + 10, logoSize + 10, 4, 4, "S");
  doc.setGState(doc.GState({ opacity: 1 }));
  
  try {
    doc.addImage(REV_LOGO_DATA_URI, 'PNG', rightX, logoY, logoSize, logoSize);
  } catch (error) {
    // Logo eklenemezse sessizce devam et
  }
  
  const safeText = createSafeText(doc);
  
  // REVIUM brand name - sabit
  doc.setTextColor(primaryR, primaryG, primaryB);
  safeText("REVIUM", rightX + logoSize + 10, 58, 24, true);
  doc.setTextColor(0, 0, 0);
  
  // Company address info - sabit bilgiler, cache'lenmiş
  doc.setTextColor(mutedR, mutedG, mutedB);
  safeText(COMPANY_INFO.headerAddress, rightX, 75, 10, false);
  safeText(COMPANY_INFO.city, rightX, 87, 10, false);
  safeText(COMPANY_INFO.contactInfo, rightX, 99, 10, false);
  doc.setTextColor(0, 0, 0);
  
  // Report title - dinamik (değişiyor, daha okunabilir)
  doc.setTextColor(primaryR, primaryG, primaryB);
  safeText(title, mar, 58, 34, true); // İyileştirildi: 32px → 34px
  
  // Title altında dekoratif çizgi - dinamik (title genişliğine göre)
  const titleWidth = doc.getTextWidth(title);
  doc.setDrawColor(primaryR, primaryG, primaryB);
  doc.setGState(doc.GState({ opacity: 0.3 }));
  doc.setLineWidth(1.5);
  doc.line(mar, 68, mar + titleWidth, 68);
  doc.setGState(doc.GState({ opacity: 1 }));
  doc.setTextColor(0, 0, 0);
  
  // Date information - dinamik (tarih değişiyor)
  let dateY = 88;
  doc.setTextColor(mutedR, mutedG, mutedB);
  if (startDate && endDate) {
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(mar, dateY - 6, 350, 18, 3, 3, "F");
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(1);
    doc.roundedRect(mar, dateY - 6, 350, 18, 3, 3, "S");
    
    safeText(`Rapor Dönemi: ${formatDateShort(startDate)} - ${formatDateShort(endDate)}`, mar + 8, dateY + 4, 12, false);
    dateY += 22;
  }
  
  // Rapor tarihi - dinamik
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(mar, dateY - 6, 250, 18, 3, 3, "F");
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(1);
  doc.roundedRect(mar, dateY - 6, 250, 18, 3, 3, "S");
  
  safeText(`Rapor Tarihi: ${reportDate}`, mar + 8, dateY + 4, 12, true);
  doc.setTextColor(0, 0, 0);
  
  // Template'in contentStartY'sini güncelle (dateY'ye göre)
  return dateY + 40;
};

// Footer template'i - sabit komponentler + dinamik sayfa numarası
const drawPDFFooter = (doc: jsPDFWithFontStatus, template: PDFTemplateLayout, pageNumber?: number, totalPages?: number) => {
  const mar = PDF_CONSTANTS.margin;
  const pageWidth = doc.internal.pageSize.getWidth();
  const footerY = template.footer.startY;
  const footerLogoSize = PDF_CONSTANTS.footerLogoSize;
  const [primaryR, primaryG, primaryB] = PDF_CONSTANTS.primaryColor;
  const [mutedR, mutedG, mutedB] = PDF_CONSTANTS.mutedColor;
  
  // Footer üst çizgisi - sabit
  doc.setDrawColor(primaryR, primaryG, primaryB);
  doc.setLineWidth(2);
  doc.line(mar, footerY - 18, pageWidth - mar, footerY - 18);
  
  // Dekoratif çizgi - sabit
  doc.setDrawColor(primaryR, primaryG, primaryB);
  doc.setGState(doc.GState({ opacity: 0.3 }));
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
  
  // Sayfa numarası - dinamik (değişiyor)
  if (pageNumber !== undefined && totalPages !== undefined) {
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(pageWidth - mar - 100, footerY + 6, 90, 18, 3, 3, "F");
    doc.setDrawColor(primaryR, primaryG, primaryB);
    doc.setGState(doc.GState({ opacity: 0.2 }));
    doc.setLineWidth(1);
    doc.roundedRect(pageWidth - mar - 100, footerY + 6, 90, 18, 3, 3, "S");
    doc.setGState(doc.GState({ opacity: 1 }));
    
    doc.setTextColor(primaryR, primaryG, primaryB);
    try {
      safeText(`Sayfa ${pageNumber} / ${totalPages}`, pageWidth - mar - 95, footerY + 18, 10, true);
      doc.setTextColor(0, 0, 0);
    } catch (pageNumError) {
      console.warn("Sayfa numarası eklenemedi:", pageNumError);
    }
  }
  
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
    console.warn("Footer logo eklenemedi:", logoError);
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
  doc.setGState(doc.GState({ opacity: 0.2 }));
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

export const generateSalesReportPDF = async (data: any, startDate: string, endDate: string) => {
  const doc = createPdf({ format: "a4", unit: "pt" });
  await registerFonts(doc);
  
  // Font'un gerçekten yüklendiğini doğrula
  if (doc._robotoFontLoaded && !doc._robotoFontLoadFailed) {
    const currentFont = doc.getFont();
    if (!currentFont || !isRobotoName(currentFont.fontName)) {
      // Font yüklenmemiş, tekrar dene
      await registerFonts(doc);
    }
  }
  
  applyDocumentTypography(doc);
  
  const reportDate = formatDate(new Date().toISOString());
  
  // PDF Template'i uygula - sabit layout + dinamik içerik
  const template = applyPDFTemplate(doc, "SATIŞ RAPORU", reportDate, startDate, endDate);
  
  // Dinamik içerik alanından başla
  let currentY = template.contentArea.startY;
  const contentWidth = template.contentArea.width;
  const mar = template.contentArea.leftMargin;
  
  const safeText = createSafeText(doc);
  const [primaryR, primaryG, primaryB] = PDF_CONSTANTS.primaryColor;
  const [mutedR, mutedG, mutedB] = PDF_CONSTANTS.mutedColor;
  
  // İstatistik Kartları - Sabit tasarım, dinamik değerler
  const cardWidth = (contentWidth - 32) / 3;
  const cardHeight = 110; // Daha ferah: 100 → 110
  const cardGap = 16;
  let cardX = mar;
  
  // Kart 1: Toplam Gelir - sabit tasarım, dinamik değer
  const totalRevenue = safeNumber(data.totalRevenue);
  const avgOrderValueCard = safeNumber(data.totalOrders) > 0 ? safeNumber(data.totalRevenue) / safeNumber(data.totalOrders) : 0;
  drawStatCard(doc, cardX, currentY, cardWidth, cardHeight, {
    title: "Toplam Gelir",
    value: safeFormatCurrency(totalRevenue),
    description: `Ortalama: ${safeFormatCurrency(avgOrderValueCard)}`,
    color: {
      background: [primaryR, primaryG, primaryB],
      border: [primaryR, primaryG, primaryB],
      text: [mutedR, mutedG, mutedB],
      value: [primaryR, primaryG, primaryB],
    },
  });
  
  // Kart 2: Toplam Sipariş - sabit tasarım, dinamik değer
  cardX += cardWidth + cardGap;
  const totalOrders = safeNumber(data.totalOrders);
  drawStatCard(doc, cardX, currentY, cardWidth, cardHeight, {
    title: "Toplam Sipariş",
    value: totalOrders.toString(),
    description: "Tarih aralığında",
    color: {
      background: [239, 246, 255],
      border: [191, 219, 254],
      text: [107, 114, 128],
      value: [37, 99, 235],
    },
  });
  
  // Kart 3: Aktif Müşteri - sabit tasarım, dinamik değer
  cardX += cardWidth + cardGap;
  const activeCustomers = safeNumber(data.activeCustomers);
  drawStatCard(doc, cardX, currentY, cardWidth, cardHeight, {
    title: "Aktif Müşteri",
    value: activeCustomers.toString(),
    description: "Sipariş veren müşteri",
    color: {
      background: [240, 253, 244],
      border: [187, 247, 208],
      text: [107, 114, 128],
      value: [22, 163, 74],
    },
  });
  
  currentY += cardHeight + 40;
  
  // Sipariş Durumu Dağılımı Tablosu - sabit başlık tasarımı
  if (data.orders && data.orders.length > 0) {
    currentY = drawTableHeader(doc, mar, currentY, 300, {
      title: "Sipariş Durumu Dağılımı",
      backgroundColor: [249, 250, 251],
      textColor: PDF_CONSTANTS.primaryColor,
      borderColor: PDF_CONSTANTS.primaryColor,
    });
    
    const statusMap = new Map<string, { count: number; total: number }>();
    data.orders.forEach((order: any) => {
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
      in_production: "Üretimde",
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
    
    // Profesyonel tablo stilleri kullan
    const tableStyles = createProfessionalTableStyles(doc);
    
    // Sayfa sığma kontrolü
    currentY = ensureTableFitsPage(doc, currentY, 200, mar, "Sipariş Durumu Dağılımı");
    
    // Tablo genişliğini sayfa genişliğine göre ayarla
    const pageWidth = doc.internal.pageSize.getWidth();
    const tableWidth = pageWidth - (mar * 2);
    
    autoTable(doc, {
      startY: currentY,
      head: [['Durum', 'Sipariş Sayısı', 'Toplam Tutar', 'Oran']],
      body: statusTableData,
      margin: { left: mar, right: mar },
      tableWidth: tableWidth,
      didParseCell: createDidParseCell(doc),
      ...tableStyles,
      columnStyles: {
        0: { cellWidth: tableWidth * 0.35, halign: "left" }, // %35
        1: { cellWidth: tableWidth * 0.20, halign: "right", fontStyle: "bold" }, // %20
        2: { cellWidth: tableWidth * 0.25, halign: "right", fontStyle: "bold", textColor: [221, 83, 53] }, // %25
        3: { cellWidth: tableWidth * 0.20, halign: "right", fontStyle: "bold", textColor: [107, 114, 128] }, // %20
      },
    });
    
    // Tablo sonrası currentY'yi güvenli şekilde güncelle - minimum 30pt boşluk
    const tableEndY = (doc as any).lastAutoTable?.finalY;
    if (tableEndY && tableEndY > currentY) {
      currentY = tableEndY + 40; // Standart boşluk: 40pt (30pt'den artırıldı)
    } else {
      currentY += 40; // Fallback: eğer lastAutoTable yoksa (30pt'den artırıldı)
    }
  }
  
  // En Çok Satan Ürünler Tablosu - sabit başlık tasarımı
  if (data.topProducts && data.topProducts.length > 0) {
    currentY = drawTableHeader(doc, mar, currentY, 300, {
      title: "En Çok Satan Ürünler",
      backgroundColor: [249, 250, 251],
      textColor: PDF_CONSTANTS.primaryColor,
      borderColor: PDF_CONSTANTS.primaryColor,
    });
    
    const topProductsData = data.topProducts.slice(0, 10).map((p: any, index: number) => [
      `#${index + 1}`,
      p.name || '-',
      safeNumber(p.quantity).toString(),
      safeFormatCurrency(safeNumber(p.revenue))
    ]);
    
    // Özet satırı ekle
    const totalQuantity = data.topProducts.slice(0, 10).reduce((sum: number, p: any) => sum + safeNumber(p.quantity), 0);
    const totalRevenue = data.topProducts.slice(0, 10).reduce((sum: number, p: any) => sum + safeNumber(p.revenue), 0);
    topProductsData.push([
      'TOPLAM',
      '',
      totalQuantity.toString(),
      safeFormatCurrency(totalRevenue)
    ]);
    
    // Profesyonel tablo stilleri kullan
    const tableStyles2 = createProfessionalTableStyles(doc);
    
    // Sayfa sığma kontrolü
    currentY = ensureTableFitsPage(doc, currentY, 200, mar, "En Çok Satan Ürünler");
    
    // Tablo genişliğini sayfa genişliğine göre ayarla
    const pageWidth2 = doc.internal.pageSize.getWidth();
    const tableWidth2 = pageWidth2 - (mar * 2);
    
    autoTable(doc, {
      startY: currentY,
      head: [['Sıra', 'Ürün Adı', 'Adet', 'Gelir']],
      body: topProductsData,
      margin: { left: mar, right: mar },
      tableWidth: tableWidth2,
      didParseCell: createDidParseCell(doc),
      ...tableStyles2,
      columnStyles: {
        0: { cellWidth: tableWidth2 * 0.10, halign: "left", textColor: [107, 114, 128] }, // %10
        1: { cellWidth: tableWidth2 * 0.50, halign: "left", fontStyle: "normal" }, // %50
        2: { cellWidth: tableWidth2 * 0.15, halign: "right", fontStyle: "bold" }, // %15
        3: { cellWidth: tableWidth2 * 0.25, halign: "right", fontStyle: "bold", textColor: [221, 83, 53] }, // %25
      },
      didDrawCell: (data: any) => {
        // Özet satırını vurgula
        if (data.row.index === topProductsData.length - 1) {
          doc.setFillColor(221, 83, 53); // Primary color
          doc.setGState(doc.GState({ opacity: 0.1 }));
          doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, "F");
          doc.setGState(doc.GState({ opacity: 1 }));
          doc.setDrawColor(221, 83, 53);
          doc.setLineWidth(1.5);
          doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, "S");
          doc.setTextColor(221, 83, 53);
          safeSetFont(doc, "bold");
        }
      },
    });
  }
  
  // Müşteri Bazlı Analiz - Yeni detaylı bölüm
  if (data.orders && data.orders.length > 0) {
    // Tablo sonrası currentY'yi güvenli şekilde güncelle - minimum 30pt boşluk
    const tableEndY = (doc as any).lastAutoTable?.finalY;
    if (tableEndY && tableEndY > currentY) {
      currentY = tableEndY + 40; // Standart boşluk: 40pt (30pt'den artırıldı)
    } else {
      currentY += 40; // Fallback: eğer lastAutoTable yoksa (30pt'den artırıldı)
    }
    currentY = ensureSpace(doc, currentY, 200, mar, "Müşteri Analizi");
    
    // Müşteri bazlı sipariş analizi
    const customerMap = new Map<string, { name: string; orders: number; total: number }>();
    data.orders.forEach((order: any) => {
      const customerId = order.customerId || "Bilinmeyen";
      const customerName = order.customerName || order.customer?.name || "Bilinmeyen Müşteri";
      const total = safeNumber(order.total ?? order.totalAmount ?? order.total_amount ?? order.subtotal ?? 0);
      
      if (!customerMap.has(customerId)) {
        customerMap.set(customerId, { name: customerName, orders: 0, total: 0 });
      }
      const customer = customerMap.get(customerId)!;
      customer.orders += 1;
      customer.total += total;
    });
    
    const topCustomers = Array.from(customerMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
    
    if (topCustomers.length > 0) {
      currentY = drawTableHeader(doc, mar, currentY, 350, {
        title: "En Değerli Müşteriler (Top 10)",
        backgroundColor: [249, 250, 251],
        textColor: PDF_CONSTANTS.primaryColor,
        borderColor: PDF_CONSTANTS.primaryColor,
      });
      
      const customerData = topCustomers.map((c, index) => [
        `#${index + 1}`,
        c.name.length > 30 ? c.name.substring(0, 30) + "..." : c.name,
        c.orders.toString(),
        safeFormatCurrency(c.total),
        safeFormatCurrency(c.total / c.orders)
      ]);
      
      // Profesyonel tablo stilleri kullan
      const tableStyles3 = createProfessionalTableStyles(doc);
      
      // Sayfa sığma kontrolü
      currentY = ensureTableFitsPage(doc, currentY, 200, mar, "En Değerli Müşteriler");
      
      // Tablo genişliğini sayfa genişliğine göre ayarla
      const pageWidth4 = doc.internal.pageSize.getWidth();
      const tableWidth4 = pageWidth4 - (mar * 2);
      
      autoTable(doc, {
        startY: currentY,
        head: [['Sıra', 'Müşteri', 'Sipariş', 'Toplam', 'Ortalama']],
        body: customerData,
        margin: { left: mar, right: mar },
        tableWidth: tableWidth4,
        didParseCell: createDidParseCell(doc),
        ...tableStyles3,
        columnStyles: {
          0: { cellWidth: tableWidth4 * 0.08, halign: "left", textColor: [107, 114, 128] }, // %8
          1: { cellWidth: tableWidth4 * 0.35, halign: "left" }, // %35
          2: { cellWidth: tableWidth4 * 0.15, halign: "right", fontStyle: "bold" }, // %15
          3: { cellWidth: tableWidth4 * 0.25, halign: "right", fontStyle: "bold", textColor: [221, 83, 53] }, // %25
          4: { cellWidth: tableWidth4 * 0.17, halign: "right", textColor: [107, 114, 128] }, // %17
        },
      });
      
      // Tablo sonrası currentY'yi güvenli şekilde güncelle - minimum 30pt boşluk
    const tableEndY = (doc as any).lastAutoTable?.finalY;
    if (tableEndY && tableEndY > currentY) {
      currentY = tableEndY + 40; // Standart boşluk: 40pt (30pt'den artırıldı)
    } else {
      currentY += 40; // Fallback: eğer lastAutoTable yoksa (30pt'den artırıldı)
    }
    }
  }
  
  // Zaman Bazlı Analiz - Günlük/Haftalık trend
  if (data.orders && data.orders.length > 0) {
    // Helper function for date parsing - önce tanımla (hoisting için)
    function getOrderDate(order: any): Date {
      if (order.createdAt && order.createdAt.toDate) {
        return order.createdAt.toDate();
      }
      if (order.created_at) {
        const parsed = new Date(order.created_at);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      }
      if (order.createdAt) {
        const parsed = new Date(order.createdAt);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      }
      return new Date();
    }
    
    currentY = ensureSpace(doc, currentY, 200, mar, "Zaman Bazlı Analiz");
    
    // Günlük gelir analizi
    const dailyMap = new Map<string, { orders: number; revenue: number }>();
    data.orders.forEach((order: any) => {
      const orderDate = getOrderDate(order);
      const dateKey = orderDate.toISOString().split("T")[0];
      const total = safeNumber(order.total ?? order.totalAmount ?? order.total_amount ?? order.subtotal ?? 0);
      
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, { orders: 0, revenue: 0 });
      }
      const day = dailyMap.get(dateKey)!;
      day.orders += 1;
      day.revenue += total;
    });
    
    const dailyData = Array.from(dailyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14) // Son 14 gün
      .map(([date, stats]) => {
        const d = new Date(date);
        const dayName = d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" });
        return [dayName, stats.orders.toString(), safeFormatCurrency(stats.revenue)];
      });
    
    if (dailyData.length > 0) {
      // Tablo genişliğini sayfa genişliğine göre ayarla
      const pageWidthDaily = doc.internal.pageSize.getWidth();
      const tableWidthDaily = pageWidthDaily - (mar * 2);
      
      currentY = drawTableHeader(doc, mar, currentY, tableWidthDaily, {
        title: "Son 14 Günlük Trend",
        backgroundColor: [249, 250, 251],
        textColor: PDF_CONSTANTS.primaryColor,
        borderColor: PDF_CONSTANTS.primaryColor,
      });
        
        autoTable(doc, {
          startY: currentY,
          head: [['Tarih', 'Sipariş', 'Gelir']],
          body: dailyData,
          margin: { left: mar, right: mar },
          tableWidth: tableWidthDaily,
          didParseCell: createDidParseCell(doc),
          headStyles: { 
            fillColor: [243, 244, 246],
            textColor: [17, 24, 39],
            fontStyle: "bold", 
            fontSize: 12,
            font: getFontName(doc),
            lineColor: [209, 213, 219],
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
            0: { cellWidth: tableWidthDaily * 0.35, halign: "left" }, // %35
            1: { cellWidth: tableWidthDaily * 0.25, halign: "right", fontStyle: "bold" }, // %25
            2: { cellWidth: tableWidthDaily * 0.40, halign: "right", fontStyle: "bold", textColor: [221, 83, 53] }, // %40
          },
          alternateRowStyles: {
            fillColor: [249, 250, 251]
          },
        });
      
      // Tablo sonrası currentY'yi güvenli şekilde güncelle - minimum 30pt boşluk
    const tableEndY = (doc as any).lastAutoTable?.finalY;
    if (tableEndY && tableEndY > currentY) {
      currentY = tableEndY + 40; // Standart boşluk: 40pt (30pt'den artırıldı)
    } else {
      currentY += 40; // Fallback: eğer lastAutoTable yoksa (30pt'den artırıldı)
    }
    }
  }
  
  // Özet Bölümü - sabit tasarım, dinamik veriler
  currentY = ((doc as any).lastAutoTable?.finalY || currentY) + 40; // Standart boşluk: 40pt (30pt'den artırıldı)
  currentY = ensureSpace(doc, currentY, 100, mar, "Özet");
  
  const avgOrderValue = safeNumber(data.totalOrders) > 0 ? safeNumber(data.totalRevenue) / safeNumber(data.totalOrders) : 0;
  const avgCustomerValue = safeNumber(data.activeCustomers) > 0 ? safeNumber(data.totalRevenue) / safeNumber(data.activeCustomers) : 0;
  const ordersPerCustomer = safeNumber(data.activeCustomers) > 0 ? (safeNumber(data.totalOrders) / safeNumber(data.activeCustomers)).toFixed(1) : "0";
  
  const summaryData: Array<[string, string]> = [
    ['Toplam Gelir', safeFormatCurrency(safeNumber(data.totalRevenue))],
    ['Toplam Sipariş', safeNumber(data.totalOrders).toString()],
    ['Aktif Müşteri', safeNumber(data.activeCustomers).toString()],
    ['Ortalama Sipariş Değeri', safeFormatCurrency(avgOrderValue)],
    ['Müşteri Başına Ortalama Gelir', safeFormatCurrency(avgCustomerValue)],
    ['Müşteri Başına Ortalama Sipariş', ordersPerCustomer],
    ['En Çok Satan Ürün Sayısı', data.topProducts ? data.topProducts.length.toString() : "0"],
  ];
  
  currentY = drawSummarySection(doc, mar, currentY, contentWidth, "Rapor Özeti", summaryData);
  
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
          console.warn(`Sayfa ${i} footer eklenirken hata:`, pageError);
          // Devam et, diğer sayfaları eklemeye çalış
        }
      }
    }
  } catch (footerError) {
    console.warn("Footer eklenirken hata:", footerError);
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
    console.error("PDF output hatası:", outputError);
    throw new Error("PDF oluşturulamadı: " + (outputError instanceof Error ? outputError.message : "Bilinmeyen hata"));
  }
};

export const generateProductionReportPDF = async (data: any, startDate: string, endDate: string) => {
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
  
  const reportDate = formatDate(new Date().toISOString()); // Dinamik
  
  // PDF Template'i uygula
  const template = applyPDFTemplate(doc, "ÜRETİM RAPORU", reportDate, startDate, endDate);
  
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
  
  // Kart 1: Toplam Sipariş - profesyonel tasarım, dinamik değer
  const totalOrders = safeNumber(data.totalOrders);
  drawStatCard(doc, cardX, currentY, cardWidth, cardHeight, {
    title: "Toplam Sipariş",
    value: totalOrders.toString(),
    description: "Tarih aralığında",
    color: {
      background: [239, 246, 255],
      border: [191, 219, 254],
      text: [75, 85, 99],
      value: [37, 99, 235],
    },
  });
  
  // Kart 2: Tamamlanan - sabit tasarım, dinamik değer
  cardX += cardWidth + cardGap;
  const completed = safeNumber(data.completed);
  drawStatCard(doc, cardX, currentY, cardWidth, cardHeight, {
    title: "Tamamlanan",
    value: completed.toString(),
    description: "Başarıyla tamamlandı",
    color: {
      background: [240, 253, 244],
      border: [187, 247, 208],
      text: [75, 85, 99],
      value: [22, 163, 74],
    },
  });
  
  // Kart 3: Tamamlanma Oranı - sabit tasarım, dinamik değer
  cardX += cardWidth + cardGap;
  const completionRate = safeNumber(data.completionRate);
  drawStatCard(doc, cardX, currentY, cardWidth, cardHeight, {
    title: "Tamamlanma Oranı",
    value: `${completionRate.toFixed(1)}%`,
    description: "Başarı oranı",
    color: {
      background: [primaryR, primaryG, primaryB],
      border: [primaryR, primaryG, primaryB],
      text: [mutedR, mutedG, mutedB],
      value: [primaryR, primaryG, primaryB],
    },
  });
  
  currentY += cardHeight + 40;
  
  // Durum Dağılımı Tablosu - sabit başlık tasarımı
  if (data.statusDistribution) {
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
    const tableStyles = createProfessionalTableStyles(doc);
    
    // Sayfa sığma kontrolü
    currentY = ensureTableFitsPage(doc, currentY, 200, mar, "Durum Dağılımı");
    
    autoTable(doc, {
      startY: currentY,
      head: [['Durum', 'Sipariş Sayısı', 'Oran']],
      body: statusData,
      margin: { left: mar, right: mar },
      didParseCell: createDidParseCell(doc),
      ...tableStyles,
      columnStyles: {
        0: { cellWidth: "auto", halign: "left" },
        1: { cellWidth: 100, halign: "right", fontStyle: "bold" },
        2: { cellWidth: 80, halign: "right", fontStyle: "bold", textColor: [107, 114, 128] },
      },
    });
    
    // Tablo sonrası currentY'yi güvenli şekilde güncelle - minimum 30pt boşluk
    const tableEndY = (doc as any).lastAutoTable?.finalY;
    if (tableEndY && tableEndY > currentY) {
      currentY = tableEndY + 40; // Standart boşluk: 40pt (30pt'den artırıldı)
    } else {
      currentY += 40; // Fallback: eğer lastAutoTable yoksa (30pt'den artırıldı)
    }
  }
  
  // En Çok Üretilen Ürünler - daha vurgulu başlık
  if (data.topProducts && data.topProducts.length > 0) {
    // Tablo genişliğini sayfa genişliğine göre ayarla
    const pageWidthProd = doc.internal.pageSize.getWidth();
    const tableWidthProd = pageWidthProd - (mar * 2);
    
    currentY = drawTableHeader(doc, mar, currentY, tableWidthProd, {
      title: "En Çok Üretilen Ürünler",
      backgroundColor: [249, 250, 251],
      textColor: PDF_CONSTANTS.primaryColor,
      borderColor: PDF_CONSTANTS.primaryColor,
    });
    
    const topProductsData = data.topProducts.slice(0, 10).map((p: any, index: number) => [
      `#${index + 1}`,
      p.name || '-',
      safeNumber(p.quantity).toString(),
      safeNumber(p.orders).toString()
    ]);
    
    // Özet satırı ekle
    const totalQuantity = data.topProducts.slice(0, 10).reduce((sum: number, p: any) => sum + safeNumber(p.quantity), 0);
    const totalOrders = data.topProducts.slice(0, 10).reduce((sum: number, p: any) => sum + safeNumber(p.orders), 0);
    topProductsData.push([
      'TOPLAM',
      '',
      totalQuantity.toString(),
      totalOrders.toString()
    ]);
    
    // Profesyonel tablo stilleri kullan
    const tableStyles2 = createProfessionalTableStyles(doc);
    
    // Sayfa sığma kontrolü
    currentY = ensureTableFitsPage(doc, currentY, 200, mar, "En Çok Üretilen Ürünler");
    
    // Tablo genişliğini sayfa genişliğine göre ayarla
    const pageWidth2 = doc.internal.pageSize.getWidth();
    const tableWidth2 = pageWidth2 - (mar * 2);
    
    autoTable(doc, {
      startY: currentY,
      head: [['Sıra', 'Ürün Adı', 'Miktar', 'Sipariş Sayısı']],
      body: topProductsData,
      margin: { left: mar, right: mar },
      tableWidth: tableWidth2,
      didParseCell: createDidParseCell(doc),
      ...tableStyles2,
      columnStyles: {
        0: { cellWidth: tableWidth2 * 0.10, halign: "left", textColor: [107, 114, 128] }, // %10
        1: { cellWidth: tableWidth2 * 0.50, halign: "left" }, // %50
        2: { cellWidth: tableWidth2 * 0.20, halign: "right", fontStyle: "bold" }, // %20
        3: { cellWidth: tableWidth2 * 0.20, halign: "right", fontStyle: "bold" }, // %20
      },
    });
    
    // Tablo sonrası currentY'yi güvenli şekilde güncelle - minimum 30pt boşluk
    const tableEndY = (doc as any).lastAutoTable?.finalY;
    if (tableEndY && tableEndY > currentY) {
      currentY = tableEndY + 40; // Standart boşluk: 40pt (30pt'den artırıldı)
    } else {
      currentY += 40; // Fallback: eğer lastAutoTable yoksa (30pt'den artırıldı)
    }
  }
  
  // Üretim Verimliliği Analizi - Yeni detaylı bölüm
  if (data.topProducts && data.topProducts.length > 0) {
    currentY = ensureSpace(doc, currentY, 200, mar, "Üretim Verimliliği");
    
    const efficiencyData = data.topProducts.slice(0, 10).map((p: any, index: number) => {
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
    
    currentY = drawTableHeader(doc, mar, currentY, tableWidth3, {
      title: "Ürün Bazlı Üretim Verimliliği",
      backgroundColor: [249, 250, 251],
      textColor: PDF_CONSTANTS.primaryColor,
      borderColor: PDF_CONSTANTS.primaryColor,
    });
    
    // Profesyonel tablo stilleri kullan
    const tableStyles3 = createProfessionalTableStyles(doc);
    
    // Sayfa sığma kontrolü
    currentY = ensureTableFitsPage(doc, currentY, 200, mar, "Ürün Bazlı Üretim Verimliliği");
    
    autoTable(doc, {
      startY: currentY,
      head: [['Sıra', 'Ürün', 'Toplam Miktar', 'Sipariş', 'Ortalama/Sipariş']],
      body: efficiencyData,
      margin: { left: mar, right: mar },
      tableWidth: tableWidth3,
      didParseCell: createDidParseCell(doc),
      ...tableStyles3,
      columnStyles: {
        0: { cellWidth: tableWidth3 * 0.08, halign: "left", textColor: [107, 114, 128] }, // %8
        1: { cellWidth: tableWidth3 * 0.40, halign: "left" }, // %40
        2: { cellWidth: tableWidth3 * 0.18, halign: "right", fontStyle: "bold" }, // %18
        3: { cellWidth: tableWidth3 * 0.15, halign: "right", fontStyle: "bold" }, // %15
        4: { cellWidth: tableWidth3 * 0.19, halign: "right", textColor: [107, 114, 128] }, // %19
      },
    });
    
    // Tablo sonrası currentY'yi güvenli şekilde güncelle - minimum 30pt boşluk
    const tableEndY = (doc as any).lastAutoTable?.finalY;
    if (tableEndY && tableEndY > currentY) {
      currentY = tableEndY + 40; // Standart boşluk: 40pt (30pt'den artırıldı)
    } else {
      currentY += 40; // Fallback: eğer lastAutoTable yoksa (30pt'den artırıldı)
    }
  }
  
  // Özet Bölümü - sabit tasarım, dinamik veriler
  currentY = ((doc as any).lastAutoTable?.finalY || currentY) + 40; // Standart boşluk: 40pt (30pt'den artırıldı)
  currentY = ensureSpace(doc, currentY, 100, mar, "Özet");
  
  const onHold = safeNumber(data.onHold || 0);
  const inProduction = safeNumber(data.inProduction || 0);
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
          console.warn(`Sayfa ${i} footer eklenirken hata:`, pageError);
          // Devam et, diğer sayfaları eklemeye çalış
        }
      }
    }
  } catch (footerError) {
    console.warn("Footer eklenirken hata:", footerError);
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
    console.error("PDF output hatası:", outputError);
    throw new Error("PDF oluşturulamadı: " + (outputError instanceof Error ? outputError.message : "Bilinmeyen hata"));
  }
};

export const generateCustomerReportPDF = async (data: any, startDate: string, endDate: string) => {
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
  
  const reportDate = formatDate(new Date().toISOString()); // Dinamik
  
  // PDF Template'i uygula
  const template = applyPDFTemplate(doc, "MÜŞTERİ RAPORU", reportDate, startDate, endDate);
  
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
  
  // Kart 1: Toplam Müşteri - profesyonel tasarım, dinamik değer
  const totalCustomers = safeNumber(data.totalCustomers);
  drawStatCard(doc, cardX, currentY, cardWidth, cardHeight, {
    title: "Toplam Müşteri",
    value: totalCustomers.toString(),
    description: "Tüm müşteriler",
    color: {
      background: [250, 245, 255],
      border: [221, 214, 254],
      text: [75, 85, 99],
      value: [147, 51, 234],
    },
  });
  
  // Kart 2: Aktif Müşteri - sabit tasarım, dinamik değer
  cardX += cardWidth + cardGap;
  const activeCustomers = safeNumber(data.activeCustomers);
  drawStatCard(doc, cardX, currentY, cardWidth, cardHeight, {
    title: "Aktif Müşteri",
    value: activeCustomers.toString(),
    description: "Sipariş veren müşteri",
    color: {
      background: [240, 253, 244],
      border: [187, 247, 208],
      text: [75, 85, 99],
      value: [22, 163, 74],
    },
  });
  
  // Kart 3: Yeni Müşteri - sabit tasarım, dinamik değer
  cardX += cardWidth + cardGap;
  const newCustomers = safeNumber(data.newCustomers);
  drawStatCard(doc, cardX, currentY, cardWidth, cardHeight, {
    title: "Yeni Müşteri",
    value: newCustomers.toString(),
    description: "Tarih aralığında",
    color: {
      background: [239, 246, 255],
      border: [191, 219, 254],
      text: [75, 85, 99],
      value: [37, 99, 235],
    },
  });
  
  currentY += cardHeight + 40;
  
  // En Değerli Müşteriler Tablosu - sabit başlık tasarımı
  if (data.topCustomers && data.topCustomers.length > 0) {
    // Tablo genişliğini sayfa genişliğine göre ayarla
    const pageWidth = doc.internal.pageSize.getWidth();
    const tableWidth = pageWidth - (mar * 2);
    
    currentY = drawTableHeader(doc, mar, currentY, tableWidth, {
      title: "En Değerli Müşteriler",
      backgroundColor: [249, 250, 251],
      textColor: PDF_CONSTANTS.primaryColor,
      borderColor: PDF_CONSTANTS.primaryColor,
    });
    
    // Profesyonel tablo stilleri kullan
    const tableStyles = createProfessionalTableStyles(doc);
    
    // Sayfa sığma kontrolü
    currentY = ensureTableFitsPage(doc, currentY, 200, mar, "En Değerli Müşteriler");
    
    autoTable(doc, {
      startY: currentY,
      head: [['Sıra', 'Müşteri', 'Sipariş Sayısı', 'Toplam Harcama']],
      body: data.topCustomers.slice(0, 10).map((c: any, index: number) => [
        `#${index + 1}`,
        c.name || '-',
        safeNumber(c.orders).toString(),
        safeFormatCurrency(safeNumber(c.total))
      ]),
      margin: { left: mar, right: mar },
      tableWidth: tableWidth,
      didParseCell: createDidParseCell(doc),
      ...tableStyles,
      columnStyles: {
        0: { cellWidth: tableWidth * 0.10, halign: "left", textColor: [107, 114, 128] }, // %10
        1: { cellWidth: tableWidth * 0.40, halign: "left" }, // %40
        2: { cellWidth: tableWidth * 0.20, halign: "right", fontStyle: "bold" }, // %20
        3: { cellWidth: tableWidth * 0.30, halign: "right", fontStyle: "bold", textColor: [221, 83, 53] }, // %30
      },
    });
    
    // Tablo sonrası currentY'yi güvenli şekilde güncelle - minimum 30pt boşluk
    const tableEndY = (doc as any).lastAutoTable?.finalY;
    if (tableEndY && tableEndY > currentY) {
      currentY = tableEndY + 40; // Standart boşluk: 40pt (30pt'den artırıldı)
    } else {
      currentY += 40; // Fallback: eğer lastAutoTable yoksa (30pt'den artırıldı)
    }
  }
  
  // Müşteri Segmentasyonu Tablosu - sabit başlık tasarımı
  if (data.segments) {
    // Tablo genişliğini sayfa genişliğine göre ayarla
    const pageWidthSeg = doc.internal.pageSize.getWidth();
    const tableWidthSeg = pageWidthSeg - (mar * 2);
    
    currentY = drawTableHeader(doc, mar, currentY, tableWidthSeg, {
      title: "Müşteri Segmentasyonu",
      backgroundColor: [249, 250, 251],
      textColor: PDF_CONSTANTS.primaryColor,
      borderColor: PDF_CONSTANTS.primaryColor,
    });
    
    // Profesyonel tablo stilleri kullan
    const tableStyles2 = createProfessionalTableStyles(doc);
    
    // Sayfa sığma kontrolü
    currentY = ensureTableFitsPage(doc, currentY, 150, mar, "Müşteri Segmentasyonu");
    
    autoTable(doc, {
      startY: currentY,
      head: [['Segment', 'Müşteri Sayısı']],
      body: [
        ['Yüksek Değerli (>₺50K)', safeNumber(data.segments.high).toString()],
        ['Orta Değerli (₺10K-₺50K)', safeNumber(data.segments.medium).toString()],
        ['Düşük Değerli (<₺10K)', safeNumber(data.segments.low).toString()],
      ],
      margin: { left: mar, right: mar },
      didParseCell: createDidParseCell(doc),
      ...tableStyles2,
    });
  }
  
  // Müşteri Detay Analizi - Yeni detaylı bölüm
  if (data.topCustomers && data.topCustomers.length > 0) {
    // Tablo sonrası currentY'yi güvenli şekilde güncelle - minimum 30pt boşluk
    const tableEndY2 = (doc as any).lastAutoTable?.finalY;
    if (tableEndY2 && tableEndY2 > currentY) {
      currentY = tableEndY2 + 30; // Standart boşluk: 30pt
    } else {
      currentY += 30; // Fallback: eğer lastAutoTable yoksa
    }
    currentY = ensureSpace(doc, currentY, 200, mar, "Müşteri Detay Analizi");
    
    // Müşteri bazlı sipariş frekansı ve değer analizi
    const customerDetailData = data.topCustomers.slice(0, 15).map((c: any, index: number) => {
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
    
    currentY = drawTableHeader(doc, mar, currentY, tableWidth5, {
      title: "Müşteri Detay Analizi (Top 15)",
      backgroundColor: [249, 250, 251],
      textColor: PDF_CONSTANTS.primaryColor,
      borderColor: PDF_CONSTANTS.primaryColor,
    });
    
    autoTable(doc, {
      startY: currentY,
      head: [['Sıra', 'Müşteri', 'Sipariş', 'Toplam', 'Ortalama', 'Segment']],
      body: customerDetailData,
      margin: { left: mar, right: mar },
      tableWidth: tableWidth5,
      didParseCell: createDidParseCell(doc),
      headStyles: { 
        fillColor: [243, 244, 246],
        textColor: [17, 24, 39],
        fontStyle: "bold", 
        fontSize: 12,
        font: getFontName(doc),
        lineColor: [209, 213, 219],
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
        0: { cellWidth: tableWidth5 * 0.07, halign: "left", textColor: [107, 114, 128] }, // %7
        1: { cellWidth: tableWidth5 * 0.30, halign: "left" }, // %30
        2: { cellWidth: tableWidth5 * 0.12, halign: "right", fontStyle: "bold" }, // %12
        3: { cellWidth: tableWidth5 * 0.20, halign: "right", fontStyle: "bold", textColor: [221, 83, 53] }, // %20
        4: { cellWidth: tableWidth5 * 0.18, halign: "right", textColor: [107, 114, 128] }, // %18
        5: { cellWidth: tableWidth5 * 0.13, halign: "center", fontStyle: "bold" }, // %13
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251]
      },
      didDrawCell: (data: any) => {
        // Segment renklendirme
        if (data.column.index === 5 && data.cell.text) {
          const segment = data.cell.text.toString();
          if (segment === "Yüksek") {
            doc.setFillColor(240, 253, 244);
            doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, "F");
            doc.setTextColor(22, 163, 74);
          } else if (segment === "Orta") {
            doc.setFillColor(254, 249, 195);
            doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, "F");
            doc.setTextColor(217, 119, 6);
          } else {
            doc.setFillColor(254, 242, 242);
            doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, "F");
            doc.setTextColor(220, 38, 38);
          }
        }
      },
    });
    
    // Tablo sonrası currentY'yi güvenli şekilde güncelle - minimum 30pt boşluk
    const tableEndY3 = (doc as any).lastAutoTable?.finalY;
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
      ['Segment Dağılımı (Yüksek)', `${safeNumber(data.segments?.high || 0)} müşteri`],
      ['Segment Dağılımı (Orta)', `${safeNumber(data.segments?.medium || 0)} müşteri`],
      ['Segment Dağılımı (Düşük)', `${safeNumber(data.segments?.low || 0)} müşteri`],
    ];
    
    currentY = drawSummarySection(doc, mar, currentY, contentWidth, "Müşteri Trend Analizi", trendData, [147, 51, 234]);
  }
  
  // Özet Bölümü - sabit tasarım, dinamik veriler
  currentY = ((doc as any).lastAutoTable?.finalY || currentY) + 40; // Standart boşluk: 40pt (30pt'den artırıldı)
  currentY = ensureSpace(doc, currentY, 100, mar, "Özet");
  
  const summaryData: Array<[string, string]> = [
    ['Toplam Müşteri', safeNumber(data.totalCustomers).toString()],
    ['Aktif Müşteri', safeNumber(data.activeCustomers).toString()],
    ['Yeni Müşteri', safeNumber(data.newCustomers).toString()],
    ['Yüksek Değerli Müşteri', safeNumber(data.segments?.high || 0).toString()],
    ['Orta Değerli Müşteri', safeNumber(data.segments?.medium || 0).toString()],
    ['Düşük Değerli Müşteri', safeNumber(data.segments?.low || 0).toString()],
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
          console.warn(`Sayfa ${i} footer eklenirken hata:`, pageError);
          // Devam et, diğer sayfaları eklemeye çalış
        }
      }
    }
  } catch (footerError) {
    console.warn("Footer eklenirken hata:", footerError);
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
    console.error("PDF output hatası:", outputError);
    throw new Error("PDF oluşturulamadı: " + (outputError instanceof Error ? outputError.message : "Bilinmeyen hata"));
  }
};

export const generateFinancialReportPDF = async (data: any, startDate: string, endDate: string) => {
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
  
  const reportDate = formatDate(new Date().toISOString()); // Dinamik
  
  // PDF Template'i uygula
  const template = applyPDFTemplate(doc, "MALİ RAPOR", reportDate, startDate, endDate);
  
  // Dinamik içerik alanından başla
  let currentY = template.contentArea.startY;
  const contentWidth = template.contentArea.width;
  const mar = template.contentArea.leftMargin;
  
  const safeText = createSafeText(doc);
  const [primaryR, primaryG, primaryB] = PDF_CONSTANTS.primaryColor;
  const [mutedR, mutedG, mutedB] = PDF_CONSTANTS.mutedColor;
  
  // İstatistik Kartları - Profesyonel tasarım (4 kart)
  const cardWidth = (contentWidth - 48) / 4;
  const cardHeight = 110; // Daha ferah: 100 → 110
  const cardGap = 16;
  let cardX = mar;
  
  // Kart 1: Toplam Gelir (Green) - daha modern ve profesyonel
  doc.setFillColor(240, 253, 244); // green-50
  doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 6, 6, "F");
  doc.setDrawColor(187, 247, 208); // green-200
  doc.setLineWidth(1.5);
  doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 6, 6, "S");
  
  // Shadow efekti simülasyonu
  doc.setFillColor(0, 0, 0);
  doc.setGState(doc.GState({ opacity: 0.05 }));
  doc.roundedRect(cardX + 2, currentY + 2, cardWidth, cardHeight, 6, 6, "F");
  doc.setGState(doc.GState({ opacity: 1 }));
  
  doc.setTextColor(75, 85, 99); // text-muted-foreground - daha koyu
  safeText("Toplam Gelir", cardX + 14, currentY + 20, 15, true); // İyileştirildi: 14px → 15px
  const totalRevenue = safeNumber(data.totalRevenue);
  doc.setTextColor(22, 163, 74); // text-green-600
  safeText(safeFormatCurrency(totalRevenue), cardX + 14, currentY + 52, 32, true); // İyileştirildi: 30px → 32px
  doc.setTextColor(75, 85, 99); // text-muted-foreground - daha koyu
  safeText("Toplam ciro", cardX + 14, currentY + 88, 13, false); // İyileştirildi: 12px → 13px
  doc.setTextColor(0, 0, 0);
  
  // Kart 2: Toplam Gider (Red) - daha modern ve profesyonel
  cardX += cardWidth + cardGap;
  doc.setFillColor(254, 242, 242); // red-50
  doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 6, 6, "F");
  doc.setDrawColor(254, 202, 202); // red-200
  doc.setLineWidth(1.5);
  doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 6, 6, "S");
  
  // Shadow efekti simülasyonu
  doc.setFillColor(0, 0, 0);
  doc.setGState(doc.GState({ opacity: 0.05 }));
  doc.roundedRect(cardX + 2, currentY + 2, cardWidth, cardHeight, 6, 6, "F");
  doc.setGState(doc.GState({ opacity: 1 }));
  
  doc.setTextColor(75, 85, 99); // text-muted-foreground - daha koyu
  safeText("Toplam Gider", cardX + 14, currentY + 20, 15, true); // İyileştirildi: 14px → 15px
  const totalCost = safeNumber(data.totalCost);
  doc.setTextColor(220, 38, 38); // text-red-600
  safeText(safeFormatCurrency(totalCost), cardX + 14, currentY + 52, 32, true); // İyileştirildi: 30px → 32px
  doc.setTextColor(75, 85, 99); // text-muted-foreground - daha koyu
  safeText("Toplam maliyet", cardX + 14, currentY + 88, 13, false); // İyileştirildi: 12px → 13px
  doc.setTextColor(0, 0, 0);
  
  // Kart 3: Brüt Kar (Emerald) - daha modern ve profesyonel
  cardX += cardWidth + cardGap;
  doc.setFillColor(236, 253, 245); // emerald-50
  doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 6, 6, "F");
  doc.setDrawColor(167, 243, 208); // emerald-200
  doc.setLineWidth(1.5);
  doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 6, 6, "S");
  
  // Shadow efekti simülasyonu
  doc.setFillColor(0, 0, 0);
  doc.setGState(doc.GState({ opacity: 0.05 }));
  doc.roundedRect(cardX + 2, currentY + 2, cardWidth, cardHeight, 6, 6, "F");
  doc.setGState(doc.GState({ opacity: 1 }));
  
  doc.setTextColor(75, 85, 99); // text-muted-foreground - daha koyu
  safeText("Brüt Kar", cardX + 14, currentY + 20, 15, true); // İyileştirildi: 14px → 15px
  const grossProfit = safeNumber(data.grossProfit);
  doc.setTextColor(5, 150, 105); // text-emerald-600
  safeText(safeFormatCurrency(grossProfit), cardX + 14, currentY + 52, 32, true); // İyileştirildi: 30px → 32px
  doc.setTextColor(75, 85, 99); // text-muted-foreground - daha koyu
  safeText("Net kar", cardX + 14, currentY + 88, 13, false); // İyileştirildi: 12px → 13px
  doc.setTextColor(0, 0, 0);
  
  // Kart 4: Kar Marjı (Primary) - daha modern ve profesyonel
  cardX += cardWidth + cardGap;
  doc.setFillColor(221, 83, 53); // Primary color
  doc.setGState(doc.GState({ opacity: 0.12 }));
  doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 6, 6, "F");
  doc.setGState(doc.GState({ opacity: 0.05 }));
  doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 6, 6, "F");
  doc.setGState(doc.GState({ opacity: 1 }));
  doc.setDrawColor(221, 83, 53);
  doc.setGState(doc.GState({ opacity: 0.3 }));
  doc.setLineWidth(1.5);
  doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 6, 6, "S");
  doc.setGState(doc.GState({ opacity: 1 }));
  
  // Shadow efekti simülasyonu
  doc.setFillColor(0, 0, 0);
  doc.setGState(doc.GState({ opacity: 0.05 }));
  doc.roundedRect(cardX + 2, currentY + 2, cardWidth, cardHeight, 6, 6, "F");
  doc.setGState(doc.GState({ opacity: 1 }));
  
  doc.setTextColor(75, 85, 99); // text-muted-foreground - daha koyu
  safeText("Kar Marjı", cardX + 14, currentY + 20, 15, true); // İyileştirildi: 14px → 15px
  const profitMargin = safeNumber(data.profitMargin);
  doc.setTextColor(221, 83, 53); // text-primary
  safeText(`${profitMargin.toFixed(1)}%`, cardX + 14, currentY + 52, 32, true); // İyileştirildi: 30px → 32px
  doc.setTextColor(75, 85, 99); // text-muted-foreground - daha koyu
  safeText("Karlılık oranı", cardX + 14, currentY + 88, 13, false); // İyileştirildi: 12px → 13px
  doc.setTextColor(0, 0, 0);
  
  currentY += cardHeight + 40; // İyileştirildi: 30px → 40px (daha ferah)
  
  // En Karlı Ürünler Tablosu - sabit başlık tasarımı
  if (data.topProfitableProducts && data.topProfitableProducts.length > 0) {
    // Tablo genişliğini sayfa genişliğine göre ayarla
    const pageWidth = doc.internal.pageSize.getWidth();
    const tableWidth = pageWidth - (mar * 2);
    
    currentY = drawTableHeader(doc, mar, currentY, tableWidth, {
      title: "En Karlı Ürünler",
      backgroundColor: [249, 250, 251],
      textColor: PDF_CONSTANTS.primaryColor,
      borderColor: PDF_CONSTANTS.primaryColor,
    });
    
    // Profesyonel tablo stilleri kullan
    const tableStyles = createProfessionalTableStyles(doc);
    
    // Sayfa sığma kontrolü
    currentY = ensureTableFitsPage(doc, currentY, 200, mar, "En Karlı Ürünler");
    
    autoTable(doc, {
      startY: currentY,
      head: [['Sıra', 'Ürün', 'Gelir', 'Gider', 'Kar']],
      body: data.topProfitableProducts.slice(0, 10).map((p: any, index: number) => [
        `#${index + 1}`,
        p.name || '-',
        safeFormatCurrency(safeNumber(p.revenue)),
        safeFormatCurrency(safeNumber(p.cost)),
        safeFormatCurrency(safeNumber(p.profit))
      ]),
      margin: { left: mar, right: mar },
      tableWidth: tableWidth,
      didParseCell: createDidParseCell(doc),
      ...tableStyles,
      columnStyles: {
        0: { cellWidth: tableWidth * 0.08, halign: "left", textColor: [107, 114, 128] }, // %8
        1: { cellWidth: tableWidth * 0.40, halign: "left" }, // %40
        2: { cellWidth: tableWidth * 0.17, halign: "right", fontStyle: "bold", textColor: [34, 197, 94] }, // %17
        3: { cellWidth: tableWidth * 0.17, halign: "right", fontStyle: "bold", textColor: [239, 68, 68] }, // %17
        4: { cellWidth: tableWidth * 0.18, halign: "right", fontStyle: "bold", textColor: [16, 185, 129] }, // %18
      },
    });
  }
  
  // Aylık trend
  // Tablo sonrası currentY'yi güvenli şekilde güncelle
  const trendTableEndY = (doc as any).lastAutoTable?.finalY;
  if (trendTableEndY && trendTableEndY > currentY) {
    currentY = trendTableEndY + 30;
  } else {
    currentY += 30;
  }
  
  if (data.monthlyTrend && data.monthlyTrend.length > 0) {
    // Tablo genişliğini sayfa genişliğine göre ayarla
    const pageWidthTrend = doc.internal.pageSize.getWidth();
    const tableWidthTrend = pageWidthTrend - (mar * 2);
    
    currentY = drawTableHeader(doc, mar, currentY, tableWidthTrend, {
      title: "Aylık Gelir-Gider-Kar Trendi",
      backgroundColor: [249, 250, 251],
      textColor: PDF_CONSTANTS.primaryColor,
      borderColor: PDF_CONSTANTS.primaryColor,
    });
    
    const monthLabels: Record<string, string> = {
      '01': 'Ocak', '02': 'Şubat', '03': 'Mart', '04': 'Nisan',
      '05': 'Mayıs', '06': 'Haziran', '07': 'Temmuz', '08': 'Ağustos',
      '09': 'Eylül', '10': 'Ekim', '11': 'Kasım', '12': 'Aralık'
    };
    
    const trendData = data.monthlyTrend.map((item: any) => {
      const [year, month] = item.month.split('-');
      const monthLabel = monthLabels[month] || month;
      return [
        `${monthLabel} ${year}`,
        `₺${(item.revenue || 0).toFixed(2)}`,
        `₺${(item.cost || 0).toFixed(2)}`,
        `₺${(item.profit || 0).toFixed(2)}`
      ];
    });
    
    // Profesyonel tablo stilleri kullan (özel header rengi ile)
    const tableStyles2 = createProfessionalTableStyles(doc);
    tableStyles2.headStyles.fillColor = [221, 83, 53]; // Primary color
    tableStyles2.headStyles.textColor = [255, 255, 255]; // White text
    
    // Sayfa sığma kontrolü
    currentY = ensureTableFitsPage(doc, currentY, 200, mar, "Aylık Gelir-Gider-Kar Trendi");
    
    // Tablo genişliğini sayfa genişliğine göre ayarla
    const pageWidth2 = doc.internal.pageSize.getWidth();
    const tableWidth2 = pageWidth2 - (mar * 2);
    
    autoTable(doc, {
      startY: currentY,
      head: [['Ay', 'Gelir', 'Gider', 'Kar']],
      body: trendData,
      margin: { left: mar, right: mar },
      tableWidth: tableWidth2,
      didParseCell: createDidParseCell(doc),
      ...tableStyles2,
      columnStyles: {
        0: { cellWidth: tableWidth2 * 0.25, halign: "left" },  // %25
        1: { cellWidth: tableWidth2 * 0.25, halign: "right" }, // %25
        2: { cellWidth: tableWidth2 * 0.25, halign: "right" }, // %25
        3: { cellWidth: tableWidth2 * 0.25, halign: "right" }, // %25
      },
    });
  }
  
  // Gider Kalemleri Analizi - Yeni detaylı bölüm
  if (data.costBreakdown || data.expenseCategories) {
    // Tablo sonrası currentY'yi güvenli şekilde güncelle - minimum 30pt boşluk
    const tableEndY = (doc as any).lastAutoTable?.finalY;
    if (tableEndY && tableEndY > currentY) {
      currentY = tableEndY + 40; // Standart boşluk: 40pt (30pt'den artırıldı)
    } else {
      currentY += 40; // Fallback: eğer lastAutoTable yoksa (30pt'den artırıldı)
    }
    currentY = ensureSpace(doc, currentY, 200, mar, "Gider Kalemleri Analizi");
    
    const costData = data.costBreakdown || data.expenseCategories || [];
    if (costData.length > 0) {
      const costTableData = costData.map((item: any) => {
        const category = item.category || item.name || "Bilinmeyen";
        const amount = safeNumber(item.amount || item.total || 0);
        const percentage = safeNumber(data.totalCost) > 0 
          ? ((amount / safeNumber(data.totalCost)) * 100).toFixed(1)
          : "0";
        return [
          category.length > 30 ? category.substring(0, 30) + "..." : category,
          safeFormatCurrency(amount),
          `${percentage}%`
        ];
      });
      
      // Tablo genişliğini sayfa genişliğine göre ayarla
      const pageWidth3 = doc.internal.pageSize.getWidth();
      const tableWidth3 = pageWidth3 - (mar * 2);
      
      currentY = drawTableHeader(doc, mar, currentY, tableWidth3, {
        title: "Gider Kalemleri Detayı",
        backgroundColor: [249, 250, 251],
        textColor: PDF_CONSTANTS.primaryColor,
        borderColor: PDF_CONSTANTS.primaryColor,
      });
      
      // Profesyonel tablo stilleri kullan
      const tableStyles3 = createProfessionalTableStyles(doc);
      
      // Sayfa sığma kontrolü
      currentY = ensureTableFitsPage(doc, currentY, 200, mar, "Gider Kalemleri Analizi");
      
      autoTable(doc, {
        startY: currentY,
        head: [['Kategori', 'Tutar', 'Oran']],
        body: costTableData,
        margin: { left: mar, right: mar },
        tableWidth: tableWidth3,
        didParseCell: createDidParseCell(doc),
        ...tableStyles3,
        columnStyles: {
          0: { cellWidth: tableWidth3 * 0.55, halign: "left" }, // %55
          1: { cellWidth: tableWidth3 * 0.30, halign: "right", fontStyle: "bold", textColor: [220, 38, 38] }, // %30
          2: { cellWidth: tableWidth3 * 0.15, halign: "right", textColor: [107, 114, 128] }, // %15
        },
      });
      
      // Tablo sonrası currentY'yi güvenli şekilde güncelle - minimum 30pt boşluk
    const tableEndY = (doc as any).lastAutoTable?.finalY;
    if (tableEndY && tableEndY > currentY) {
      currentY = tableEndY + 40; // Standart boşluk: 40pt (30pt'den artırıldı)
    } else {
      currentY += 40; // Fallback: eğer lastAutoTable yoksa (30pt'den artırıldı)
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
  currentY = ((doc as any).lastAutoTable?.finalY || currentY) + 40; // Standart boşluk: 40pt (30pt'den artırıldı)
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
          console.warn(`Sayfa ${i} footer eklenirken hata:`, pageError);
          // Devam et, diğer sayfaları eklemeye çalış
        }
      }
    }
  } catch (footerError) {
    console.warn("Footer eklenirken hata:", footerError);
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
    console.error("PDF output hatası:", outputError);
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
export const generateUserStatsPDF = async (
  userStats: {
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
): Promise<Blob> => {
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
  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(229, 231, 235);
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

  autoTable(doc, {
    startY: yPos,
    head: [detailedStats[0]],
    body: detailedStats.slice(1),
    didParseCell: createDidParseCell(doc),
    headStyles: { 
      fillColor: [59, 130, 246], 
      textColor: 255, 
      fontStyle: "bold", 
      fontSize: 12, 
      font: getFontName(doc),
      halign: "center"
    },
    bodyStyles: { 
      textColor: [0, 0, 0], 
      fontSize: 11, 
      font: getFontName(doc),
      halign: "center"
    },
    styles: { 
      font: getFontName(doc), 
      fontStyle: "normal", 
      fontSize: 11,
      cellPadding: 8
    },
    margin: { left: mar, right: mar },
    alternateRowStyles: {
      fillColor: [249, 250, 251]
    },
    columnStyles: {
      0: { cellWidth: "auto", halign: "left" },
      1: { cellWidth: 100, halign: "center" },
      2: { cellWidth: 80, halign: "center" },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 30;

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
    const tableStyles = createProfessionalTableStyles(doc);
    tableStyles.headStyles.fillColor = [59, 130, 246]; // Blue
    tableStyles.headStyles.textColor = [255, 255, 255]; // White
    tableStyles.headStyles.halign = "center";
    tableStyles.bodyStyles.halign = "left";
    
    // Sayfa sığma kontrolü
    yPos = ensureTableFitsPage(doc, yPos, 200, mar, "Görev Detayları");
    
    // Tablo genişliğini sayfa genişliğine göre ayarla
    const pageWidth = doc.internal.pageSize.getWidth();
    const tableWidth = pageWidth - (mar * 2);
    
    autoTable(doc, {
      startY: yPos,
      head: [["Görev Başlığı", "Durum", "Atanma Tarihi", "Tamamlanma Tarihi"]],
      body: assignmentRows,
      margin: { left: mar, right: mar },
      tableWidth: tableWidth,
      didParseCell: createDidParseCell(doc),
      ...tableStyles,
      columnStyles: {
        0: { cellWidth: tableWidth * 0.45, halign: "left" }, // %45
        1: { cellWidth: tableWidth * 0.18, halign: "center" }, // %18
        2: { cellWidth: tableWidth * 0.18, halign: "center" }, // %18
        3: { cellWidth: tableWidth * 0.19, halign: "center" }, // %19
      },
    });
  }

  // Özet bölümü
  const finalY = (doc as any).lastAutoTable?.finalY || yPos;
  if (finalY < pageHeight - 100) {
    yPos = finalY + 30;
    
    safeSetFontUser(true);
    doc.setTextColor(255, 255, 255);
    const summaryHeight = 50;
    doc.setFillColor(59, 130, 246);
    doc.setDrawColor(59, 130, 246);
    doc.roundedRect(mar, yPos, pageWidth - 2 * mar, summaryHeight, 6, 6, "F");
    doc.roundedRect(mar, yPos, pageWidth - 2 * mar, summaryHeight, 6, 6, "S");
    
    safeTextUser("Özet", mar + 15, yPos + 30, 16);
    
    safeSetFontUser(false);
    const completionRate = userStats.total > 0 ? Math.round((userStats.completed / userStats.total) * 100) : 0;
    safeTextUser(
      `${userStats.userName} kullanıcısı toplam ${userStats.total} görev almış, ${userStats.completed} görevi tamamlamıştır. Tamamlanma oranı: %${completionRate}`,
      mar + 15,
      yPos + 50,
      11
    );
  }

  // Footer'ı ekle
  try {
    const finalTemplate = createPDFTemplate(doc);
    drawPDFFooter(doc, finalTemplate);
  } catch (footerError) {
    console.warn("Footer eklenirken hata:", footerError);
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
    console.error("PDF output hatası:", outputError);
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
    console.warn(`Page size mismatch: expected ${pageWidth}x${pageHeight}, got ${actualWidth}x${actualHeight}`);
  }

  // Header - Form Preview Style
  // Logo ve Şirket Bilgileri (Sağ Üst)
  const logoWidth = 40;
  const logoHeight = 40;
  const logoX = pageWidth - mar - 160; // Logo ve text için alan ayır
  
  // Helper functions
  const safeNumber = (value: any): number => {
    const num = Number(value);
    return (isNaN(num) || !isFinite(num)) ? 0 : num;
  };
  
  const safeFormatCurrency = (value: number, currency: string): string => {
    const safeVal = safeNumber(value);
    return `${currency}${safeVal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
        const safeTextFallback = transliterateTurkish(text);
        if (color) {
          doc.setTextColor(color[0], color[1], color[2]);
        }
        doc.text(safeTextFallback, x, y);
        doc.setTextColor(0, 0, 0);
      } catch (fallbackError) {
        console.warn(`Text render failed: ${text.substring(0, 50)}...`, error, fallbackError);
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
    console.warn("Background panel eklenemedi:", error);
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
  const headerLogoSize = 50;
  
  // Logo - sağ üst köşede, doğru pozisyonda
  try {
    const logoX = rightContentX - headerLogoSize;
    doc.addImage(REV_LOGO_DATA_URI, 'PNG', logoX, companyInfoY, headerLogoSize, headerLogoSize);
  } catch (error) {
    console.warn("Logo eklenemedi:", error);
  }
  
  // Company address block - under logo, right-aligned
  const addressLines = [
    COMPANY_INFO.address,
    COMPANY_INFO.city,
    COMPANY_INFO.email,
    COMPANY_INFO.website,
    COMPANY_INFO.phone
  ];
  
  let addrY = companyInfoY + headerLogoSize + 14;
  safeSetFont(doc, "normal");
  doc.setFontSize(10);
  addressLines.forEach(line => {
    try {
      const lineWidth = doc.getTextWidth(line);
      doc.setTextColor(75, 85, 99); // gray-600
      safeText(line, rightContentX - lineWidth, addrY, 10, false);
      doc.setTextColor(0, 0, 0);
      addrY += 13;
    } catch (error) {
      console.warn(`Address line render failed: ${line}`, error);
      addrY += 13;
    }
  });

  // Date Info - Right side, aligned with customer block
  const dateInfoY = customerBlockY;
  
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
    console.error("Tarih formatlama hatası:", error, payload.quoteDate);
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
    console.error("Tarih formatlama hatası:", error, payload.validUntil);
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
  const didParseCell = createDidParseCell(doc);
  
  // Dinamik tablo genişliği hesaplama (diğer tablolarla tutarlı)
  const dynamicPageWidth = doc.internal.pageSize.getWidth();
  const tableWidth = dynamicPageWidth - (mar * 2);
  
  // Profesyonel tablo stilleri kullan (özel padding ile)
  const tableStyles = createProfessionalTableStyles(doc, {
    headerFontSize: 12,
    bodyFontSize: 12,
    cellPadding: { top: 14, right: 16, bottom: 14, left: 16 }
  });
  tableStyles.headStyles.fillColor = [249, 250, 251]; // gray-50 (daha profesyonel)
  tableStyles.headStyles.textColor = [17, 24, 39]; // gray-900
  tableStyles.headStyles.halign = "left";
  tableStyles.bodyStyles.overflow = 'linebreak';
  tableStyles.styles.overflow = 'linebreak';
  
  // Sayfa sığma kontrolü
  startY = ensureTableFitsPage(doc, startY, 300, mar, "Ürün Listesi");
  
  autoTable(doc, {
    head: tableHead,
    body: tableBody.length === 0
      ? [["", "Kalem bilgisi girilmedi", "", "", ""]]
      : tableBody,
    startY,
    margin: { left: mar, right: mar },
    didParseCell: didParseCell,
    tableWidth: tableWidth, // Dinamik genişlik kullan
    ...tableStyles,
    columnStyles: {
      0: { cellWidth: tableWidth * 0.08, halign: "center" }, // %8 - No
      1: { cellWidth: tableWidth * 0.48, halign: "left", overflow: 'linebreak' }, // %48 - Ürün Adı
      2: { cellWidth: tableWidth * 0.10, halign: "center" }, // %10 - Adet
      3: { cellWidth: tableWidth * 0.17, halign: "right" }, // %17 - Birim Fiyat
      4: { cellWidth: tableWidth * 0.17, halign: "right" }, // %17 - Toplam
    },
  });

  // Get actual table end position - minimum 30pt boşluk (diğer tablolarla tutarlı)
  let tableEndY = ((doc as any).lastAutoTable?.finalY || startY);
  if ((doc as any).lastAutoTable?.finalY) {
    tableEndY = (doc as any).lastAutoTable.finalY + 40; // Standart boşluk: 40pt (30pt'den artırıldı)
    } else {
    tableEndY = startY + 40; // Fallback (30pt'den artırıldı)
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
      console.warn(`Note render failed: ${note}`, error);
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
      console.warn(`Total row render failed: ${label}`, error);
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
    console.warn('Footer logo eklenemedi:', error);
  }

  // PDF'i güvenli bir şekilde oluştur
  try {
    const blob = doc.output("blob");
    if (!blob || blob.size === 0) {
      throw new Error("PDF blob boş veya geçersiz");
    }
    return blob;
  } catch (outputError) {
    console.error("PDF output hatası:", outputError);
    throw new Error("PDF oluşturulamadı: " + (outputError instanceof Error ? outputError.message : "Bilinmeyen hata"));
  }
};
