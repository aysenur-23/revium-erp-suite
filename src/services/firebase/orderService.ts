/**
 * Firebase Order Service
 * Sipariş yönetimi işlemleri
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  Unsubscribe,
  QueryConstraint,
  FieldValue,
<<<<<<< HEAD
  writeBatch,
=======
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
} from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { logAudit } from "@/utils/auditLogger";

export interface OrderItem {
  id: string;
  productId?: string | null;
  product_id?: string | null; // Alias
  productName?: string | null;
  product_name?: string | null; // Alias
  quantity: number;
  unitPrice: number;
  unit_price?: number; // Alias
  discount?: number;
  discountType?: "amount" | "percentage"; // İndirim tipi: tutar veya yüzde
  total: number;
  category?: string | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  order_number?: string; // Alias
  customerId?: string | null;
  customer_id?: string | null; // Alias
  customerName?: string | null;
  customer_name?: string | null; // Alias
  customerCompany?: string | null;
  customer_company?: string | null; // Alias
  status: "draft" | "pending" | "confirmed" | "planned" | "in_production" | "quality_check" | "completed" | "shipped" | "delivered" | "cancelled" | "on_hold";
  approvalStatus?: "pending" | "approved" | "rejected";
  approvalRequestedBy?: string;
  approvalRequestedAt?: Timestamp;
  approvedBy?: string;
  approvedAt?: Timestamp;
  rejectedBy?: string;
  rejectedAt?: Timestamp;
  rejectionReason?: string;
  statusUpdatedBy?: string;
  statusUpdatedAt?: Timestamp;
  subtotal?: number;
  taxAmount?: number;
  discountTotal?: number;
  itemsCount?: number;
  totalQuantity?: number;
  totalAmount?: number;
  total_amount?: number; // Alias
  taxRate?: number;
  tax_rate?: number; // Alias
  items_count?: number; // Alias
  total_quantity?: number; // Alias
  currency?: string;
  orderDate?: Timestamp | null;
  order_date?: string | null; // Alias (string format)
  deliveryDate?: Timestamp | null;
  delivery_date?: string | null; // Alias (string format)
  receivedDate?: Timestamp | null; // Teslim alınan tarih
  received_date?: string | null; // Alias (string format)
  dueDate?: Timestamp | null;
  due_date?: string | null; // Alias (string format)
  notes?: string | null;
  paymentTerms?: string | null;
  payment_terms?: string | null; // Alias
  createdAt: Timestamp;
  created_at?: string; // Alias (string format)
  updatedAt: Timestamp;
  updated_at?: string; // Alias (string format)
  createdBy: string;
  created_by?: string; // Alias
  customerEmail?: string | null;
  customer_email?: string | null; // Alias
  customerPhone?: string | null;
  customer_phone?: string | null; // Alias
  shippingAddress?: string | null;
  shipping_address?: string | null; // Alias
  deliveryAddress?: string | null;
  delivery_address?: string | null; // Alias
  shippingNotes?: string | null;
  shipping_notes?: string | null; // Alias
  deliveryNotes?: string | null;
  delivery_notes?: string | null; // Alias
  priority?: number | null;
  deductMaterials?: boolean; // Hammadde düşürme (varsayılan: true)
}

/**
 * Tüm siparişleri listele
 */
