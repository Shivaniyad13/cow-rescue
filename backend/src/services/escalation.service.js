/**
 * Escalation Service — Expired alerts ko auto-escalate karo
 *
 * Logic:
 *   1. Expired alerts dhoondho (status = SENT, deadline cross)
 *   2. Uss case ke liye next eligible NGO dhoondho
 *   3. Naya alert bhejo
 *   4. Purane alert ko EXPIRED mark karo
 *   5. Timeline mein event add karo
 */

const { query } = require('../config/database');
const { addTimelineEvent } = require('./timeline.service');
const { sendAlertToNGO } = require('./alert.service');

/**
 * Expired alerts dhoondho
 */
async function findExpiredAlerts() {
  const sql = `
    SELECT
      a.*,
      c.case_id as case_id,
      c.latitude, c.longitude, c.city, c.district, c.state,
      c.animal_condition, c.severity, c.address,
      n.name as ngo_name
    FROM case_alerts a
    LEFT JOIN cases c ON a.case_id = c.case_id
    LEFT JOIN ngos n ON a.ngo_id = n.id
    WHERE a.status = 'SENT'
      AND a.response_deadline IS NOT NULL
      AND a.response_deadline < CURRENT_TIMESTAMP
      AND c.status NOT IN ('COMPLETED', 'CANCELLED', 'GOVERNMENT_HANDLING', 'PARTNER_ACCEPTED')
    ORDER BY a.response_deadline ASC;
  `;

  const result = await query(sql);
  return result.rows;
}

/**
 * Alert ko EXPIRED mark karo
 */
async function markAlertExpired(alertId) {
  const sql = `
    UPDATE case_alerts
    SET status = 'EXPIRED',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *;
  `;

  const result = await query(sql, [alertId]);
  return result.rows[0] || null;
}

/**
 * Case ke liye next eligible NGO dhoondho (jo already try nahi hua)
 */
async function findNextEligibleNGO(caseData) {
  // Already tried NGOs
  const triedResult = await query(
    'SELECT DISTINCT ngo_id FROM case_alerts WHERE case_id = $1',
    [caseData.case_id]
  );
  const triedNgoIds = triedResult.rows.map((r) => r.ngo_id);

  // Eligible NGOs, nearest first
  const placeholders = triedNgoIds.length > 0
    ? `AND id NOT IN (${triedNgoIds.map((_, i) => `$${i + 4}`).join(', ')})`
    : '';

  const params = [
    caseData.latitude,
    caseData.longitude,
    200, // 200 km radius
    ...triedNgoIds,
  ];

  const sql = `
    SELECT *,
      (6371 * acos(
        cos(radians($1)) * cos(radians(latitude)) *
        cos(radians(longitude) - radians($2)) +
        sin(radians($1)) * sin(radians(latitude))
      )) AS distance_km
    FROM ngos
    WHERE is_active = true
      AND is_verified = true
      AND opted_in_for_alerts = true
      AND can_handle_cow_rescue = true
      AND latitude IS NOT NULL
      AND longitude IS NOT NULL
      AND (6371 * acos(
        cos(radians($1)) * cos(radians(latitude)) *
        cos(radians(longitude) - radians($2)) +
        sin(radians($1)) * sin(radians(latitude))
      )) <= $3
      ${placeholders}
    ORDER BY distance_km ASC
    LIMIT 1;
  `;

  const result = await query(sql, params);
  return result.rows[0] || null;
}

/**
 * Ek expired alert ko escalate karo
 */
async function escalateAlert(expiredAlert) {
  const caseData = expiredAlert;

  // 1. Purane alert ko EXPIRED mark karo
  await markAlertExpired(expiredAlert.id);

  // 2. Timeline: alert expired
  await addTimelineEvent(
    expiredAlert.case_id,
    'ALERT_EXPIRED',
    `Alert to ${expiredAlert.ngo_name} expired (no response in ${process.env.ALERT_RESPONSE_MINUTES || 15} min)`,
    'System',
    {
      expired_alert_id: expiredAlert.id,
      ngo_id: expiredAlert.ngo_id,
      ngo_name: expiredAlert.ngo_name,
    }
  );

  // 3. Next eligible NGO dhoondho
  const nextNGO = await findNextEligibleNGO(caseData);

  if (!nextNGO) {
    // Koi NGO nahi bachi — manual intervention needed
    await addTimelineEvent(
      expiredAlert.case_id,
      'NO_MORE_NGOS',
      'All eligible NGOs have been alerted. Manual intervention required.',
      'System',
      { case_id: expiredAlert.case_id }
    );
    return {
      escalated: false,
      reason: 'NO_MORE_NGOS',
      expired_alert_id: expiredAlert.id,
    };
  }

  // 4. Naya alert bhejo
  const newAlert = await sendAlertToNGO(caseData, nextNGO, 2);

  // 5. Purane alert mein escalated_to_ngo_id set karo
  await query(
    'UPDATE case_alerts SET escalated_to_ngo_id = $1 WHERE id = $2',
    [nextNGO.id, expiredAlert.id]
  );

  // 6. Timeline: escalated
  await addTimelineEvent(
    expiredAlert.case_id,
    'ALERT_ESCALATED',
    `Escalated to next NGO: ${nextNGO.name} (${parseFloat(nextNGO.distance_km).toFixed(1)} km away)`,
    'System',
    {
      from_ngo: expiredAlert.ngo_name,
      to_ngo: nextNGO.name,
      to_ngo_id: nextNGO.id,
      new_alert_id: newAlert.alert_id,
    }
  );

  return {
    escalated: true,
    expired_alert_id: expiredAlert.id,
    new_alert_id: newAlert.alert_id,
    from_ngo: expiredAlert.ngo_name,
    to_ngo: nextNGO.name,
    new_alert_token: newAlert.token,
  };
}

/**
 * Saare expired alerts ko process karo
 * Ye function background job se call hoga
 */
async function processExpiredAlerts() {
  const expiredAlerts = await findExpiredAlerts();

  if (expiredAlerts.length === 0) {
    return { processed: 0, escalated: 0, failed: 0 };
  }

  const results = {
    processed: expiredAlerts.length,
    escalated: 0,
    failed: 0,
    details: [],
  };

  for (const alert of expiredAlerts) {
    try {
      const result = await escalateAlert(alert);
      if (result.escalated) {
        results.escalated++;
      }
      results.details.push(result);
    } catch (error) {
      console.error(`❌ Escalation failed for alert ${alert.id}:`, error.message);
      results.failed++;
      results.details.push({
        alert_id: alert.id,
        error: error.message,
      });
    }
  }

  return results;
}

module.exports = {
  findExpiredAlerts,
  markAlertExpired,
  findNextEligibleNGO,
  escalateAlert,
  processExpiredAlerts,
};