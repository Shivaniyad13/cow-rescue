/**
 * Alert Token Utils — Magic link tokens
 */

const crypto = require('crypto');

function generateAlertToken() {
  return crypto.randomBytes(24).toString('base64url');
}

function getTokenExpiry(hours = 24) {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + hours);
  return expiry;
}

function buildMagicLink(token) {
  const baseUrl = process.env.PUBLIC_BASE_URL || 'http://localhost:5000';
  return `${baseUrl}/api/alerts/${token}`;
}

module.exports = {
  generateAlertToken,
  getTokenExpiry,
  buildMagicLink,
};