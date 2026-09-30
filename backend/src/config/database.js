const { Pool } = require('pg');

/**
 * Pool kya hai?
 * "Pool" matlab ek group of connections.
 * Har baar naya connection banane ke bajaye, hum ek pool banate hain
 * aur usme se connections reuse karte hain. Ye fast hai aur efficient.
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Neon cloud SSL ke liye zaroori
  },
  max: 10,                     // Maximum 10 connections ek saath
  idleTimeoutMillis: 30000,    // 30 sec idle ke baad connection close
  connectionTimeoutMillis: 10000, // 10 sec mein connect na ho toh error
});

// ==== Event Listeners ====
// Jab ek naya connection pool se connect ho
pool.on('connect', () => {
  console.log('🔌 New PostgreSQL connection established');
});

// Agar pool mein koi error aaye
pool.on('error', (err) => {
  console.error('❌ PostgreSQL pool error:', err.message);
});

/**
 * Database connect test karo
 * Server start hone par ye call hoga
 */
async function connectDatabase() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time');
    client.release(); // Connection wapas pool mein daal do

    console.log('✅ PostgreSQL connected successfully!');
    console.log(`   Server time: ${result.rows[0].current_time}`);
    console.log('');
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error.message);
    throw error;
  }
}

/**
 * Database connection band karo
 * Server shutdown ke waqt call hoga
 */
async function closeDatabase() {
  await pool.end();
  console.log('🔌 PostgreSQL pool closed');
}

/**
 * Query Helper
 * Ye function use karke hum SQL queries chalayenge
 *
 * Example:
 *   const result = await query('SELECT * FROM ngos WHERE state = $1', ['UP']);
 *   console.log(result.rows);
 */
function query(text, params) {
  return pool.query(text, params);
}

// Export karo
module.exports = {
  pool,
  query,
  connectDatabase,
  closeDatabase,
};