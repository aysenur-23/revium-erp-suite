/**
 * PDF Drawing Utilities
 * Drawing functions for PDF elements: cards, headers, footers, tables
 * Extracted and modularized from the unified generator service for better maintainability
 */

import autoTable from "jspdf-autotable";
import {
    PDF_CONSTANTS,
    TAILWIND_COLORS,
    COMPANY_INFO,
    REV_LOGO_DATA_URI,
    PDFTemplateLayout,
    StatCardConfig,
    TableHeaderConfig,
    ProfessionalTableStyles,
    jsPDFWithFontStatus,
    transliterateTurkish,
    createPDFTemplate,
} from "./pdfCore";

// Helper for smart transliteration
const getSafeText = (text: string, doc: jsPDFWithFontStatus): string => {
    if (doc._robotoFontLoaded && !doc._robotoFontLoadFailed) {
        return text;
    }
    return transliterateTurkish(text);
};

/**
 * Arka plan template'i çiz
 */
export function drawPDFBackground(
    doc: jsPDFWithFontStatus,
    template: PDFTemplateLayout
): void {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Beyaz arka plan
    doc.setFillColor(...TAILWIND_COLORS.white);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Header arka planı
    doc.setFillColor(...TAILWIND_COLORS.gray50);
    doc.rect(0, 0, pageWidth, template.header.endY, 'F');

    // Header alt çizgisi
    doc.setDrawColor(...TAILWIND_COLORS.gray200);
    doc.setLineWidth(1);
    doc.line(0, template.header.endY, pageWidth, template.header.endY);
}

/**
 * İstatistik kartı çiz
 */
export function drawStatCard(
    doc: jsPDFWithFontStatus,
    x: number,
    y: number,
    width: number,
    height: number,
    config: StatCardConfig
): void {
    const padding = 12;
    const cornerRadius = 6;

    // Kart arka planı
    doc.setFillColor(...config.color.background);
    doc.roundedRect(x, y, width, height, cornerRadius, cornerRadius, 'F');

    // Kart border
    doc.setDrawColor(...config.color.border);
    doc.setLineWidth(1);
    doc.roundedRect(x, y, width, height, cornerRadius, cornerRadius, 'S');

    // Başlık
    doc.setFontSize(PDF_CONSTANTS.fontSizeCardTitle);
    doc.setTextColor(...config.color.text);
    doc.text(getSafeText(config.title, doc), x + padding, y + padding + 10);

    // Değer
    doc.setFontSize(PDF_CONSTANTS.fontSizeCardValue);
    doc.setTextColor(...config.color.value);
    const valueText = String(config.value);
    doc.text(getSafeText(valueText, doc), x + padding, y + padding + 40);

    // Açıklama (opsiyonel)
    if (config.description) {
        doc.setFontSize(PDF_CONSTANTS.fontSizeCardDescription);
        doc.setTextColor(...config.color.text);
        doc.text(getSafeText(config.description, doc), x + padding, y + height - padding);
    }
}

/**
 * Profesyonel tablo başlığı çiz
 */
export function drawProfessionalTableHeader(
    doc: jsPDFWithFontStatus,
    x: number,
    y: number,
    width: number,
    config: TableHeaderConfig
): number {
    const height = 32;
    const padding = 12;
    const cornerRadius = 4;

    const bgColor = config.backgroundColor || PDF_CONSTANTS.primaryColor;
    const textColor = config.textColor || TAILWIND_COLORS.white;

    // Başlık arka planı
    doc.setFillColor(...bgColor);
    doc.roundedRect(x, y, width, height, cornerRadius, cornerRadius, 'F');

    // Başlık metni
    doc.setFontSize(PDF_CONSTANTS.fontSizeTableHeader);
    doc.setTextColor(...textColor);
    doc.text(getSafeText(config.title, doc), x + padding, y + (height / 2) + 5);

    return y + height + 8;
}

/**
 * Profesyonel tablo stilleri oluştur
 */
