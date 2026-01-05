
const User = require('../models/User');
const OTPService = require('../services/otp.service');
const AadhaarService = require('../services/aadhaar.service');
const { generateToken } = require('../middleware/auth');
const winston = require('winston');
const crypto = require('crypto');

exports.register = async (req, res) => {
  try {
    // Accept frontend field names as well: `name`, `aadhaar`, `location`
    const fullName = req.body.fullName || req.body.name || '';
    const phone = req.body.phone;
    const aadhaarNumber = req.body.aadhaarNumber || req.body.aadhaar;
    // `location` from frontend may be a short code (e.g. 'Delhi'), validation middleware
    // normalizes it into `req.body.constituency` already. Use that if present.
    const constituency = req.body.constituency || req.body.location;
    const location = req.body.location;
    
    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ phone }, { aadhaarNumber }] 
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User already registered with this phone or Aadhaar'
      });
    }
    
    // Verify Aadhaar (simulated)
    const aadhaarVerification = await AadhaarService.verifyAadhaar(aadhaarNumber);
    
    if (!aadhaarVerification.success) {
      return res.status(400).json({
        success: false,
        error: 'Aadhaar verification failed'
      });
    }
    
    // Create new user - normalize payload
    const payload = {
      fullName,
      phone,
      aadhaarNumber,
      constituency,
      deviceFingerprint: req.headers['user-agent'],
      securityLogs: [{
        action: 'REGISTRATION',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }]
    };

    if (location && typeof location === 'object') {
      payload.location = location;
    } else {
      payload.location = { type: 'Point', coordinates: [0, 0] };
    }

    const user = await User.create(payload);
    
    // Generate OTP
    const otpResult = await OTPService.generateOTP(phone);
    
    if (!otpResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to generate OTP'
      });
    }
    
    // Save OTP to user (in production, store hashed)
    user.otp = {
      code: otpResult.otp,
      expiresAt: otpResult.expiresAt
    };
    await user.save();
    
    // Send response
    res.status(201).json({
      success: true,
      message: 'Registration successful. OTP sent to your phone.',
      data: {
        userId: user._id,
        phone: user.phone,
        constituency: user.constituency,
        otpExpiresAt: otpResult.expiresAt,
        // In production, don't send OTP in response
        demoOtp: process.env.NODE_ENV === 'development' ? otpResult.otp : undefined
      }
    });
    
  } catch (error) {
    winston.error(`Registration Error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Registration failed. Please try again.'
    });
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    
    // Verify OTP
    const otpVerification = await OTPService.verifyOTP(phone, otp);
    
    if (!otpVerification.success) {
      return res.status(400).json({
        success: false,
        error: otpVerification.error
      });
    }
    
    // Find user and update verification status
    const user = await User.findOneAndUpdate(
      { phone },
      { 
        isVerified: true,
        $push: {
          securityLogs: {
            action: 'OTP_VERIFICATION',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
          }
        }
      },
      { new: true }
    ).select('-faceData -otp');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Generate JWT token
    const token = generateToken(user);
    
    res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      data: {
        userId: user._id,
        token,
        user: {
          id: user._id,
          fullName: user.fullName,
          phone: user.phone,
          constituency: user.constituency,
          isFaceVerified: user.isFaceVerified
        },
        nextStep: user.isFaceVerified ? 'vote' : 'face_verification'
      }
    });
    
  } catch (error) {
    winston.error(`OTP Verification Error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'OTP verification failed'
    });
  }
};

exports.verifyFace = async (req, res) => {
  try {
    const { faceImage, aadhaarNumber } = req.body;
    const userId = req.user?._id || req.body.userId;
    
    // Verify face with Aadhaar
    const faceVerification = await AadhaarService.verifyFace(aadhaarNumber, faceImage);
    
    if (!faceVerification.success) {
      return res.status(400).json({
        success: false,
        error: 'Face verification failed',
        details: faceVerification.data
      });
    }
    
    // Update user face verification status
    const user = await User.findByIdAndUpdate(
      userId,
      { 
        isFaceVerified: true,
        faceData: faceImage, // Store encrypted in production
        $push: {
          securityLogs: {
            action: 'FACE_VERIFICATION',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
          }
        }
      },
      { new: true }
    ).select('-faceData -otp');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Generate new token with face verification status
    const token = generateToken(user);
    
    res.status(200).json({
      success: true,
      message: 'Face verification successful',
      data: {
        token,
        user: {
          id: user._id,
          fullName: user.fullName,
          phone: user.phone,
          constituency: user.constituency,
          isFaceVerified: user.isFaceVerified
        },
        verification: faceVerification.data,
        nextStep: 'vote'
      }
    });
    
  } catch (error) {
    winston.error(`Face Verification Error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Face verification failed'
    });
  }
};

exports.resendOTP = async (req, res) => {
  try {
    const { phone } = req.body;
    
    // Check if user exists
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Resend OTP
    const otpResult = await OTPService.resendOTP(phone);
    
    if (!otpResult.success) {
      return res.status(400).json({
        success: false,
        error: otpResult.error,
        retryAfter: otpResult.retryAfter
      });
    }
    
    // Update OTP in user record
    user.otp = {
      code: otpResult.otp,
      expiresAt: otpResult.expiresAt
    };
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'OTP resent successfully',
      data: {
        otpExpiresAt: otpResult.expiresAt,
        demoOtp: process.env.NODE_ENV === 'development' ? otpResult.otp : undefined
      }
    });
    
  } catch (error) {
    winston.error(`Resend OTP Error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to resend OTP'
    });
  }
};

exports.checkVoterStatus = async (req, res) => {
  try {
    const { phone, aadhaarNumber } = req.query;
    
    let query = {};
    if (phone) query.phone = phone;
    if (aadhaarNumber) query.aadhaarNumber = aadhaarNumber;
    
    if (!phone && !aadhaarNumber) {
      return res.status(400).json({
        success: false,
        error: 'Phone or Aadhaar number required'
      });
    }
    
    const user = await User.findOne(query).select('-faceData -otp');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Voter not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        exists: true,
        isVerified: user.isVerified,
        isFaceVerified: user.isFaceVerified,
        hasVoted: user.votingStatus.hasVoted,
        constituency: user.constituency,
        canVote: user.canVote()
      }
    });
    
  } catch (error) {
    winston.error(`Check Voter Status Error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to check voter status'
    });
  }
};

// Get user by id for frontend (minimal fields)
exports.getUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId).select('-faceData -otp -securityLogs');
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const payload = {
      id: user._id,
      name: user.fullName || user.name,
      phone: user.phone,
      location: user.location?.coordinates ? user.location : user.constituency,
      hasVoted: user.votingStatus?.hasVoted || user.hasVoted || false
    };

    res.status(200).json({ success: true, user: payload });
  } catch (err) {
    winston.error(`Get User Error: ${err.message}`);
    res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
};