/**
 * Validators — Input validation helpers
 */

// ==================== NGO VALIDATORS ====================

function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

function isValidPhone(phone) {
  if (!phone) return false;
  const cleaned = String(phone).replace(/[\s-]/g, '');
  const phoneRegex = /^(\+?91)?[6-9]\d{9}$/;
  return phoneRegex.test(cleaned);
}

function isValidLatitude(lat) {
  const num = Number(lat);
  return !isNaN(num) && num >= -90 && num <= 90;
}

function isValidLongitude(lng) {
  const num = Number(lng);
  return !isNaN(num) && num >= -180 && num <= 180;
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateNGOData(data) {
  const errors = [];

  if (!isNonEmptyString(data.name)) {
    errors.push('NGO name is required');
  }
  if (data.email && !isValidEmail(data.email)) {
    errors.push('Email is invalid');
  }
  if (data.phone && !isValidPhone(data.phone)) {
    errors.push('Phone number is invalid (must be 10-digit Indian mobile)');
  }
  if (data.latitude !== undefined && data.latitude !== null) {
    if (!isValidLatitude(data.latitude)) {
      errors.push('Latitude must be between -90 and 90');
    }
  }
  if (data.longitude !== undefined && data.longitude !== null) {
    if (!isValidLongitude(data.longitude)) {
      errors.push('Longitude must be between -180 and 180');
    }
  }

  return { isValid: errors.length === 0, errors };
}

// ==================== CASE VALIDATORS ====================

// Valid case statuses
const VALID_CASE_STATUSES = [
  'REPORTED',
  'VERIFIED',
  'GOVERNMENT_CONTACTED',
  'WAITING_FOR_GOVERNMENT_RESPONSE',
  'GOVERNMENT_RESPONDED',
  'GOVERNMENT_HANDLING',
  'ESCALATED_TO_PARTNER',
  'PARTNER_ALERTED',
  'PARTNER_ACCEPTED',
  'PARTNER_REJECTED',
  'RESCUE_IN_PROGRESS',
  'RESCUED',
  'UNDER_TREATMENT',
  'IN_SHELTER',
  'COMPLETED',
  'CANCELLED',
];

// Valid government route statuses
const VALID_GOVERNMENT_STATUSES = [
  'NOT_CHECKED',
  'CHECKED',
  'CONTACT_REQUIRED',
  'RESPONSE_RECEIVED',
  'NO_RESPONSE',
  'HANDLED',
  'REFERRED',
];

// Valid severities
const VALID_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

function validateCaseData(data) {
  const errors = [];

  // Reporter info
  if (!isNonEmptyString(data.reporter_name)) {
    errors.push('Reporter name is required');
  }
  if (!isNonEmptyString(data.reporter_phone)) {
    errors.push('Reporter phone is required');
  } else if (!isValidPhone(data.reporter_phone)) {
    errors.push('Reporter phone is invalid');
  }
  if (data.reporter_email && !isValidEmail(data.reporter_email)) {
    errors.push('Reporter email is invalid');
  }

  // Animal info
  if (!isNonEmptyString(data.animal_condition) && !isNonEmptyString(data.description)) {
    errors.push('Either animal condition or description is required');
  }

  // Severity
  if (data.severity && !VALID_SEVERITIES.includes(data.severity)) {
    errors.push(`Severity must be one of: ${VALID_SEVERITIES.join(', ')}`);
  }

  // Location
  if (data.latitude === undefined || data.latitude === null) {
    errors.push('Latitude is required');
  } else if (!isValidLatitude(data.latitude)) {
    errors.push('Latitude must be between -90 and 90');
  }
  if (data.longitude === undefined || data.longitude === null) {
    errors.push('Longitude is required');
  } else if (!isValidLongitude(data.longitude)) {
    errors.push('Longitude must be between -180 and 180');
  }

  return { isValid: errors.length === 0, errors };
}

module.exports = {
  // NGO validators
  isValidEmail,
  isValidPhone,
  isValidLatitude,
  isValidLongitude,
  isNonEmptyString,
  validateNGOData,

  // Case validators
  validateCaseData,
  VALID_CASE_STATUSES,
  VALID_GOVERNMENT_STATUSES,
  VALID_SEVERITIES,
};