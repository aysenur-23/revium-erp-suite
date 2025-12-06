# 📋 Görev (Task) Yetki Sistemi - Detaylı Dokümantasyon

## 🎯 Genel Bakış

Revium ERP'de görev sistemi, kullanıcı rollerine ve görev atamalarına göre detaylı bir yetki kontrolü yapar. Her kullanıcı, rolüne ve görevdeki konumuna göre farklı yetkilere sahiptir.

---

## 👥 Kullanıcı Rolleri

### 1. **Main Admin (Ana Yönetici)**
- **Role:** `main_admin` veya `super_admin`
- **Yetkiler:** Tüm görevlerde tam yetki

### 2. **Admin (Yönetici)**
- **Role:** `admin`, `main_admin` veya `super_admin`
- **Yetkiler:** Tüm görevlerde tam yetki

### 3. **Team Leader (Ekip Lideri)**
- **Role:** Bir departmanın `managerId`'si
- **Yetkiler:** Kendi ekibindeki görevlerde özel yetkiler

### 4. **Normal User (Normal Kullanıcı)**
- **Role:** Standart kullanıcı
- **Yetkiler:** Sadece kendisine atanan görevlerde sınırlı yetki

---

## 🔐 Yetki Kontrol Fonksiyonları

### 1. `canViewTask()` - Görev Görüntüleme Yetkisi

**Dosya:** `src/utils/permissions.ts`

**Mantık:**
```typescript
canViewTask(task, user, assignedUserIds)
```

**Kurallar:**
- ✅ **Main Admin & Admin:** Tüm görevleri görebilir
- ✅ **Gizli Olmayan Görevler:** Herkes görebilir
- ✅ **Gizli Görevler (`isPrivate: true`):**
  - Atanan kullanıcılar görebilir
  - Görevi oluşturan kişi görebilir
  - Adminler görebilir
- ❌ **Diğer durumlar:** Görüntülenemez

**Kullanım Yerleri:**
- Task listelerinde filtreleme
- Task detay modal açılışında kontrol
- Task board'da görev kartlarının gösterilmesi

---

### 2. `canEditTask()` - Görev Düzenleme Yetkisi

**Dosya:** `src/utils/permissions.ts`

**Mantık:**
```typescript
canEditTask(task, user)
```

**Kurallar:**
- ✅ **Main Admin & Admin:** Tüm görevlerin içeriğini düzenleyebilir
- ❌ **Diğer Kullanıcılar:** Görev içeriğini düzenleyemez

**Düzenlenebilen Alanlar:**
- Başlık (`title`)
- Açıklama (`description`)
- Etiketler (`labels`)
- Öncelik (`priority`)
- Bitiş tarihi (`dueDate`)
- Proje bağlantısı (`projectId`)
- Gizlilik ayarı (`isPrivate`)

**Kullanım Yerleri:**
- Task detay modal'da düzenleme butonlarının gösterilmesi
- Task form'larında input alanlarının aktif/pasif olması

---

### 3. `canInteractWithTask()` - Görevle Etkileşim Yetkisi

**Dosya:** `src/utils/permissions.ts`

**Mantık:**
```typescript
canInteractWithTask(task, user, assignedUserIds)
```

**Kurallar:**
- ✅ **Main Admin & Admin:** Tüm görevlerle etkileşim kurabilir
- ✅ **Atanan Kullanıcılar:** Kendilerine atanan görevlerle etkileşim kurabilir
- ❌ **Diğer Kullanıcılar:** Etkileşim kuramaz

