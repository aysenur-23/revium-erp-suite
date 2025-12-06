import { useState, useEffect } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, TrendingUp, Package, Users, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SalesReportDialog } from "@/components/Reports/SalesReportDialog";
import { ProductionReportDialog } from "@/components/Reports/ProductionReportDialog";
import { CustomerReportDialog } from "@/components/Reports/CustomerReportDialog";
import { FinancialReportDialog } from "@/components/Reports/FinancialReportDialog";
import { SalesQuoteForm } from "@/components/Reports/SalesQuoteForm";
// apiClient moved to legacy_before_firebase_migration
// Reports should use Firebase services
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const Reports = () => {
  const { user } = useAuth();
  const [salesDialogOpen, setSalesDialogOpen] = useState(false);
  const [productionDialogOpen, setProductionDialogOpen] = useState(false);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [financialDialogOpen, setFinancialDialogOpen] = useState(false);
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  const [savedReports, setSavedReports] = useState<any[]>([]);
  const [reportsIndexLink, setReportsIndexLink] = useState<string | null>(null);
  const [auditIndexLink, setAuditIndexLink] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchSavedReports();
    }
  }, [user]);

  const parseIndexLink = (message?: string) => {
    if (!message) return null;
    const match = message.match(/https:\/\/[^\s]+/);
    return match ? match[0] : null;
  };

  const fetchSavedReports = async () => {
    try {
      const { getSavedReports } = await import("@/services/firebase/reportService");
      const reports = await getSavedReports({ createdBy: user?.id });
      setSavedReports(reports);
      setReportsIndexLink(null);
    } catch (error: any) {
      console.error("Fetch saved reports error:", error);
      const link = parseIndexLink(error?.message);
      if (link) {
        setReportsIndexLink(link);
        toast.warning("Raporlar için Firestore index’i oluşturmanız gerekiyor.");
      }
      // Hata durumunda boş array bırak
      setSavedReports([]);
    }
  };

  const downloadReport = async (report: any) => {
    setDownloading(report.id);
    try {
      if (report.fileUrl) {
        // Firebase Storage'dan indirme
        const a = document.createElement("a");
        a.href = report.fileUrl;
        a.download = report.fileName || `rapor-${report.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success("Rapor indiriliyor...");
      } else {
        toast.error("Rapor dosyası bulunamadı");
      }
    } catch (error: any) {
      console.error("Download report error:", error);
      toast.error(error.message || "Rapor indirilemedi");
    } finally {
      setDownloading(null);
    }
  };

  const getReportTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      sales: "Satış",
      production: "Üretim",
      customer: "Müşteri",
      financial: "Mali"
    };
    return labels[type] || type;
  };

  const reportTypes = [
    {
      icon: TrendingUp,
      title: "Satış Raporu",
      description: "Günlük, haftalık ve aylık satış analizleri",
      color: "primary",
      onClick: () => setSalesDialogOpen(true)
    },
    {
      icon: FileText,
      title: "Satış Teklifi",
      description: "Teklif formunu düzenleyip PDF olarak indir",
      color: "default",
      onClick: () => setQuoteDialogOpen(true)
    },
    {
      icon: Package,
      title: "Üretim Raporu",
      description: "Üretim süreçleri ve tamamlanma oranları",
      color: "success",
      onClick: () => setProductionDialogOpen(true)
    },
    {
      icon: Users,
      title: "Müşteri Raporu",
      description: "Müşteri analizleri ve davranış raporları",
      color: "info",
      onClick: () => setCustomerDialogOpen(true)
    },
    {
      icon: FileText,
      title: "Mali Rapor",
      description: "Gelir-gider ve kar-zarar analizi",
      color: "warning",
      onClick: () => setFinancialDialogOpen(true)
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-3 sm:space-y-4 md:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Raporlar</h1>
          <p className="text-muted-foreground mt-0.5 sm:mt-1 text-xs sm:text-sm">İş analizleri ve raporlama</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
          {reportTypes.map((report, index) => (
            <Card key={index} className="hover:shadow-lg transition-all duration-300 cursor-pointer touch-manipulation min-h-[44px]" onClick={report.onClick}>
              <CardHeader className="p-3 sm:p-4 md:p-6">
                <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
                  <div className="p-2 sm:p-2.5 md:p-3 rounded-lg bg-primary/10 flex-shrink-0">
                    <report.icon className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-primary" />
                  </div>
                  <CardTitle className="text-sm sm:text-base md:text-lg">{report.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
                <p className="text-muted-foreground mb-2 sm:mb-3 md:mb-4 text-xs sm:text-sm md:text-base">{report.description}</p>
                <Button
                  className="w-full sm:w-auto min-h-[44px] sm:min-h-10 text-xs sm:text-sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    report.onClick();
                  }}
                >
                  Rapor Oluştur
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <SalesReportDialog open={salesDialogOpen} onOpenChange={(open) => { setSalesDialogOpen(open); if (!open) fetchSavedReports(); }} />
        <ProductionReportDialog open={productionDialogOpen} onOpenChange={(open) => { setProductionDialogOpen(open); if (!open) fetchSavedReports(); }} />
        <CustomerReportDialog open={customerDialogOpen} onOpenChange={(open) => { setCustomerDialogOpen(open); if (!open) fetchSavedReports(); }} />
        <FinancialReportDialog open={financialDialogOpen} onOpenChange={(open) => { setFinancialDialogOpen(open); if (!open) fetchSavedReports(); }} />
        <SalesQuoteForm open={quoteDialogOpen} onOpenChange={setQuoteDialogOpen} />

        {reportsIndexLink && (
          <div className="rounded-lg border border-amber-500 bg-amber-50 p-4 text-sm text-amber-900 space-y-2">
            <div className="font-semibold">Firestore index gerekli</div>
            <p>
              Kayıtlı raporları görebilmek için Firestore’da aşağıdaki linkteki index’i oluşturup “Active”
              olmasını beklemelisiniz:
            </p>
            <a
              href={reportsIndexLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-amber-900 font-medium underline"
            >
              Index’i aç
              <Download className="h-4 w-4" />
            </a>
            <p className="text-xs text-amber-800">
              Index “building” durumundan “active” olana kadar birkaç dakika sürebilir. Tamamlandıktan sonra liste
              otomatik olarak çalışacaktır.
            </p>
          </div>
        )}

        <Card>
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="text-base sm:text-lg md:text-xl">Son Oluşturulan Raporlar</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6">
            {savedReports.length === 0 ? (
              <p className="text-muted-foreground text-center py-6 sm:py-8 text-xs sm:text-sm md:text-base">Henüz rapor oluşturulmamış</p>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {savedReports.map((report) => (
                  <div
                    key={report.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs sm:text-sm md:text-base truncate">{report.title}</p>
                        <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">
                          {getReportTypeLabel(report.reportType)} • {report.createdAt 
                            ? (report.createdAt instanceof Date 
                                ? report.createdAt 
                                : (report.createdAt as any)?.toDate?.() || new Date()
                              ).toLocaleDateString('tr-TR')
                            : '-'}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-8 sm:h-9 text-xs sm:text-sm w-full sm:w-auto"
                      onClick={() => downloadReport(report)}
                      disabled={downloading === report.id}
                    >
                      <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
                      <span className="hidden sm:inline">{downloading === report.id ? "İndiriliyor..." : "İndir"}</span>
                      <span className="sm:hidden">{downloading === report.id ? "..." : "İndir"}</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Reports;
