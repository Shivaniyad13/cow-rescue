const express = require('express');
const router = express.Router();
const { query } = require('../config/database');

/**
 * @route   GET /api/health
 * @desc    Check if backend + database is running
 * @access  Public
 */
router.get('/health', async (req, res) => {
  try {
    const ngoResult = await query('SELECT COUNT(*) FROM ngos');
    const caseResult = await query('SELECT COUNT(*) FROM cases');
    const userResult = await query('SELECT COUNT(*) FROM users');

    res.status(200).json({
      success: true,
      message: 'Cow Rescue Backend is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: 'connected',
        type: 'PostgreSQL (Neon)',
        collections: {
          ngos: parseInt(ngoResult.rows[0].count),
          cases: parseInt(caseResult.rows[0].count),
          users: parseInt(userResult.rows[0].count),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/config/public
 * @desc    Frontend ko public config bhejo
 * @access  Public
 */
router.get('/config/public', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      emergency_number: process.env.EMERGENCY_NUMBER || '1962',
      emergency_label: process.env.EMERGENCY_LABEL || 'Govt. Animal Ambulance',
      app_name: 'Cow Rescue Platform',
      version: '1.0.0',
    },
  });
});

module.exports = router;