export function createProfessionalTableStyles(
    doc: jsPDFWithFontStatus,
    options?: {
        headerFontSize?: number;
        bodyFontSize?: number;
        cellPadding?: { top: number; right: number; bottom: number; left: number };
    }
): ProfessionalTableStyles {
    const headerFontSize = options?.headerFontSize || PDF_CONSTANTS.fontSizeTableHeaderText;
    const bodyFontSize = options?.bodyFontSize || PDF_CONSTANTS.fontSizeTableBody;
    const cellPadding = options?.cellPadding || { top: 8, right: 8, bottom: 8, left: 8 };

    return {
        headStyles: {
            fillColor: PDF_CONSTANTS.primaryColor,
            textColor: TAILWIND_COLORS.white,
            fontSize: headerFontSize,
            fontStyle: 'bold',
            cellPadding,
            halign: 'left',
        },
        bodyStyles: {
            fillColor: TAILWIND_COLORS.white,
            textColor: TAILWIND_COLORS.gray700,
            fontSize: bodyFontSize,
            cellPadding,
            halign: 'left',
        },
        styles: {
            lineColor: TAILWIND_COLORS.gray200,
            lineWidth: 0.5,
            overflow: 'linebreak',
        },
        alternateRowStyles: {
            fillColor: TAILWIND_COLORS.gray50,
        },
    };
}

/**
 * PDF Header çiz
 */
export function drawPDFHeader(
    doc: jsPDFWithFontStatus,
    template: PDFTemplateLayout,
    title: string,
    reportDate: string,
    startDate?: string,
    endDate?: string
): void {
    const pageWidth = doc.internal.pageSize.getWidth();

    // Logo
    try {
        doc.addImage(
            REV_LOGO_DATA_URI,
            'PNG',
            template.header.logoX,
            template.header.logoY,
            PDF_CONSTANTS.logoSize,
            PDF_CONSTANTS.logoSize
        );
    } catch {
        // Logo yüklenemezse devam et
    }

    // Şirket adı
    doc.setFontSize(18);
    doc.setTextColor(...PDF_CONSTANTS.primaryColor);
    doc.text(getSafeText(COMPANY_INFO.name, doc), template.header.titleX, template.header.titleY);

    // Rapor başlığı
    doc.setFontSize(PDF_CONSTANTS.fontSizeTitle);
    doc.setTextColor(...TAILWIND_COLORS.gray600);
    doc.text(getSafeText(title, doc), template.header.titleX, template.header.titleY + 20);

    // Tarih bilgisi
    doc.setFontSize(PDF_CONSTANTS.fontSizeSmall);
    doc.setTextColor(...TAILWIND_COLORS.gray500);

    let dateText = `Rapor Tarihi: ${reportDate}`;
    if (startDate && endDate) {
        dateText += ` | Dönem: ${startDate} - ${endDate}`;
    }
    doc.text(getSafeText(dateText, doc), template.header.titleX, template.header.titleY + 35);

    // Sağ üst: İletişim bilgileri
    doc.setFontSize(9);
    doc.setTextColor(...TAILWIND_COLORS.gray400);
    const contactWidth = doc.getTextWidth(COMPANY_INFO.contactInfo);
    doc.text(COMPANY_INFO.contactInfo, pageWidth - PDF_CONSTANTS.margin - contactWidth, 40);
}

/**
 * PDF Footer çiz
 */
export function drawPDFFooter(
    doc: jsPDFWithFontStatus,
    template: PDFTemplateLayout,
    pageNumber?: number,
    totalPages?: number
): void {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const footerY = pageHeight - PDF_CONSTANTS.footerHeight;

    // Footer üst çizgisi
    doc.setDrawColor(...TAILWIND_COLORS.gray200);
    doc.setLineWidth(0.5);
    doc.line(PDF_CONSTANTS.margin, footerY, pageWidth - PDF_CONSTANTS.margin, footerY);

    // Sayfa numarası
    if (pageNumber !== undefined) {
        doc.setFontSize(10);
        doc.setTextColor(...TAILWIND_COLORS.gray500);
        const pageText = totalPages
            ? `Sayfa ${pageNumber} / ${totalPages}`
            : `Sayfa ${pageNumber}`;
        const textWidth = doc.getTextWidth(pageText);
        doc.text(getSafeText(pageText, doc), (pageWidth - textWidth) / 2, footerY + 20);
    }

    // Footer logo (küçük)
    try {
        doc.addImage(
            REV_LOGO_DATA_URI,
            'PNG',
            PDF_CONSTANTS.margin,
            footerY + 10,
            PDF_CONSTANTS.footerLogoSize,
            PDF_CONSTANTS.footerLogoSize
        );
    } catch {
        // Logo yüklenemezse devam et
    }

    // Copyright
    doc.setFontSize(8);
    doc.setTextColor(...TAILWIND_COLORS.gray400);
    const year = new Date().getFullYear();
    const copyrightText = `© ${year} ${COMPANY_INFO.name}. Tüm hakları saklıdır.`;
    const copyrightWidth = doc.getTextWidth(copyrightText);
    doc.text(getSafeText(copyrightText, doc), pageWidth - PDF_CONSTANTS.margin - copyrightWidth, footerY + 25);
}

