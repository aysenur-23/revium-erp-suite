import {
    createPdf,
    registerFonts,
    formatDate,
    createSafeText,
    jsPDFWithFontStatus,
    transliterateTableData,
    createWillDrawCell,
    forceRobotoFont,
    ensureTableFitsPage,
    safeFormatCurrency,
    calculateCardDimensions,
    ensureSpace,
    TAILWIND_COLORS,
    PDF_CONSTANTS,
    createPDFTemplate
} from "./pdfCore";

import {
    applyPDFTemplate,
    drawStatCard,
    drawProfessionalTableHeader,
    createProfessionalTableStyles,
    drawPDFFooter
} from "./pdfDrawing";

import autoTable from "jspdf-autotable";

export interface CustomerReportData {
    totalCustomers: number;
    activeCustomers: number;
    newCustomers: number;
    topCustomers: {
        name: string;
        orders: number;
        total: number;
    }[];
    segments: {
        high: number;
        medium: number;
        low: number;
    };
}

const applyDocumentTypography = (doc: jsPDFWithFontStatus) => {
    doc.setLineHeightFactor(1.5);
    if (doc._robotoFontLoaded && !doc._robotoFontLoadFailed) {
        forceRobotoFont(doc, "normal");
    } else {
        doc.setFont("helvetica", "normal");
    }
    doc.setFontSize(11);
};

