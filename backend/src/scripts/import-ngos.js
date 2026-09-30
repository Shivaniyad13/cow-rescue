/**
 * CLI Script — CSV import run karne ke liye
 *
 * Usage:
 *   node src/scripts/import-ngos.js data/ngos-sample.csv
 */

require('dotenv').config();

const path = require('path');
const { importNGOsFromCSV } = require('../services/import.service');
const { pool } = require('../config/database');

async function main() {
  const fileArg = process.argv[2];

  if (!fileArg) {
    console.error('');
    console.error('❌ Usage: node src/scripts/import-ngos.js <path-to-csv>');
    console.error('   Example: node src/scripts/import-ngos.js data/ngos-sample.csv');
    console.error('');
    process.exit(1);
  }

  const filePath = path.resolve(fileArg);

  try {
    const report = await importNGOsFromCSV(filePath);

    console.log('');
    console.log('📋 ============================================');
    console.log('📋 IMPORT REPORT');
    console.log('📋 ============================================');
    console.log(`   Total rows:   ${report.total}`);
    console.log(`   ✅ Imported:  ${report.imported}`);
    console.log(`   ⏭️  Skipped:   ${report.skipped} (duplicates)`);
    console.log(`   ❌ Failed:    ${report.failed}`);
    console.log('');

    if (report.errors.length > 0) {
      console.log('⚠️  Errors/Warnings:');
      report.errors.slice(0, 20).forEach((err) => {
        console.log(`   Row ${err.row}: ${err.name} → ${err.reason}`);
        if (err.details) {
          err.details.forEach((d) => console.log(`      - ${d}`));
        }
      });
      if (report.errors.length > 20) {
        console.log(`   ... and ${report.errors.length - 20} more`);
      }
      console.log('');
    }

    const countResult = await pool.query('SELECT COUNT(*) FROM ngos');
    console.log(`📊 Total NGOs in database: ${countResult.rows[0].count}`);
    console.log('');

    console.log('🎉 ============================================');
    console.log('🎉 Import Complete!');
    console.log('🎉 ============================================');
    console.log('');
  } catch (error) {
    console.error('');
    console.error('❌ Import failed:', error.message);
    console.error('');
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

main();