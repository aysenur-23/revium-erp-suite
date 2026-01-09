import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
    createPdf,
    registerFonts,
    formatDate,
    PDF_CONSTANTS,
    TAILWIND_COLORS,
    createSafeText,
    createPDFTemplate,
    calculateCardDimensions,
    safeNumber,
    ensureSpace,
    isRobotoName,
    jsPDFWithFontStatus,
    PDFTemplateLayout,
    transliterateTurkish,
    transliterateTableData,
    forceRobotoFont,
    safeSetFont,
    createWillDrawCell
} from "./pdfCore";

import {
    applyPDFTemplate,
    drawStatCard,
    drawProfessionalTableHeader,
    drawPDFBackground,
    drawSummarySection,
    drawPDFFooter,
    createProfessionalTableStyles
} from "./pdfDrawing";

// Types derived from the component
export type ProductionStatus = "planned" | "in_production" | "quality_check" | "completed" | "on_hold";
export type StatusDistribution = Record<ProductionStatus, number>;

export interface ProductProductionStat {
    name: string;
    quantity: number;
    orders: number;
}

export interface ProductionReportData {
    totalOrders: number;
    completed: number;
    completionRate: number;
    statusDistribution: StatusDistribution;
    topProducts: ProductProductionStat[];
}



const ensureTableFitsPage = (
    doc: jsPDFWithFontStatus,
    currentY: number,
    requiredHeight: number,
    margin: number = 40,
    titleForNextPage?: string
): number => {
    const pageHeight = doc.internal.pageSize.getHeight();
    const footerHeight = PDF_CONSTANTS.footerHeight;
    const minSpaceNeeded = requiredHeight + 70;

    if (currentY + minSpaceNeeded > pageHeight - footerHeight - margin) {
        doc.addPage();
        let nextY = margin + 30;
        const template = createPDFTemplate(doc);
        drawPDFBackground(doc, template);
        return nextY;
    }
    return currentY;
};


