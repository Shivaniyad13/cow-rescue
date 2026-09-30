/**
 * Alert Service — NGO ko rescue case ka alert bhejo
 *
 * Email: REAL (Gmail SMTP via nodemailer)
 * SMS: MOCK (baad mein Fast2SMS/Gupshup integrate karenge)
 * WhatsApp: MOCK (baad mein Gupshup/WATI integrate karenge)
 */

const { query } = require('../config/database');
const { addTimelineEvent } = require('./timeline.service');
const { generateAlertToken, getTokenExpiry, buildMagicLink } = require('../utils/alertToken');
const sender = require('./sender.service');

// ==================== MESSAGE BUILDERS ====================

/**
 * Plain text alert message (SMS/fallback ke liye)
 */
function buildAlertMessage(caseData, ngo, magicLink) {
  return `
🐄 URGENT: Injured cow needs rescue!

Case ID: ${caseData.case_id}
Location: ${caseData.city || ''}, ${caseData.district || ''}, ${caseData.state || ''}
Condition: ${caseData.animal_condition || 'Injured'}
Severity: ${caseData.severity || 'MEDIUM'}

You are the nearest eligible partner.

Accept: ${magicLink}
Reject: ${magicLink}?action=reject

Please respond within 15 minutes.
  `.trim();
}

/**
 * HTML email body (sundar buttons ke saath)
 */
function buildAlertEmailHTML(caseData, ngo, magicLink) {
  const acceptUrl = magicLink;
  const rejectUrl = `${magicLink}?action=reject`;

  return `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
    <div style="background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
      <h1 style="margin: 0; font-size: 24px;">🐄 URGENT: Cow Rescue Alert</h1>
    </div>

    <div style="background: white; padding: 25px; border-radius: 0 0 8px 8px;">
      <p style="font-size: 16px; color: #333;">Dear <strong>${ngo.name}</strong>,</p>

      <p style="font-size: 15px; color: #555;">
        A cow needs rescue near your area. You are the nearest eligible partner.
      </p>

      <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Case ID:</strong> ${caseData.case_id}</p>
        <p style="margin: 5px 0;"><strong>Condition:</strong> ${caseData.animal_condition || 'Injured'}</p>
        <p style="margin: 5px 0;"><strong>Severity:</strong> ${caseData.severity || 'MEDIUM'}</p>
        <p style="margin: 5px 0;"><strong>Location:</strong> ${caseData.city || ''}, ${caseData.district || ''}, ${caseData.state || ''}</p>
        <p style="margin: 5px 0;"><strong>Address:</strong> ${caseData.address || 'N/A'}</p>
      </div>

      <p style="font-size: 15px; color: #555;">
        Please respond within <strong>15 minutes</strong>:
      </p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${acceptUrl}" style="display: inline-block; background: #16a34a; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; margin: 5px;">
          ✅ ACCEPT CASE
        </a>
        <a href="${rejectUrl}" style="display: inline-block; background: #dc2626; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; margin: 5px;">
          ❌ REJECT CASE
        </a>
      </div>

      <p style="font-size: 13px; color: #888; margin-top: 30px;">
        Or copy this link: <br>
        <a href="${magicLink}" style="color: #2563eb;">${magicLink}</a>
      </p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;">
      <p style="font-size: 12px; color: #999; text-align: center;">
        Cow Rescue Platform — Connecting People, Services and Compassion
      </p>
    </div>
  </div>
  `;
}

// ==================== SEND ALERT ====================

/**
 * NGO ko alert bhejo
 */
