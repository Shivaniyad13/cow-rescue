/**
 * Case Service — Rescue Case ke saare operations
 */
const matchService = require('./match.service');
const { reverseGeocode, isLocationInIndia } = require('../utils/location');
const { query } = require('../config/database');
const { validateCaseData, VALID_CASE_STATUSES } = require('../utils/validators');
const { generateTempId, finalizeCaseId } = require('../utils/caseIdGenerator');
const { addTimelineEvent } = require('./timeline.service');

// ==================== CREATE ====================

/**
 * Nayi rescue case banao
 */
async function createCase(caseData) {
  // 1. Validate
  const validation = validateCaseData(caseData);
  if (!validation.isValid) {
    const error = new Error('Validation failed');
    error.status = 400;
    error.details = validation.errors;
    throw error;
  }

  // 2. India check karo — REJECT nahi, sirf FLAG karo
  const locationInIndia = isLocationInIndia(caseData.latitude, caseData.longitude);
  if (!locationInIndia) {
    console.warn(
      `⚠️  Location outside India: ${caseData.latitude}, ${caseData.longitude}`
    );
  }

  // 3. Auto-fill location (agar state/district/city missing hai)
  let autoLocation = {};
  if (!caseData.state || !caseData.district || !caseData.city) {
    try {
      const geocoded = await reverseGeocode(caseData.latitude, caseData.longitude);
      if (geocoded) {
        autoLocation = {
          state: caseData.state || geocoded.state,
          district: caseData.district || geocoded.district,
          city: caseData.city || geocoded.city,
          pincode: caseData.pincode || geocoded.pincode,
          address: caseData.address || geocoded.full_address,
        };
      }
    } catch (e) {
      console.error('Auto geocoding failed, proceeding with provided data');
    }
  }

  // 4. Insert case with temp ID
  const tempId = generateTempId();

  const sql = `
    INSERT INTO cases (
      case_id, reporter_name, reporter_phone, reporter_email, reporter_user_id,
      animal_type, animal_condition, description, severity,
      address, latitude, longitude, state, district, city, pincode,
      photo_url, video_url, status, government_route_status
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
      $17, $18, $19, $20
    ) RETURNING *;
  `;

  const values = [
    tempId,
    caseData.reporter_name,
    caseData.reporter_phone,
    caseData.reporter_email || null,
    caseData.reporter_user_id || null,
    caseData.animal_type || 'Cow',
    caseData.animal_condition || null,
    caseData.description || null,
    caseData.severity || 'MEDIUM',
    autoLocation.address || caseData.address || null,
    caseData.latitude,
    caseData.longitude,
    autoLocation.state || caseData.state || null,
    autoLocation.district || caseData.district || null,
    autoLocation.city || caseData.city || null,
    autoLocation.pincode || caseData.pincode || null,
    caseData.photo_url || null,
    caseData.video_url || null,
    'REPORTED',
    'NOT_CHECKED',
  ];

  const insertResult = await query(sql, values);
  const tempCase = insertResult.rows[0];

  // 5. Final case_id set karo (CASE-2026-000001)
  const finalCase = await finalizeCaseId(tempCase.id);

  // 6. Timeline — case reported
  await addTimelineEvent(
    finalCase.case_id,
    'CASE_REPORTED',
    `Case reported by ${caseData.reporter_name}`,
    caseData.reporter_name,
    { severity: finalCase.severity, animal_condition: finalCase.animal_condition }
  );

  // 7. Agar auto-location fill hui, toh timeline mein note karo
  if (Object.keys(autoLocation).length > 0) {
    await addTimelineEvent(
      finalCase.case_id,
      'LOCATION_AUTO_FILLED',
      'Location auto-detected from coordinates',
      'System',
      autoLocation
    );
  }

  // 8. Agar location India ke bahar hai, toh timeline mein flag karo
  if (!locationInIndia) {
    await addTimelineEvent(
      finalCase.case_id,
      'LOCATION_OUTSIDE_INDIA',
      `Reported location is outside India (${caseData.latitude}, ${caseData.longitude}). Manual verification required.`,
      'System',
      {
        latitude: caseData.latitude,
        longitude: caseData.longitude,
        flagged_for_review: true,
      }
    );
  }

  return finalCase;
}

// ==================== READ ====================

