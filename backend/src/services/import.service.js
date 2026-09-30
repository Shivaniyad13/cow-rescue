/**
 * Import Service — CSV se NGOs bulk import karo
 *
 * Ye service CSV file padhti hai, validate karti hai,
 * aur PostgreSQL mein insert karti hai.
 */

const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { query } = require('../config/database');
const { validateNGOData } = require('../utils/validators');

/**
 * CSV string ko boolean mein convert karo
 * "true", "TRUE", "1", "yes" → true
 * baaki sab → false
 */
function parseBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (!value) return false;
  const str = String(value).trim().toLowerCase();
  return ['true', '1', 'yes', 'y'].includes(str);
}

/**
 * CSV string ko number mein convert karo (safely)
 * Empty ya invalid → null
 */
function parseNumber(value) {
  if (value === '' || value === null || value === undefined) return null;
  const num = Number(value);
  return isNaN(num) ? null : num;
}

/**
 * CSV row ko NGO object mein convert karo
 */
function rowToNGO(row) {
  return {
    name: (row.name || '').trim(),
    registration_number: (row.registration_number || '').trim() || null,
    contact_person: (row.contact_person || '').trim() || null,
    phone: (row.phone || '').trim() || null,
    email: (row.email || '').trim() || null,
    address: (row.address || '').trim() || null,
    state: (row.state || '').trim() || null,
    district: (row.district || '').trim() || null,
    city: (row.city || '').trim() || null,
    pincode: (row.pincode || '').trim() || null,
    latitude: parseNumber(row.latitude),
    longitude: parseNumber(row.longitude),
    service_area: (row.service_area || '').trim() || null,
    organization_type: (row.organization_type || '').trim() || null,
    can_handle_cow_rescue: parseBoolean(row.can_handle_cow_rescue),
    has_veterinary_capability: parseBoolean(row.has_veterinary_capability),
    has_shelter: parseBoolean(row.has_shelter),
    is_active: row.is_active !== undefined ? parseBoolean(row.is_active) : true,
    is_verified: parseBoolean(row.is_verified),
    opted_in_for_alerts: parseBoolean(row.opted_in_for_alerts),
    kyc_status: (row.kyc_status || '').trim() || 'PENDING',
    awbi_recognized: parseBoolean(row.awbi_recognized),
  };
}

/**
 * CSV file padho aur rows return karo
 */
function readCSV(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV file not found: ${filePath}`);
  }
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const records = parse(fileContent, {
    columns: true,          // Pehli row = column names
    skip_empty_lines: true, // Empty lines skip
    trim: true,             // Whitespace trim
    bom: true,              // UTF-8 BOM handle karo
  });
  return records;
}

/**
 * Ek row ko database mein insert karo
 * Returns: { success: true, id } ya { success: false, error }
 */
async function insertNGO(ngoData) {
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
    ) RETURNING id;
  `;

  const values = [
    ngoData.name,
    ngoData.registration_number,
    ngoData.contact_person,
    ngoData.phone,
    ngoData.email,
    ngoData.address,
    ngoData.state,
    ngoData.district,
    ngoData.city,
    ngoData.pincode,
    ngoData.latitude,
    ngoData.longitude,
    ngoData.service_area,
    ngoData.organization_type,
    ngoData.can_handle_cow_rescue,
    ngoData.has_veterinary_capability,
    ngoData.has_shelter,
    ngoData.is_active,
    ngoData.is_verified,
    ngoData.opted_in_for_alerts,
    ngoData.kyc_status,
    ngoData.awbi_recognized,
  ];

  const result = await query(sql, values);
  return result.rows[0].id;
}

/**
 * Check karo ki NGO already exists ya nahi
 * (Duplicate detection — registration_number ya email se)
 */
async function checkDuplicate(ngoData) {
  if (ngoData.registration_number) {
    const result = await query(
      'SELECT id FROM ngos WHERE registration_number = $1',
      [ngoData.registration_number]
    );
    if (result.rows.length > 0) {
      return { duplicate: true, reason: 'registration_number exists' };
    }
  }

  if (ngoData.email) {
    const result = await query(
      'SELECT id FROM ngos WHERE email = $1',
      [ngoData.email]
    );
    if (result.rows.length > 0) {
      return { duplicate: true, reason: 'email exists' };
    }
  }

  return { duplicate: false };
}

/**
 * CSV file import karo
 * @param {string} filePath - CSV file ka path
 * @returns {Object} - { total, imported, skipped, failed, errors: [...] }
 */
async function importNGOsFromCSV(filePath) {
  console.log('');
  console.log('📥 ============================================');
  console.log('📥 Importing NGOs from CSV');
  console.log('📥 ============================================');
  console.log(`📄 File: ${filePath}`);
  console.log('');

  const rows = readCSV(filePath);
  console.log(`📊 Total rows in CSV: ${rows.length}`);
  console.log('');

  const report = {
    total: rows.length,
    imported: 0,
    skipped: 0,
    failed: 0,
    errors: [],
    importedIds: [],
  };

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 1;
    const row = rows[i];

    try {
      // 1. Convert to NGO object
      const ngoData = rowToNGO(row);

      // 2. Validate
      const validation = validateNGOData(ngoData);
      if (!validation.isValid) {
        report.failed++;
        report.errors.push({
          row: rowNum,
          name: ngoData.name || '(no name)',
          reason: 'Validation failed',
          details: validation.errors,
        });
        continue;
      }

      // 3. Duplicate check
      const dup = await checkDuplicate(ngoData);
      if (dup.duplicate) {
        report.skipped++;
        report.errors.push({
          row: rowNum,
          name: ngoData.name,
          reason: `Duplicate: ${dup.reason}`,
        });
        continue;
      }

      // 4. Insert
      const newId = await insertNGO(ngoData);
      report.imported++;
      report.importedIds.push(newId);
    } catch (error) {
      report.failed++;
      report.errors.push({
        row: rowNum,
        name: row.name || '(no name)',
        reason: 'Database error',
        details: [error.message],
      });
    }

    // Progress (har 50 rows par)
    if ((i + 1) % 50 === 0) {
      console.log(`   Processed ${i + 1}/${rows.length}...`);
    }
  }

  return report;
}

module.exports = {
  importNGOsFromCSV,
  readCSV,
  rowToNGO,
  parseBoolean,
  parseNumber,
};