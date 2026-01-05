const { body, param, query, validationResult } = require('express-validator');
const User = require('../models/user');

exports.validateRegistration = [
  // Accept either `fullName` or `name` from frontend
  body().custom(async (value, { req }) => {
    const name = (req.body.fullName || req.body.name || '').trim();
    if (!name) //throw new Error('Full name is required');
    if (name.length < 3 || name.length > 100) throw new Error('Name must be between 3 and 100 characters');
    return true;
  }),

  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^[6-9]\d{9}$/).withMessage('Please enter a valid Indian phone number')
    .custom(async (value) => {
      const user = await User.findOne({ phone: value });
      if (user) {
        throw new Error('Phone number already registered');
      }
      return true;
    }),

  // Accept either `aadhaarNumber` or `aadhaar`
  body().custom(async (value, { req }) => {
    const aadhaar = (req.body.aadhaarNumber || req.body.aadhaar || '').trim();
    if (!aadhaar) throw new Error('Aadhaar number is required');
    if (aadhaar.length !== 12 || !/^\d+$/.test(aadhaar)) throw new Error('Aadhaar must be 12 digits');
    const existing = await User.findOne({ aadhaarNumber: aadhaar });
    if (existing) throw new Error('Aadhaar number already registered');
    return true;
  }),

  body().custom((value, { req }) => {
    const raw = (req.body.constituency || req.body.location || '').trim();
    if (!raw) throw new Error('Constituency is required');

    const map = {
      'Delhi': 'Delhi Central',
      'Mumbai': 'Mumbai North',
      'Bangalore': 'Bangalore South',
      'Chennai': 'Chennai Central',
      'Kolkata': 'Kolkata North',
      'Hyderabad': 'Hyderabad'
    };

    const resolved = map[raw] || raw;
    const allowed = [
      'Delhi Central', 'Mumbai North', 'Bangalore South', 'Chennai Central', 'Kolkata North', 'Hyderabad'
    ];

    if (!allowed.includes(resolved)) throw new Error('Invalid constituency selected');

    // normalize into req.body.constituency for downstream use
    req.body.constituency = resolved;
    return true;
  }),

  body('location')
    .optional()
    .isObject().withMessage('Location must be an object')
];

exports.validateOTP = [
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^[6-9]\d{9}$/).withMessage('Invalid phone number format'),
  
  body('otp')
    .trim()
    .notEmpty().withMessage('OTP is required')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
];

exports.validateFaceVerification = [
  body('faceImage')
    .notEmpty().withMessage('Face image is required')
    .isBase64().withMessage('Face image must be base64 encoded'),
  
  body('aadhaarNumber')
    .trim()
    .notEmpty().withMessage('Aadhaar number is required')
    .isLength({ min: 12, max: 12 }).withMessage('Aadhaar must be 12 digits')
];

exports.validateVote = [
  body('candidateId')
    .notEmpty().withMessage('Candidate ID is required')
    .isMongoId().withMessage('Invalid candidate ID'),
  
  body('sessionId')
    .notEmpty().withMessage('Session ID is required'),
  
  body('deviceFingerprint')
    .optional()
    .isString().withMessage('Device fingerprint must be a string'),
  
  body('location')
    .optional()
    .isObject().withMessage('Location must be an object')
];

exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
  next();
};