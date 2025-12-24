import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Users, Package, ShoppingCart, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { canCreateTask } from "@/utils/permissions";
import { UserProfile } from "@/services/firebase/authService";

interface QuickActionsProps {
  onCreateTask?: () => void;
  onCreateProductionOrder?: () => void;
  onCreateCustomer?: () => void;
  onCreateSalesOrder?: () => void;
}

export const QuickActions = ({
  onCreateTask,
  onCreateProductionOrder,
  onCreateCustomer,
  onCreateSalesOrder,
}: QuickActionsProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [canCreate, setCanCreate] = useState(false);
  
  // Görev oluşturma yetkisi - Firestore'dan kontrol et
  useEffect(() => {
    const checkPermission = async () => {
      if (!user) {
        setCanCreate(false);
        return;
      }
      try {
        const userProfile: UserProfile = {
          id: user.id,
          email: user.email,
          emailVerified: user.emailVerified,
          fullName: user.fullName,
          displayName: user.fullName,
          phone: null,
          dateOfBirth: null,
          role: user.roles || [],
          createdAt: null,
          updatedAt: null,
        };
        const result = await canCreateTask(userProfile, []);
        setCanCreate(result);
      } catch (error: unknown) {
        if (import.meta.env.DEV) {
          console.error("Error checking create task permission:", error);
        }
        setCanCreate(false);
      }
    };
    checkPermission();
  }, [user]);

  const handleAction = (callback: (() => void) | undefined, fallbackPath: string) => {
    if (callback) {
      callback();
    } else {
      navigate(fallbackPath);
    }
  };

  const actions = [
    // Firestore'dan kontrol: canCreate yetkisi varsa "Yeni Görev" butonu gösterilir
    ...(canCreate ? [{
      title: "Yeni Görev",
      description: "İş planına ekle",
      icon: Plus,
      onClick: () => handleAction(onCreateTask, "/tasks"),
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      hoverBg: "hover:bg-blue-100",
      borderColor: "border-blue-100",
    }]),
    {
      title: "Üretim Siparişi",
      description: "Üretim başlat",
      icon: Package,
      onClick: () => handleAction(onCreateProductionOrder, "/production"),
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      hoverBg: "hover:bg-orange-100",
      borderColor: "border-orange-100",
    },
    {
      title: "Yeni Müşteri",
      description: "Müşteri kaydı",
      icon: Users,
      onClick: () => handleAction(onCreateCustomer, "/customers"),
      color: "text-violet-600",
      bgColor: "bg-violet-50",
      hoverBg: "hover:bg-violet-100",
      borderColor: "border-violet-100",
    },
    {
      title: "Satış Siparişi",
      description: "Sipariş oluştur",
      icon: ShoppingCart,
      onClick: () => handleAction(onCreateSalesOrder, "/orders"),
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      hoverBg: "hover:bg-emerald-100",
      borderColor: "border-emerald-100",
    },
  ];

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0 pb-4">
        <CardTitle className="text-lg font-semibold text-gray-800">Hızlı İşlemler</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className={cn(
                "flex flex-col items-start p-3 sm:p-4 rounded-xl border transition-all duration-200 group text-left h-full min-h-[120px] sm:min-h-[140px]",
                "hover:shadow-md hover:-translate-y-0.5",
                "bg-white", // Kart arka planı beyaz olsun, renkler ikonlarda ve hover'da olsun
                "border-gray-200 hover:border-gray-300"
              )}
            >
              <div className={cn(
                "p-2 sm:p-2.5 rounded-lg mb-2 sm:mb-3 transition-colors",
                action.bgColor,
                action.color
              )}>
                <action.icon className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              
              <div className="space-y-0.5 sm:space-y-1 w-full">
                <h3 className="font-semibold text-gray-900 group-hover:text-primary transition-colors text-xs sm:text-sm md:text-base">
                  {action.title}
                </h3>
                <p className="text-[10px] sm:text-xs text-gray-500 font-medium">
                  {action.description}
                </p>
              </div>

              <div className="mt-auto w-full flex justify-end opacity-0 group-hover:opacity-100 transition-opacity pt-2">
                <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400" />
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
