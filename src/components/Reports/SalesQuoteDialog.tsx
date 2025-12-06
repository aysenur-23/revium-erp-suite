import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Download, X, Save } from "lucide-react";
import { generateSalesOfferPDF } from "@/services/pdfGenerator";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const currencySymbols = ["₺", "$", "€"];

interface QuoteItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface SalesQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const defaultItems: QuoteItem[] = [
  { description: "", quantity: 1, unitPrice: 0 },
];

export const SalesQuoteDialog = ({ open, onOpenChange }: SalesQuoteDialogProps) => {
  const today = new Date().toISOString().slice(0, 10);
  const { user } = useAuth();

  const [quote, setQuote] = useState({
    quoteNumber: `REV-${new Date().getFullYear()}${new Date().getMonth() + 1}`,
    quoteDate: today,
    validUntil: today,
    customerName: "",
    customerCompany: "",
    projectName: "",
    deliveryTerms: "Ürünlerimiz stoklara bağlı olarak sevk edilir.",
    paymentTerms: "Ödeme peşin veya anlaşmaya göre yapılacaktır.",
    notes: "Fiyatlarımıza KDV dahil değildir. Teklif 7 gün geçerlidir.",
    currency: "₺",
    taxRate: 20,
    discountRate: 0,
    items: defaultItems,
  });

  const totals = useMemo(() => {
    const subtotal = (Array.isArray(quote.items) ? quote.items : []).reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const discount = subtotal * (quote.discountRate / 100);
    const taxedBase = subtotal - discount;
    const tax = taxedBase * (quote.taxRate / 100);
    const grandTotal = taxedBase + tax;
    return {
      subtotal,
      discount,
      tax,
      grandTotal,
    };
  }, [quote]);

  const handleItemChange = (index: number, field: keyof QuoteItem, value: string) => {
    setQuote((prev) => {
      const nextItems = [...prev.items];
      const parsedValue = field === "description" ? value : Number(value) || 0;
      nextItems[index] = {
        ...nextItems[index],
        [field]: parsedValue,
      };
      return { ...prev, items: nextItems };
    });
  };

  const addRow = () => {
    setQuote((prev) => ({ ...prev, items: [...prev.items, { description: "", quantity: 1, unitPrice: 0 }] }));
  };

  const removeRow = (index: number) => {
    setQuote((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleDownload = async () => {
    if (!quote.customerName) {
      toast.error("Lütfen müşteri bilgisini girin.");
      return;
    }

    try {
      const blob = await generateSalesOfferPDF({
        ...quote,
        totals,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${quote.customerCompany || "teklif"}-${quote.quoteNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Teklif PDF hazırlandı");

      try {
        const { saveReport } = await import("@/services/firebase/reportService");
        await saveReport("sales_quote", `Teklif ${quote.quoteNumber}`, blob, user?.id || "anonymous", {
          metadata: {
            customerName: quote.customerCompany || quote.customerName || "Bilinmiyor",
            currency: quote.currency,
            grandTotal: Number(totals.grandTotal) || 0,
            subtotal: Number(totals.subtotal) || 0,
            tax: Number(totals.tax) || 0,
            discount: Number(totals.discount) || 0,
          },
        });
      } catch (reportError) {
        console.warn("Teklif raporu kaydedilemedi:", reportError);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Bilinmeyen hata";
      toast.error("PDF oluşturulamadı: " + message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[100vw] sm:!max-w-[95vw] !w-[100vw] sm:!w-[95vw] !h-[100vh] sm:!h-[90vh] !max-h-[100vh] sm:!max-h-[90vh] !left-0 sm:!left-[2.5vw] !top-0 sm:!top-[5vh] !right-0 sm:!right-auto !bottom-0 sm:!bottom-auto !translate-x-0 !translate-y-0 overflow-hidden !p-0 gap-0 bg-white flex flex-col !m-0 !rounded-none sm:!rounded-lg !border-0 sm:!border">
        <div className="flex flex-col h-full min-h-0">
          {/* Header */}
          <DialogHeader className="p-3 sm:p-4 border-b bg-white flex-shrink-0 relative pr-12 sm:pr-16">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 flex-shrink-0">
                  <Download className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <DialogTitle className="text-lg sm:text-xl font-semibold text-foreground truncate">
                  Satış Teklifi Oluştur
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Satış teklifi oluşturun
                </DialogDescription>
              </div>
              <div className="flex flex-wrap gap-2 flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-primary/20 hover:bg-primary/5 rounded-lg px-3 py-1.5 font-medium text-xs sm:text-sm flex-shrink-0"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 flex-shrink-0" />
                  İptal
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="bg-primary hover:bg-primary/90 rounded-lg px-3 py-1.5 font-medium text-xs sm:text-sm flex-shrink-0 text-white"
                  onClick={handleDownload}
                >
                  <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 flex-shrink-0" />
                  PDF İndir
                </Button>
              </div>
            </div>
          </DialogHeader>
        
          {/* Content */}
          <div className="flex-1 overflow-hidden bg-gray-50/50 p-3 sm:p-4 min-h-0">
            <div className="max-w-full mx-auto h-full overflow-y-auto">
              <Card>
                <CardContent className="pt-6">
                  <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div>
              <Label>Teklif No</Label>
              <Input
                value={quote.quoteNumber}
                onChange={(e) => setQuote((prev) => ({ ...prev, quoteNumber: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Teklif Tarihi</Label>
                <Input
                  type="date"
                  value={quote.quoteDate}
                  onChange={(e) => setQuote((prev) => ({ ...prev, quoteDate: e.target.value }))}
                />
              </div>
              <div>
                <Label>Geçerlilik Tarihi</Label>
                <Input
                  type="date"
                  value={quote.validUntil}
                  onChange={(e) => setQuote((prev) => ({ ...prev, validUntil: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label>Müşteri / Firma</Label>
              <Input
                placeholder="Örn. Rumitech Enerji"
                value={quote.customerCompany}
                onChange={(e) => setQuote((prev) => ({ ...prev, customerCompany: e.target.value }))}
              />
            </div>
            <div>
              <Label>İlgili Kişi / Proje Adı</Label>
              <Input
                placeholder="İlgili kişi"
                value={quote.customerName}
                onChange={(e) => setQuote((prev) => ({ ...prev, customerName: e.target.value }))}
              />
            </div>
            <div>
              <Label>Proje / Ürün Notları</Label>
              <Textarea
                rows={2}
                value={quote.projectName}
                onChange={(e) => setQuote((prev) => ({ ...prev, projectName: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Para Birimi</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={quote.currency}
                  onChange={(e) => setQuote((prev) => ({ ...prev, currency: e.target.value }))}
                >
                  {currencySymbols.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>İskonto (%)</Label>
                <Input
                  type="number"
                  min="0"
                  value={quote.discountRate}
                  onChange={(e) => setQuote((prev) => ({ ...prev, discountRate: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>KDV (%)</Label>
                <Input
                  type="number"
                  min="0"
                  value={quote.taxRate}
                  onChange={(e) => setQuote((prev) => ({ ...prev, taxRate: Number(e.target.value) }))}
                />
              </div>
              <div>
                <Label>Teslimat / Termin</Label>
                <Input
                  value={quote.deliveryTerms}
                  onChange={(e) => setQuote((prev) => ({ ...prev, deliveryTerms: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label>Ödeme Koşulları</Label>
              <Input
                value={quote.paymentTerms}
                onChange={(e) => setQuote((prev) => ({ ...prev, paymentTerms: e.target.value }))}
              />
            </div>
            <div>
              <Label>Notlar</Label>
              <Textarea
                rows={3}
                value={quote.notes}
                onChange={(e) => setQuote((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Ürün Kalemleri</Label>
              <Button type="button" variant="outline" size="sm" onClick={addRow}>
                <Plus className="h-4 w-4 mr-2" />
                Satır Ekle
              </Button>
            </div>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {(Array.isArray(quote.items) ? quote.items : []).map((item, index) => (
                <Card key={index} className="p-3">
                  <div className="flex justify-between gap-2">
                    <div className="flex-1">
                      <Label className="text-xs">Ürün / Hizmet</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => handleItemChange(index, "description", e.target.value)}
                        placeholder="Ürün adı"
                      />
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeRow(index)}
                      disabled={quote.items.length === 1}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <Label className="text-xs">Adet</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Birim Fiyat</Label>
                      <Input
                        type="number"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(index, "unitPrice", e.target.value)}
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="rounded-lg border bg-gradient-to-br from-slate-50 to-white p-4 shadow-inner">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Ara Toplam</span>
                <span>
                  {quote.currency}
                  {(totals.subtotal || 0).toFixed(2)}
                </span>
              </div>
              {quote.discountRate > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>İskonto ({quote.discountRate}%)</span>
                  <span>-{quote.currency}
                    {(totals.discount || 0).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>KDV ({quote.taxRate}%)</span>
                <span>
                  {quote.currency}
                  {(totals.tax || 0).toFixed(2)}
                </span>
              </div>
              <div className="mt-2 flex justify-between text-base font-semibold">
                <span>Genel Toplam</span>
                <span>
                  {quote.currency}
                  {(totals.grandTotal || 0).toFixed(2)}
                </span>
              </div>
            </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

