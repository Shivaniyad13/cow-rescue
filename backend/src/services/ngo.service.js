/**
 * NGO Service — Saare NGO database operations
 *
 * Ye file database se baat karti hai.
 * Controllers ya routes is service ko call karenge.
 */

const { query } = require('../config/database');
const { validateNGOData } = require('../utils/validators');

// ==================== CREATE ====================

/**
 * Nayi NGO database mein daalo
 * @param {Object} ngoData - NGO ki details
 * @returns {Object} - Created NGO
 */
async function createNGO(ngoData) {
  // 1. Validate karo
  const validation = validateNGOData(ngoData);
  if (!validation.isValid) {
    const error = new Error('Validation failed');
    error.status = 400;
    error.details = validation.errors;
    throw error;
  }

  // 2. SQL query banao — parameterized ($1, $2...) taaki SQL injection na ho
  const sql = `
    INSERT INTO ngos (
      name, registration_number, contact_person, phone, email, address,
      state, district, city, pincode, latitude, longitude, service_area,
      organization_type, can_handle_cow_rescue, has_veterinary_capability,
      has_shelter, is_active, is_verified, opted_in_for_alerts,
      kyc_status, awbi_recognized
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
      $17, $18, $19, $20, $21, $22
    ) RETURNING *;
  `;

  const values = [
    ngoData.name,
    ngoData.registration_number || null,
    ngoData.contact_person || null,
    ngoData.phone || null,
    ngoData.email || null,
    ngoData.address || null,
    ngoData.state || null,
    ngoData.district || null,
    ngoData.city || null,
    ngoData.pincode || null,
    ngoData.latitude || null,
    ngoData.longitude || null,
    ngoData.service_area || null,
    ngoData.organization_type || null,
    ngoData.can_handle_cow_rescue ?? false,
    ngoData.has_veterinary_capability ?? false,
    ngoData.has_shelter ?? false,
    ngoData.is_active ?? true,
    ngoData.is_verified ?? false,
    ngoData.opted_in_for_alerts ?? false,
    ngoData.kyc_status || 'PENDING',
    ngoData.awbi_recognized ?? false,
  ];

  const result = await query(sql, values);
  return result.rows[0];
}

// ==================== READ ====================

/**
 * ID se NGO dhoondo
 */
async function getNGOById(id) {
  const result = await query('SELECT * FROM ngos WHERE id = $1', [id]);
  return result.rows[0] || null;
}

/**
 * Saari NGOs list karo — filter + pagination ke saath
 *
 * filters examples:
 *   { state: 'Uttar Pradesh', district: 'Lucknow' }
 *   { isActive: true, canHandleCowRescue: true }
 */
