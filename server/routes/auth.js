const express = require('express');
const router = express.Router();
const store = require('../data/store');

// Register - creates a demo user and sends OTP (simulated)
router.post('/register', (req, res) => {
  const { name, phone, location, aadhaar } = req.body;
  if (!name || !phone || !location || !aadhaar) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  const existing = store.getUserByPhone(phone);
  if (existing) {
    // regenerate OTP
    existing.otp = { code: Math.floor(100000 + Math.random() * 900000).toString(), expiresAt: Date.now() + 2 * 60 * 1000 };
    return res.json({ success: true, message: 'OTP resent', phone });
  }

  const user = store.createUser({ name, phone, location, aadhaar });

  // In real implementation we'd send SMS here. For demo we return the OTP in logs.
  console.log(`Demo OTP for ${phone}: ${user.otp.code}`);

  return res.status(201).json({ success: true, message: 'Registered. OTP sent to phone (demo)', phone });
});

// Verify OTP
router.post('/verify-otp', (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) return res.status(400).json({ success: false, error: 'Missing phone or otp' });

  const result = store.verifyUserOTP(phone, otp);
  if (!result.ok) return res.status(400).json({ success: false, error: result.reason });

  return res.json({ success: true, userId: result.user.id });
});

// Get user info
router.get('/user/:id', (req, res) => {
  const user = store.getUserById(req.params.id);
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });

  // Only return safe fields expected by frontend
  return res.json({ success: true, user: { id: user.id, name: user.name, phone: user.phone, location: user.location, hasVoted: !!user.hasVoted } });
});

module.exports = router;
