/**
 * Timeline Service — Case ka history track karta hai
 *
 * Har case ke saath events ka list:
 *   - Kaun ne kya kiya
 *   - Kab kiya
 *   - Extra data (metadata)
 */

const { query } = require('../config/database');

/**
 * Timeline mein naya event add karo
 */
async function addTimelineEvent(caseId, event, description, performedBy = 'System', metadata = null) {
  const sql = `
    INSERT INTO case_timeline (case_id, event, description, performed_by, metadata)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;
  const values = [caseId, event, description, performedBy, metadata];
  const result = await query(sql, values);
  return result.rows[0];
}

/**
 * Case ka poora timeline fetch karo (oldest first)
 */
async function getCaseTimeline(caseId) {
  const sql = `
    SELECT * FROM case_timeline
    WHERE case_id = $1
    ORDER BY created_at ASC;
  `;
  const result = await query(sql, [caseId]);
  return result.rows;
}

module.exports = {
  addTimelineEvent,
  getCaseTimeline,
};