export const getOrders = async (filters?: {
  customerId?: string;
  status?: string;
}): Promise<Order[]> => {
  try {
    // Performans için limit ekle (500 kayıt)
    let q = query(collection(firestore, "orders"), orderBy("createdAt", "desc"), limit(500));

    if (filters?.customerId) {
      q = query(q, where("customerId", "==", filters.customerId));
    }

    if (filters?.status) {
      q = query(q, where("status", "==", filters.status));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Order[];
  } catch (error: unknown) {
    // Index hatası durumunda basit query dene
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode = (error as { code?: string })?.code;
    if (errorCode === 'failed-precondition' || errorMessage.includes('index')) {
      if (import.meta.env.DEV) {
        console.warn("Orders index bulunamadı, basit query kullanılıyor");
      }
      try {
        const simpleQuery = query(collection(firestore, "orders"), orderBy("createdAt", "desc"), limit(500));
        const snapshot = await getDocs(simpleQuery);
        let orders = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Order[];
        
        // Client-side filtreleme
        if (filters?.customerId) {
          orders = orders.filter(o => o.customerId === filters.customerId);
        }
        if (filters?.status) {
          orders = orders.filter(o => o.status === filters.status);
        }
        
        return orders;
      } catch (fallbackError) {
        if (import.meta.env.DEV) {
          console.error("Fallback query de başarısız:", fallbackError);
        }
        // Son çare: filtreleme olmadan (limit ile)
        const snapshot = await getDocs(query(collection(firestore, "orders"), limit(500)));
        let orders = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Order[];
        
        // Client-side filtreleme
        if (filters?.customerId) {
          orders = orders.filter(o => o.customerId === filters.customerId);
        }
        if (filters?.status) {
          orders = orders.filter(o => o.status === filters.status);
        }
        
        // Tarihe göre sırala
        orders.sort((a, b) => {
          const aDate = a.createdAt?.toMillis() || 0;
          const bDate = b.createdAt?.toMillis() || 0;
          return bDate - aDate;
        });
        
        return orders;
      }
    }
    if (import.meta.env.DEV) {
      console.error("Get orders error:", error);
    }
    throw error;
  }
};

/**
 * Sipariş detayını al
 */
export const getOrderById = async (orderId: string): Promise<Order | null> => {
  try {
    const orderDoc = await getDoc(doc(firestore, "orders", orderId));
    
    if (!orderDoc.exists()) {
      return null;
    }

    return {
      id: orderDoc.id,
      ...orderDoc.data(),
    } as Order;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Get order by id error:", error);
    }
    throw error;
  }
};

/**
 * Sipariş kalemlerini al
 */
export const getOrderItems = async (orderId: string): Promise<OrderItem[]> => {
  try {
    const snapshot = await getDocs(collection(firestore, "orders", orderId, "items"));
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as OrderItem[];
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Get order items error:", error);
    }
    throw error;
  }
};

/**
 * Sipariş kalemini güncelle
 */
export const updateOrderItem = async (
  orderId: string,
  itemId: string,
  updates: Partial<Omit<OrderItem, "id">>,
  userId?: string
): Promise<void> => {
  try {
    // Eski veriyi al
    const itemDoc = await getDoc(doc(firestore, "orders", orderId, "items", itemId));
    const oldItem = itemDoc.data() as OrderItem | undefined;
    
    await updateDoc(doc(firestore, "orders", orderId, "items", itemId), updates);
    
    // Audit log
    if (userId) {
      const newItem = { ...oldItem, ...updates } as OrderItem;
      await logAudit(
        "UPDATE",
        "order_items",
        itemId,
        userId,
        oldItem || null,
        newItem,
        { orderId }
      );
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Update order item error:", error);
    }
    throw error;
  }
};

/**
 * Yeni sipariş oluştur
 */
