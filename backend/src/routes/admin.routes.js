/**
 * Admin Routes — /api/admin/*
 * Sab routes JWT + Admin protected
 */

const express = require('express');
const router = express.Router();

const adminController = require('../controllers/admin.controller');
const { requireAuth, requireAdmin } = require('../middleware/auth.middleware');

// Har route pe auth lagega
router.use(requireAuth);
router.use(requireAdmin);

// Stats
router.get('/stats', adminController.getStats);

// NGO management
router.get('/ngos', adminController.listNGOs);
router.put('/ngos/:id/verify', adminController.verifyNGO);
router.put('/ngos/:id/opt-in', adminController.optInNGO);

// Alerts
router.get('/alerts', adminController.listAlerts);

// Full case
router.get('/cases/:caseId/full', adminController.getFullCase);

module.exports = router;

