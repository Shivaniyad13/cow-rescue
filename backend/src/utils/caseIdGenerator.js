/**
 * Case ID Generator
 * Unique case ID banata hai: CASE-2026-000001
 *
 * Approach:
 *   1. Ek temporary unique ID se insert karo
 *   2. PostgreSQL se auto-generated `id` lo
 *   3. Us id se final case_id banao
 *   4. Update kar do
 */

const { query } = require('../config/database');

/**
 * Case ID ka format banao
 * @param {number} id - Case ka database id
 * @returns {string} - "CASE-2026-000001"
 */
function formatCaseId(id) {
  const year = new Date().getFullYear();
  const padded = String(id).padStart(6, '0');
  return `CASE-${year}-${padded}`;
}

/**
 * Temporary unique ID banao (insert ke waqt use hoga)
 */
function generateTempId() {
  return `TEMP-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Insert ke baad final case_id update karo
 * @param {number} id - Database id
 * @returns {Object} - Updated case row
 */
async function finalizeCaseId(id) {
  const caseId = formatCaseId(id);
  const result = await query(
    'UPDATE cases SET case_id = $1 WHERE id = $2 RETURNING *',
    [caseId, id]
  );
  return result.rows[0];
}

module.exports = {
  formatCaseId,
  generateTempId,
  finalizeCaseId,
};