export const generateCustomerReportPDF = async (data: CustomerReportData, startDate: string, endDate: string) => {
    const doc = createPdf({ format: "a4", unit: "pt" });

    try {
        await registerFonts(doc);
    } catch (fontError) {
        try {
            await registerFonts(doc);
        } catch (retryError) {
            // ignore
        }
    }

    if (!doc._robotoFontLoaded || doc._robotoFontLoadFailed) {
        try {
            await registerFonts(doc);
        } catch (retryError) {
            // ignore
        }
    }

    if (doc._robotoFontLoaded && !doc._robotoFontLoadFailed) {
        forceRobotoFont(doc, "normal");
    }

    applyDocumentTypography(doc);

    const reportDate = formatDate(new Date().toISOString());
    const template = applyPDFTemplate(doc, "MÜŞTERİ RAPORU", reportDate, startDate, endDate);

    if (doc._robotoFontLoaded && !doc._robotoFontLoadFailed) {
        forceRobotoFont(doc, "normal");
    }

    let currentY = template.contentArea.startY + 5;
    const contentWidth = template.contentArea.width;
    const mar = template.contentArea.leftMargin;

    // Stat Cards
    const cardDimensions = calculateCardDimensions(contentWidth, 3);
    const cardWidth = cardDimensions.width;
    const cardGap = cardDimensions.gap;
    const cardHeight = PDF_CONSTANTS.cardHeight;
    let cardX = mar;

    // Total Customers
    drawStatCard(doc, cardX, currentY, cardWidth, cardHeight, {
        title: "Toplam Müşteri",
        value: data.totalCustomers.toString(),
        description: "Tüm müşteriler",
        color: {
            background: TAILWIND_COLORS.primaryCardBg,
            border: TAILWIND_COLORS.primaryCardBorder,
            text: TAILWIND_COLORS.cardText,
            value: TAILWIND_COLORS.primaryCardValue,
        },
    });

    // Active Customers
    cardX += cardWidth + cardGap;
    drawStatCard(doc, cardX, currentY, cardWidth, cardHeight, {
        title: "Aktif Müşteri",
        value: data.activeCustomers.toString(),
        description: "Sipariş veren müşteri",
        color: {
            background: TAILWIND_COLORS.successCardBg,
            border: TAILWIND_COLORS.successCardBorder,
            text: TAILWIND_COLORS.cardText,
            value: TAILWIND_COLORS.successCardValue,
        },
    });

    // New Customers
    cardX += cardWidth + cardGap;
    drawStatCard(doc, cardX, currentY, cardWidth, cardHeight, {
        title: "Yeni Müşteri",
        value: data.newCustomers.toString(),
        description: "Tarih aralığında",
        color: {
            background: TAILWIND_COLORS.infoCardBg,
            border: TAILWIND_COLORS.infoCardBorder,
            text: TAILWIND_COLORS.cardText,
            value: TAILWIND_COLORS.infoCardValue,
        },
    });

    currentY += cardHeight + PDF_CONSTANTS.sectionSpacing + 5;

    // Customer Segmentation
    if (data.segments) {
        currentY = ensureSpace(doc, currentY, 200, mar, "Müşteri Segmentasyonu");
        currentY = drawProfessionalTableHeader(doc, mar, currentY, 300, {
            title: "Müşteri Segmentasyonu",
            backgroundColor: TAILWIND_COLORS.gray50,
            textColor: PDF_CONSTANTS.primaryColor,
            borderColor: [229, 231, 235],
        });

        const total = data.segments.high + data.segments.medium + data.segments.low;
        const segmentData = [
            ["Yüksek Değerli (>₺50K)", data.segments.high.toString(), total > 0 ? `%${((data.segments.high / total) * 100).toFixed(1)}` : "%0"],
            ["Orta Değerli (₺10K-₺50K)", data.segments.medium.toString(), total > 0 ? `%${((data.segments.medium / total) * 100).toFixed(1)}` : "%0"],
            ["Düşük Değerli (<₺10K)", data.segments.low.toString(), total > 0 ? `%${((data.segments.low / total) * 100).toFixed(1)}` : "%0"],
        ];

        const tableStyles = createProfessionalTableStyles(doc, {
            headerFontSize: 12,
            bodyFontSize: 11,
            cellPadding: { top: 12, right: 14, bottom: 12, left: 14 }
        });

        currentY = ensureTableFitsPage(doc, currentY, 200, mar, "Müşteri Segmentasyonu");
        const tableWidth = contentWidth;

        forceRobotoFont(doc, "normal");

        autoTable(doc, {
            startY: currentY,
            head: transliterateTableData([['Segment', 'Müşteri Sayısı', 'Oran']], doc),
            body: transliterateTableData(segmentData, doc),
            margin: { left: mar, right: mar },
            tableWidth: tableWidth,
            willDrawCell: createWillDrawCell(doc),
            ...tableStyles,
            columnStyles: {
                0: { cellWidth: tableWidth * 0.40, halign: "left" },
                1: { cellWidth: tableWidth * 0.30, halign: "center" },
                2: { cellWidth: tableWidth * 0.30, halign: "center", textColor: [107, 114, 128] },
            },
        });

        currentY = (doc.lastAutoTable?.finalY || currentY) + PDF_CONSTANTS.tableSpacing;
    }

    // Top Customers
    if (data.topCustomers && data.topCustomers.length > 0) {
        currentY = ensureSpace(doc, currentY, 200, mar, "En Değerli Müşteriler");
        currentY = drawProfessionalTableHeader(doc, mar, currentY, 300, {
            title: "En Değerli Müşteriler",
            backgroundColor: TAILWIND_COLORS.gray50,
            textColor: PDF_CONSTANTS.primaryColor,
            borderColor: [229, 231, 235],
        });

        const customerData = data.topCustomers.slice(0, 10).map((c, index) => [
            `#${index + 1}`,
            c.name,
            c.orders.toString(),
            safeFormatCurrency(c.total)
        ]);

        const tableStyles = createProfessionalTableStyles(doc, {
            headerFontSize: 12,
            bodyFontSize: 11,
            cellPadding: { top: 12, right: 14, bottom: 12, left: 14 }
        });

        currentY = ensureTableFitsPage(doc, currentY, 200, mar, "En Değerli Müşteriler");
        const tableWidth = contentWidth;

        forceRobotoFont(doc, "normal");

        autoTable(doc, {
            startY: currentY,
            head: transliterateTableData([['Sıra', 'Müşteri', 'Sipariş Sayısı', 'Toplam Harcama']], doc),
            body: transliterateTableData(customerData, doc),
            margin: { left: mar, right: mar },
            tableWidth: tableWidth,
            willDrawCell: createWillDrawCell(doc),
            ...tableStyles,
            columnStyles: {
                0: { cellWidth: tableWidth * 0.10, halign: "center", textColor: [107, 114, 128] },
                1: { cellWidth: tableWidth * 0.40, halign: "left" },
                2: { cellWidth: tableWidth * 0.20, halign: "center" },
                3: { cellWidth: tableWidth * 0.30, halign: "right", textColor: PDF_CONSTANTS.primaryColor, fontStyle: "bold" },
            },
        });
    }

    try {
        const totalPages = doc.internal.pages.length - 1;
        if (totalPages > 0) {
            for (let i = 1; i <= totalPages; i++) {
                try {
                    doc.setPage(i);
                    const pageTemplate = createPDFTemplate(doc);
                    drawPDFFooter(doc, pageTemplate, i, totalPages);
                } catch (e) { }
            }
        }
    } catch (e) { }

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