export const generateProductionReportPDF = async (data: ProductionReportData, startDate: string, endDate: string) => {
    const doc = createPdf({ format: "a4", unit: "pt" });

    try {
        await registerFonts(doc);
    } catch (fontError) {
        console.warn("Font yüklenirken hata oluştu:", fontError);
    }

    if (!doc._robotoFontLoaded || doc._robotoFontLoadFailed) {
        // Retry logic could be here
    }

    if (doc._robotoFontLoaded && !doc._robotoFontLoadFailed) {
        forceRobotoFont(doc, "normal");
    }

    const reportDate = formatDate(new Date().toISOString());

    const template = applyPDFTemplate(doc, "ÜRETİM RAPORU", reportDate, startDate, endDate);

    if (doc._robotoFontLoaded && !doc._robotoFontLoadFailed) {
        forceRobotoFont(doc, "normal");
    }

    let currentY = template.contentArea.startY;
    const contentWidth = template.contentArea.width;
    const mar = template.contentArea.leftMargin;

    const cardWidth = (contentWidth - 32) / 3;
    const cardHeight = 110;
    const cardGap = 16;
    let cardX = mar;

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

    currentY += cardHeight + PDF_CONSTANTS.sectionSpacing;

    if (data.statusDistribution) {
        currentY = ensureSpace(doc, currentY, 200, mar, "Durum Dağılımı");
        currentY = drawProfessionalTableHeader(doc, mar, currentY, 250, {
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

        const tableStyles = createProfessionalTableStyles(doc, {
            headerFontSize: 12,
            bodyFontSize: 11,
            cellPadding: { top: 12, right: 14, bottom: 12, left: 14 }
        });
        tableStyles.headStyles.fillColor = PDF_CONSTANTS.primaryColor;
        tableStyles.headStyles.textColor = [255, 255, 255];
        tableStyles.headStyles.halign = "center" as const;
        tableStyles.bodyStyles.overflow = 'linebreak';
        tableStyles.styles.overflow = 'linebreak';

        currentY = ensureTableFitsPage(doc, currentY, 200, mar, "Durum Dağılımı");
        const currentPageWidth = doc.internal.pageSize.getWidth();
        const tableWidth = currentPageWidth - (mar * 2);

        forceRobotoFont(doc, "normal");

        autoTable(doc, {
            startY: currentY,
            head: transliterateTableData([['Durum', 'Sipariş Sayısı', 'Oran']], doc),
            body: transliterateTableData(statusData, doc),
            margin: { left: mar, right: mar },
            tableWidth: tableWidth,
            willDrawCell: createWillDrawCell(doc),
            ...tableStyles,
            columnStyles: {
                0: { cellWidth: tableWidth * 0.50, halign: "left", overflow: 'linebreak' },
                1: { cellWidth: tableWidth * 0.25, halign: "right", fontStyle: "bold" },
                2: { cellWidth: tableWidth * 0.25, halign: "right", fontStyle: "bold", textColor: [107, 114, 128] },
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
        const pageWidthProd = doc.internal.pageSize.getWidth();
        const tableWidthProd = pageWidthProd - (mar * 2);

        currentY = ensureSpace(doc, currentY, 200, mar, "En Çok Üretilen Ürünler");
        currentY = drawProfessionalTableHeader(doc, mar, currentY, tableWidthProd, {
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

        const totalQuantity = data.topProducts?.slice(0, 10).reduce((sum: number, p) => sum + safeNumber(p.quantity), 0) || 0;
        const totalOrdersProd = data.topProducts?.slice(0, 10).reduce((sum: number, p) => sum + safeNumber(p.orders), 0) || 0;
        topProductsData.push([
            'TOPLAM',
            '',
            totalQuantity.toString(),
            totalOrdersProd.toString()
        ]);

        const tableStyles2 = createProfessionalTableStyles(doc, {
            headerFontSize: 12,
            bodyFontSize: 11,
            cellPadding: { top: 12, right: 14, bottom: 12, left: 14 }
        });
        tableStyles2.headStyles.fillColor = [59, 130, 246];
        tableStyles2.headStyles.textColor = [255, 255, 255];
        tableStyles2.headStyles.halign = "center" as const;
        tableStyles2.bodyStyles.overflow = 'linebreak';
        tableStyles2.styles.overflow = 'linebreak';

        currentY = ensureTableFitsPage(doc, currentY, 200, mar, "En Çok Üretilen Ürünler");
        const currentPageWidth2 = doc.internal.pageSize.getWidth();
        const tableWidth2 = currentPageWidth2 - (mar * 2);

        forceRobotoFont(doc, "normal");

        autoTable(doc, {
            startY: currentY,
            head: transliterateTableData([['Sıra', 'Ürün Adı', 'Miktar', 'Sipariş Sayısı']], doc),
            body: transliterateTableData(topProductsData, doc),
            margin: { left: mar, right: mar },
            tableWidth: tableWidth2,
            willDrawCell: createWillDrawCell(doc),
            ...tableStyles2,
            columnStyles: {
                0: { cellWidth: tableWidth2 * 0.10, halign: "left", textColor: [107, 114, 128] },
                1: { cellWidth: tableWidth2 * 0.50, halign: "left", overflow: 'linebreak' },
                2: { cellWidth: tableWidth2 * 0.20, halign: "right", fontStyle: "bold" },
                3: { cellWidth: tableWidth2 * 0.20, halign: "right", fontStyle: "bold" },
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

        const pageWidth3 = doc.internal.pageSize.getWidth();
        const tableWidth3 = pageWidth3 - (mar * 2);

        currentY = ensureSpace(doc, currentY, 200, mar, "Ürün Bazlı Üretim Verimliliği");
        currentY = drawProfessionalTableHeader(doc, mar, currentY, tableWidth3, {
            title: "Ürün Bazlı Üretim Verimliliği",
            backgroundColor: [249, 250, 251],
            textColor: PDF_CONSTANTS.primaryColor,
            borderColor: PDF_CONSTANTS.primaryColor,
        });

        const tableStyles3 = createProfessionalTableStyles(doc, {
            headerFontSize: 12,
            bodyFontSize: 11,
            cellPadding: { top: 12, right: 14, bottom: 12, left: 14 }
        });
        tableStyles3.headStyles.fillColor = [59, 130, 246];
        tableStyles3.headStyles.textColor = [255, 255, 255];
        tableStyles3.headStyles.halign = "center" as const;
        tableStyles3.bodyStyles.overflow = 'linebreak';
        tableStyles3.styles.overflow = 'linebreak';

        currentY = ensureTableFitsPage(doc, currentY, 200, mar, "Ürün Bazlı Üretim Verimliliği");
        const currentPageWidth3 = doc.internal.pageSize.getWidth();
        const currentTableWidth3 = currentPageWidth3 - (mar * 2);

        autoTable(doc, {
            startY: currentY,
            head: transliterateTableData([['Sıra', 'Ürün', 'Toplam Miktar', 'Sipariş', 'Ortalama/Sipariş']], doc),
            body: transliterateTableData(efficiencyData, doc),
            margin: { left: mar, right: mar },
            tableWidth: currentTableWidth3,
            willDrawCell: createWillDrawCell(doc),
            ...tableStyles3,
            columnStyles: {
                0: { cellWidth: currentTableWidth3 * 0.08, halign: "left", textColor: [107, 114, 128] },
                1: { cellWidth: currentTableWidth3 * 0.40, halign: "left", overflow: 'linebreak' },
                2: { cellWidth: currentTableWidth3 * 0.18, halign: "right", fontStyle: "bold" },
                3: { cellWidth: currentTableWidth3 * 0.15, halign: "right", fontStyle: "bold" },
                4: { cellWidth: currentTableWidth3 * 0.19, halign: "right", textColor: [107, 114, 128] },
            },
        });

        const tableEndY = doc.lastAutoTable?.finalY;
        if (tableEndY && tableEndY > currentY) {
            currentY = tableEndY + PDF_CONSTANTS.tableSpacing;
        } else {
            currentY += PDF_CONSTANTS.tableSpacing;
        }
    }

    currentY = (doc.lastAutoTable?.finalY || currentY) + 50;
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
