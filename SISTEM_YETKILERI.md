# Revium ERP - Sistem Yetkileri ve İşlevler Dokümantasyonu

## Genel Bakış

Revium ERP, rol tabanlı bir yetki sistemi kullanarak kullanıcıların sistem içindeki işlevlere erişimini kontrol eder. Sistem, `role_permissions` koleksiyonunda saklanan yetkiler üzerinden çalışır ve gerçek zamanlı güncellemeleri destekler.

> Not: `admin` rolü kaldırıldı; tam yetki için `super_admin` kullanılır.

### Yetki Kontrol Mekanizması

- **Temel Yetkiler:** `canCreate`, `canRead`, `canUpdate`, `canDelete`
- **Alt Yetkiler (SubPermissions):** Her kaynak için özel işlem yetkileri
- **Gerçek Zamanlı Güncelleme:** Yetki değişiklikleri anında yansır
- **Cache Sistemi:** Performans için yetki bilgileri cache'lenir

---

## Rol Sistemi

### 1. Super Admin (super_admin / main_admin)

**Genel Yetkiler:**
- Tüm kaynaklarda tam yetki (Create, Read, Update, Delete)
- Tüm alt yetkilere sahip
- Sistem ayarlarını yönetebilir
- Rol ve yetki yönetimi yapabilir
- Audit logları görüntüleyebilir ve silebilir

**Özel Durumlar:**
- Hiçbir kısıtlama yok
- Tüm işlemlerde validasyon atlanabilir

### 2. Team Leader (team_leader)

**Genel Yetkiler:**
- Çoğu kaynakta oluşturma, okuma ve güncelleme yetkisi
- Kendi ekibindeki görevleri yönetebilir
- Ekip üyelerinin taleplerini onaylayabilir/reddedebilir

**Kısıtlamalar:**
- `role_permissions` kaynağına erişemez
- `audit_logs` kayıtlarını silemez
- Sistem ayarlarını değiştiremez

### 3. Personnel (personnel)

**Genel Yetkiler:**
- Sadece `production_orders` kaynağında oluşturma ve güncelleme
- Tüm kaynaklarda okuma yetkisi (gizli görevler ve projeler hariç)
- Kendisine atanan görevlerin durumunu güncelleyebilir
- Checklist ekleyebilir ve işaretleyebilir
- Yorum bırakabilir

**Kısıtlamalar:**
- `tasks` kaynağında oluşturma yetkisi yok
- Silme yetkisi yok
- Sadece kendisine atanan görevlerle etkileşim kurabilir
- Gizli görevlere dahil değilse göremez
- Gizli projelere dahil değilse göremez

---

## Modül Detayları

### 1. Dashboard

**Erişim:** Tüm kullanıcılar

**Amaç:** Sistem genelinde özet istatistikler ve hızlı erişim

**Özellikler:**
- Genel istatistikler (görevler, siparişler, müşteriler, ürünler)
- Hızlı işlem butonları
- Son aktiviteler
- Görev atamaları

**Yetkiler:**
| İşlem | Super Admin | Team Leader | Personnel |
|-------|-------------|-------------|-----------|
| Görüntüleme | ✅ | ✅ | 0**✅ |

**İşleyiş:**
- Kullanıcının rolüne göre farklı istatistikler gösterilir
- Hızlı işlem butonları yetki kontrolüne tabidir

---

### 2. Görevler (Tasks)

**Erişim:** Tüm kullanıcılar

**Amaç:** Görev yönetimi ve takibi

**Yetkiler:**

| İşlem | Super Admin | Team Leader | Personnel |
|-------|-------------|-------------|-----------|
| Oluşturma | ✅ | ✅ | ❌ |
| Görüntüleme | ✅ (Tümü) | ✅ (Tümü) | ✅ (Atanan görevler + Gizli olmayanlar) |
| İçerik Düzenleme | ✅ | ❌ | ❌ |
| Durum Değiştirme | ✅ | ✅ | ✅ (Sadece atanan görevler) |
| Checklist Ekleme/İşaretleme | ✅ | ✅ | ✅ (Sadece atanan görevler) |
| Yorum Bırakma | ✅ | ✅ | ✅ (Sadece atanan görevler) |
| Tamamlama | ✅ | ✅ | ⚠️ (Onay gerekir - sadece atanan görevler) |
| Silme | ✅ | ❌ | ❌ |
| Kullanıcı Atama | ✅ | ✅ | ❌ |

