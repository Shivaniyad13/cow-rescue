/**
 * Setup Script — Ek hi baar chalana hai
 * Ye script schema.sql file ko database par apply karti hai.
 *
 * Run karo:  node src/config/setup-db.js
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { pool } = require('./database');

async function setupDatabase() {
  console.log('');
  console.log('🔧 ============================================');
  console.log('🔧 Setting up PostgreSQL Database Schema');
  console.log('🔧 ============================================');
  console.log('');

  try {
    // Schema SQL file padho
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

    console.log('📄 Reading schema.sql...');
    console.log('🔨 Executing schema on Neon...');

    // Poora schema ek saath run karo
    await pool.query(schemaSQL);

    console.log('✅ Schema executed successfully!');
    console.log('');

    // Verify karo — tables ban gayi ya nahi
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log('📋 Tables created in database:');
    result.rows.forEach((row) => {
      console.log(`   ✓ ${row.table_name}`);
    });
    console.log('');

    console.log('🎉 ============================================');
    console.log('🎉 Database setup COMPLETE!');
    console.log('🎉 ============================================');
    console.log('');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('❌ ============================================');
    console.error('❌ Database setup FAILED!');
    console.error('❌ ============================================');
    console.error('Error:', error.message);
    console.error('');

    await pool.end();
    process.exit(1);
  }
}

setupDatabase();