export const createOrder = async (
  orderData: Omit<Order, "id" | "createdAt" | "updatedAt"> & { deductMaterials?: boolean },
  items?: Omit<OrderItem, "id">[]
): Promise<Order> => {
  try {
    const docRef = await addDoc(collection(firestore, "orders"), {
      ...orderData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

<<<<<<< HEAD
    // Sipariş kalemlerini batch write ile ekle (optimize edildi)
    if (items && items.length > 0) {
      const batch = writeBatch(firestore);
      const itemsCollection = collection(firestore, "orders", docRef.id, "items");
      
      // Tüm item'ları batch'e ekle
      const itemRefs: string[] = [];
      for (const item of items) {
        const itemRef = doc(itemsCollection);
        batch.set(itemRef, item);
        itemRefs.push(itemRef.id);
      }
      
      // Batch'i commit et
      await batch.commit();
      
      // Audit log'ları toplu olarak ekle (paralel)
      if (orderData.createdBy && itemRefs.length > 0) {
        await Promise.all(
          itemRefs.map((itemId, index) =>
            logAudit(
              "CREATE",
              "order_items",
              itemId,
              orderData.createdBy,
              null,
              items[index],
              { orderId: docRef.id }
            ).catch((error) => {
              // Audit log hatası sipariş oluşturmayı engellemez
              if (import.meta.env.DEV) {
                console.error(`Audit log error for item ${itemId}:`, error);
              }
            })
          )
        );
      }
    }

    // Gereksiz re-fetch kaldırıldı - order'ı direkt oluştur
    const createdOrder: Order = {
      id: docRef.id,
      ...orderData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    } as Order;
=======
    // Sipariş kalemlerini ekle
    if (items && items.length > 0) {
      const itemsCollection = collection(firestore, "orders", docRef.id, "items");
      for (const item of items) {
        const itemDocRef = await addDoc(itemsCollection, item);
        // Her item için ayrı audit log
        if (orderData.createdBy) {
          await logAudit(
            "CREATE",
            "order_items",
            itemDocRef.id,
            orderData.createdBy,
            null,
            item,
            { orderId: docRef.id }
          );
        }
      }
    }

    const createdOrder = await getOrderById(docRef.id);
    if (!createdOrder) {
      throw new Error("Sipariş oluşturulamadı");
    }
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1

    // Hammadde düşürme kontrolü: PROD- ile başlayan siparişler veya deductMaterials=true olan siparişler
    const isProductionOrder = orderData.orderNumber?.startsWith("PROD-") || orderData.order_number?.startsWith("PROD-");
    const shouldDeductMaterials = isProductionOrder || orderData.deductMaterials === true;
    
    if (shouldDeductMaterials && items && items.length > 0) {
      try {
        const { getProductRecipes } = await import("@/services/firebase/recipeService");
        const { getRawMaterialById, updateRawMaterial, addMaterialTransaction } = await import("@/services/firebase/materialService");
        
<<<<<<< HEAD
        // Tüm reçeteleri paralel olarak topla
        const allRecipePromises = items
          .filter(item => item.product_id || item.productId)
          .map(async (item) => {
            const productId = item.product_id || item.productId;
            const quantity = item.quantity || 1;
            const recipes = await getProductRecipes(productId);
            return recipes.map(recipe => ({
              recipe,
              quantity,
              productName: item.product_name || 'Ürün',
              item,
            }));
          });
        
        const allRecipeArrays = await Promise.all(allRecipePromises);
        const allRecipes = allRecipeArrays.flat();
        
        // Tüm material'ları paralel olarak çek
        const materialIds = [...new Set(allRecipes.map(r => r.recipe.rawMaterialId).filter(Boolean))];
        const materialPromises = materialIds.map(id => getRawMaterialById(id!));
        const materials = await Promise.all(materialPromises);
        const materialMap = new Map(materials.filter(Boolean).map(m => [m!.id, m!]));
        
        // Material güncellemelerini ve transaction'ları hazırla
        const materialUpdates: Array<{
          materialId: string;
          newStock: number;
          totalQuantity: number;
          reason: string;
        }> = [];
        
        // Her reçete için güncelleme bilgilerini topla
        for (const { recipe, quantity, productName } of allRecipes) {
          if (recipe.rawMaterialId) {
            const material = materialMap.get(recipe.rawMaterialId);
            if (material) {
              const totalQuantity = recipe.quantityPerUnit * quantity;
              
              // Stok kontrolü
              if (material.currentStock < totalQuantity) {
                if (import.meta.env.DEV) {
                  console.warn(`Yetersiz stok: ${material.name} için ${totalQuantity} gerekli, ${material.currentStock} mevcut`);
                }
              }
              
              const newStock = Math.max(0, material.currentStock - totalQuantity);
              
              // Aynı material için miktarları topla (eğer birden fazla reçete varsa)
              const existingUpdate = materialUpdates.find(u => u.materialId === recipe.rawMaterialId);
              if (existingUpdate) {
                existingUpdate.newStock = Math.max(0, existingUpdate.newStock - totalQuantity);
                existingUpdate.totalQuantity += totalQuantity;
              } else {
                materialUpdates.push({
                  materialId: recipe.rawMaterialId,
                  newStock,
                  totalQuantity,
                  reason: `${isProductionOrder ? 'Üretim siparişi' : 'Sipariş'}: ${orderData.orderNumber || docRef.id} - ${productName} (${quantity} adet)`,
                });
              }
            }
          }
        }
        
        // Tüm material güncellemelerini paralel yap
        await Promise.all(
          materialUpdates.map(async (update) => {
            try {
              await updateRawMaterial(update.materialId, {
                currentStock: update.newStock,
              });
              
              // Stok hareketi kaydı ekle (stok zaten güncellendi, skipStockUpdate: true)
              await addMaterialTransaction({
                materialId: update.materialId,
                type: "out",
                quantity: update.totalQuantity,
                reason: update.reason,
                relatedOrderId: docRef.id,
                createdBy: orderData.createdBy,
              }, true); // skipStockUpdate: true - stok zaten güncellendi
            } catch (error) {
              // Bir material güncellemesi hatası diğerlerini engellemez
              if (import.meta.env.DEV) {
                console.error(`Material update error for ${update.materialId}:`, error);
              }
            }
          })
        );
=======
        for (const item of items) {
          if (item.product_id || item.productId) {
            const productId = item.product_id || item.productId;
            const quantity = item.quantity || 1;
            
            // Ürün reçetesini al
            const recipes = await getProductRecipes(productId);
            
            // Her reçete için hammadde stokunu düş
            for (const recipe of recipes) {
              if (recipe.rawMaterialId) {
                const material = await getRawMaterialById(recipe.rawMaterialId);
                if (material) {
                  // Toplam kullanılacak miktar = reçete miktarı × ürün miktarı
                  const totalQuantity = recipe.quantityPerUnit * quantity;
                  
                  // Stok kontrolü
                  if (material.currentStock < totalQuantity) {
                    if (import.meta.env.DEV) {
                      console.warn(`Yetersiz stok: ${material.name} için ${totalQuantity} gerekli, ${material.currentStock} mevcut`);
                    }
                    // Stok yetersiz olsa bile devam et, sadece uyarı ver
                  }
                  
                  // Stoktan düş
                  const newStock = Math.max(0, material.currentStock - totalQuantity);
                  await updateRawMaterial(recipe.rawMaterialId, {
                    currentStock: newStock,
                  });
                  
                  // Stok hareketi kaydı ekle (stok zaten güncellendi, skipStockUpdate: true)
                  await addMaterialTransaction({
                    materialId: recipe.rawMaterialId,
                    type: "out",
                    quantity: totalQuantity,
                    reason: `${isProductionOrder ? 'Üretim siparişi' : 'Sipariş'}: ${orderData.orderNumber || docRef.id} - ${item.product_name || 'Ürün'} (${quantity} adet)`,
                    relatedOrderId: docRef.id,
                    createdBy: orderData.createdBy,
                  }, true); // skipStockUpdate: true - stok zaten güncellendi
                }
              }
            }
          }
        }
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("Hammadde stok düşürme hatası:", error);
        }
        // Hata olsa bile sipariş oluşturulmuş olacak, sadece log
      }
    }

    // Audit log
    await logAudit("CREATE", "orders", docRef.id, orderData.createdBy, null, createdOrder);

    // Aktivite log ekle
    if (orderData.createdBy) {
      try {
        const { getUserProfile } = await import("@/services/firebase/authService");
        const userProfile = await getUserProfile(orderData.createdBy);
        const userName = userProfile?.fullName || userProfile?.displayName || userProfile?.email;
        const userEmail = userProfile?.email;
        
        await addOrderActivity(
          docRef.id,
          orderData.createdBy,
          "created",
          `bu siparişi oluşturdu`,
          { orderNumber: orderData.orderNumber || orderData.order_number },
          userName,
          userEmail
        );
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("Add order activity error:", error);
        }
      }
    }

    return createdOrder;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Create order error:", error);
    }
    throw error;
  }
};

