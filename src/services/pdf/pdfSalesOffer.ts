import {
    createPdf,
    registerFonts,
    formatDate,
    createSafeText,
    isRobotoName,
    jsPDFWithFontStatus,
    transliterateTurkish,
    transliterateTableData,
    safeSetFont,
    createWillDrawCell,
    forceRobotoFont,
    ensureTableFitsPage,
    formatCurrency,
    safeNumber,
    safeFormatCurrency,
    REV_LOGO_DATA_URI,
    COMPANY_INFO,
    PDF_CONSTANTS,
    TAILWIND_COLORS
} from "./pdfCore";

import {
    createProfessionalTableStyles
} from "./pdfDrawing";

import autoTable from "jspdf-autotable";

export interface SalesOfferPayload {
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

    // Güçlendirilmiş Tipografi Ayarları
    doc.setLineHeightFactor(1.5);
    // Font'u zorla Roboto olarak ayarla
    forceRobotoFont(doc, "normal");
    doc.setFontSize(11);

    // A4 dimensions and margins - FIXED VALUES
    const mar = 40; // Margin on all sides
    const pageWidth = 595; // A4 width in pt
    const pageHeight = 842; // A4 height in pt

    // Header - Form Preview Style
    // Logo ve Şirket Bilgileri (Sağ Üst)
    const logoWidth = 40;
    const logoHeight = 40;

