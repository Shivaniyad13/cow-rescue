/**
 * Sender Service — Email (SMTP via nodemailer) aur SMS/WhatsApp (mock)
 *
 * Email: REAL (Gmail SMTP)
 * SMS: MOCK (baad mein integrate karenge)
 * WhatsApp: MOCK (baad mein integrate karenge)
 */

const nodemailer = require('nodemailer');

// ==================== TRANSPORTER SETUP ====================

let transporter = null;

/**
 * Nodemailer transporter banao (ek baar)
 */
function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('⚠️  SMTP credentials missing in .env — email sending disabled');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
}

// ==================== EMAIL (REAL) ====================

/**
 * Email bhejo
 */
async function sendEmail(to, subject, body, htmlBody = null) {
  const t = getTransporter();

  if (!t) {
    console.warn('⚠️  Email skipped (no SMTP config). To:', to);
    return {
      success: false,
      channel: 'EMAIL',
      provider: 'SMTP',
      error: 'SMTP not configured',
    };
  }

  try {
    const fromName = process.env.SMTP_FROM_NAME || 'Cow Rescue Platform';
    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;
    const from = `"${fromName}" <${fromAddress}>`;

    const info = await t.sendMail({
      from,
      to,
      subject,
      text: body,
      html: htmlBody || `<pre style="font-family: Arial, sans-serif; white-space: pre-wrap;">${body}</pre>`,
    });

    console.log('');
    console.log('📧 ============================================');
    console.log('📧 EMAIL SENT (REAL)');
    console.log('📧 ============================================');
    console.log(`   To: ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Message ID: ${info.messageId}`);
    console.log('📧 ============================================');
    console.log('');

    return {
      success: true,
      channel: 'EMAIL',
      provider: 'SMTP',
      messageId: info.messageId,
    };
  } catch (error) {
    console.error('❌ Email send failed:', error.message);
    return {
      success: false,
      channel: 'EMAIL',
      provider: 'SMTP',
      error: error.message,
    };
  }
}

// ==================== SMS (MOCK) ====================

async function sendSMS(phone, message) {
  console.log('');
  console.log('📱 ============================================');
  console.log('📱 MOCK SMS (not actually sent)');
  console.log('📱 ============================================');
  console.log(`   To: ${phone}`);
  console.log(`   Message: ${message}`);
  console.log('📱 ============================================');
  console.log('');

  // TODO: Fast2SMS / Gupshup / Twilio integrate karo
  return { success: true, channel: 'SMS', provider: 'MOCK' };
}

// ==================== WHATSAPP (MOCK) ====================

async function sendWhatsApp(phone, message) {
  console.log('');
  console.log('💬 ============================================');
  console.log('💬 MOCK WHATSAPP (not actually sent)');
  console.log('💬 ============================================');
  console.log(`   To: ${phone}`);
  console.log(`   Message: ${message}`);
  console.log('💬 ============================================');
  console.log('');

  // TODO: Gupshup / WATI / Twilio integrate karo
  return { success: true, channel: 'WHATSAPP', provider: 'MOCK' };
}

// ==================== VERIFY SMTP ====================

/**
 * SMTP connection test karo
 */
async function verifySMTP() {
  const t = getTransporter();
  if (!t) return false;

  try {
    await t.verify();
    console.log('✅ SMTP connection verified');
    return true;
  } catch (error) {
    console.error('❌ SMTP verification failed:', error.message);
    return false;
  }
}

module.exports = {
  sendEmail,
  sendSMS,
  sendWhatsApp,
  verifySMTP,
};