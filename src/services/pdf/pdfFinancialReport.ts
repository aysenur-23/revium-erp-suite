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

export interface FinancialReportData {
    totalRevenue: number;
    totalCost: number;
    grossProfit: number;
    profitMargin: number;
    monthlyTrend: {
        month: string;
        revenue: number;
        cost: number;
        profit: number;
    }[];
    topProfitableProducts: {
        name: string;
        revenue: number;
        cost: number;
        profit: number;
    }[];
    costBreakdown?: {
        category: string;
        amount: number;
        percentage: number;
    }[];
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

export const generateFinancialReportPDF = async (data: FinancialReportData, startDate: string, endDate: string) => {
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
    const template = applyPDFTemplate(doc, "MALİ RAPOR", reportDate, startDate, endDate);

    if (doc._robotoFontLoaded && !doc._robotoFontLoadFailed) {
        forceRobotoFont(doc, "normal");
    }

    let currentY = template.contentArea.startY + 5;
    const contentWidth = template.contentArea.width;
    const mar = template.contentArea.leftMargin;

    // Stat Cards
    const cardDimensions = calculateCardDimensions(contentWidth, 4); // 4 cards
    const cardWidth = cardDimensions.width;
    const cardGap = cardDimensions.gap;
    const cardHeight = PDF_CONSTANTS.cardHeight;
    let cardX = mar;

    // Total Revenue
    drawStatCard(doc, cardX, currentY, cardWidth, cardHeight, {
        title: "Toplam Gelir",
        value: safeFormatCurrency(data.totalRevenue),
        description: "Toplam ciro",
        color: {
            background: TAILWIND_COLORS.successCardBg,
            border: TAILWIND_COLORS.successCardBorder,
            text: TAILWIND_COLORS.cardText,
            value: TAILWIND_COLORS.successCardValue,
        },
    });

    // Total Cost
    cardX += cardWidth + cardGap;
    drawStatCard(doc, cardX, currentY, cardWidth, cardHeight, {
        title: "Toplam Gider",
        value: safeFormatCurrency(data.totalCost),
        description: "Toplam maliyet",
        color: {
            background: TAILWIND_COLORS.dangerCardBg,
            border: TAILWIND_COLORS.dangerCardBorder,
            text: TAILWIND_COLORS.cardText,
            value: TAILWIND_COLORS.dangerCardValue,
        },
    });

    // Gross Profit
    cardX += cardWidth + cardGap;
    drawStatCard(doc, cardX, currentY, cardWidth, cardHeight, {
        title: "Brüt Kar",
        value: safeFormatCurrency(data.grossProfit),
        description: "Net kar",
        color: {
            background: TAILWIND_COLORS.infoCardBg,
            border: TAILWIND_COLORS.infoCardBorder,
            text: TAILWIND_COLORS.cardText,
            value: TAILWIND_COLORS.infoCardValue,
        },
    });

    // Profit Margin
    cardX += cardWidth + cardGap;
    drawStatCard(doc, cardX, currentY, cardWidth, cardHeight, {
        title: "Kar Marjı",
        value: `%${data.profitMargin.toFixed(1)}`,
        description: "Karlılık oranı",
        color: {
            background: TAILWIND_COLORS.primaryCardBg,
            border: TAILWIND_COLORS.primaryCardBorder,
            text: TAILWIND_COLORS.cardText,
            value: TAILWIND_COLORS.primaryCardValue,
        },
    });

    currentY += cardHeight + PDF_CONSTANTS.sectionSpacing + 5;

    // Monthly Trend Table
    if (data.monthlyTrend && data.monthlyTrend.length > 0) {
        currentY = ensureSpace(doc, currentY, 200, mar, "Aylık Trend Analizi");
        currentY = drawProfessionalTableHeader(doc, mar, currentY, 300, {
            title: "Aylık Trend Analizi",
            backgroundColor: TAILWIND_COLORS.gray50,
            textColor: PDF_CONSTANTS.primaryColor,
            borderColor: [229, 231, 235],
        });

        const trendData = data.monthlyTrend.map(item => [
            item.month,
            safeFormatCurrency(item.revenue),
            safeFormatCurrency(item.cost),
            safeFormatCurrency(item.profit)
        ]);

        const tableStyles = createProfessionalTableStyles(doc, {
            headerFontSize: 12,
            bodyFontSize: 11,
            cellPadding: { top: 12, right: 14, bottom: 12, left: 14 }
        });

        currentY = ensureTableFitsPage(doc, currentY, 200, mar, "Aylık Trend Analizi");
        const tableWidth = contentWidth;

        forceRobotoFont(doc, "normal");

        autoTable(doc, {
            startY: currentY,
            head: transliterateTableData([['Ay', 'Gelir', 'Gider', 'Kar']], doc),
            body: transliterateTableData(trendData, doc),
            margin: { left: mar, right: mar },
            tableWidth: tableWidth,
            willDrawCell: createWillDrawCell(doc),
            ...tableStyles,
            columnStyles: {
                0: { cellWidth: tableWidth * 0.25, halign: "left" },
                1: { cellWidth: tableWidth * 0.25, halign: "right", textColor: TAILWIND_COLORS.successCardValue },
                2: { cellWidth: tableWidth * 0.25, halign: "right", textColor: TAILWIND_COLORS.dangerCardValue },
                3: { cellWidth: tableWidth * 0.25, halign: "right", textColor: TAILWIND_COLORS.infoCardValue },
            },
        });

        currentY = (doc.lastAutoTable?.finalY || currentY) + PDF_CONSTANTS.tableSpacing;
    }

    // Top Profitable Products
    if (data.topProfitableProducts && data.topProfitableProducts.length > 0) {
        currentY = ensureSpace(doc, currentY, 200, mar, "En Karlı Ürünler");
        currentY = drawProfessionalTableHeader(doc, mar, currentY, 300, {
            title: "En Karlı Ürünler",
            backgroundColor: TAILWIND_COLORS.gray50,
            textColor: PDF_CONSTANTS.primaryColor,
            borderColor: [229, 231, 235],
        });

        const productsData = data.topProfitableProducts.slice(0, 10).map((p, index) => [
            `#${index + 1}`,
            p.name,
            safeFormatCurrency(p.revenue),
            safeFormatCurrency(p.cost),
            safeFormatCurrency(p.profit)
        ]);

        const tableStyles = createProfessionalTableStyles(doc, {
            headerFontSize: 12,
            bodyFontSize: 11,
            cellPadding: { top: 12, right: 14, bottom: 12, left: 14 }
        });

        currentY = ensureTableFitsPage(doc, currentY, 200, mar, "En Karlı Ürünler");
        const tableWidth = contentWidth;

        forceRobotoFont(doc, "normal");

        autoTable(doc, {
            startY: currentY,
            head: transliterateTableData([['Sıra', 'Ürün Adı', 'Gelir', 'Gider', 'Kar']], doc),
            body: transliterateTableData(productsData, doc),
            margin: { left: mar, right: mar },
            tableWidth: tableWidth,
            willDrawCell: createWillDrawCell(doc),
            ...tableStyles,
            columnStyles: {
                0: { cellWidth: tableWidth * 0.10, halign: "center", textColor: [107, 114, 128] },
                1: { cellWidth: tableWidth * 0.30, halign: "left" },
                2: { cellWidth: tableWidth * 0.20, halign: "right", textColor: TAILWIND_COLORS.successCardValue },
                3: { cellWidth: tableWidth * 0.20, halign: "right", textColor: TAILWIND_COLORS.dangerCardValue },
                4: { cellWidth: tableWidth * 0.20, halign: "right", textColor: TAILWIND_COLORS.infoCardValue },
            },
        });

        currentY = (doc.lastAutoTable?.finalY || currentY) + PDF_CONSTANTS.tableSpacing;
    }

    // Cost Breakdown
    if (data.costBreakdown && data.costBreakdown.length > 0) {
        currentY = ensureSpace(doc, currentY, 200, mar, "Gider Kalemleri Analizi");
        currentY = drawProfessionalTableHeader(doc, mar, currentY, 300, {
            title: "Gider Kalemleri Analizi",
            backgroundColor: TAILWIND_COLORS.gray50,
            textColor: PDF_CONSTANTS.primaryColor,
            borderColor: [229, 231, 235],
        });

        const breakdownData = data.costBreakdown.map((item, index) => [
            `#${index + 1}`,
            item.category,
            safeFormatCurrency(item.amount),
            `%${item.percentage.toFixed(1)}`
        ]);

        const tableStyles = createProfessionalTableStyles(doc, {
            headerFontSize: 12,
            bodyFontSize: 11,
            cellPadding: { top: 12, right: 14, bottom: 12, left: 14 }
        });

        currentY = ensureTableFitsPage(doc, currentY, 200, mar, "Gider Kalemleri Analizi");
        const tableWidth = contentWidth;

        forceRobotoFont(doc, "normal");

        autoTable(doc, {
            startY: currentY,
            head: transliterateTableData([['Sıra', 'Gider Kalemi', 'Tutar', 'Oran']], doc),
            body: transliterateTableData(breakdownData, doc),
            margin: { left: mar, right: mar },
            tableWidth: tableWidth,
            willDrawCell: createWillDrawCell(doc),
            ...tableStyles,
            columnStyles: {
                0: { cellWidth: tableWidth * 0.10, halign: "center", textColor: [107, 114, 128] },
                1: { cellWidth: tableWidth * 0.40, halign: "left" },
                2: { cellWidth: tableWidth * 0.30, halign: "right", textColor: TAILWIND_COLORS.dangerCardValue },
                3: { cellWidth: tableWidth * 0.20, halign: "right", textColor: [107, 114, 128] },
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
