/**
 * Admin Service — Admin dashboard ke liye queries
 */

const { query } = require('../config/database');

// ==================== STATS ====================

/**
 * Dashboard ke liye overview stats
 */
async function getDashboardStats() {
  // Cases by status
  const casesByStatus = await query(`
    SELECT status, COUNT(*)::int as count
    FROM cases
    GROUP BY status
    ORDER BY count DESC;
  `);

  // Cases by severity
  const casesBySeverity = await query(`
    SELECT severity, COUNT(*)::int as count
    FROM cases
    GROUP BY severity;
  `);

  // Totals
  const totals = await query(`
    SELECT
      (SELECT COUNT(*)::int FROM cases) as total_cases,
      (SELECT COUNT(*)::int FROM cases WHERE status NOT IN ('COMPLETED','CANCELLED')) as active_cases,
      (SELECT COUNT(*)::int FROM cases WHERE status = 'COMPLETED') as completed_cases,
      (SELECT COUNT(*)::int FROM ngos) as total_ngos,
      (SELECT COUNT(*)::int FROM ngos WHERE is_active = true) as active_ngos,
      (SELECT COUNT(*)::int FROM ngos WHERE is_verified = true) as verified_ngos,
      (SELECT COUNT(*)::int FROM ngos WHERE opted_in_for_alerts = true) as opted_in_ngos,
      (SELECT COUNT(*)::int FROM case_alerts) as total_alerts,
      (SELECT COUNT(*)::int FROM case_alerts WHERE status = 'SENT') as pending_alerts,
      (SELECT COUNT(*)::int FROM case_alerts WHERE response = 'ACCEPTED') as accepted_alerts,
      (SELECT COUNT(*)::int FROM case_alerts WHERE response = 'REJECTED') as rejected_alerts,
      (SELECT COUNT(*)::int FROM case_alerts WHERE status = 'EXPIRED') as expired_alerts;
  `);

  // Today's cases
  const today = await query(`
    SELECT COUNT(*)::int as count
    FROM cases
    WHERE created_at >= CURRENT_DATE;
  `);

  return {
    totals: totals.rows[0],
    today_cases: today.rows[0].count,
    cases_by_status: casesByStatus.rows,
    cases_by_severity: casesBySeverity.rows,
  };
}

// ==================== NGO MANAGEMENT ====================

/**
 * NGO list with filters
 */
async function listNGOs(filters = {}) {
  const conditions = [];
  const values = [];
  let paramIndex = 1;

  if (filters.state) {
    conditions.push(`state = $${paramIndex++}`);
    values.push(filters.state);
  }
  if (filters.district) {
    conditions.push(`district = $${paramIndex++}`);
    values.push(filters.district);
  }
  if (filters.isActive !== undefined) {
    conditions.push(`is_active = $${paramIndex++}`);
    values.push(filters.isActive);
  }
  if (filters.isVerified !== undefined) {
    conditions.push(`is_verified = $${paramIndex++}`);
    values.push(filters.isVerified);
  }
  if (filters.optedInForAlerts !== undefined) {
    conditions.push(`opted_in_for_alerts = $${paramIndex++}`);
    values.push(filters.optedInForAlerts);
  }
  if (filters.search) {
    conditions.push(`(name ILIKE $${paramIndex} OR city ILIKE $${paramIndex})`);
    values.push(`%${filters.search}%`);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = Math.min(Number(filters.limit) || 20, 100);
  const offset = Number(filters.offset) || 0;

  const sql = `
    SELECT * FROM ngos
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex++};
  `;
  values.push(limit, offset);

  const result = await query(sql, values);

  const countSql = `SELECT COUNT(*)::int FROM ngos ${whereClause};`;
  const countResult = await query(countSql, values.slice(0, -2));

  return {
    data: result.rows,
    total: countResult.rows[0].count,
    limit,
    offset,
  };
}

/**
 * NGO verify/unverify
 */
async function setNGOVerified(ngoId, isVerified) {
  const result = await query(
    'UPDATE ngos SET is_verified = $1 WHERE id = $2 RETURNING id, name, is_verified',
    [isVerified, ngoId]
  );
  return result.rows[0] || null;
}

/**
 * NGO alert opt-in toggle
 */
async function setNGOOptIn(ngoId, optedIn) {
  const result = await query(
    'UPDATE ngos SET opted_in_for_alerts = $1 WHERE id = $2 RETURNING id, name, opted_in_for_alerts',
    [optedIn, ngoId]
  );
  return result.rows[0] || null;
}

// ==================== ALERTS ====================

/**
 * Alert history with filters
 */
async function listAlerts(filters = {}) {
  const conditions = [];
  const values = [];
  let paramIndex = 1;

  if (filters.caseId) {
    conditions.push(`a.case_id = $${paramIndex++}`);
    values.push(filters.caseId);
  }
  if (filters.ngoId) {
    conditions.push(`a.ngo_id = $${paramIndex++}`);
    values.push(filters.ngoId);
  }
  if (filters.status) {
    conditions.push(`a.status = $${paramIndex++}`);
    values.push(filters.status);
  }
  if (filters.response) {
    conditions.push(`a.response = $${paramIndex++}`);
    values.push(filters.response);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = Math.min(Number(filters.limit) || 20, 100);
  const offset = Number(filters.offset) || 0;

  const sql = `
    SELECT
      a.*,
      n.name as ngo_name,
      n.phone as ngo_phone,
      n.email as ngo_email,
      c.animal_condition, c.severity, c.city, c.district, c.state
    FROM case_alerts a
    LEFT JOIN ngos n ON a.ngo_id = n.id
    LEFT JOIN cases c ON a.case_id = c.case_id
    ${whereClause}
    ORDER BY a.created_at DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex++};
  `;
  values.push(limit, offset);

  const result = await query(sql, values);

  const countSql = `SELECT COUNT(*)::int FROM case_alerts a ${whereClause};`;
  const countResult = await query(countSql, values.slice(0, -2));

  return {
    data: result.rows,
    total: countResult.rows[0].count,
    limit,
    offset,
  };
}

// ==================== FULL CASE ====================

/**
 * Case ki poori detail — case + timeline + alerts + NGO info
 */
async function getFullCase(caseId) {
  // Case
  const caseResult = await query('SELECT * FROM cases WHERE case_id = $1', [caseId]);
  const caseData = caseResult.rows[0];
  if (!caseData) return null;

  // Timeline
  const timelineResult = await query(
    'SELECT * FROM case_timeline WHERE case_id = $1 ORDER BY created_at ASC',
    [caseId]
  );

  // Alerts
  const alertsResult = await query(
    `SELECT
      a.*,
      n.name as ngo_name, n.phone as ngo_phone, n.email as ngo_email
     FROM case_alerts a
     LEFT JOIN ngos n ON a.ngo_id = n.id
     WHERE a.case_id = $1
     ORDER BY a.created_at DESC`,
    [caseId]
  );

  // Assigned NGO (if any)
  let assignedNGO = null;
  if (caseData.assigned_ngo_id) {
    const ngoResult = await query(
      'SELECT id, name, phone, email, city, district, state FROM ngos WHERE id = $1',
      [caseData.assigned_ngo_id]
    );
    assignedNGO = ngoResult.rows[0] || null;
  }

  return {
    case: caseData,
    assigned_ngo: assignedNGO,
    timeline: timelineResult.rows,
    alerts: alertsResult.rows,
  };
}

module.exports = {
  getDashboardStats,
  listNGOs,
  setNGOVerified,
  setNGOOptIn,
  listAlerts,
  getFullCase,
};