**Alt Yetkiler:**
- `canAssign`: Görev atama
- `canChangeStatus`: Durum değiştirme
- `canAddComment`: Yorum ekleme
- `canAddAttachment`: Dosya ekleme
- `canViewAll`: Tüm görevleri görme
- `canEditOwn`: Kendi görevlerini düzenleme
- `canDeleteOwn`: Kendi görevlerini silme

**İşleyiş:**
- **Workflow:** Yapılacak → Devam Ediyor → Tamamlandı → Onaylandı
- **Gizli Görevler:** `isPrivate: true` olan görevler sadece atanan kullanıcılar, oluşturan ve Super Admin tarafından görülebilir
- **Onay Süreci:** Personnel kullanıcıları görev tamamladığında onay isteği gönderilir
- **Görev Havuzu:** `isInPool: true` olan görevler havuzdan alınabilir
- **Etkileşim:** Atanan kullanıcılar ve oluşturan kişi görevle etkileşim kurabilir (taşıma, durum değiştirme, checklist işaretleme)

**Özel Durumlar:**
- Görevi oluşturan kişi her zaman düzenleyebilir ve silebilir
- Personnel kullanıcıları sadece kendilerine atanan görevlerin durumunu değiştirebilir
- Personnel kullanıcıları sadece kendilerine atanan görevlere checklist ekleyebilir ve işaretleyebilir
- Personnel kullanıcıları sadece kendilerine atanan görevlere yorum bırakabilir
- Personnel kullanıcıları gizli görevlere dahil değilse göremez
- Super Admin ve Team Leader'lar tüm görevleri onaylayabilir

---

### 3. Siparişler (Orders)

**Erişim:** Tüm kullanıcılar (okuma), yetkili kullanıcılar (yazma)

**Amaç:** Satış siparişlerinin yönetimi

**Yetkiler:**

| İşlem | Super Admin | Team Leader | Personnel |
|-------|-------------|-------------|-----------|
| Oluşturma | ✅ | ✅ | ❌ |
| Görüntüleme | ✅ | ✅ | ✅ |
| Düzenleme | ✅ | ✅ | ❌ |
| Durum Değiştirme | ✅ | ✅ | ❌ |
| Onaylama | ✅ | ✅ | ❌ |
| İptal Etme | ✅ | ✅ | ❌ |
| Silme | ✅ | ✅ | ❌ |
| Dışa Aktarma | ✅ | ✅ | ❌ |

**Alt Yetkiler:**
- `canApprove`: Sipariş onaylama
- `canCancel`: Sipariş iptal etme
- `canExport`: Dışa aktarma
- `canViewFinancials`: Finansal bilgileri görme
- `canEditPrice`: Fiyat düzenleme

**İşleyiş:**
- **Durum Workflow:** draft → pending → confirmed → in_production → quality_check → completed → shipped → delivered
- **Durum Geçişleri:** Validasyon kurallarına tabidir (üst yöneticiler için atlanabilir)
- **Sipariş Kalemleri:** Her sipariş birden fazla ürün içerebilir
- **Aktivite/Yorum:** Her sipariş için aktivite ve yorum eklenebilir

**Özel Durumlar:**
- Üretim siparişleri (`PROD-` ile başlayan) otomatik olarak hammadde stokundan düşülür
- Durum değişiklikleri `statusUpdatedBy` ve `statusUpdatedAt` alanlarını günceller
- Audit log tüm değişiklikleri kaydeder

---

### 4. Üretim Siparişleri (Production)

**Erişim:** Tüm kullanıcılar (okuma), yetkili kullanıcılar (yazma)

**Amaç:** Üretim süreçlerinin yönetimi

**Yetkiler:**

| İşlem | Super Admin | Team Leader | Personnel |
|-------|-------------|-------------|-----------|
| Oluşturma | ✅ | ✅ | ✅ |
| Görüntüleme | ✅ | ✅ | ✅ |
| Düzenleme | ✅ | ✅ | ✅ |
| Durum Değiştirme | ✅ | ✅ | ✅ |
| Üretimi Başlatma | ✅ | ✅ | ✅ |
| Üretimi Tamamlama | ✅ | ✅ | ✅ |
| Silme | ✅ | ✅ | ❌ |