**Etkileşim İşlemleri:**
- ✅ Durum değiştirme (`status`)
- ✅ Checklist ekleme/silme
- ✅ Checklist maddesi ekleme/silme/işaretleme
- ✅ Görev taşıma (kanban board'da)
- ✅ Yorum ekleme
- ✅ Dosya ekleme

**Kullanım Yerleri:**
- Checklist işlemlerinde
- Durum değiştirme butonlarında
- Task board'da drag & drop işlemlerinde

---

### 4. `canCreateTask()` - Görev Oluşturma Yetkisi

**Dosya:** `src/utils/permissions.ts`

**Mantık:**
```typescript
canCreateTask(user, departments)
```

**Kurallar:**
- ✅ **Admin:** Görev oluşturabilir
- ✅ **Team Leader:** Görev oluşturabilir
- ❌ **Normal Kullanıcılar:** Görev oluşturamaz

**Kullanım Yerleri:**
- Yeni görev butonunun gösterilmesi
- Görev oluşturma form'larının açılması

---

### 5. `canApproveTask()` - Görev Onaylama Yetkisi

**Dosya:** `src/utils/permissions.ts`

**Mantık:**
```typescript
canApproveTask(task, user, departments)
```

**Kurallar:**
- ✅ **Main Admin:** Tüm görevleri onaylayabilir
- ✅ **Görevi Oluşturan:** Kendi görevlerini onaylayabilir
- ⚠️ **Team Leader:** (Gelecekte ekip bazlı onay eklenecek)

**Kullanım Yerleri:**
- Görev tamamlandığında onay butonlarında
- Onay bekleyen görevler listesinde

---

## 📝 Görev İşlemleri ve Yetkiler

### 1. **Görev Oluşturma**

**Firestore Rules:**
```javascript
allow create: if isAdmin() || isTeamLeader() && createdBy == auth.uid
```

**Frontend Kontrolü:**
- `canCreateTask()` fonksiyonu ile kontrol edilir
- Sadece Admin ve Team Leader görev oluşturabilir

**Oluşturulabilen Alanlar:**
- Tüm görev alanları (başlık, açıklama, öncelik, vb.)

---

### 2. **Görev Görüntüleme**

**Firestore Rules:**
```javascript
allow read: if request.auth != null
```

**Frontend Kontrolü:**
- `canViewTask()` fonksiyonu ile kontrol edilir
- Gizli görevler için özel kontrol yapılır

**Görüntülenebilen Bilgiler:**
- Görev detayları
- Atanan kullanıcılar
- Yorumlar
- Checklist'ler
- Dosyalar
- Aktivite geçmişi

---

### 3. **Görev Düzenleme (İçerik Değişikliği)**

**Firestore Rules:**
```javascript
allow update: if (
  createdBy == auth.uid || 
  isAdmin() ||
  isStatusOrApprovalUpdate() // Sadece durum/onay alanları
)
```

**Frontend Kontrolü:**
- `canEditTask()` fonksiyonu ile kontrol edilir
- Sadece Admin görev içeriğini değiştirebilir

**Düzenlenebilen Alanlar (Sadece Admin):**
- ✅ Başlık
- ✅ Açıklama
- ✅ Etiketler
- ✅ Öncelik
- ✅ Bitiş tarihi
- ✅ Proje bağlantısı
- ✅ Gizlilik ayarı

**Düzenlenemeyen Alanlar (Normal Kullanıcılar):**
- ❌ Başlık
- ❌ Açıklama
- ❌ Etiketler
- ❌ Öncelik

---

### 4. **Görev Durumu Değiştirme**

**Firestore Rules:**
```javascript
isStatusOrApprovalUpdate() // Durum değişikliği izin verilir
```

**Frontend Kontrolü:**
- `canInteractWithTask()` fonksiyonu ile kontrol edilir
- Sadece atanan kullanıcılar ve adminler durum değiştirebilir

**Durum Değiştirme Kuralları:**

#### a) **Normal Durumlar (pending → in_progress → completed)**
- ✅ **Admin:** Tüm durumları değiştirebilir
- ✅ **Atanan Kullanıcı:** Kendi görevlerinin durumunu değiştirebilir
- ❌ **Diğer Kullanıcılar:** Durum değiştiremez

#### b) **Tamamlama (completed) - Özel Durum**
- ✅ **Admin:** Direkt tamamlayabilir
- ✅ **Görevi Oluşturan:** Direkt tamamlayabilir
- ✅ **Team Leader:** Direkt tamamlayabilir
- ⚠️ **Normal Kullanıcı:** Onay isteği gönderir (`requestTaskApproval`)

**Onay Süreci:**
1. Normal kullanıcı görevi "completed" yapar
2. Sistem otomatik olarak `approvalStatus: "pending"` yapar
3. Yöneticiye bildirim gönderilir
4. Yönetici onaylar veya reddeder
5. Onaylanırsa `status: "completed"` olur

---

### 5. **Görev Silme**

**Firestore Rules:**
```javascript
allow delete: if createdBy == auth.uid || isAdmin()
```

**Frontend Kontrolü:**
- Görevi oluşturan kişi veya admin silebilir
- Normal kullanıcılar silemez

---

### 6. **Kullanıcı Atama**

**Firestore Rules:**
```javascript
// assignments subcollection
allow create: if request.auth != null
allow update, delete: if (
  assignedTo == auth.uid || 
  isAdmin() || 
  task.createdBy == auth.uid
)
```

**Frontend Kontrolü:**
- Admin ve görevi oluşturan kişi atama yapabilir
- Atanan kullanıcı kendi atamasını kabul/red edebilir

**Atama İşlemleri:**
- ✅ **Admin:** Herkesi atayabilir
- ✅ **Görevi Oluşturan:** Herkesi atayabilir
- ✅ **Atanan Kullanıcı:** Kendi atamasını kabul/red edebilir
- ❌ **Diğer Kullanıcılar:** Atama yapamaz

---

### 7. **Checklist İşlemleri**

**Firestore Rules:**
```javascript
// checklists subcollection
allow read, create, update: if request.auth != null
allow delete: if createdBy == auth.uid || isAdmin()
```

**Frontend Kontrolü:**
- `canInteractWithTask()` fonksiyonu ile kontrol edilir
- Sadece atanan kullanıcılar ve adminler checklist işlemi yapabilir

**Checklist Yetkileri:**

#### a) **Checklist Oluşturma**
- ✅ **Admin:** Tüm görevlerde checklist oluşturabilir
- ✅ **Atanan Kullanıcı:** Kendi görevlerinde checklist oluşturabilir
- ❌ **Diğer Kullanıcılar:** Checklist oluşturamaz

#### b) **Checklist Silme**
- ✅ **Admin:** Tüm checklist'leri silebilir
- ✅ **Oluşturan:** Kendi checklist'ini silebilir
- ❌ **Diğer Kullanıcılar:** Silemez

#### c) **Checklist Maddesi Ekleme/Silme**
- ✅ **Admin:** Tüm görevlerde madde ekleyebilir/silebilir
- ✅ **Atanan Kullanıcı:** Kendi görevlerinde madde ekleyebilir/silebilir
- ❌ **Diğer Kullanıcılar:** Madde ekleyemez/silemez

#### d) **Checklist Maddesi İşaretleme**
- ✅ **Admin:** Tüm maddeleri işaretleyebilir
- ✅ **Atanan Kullanıcı:** Kendi görevlerindeki maddeleri işaretleyebilir
- ❌ **Diğer Kullanıcılar:** İşaretleyemez

**Kod Örneği:**
```typescript
// TaskDetailModal.tsx
const handleAddChecklist = async () => {
  if (!canInteract) {
    toast.error("Checklist ekleme yetkiniz yok...");
    return;
  }
  // Checklist ekleme işlemi
};
```

---

### 8. **Yorum Ekleme**

**Firestore Rules:**
```javascript
// comments subcollection
allow read, create: if request.auth != null
allow update, delete: if userId == auth.uid || isAdmin()
```

**Frontend Kontrolü:**
- Herkes yorum ekleyebilir (görev görüntüleme yetkisi varsa)
- Sadece yorum sahibi ve admin yorumu düzenleyebilir/silebilir

---

### 9. **Dosya Ekleme**

**Firestore Rules:**
- Dosya ekleme için özel bir kural yok (storage service üzerinden)

**Frontend Kontrolü:**
- `canInteractWithTask()` fonksiyonu ile kontrol edilir
- Sadece atanan kullanıcılar ve adminler dosya ekleyebilir

---

## 🔄 Görev Durumları ve Yetkiler

### Durum Tipleri:
1. **pending** (Beklemede)
2. **in_progress** (Devam Ediyor)
3. **completed** (Tamamlandı)
4. **cancelled** (İptal Edildi)

### Durum Değiştirme Yetkileri:

| Durum | Admin | Atanan Kullanıcı | Diğer Kullanıcılar |
|-------|-------|------------------|-------------------|
| pending → in_progress | ✅ | ✅ | ❌ |
| in_progress → completed | ✅ | ⚠️* | ❌ |
| completed → cancelled | ✅ | ❌ | ❌ |
| Herhangi bir durum | ✅ | Sadece kendi görevi | ❌ |

*Normal kullanıcı completed yaparsa onay isteği gönderilir.

---

## 🎯 Özel Durumlar

### 1. **Gizli Görevler (`isPrivate: true`)**

**Görüntüleme:**
- Sadece atanan kullanıcılar, oluşturan ve adminler görebilir
- Diğer kullanıcılar göremez

**Etkileşim:**
- Normal görevlerle aynı kurallar geçerlidir
- Sadece atanan kullanıcılar etkileşim kurabilir

### 2. **Görev Havuzu (`isInPool: true`)**

**Havuzdan Görev Alma:**
- Kullanıcılar havuzdaki görevlere talep gönderebilir
- Admin veya görevi oluşturan onaylayabilir

### 3. **Onay Süreci (`approvalStatus`)**

**Durumlar:**
- `none`: Onay gerekmiyor
- `pending`: Onay bekliyor
- `approved`: Onaylandı
- `rejected`: Reddedildi

**Onay Yetkileri:**
- Main Admin: Tüm görevleri onaylayabilir
- Görevi Oluşturan: Kendi görevlerini onaylayabilir
- Team Leader: (Gelecekte ekip bazlı onay)

---

## 📊 Yetki Matrisi

| İşlem | Main Admin | Admin | Team Leader | Atanan Kullanıcı | Diğer Kullanıcılar |
|-------|------------|-------|-------------|------------------|-------------------|
| Görev Oluşturma | ✅ | ✅ | ✅ | ❌ | ❌ |
| Görev Görüntüleme | ✅ (Tümü) | ✅ (Tümü) | ✅ (Tümü) | ✅ (Kendi görevi) | ✅ (Gizli değilse) |
| İçerik Düzenleme | ✅ | ✅ | ❌ | ❌ | ❌ |
| Durum Değiştirme | ✅ | ✅ | ✅ | ✅ (Kendi görevi) | ❌ |
| Tamamlama | ✅ | ✅ | ✅ | ⚠️ (Onay gerekir) | ❌ |
| Görev Silme | ✅ | ✅ | ❌ | ❌ | ❌ |
| Kullanıcı Atama | ✅ | ✅ | ✅ | ❌ | ❌ |
| Checklist Ekleme | ✅ | ✅ | ❌ | ✅ (Kendi görevi) | ❌ |
| Checklist Silme | ✅ | ✅ | ❌ | ❌ | ❌ |
| Checklist Madde Ekleme | ✅ | ✅ | ❌ | ✅ (Kendi görevi) | ❌ |
| Checklist Madde İşaretleme | ✅ | ✅ | ❌ | ✅ (Kendi görevi) | ❌ |
| Yorum Ekleme | ✅ | ✅ | ✅ | ✅ (Görüntüleyebiliyorsa) | ✅ (Görüntüleyebiliyorsa) |
| Dosya Ekleme | ✅ | ✅ | ❌ | ✅ (Kendi görevi) | ❌ |
| Onaylama | ✅ | ✅ | ⚠️ | ❌ | ❌ |

**Açıklamalar:**
- ✅ = Tam yetki
- ⚠️ = Koşullu yetki
- ❌ = Yetki yok

---

## 🔒 Firestore Security Rules

### Görev (Task) Kuralları:

```javascript
match /tasks/{taskId} {
  // Okuma: Herkes (giriş yapmış) okuyabilir
  allow read: if request.auth != null;
  
  // Oluşturma: Sadece Admin veya Team Leader
  allow create: if isAdmin() || isTeamLeader() 
    && request.resource.data.createdBy == request.auth.uid;
  
  // Güncelleme:
  // 1. Oluşturan tam yetki
  // 2. Admin tam yetki
  // 3. Diğer kullanıcılar sadece durum/onay alanlarını güncelleyebilir
  allow update: if (
    resource.data.createdBy == request.auth.uid || 
    isAdmin() ||
    isStatusOrApprovalUpdate()
  );
  
  // Silme: Sadece oluşturan veya admin
  allow delete: if (
    resource.data.createdBy == request.auth.uid || 
    isAdmin()
  );
}
```

### Atama (Assignment) Kuralları:

```javascript
match /tasks/{taskId}/assignments/{assignmentId} {
  allow read: if request.auth != null;
  allow create: if request.auth != null;
  allow update, delete: if (
    assignedTo == request.auth.uid || 
    isAdmin() || 
    task.createdBy == request.auth.uid
  );
}
```

### Checklist Kuralları:

```javascript
match /tasks/{taskId}/checklists/{checklistId} {
  // Herkes okuyabilir, oluşturabilir ve güncelleyebilir
  allow read, create, update: if request.auth != null;
  
  // Silme: Sadece oluşturan veya admin
  allow delete: if (
    createdBy == request.auth.uid || 
    isAdmin()
  );
}
```

---

## 💡 Kullanım Örnekleri

### Örnek 1: Checklist Ekleme Kontrolü

```typescript
// TaskDetailModal.tsx
const canInteract = canInteractWithTask(task, user, assignedUserIds);

const handleAddChecklist = async () => {
  if (!canInteract) {
    toast.error("Checklist ekleme yetkiniz yok. Sadece size atanan görevlere checklist ekleyebilirsiniz.");
    return;
  }
  // Checklist ekleme işlemi
};
```

### Örnek 2: Durum Değiştirme Kontrolü

```typescript
// Tasks.tsx
const handleStatusChange = async (taskId: string, status: string) => {
  if (!isAdmin) {
    const taskAssignments = await getTaskAssignments(taskId);
    const assignedUserIds = taskAssignments.map(a => a.assignedTo);
    const isAssigned = assignedUserIds.includes(user.id);
    
    if (!isAssigned) {
      toast.error("Bu görevin durumunu değiştirme yetkiniz yok.");
      return;
    }
  }
  
  // Durum değiştirme işlemi
};
```

### Örnek 3: Görev Görüntüleme Kontrolü

```typescript
// TaskDetailModal.tsx
const canView = canViewTask(task, user, assignedUserIds);

if (!canView) {
  return <div>Bu görevi görüntüleme yetkiniz yok.</div>;
}
```

---

## 🚨 Önemli Notlar

1. **Çift Kontrol:** Hem frontend'de hem Firestore rules'da kontrol yapılır
2. **Atama Kontrolü:** `assignedUsers` array'i ve `assignments` subcollection'ı kontrol edilir
3. **Gizli Görevler:** `isPrivate: true` olan görevler için özel görüntüleme kontrolü yapılır
4. **Onay Süreci:** Normal kullanıcılar görevi tamamlamak için onay isteği göndermelidir
5. **Checklist Yetkileri:** Checklist işlemleri `canInteractWithTask()` ile kontrol edilir

---

## 📚 İlgili Dosyalar

- `src/utils/permissions.ts` - Yetki kontrol fonksiyonları
- `src/services/firebase/taskService.ts` - Görev servis fonksiyonları
- `src/components/Tasks/TaskDetailModal.tsx` - Görev detay modal
- `src/pages/Tasks.tsx` - Görev listesi sayfası
- `src/components/Tasks/TaskBoard.tsx` - Kanban board
- `firestore.rules` - Firestore güvenlik kuralları

---

## 🔄 Güncelleme Notları

- **v1.0** (2024): İlk yetki sistemi implementasyonu
- **v1.1** (2024): Checklist yetki kontrolü eklendi
- **v1.2** (2024): Gizli görev desteği eklendi
- **v1.3** (2024): Onay süreci eklendi

---

**Son Güncelleme:** 2024-11-28

