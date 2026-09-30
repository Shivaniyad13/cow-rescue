/**
 * Match Service — Case ke liye best NGOs dhoondho
 *
 * Logic:
 *   1. Eligible NGOs filter karo (active, verified, opted-in, cow rescue capable)
 *   2. Distance calculate karo (PostgreSQL Haversine)
 *   3. Rank karo (nearest first)
 *   4. Top N return karo
 */

const { query } = require('../config/database');

/**
 * Case ke liye eligible NGOs dhoondho + distance-based rank
 *
 * @param {Object} caseData - Case row from DB
 * @param {Object} options - { radiusKm, limit, requireVeterinary, requireShelter }
 * @returns {Array} - NGOs with distance, ranked nearest first
 */
async function findEligibleNGOsForCase(caseData, options = {}) {
  const radiusKm = Number(options.radiusKm) || 100;
  const limit = Math.min(Number(options.limit) || 10, 50);

  // Base conditions — har eligible NGO ke liye zaroori
  const conditions = [
    'is_active = true',
    'is_verified = true',
    'opted_in_for_alerts = true',
    'can_handle_cow_rescue = true',
    'latitude IS NOT NULL',
    'longitude IS NOT NULL',
  ];

  const values = [caseData.latitude, caseData.longitude, radiusKm];
  let paramIndex = 4;

  // Optional filters
  if (options.requireVeterinary) {
    conditions.push('has_veterinary_capability = true');
  }

  if (options.requireShelter) {
    conditions.push('has_shelter = true');
  }

  const whereClause = conditions.join(' AND ');

  const sql = `
    SELECT *,
      (6371 * acos(
        cos(radians($1)) * cos(radians(latitude)) *
        cos(radians(longitude) - radians($2)) +
        sin(radians($1)) * sin(radians(latitude))
      )) AS distance_km
    FROM ngos
    WHERE ${whereClause}
      AND (6371 * acos(
        cos(radians($1)) * cos(radians(latitude)) *
        cos(radians(longitude) - radians($2)) +
        sin(radians($1)) * sin(radians(latitude))
      )) <= $3
    ORDER BY distance_km ASC
    LIMIT $${paramIndex};
  `;

  values.push(limit);

  const result = await query(sql, values);
  return result.rows;
}

/**
 * Case ke liye "escalation chain" banao — top N NGOs priority order mein
 *
 * @param {Object} caseData
 * @param {Object} options
 * @returns {Object} - { case_id, total_found, chain: [...] }
 */
async function buildEscalationChain(caseData, options = {}) {
  const ngos = await findEligibleNGOsForCase(caseData, options);

  const chain = ngos.map((ngo, index) => ({
    priority: index + 1,
    ngo_id: ngo.id,
    ngo_name: ngo.name,
    phone: ngo.phone,
    email: ngo.email,
    city: ngo.city,
    district: ngo.district,
    state: ngo.state,
    distance_km: parseFloat(ngo.distance_km).toFixed(2),
    capabilities: {
      can_handle_cow_rescue: ngo.can_handle_cow_rescue,
      has_veterinary_capability: ngo.has_veterinary_capability,
      has_shelter: ngo.has_shelter,
    },
  }));

  return {
    case_id: caseData.case_id,
    case_location: {
      latitude: caseData.latitude,
      longitude: caseData.longitude,
      city: caseData.city,
      district: caseData.district,
      state: caseData.state,
    },
    radius_km: options.radiusKm || 100,
    total_found: chain.length,
    chain,
  };
}

/**
 * Next NGO in chain dhoondho (jo already tried nahi hua)
 *
 * @param {Object} caseData
 * @param {Array} alreadyTriedNgoIds - NGO IDs jo already reject kar chuke
 * @returns {Object|null} - Next eligible NGO ya null
 */
async function findNextNGOInChain(caseData, alreadyTriedNgoIds = []) {
  const ngos = await findEligibleNGOsForCase(caseData, {
    radiusKm: 200,
    limit: 20,
  });

  const nextNGO = ngos.find(
    (ngo) => !alreadyTriedNgoIds.includes(ngo.id)
  );

  return nextNGO || null;
}

module.exports = {
  findEligibleNGOsForCase,
  buildEscalationChain,
  findNextNGOInChain,
};