**Alt Yetkiler:**
- `canStartProduction`: Üretimi başlatma
- `canCompleteProduction`: Üretimi tamamlama
- `canViewSchedule`: Üretim planını görme
- `canEditSchedule`: Üretim planını düzenleme

**İşleyiş:**
- **Durum Workflow:** planned → in_production → quality_check → completed
- **Hammadde Düşürme:** Üretim siparişi oluşturulduğunda reçete bazlı hammadde stokundan otomatik düşülür
- **Stok Kontrolü:** Yetersiz stok durumunda uyarı verilir ancak sipariş oluşturulur
- **Aktivite/Yorum:** Her üretim siparişi için aktivite ve yorum eklenebilir

**Özel Durumlar:**
- Personnel kullanıcıları üretim siparişi oluşturabilir ve güncelleyebilir
- Üretim planı görüntüleme yetkisi personnel için mevcuttur

---

### 5. Müşteriler (Customers)

**Erişim:** Tüm kullanıcılar (okuma), yetkili kullanıcılar (yazma)

**Amaç:** Müşteri bilgilerinin yönetimi

**Yetkiler:**

| İşlem | Super Admin | Team Leader | Personnel |
|-------|-------------|-------------|-----------|
| Oluşturma | ✅ | ✅ | ❌ |
| Görüntüleme | ✅ | ✅ | ✅ |
| Düzenleme | ✅ | ✅ | ❌ |
| Silme | ✅ | ✅ | ❌ |
| Dışa Aktarma | ✅ | ✅ | ❌ |

**Alt Yetkiler:**
- `canViewFinancials`: Finansal bilgileri görme
- `canEditFinancials`: Finansal bilgileri düzenleme
- `canExport`: Dışa aktarma
- `canViewHistory`: Geçmiş kayıtları görme

**İşleyiş:**
- **Müşteri Kartları:** Her müşteri için detaylı bilgi kartı
- **Sipariş Geçmişi:** Müşteriye ait siparişler görüntülenebilir
- **Satış Teklifleri:** Müşteriye özel teklifler oluşturulabilir
- **Aktivite/Yorum:** Her müşteri için aktivite ve yorum eklenebilir
- **Filtreleme:** VIP, aktif, iletişim gereken müşteriler filtrelenebilir

**Özel Durumlar:**
- Finansal bilgiler sadece yetkili kullanıcılar tarafından görüntülenebilir
- Müşteri değer raporu oluşturulabilir

---

### 6. Ürünler (Products)

**Erişim:** Tüm kullanıcılar (okuma), yetkili kullanıcılar (yazma)

**Amaç:** Ürün kataloğu yönetimi

**Yetkiler:**

| İşlem | Super Admin | Team Leader | Personnel |
|-------|-------------|-------------|-----------|
| Oluşturma | ✅ | ✅ | ❌ |
| Görüntüleme | ✅ | ✅ | ✅ |
| Düzenleme | ✅ | ✅ | ❌ |
| Silme | ✅ | ✅ | ❌ |
| Dışa Aktarma | ✅ | ✅ | ❌ |

**Alt Yetkiler:**
- `canEditPrice`: Fiyat düzenleme
- `canEditStock`: Stok düzenleme
- `canViewCost`: Maliyet görme
- `canEditCost`: Maliyet düzenleme
- `canExport`: Dışa aktarma

**İşleyiş:**
- **Ürün Kategorileri:** Taşınabilir, Kabin Tipi, Araç Tipi, Endüstriyel, Güneş Enerji Sistemleri
- **Reçete Yönetimi:** Her ürün için hammadde reçetesi tanımlanabilir
- **Stok Takibi:** Ürün stok seviyeleri takip edilir
- **Çoklu Para Birimi:** Farklı para birimlerinde fiyatlandırma
- **Aktivite/Yorum:** Her ürün için aktivite ve yorum eklenebilir

**Özel Durumlar:**
- Maliyet bilgileri sadece yetkili kullanıcılar tarafından görüntülenebilir
- Ürün değer raporu oluşturulabilir
- Düşük stok uyarıları gösterilir

---

### 7. Hammaddeler (Raw Materials)

**Erişim:** Tüm kullanıcılar (okuma), yetkili kullanıcılar (yazma)

**Amaç:** Hammadde stok yönetimi

**Yetkiler:**