async function sendAlertToNGO(caseData, ngo, priority = 1) {
  // 1. Token generate karo
  const token = generateAlertToken();
  const expiresAt = getTokenExpiry(24);

   // Response deadline set karo (NGO ko kitni der mein respond karna hai)
  const responseMinutes = Number(process.env.ALERT_RESPONSE_MINUTES) || 15;
  const responseDeadline = new Date();
  responseDeadline.setMinutes(responseDeadline.getMinutes() + responseMinutes);

  const insertSql = `
    INSERT INTO case_alerts (
      case_id, ngo_id, token, token_expires_at, priority, channel, status, response_deadline
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *;
  `;

  const insertValues = [
    caseData.case_id,
    ngo.id,
    token,
    expiresAt,
    priority,
    'EMAIL',
    'SENT',
    responseDeadline,
  ];

  const insertResult = await query(insertSql, insertValues);
  const alert = insertResult.rows[0];

  // 3. Magic link banao
  const magicLink = buildMagicLink(token);

  // 4. Message banao
  const message = buildAlertMessage(caseData, ngo, magicLink);
  const htmlBody = buildAlertEmailHTML(caseData, ngo, magicLink);

  // 5. Bhejo — Email pehle (REAL), phir SMS (MOCK)
  const senderResults = [];

  // Email — REAL
  if (ngo.email) {
    const subject = `🐄 Cow Rescue Alert: ${caseData.case_id} — Action Required`;
    const emailResult = await sender.sendEmail(ngo.email, subject, message, htmlBody);
    senderResults.push(emailResult);
  }

  // SMS — MOCK
  if (ngo.phone) {
    const smsResult = await sender.sendSMS(ngo.phone, message);
    senderResults.push(smsResult);
  }

  // 6. Timeline mein record karo
  await addTimelineEvent(
    caseData.case_id,
    'NGO_ALERT_SENT',
    `Alert sent to ${ngo.name} (${ngo.email || ngo.phone || 'no contact'})`,
    'System',
    {
      ngo_id: ngo.id,
      ngo_name: ngo.name,
      alert_id: alert.id,
      priority,
      channels: senderResults.map((r) => ({
        channel: r.channel,
        success: r.success,
        provider: r.provider,
      })),
      magic_link: magicLink,
    }
  );

   return {
    alert_id: alert.id,
    token,
    magic_link: magicLink,
    response_deadline: alert.response_deadline,
    sent_to: {
      ngo_id: ngo.id,
      ngo_name: ngo.name,
      phone: ngo.phone,
      email: ngo.email,
    },
    channels: senderResults,
  };
}

// ==================== READ ====================

/**
 * Token se alert dhoondho
 */
async function getAlertByToken(token) {
  const sql = `
    SELECT
      a.*,
      c.reporter_name, c.reporter_phone, c.animal_condition, c.description,
      c.severity, c.latitude, c.longitude, c.address, c.city, c.district, c.state,
      n.name as ngo_name, n.phone as ngo_phone, n.email as ngo_email
    FROM case_alerts a
    LEFT JOIN cases c ON a.case_id = c.case_id
    LEFT JOIN ngos n ON a.ngo_id = n.id
    WHERE a.token = $1;
  `;

  const result = await query(sql, [token]);
  return result.rows[0] || null;
}

/**
 * Case ke saare alerts
 */
async function getAlertsForCase(caseId) {
  const sql = `
    SELECT
      a.*,
      n.name as ngo_name,
      n.phone as ngo_phone,
      n.email as ngo_email
    FROM case_alerts a
    LEFT JOIN ngos n ON a.ngo_id = n.id
    WHERE a.case_id = $1
    ORDER BY a.created_at DESC;
  `;

  const result = await query(sql, [caseId]);
  return result.rows;
}

// ==================== UPDATE RESPONSE ====================

/**
 * Alert ka response record karo
 */
async function recordAlertResponse(token, response, note = null) {
  if (!['ACCEPTED', 'REJECTED'].includes(response)) {
    throw new Error('Response must be ACCEPTED or REJECTED');
  }

  const sql = `
    UPDATE case_alerts
    SET status = 'RESPONDED',
        response = $1,
        responded_at = CURRENT_TIMESTAMP,
        note = $2
    WHERE token = $3
      AND status = 'SENT'
    RETURNING *;
  `;

  const result = await query(sql, [response, note, token]);
  return result.rows[0] || null;
}

// ==================== EXPORTS ====================

module.exports = {
  sendAlertToNGO,
  getAlertByToken,
  getAlertsForCase,
  recordAlertResponse,
  buildAlertMessage,
  buildAlertEmailHTML,
};