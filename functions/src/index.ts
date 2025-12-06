/**
 * Firebase Cloud Functions
 * Bildirim e-posta gönderimi için Firestore trigger
 */

import {setGlobalOptions} from "firebase-functions";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";

// Firebase Admin SDK'yı başlat
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Not: Secrets Blaze planı gerektirir, bu yüzden Environment Variables kullanıyoruz
// Environment Variables Firebase Console > Functions > Configuration > Environment variables'dan ayarlanır

// E-posta gönderici yapılandırması
// Environment Variables kullanıyoruz (Firebase Console'dan ayarlanır)
const createTransporter = () => {
  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
  const smtpUser = process.env.SMTP_USER || "";
  const smtpPassword = process.env.SMTP_PASSWORD || "";

  if (!smtpUser || !smtpPassword) {
    logger.warn("SMTP credentials not configured. Email sending will be disabled.");
    return null;
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
  });
};

// E-posta şablonu oluştur
const createEmailTemplate = (
  title: string,
  message: string,
  type: string,
  relatedId?: string | null,
  appUrl?: string
): string => {
  const baseUrl = appUrl || process.env.APP_URL || "https://revium-erp-suite.web.app";
  let actionUrl = `${baseUrl}/tasks`;
  
  if (relatedId && ['task_assigned', 'task_updated', 'task_completed', 'task_approval'].includes(type)) {
    actionUrl = `${baseUrl}/tasks?taskId=${relatedId}`;
  } else if (relatedId && type === 'order_created') {
    actionUrl = `${baseUrl}/orders`;
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Revium ERP Suite</h1>
  </div>
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
    <h2 style="color: #333; margin-top: 0; font-size: 20px;">${title}</h2>
    <p style="color: #666; font-size: 16px; margin-bottom: 30px;">${message}</p>
    ${relatedId ? `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${actionUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Detayları Görüntüle</a>
    </div>
    ` : ''}
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
    <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
      Bu e-posta Revium ERP Suite tarafından otomatik olarak gönderilmiştir.<br>
      E-posta bildirimlerini ayarlardan yönetebilirsiniz.
    </p>
  </div>
</body>
</html>
  `.trim();
};

// Bildirim oluşturulduğunda e-posta gönder
// Not: Secrets Blaze planı gerektirir. Environment Variables kullanıyoruz.
export const sendNotificationEmail = onDocumentCreated(
  {
    document: "notifications/{notificationId}",
    maxInstances: 10,
    // Secrets kullanmıyoruz - Environment Variables kullanacağız
    // secrets: [] - Blaze planı olmadığı için secrets kullanmıyoruz
  },
  async (event) => {
    const notificationData = event.data?.data();
    const notificationId = event.params.notificationId;

    if (!notificationData) {
      logger.warn(`Notification ${notificationId} has no data`);
      return;
    }

    // E-posta gönderimi için gerekli alanları kontrol et
    const {userId, title, message, type, relatedId} = notificationData;

    if (!userId || !title || !message) {
      logger.warn(`Notification ${notificationId} missing required fields`);
      return;
    }

    try {
      // Kullanıcı bilgilerini al
      const userDoc = await db.collection("users").doc(userId).get();
      
      if (!userDoc.exists) {
        logger.warn(`User ${userId} not found for notification ${notificationId}`);
        return;
      }

      const userData = userDoc.data();
      const userEmail = userData?.email;

      if (!userEmail) {
        logger.warn(`User ${userId} has no email address`);
        return;
      }

      // Environment Variables kullanıyoruz (Secrets Blaze planı gerektirir)
      // process.env değerleri otomatik olarak Firebase Environment Variables'dan gelir

      // E-posta gönderici oluştur (Environment Variables kullanarak)
      const transporter = createTransporter();
      
      if (!transporter) {
        logger.warn("Email transporter not configured, skipping email send");
        return;
      }

      // E-posta içeriğini oluştur
      const appUrl = process.env.APP_URL || "https://revpad.net";
      const emailHtml = createEmailTemplate(title, message, type, relatedId, appUrl);
      const emailFrom = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@reviumtech.com";

      // E-posta gönder
      const mailOptions = {
        from: `"Revium ERP Suite" <${emailFrom}>`,
        to: userEmail,
        subject: `Revium ERP - ${title}`,
        html: emailHtml,
      };

      const info = await transporter.sendMail(mailOptions);
      logger.info(`Email sent successfully for notification ${notificationId}`, {
        messageId: info.messageId,
        to: userEmail,
      });
    } catch (error) {
      logger.error(`Error sending email for notification ${notificationId}:`, error);
      // E-posta gönderim hatası bildirim oluşturmayı engellemez
    }
  }
);

// Global options
setGlobalOptions({maxInstances: 10});
