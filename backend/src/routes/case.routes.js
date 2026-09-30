const express = require('express');
const router = express.Router();

const caseController = require('../controllers/case.controller');
const { requireAuth, requireAdmin } = require('../middleware/auth.middleware');

// Public
router.post('/report', caseController.reportCow);
router.get('/track/:caseId', caseController.trackCase);
router.get('/track/:caseId/timeline', caseController.getTimeline);
router.get('/:caseId/nearby-ngos', caseController.getNearbyNGOs);
router.get('/:caseId/eligible-ngos', caseController.getEligibleNGOs);

// Admin
router.get('/admin/list', requireAuth, requireAdmin, caseController.adminListCases);
router.put('/admin/:caseId/government-route', requireAuth, requireAdmin, caseController.adminUpdateGovernmentRoute);
router.put('/admin/:caseId/status', requireAuth, requireAdmin, caseController.adminUpdateStatus);
router.post('/admin/:caseId/send-alert', requireAuth, requireAdmin, caseController.adminSendAlert);

// User actions
router.post('/:caseId/user-action/called-1962', caseController.userCalled1962);
router.post('/:caseId/user-action/request-help', caseController.userRequestHelp);
router.post('/:caseId/user-action/no-response', caseController.userNoResponse);

module.exports = router;