/**
 * Sipariş durumu geçiş validasyonu
 */
const isValidStatusTransition = (currentStatus: string, newStatus: string): boolean => {
  const validTransitions: Record<string, string[]> = {
    draft: ["pending", "cancelled"],
    pending: ["confirmed", "cancelled"],
    confirmed: ["in_production", "on_hold", "cancelled"],
    planned: ["in_production", "pending", "on_hold", "cancelled"], // Production order için
    in_production: ["quality_check", "completed", "on_hold", "cancelled"],
    quality_check: ["completed", "in_production", "on_hold", "cancelled"],
    completed: [], // Üretim siparişleri için tamamlandı durumundan sonra geçiş yok
    on_hold: ["in_production", "cancelled"],
    shipped: ["delivered"],
    delivered: ["completed", "quality_check", "in_production"],
    cancelled: [],
  };

  const allowedStatuses = validTransitions[currentStatus] || [];
  return allowedStatuses.includes(newStatus);
};

/**
 * Siparişi güncelle
 */
export const updateOrder = async (
  orderId: string,
  updates: Partial<Omit<Order, "id" | "createdAt" | "createdBy">>,
  userId?: string,
  skipStatusValidation?: boolean
): Promise<void> => {
  try {
    // Eski veriyi al
    const oldOrder = await getOrderById(orderId);
    
    if (!oldOrder) {
      throw new Error("Sipariş bulunamadı");
    }

    // Status değişikliği varsa validasyon yap (üst yöneticiler için atlanabilir)
    if (updates.status && updates.status !== oldOrder.status) {
      // Üst yöneticiler için validasyonu atla
      if (!skipStatusValidation && !isValidStatusTransition(oldOrder.status, updates.status)) {
        throw new Error(
          `Geçersiz durum geçişi: ${oldOrder.status} → ${updates.status}. ` +
          `Geçerli geçişler: ${getValidStatusTransitions(oldOrder.status).join(", ")}`
        );
      }
    }
    
    // Status değişikliği varsa statusUpdatedBy ve statusUpdatedAt ekle
    const updateData: Partial<Order> & { statusUpdatedBy?: string; statusUpdatedAt?: FieldValue | Timestamp } = {
      ...updates,
      updatedAt: serverTimestamp() as any,
    };
    
    if (updates.status && updates.status !== oldOrder.status && userId) {
      updateData.statusUpdatedBy = userId;
      updateData.statusUpdatedAt = serverTimestamp() as any;
    }
    
    await updateDoc(doc(firestore, "orders", orderId), updateData);
    
    // Yeni veriyi al
    const newOrder = await getOrderById(orderId);
    
    // Audit log
    if (userId) {
      await logAudit("UPDATE", "orders", orderId, userId, oldOrder, newOrder);
    }

    // Aktivite log ekle
    if (userId) {
      try {
        const { getUserProfile } = await import("@/services/firebase/authService");
        const userProfile = await getUserProfile(userId);
        const userName = userProfile?.fullName || userProfile?.displayName || userProfile?.email;
        const userEmail = userProfile?.email;

        // Durum değişikliği aktivitesi
        if (updates.status && updates.status !== oldOrder.status) {
          const statusLabels: Record<string, string> = {
            draft: "Taslak",
            pending: "Beklemede",
            confirmed: "Onaylandı",
            planned: "Planlanan",
            in_production: "Üretimde",
            quality_check: "Kalite Kontrol",
            completed: "Tamamlandı",
            shipped: "Kargoda",
            delivered: "Teslim Edildi",
            on_hold: "Beklemede",
            cancelled: "İptal",
          };
          const oldStatusLabel = statusLabels[oldOrder.status] || oldOrder.status;
          const newStatusLabel = statusLabels[updates.status] || updates.status;
          await addOrderActivity(
            orderId,
            userId,
            "status_changed",
            `bu siparişi ${oldStatusLabel} durumundan ${newStatusLabel} durumuna taşıdı`,
            { oldStatus: oldOrder.status, newStatus: updates.status },
            userName,
            userEmail
          );
        } else {
          // Genel güncelleme aktivitesi
          const changedFields = Object.keys(updates).filter(key => {
            const oldValue = (oldOrder as unknown as Record<string, unknown>)[key];
            const newValue = (updates as Record<string, unknown>)[key];
            return oldValue !== newValue;
          });
          
          if (changedFields.length > 0) {
            await addOrderActivity(
              orderId,
              userId,
              "updated",
              `bu siparişi güncelledi`,
              { changedFields },
              userName,
              userEmail
            );
          }
        }
      } catch (error) {
        // Aktivite log hatası ana işlemi etkilememeli
        console.error("Add order activity error:", error);
      }
    }

    // Siparişi tanımlayan kişiye bildirim gönder (güncelleyen kişi hariç)
    if (oldOrder.createdBy && oldOrder.createdBy !== userId) {
      try {
        const { createNotification } = await import("@/services/firebase/notificationService");
        const { getUserProfile } = await import("@/services/firebase/authService");
        
        const updaterProfile = userId ? await getUserProfile(userId) : null;
        const updaterName = updaterProfile?.fullName || updaterProfile?.displayName || updaterProfile?.email || "Bir kullanıcı";
        
        let message = `"${oldOrder.orderNumber || oldOrder.order_number || orderId}" siparişi güncellendi.`;
        
        // Status değişikliği varsa özel mesaj
        if (updates.status && updates.status !== oldOrder.status) {
          const statusLabels: Record<string, string> = {
            draft: "Taslak",
            pending: "Beklemede",
            confirmed: "Onaylandı",
            in_production: "Üretimde",
            quality_check: "Kalite Kontrol",
            completed: "Tamamlandı",
            shipped: "Kargoda",
            delivered: "Teslim Edildi",
            cancelled: "İptal",
            on_hold: "Beklemede",
          };
          const oldStatusLabel = statusLabels[oldOrder.status] || oldOrder.status;
          const newStatusLabel = statusLabels[updates.status] || updates.status;
          const updateTime = new Date().toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
          message = `"${oldOrder.orderNumber || oldOrder.order_number || orderId}" sipariş numaralı siparişin durumu "${oldStatusLabel}" durumundan "${newStatusLabel}" durumuna güncellendi.\n\nİşlem Zamanı: ${updateTime}`;
        } else {
          const updateTime = new Date().toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
          message = `"${oldOrder.orderNumber || oldOrder.order_number || orderId}" sipariş numaralı sipariş güncellendi.\n\nİşlem Zamanı: ${updateTime}`;
        }
        
        await createNotification({
          userId: oldOrder.createdBy,
          type: "order_updated",
          title: "Siparişiniz güncellendi",
          message: `${updaterName} kullanıcısı tarafından ${message}`,
          read: false,
          relatedId: orderId,
          metadata: { 
            updatedBy: userId,
            statusChanged: updates.status && updates.status !== oldOrder.status,
            oldStatus: oldOrder.status,
            newStatus: updates.status || oldOrder.status,
            updatedAt: new Date(),
          },
        });
      } catch (notifError) {
        console.error("Sipariş güncelleme bildirimi gönderilemedi:", notifError);
        // Bildirim hatası sipariş güncellemesini engellemez
      }
    }
  } catch (error) {
    console.error("Update order error:", error);
    throw error;
  }
};