/**
 * PDF Template uygula
 */
export function applyPDFTemplate(
    doc: jsPDFWithFontStatus,
    title: string,
    reportDate: string,
    startDate?: string,
    endDate?: string
): PDFTemplateLayout {
    const template = createPDFTemplate(doc);
    drawPDFBackground(doc, template);
    drawPDFHeader(doc, template, title, reportDate, startDate, endDate);
    return template;
}

/**
 * Yeni sayfa için template uygula
 */
export function applyPDFTemplateToNewPage(
    doc: jsPDFWithFontStatus,
    template: PDFTemplateLayout
): void {
    drawPDFBackground(doc, template);
}

/**
 * Özet bölümü çiz
 */
export function drawSummarySection(
    doc: jsPDFWithFontStatus,
    x: number,
    y: number,
    width: number,
    title: string,
    data: Array<[string, string]>,
    headerColor: [number, number, number] = PDF_CONSTANTS.primaryColor
): number {
    const padding = 12;
    const rowHeight = 24;
    const headerHeight = 32;
    const cornerRadius = 6;

    const totalHeight = headerHeight + (data.length * rowHeight) + padding;

    // Arka plan
    doc.setFillColor(...TAILWIND_COLORS.gray50);
    doc.roundedRect(x, y, width, totalHeight, cornerRadius, cornerRadius, 'F');

    // Border
    doc.setDrawColor(...TAILWIND_COLORS.gray200);
    doc.setLineWidth(1);
    doc.roundedRect(x, y, width, totalHeight, cornerRadius, cornerRadius, 'S');

    // Başlık
    doc.setFillColor(...headerColor);
    doc.roundedRect(x, y, width, headerHeight, cornerRadius, cornerRadius, 'F');
    doc.setFontSize(12);
    doc.setTextColor(...TAILWIND_COLORS.white);
    doc.text(getSafeText(title, doc), x + padding, y + (headerHeight / 2) + 4);

    // Data satırları
    let currentY = y + headerHeight + padding;
    doc.setFontSize(11);

    data.forEach(([label, value], index) => {
        // Alternatif satır rengi
        if (index % 2 === 1) {
            doc.setFillColor(...TAILWIND_COLORS.white);
            doc.rect(x + 1, currentY - 6, width - 2, rowHeight, 'F');
        }

        doc.setTextColor(...TAILWIND_COLORS.gray600);
        doc.text(getSafeText(label, doc), x + padding, currentY + 6);

        doc.setTextColor(...TAILWIND_COLORS.gray900);
        const valueWidth = doc.getTextWidth(value);
        doc.text(getSafeText(value, doc), x + width - padding - valueWidth, currentY + 6);

        currentY += rowHeight;
    });

    return y + totalHeight + PDF_CONSTANTS.sectionSpacing;
}

/**
 * Bilgi kartı çiz
 */
export function drawInfoCard(
    doc: jsPDFWithFontStatus,
    {
        x,
        y,
        width,
        title,
        rows,
    }: {
        x: number;
        y: number;
        width: number;
        title: string;
        rows: Array<{ label: string; value?: string }>
    }
): number {
    const padding = 12;
    const rowHeight = 20;
    const headerHeight = 28;
    const cornerRadius = 4;

    const filteredRows = rows.filter(r => r.value);
    const totalHeight = headerHeight + (filteredRows.length * rowHeight) + padding;

    // Arka plan
    doc.setFillColor(...TAILWIND_COLORS.white);
    doc.roundedRect(x, y, width, totalHeight, cornerRadius, cornerRadius, 'F');

    // Border
    doc.setDrawColor(...TAILWIND_COLORS.gray200);
    doc.setLineWidth(0.5);
    doc.roundedRect(x, y, width, totalHeight, cornerRadius, cornerRadius, 'S');

    // Başlık
    doc.setFillColor(...TAILWIND_COLORS.gray100);
    doc.roundedRect(x, y, width, headerHeight, cornerRadius, cornerRadius, 'F');
    doc.setFontSize(11);
    doc.setTextColor(...TAILWIND_COLORS.gray700);
    doc.text(getSafeText(title, doc), x + padding, y + (headerHeight / 2) + 4);

    // Data satırları
    let currentY = y + headerHeight + 8;
    doc.setFontSize(10);

    filteredRows.forEach(({ label, value }) => {
        doc.setTextColor(...TAILWIND_COLORS.gray500);
        doc.text(getSafeText(label + ':', doc), x + padding, currentY + 4);

        doc.setTextColor(...TAILWIND_COLORS.gray800);
        const labelWidth = doc.getTextWidth(label + ': ');
        doc.text(getSafeText(value || '-', doc), x + padding + labelWidth, currentY + 4);

        currentY += rowHeight;
    });

    return y + totalHeight;
}