    // Helper functions used locally for specific formatting
    const formatDateTurkish = (dateStr: string | Date): string => {
        try {
            const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
            if (isNaN(date.getTime())) {
                if (typeof dateStr === 'string' && (dateStr.includes('Ocak') || dateStr.includes('Ağustos'))) {
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

    // Create safeText helper with color support - createSafeText kullan
    const baseSafeText = createSafeText(doc);
    const safeText = (text: string, x: number, y: number, fontSize: number, isBold: boolean = false, color?: [number, number, number]) => {
        try {
            if (color) {
                doc.setTextColor(color[0], color[1], color[2]);
            }
            baseSafeText(text, x, y, fontSize, isBold);
            if (color) {
                doc.setTextColor(0, 0, 0);
            }
        } catch (error) {
            // fallback handled in baseSafeText or ignored
        }
    };

    // Background: Light grey diagonal/triangular panel on the left side
    try {
        doc.setFillColor(243, 244, 246); // gray-100
        doc.setGState(doc.GState({ opacity: 0.3 }));

        const bgStartX = 0;
        const bgStartY = 0;
        const bgWidth = 200;
        const bgHeight = pageHeight;

        doc.rect(bgStartX, bgStartY, bgWidth, bgHeight, "F");
        doc.setGState(doc.GState({ opacity: 1 }));
    } catch (error) {
        // ignore
    }

    // Header Y position
    const headerY = 45;

    // Left Side: Title
    safeText("SATIŞ TEKLİFİ", mar, headerY, 30, true);
    safeText("FORMU", mar, headerY + 36, 30, true);

    // Customer Info Block
    const customerBlockY = headerY + 90;
    safeText("Müşteri", mar, customerBlockY, 14, true);

    const customerName = payload.customerName || "";
    const customerCompany = payload.customerCompany || "";
    const customerAddress = payload.customerAddress || "";
    const customerPhone = payload.customerPhone || "";
    const customerEmail = payload.customerEmail || "";

    let customerY = customerBlockY + 24;

    const customerText = customerName || customerCompany || "";
    if (customerText) {
        safeSetFont(doc, "normal");
        doc.setFontSize(14);
        const customerLines = doc.splitTextToSize(customerText, 280);
        customerLines.forEach((line: string) => {
            doc.setTextColor(31, 41, 55);
            safeText(line, mar, customerY, 14, false);
            doc.setTextColor(0, 0, 0);
            customerY += 18;
        });
    }

    const customerDetails: string[] = [];
    if (customerAddress) customerDetails.push(customerAddress);
    if (customerPhone) customerDetails.push(customerPhone);
    if (customerEmail) customerDetails.push(customerEmail);

    customerDetails.forEach((detail) => {
        doc.setTextColor(107, 114, 128);
        safeSetFont(doc, "normal");
        doc.setFontSize(11);
        const detailLines = doc.splitTextToSize(detail, 280);
        detailLines.forEach((line: string) => {
            safeText(line, mar, customerY, 11, false);
            customerY += 14;
        });
        doc.setTextColor(0, 0, 0);
    });

    // Right Side: Logo & Company Info
    const rightContentX = pageWidth - mar;
    const companyInfoY = headerY;
    const headerLogoSize = 40;

    try {
        const logoX = rightContentX - headerLogoSize;
        doc.addImage(REV_LOGO_DATA_URI, 'PNG', logoX, companyInfoY, headerLogoSize, headerLogoSize);
    } catch (error) {
        // ignore
    }

    const addressLines = [
        COMPANY_INFO.address,
        COMPANY_INFO.city,
        COMPANY_INFO.email,
        COMPANY_INFO.website,
        COMPANY_INFO.phone
    ];

    let addrY = companyInfoY + headerLogoSize + 10;
    safeSetFont(doc, "normal");
    doc.setFontSize(9);
    addressLines.forEach(line => {
        try {
            const lineWidth = doc.getTextWidth(line);
            doc.setTextColor(75, 85, 99);
            safeText(line, rightContentX - lineWidth, addrY, 9, false);
            doc.setTextColor(0, 0, 0);
            addrY += 11;
        } catch (error) {
            addrY += 11;
        }
    });

    // Date Info
    const dateInfoY = companyInfoY + headerLogoSize + 10 + (addressLines.length * 11) + 12;

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
    doc.setTextColor(55, 65, 81);
    safeText(dateValue, dateX, dateInfoY, 14, false);
    doc.setTextColor(0, 0, 0);

    // Valid Until
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
    doc.setTextColor(55, 65, 81);
    safeText(validValue, validX, dateInfoY + 22, 14, false);
    doc.setTextColor(0, 0, 0);

    // Table
    const maxBottomY = Math.max(customerY, dateInfoY + 40);
    let currentY = maxBottomY + 30;

    const items = Array.isArray(payload.items) ? payload.items.filter(item => item.description && item.description.trim() !== "") : [];

    const tableBody = items.map((item, index) => {
        const unitPrice = safeNumber(item.unitPrice);
        const quantity = safeNumber(item.quantity);
        const discount = safeNumber(item.discount || 0);
        const lineTotal = (quantity * unitPrice) - discount;

        return [
            (index + 1).toString(),
            item.description || "-",
            quantity.toString(),
            safeFormatCurrency(unitPrice),
            safeFormatCurrency(lineTotal),
        ];
    });

    const tableHead = [["No", "Ürün Adı", "Adet", "Birim Fiyat", "Toplam"]];

    let startY = currentY;

    // Custom didParseCell using createWillDrawCell equivalent logic directly or via hook
    const willDrawCell = createWillDrawCell(doc);

    const dynamicPageWidth = doc.internal.pageSize.getWidth();
    const tableWidth = dynamicPageWidth - (mar * 2);

    const tableStyles = createProfessionalTableStyles(doc, {
        headerFontSize: 11,
        bodyFontSize: 10,
        cellPadding: { top: 12, right: 14, bottom: 12, left: 14 }
    });

    tableStyles.headStyles.fillColor = [15, 23, 42]; // slate-900
    tableStyles.headStyles.textColor = [255, 255, 255];
    tableStyles.headStyles.halign = "center";
    tableStyles.headStyles.fontStyle = "bold";

    tableStyles.bodyStyles.fillColor = [255, 255, 255];
    tableStyles.bodyStyles.textColor = [30, 41, 59];
    tableStyles.bodyStyles.fontSize = 10;
    tableStyles.bodyStyles.lineColor = [226, 232, 240];
    tableStyles.bodyStyles.lineWidth = { bottom: 0.5, top: 0, left: 0, right: 0 };

    tableStyles.alternateRowStyles.fillColor = [248, 250, 252];

    startY = ensureTableFitsPage(doc, startY, 300, mar, "Ürün Listesi");
    forceRobotoFont(doc, "normal");

    autoTable(doc, {
        head: transliterateTableData(tableHead, doc),
        body: transliterateTableData(tableBody.length === 0 ? [["", "Kalem bilgisi girilmedi", "", "", ""]] : tableBody, doc),
        startY,
        margin: { left: mar, right: mar },
        willDrawCell: willDrawCell,
        tableWidth: tableWidth,
        ...tableStyles,
        columnStyles: {
            0: { cellWidth: tableWidth * 0.08, halign: "center", textColor: [71, 85, 105] },
            1: { cellWidth: tableWidth * 0.48, halign: "left", overflow: 'linebreak', textColor: [15, 23, 42] },
            2: { cellWidth: tableWidth * 0.10, halign: "center", textColor: [30, 41, 59] },
            3: { cellWidth: tableWidth * 0.17, halign: "right", textColor: [30, 41, 59] },
            4: { cellWidth: tableWidth * 0.17, halign: "right", fontStyle: "bold", textColor: [15, 23, 42] },
        },
    });

    currentY = (doc.lastAutoTable?.finalY || startY) + 30;

    // Bottom Section: Notes & Totals
    const contentWidth = pageWidth - (mar * 2);
    const bottomSectionY = currentY;
    const leftColWidth = (contentWidth / 2) - 10;
    const rightColWidth = (contentWidth / 2) - 10;
    const rightColX = mar + (contentWidth / 2) + 20;

    // Ensure space for bottom section
    if (bottomSectionY + 200 > pageHeight - PDF_CONSTANTS.footerHeight) {
        doc.addPage();
        currentY = mar;
        // Re-draw background for new page
        try {
            doc.setFillColor(243, 244, 246);
            doc.setGState(doc.GState({ opacity: 0.3 }));
            doc.rect(0, 0, 200, pageHeight, "F");
            doc.setGState(doc.GState({ opacity: 1 }));
        } catch (e) { }
    } else {
        currentY = bottomSectionY;
    }

    // Draw Terms (Notes)
    if (payload.notes) {
        // Custom Terms Block implementation matching the original design
        const termsX = mar;
        const termsY = currentY;
        const termsWidth = leftColWidth;

        const padding = 16;
        const innerWidth = termsWidth - padding * 2;
        const termsList = payload.notes.split('\n').filter(t => t.trim());
        const termLines = termsList.flatMap(term => doc.splitTextToSize(term, innerWidth));
        const height = padding * 2 + 25 + termLines.length * 14;

        doc.setFillColor(253, 253, 255);
        doc.setDrawColor(229, 234, 244);
        doc.roundedRect(termsX, termsY, termsWidth, height, 8, 8, "F");
        doc.roundedRect(termsX, termsY, termsWidth, height, 8, 8, "S");

        let cursorY = termsY + padding;
        safeText("Notlar", termsX + padding, cursorY + 5, 12, true);
        cursorY += 25;

        termLines.forEach(line => {
            safeText(line, termsX + padding, cursorY, 10, false);
            cursorY += 14;
        });
    }

    // Draw Totals
    const totals = payload.totals;
    const currency = payload.currency || "₺";

    const totalsX = rightColX;
    const totalsY = currentY;
    const totalsWidth = rightColWidth;

    const padding = 20;
    const rows: Array<{ label: string; value: string; isAccent?: boolean }> = [];

    if ((totals.discount || 0) > 0) {
        rows.push({
            label: "Toplam İskonto",
            value: `-${safeFormatCurrency(totals.discount)}`,
            isAccent: true,
        });
    }

    rows.push(
        { label: "Ara Toplam", value: safeFormatCurrency(totals.subtotal) },
        { label: `KDV (%${payload.taxRate || 0})`, value: safeFormatCurrency(totals.tax) }
    );

    const contentHeight = rows.length * 24 + 40;
    const height = padding * 2 + contentHeight + 20;

    doc.setFillColor(248, 249, 252);
    doc.setDrawColor(229, 234, 244);
    doc.roundedRect(totalsX, totalsY, totalsWidth, height, 8, 8, "F");
    doc.roundedRect(totalsX, totalsY, totalsWidth, height, 8, 8, "S");

    let cursorY = totalsY + padding + 5;
    safeText("Ödeme Özeti", totalsX + padding, cursorY, 12, true);
    cursorY += 25;

    rows.forEach((row) => {
        safeText(row.label, totalsX + padding, cursorY, 10, false, [100, 116, 139]);
        const valueWidth = doc.getTextWidth(row.value);
        safeText(row.value, totalsX + totalsWidth - padding - valueWidth, cursorY, 10, true, row.isAccent ? [239, 68, 68] : [15, 23, 42]);
        cursorY += 24;
    });

    doc.setDrawColor(226, 232, 240);
    doc.line(totalsX + padding, cursorY, totalsX + totalsWidth - padding, cursorY);
    cursorY += 20;

    safeText("GENEL TOPLAM", totalsX + padding, cursorY, 12, true, [15, 23, 42]);
    const grandTotalText = safeFormatCurrency(totals.grandTotal);
    const grandTotalWidth = doc.getTextWidth(grandTotalText);
    safeText(grandTotalText, totalsX + totalsWidth - padding - grandTotalWidth, cursorY, 16, true, [30, 58, 138]); // Blue

    // Output
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