| İşlem | Super Admin | Team Leader | Personnel |
|-------|-------------|-------------|-----------|
| Oluşturma | ✅ | ✅ | ❌ |
| Görüntüleme | ✅ | ✅ | ✅ |
| Düzenleme | ✅ | ✅ | ❌ |
| Stok Girişi | ✅ | ✅ | ❌ |
| Stok İşlemi Oluşturma | ✅ | ✅ | ❌ |
| Silme | ✅ | ✅ | ❌ |
| Dışa Aktarma | ✅ | ✅ | ❌ |

**Alt Yetkiler:**
- `canEditStock`: Stok düzenleme
- `canViewCost`: Maliyet görme
- `canEditCost`: Maliyet düzenleme
- `canExport`: Dışa aktarma
- `canViewTransactions`: İşlem geçmişini görme
- `canCreateTransactions`: Stok işlemi oluşturma

**İşleyiş:**
- **Stok Takibi:** Mevcut stok, minimum stok, maksimum stok seviyeleri
- **Stok İşlemleri:** Giriş, çıkış, transfer işlemleri
- **Otomatik Düşürme:** Üretim siparişleri oluşturulduğunda reçete bazlı otomatik stok düşürme
- **Stok Uyarıları:** Düşük stok ve stok tükenme uyarıları
- **Aktivite/Yorum:** Her hammadde için aktivite ve yorum eklenebilir
- **İşlem Geçmişi:** Tüm stok hareketleri kaydedilir

**Özel Durumlar:**
- Stok girişi için `canUpdate` ve `canEditStock` yetkileri gerekir
- Stok işlemi oluşturma için `canCreateTransactions` yetkisi gerekir
- Hammadde değer raporu oluşturulabilir

---

### 8. Satış Sonrası Takip (Warranty)

**Erişim:** Tüm kullanıcılar (okuma), yetkili kullanıcılar (yazma)

**Amaç:** Garanti kayıtlarının yönetimi

**Yetkiler:**

| İşlem | Super Admin | Team Leader | Personnel |
|-------|-------------|-------------|-----------|
| Oluşturma | ✅ | ✅ | ❌ |
| Görüntüleme | ✅ | ✅ | ✅ |
| Düzenleme | ✅ | ✅ | ❌ |
| Onaylama | ✅ | ✅ | ❌ |
| Reddetme | ✅ | ✅ | ❌ |
| Silme | ✅ | ✅ | ❌ |
| Dışa Aktarma | ✅ | ✅ | ❌ |

**Alt Yetkiler:**
- `canApprove`: Garanti onaylama
- `canReject`: Garanti reddetme
- `canViewFinancials`: Finansal bilgileri görme
- `canExport`: Dışa aktarma
- `canViewHistory`: Geçmiş kayıtları görme

**İşleyiş:**
- **Durum Workflow:** received → in_review → approved → in_repair → completed → rejected
- **Müşteri-Ürün İlişkisi:** Garanti kaydı müşteri, ürün ve sipariş ile ilişkilendirilir
- **Maliyet Takibi:** Onarım maliyetleri kaydedilir
- **Aktivite/Yorum:** Her garanti kaydı için aktivite ve yorum eklenebilir

**Özel Durumlar:**
- Garanti onaylama/reddetme yetkisi sadece yöneticiler ve ekip liderlerinde
- Finansal bilgiler sadece yetkili kullanıcılar tarafından görüntülenebilir

---

### 9. Raporlar (Reports)

**Erişim:** Tüm kullanıcılar

**Amaç:** Sistem genelinde rapor oluşturma ve görüntüleme

**Rapor Türleri:**

1. **Satış Raporu**
   - Günlük, haftalık, aylık satış analizleri
   - Tarih aralığı seçimi
   - PDF olarak indirilebilir

2. **Satış Teklifi**
   - Teklif formu düzenleme
   - PDF olarak indirilebilir
   - Müşteriye özel teklifler

3. **Üretim Raporu**
   - Üretim süreçleri ve tamamlanma oranları
   - Üretim istatistikleri
   - PDF olarak indirilebilir

4. **Müşteri Raporu**
   - Müşteri analizleri ve davranış raporları
   - Müşteri değer analizi
   - PDF olarak indirilebilir

5. **Mali Rapor**
   - Gelir-gider analizi
   - Kar-zarar hesaplamaları
   - PDF olarak indirilebilir

**Yetkiler:**

