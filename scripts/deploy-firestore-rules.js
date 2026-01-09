#!/usr/bin/env node
/**
 * Firestore Security Rules Deployment Script
 * Production-ready otomatik deploy script
 * 
 * Kullanım:
 *   npm run deploy:firestore-rules
 *   veya
 *   node scripts/deploy-firestore-rules.js
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Renkli console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, status, message) {
  const icons = {
    info: 'ℹ️',
    success: '✅',
    error: '❌',
    warning: '⚠️',
  };
  const statusColors = {
    info: 'cyan',
    success: 'green',
    error: 'red',
    warning: 'yellow',
  };
  log(`${icons[status]} ${step}: ${message}`, statusColors[status]);
}

// Firebase proje ID'sini .env dosyasından veya .firebaserc'den al
function getFirebaseProjectId() {
  // Önce .firebaserc dosyasını kontrol et
  const firebasercPath = join(rootDir, '.firebaserc');
  if (existsSync(firebasercPath)) {
    try {
      const firebaserc = JSON.parse(readFileSync(firebasercPath, 'utf8'));
      if (firebaserc.projects?.default) {
        return firebaserc.projects.default;
      }
    } catch (error) {
      // .firebaserc parse edilemezse devam et
    }
  }

  // .env dosyasından proje ID'sini al
  const envPath = join(rootDir, '.env');
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf8');
    const match = envContent.match(/VITE_FIREBASE_PROJECT_ID=(.+)/);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  // Varsayılan proje ID (firebase.json'dan veya hardcoded)
  return 'revpad-15232';
}

// Firebase CLI'nin yüklü olup olmadığını kontrol et
function checkFirebaseCLI() {
  try {
    execSync('firebase --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

// Firebase authentication kontrolü
function checkFirebaseAuth() {
  try {
    execSync('firebase projects:list', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

// Ana deploy fonksiyonu
async function deployFirestoreRules() {
  log('\n🚀 Firestore Security Rules Deployment', 'bright');
  log('=====================================\n', 'cyan');

  // 1. Firebase CLI kontrolü
  logStep('Firebase CLI Kontrolü', 'info', 'Kontrol ediliyor...');
  if (!checkFirebaseCLI()) {
    logStep('Firebase CLI', 'error', 'Firebase CLI yüklü değil!');
    log('\n📦 Firebase CLI\'yi yüklemek için:', 'yellow');
    log('   npm install -g firebase-tools\n', 'cyan');
    process.exit(1);
  }
  logStep('Firebase CLI', 'success', 'Yüklü');

  // 2. Firebase Authentication kontrolü
  logStep('Firebase Authentication', 'info', 'Kontrol ediliyor...');
  if (!checkFirebaseAuth()) {
    logStep('Firebase Authentication', 'error', 'Firebase\'e giriş yapılmamış!');
    log('\n🔐 Firebase\'e giriş yapmak için:', 'yellow');
    log('   firebase login\n', 'cyan');
    log('   veya\n', 'cyan');
    log('   firebase login --reauth\n', 'cyan');
    process.exit(1);
  }
  logStep('Firebase Authentication', 'success', 'Giriş yapılmış');

  // 3. Proje ID'sini al
  const projectId = getFirebaseProjectId();
  logStep('Firebase Proje ID', 'info', `Bulundu: ${projectId}`);

  // 4. Projeyi aktif et
  logStep('Proje Aktifleştirme', 'info', 'Proje aktifleştiriliyor...');
  try {
    execSync(`firebase use ${projectId}`, { 
      cwd: rootDir, 
      stdio: 'inherit' 
    });
    logStep('Proje Aktifleştirme', 'success', `Proje aktif: ${projectId}`);
  } catch (error) {
    logStep('Proje Aktifleştirme', 'error', 'Proje aktifleştirilemedi');
    log('\n💡 Çözüm:', 'yellow');
    log(`   firebase use ${projectId}\n`, 'cyan');
    process.exit(1);
  }

  // 5. Firestore rules dosyasını kontrol et
  const rulesPath = join(rootDir, 'firestore.rules');
  if (!existsSync(rulesPath)) {
    logStep('Firestore Rules', 'error', 'firestore.rules dosyası bulunamadı!');
    process.exit(1);
  }
  logStep('Firestore Rules', 'success', 'Dosya bulundu');

  // 6. Deploy işlemi
  logStep('Deploy İşlemi', 'info', 'Firestore rules deploy ediliyor...');
  try {
    execSync('firebase deploy --only firestore:rules', {
      cwd: rootDir,
      stdio: 'inherit'
    });
    logStep('Deploy İşlemi', 'success', 'Firestore rules başarıyla deploy edildi!');
    log('\n✅ Tamamlandı!', 'green');
    log('📝 Kurallar Firebase Console\'da aktif.\n', 'cyan');
  } catch (error) {
    logStep('Deploy İşlemi', 'error', 'Deploy başarısız oldu');
    log('\n❌ Hata detayları yukarıda görüntüleniyor.\n', 'red');
    process.exit(1);
  }
}

// Script'i çalıştır
deployFirestoreRules().catch((error) => {
  logStep('Kritik Hata', 'error', error.message);
  process.exit(1);
});

