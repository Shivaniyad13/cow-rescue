/**
 * Auth Routes — /api/auth/*
 *
 * NOTE: Public /register nahi hai — sirf admin login
 */

const express = require('express');
const router = express.Router();

const userService = require('../services/user.service');
const { requireAuth } = require('../middleware/auth.middleware');

/**
 * @route   POST /api/auth/login
 * @desc    Login karo (admin ya future roles)
 * @access  Public
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await userService.loginUser(email, password);
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Apni profile dekho
 * @access  Private
 */
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;