| İşlem | Super Admin | Team Leader | Personnel |
|-------|-------------|-------------|-----------|
| Rapor Oluşturma | ✅ | ✅ | ✅ |
| Rapor Görüntüleme | ✅ | ✅ | ✅ |
| Rapor İndirme | ✅ | ✅ | ✅ |
| Kaydedilmiş Raporlar | ✅ | ✅ | ✅ (Kendi raporları) |

**İşleyiş:**
- Raporlar Firebase'de saklanır
- PDF formatında indirilebilir
- Kaydedilmiş raporlar geçmişte görüntülenebilir
- Rapor oluşturma tarih aralığı seçimi ile yapılır

---

### 10. Talepler (Requests)

**Erişim:** Tüm kullanıcılar

**Amaç:** İzin, satın alma, avans, gider ve diğer taleplerin yönetimi

**Talep Türleri:**
- İzin (Leave)
- Satın Alma (Purchase)
- Avans (Advance)
- Gider (Expense)
- Diğer (Other)

**Yetkiler:**

| İşlem | Super Admin | Team Leader | Personnel |
|-------|-------------|-------------|-----------|
| Oluşturma | ✅ | ✅ | ✅ |
| Görüntüleme | ✅ (Tümü) | ✅ (Atananlar) | ✅ (Kendi talepleri) |
| Onaylama | ✅ | ✅ | ❌ |
| Reddetme | ✅ | ✅ | ❌ |
| Silme | ✅ | ✅ | ✅ (Kendi talepleri) |

**İşleyiş:**
- **Durum Workflow:** pending → approved / rejected
- **Atama:** Talepler yöneticilere veya ekip liderlerine atanabilir
- **Onay Süreci:** Yöneticiler ve ekip liderleri talepleri onaylayabilir/reddedebilir
- **Reddetme Sebebi:** Reddedilen talepler için sebep girilebilir

**Özel Durumlar:**
- Personnel kullanıcıları sadece kendi taleplerini görebilir
- Team Leader'lar kendilerine atanan talepleri görebilir
- Super Admin tüm talepleri görebilir

---

### 11. Ayarlar (Settings)

**Erişim:** Tüm kullanıcılar

**Amaç:** Kullanıcı ve sistem ayarlarının yönetimi

**Ayarlar:**

1. **Profil Ayarları** (Tüm kullanıcılar)
   - Kişisel bilgiler
   - Şifre değiştirme
   - Profil fotoğrafı

2. **Şirket Bilgileri** (Sadece Super Admin)
   - Şirket adı, adres, iletişim bilgileri
   - Logo yükleme
   - Vergi bilgileri

3. **Google Drive Ayarları** (Tüm kullanıcılar)
   - Drive entegrasyonu
   - Dosya senkronizasyonu

**Yetkiler:**

| İşlem | Super Admin | Team Leader | Personnel |
|-------|-------------|-------------|-----------|
| Profil Düzenleme | ✅ | ✅ | ✅ |
| Şirket Ayarları | ✅ | ❌ | ❌ |
| Drive Ayarları | ✅ | ✅ | ✅ |

**İşleyiş:**
- Profil ayarları her kullanıcı tarafından düzenlenebilir
- Şirket ayarları sadece Super Admin tarafından düzenlenebilir
- Google Drive entegrasyonu isteğe bağlıdır

---

### 12. Ekip Yönetimi (Team Management)

**Erişim:** Super Admin ve Team Leader

**Amaç:** Departman ve ekip üyelerinin yönetimi

**Özellikler:**
- Ekip üyelerini görüntüleme
- Bekleyen onayları yönetme
- Ekip istatistikleri
- Görev onayları

**Yetkiler:**

| İşlem | Super Admin | Team Leader | Personnel |
|-------|-------------|-------------|-----------|
| Erişim | ✅ | ✅ (Kendi ekibi) | ❌ |
| Üye Görüntüleme | ✅ (Tümü) | ✅ (Kendi ekibi) | ❌ |
| Onay Yönetimi | ✅ | ✅ (Kendi ekibi) | ❌ |
| İstatistik Görüntüleme | ✅ | ✅ (Kendi ekibi) | ❌ |

**İşleyiş:**
- **Ekip Lideri:** Sadece yönettiği departmanların üyelerini görür
- **Super Admin:** Tüm ekip üyelerini görür
- **Onay Süreci:** Ekip üyeliği talepleri onaylanabilir/reddedilebilir
- **İstatistikler:** Ekip bazlı görev ve performans istatistikleri

