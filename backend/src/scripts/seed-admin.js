/**
 * Seed Admin — Pehla admin create karo
 *
 * Run: node src/scripts/seed-admin.js
 *
 * Ye script .env se ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME leti hai.
 * Agar admin already exist karta hai, toh skip kar deti hai.
 */

require('dotenv').config();

const userService = require('../services/user.service');
const { pool } = require('../config/database');

async function seedAdmin() {
  console.log('');
  console.log('🌱 ============================================');
  console.log('🌱 Seeding Admin User');
  console.log('🌱 ============================================');
  console.log('');

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'Platform Admin';

  if (!email || !password) {
    console.error('❌ ADMIN_EMAIL and ADMIN_PASSWORD required in .env');
    process.exit(1);
  }

  try {
    // Check if admin already exists
    const existing = await userService.getUserByEmail(email);
    if (existing) {
      console.log(`ℹ️  Admin already exists: ${email}`);
      console.log(`   Role: ${existing.role}`);
      console.log('');
      await pool.end();
      process.exit(0);
    }

    // Create admin
    const admin = await userService.createUser({
      name,
      email,
      password,
      role: 'ADMIN',
    });

    console.log('✅ Admin created successfully!');
    console.log(`   ID:    ${admin.id}`);
    console.log(`   Name:  ${admin.name}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Role:  ${admin.role}`);
    console.log('');
    console.log('🔐 Use these credentials to login:');
    console.log(`   Email:    ${email}`);
    console.log(`   Password: (as set in .env)`);
    console.log('');
    console.log('🎉 ============================================');
    console.log('🎉 Seed complete!');
    console.log('🎉 ============================================');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ Seed failed:', error.message);
    if (error.details) console.error('Details:', error.details);
    console.error('');
  } finally {
    await pool.end();
    process.exit(0);
  }
}

seedAdmin();