/**
 * Sipariş tamamlanma onayı iste
 */
export const requestOrderCompletion = async (
  orderId: string,
  userId: string
): Promise<void> => {
  try {
    // Eski veriyi al
    const oldOrder = await getOrderById(orderId);
    
    await updateDoc(doc(firestore, "orders", orderId), {
      approvalStatus: "pending",
      approvalRequestedBy: userId,
      approvalRequestedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    // Audit log
    if (userId) {
      const newOrder = await getOrderById(orderId);
      await logAudit(
        "UPDATE",
        "orders",
        orderId,
        userId,
        oldOrder,
        newOrder,
        { action: "request_completion", approvalStatus: "pending" }
      );
    }
    
    // Opsiyonel: Bildirim gönderilebilir
  } catch (error) {
    console.error("Request order completion error:", error);
    throw error;
  }
};

/**
 * Sipariş tamamlanmasını onayla
 */
export const approveOrderCompletion = async (
  orderId: string,
  userId: string
): Promise<void> => {
  try {
    // Eski veriyi al
    const oldOrder = await getOrderById(orderId);
    
    await updateDoc(doc(firestore, "orders", orderId), {
      status: "completed",
      approvalStatus: "approved",
      approvedBy: userId,
      approvedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    // Audit log
    if (userId) {
      const newOrder = await getOrderById(orderId);
      await logAudit(
        "UPDATE",
        "orders",
        orderId,
        userId,
        oldOrder,
        newOrder,
        { action: "approve_completion", approvalStatus: "approved" }
      );
    }
    
    // Opsiyonel: Bildirim
  } catch (error) {
    console.error("Approve order completion error:", error);
    throw error;
  }
};

/**
 * Sipariş tamamlanmasını reddet
 */
export const rejectOrderCompletion = async (
  orderId: string,
  userId: string,
  reason?: string
): Promise<void> => {
  try {
    // Eski veriyi al
    const oldOrder = await getOrderById(orderId);
    
    await updateDoc(doc(firestore, "orders", orderId), {
      status: "in_production", // Geri döndür
      approvalStatus: "rejected",
      rejectedBy: userId,
      rejectedAt: serverTimestamp(),
      rejectionReason: reason || null,
      updatedAt: serverTimestamp(),
    });
    
    // Audit log
    if (userId) {
      const newOrder = await getOrderById(orderId);
      await logAudit(
        "UPDATE",
        "orders",
        orderId,
        userId,
        oldOrder,
        newOrder,
        { action: "reject_completion", approvalStatus: "rejected", reason: reason || null }
      );
    }
    
    // Opsiyonel: Bildirim
  } catch (error) {
    console.error("Reject order completion error:", error);
    throw error;
  }
};

/**
 * Geçerli durum geçişlerini al
 */
export const getValidStatusTransitions = (currentStatus: string): string[] => {
  const validTransitions: Record<string, string[]> = {
    draft: ["pending", "cancelled"],
    pending: ["confirmed", "cancelled"],
    confirmed: ["in_production", "on_hold", "cancelled"],
    planned: ["in_production", "pending", "on_hold", "cancelled"], // Production order için
    in_production: ["quality_check", "completed", "on_hold", "cancelled"],
    quality_check: ["completed", "in_production", "on_hold", "cancelled"],
    completed: [], // Üretim siparişleri için tamamlandı durumundan sonra geçiş yok
    on_hold: ["in_production", "cancelled"],
    shipped: ["delivered"],
    delivered: ["completed", "quality_check", "in_production"],
    cancelled: [],
  };

  return validTransitions[currentStatus] || [];
};

/**
 * Sipariş durumunu güncelle (validasyon ile)
 */
export const updateOrderStatus = async (
  orderId: string,
  newStatus: Order["status"],
  userId?: string
): Promise<void> => {
  try {
    await updateOrder(orderId, { status: newStatus }, userId);
  } catch (error) {
    console.error("Update order status error:", error);
    throw error;
  }
};

/**
 * Siparişi sil
 */
export const deleteOrder = async (orderId: string, userId?: string): Promise<void> => {
  try {
    // Eski veriyi al
    const oldOrder = await getOrderById(orderId);
    
    // Aktivite log ekle (silmeden önce)
    if (userId && oldOrder) {
      try {
        const { getUserProfile } = await import("@/services/firebase/authService");
        const userProfile = await getUserProfile(userId);
        const userName = userProfile?.fullName || userProfile?.displayName || userProfile?.email;
        const userEmail = userProfile?.email;
        
        await addOrderActivity(
          orderId,
          userId,
          "deleted",
          `bu siparişi sildi`,
          { orderNumber: oldOrder.orderNumber || oldOrder.order_number },
          userName,
          userEmail
        );
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("Add order activity error:", error);
        }
      }
    }
    
    await deleteDoc(doc(firestore, "orders", orderId));
    
    // Audit log
    if (userId) {
      await logAudit("DELETE", "orders", orderId, userId, oldOrder, null);
    }
  } catch (error) {
    console.error("Delete order error:", error);
    throw error;
  }
};

/**
 * Siparişleri gerçek zamanlı olarak dinle
 * @param filters Sipariş filtreleri
 * @param callback Siparişler değiştiğinde çağrılacak callback
 * @returns Unsubscribe fonksiyonu
 */
export const subscribeToOrders = (
  filters: {
    customerId?: string;
    status?: string;
  } = {},
  callback: (orders: Order[]) => void
): Unsubscribe => {
  try {
    const ordersRef = collection(firestore, "orders");
    
    const buildQuery = () => {
      const constraints: QueryConstraint[] = [orderBy("createdAt", "desc")];
      
      if (filters?.customerId) {
        constraints.push(where("customerId", "==", filters.customerId));
      }
      
      if (filters?.status) {
        constraints.push(where("status", "==", filters.status));
      }
      
      return query(ordersRef, ...constraints);
    };
    
    let q = buildQuery();
    
    // onSnapshot ile gerçek zamanlı dinleme
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        try {
          let orders = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Order[];
          
          // Client-side filtreleme (index hatası durumunda)
          if (filters?.customerId) {
            orders = orders.filter(o => o.customerId === filters.customerId);
          }
          if (filters?.status) {
            orders = orders.filter(o => o.status === filters.status);
          }
          
          callback(orders);
        } catch (error) {
          console.error("Subscribe to orders error:", error);
          callback([]);
        }
      },
      (error) => {
        // 404 ve network hatalarını sessizce handle et (Firestore otomatik yeniden bağlanacak)
        // Production'da da sessizce handle et - bu normal Firestore long-polling davranışı
        if (error?.code === 'unavailable' || 
            error?.code === 'not-found' ||
            error?.message?.includes('404') || 
            error?.message?.includes('network') ||
            error?.message?.includes('transport errored')) {
          // Sessizce handle et - Firestore otomatik olarak yeniden bağlanacak
          // Production'da console'a yazma (performans ve gürültü azaltma)
          callback([]);
          return;
        }
        
        // Sadece gerçek hataları logla
        if (import.meta.env.DEV) {
          console.error("Orders snapshot error:", error);
        }
        // Index hatası durumunda basit query dene
        if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
          try {
            const simpleQuery = query(ordersRef, orderBy("createdAt", "desc"));
            const fallbackUnsubscribe = onSnapshot(
              simpleQuery,
              (snapshot) => {
                try {
                  let orders = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                  })) as Order[];
                  
                  // Client-side filtreleme
                  if (filters?.customerId) {
                    orders = orders.filter(o => o.customerId === filters.customerId);
                  }
                  if (filters?.status) {
                    orders = orders.filter(o => o.status === filters.status);
                  }
                  
                  callback(orders);
                } catch (err) {
                  console.error("Fallback subscribe to orders error:", err);
                  callback([]);
                }
              },
              (err) => {
                console.error("Fallback orders snapshot error:", err);
                callback([]);
              }
            );
            return fallbackUnsubscribe;
          } catch (fallbackError) {
            console.error("Fallback query setup error:", fallbackError);
            callback([]);
          }
        } else {
          callback([]);
        }
      }
    );
    
    return unsubscribe;
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Subscribe to orders setup error:", error);
    }
    return () => {};
  }
};

