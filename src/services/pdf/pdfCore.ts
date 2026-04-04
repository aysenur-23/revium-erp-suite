/**
 * PDF Generator Core
 * Core PDF functionality, constants, types, and shared utilities
 * Extracted and modularized from the unified generator service for better maintainability
 */

import jsPDF, { jsPDFOptions } from "jspdf";
import autoTable, { CellHookData as AutoTableCellHookData } from "jspdf-autotable";
import { REV_LOGO_DATA_URI } from "@/assets/rev-logo-base64";

// Company info
// Company info
export const COMPANY_INFO = {
    name: "Revium Tech",
    address: "Fevzi Cakmak Mah. Milenyum Cad. No:81",
    city: "Karatay/KONYA",
    email: "info@reviumtech.com",
    website: "www.reviumtech.com",
    phone: "+90 (551) 829-1613",
    fullAddress: "Fevzi Cakmak Mah. Milenyum Cad. No:81, Karatay/KONYA",
    contactInfo: "info@reviumtech.com | www.reviumtech.com | +90 (551) 829-1613",
    headerAddress: "Fevzi Cakmak Mah. Milenyum Cad. No:81",
} as const;

// PDF sabit deÄŸerleri - cache'lenmiÅŸ
export const PDF_CONSTANTS = {
    margin: 50,
    headerHeight: 120,
    footerHeight: 50,
    logoSize: 40,
    footerLogoSize: 28,
    lineHeight: 14,
    primaryColor: [30, 41, 59] as [number, number, number],
    secondaryColor: [100, 116, 139] as [number, number, number],
    accentColor: [37, 99, 235] as [number, number, number],
    backgroundColor: [248, 250, 252] as [number, number, number],
    borderColor: [226, 232, 240] as [number, number, number],
    sectionSpacing: 20,
    tableSpacing: 20,
    fontSizeTitle: 16,
    fontSizeSubtitle: 12,
    fontSizeBody: 11,
    fontSizeSmall: 10,
    cardHeight: 110,
    cardGap: 16,
    cardPadding: 16,
    cardHeaderPadding: 12,
    tableHeaderHeight: 32,
    tableHeaderPadding: 12,
    tableHeaderSpacing: 10,
    fontSizeCardTitle: 12,
    fontSizeCardValue: 24,
    fontSizeCardDescription: 11,
    fontSizeTableHeader: 16,
    fontSizeTableBody: 11,
    fontSizeTableHeaderText: 12,
} as const;

// Profesyonel renk paleti
export const TAILWIND_COLORS = {
    // Card backgrounds
    cardBackground: [248, 250, 252] as [number, number, number],
    cardBorder: [226, 232, 240] as [number, number, number],
    cardText: [51, 65, 85] as [number, number, number],
    cardValue: [15, 23, 42] as [number, number, number],

    // Primary kart (vurgulu)
    primaryCardBg: [255, 255, 255] as [number, number, number],
    primaryCardBorder: [221, 83, 53] as [number, number, number],
    primaryCardValue: [221, 83, 53] as [number, number, number],

    // Status colors
    successCardBg: [240, 253, 244] as [number, number, number],
    successCardBorder: [187, 247, 208] as [number, number, number],
    successCardValue: [22, 163, 74] as [number, number, number],

    infoCardBg: [239, 246, 255] as [number, number, number],
    infoCardBorder: [191, 219, 254] as [number, number, number],
    infoCardValue: [37, 99, 235] as [number, number, number],

    warningCardBg: [255, 251, 235] as [number, number, number],
    warningCardBorder: [254, 215, 170] as [number, number, number],
    warningCardValue: [234, 88, 12] as [number, number, number],

    dangerCardBg: [254, 242, 242] as [number, number, number],
    dangerCardBorder: [254, 202, 202] as [number, number, number],
    dangerCardValue: [220, 38, 38] as [number, number, number],

    // Grayscale
    gray50: [249, 250, 251] as [number, number, number],
    gray100: [243, 244, 246] as [number, number, number],
    gray200: [229, 231, 235] as [number, number, number],
    gray300: [209, 213, 219] as [number, number, number],
    gray400: [156, 163, 175] as [number, number, number],
    gray500: [107, 114, 128] as [number, number, number],
    gray600: [75, 85, 99] as [number, number, number],
    gray700: [55, 65, 81] as [number, number, number],
    gray800: [30, 41, 59] as [number, number, number],
    gray900: [15, 23, 42] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
} as const;

