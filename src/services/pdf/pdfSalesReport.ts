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
    calculateCardDimensions,
    ensureSpace,
    TAILWIND_COLORS,
    PDF_CONSTANTS,
    PDFTemplateLayout,
    createPDFTemplate
} from "./pdfCore";

import {
    applyPDFTemplate,
    drawStatCard,
    drawProfessionalTableHeader,
    createProfessionalTableStyles,
    drawPDFHeader,
    drawPDFFooter,
    drawPDFBackground
} from "./pdfDrawing";

import autoTable from "jspdf-autotable";

export interface SalesReportData {
    totalRevenue?: number;
    totalOrders?: number;
    activeCustomers?: number;
    avgOrderValue?: number;
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

// Güçlendirilmiş Tipografi Ayarları
const applyDocumentTypography = (doc: jsPDFWithFontStatus) => {
    doc.setLineHeightFactor(1.5);

    if (doc._robotoFontLoaded && !doc._robotoFontLoadFailed) {
        forceRobotoFont(doc, "normal");
    } else {
        doc.setFont("helvetica", "normal");
    }

    doc.setFontSize(11);
};

export const generateSalesReportPDF = async (data: SalesReportData, startDate: string, endDate: string) => {
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

    const template = applyPDFTemplate(doc, "SATIŞ RAPORU", reportDate, startDate, endDate);

    if (doc._robotoFontLoaded && !doc._robotoFontLoadFailed) {
        forceRobotoFont(doc, "normal");
    }

    let currentY = template.contentArea.startY + 5;
    const contentWidth = template.contentArea.width;
    const mar = template.contentArea.leftMargin;

    const safeText = createSafeText(doc);

    const cardDimensions = calculateCardDimensions(contentWidth, 3);
    const cardWidth = cardDimensions.width;
    const cardGap = cardDimensions.gap;
    const cardHeight = PDF_CONSTANTS.cardHeight; // Using constant from core
    let cardX = mar;

    const totalRevenue = safeNumber(data.totalRevenue);
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

    currentY += cardHeight + PDF_CONSTANTS.sectionSpacing + 5;

    if (data.orders && data.orders.length > 0) {
        currentY = ensureSpace(doc, currentY, 200, mar, "Sipariş Durumu Dağılımı");
        currentY = drawProfessionalTableHeader(doc, mar, currentY, 300, {
            title: "Sipariş Durumu Dağılımı",
            backgroundColor: TAILWIND_COLORS.gray50,
            textColor: PDF_CONSTANTS.primaryColor,
            borderColor: [229, 231, 235],
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

        const statusTableData = Array.from(statusMap.entries())
            .sort((a, b) => b[1].count - a[1].count)
            .map(([status, data]) => [
                statusLabels[status] || status,
                data.count.toString(),
                safeFormatCurrency(data.total),
                totalOrders > 0 ? `${((data.count / totalOrders) * 100).toFixed(1)}%` : "0%"
            ]);

        const tableStyles = createProfessionalTableStyles(doc, {
            headerFontSize: 12,
            bodyFontSize: 11,
            cellPadding: { top: 12, right: 14, bottom: 12, left: 14 }
        });
        tableStyles.bodyStyles.overflow = 'linebreak';
        tableStyles.styles.overflow = 'linebreak';

        currentY = ensureTableFitsPage(doc, currentY, 200, mar, "Sipariş Durumu Dağılımı");

        const currentPageWidth = doc.internal.pageSize.getWidth();
        const tableWidth = currentPageWidth - (mar * 2);

        forceRobotoFont(doc, "normal");

        autoTable(doc, {
            startY: currentY,
            head: transliterateTableData([['Durum', 'Sipariş Sayısı', 'Toplam Tutar', 'Oran']], doc),
            body: transliterateTableData(statusTableData, doc),
            margin: { left: mar, right: mar },
            tableWidth: tableWidth,
            willDrawCell: createWillDrawCell(doc),
            ...tableStyles,
            columnStyles: {
                0: { cellWidth: tableWidth * 0.35, halign: "center", overflow: 'linebreak', fontStyle: "normal" },
                1: { cellWidth: tableWidth * 0.20, halign: "center", fontStyle: "bold" },
                2: { cellWidth: tableWidth * 0.25, halign: "center", fontStyle: "bold", textColor: PDF_CONSTANTS.primaryColor },
                3: { cellWidth: tableWidth * 0.20, halign: "center", fontStyle: "bold", textColor: [107, 114, 128] },
            },
        });

        const tableEndY = doc.lastAutoTable?.finalY;
        if (tableEndY && tableEndY > currentY) {
            currentY = tableEndY + PDF_CONSTANTS.tableSpacing;
        } else {
            currentY += PDF_CONSTANTS.tableSpacing;
        }
    }

    if (data.topProducts && data.topProducts.length > 0) {
        currentY = ensureSpace(doc, currentY, 200, mar, "En Çok Satan Ürünler");
        currentY = drawProfessionalTableHeader(doc, mar, currentY, 300, {
            title: "En Çok Satan Ürünler",
            backgroundColor: TAILWIND_COLORS.gray50,
            textColor: PDF_CONSTANTS.primaryColor,
            borderColor: [229, 231, 235],
        });

        const topProductsData = data.topProducts?.slice(0, 10).map((p, index: number) => [
            `#${index + 1}`,
            p.name || '-',
            safeNumber(p.quantity).toString(),
            safeFormatCurrency(safeNumber(p.revenue))
        ]) || [];

        const tableStyles2 = createProfessionalTableStyles(doc, {
            headerFontSize: 12,
            bodyFontSize: 11,
            cellPadding: { top: 12, right: 14, bottom: 12, left: 14 }
        });
        tableStyles2.bodyStyles.overflow = 'linebreak';
        tableStyles2.styles.overflow = 'linebreak';

        currentY = ensureTableFitsPage(doc, currentY, 200, mar, "En Çok Satan Ürünler");

        const currentPageWidth2 = doc.internal.pageSize.getWidth();
        const tableWidth2 = currentPageWidth2 - (mar * 2);

        forceRobotoFont(doc, "normal");

        autoTable(doc, {
            startY: currentY,
            head: transliterateTableData([['Sıra', 'Ürün Adı', 'Adet', 'Gelir']], doc),
            body: transliterateTableData(topProductsData, doc),
            margin: { left: mar, right: mar },
            tableWidth: tableWidth2,
            willDrawCell: createWillDrawCell(doc),
            ...tableStyles2,
            columnStyles: {
                0: { cellWidth: tableWidth2 * 0.10, halign: "center", fontStyle: "normal", textColor: [107, 114, 128] },
                1: { cellWidth: tableWidth2 * 0.50, halign: "center", fontStyle: "normal", overflow: 'linebreak' },
                2: { cellWidth: tableWidth2 * 0.15, halign: "center", fontStyle: "bold" },
                3: { cellWidth: tableWidth2 * 0.25, halign: "center", fontStyle: "bold", textColor: PDF_CONSTANTS.primaryColor },
            },
        });

        const tableEndY2 = doc.lastAutoTable?.finalY;
        if (tableEndY2 && tableEndY2 > currentY) {
            currentY = tableEndY2 + PDF_CONSTANTS.tableSpacing;
        } else {
            currentY += PDF_CONSTANTS.tableSpacing;
        }
    }

    try {
        const totalPages = doc.internal.pages.length - 1;
        if (totalPages > 0) {
            for (let i = 1; i <= totalPages; i++) {
                try {
                    doc.setPage(i);
                    const pageTemplate = createPDFTemplate(doc);
                    drawPDFFooter(doc, pageTemplate, i, totalPages);
                } catch (pageError) {
                    // ignore
                }
            }
        }
    } catch (footerError) {
        // ignore
    }

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
