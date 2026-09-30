/**
 * Alert Routes — /api/alerts/*
 */

const express = require('express');
const router = express.Router();

const alertController = require('../controllers/alert.controller');

router.get('/:token', alertController.getAlertPage);
router.post('/:token/accept', alertController.acceptAlert);
router.post('/:token/reject', alertController.rejectAlert);

module.exports = router;