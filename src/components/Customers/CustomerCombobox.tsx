import { useState, useEffect, useCallback, memo } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { getCustomers, Customer as FirebaseCustomer } from "@/services/firebase/customerService";
import { CreateCustomerDialog } from "./CreateCustomerDialog";
import { formatPhoneForDisplay } from "@/utils/phoneNormalizer";

interface Customer {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
}

// Firebase Customer'ı UI Customer formatına çevir
const convertFirebaseCustomerToUI = (customer: FirebaseCustomer): Customer => ({
  id: customer.id,
  name: customer.name,
  company: customer.company,
  phone: customer.phone,
  email: customer.email,
});

interface CustomerComboboxProps {
  value?: string | null;
  onChange: (customerId: string, customerName: string) => void;
  placeholder?: string;
}

export const CustomerCombobox = memo(({ value, onChange, placeholder = "Müşteri seçin..." }: CustomerComboboxProps) => {
  const [open, setOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // value'yu her zaman string'e çevir (undefined/null -> "")
  const normalizedValue = value || "";

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const firebaseCustomers = await getCustomers();
      const convertedCustomers = firebaseCustomers.map(convertFirebaseCustomerToUI);
      
      // Duplicate kontrolü - aynı ID'ye sahip müşterileri filtrele
      const uniqueCustomers = convertedCustomers.filter((customer, index, self) =>
        index === self.findIndex((c) => c.id === customer.id)
      );
      
      setCustomers(uniqueCustomers);
    } catch (error: unknown) {
      setCustomers([]);
      toast.error("Müşteriler yüklenirken hata: " + (error instanceof Error ? error.message : "Bilinmeyen hata"));
    } finally {
      setLoading(false);
    }
  }, []);

  // Component mount olduğunda müşterileri yükle
  useEffect(() => {
    fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Popover açıldığında ve müşteri yoksa yeniden yükle
  useEffect(() => {
    if (open && customers.length === 0 && !loading) {
      fetchCustomers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Popover kapandığında search query'yi temizle
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
    }
  }, [open]);

  const selectedCustomer = normalizedValue ? customers.find(c => c.id === normalizedValue) : undefined;

  const filteredCustomers = customers.filter(customer => {
    const search = searchQuery.toLowerCase();
    return (
      customer.name.toLowerCase().includes(search) ||
      customer.company?.toLowerCase().includes(search) ||
      customer.phone?.toLowerCase().includes(search) ||
      customer.email?.toLowerCase().includes(search)
    );
  });

  const handleSelect = useCallback((value: string) => {
    // CommandItem value artık direkt customer ID
    const customerId = value;
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      try {
        // Popover'ı önce kapat, sonra onChange'i çağır
        setOpen(false);
        // setTimeout ile onChange'i çağırarak popover'ın kapanmasını garantile
        setTimeout(() => {
          onChange(customerId, customer.name);
        }, 0);
      } catch (error) {
        toast.error("Müşteri seçilirken hata oluştu");
      }
    } else {
      toast.error("Müşteri bulunamadı");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customers]);

  const handleCreateSuccess = () => {
    fetchCustomers();
    setCreateDialogOpen(false);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between min-h-[44px] sm:min-h-0 h-auto py-2 sm:py-1.5"
          >
            {selectedCustomer ? (
              <span className="truncate">
                {selectedCustomer.name}
                {selectedCustomer.company && ` - ${selectedCustomer.company}`}
              </span>
            ) : (
              placeholder
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] sm:w-[400px] p-0 !max-h-[400px] !h-auto" align="start" side="bottom" sideOffset={4} onOpenAutoFocus={(e) => e.preventDefault()}>
          <Command shouldFilter={false}>
            <CommandInput 
              placeholder="Müşteri ara (ad, şirket, telefon, e-posta)..." 
              value={searchQuery}
              onValueChange={(value) => {
                setSearchQuery(value);
              }}
              className="text-sm"
            />
            <CommandList className="!max-h-[350px] !h-auto">
              <CommandEmpty>
                {loading ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    <p className="text-sm text-muted-foreground">Müşteriler yükleniyor...</p>
                  </div>
                ) : filteredCustomers.length === 0 && customers.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-6 px-4">
                    <p className="text-sm text-muted-foreground text-center">Henüz müşteri kaydı bulunmuyor</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 min-h-[44px] sm:min-h-0"
                      onClick={() => {
                        setOpen(false);
                        setCreateDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      Yeni Müşteri Ekle
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-6 px-4">
                    <p className="text-sm text-muted-foreground text-center">Arama sonucu bulunamadı</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 min-h-[44px] sm:min-h-0"
                      onClick={() => {
                        setOpen(false);
                        setCreateDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      Yeni Müşteri Ekle
                    </Button>
                  </div>
                )}
              </CommandEmpty>
              {!loading && (filteredCustomers.length > 0 || customers.length > 0) && (
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      setOpen(false);
                      setCreateDialogOpen(true);
                    }}
                    className="flex items-center gap-2 text-primary cursor-pointer min-h-[44px] sm:min-h-0 hover:bg-primary/5"
                  >
                    <Plus className="h-4 w-4 flex-shrink-0" />
                    <span className="font-medium">Yeni Müşteri Ekle</span>
                  </CommandItem>
                  {filteredCustomers.map((customer) => (
                    <CommandItem
                      key={customer.id}
                      value={customer.id}
                      onSelect={() => {
                        // Direkt customer.id kullan, selectedValue'ya güvenme
                        handleSelect(customer.id);
                      }}
                      className="cursor-pointer min-h-[44px] sm:min-h-0 hover:bg-accent transition-colors"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 flex-shrink-0 transition-opacity",
                          normalizedValue === customer.id ? "opacity-100 text-primary" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="font-medium text-sm truncate">{customer.name}</span>
                        <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                          {customer.company && (
                            <span className="truncate max-w-[200px]" title={customer.company}>
                              {customer.company}
                            </span>
                          )}
                          {customer.phone && (
                            <span className="flex-shrink-0">• {formatPhoneForDisplay(customer.phone)}</span>
                          )}
                          {customer.email && (
                            <span className="truncate max-w-[180px]" title={customer.email}>
                              • {customer.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {loading && (
                <div className="flex flex-col items-center justify-center gap-2 py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  <p className="text-sm text-muted-foreground">Müşteriler yükleniyor...</p>
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <CreateCustomerDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleCreateSuccess}
      />
    </>
  );
});

CustomerCombobox.displayName = "CustomerCombobox";
