/**
 * PDF Services - Barrel Export
 * Centralized exports for all PDF-related utilities
 */

// Core exports
export {
    // Constants
    COMPANY_INFO,
    PDF_CONSTANTS,
    TAILWIND_COLORS,
    REV_LOGO_DATA_URI,

    // Types
    type PDFTemplateLayout,
    type StatCardConfig,
    type TableHeaderConfig,
    type TotalsSummary,
    type ProfessionalTableStyles,
    type jsPDFWithFontStatus,

    // Core utilities
    transliterateTurkish,
    transliterateTableData,
    createPDFTemplate,
    calculateCardDimensions,
    formatCurrency,
    safeNumber,
    safeFormatCurrency,
    formatDate,
    formatDateShort,
    createPdf,
    ensureSpace,
} from "./pdfCore";

// Drawing exports
export {
    drawPDFBackground,
    drawStatCard,
    drawProfessionalTableHeader,
    createProfessionalTableStyles,
    drawPDFHeader,
    drawPDFFooter,
    applyPDFTemplate,
    applyPDFTemplateToNewPage,
    drawSummarySection,
    drawInfoCard,
    drawTermsBlock,
    drawSummaryBlock,
} from "./pdfDrawing";

// Report generators
export { generateProductionReportPDF, type ProductionReportData } from "./pdfProductionReport";
export { generateUserStatsPDF, type UserStatsReportData } from "./pdfUserStats";
export { generateSalesReportPDF, type SalesReportData } from "./pdfSalesReport";

export { generateSalesOfferPDF, type SalesOfferPayload } from "./pdfSalesOffer";
export { generateFinancialReportPDF, type FinancialReportData } from "./pdfFinancialReport";
export { generateCustomerReportPDF, type CustomerReportData } from "./pdfCustomerReport";