**Özel Durumlar:**
- Team Leader sadece `managerId` olarak atandığı departmanları yönetebilir
- Ekip üyeliği `approvedTeams` ve `pendingTeams` alanları ile takip edilir

---

### 13. Admin Paneli

**Erişim:** Sadece Super Admin

**Amaç:** Sistem yönetimi ve kontrolü

**Bölümler:**

1. **Dashboard**
   - Sistem genelinde istatistikler
   - Kullanıcı aktiviteleri
   - Son değişiklikler

2. **Kullanıcı Yönetimi**
   - Kullanıcı oluşturma, düzenleme, silme
   - Rol atama
   - Kullanıcı istatistikleri

3. **Departman Yönetimi**
   - Departman oluşturma, düzenleme, silme
   - Ekip lideri atama
   - Departman istatistikleri

4. **Rol Yetkileri**
   - Rol bazlı yetki yönetimi
   - Alt yetki ayarları
   - Yetki matrisi görüntüleme

5. **Audit Loglar**
   - Sistem değişiklik kayıtları
   - Kullanıcı aktiviteleri
   - Filtreleme ve arama

6. **Kullanıcı Analizi**
   - Kullanıcı performans metrikleri
   - Aktivite analizleri
   - İstatistiksel raporlar

7. **Sistem Ayarları**
   - Genel sistem ayarları
   - Yapılandırma seçenekleri

**Yetkiler:**

| İşlem | Super Admin | Team Leader | Personnel |
|-------|-------------|-------------|-----------|
| Erişim | ✅ | ❌ | ❌ |
| Kullanıcı Yönetimi | ✅ | ❌ | ❌ |
| Departman Yönetimi | ✅ | ❌ | ❌ |
| Rol Yetkileri | ✅ | ❌ | ❌ |
| Audit Loglar | ✅ | ❌ | ❌ |
| Kullanıcı Analizi | ✅ | ❌ | ❌ |
| Sistem Ayarları | ✅ | ❌ | ❌ |

**İşleyiş:**
- Admin paneli sadece Super Admin tarafından erişilebilir
- Rol yetkileri sadece Super Admin tarafından düzenlenebilir
- Tüm değişiklikler audit log'a kaydedilir

---

### 14. Projeler (Projects)

**Erişim:** Tüm kullanıcılar (okuma), yetkili kullanıcılar (yazma)

**Amaç:** Proje yönetimi ve görev organizasyonu

**Yetkiler:**

| İşlem | Super Admin | Team Leader | Personnel |
|-------|-------------|-------------|-----------|
| Oluşturma | ✅ | ✅ | ❌ |
| Görüntüleme | ✅ (Tümü) | ✅ (Tümü) | ✅ (Gizli olmayanlar + Dahil olduğu projeler) |
| Düzenleme | ✅ | ✅ | ❌ |
| Silme | ✅ | ✅ | ❌ |
| Üye Atama | ✅ | ✅ | ❌ |
| Durum Değiştirme | ✅ | ✅ | ❌ |
| Bütçe Düzenleme | ✅ | ✅ | ❌ |

**Alt Yetkiler:**
- `canAssignMembers`: Üye atama
- `canChangeStatus`: Durum değiştirme
- `canViewAll`: Tüm projeleri görme
- `canEditBudget`: Bütçe düzenleme

**İşleyiş:**
- **Proje Durumları:** active, completed, archived
- **Gizli Projeler:** `isPrivate: true` olan projeler sadece üyeler ve Super Admin tarafından görülebilir
- **Görev Organizasyonu:** Projeler altında görevler organize edilir
- **Bütçe Takibi:** Proje bütçeleri takip edilir

**Özel Durumlar:**
- Projeyi oluşturan kişi her zaman düzenleyebilir ve silebilir
- Gizli olmayan projeler tüm kullanıcılar tarafından görülebilir
- Personnel kullanıcıları proje oluşturamaz
- Personnel kullanıcıları gizli projelere dahil değilse göremez

---

## Genel Yetki Matrisi

