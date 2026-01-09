import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
    createPdf,
    registerFonts,
    formatDate,
    TAILWIND_COLORS,
    createSafeText,
    isRobotoName,
    jsPDFWithFontStatus,
    transliterateTurkish,
    transliterateTableData,
    safeSetFont,
    createWillDrawCell,
    createPDFTemplate
} from "./pdfCore";

import {
    applyPDFTemplate,
    drawPDFFooter,
    createProfessionalTableStyles,
    drawPDFBackground as applyPDFBackground
} from "./pdfDrawing";

/**
 * Kullanıcı istatistikleri PDF'i oluştur
 */
export interface UserStatsReportData {
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
        const pageTemplate = createPDFTemplate(doc);
        applyPDFBackground(doc, pageTemplate);
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
        head: transliterateTableData([detailedStats[0]], doc),
        body: transliterateTableData(detailedStats.slice(1), doc),
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
            const pageTemplate = createPDFTemplate(doc);
            applyPDFBackground(doc, pageTemplate);
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
                    : "-"
            ];
        });

        // Görev listesi için stiller
        const assignmentTableStyles = createProfessionalTableStyles(doc, {
            headerFontSize: 11,
            bodyFontSize: 10,
            cellPadding: { top: 10, right: 12, bottom: 10, left: 12 }
        });
        assignmentTableStyles.headStyles.fillColor = [243, 244, 246];
        assignmentTableStyles.headStyles.textColor = [31, 41, 55];
        assignmentTableStyles.headStyles.halign = "left";
        assignmentTableStyles.bodyStyles.valign = "middle";

        autoTable(doc, {
            startY: yPos,
            head: transliterateTableData([['Görev', 'Durum', 'Başlangıç', 'Bitiş']], doc),
            body: transliterateTableData(assignmentRows, doc),
            willDrawCell: createWillDrawCell(doc),
            margin: { left: mar, right: mar },
            tableWidth: detailedTableWidth,
            ...assignmentTableStyles,
            columnStyles: {
                0: { cellWidth: detailedTableWidth * 0.40, halign: "left" },
                1: { cellWidth: detailedTableWidth * 0.20, halign: "left" },
                2: { cellWidth: detailedTableWidth * 0.20, halign: "center" },
                3: { cellWidth: detailedTableWidth * 0.20, halign: "center" },
            },
        });
    }

    // Sayfa numaralarını ekle
    try {
        const totalPages = doc.internal.pages.length - 1;
        if (totalPages > 0) {
            for (let i = 1; i <= totalPages; i++) {
                try {
                    doc.setPage(i);
                    const pageTemplate = createPDFTemplate(doc);
                    drawPDFFooter(doc, pageTemplate, i, totalPages);
                } catch (pageError) {
                    // Devam et
                }
            }
        }
    } catch (footerError) {
        // Footer hatası kritik değil
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