async function getCaseById(id) {
  const result = await query('SELECT * FROM cases WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function getCaseByCaseId(caseId) {
  const result = await query('SELECT * FROM cases WHERE case_id = $1', [caseId]);
  return result.rows[0] || null;
}

/**
 * Saari cases list karo — filter + pagination
 */
async function getAllCases(filters = {}) {
  const conditions = [];
  const values = [];
  let paramIndex = 1;

  if (filters.status) {
    conditions.push(`status = $${paramIndex++}`);
    values.push(filters.status);
  }
  if (filters.state) {
    conditions.push(`state = $${paramIndex++}`);
    values.push(filters.state);
  }
  if (filters.district) {
    conditions.push(`district = $${paramIndex++}`);
    values.push(filters.district);
  }
  if (filters.severity) {
    conditions.push(`severity = $${paramIndex++}`);
    values.push(filters.severity);
  }
  if (filters.assignedNgoId) {
    conditions.push(`assigned_ngo_id = $${paramIndex++}`);
    values.push(filters.assignedNgoId);
  }
  if (filters.governmentRouteStatus) {
    conditions.push(`government_route_status = $${paramIndex++}`);
    values.push(filters.governmentRouteStatus);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = Math.min(Number(filters.limit) || 20, 100);
  const offset = Number(filters.offset) || 0;

  const sql = `
    SELECT * FROM cases
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex++};
  `;
  values.push(limit, offset);

  const result = await query(sql, values);

  const countSql = `SELECT COUNT(*) FROM cases ${whereClause};`;
  const countResult = await query(countSql, values.slice(0, -2));

  return {
    data: result.rows,
    total: parseInt(countResult.rows[0].count),
    limit,
    offset,
  };
}

// ==================== UPDATE STATUS ====================

/**
 * Case status update karo + timeline entry
 */
async function updateCaseStatus(caseId, newStatus, performedBy = 'System', note = null) {
  if (!VALID_CASE_STATUSES.includes(newStatus)) {
    const error = new Error(`Invalid status: ${newStatus}`);
    error.status = 400;
    throw error;
  }

  // NOTE: $1::varchar cast zaroori hai — warna PostgreSQL
  // "inconsistent types deduced for parameter $1" error deta hai
  const sql = `
    UPDATE cases
    SET status = $1::varchar,
        completed_at = CASE WHEN $1::varchar = 'COMPLETED' THEN CURRENT_TIMESTAMP ELSE completed_at END
    WHERE case_id = $2
    RETURNING *;
  `;
  const result = await query(sql, [newStatus, caseId]);
  const updatedCase = result.rows[0];

  if (!updatedCase) return null;

  await addTimelineEvent(
    caseId,
    `STATUS_${newStatus}`,
    note || `Status changed to ${newStatus}`,
    performedBy
  );

  return updatedCase;
}

// ==================== GOVERNMENT ROUTE ====================

/**
 * Government 1962 route ka status update karo
 */
async function updateGovernmentRoute(caseId, govStatus, note = null) {
  // NOTE: $1::varchar cast zaroori hai — warna PostgreSQL
  // "inconsistent types deduced for parameter $1" error deta hai
  const sql = `
    UPDATE cases
    SET government_route_status = $1::varchar,
        government_response_at = CASE
          WHEN $1::varchar = 'RESPONSE_RECEIVED' THEN CURRENT_TIMESTAMP
          ELSE government_response_at
        END
    WHERE case_id = $2
    RETURNING *;
  `;
  const result = await query(sql, [govStatus, caseId]);
  const updatedCase = result.rows[0];

  if (!updatedCase) return null;

  await addTimelineEvent(
    caseId,
    `GOVERNMENT_${govStatus}`,
    note || `Government route status: ${govStatus}`,
    'Admin'
  );

  return updatedCase;
}

// ==================== NGO ASSIGNMENT ====================

/**
 * Case ko NGO ko assign karo
 */
async function assignNGO(caseId, ngoId, performedBy = 'System') {
  const sql = `
    UPDATE cases
    SET assigned_ngo_id = $1,
        status = 'PARTNER_ALERTED',
        ngo_response = 'PENDING'
    WHERE case_id = $2
    RETURNING *;
  `;
  const result = await query(sql, [ngoId, caseId]);
  const updatedCase = result.rows[0];

  if (!updatedCase) return null;

  await addTimelineEvent(
    caseId,
    'NGO_ASSIGNED',
    `Case assigned to NGO ID ${ngoId}`,
    performedBy,
    { ngo_id: ngoId }
  );

  return updatedCase;
}

/**
 * NGO ka response record karo (ACCEPTED / REJECTED)
 */
async function recordNGOResponse(caseId, response, performedBy = 'NGO') {
  if (!['ACCEPTED', 'REJECTED'].includes(response)) {
    throw new Error('Response must be ACCEPTED or REJECTED');
  }

  const newStatus = response === 'ACCEPTED' ? 'PARTNER_ACCEPTED' : 'PARTNER_REJECTED';

  const sql = `
    UPDATE cases
    SET ngo_response = $1, status = $2
    WHERE case_id = $3
    RETURNING *;
  `;
  const result = await query(sql, [response, newStatus, caseId]);
  const updatedCase = result.rows[0];

  if (!updatedCase) return null;

  await addTimelineEvent(
    caseId,
    `NGO_${response}`,
    `NGO ${response.toLowerCase()} the case`,
    performedBy
  );

  return updatedCase;
}

// ==================== NGO MATCHING ====================

/**
 * Case ke liye eligible NGOs (escalation chain)
 */
async function getEscalationChain(caseId, options = {}) {
  const caseData = await getCaseByCaseId(caseId);
  if (!caseData) return null;

  return await matchService.buildEscalationChain(caseData, options);
}

/**
 * Next NGO in chain
 */
async function getNextNGO(caseId, alreadyTriedNgoIds = []) {
  const caseData = await getCaseByCaseId(caseId);
  if (!caseData) return null;

  return await matchService.findNextNGOInChain(caseData, alreadyTriedNgoIds);
}

// ==================== EXPORTS ====================

module.exports = {
  createCase,
  getCaseById,
  getCaseByCaseId,
  getAllCases,
  updateCaseStatus,
  updateGovernmentRoute,
  assignNGO,
  recordNGOResponse,
  // NGO Matching
  getEscalationChain,
  getNextNGO,
};