/**
 * User Service — Admin create, Login, aur user CRUD
 *
 * NOTE: Public registration nahi hai. Sirf admin seed script
 * aur login hai.
 */

const { query } = require('../config/database');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateToken } = require('../utils/jwt');
const { isValidEmail, isValidPhone, isNonEmptyString } = require('../utils/validators');

/**
 * Password ko response se hatao
 */
function sanitizeUser(user) {
  if (!user) return null;
  const { password_hash, ...safeUser } = user;
  return safeUser;
}

/**
 * Naya user (admin) create karo — service level only
 * Ye function seed script aur future admin-only routes use karenge
 */
async function createUser(data) {
  const errors = [];

  if (!isNonEmptyString(data.name)) errors.push('Name is required');
  if (!isNonEmptyString(data.email)) {
    errors.push('Email is required');
  } else if (!isValidEmail(data.email)) {
    errors.push('Email is invalid');
  }
  if (!isNonEmptyString(data.password)) {
    errors.push('Password is required');
  } else if (data.password.length < 6) {
    errors.push('Password must be at least 6 characters');
  }
  if (data.phone && !isValidPhone(data.phone)) {
    errors.push('Phone number is invalid');
  }

  if (errors.length > 0) {
    const error = new Error('Validation failed');
    error.status = 400;
    error.details = errors;
    throw error;
  }

  // Duplicate email
  const existing = await query('SELECT id FROM users WHERE email = $1', [
    data.email.toLowerCase().trim(),
  ]);
  if (existing.rows.length > 0) {
    const error = new Error('Email already registered');
    error.status = 409;
    throw error;
  }

  const passwordHash = await hashPassword(data.password);

  const sql = `
    INSERT INTO users (name, email, phone, password_hash, role)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;
  const values = [
    data.name.trim(),
    data.email.toLowerCase().trim(),
    data.phone || null,
    passwordHash,
    data.role || 'USER',
  ];
  const result = await query(sql, values);
  return sanitizeUser(result.rows[0]);
}

/**
 * Login — sirf email + password
 */
async function loginUser(email, password) {
  if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
    const error = new Error('Email and password are required');
    error.status = 400;
    throw error;
  }

  const result = await query('SELECT * FROM users WHERE email = $1', [
    email.toLowerCase().trim(),
  ]);
  const user = result.rows[0];

  // Security: same error for both cases
  if (!user) {
    const error = new Error('Invalid email or password');
    error.status = 401;
    throw error;
  }

  if (!user.is_active) {
    const error = new Error('Account is deactivated');
    error.status = 403;
    throw error;
  }

  const isValid = await comparePassword(password, user.password_hash);
  if (!isValid) {
    const error = new Error('Invalid email or password');
    error.status = 401;
    throw error;
  }

  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    user: sanitizeUser(user),
    token,
  };
}

async function getUserById(id) {
  const result = await query('SELECT * FROM users WHERE id = $1', [id]);
  return sanitizeUser(result.rows[0]) || null;
}

async function getUserByEmail(email) {
  const result = await query('SELECT * FROM users WHERE email = $1', [
    email.toLowerCase().trim(),
  ]);
  return sanitizeUser(result.rows[0]) || null;
}

module.exports = {
  createUser,
  loginUser,
  getUserById,
  getUserByEmail,
};