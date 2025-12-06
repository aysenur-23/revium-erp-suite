# Revium ERP Suite

Firebase tabanlı ERP yönetim sistemi.

## 🚀 Hızlı Başlangıç

### Firebase Kurulumu

Bu proje Firebase kullanmaktadır. Çalıştırmadan önce Firebase yapılandırması gereklidir:

1. **Firebase Console'da proje oluşturun**: https://console.firebase.google.com/
2. **Authentication'ı etkinleştirin**: Authentication > Get started > Email/Password provider
3. **Firestore Database'i oluşturun**: Firestore Database > Create database > Start in test mode
4. **Config değerlerini alın**: Project Settings > Your apps > Web app > Config
5. **`.env` dosyasını oluşturun**: `.env.example` dosyasını kopyalayıp `.env` olarak kaydedin
6. **Config değerlerini girin**: `.env` dosyasındaki değerleri Firebase Console'dan aldığınız değerlerle doldurun

### Gerekli Firebase Servisleri:
- ✅ **Authentication** (Email/Password) - Zorunlu
- ✅ **Firestore Database** - Zorunlu
- ⚠️ **Storage** - Opsiyonel (dosya yüklemeleri için)
- ⚠️ **Analytics** - Opsiyonel

## Project info

**URL**: https://lovable.dev/projects/8b1dea8b-1cbb-4b1b-b745-3baba918127f

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/8b1dea8b-1cbb-4b1b-b745-3baba918127f) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Configure Firebase
# .env.example dosyasını kopyalayıp .env olarak kaydedin
# Firebase Console'dan (https://console.firebase.google.com/) config değerlerini alın
# Project Settings > Your apps > Web app > Config
cp .env.example .env
# .env dosyasını düzenleyip Firebase değerlerinizi girin

# Step 5: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/8b1dea8b-1cbb-4b1b-b745-3baba918127f) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Demo kullanıcılar

Projeyi test etmek için backend script'lerini kullanarak örnek kullanıcılar oluşturabilirsiniz. Daha sonra bu kullanıcılarla giriş yaparak uygulamanın farklı yetki seviyelerini deneyebilirsiniz.
