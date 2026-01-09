# Firestore Security Rules Yayınlama

## Sorun
Firestore Security Rules Firebase Console'da yayınlanmamış. Bu yüzden "Missing or insufficient permissions" hatası alıyorsunuz.

## Çözüm

### Adım 1: Firebase Console'a Gidin
https://console.firebase.google.com/project/revpad-15232/firestore/rules

### Adım 2: Mevcut Kuralları Kontrol Edin
Eğer test mode'da ise (allow read, write: if true), aşağıdaki kuralları yapıştırın.

### Adım 3: firestore.rules Dosyasını Açın
Proje kök dizinindeki `firestore.rules` dosyasını açın ve tüm içeriğini kopyalayın.

### Adım 4: Firebase Console'da Yapıştırın
1. Firebase Console'da Firestore Rules editörüne gidin
2. Tüm mevcut içeriği silin
3. `firestore.rules` dosyasının içeriğini yapıştırın
4. **"Publish"** butonuna tıklayın

### Adım 5: Doğrulama
Kurallar yayınlandıktan sonra tarayıcıyı yenileyin (F5). Permission hataları gitmeli.

## Not
Eğer Firebase CLI ile deploy etmek isterseniz:
```bash
firebase login --reauth
firebase use revpad-15232
firebase deploy --only firestore:rules
```