// Types
export interface PDFTemplateLayout {
    background: {
        startY: number;
        endY: number;
    };
    header: {
        startY: number;
        endY: number;
        logoX: number;
        logoY: number;
        titleX: number;
        titleY: number;
    };
    contentArea: {
        startY: number;
        endY: number;
        width: number;
        leftMargin: number;
        rightMargin: number;
    };
}

export interface StatCardConfig {
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

export interface TableHeaderConfig {
    title: string;
    backgroundColor?: [number, number, number];
    textColor?: [number, number, number];
    borderColor?: [number, number, number];
}

export interface TotalsSummary {
    subtotal: number;
    discount: number;
    tax: number;
    grandTotal: number;
}

export interface ProfessionalTableStyles {
    headStyles: Record<string, unknown>;
    bodyStyles: Record<string, unknown>;
    styles: Record<string, unknown>;
    alternateRowStyles: Record<string, unknown>;
}

// Font status interface
export interface jsPDFWithFontStatus extends jsPDF {
    _robotoFontLoaded?: boolean;
    _robotoFontLoadFailed?: boolean;
    _robotoSupportsTurkish?: boolean;
    _turkishCharsTested?: boolean;
    lastAutoTable?: {
        finalY?: number;
    };
}

// Helper functions

/**
 * TÃ¼rkÃ§e karakterleri ASCII'ye Ã§evir
 */
export function transliterateTurkish(text: string): string {
    const turkishMap: Record<string, string> = {
        'ç': 'c', 'Ç': 'C',
        'ğ': 'g', 'Ğ': 'G',
        'ı': 'i', 'İ': 'I',
        'ö': 'o', 'Ö': 'O',
        'ş': 's', 'Ş': 'S',
        'ü': 'u', 'Ü': 'U',
        '₺': 'TL ',
    };

    return text.replace(/[çÇğĞıİöÖşŞüÜ₺]/g, (char) => turkishMap[char] || char);
}

/**
 * AutoTable verilerini transliterate et
 */
export function transliterateTableData(
    data: (string | number)[][] | null | undefined,
    doc?: jsPDFWithFontStatus
): (string | number)[][] {
    if (!data) return [];

    // Roboto font yÃ¼klÃ¼yse transliterate yapma
    if (doc && doc._robotoFontLoaded && !doc._robotoFontLoadFailed) {
        return data; // Return original data
    }

    return data.map(row =>
        row.map(cell =>
            typeof cell === 'string' ? transliterateTurkish(cell) : cell
        )
    );
}

/**
 * PDF Template oluÅŸtur
 */
export function createPDFTemplate(doc: jsPDFWithFontStatus): PDFTemplateLayout {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    return {
        background: {
            startY: 0,
            endY: pageHeight,
        },
        header: {
            startY: 0,
            endY: PDF_CONSTANTS.headerHeight,
            logoX: PDF_CONSTANTS.margin,
            logoY: 30,
            titleX: PDF_CONSTANTS.margin + PDF_CONSTANTS.logoSize + 20,
            titleY: 45,
        },
        contentArea: {
            startY: PDF_CONSTANTS.headerHeight + 20,
            endY: pageHeight - PDF_CONSTANTS.footerHeight - 20,
            width: pageWidth - (PDF_CONSTANTS.margin * 2),
            leftMargin: PDF_CONSTANTS.margin,
            rightMargin: pageWidth - PDF_CONSTANTS.margin,
        },
    };
}

/**
 * Kart boyutlarÄ±nÄ± hesapla
 */
export function calculateCardDimensions(
    contentWidth: number,
    cardCount: number
): { width: number; gap: number } {
    const gap = 16;
    const totalGaps = (cardCount - 1) * gap;
    const width = (contentWidth - totalGaps) / cardCount;
    return { width, gap };
}

/**
 * Para birimi formatla
 */
export function formatCurrency(value: number, currency = "₺"): string {
    return `${currency}${value.toLocaleString('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

/**
 * GÃ¼venli sayÄ± dÃ¶nÃ¼ÅŸÃ¼mÃ¼
 */
export function safeNumber(value: unknown): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
}

/**
 * GÃ¼venli para birimi formatÄ±
 */
export function safeFormatCurrency(value: number): string {
    if (typeof value !== 'number' || isNaN(value)) {
        return '₺0,00';
    }
    return formatCurrency(value);
}

/**
 * Tarih formatla
 */
export function formatDate(dateStr: string): string {
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;

        const months = [
            'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
            'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
        ];

        const day = date.getDate();
        const month = months[date.getMonth()];
        const year = date.getFullYear();

        return `${day} ${month} ${year}`;
    } catch {
        return dateStr;
    }
}

/**
 * KÄ±sa tarih formatÄ±
 */
export function formatDateShort(dateStr: string): string {
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        return date.toLocaleDateString('tr-TR');
    } catch {
        return dateStr;
    }
}

/**
 * PDF oluÅŸtur
 */
export function createPdf(
    options: jsPDFOptions = { format: "a4", unit: "pt" }
): jsPDFWithFontStatus {
    return new jsPDF(options) as jsPDFWithFontStatus;
}

/**
 * Sayfa sÄ±ÄŸmazsa yeni sayfa ekle
 */
export function ensureSpace(
    doc: jsPDF,
    currentY: number,
    requiredHeight: number,
    margin = 40,
    titleForNextPage?: string
): number {
    const pageHeight = doc.internal.pageSize.getHeight();

    if (currentY + requiredHeight > pageHeight - margin) {
        doc.addPage();
        let newY = margin;

        if (titleForNextPage) {
            doc.setFontSize(12);
            doc.text(titleForNextPage + " (devam)", margin, newY);
            newY += 20;
        }

        return newY;
    }

    return currentY;
}

/**
 * Tablo sayfa sÄ±ÄŸmazsa yeni sayfa ekle
 */
export function ensureTableFitsPage(
    doc: jsPDFWithFontStatus,
    currentY: number,
    requiredHeight: number,
    margin = 40,
    titleForNextPage?: string
): number {
    const pageHeight = doc.internal.pageSize.getHeight();
    const footerHeight = PDF_CONSTANTS.footerHeight;

    // EÄŸer tablo sayfa sÄ±ÄŸmazsa yeni sayfa ekle (daha fazla boÅŸluk bÄ±rak)
    const minSpaceNeeded = requiredHeight + 70;
    if (currentY + minSpaceNeeded > pageHeight - footerHeight - margin) {
        doc.addPage();
        let nextY = margin + 30;

        // Yeni sayfada template'i uygula - circular dependency olmamasÄ± iÃ§in burada template oluÅŸturma ve background Ã§izme iÅŸlemini Ã§aÄŸÄ±rmÄ±yoruz
        // KullanÄ±cÄ±nÄ±n bu fonksiyonu Ã§aÄŸÄ±rdÄ±ÄŸÄ± yerde background ve template iÅŸlemlerini yapmasÄ± gerekebilir
        // Veya basitÃ§e background Ã§iz

        // Basit background (beyaz)
        const pageWidth = doc.internal.pageSize.getWidth();
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');

        return nextY;
    }

    return currentY;
}

// Re-export for convenience
export { REV_LOGO_DATA_URI };

import { ROBOTO_REGULAR_BASE64, ROBOTO_BOLD_BASE64 } from "@/assets/fonts/roboto-base64";

// Font Cache
let cachedRobotoRegular: string | null = null;
let cachedRobotoBold: string | null = null;

export const isRobotoName = (fontName?: string): boolean => {
    if (!fontName) return false;
    return fontName.toLowerCase().includes("roboto");
};

// GÃ¼Ã§lendirilmiÅŸ Font YÃ¶netimi
export const registerFonts = async (doc: jsPDFWithFontStatus) => {
    if (doc._robotoFontLoaded && !doc._robotoFontLoadFailed) {
        return;
    }

    doc._robotoFontLoadFailed = false;

    try {
        if (!cachedRobotoRegular) {
            cachedRobotoRegular = ROBOTO_REGULAR_BASE64.replace(/^data:.*?,/, '').replace(/\s+/g, '').trim();
        }
        if (!cachedRobotoBold) {
            cachedRobotoBold = ROBOTO_BOLD_BASE64.replace(/^data:.*?,/, '').replace(/\s+/g, '').trim();
        }

        if (!cachedRobotoRegular || !cachedRobotoBold) {
            throw new Error("Embedded font data is missing.");
        }

        doc.addFileToVFS("Roboto-Regular.ttf", cachedRobotoRegular);
        doc.addFileToVFS("Roboto-Bold.ttf", cachedRobotoBold);
        doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
        doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");
        doc.setFont("Roboto", "normal");
        doc._robotoFontLoaded = true;
        doc._robotoFontLoadFailed = false;
    } catch (localError) {
        console.error("Local font load failed:", localError);
        doc.setFont("helvetica", "normal");
        doc._robotoFontLoaded = false;
        doc._robotoFontLoadFailed = true;
    }
};

export const createSafeText = (doc: jsPDFWithFontStatus) => {
    // Roboto yüklüyse orijinal metni koru, yalnızca son çare olarak transliterate et.
    return (text: string, x: number, y: number, fontSize: number, isBold: boolean = false) => {
        // null/undefined kontrolü
        if (text == null || text === '') {
            return;
        }

        const textStr = String(text);
        const transliteratedText = transliterateTurkish(textStr);

        // Font yüklenmemişse veya yükleme başarısızsa helvetica fallback kullan.
        if (!doc._robotoFontLoaded || doc._robotoFontLoadFailed) {
            try {
                doc.setFont("helvetica", isBold ? "bold" : "normal");
                doc.setFontSize(fontSize);
                doc.text(transliteratedText, x, y);
            } catch (error: unknown) {
                console.warn("createSafeText: Helvetica ile yazılamadı:", error);
            }
            return;
        }

        let robotoSelected = false;
        try {
            doc.setFont("Roboto", isBold ? "bold" : "normal");
            doc.setFontSize(fontSize);
            const currentFont = doc.getFont();

            if (currentFont && isRobotoName(currentFont.fontName)) {
                robotoSelected = true;
            }
        } catch (fontError) {
            console.warn("createSafeText: Roboto font ayarlanamadı:", fontError);
        }

        if (robotoSelected) {
            try {
                doc.text(textStr, x, y);
                return;
            } catch (writeError) {
                console.warn("createSafeText: Roboto ile yazılamadı, fallback deneniyor:", writeError);
            }
        }

        try {
            doc.setFont("helvetica", isBold ? "bold" : "normal");
            doc.setFontSize(fontSize);
            doc.text(transliteratedText, x, y);
        } catch (fallbackError) {
            console.error("createSafeText: Fallback da başarısız:", fallbackError);
        }
    };
};

export const forceRobotoFont = (doc: jsPDFWithFontStatus, style: "normal" | "bold" = "normal") => {
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

export const safeSetFont = (doc: jsPDFWithFontStatus, style: "normal" | "bold" = "normal") => {
    if (!doc._robotoFontLoaded || doc._robotoFontLoadFailed) {
        try {
            doc.setFont("helvetica", style);
        } catch {
            // ignore
        }
        return;
    }

    try {
        doc.setFont("Roboto", style);
        const currentFont = doc.getFont();
        if (currentFont && isRobotoName(currentFont.fontName)) {
            return;
        }
    } catch {
        // fallback below
    }

    try {
        doc.setFont("helvetica", style);
        doc._robotoFontLoaded = false;
        doc._robotoFontLoadFailed = true;
    } catch {
        // ignore
    }
};

export const createWillDrawCell = (doc: jsPDFWithFontStatus) => {
    return (data: AutoTableCellHookData) => {
        if (!data.cell) return;

        // Cast cell to any to avoid strict type checks on styles and fontStyle which might not match exact types
        const cell = data.cell as any;
        const fontStyle = (cell.fontStyle === "bold" || cell.styles?.fontStyle === "bold" || cell.styles?.font === "bold") ? "bold" : "normal";

        // Helper to force transliterate
        const forceTransliterate = (val: unknown): unknown => {
            if (typeof val === 'string') return transliterateTurkish(val);
            if (Array.isArray(val)) return val.map(t => typeof t === 'string' ? transliterateTurkish(t) : t);
            return val;
        };

        // Sadece Roboto yÃ¼klÃ¼ deÄŸilse transliterate et
        if (!doc._robotoFontLoaded || doc._robotoFontLoadFailed) {
            cell.text = forceTransliterate(cell.text);
        }

        if (doc._robotoFontLoaded && !doc._robotoFontLoadFailed) {
            try {
                safeSetFont(doc, fontStyle);
                if (!cell.styles) {
                    cell.styles = {};
                }
                cell.styles.font = "Roboto";
                cell.styles.fontStyle = fontStyle;
            } catch {
                if (!cell.styles) cell.styles = {};
                cell.styles.font = "helvetica";
                cell.styles.fontStyle = fontStyle;
            }
        } else {
            if (!cell.styles) cell.styles = {};
            cell.styles.font = "helvetica";
            cell.styles.fontStyle = fontStyle;
        }
    };
};


