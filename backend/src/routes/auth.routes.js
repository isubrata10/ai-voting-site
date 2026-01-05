const express = require('express');
const router = express.Router();
const {
  register,
  verifyOTP,
  verifyFace,
  resendOTP,
  checkVoterStatus,
  getUser
} = require('../controllers/auth.controllers');
const {
  validateRegistration,
  validateOTP,
  validateFaceVerification,
  validate
} = require('../middleware/validation');
const { protect } = require('../middleware/auth');

// Public routes
router.post('/register', validateRegistration, validate, register);
router.post('/verify-otp', validateOTP, validate, verifyOTP);
router.post('/resend-otp', resendOTP);
router.get('/check-status', checkVoterStatus);

// Get user by id (used by frontend loadUserData)
router.get('/user/:id', getUser);

// Protected routes (require OTP verification)
router.post('/verify-face', protect, validateFaceVerification, validate, verifyFace);

module.exports = router;