| Kaynak | Super Admin | Team Leader | Personnel |
|--------|-------------|-------------|-----------|
| **tasks** | ✅✅✅✅ | ✅✅✅❌ | ❌✅✅❌ |
| **users** | ✅✅✅✅ | ✅✅✅❌ | ✅❌❌❌ |
| **departments** | ✅✅✅✅ | ✅✅✅❌ | ✅❌❌❌ |
| **orders** | ✅✅✅✅ | ✅✅✅✅ | ✅❌❌❌ |
| **production_orders** | ✅✅✅✅ | ✅✅✅✅ | ✅✅✅❌ |
| **customers** | ✅✅✅✅ | ✅✅✅✅ | ✅❌❌❌ |
| **products** | ✅✅✅✅ | ✅✅✅✅ | ✅❌❌❌ |
| **projects** | ✅✅✅✅ | ✅✅✅✅ | ✅❌❌❌ |
| **audit_logs** | ✅✅✅✅ | ✅❌❌❌ | ✅❌❌❌ |
| **role_permissions** | ✅✅✅✅ | ❌❌❌❌ | ❌❌❌❌ |
| **raw_materials** | ✅✅✅✅ | ✅✅✅✅ | ✅❌❌❌ |
| **warranty** | ✅✅✅✅ | ✅✅✅✅ | ✅❌❌❌ |

**Açıklama:** ✅✅✅✅ = Create, Read, Update, Delete (sırasıyla)

---

## Özel Durumlar ve Kurallar

### 1. Görev Görüntüleme Kuralları

- **Gizli Olmayan Görevler:** Tüm kullanıcılar görebilir (yeni kullanıcılar dahil)
- **Gizli Görevler:** Sadece atanan kullanıcılar, oluşturan ve Super Admin görebilir
- **Personnel Kullanıcıları:** Gizli görevlere dahil değilse göremez
- **onlyInMyTasks:** Bu özellik aktifse, görev sadece oluşturan tarafından görülebilir

### 2. Proje Görüntüleme Kuralları

- **Gizli Olmayan Projeler:** Tüm kullanıcılar görebilir
- **Gizli Projeler:** Sadece üyeler ve Super Admin görebilir
- **Personnel Kullanıcıları:** Gizli projelere dahil değilse göremez

### 3. Onay Süreçleri

- **Görev Onayı:** Personnel kullanıcıları görev tamamladığında onay isteği gönderilir
- **Talep Onayı:** Yöneticiler ve ekip liderleri talepleri onaylayabilir/reddedebilir
- **Garanti Onayı:** Yöneticiler ve ekip liderleri garanti kayıtlarını onaylayabilir/reddedebilir

### 4. Stok Yönetimi

- **Otomatik Düşürme:** Üretim siparişleri oluşturulduğunda reçete bazlı hammadde stokundan otomatik düşülür
- **Stok İşlemleri:** Giriş, çıkış, transfer işlemleri kaydedilir
- **Stok Uyarıları:** Düşük stok ve stok tükenme durumlarında uyarılar gösterilir

### 5. Audit Log Sistemi

- Tüm önemli işlemler audit log'a kaydedilir
- CREATE, UPDATE, DELETE işlemleri loglanır
- Kullanıcı, zaman, eski ve yeni değerler kaydedilir
- Sadece Super Admin audit logları görüntüleyebilir

### 6. Aktivite ve Yorum Sistemi

- Orders, Products, Customers, Raw Materials, Warranty kayıtları için aktivite ve yorum eklenebilir
- Her aktivite kullanıcı, zaman ve açıklama bilgisi içerir
- Yorumlar kullanıcılar arası iletişim için kullanılır

### 7. Durum Geçiş Validasyonları

- Siparişler ve üretim siparişleri için durum geçiş validasyonları vardır
- Super Admin validasyonları atlayabilir
- Geçersiz durum geçişleri engellenir

### 8. Cache ve Performans

- Yetki bilgileri cache'lenir ve gerçek zamanlı güncellenir
- Permission cache değişikliklerinde otomatik güncellenir
- Performans için lazy loading kullanılır

---

## Sonuç

Bu dokümantasyon, Revium ERP sistemindeki tüm modüllerin yetki yapısını ve işleyişini detaylı olarak açıklamaktadır. Sistem, rol tabanlı yetki kontrolü ile güvenli ve esnek bir yapı sunar. Her modül için özel yetkiler ve alt yetkiler tanımlanmıştır, böylece kullanıcılar sadece yetkili oldukları işlemleri gerçekleştirebilir.

**Not:** Yetki değişiklikleri `role_permissions` koleksiyonundan yapılır ve anında tüm sistemde geçerli olur.