// Order Comments and Activities

export interface OrderComment {
  id: string;
  orderId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  content: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp | null;
}

export interface OrderActivity {
  id: string;
  orderId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  action: string;
  description: string;
  metadata?: Record<string, any>;
  createdAt: Timestamp;
}

/**
 * Sipariş yorumu ekle
 */
export const addOrderComment = async (
  orderId: string,
  userId: string,
  content: string,
  userName?: string,
  userEmail?: string
): Promise<OrderComment> => {
  try {
    const commentData: Omit<OrderComment, "id"> = {
      orderId,
      userId,
      userName,
      userEmail,
      content,
      createdAt: Timestamp.now(),
      updatedAt: null,
    };

    const docRef = await addDoc(
      collection(firestore, "orders", orderId, "comments"),
      commentData
    );

    // Activity log ekle
    await addOrderActivity(orderId, userId, "commented", `yorum ekledi`, { commentId: docRef.id }, userName, userEmail);

    // Siparişi oluşturan kişiye bildirim gönder (yorum ekleyen kişi hariç)
    try {
      const order = await getOrderById(orderId);
      if (order?.createdBy && order.createdBy !== userId) {
        const { createNotification } = await import("@/services/firebase/notificationService");
        await createNotification({
          userId: order.createdBy,
          type: "comment_added",
          title: "Siparişinize Yorum Eklendi",
          message: `${userName || userEmail || "Bir kullanıcı"} "${order.orderNumber || order.order_number || orderId}" siparişinize yorum ekledi: ${content.substring(0, 100)}${content.length > 100 ? "..." : ""}`,
          read: false,
          relatedId: orderId,
          metadata: { commentId: docRef.id, commenterId: userId, commenterName: userName, commenterEmail: userEmail },
        });
      }
    } catch (error) {
      // Bildirim hatası ana işlemi etkilememeli
      console.error("Send comment notification error:", error);
    }

    return {
      id: docRef.id,
      ...commentData,
    };
  } catch (error) {
    console.error("Add order comment error:", error);
    throw error;
  }
};