async function getAllNGOs(filters = {}) {
  const conditions = [];
  const values = [];
  let paramIndex = 1;

  // Dynamic WHERE clause
  if (filters.state) {
    conditions.push(`state = $${paramIndex++}`);
    values.push(filters.state);
  }
  if (filters.district) {
    conditions.push(`district = $${paramIndex++}`);
    values.push(filters.district);
  }
  if (filters.city) {
    conditions.push(`city = $${paramIndex++}`);
    values.push(filters.city);
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
  if (filters.canHandleCowRescue !== undefined) {
    conditions.push(`can_handle_cow_rescue = $${paramIndex++}`);
    values.push(filters.canHandleCowRescue);
  }
  if (filters.search) {
    conditions.push(`name ILIKE $${paramIndex++}`);
    values.push(`%${filters.search}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Pagination
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

  // Total count (pagination ke liye)
  const countSql = `SELECT COUNT(*) FROM ngos ${whereClause};`;
  const countResult = await query(countSql, values.slice(0, -2));

  return {
    data: result.rows,
    total: parseInt(countResult.rows[0].count),
    limit,
    offset,
  };
}

// ==================== UPDATE ====================

/**
 * NGO update karo
 */
async function updateNGO(id, updates) {
  // Validate
  const validation = validateNGOData({ ...updates, name: updates.name || 'placeholder' });
  if (!validation.isValid) {
    const error = new Error('Validation failed');
    error.status = 400;
    error.details = validation.errors;
    throw error;
  }

  // Sirf allowed fields update honge
  const allowedFields = [
    'name', 'registration_number', 'contact_person', 'phone', 'email',
    'address', 'state', 'district', 'city', 'pincode', 'latitude', 'longitude',
    'service_area', 'organization_type', 'can_handle_cow_rescue',
    'has_veterinary_capability', 'has_shelter', 'is_active', 'is_verified',
    'opted_in_for_alerts', 'kyc_status', 'awbi_recognized',
  ];

  const setClauses = [];
  const values = [];
  let paramIndex = 1;

  for (const key of allowedFields) {
    if (updates[key] !== undefined) {
      setClauses.push(`${key} = $${paramIndex++}`);
      values.push(updates[key]);
    }
  }

  if (setClauses.length === 0) {
    throw new Error('No valid fields to update');
  }

  // Last param = id
  values.push(id);

  const sql = `
    UPDATE ngos
    SET ${setClauses.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *;
  `;

  const result = await query(sql, values);
  return result.rows[0] || null;
}

// ==================== DELETE (Soft Delete) ====================

/**
 * NGO soft delete — actually row delete nahi karte,
 * sirf is_active = false kar dete hain
 * (History preserve rehti hai)
 */
async function deleteNGO(id) {
  const result = await query(
    'UPDATE ngos SET is_active = false WHERE id = $1 RETURNING *',
    [id]
  );
  return result.rows[0] || null;
}

// ==================== LOCATION-BASED FIND ====================

/**
 * State + District se NGOs dhoondo
 */
async function findNGOsByLocation(state, district) {
  const conditions = ['is_active = true'];
  const values = [];
  let paramIndex = 1;

  if (state) {
    conditions.push(`state = $${paramIndex++}`);
    values.push(state);
  }
  if (district) {
    conditions.push(`district = $${paramIndex++}`);
    values.push(district);
  }

  const sql = `
    SELECT * FROM ngos
    WHERE ${conditions.join(' AND ')}
    ORDER BY name;
  `;

  const result = await query(sql, values);
  return result.rows;
}

/**
 * Latitude/Longitude se paas wali NGOs dhoondo
 * Haversine formula se distance nikalta hai (PostgreSQL mein hi)
 */
async function findNearbyNGOs(latitude, longitude, radiusKm = 50) {
  const sql = `
    SELECT *,
      (6371 * acos(
        cos(radians($1)) * cos(radians(latitude)) *
        cos(radians(longitude) - radians($2)) +
        sin(radians($1)) * sin(radians(latitude))
      )) AS distance_km
    FROM ngos
    WHERE is_active = true
      AND latitude IS NOT NULL
      AND longitude IS NOT NULL
      AND (6371 * acos(
        cos(radians($1)) * cos(radians(latitude)) *
        cos(radians(longitude) - radians($2)) +
        sin(radians($1)) * sin(radians(latitude))
      )) <= $3
    ORDER BY distance_km ASC;
  `;

  const result = await query(sql, [latitude, longitude, radiusKm]);
  return result.rows;
}

// ==================== ELIGIBILITY ====================

/**
 * Case ke liye eligible NGOs dhoondo
 *
 * Eligibility criteria:
 *  1. Active
 *  2. Verified
 *  3. Opted-in for alerts
 *  4. Can handle cow rescue
 */
async function findEligibleNGOs(options = {}) {
  const conditions = [
    'is_active = true',
    'is_verified = true',
    'opted_in_for_alerts = true',
    'can_handle_cow_rescue = true',
  ];
  const values = [];
  let paramIndex = 1;

  if (options.state) {
    conditions.push(`state = $${paramIndex++}`);
    values.push(options.state);
  }
  if (options.district) {
    conditions.push(`district = $${paramIndex++}`);
    values.push(options.district);
  }
  if (options.hasVeterinary) {
    conditions.push(`has_veterinary_capability = true`);
  }
  if (options.hasShelter) {
    conditions.push(`has_shelter = true`);
  }

  const sql = `
    SELECT * FROM ngos
    WHERE ${conditions.join(' AND ')}
    ORDER BY updated_at DESC;
  `;

  const result = await query(sql, values);
  return result.rows;
}

// ==================== EXPORTS ====================

module.exports = {
  createNGO,
  getNGOById,
  getAllNGOs,
  updateNGO,
  deleteNGO,
  findNGOsByLocation,
  findNearbyNGOs,
  findEligibleNGOs,
};