/**
 * Şartlar bloğu çiz
 */
export function drawTermsBlock(
    doc: jsPDFWithFontStatus,
    { x, y, width, terms }: { x: number; y: number; width: number; terms?: string[] }
): number {
    if (!terms || terms.length === 0) return y;

    const padding = 12;
    const lineHeight = 16;
    const headerHeight = 24;
    const cornerRadius = 4;

    const totalHeight = headerHeight + (terms.length * lineHeight) + padding;

    // Arka plan
    doc.setFillColor(...TAILWIND_COLORS.gray50);
    doc.roundedRect(x, y, width, totalHeight, cornerRadius, cornerRadius, 'F');

    // Başlık
    doc.setFontSize(11);
    doc.setTextColor(...TAILWIND_COLORS.gray700);
    doc.text(getSafeText('Şartlar ve Koşullar', doc), x + padding, y + 16);

    // Şartlar
    let currentY = y + headerHeight + 4;
    doc.setFontSize(9);
    doc.setTextColor(...TAILWIND_COLORS.gray600);

    terms.forEach((term, index) => {
        doc.text(getSafeText(`${index + 1}. ${term}`, doc), x + padding, currentY + 4);
        currentY += lineHeight;
    });

    return y + totalHeight;
}

/**
 * Özet bloğu çiz (toplam, indirim, vergi, genel toplam)
 */
export function drawSummaryBlock(
    doc: jsPDFWithFontStatus,
    {
        x,
        y,
        width,
        totals,
        currency,
        taxRate,
    }: {
        x: number;
        y: number;
        width: number;
        totals: { subtotal: number; discount: number; tax: number; grandTotal: number };
        currency: string;
        taxRate: number
    }
): number {
    const padding = 12;
    const rowHeight = 20;
    const cornerRadius = 4;

    const formatValue = (value: number) =>
        `${currency}${value.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;

    const rows = [
        { label: 'Ara Toplam', value: formatValue(totals.subtotal) },
        { label: 'İndirim', value: formatValue(totals.discount) },
        { label: `KDV (%${taxRate})`, value: formatValue(totals.tax) },
    ];

    const totalHeight = (rows.length + 1) * rowHeight + padding;

    // Arka plan
    doc.setFillColor(...TAILWIND_COLORS.white);
    doc.roundedRect(x, y, width, totalHeight, cornerRadius, cornerRadius, 'F');

    // Border
    doc.setDrawColor(...TAILWIND_COLORS.gray200);
    doc.setLineWidth(0.5);
    doc.roundedRect(x, y, width, totalHeight, cornerRadius, cornerRadius, 'S');

    let currentY = y + padding;

    // Normal satırlar
    doc.setFontSize(10);
    rows.forEach(({ label, value }) => {
        doc.setTextColor(...TAILWIND_COLORS.gray600);
        doc.text(getSafeText(label, doc), x + padding, currentY + 4);

        doc.setTextColor(...TAILWIND_COLORS.gray800);
        const valueWidth = doc.getTextWidth(value);
        doc.text(getSafeText(value, doc), x + width - padding - valueWidth, currentY + 4);

        currentY += rowHeight;
    });

    // Genel toplam (vurgulu)
    doc.setFillColor(...PDF_CONSTANTS.primaryColor);
    doc.rect(x + 1, currentY - 4, width - 2, rowHeight + 4, 'F');

    doc.setFontSize(12);
    doc.setTextColor(...TAILWIND_COLORS.white);
    doc.text(getSafeText('Genel Toplam', doc), x + padding, currentY + 8);

    const grandTotalValue = formatValue(totals.grandTotal);
    const grandTotalWidth = doc.getTextWidth(grandTotalValue);
    doc.text(getSafeText(grandTotalValue, doc), x + width - padding - grandTotalWidth, currentY + 8);

    return y + totalHeight;
}
