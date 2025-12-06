/**
 * API Endpoint Test
 * 
 * Backend API'nin çalışıp çalışmadığını test eder
 * 
 * Kullanım:
 * node test-api.js
 */

import fetch from 'node-fetch';

const testAPI = async () => {
  try {
    console.log('🧪 API endpoint test ediliyor...');
    console.log('URL: http://localhost:3000/api/send-email');
    
    const response = await fetch('http://localhost:3000/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: 'mail@revpad.net',
        subject: 'API Test E-postası - Revium ERP',
        html: '<h1>API Test</h1><p>Backend API çalışıyor!</p><p>Eğer bu e-postayı alıyorsanız, sistem tamamen hazır!</p>',
      }),
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ API başarılı!');
      console.log('Response:', JSON.stringify(result, null, 2));
      console.log('📧 E-posta gönderildi!');
    } else {
      console.log('❌ API hatası:', result);
    }
  } catch (error) {
    console.error('❌ Bağlantı hatası:', error.message);
    console.error('Sunucunun çalıştığından emin olun: cd server && npm start');
  }
};

testAPI();