/**
 * Sipariş yorumlarını al
 */
export const getOrderComments = async (orderId: string): Promise<OrderComment[]> => {
  try {
    const snapshot = await getDocs(
      query(
        collection(firestore, "orders", orderId, "comments"),
        orderBy("createdAt", "desc")
      )
    );
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as OrderComment[];
  } catch (error) {
    console.error("Get order comments error:", error);
    throw error;
  }
};

/**
 * Sipariş aktivite log ekle
 */
export const addOrderActivity = async (
  orderId: string,
  userId: string,
  action: string,
  description: string,
  metadata?: Record<string, any>,
  userName?: string,
  userEmail?: string
): Promise<string> => {
  try {
    const activityData: Omit<OrderActivity, "id"> = {
      orderId,
      userId,
      userName,
      userEmail,
      action,
      description,
      metadata: metadata || {},
      createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(
      collection(firestore, "orders", orderId, "activities"),
      activityData
    );

    return docRef.id;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Add order activity error:", error);
    }
    return "";
  }
};

/**
 * Sipariş aktivite loglarını al
 */
export const getOrderActivities = async (orderId: string): Promise<OrderActivity[]> => {
  try {
    const snapshot = await getDocs(
      query(
        collection(firestore, "orders", orderId, "activities"),
        orderBy("createdAt", "desc")
      )
    );
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as OrderActivity[];
  } catch (error) {
    console.error("Get order activities error:", error);
    throw error;
  }
};