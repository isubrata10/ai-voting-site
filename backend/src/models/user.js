const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Please provide your full name'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  
  phone: {
    type: String,
    required: [true, 'Please provide your phone number'],
    unique: true,
    validate: {
      validator: function(v) {
        return /^[6-9]\d{9}$/.test(v); // Indian mobile number validation
      },
      message: props => `${props.value} is not a valid Indian phone number!`
    }
  },
  
  email: {
    type: String,
    unique: true,
    sparse: true,
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  
  aadhaarNumber: {
    type: String,
    required: [true, 'Please provide your Aadhaar number'],
    unique: true,
    validate: {
      validator: function(v) {
        return /^\d{12}$/.test(v); // 12-digit Aadhaar validation
      },
      message: props => `${props.value} is not a valid Aadhaar number!`
    }
  },
  
  constituency: {
    type: String,
    required: [true, 'Please select your constituency'],
    enum: [
      'Delhi Central',
      'Mumbai North',
      'Bangalore South',
      'Chennai Central',
      'Kolkata North',
      'Hyderabad'
    ]
  },
  
  isVerified: {
    type: Boolean,
    default: false
  },
  
  isFaceVerified: {
    type: Boolean,
    default: false
  },
  
  faceData: {
    type: String, // Base64 encoded face data
    select: false
  },
  
  otp: {
    code: String,
    expiresAt: Date
  },
  
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  },
  
  votingStatus: {
    hasVoted: {
      type: Boolean,
      default: false
    },
    votedAt: Date,
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Candidate'
    },
    voteId: String // Blockchain transaction ID
  },
  
  deviceFingerprint: String,
  
  securityLogs: [{
    action: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    ipAddress: String,
    userAgent: String
  }]
  
}, {
  timestamps: true
});

// Indexes for faster queries
userSchema.index({ phone: 1 });
userSchema.index({ aadhaarNumber: 1 });
userSchema.index({ constituency: 1 });
userSchema.index({ 'votingStatus.hasVoted': 1 });
userSchema.index({ location: '2dsphere' });

// Hash sensitive data before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('aadhaarNumber')) return next();
  
  // In production, use proper encryption
  // This is a simplified version
  const CryptoJS = require('crypto-js');
  this.aadhaarNumber = CryptoJS.AES.encrypt(
    this.aadhaarNumber, 
    process.env.ENCRYPTION_KEY
  ).toString();
  
  next();
});

// Method to verify OTP
userSchema.methods.verifyOTP = function(otpCode) {
  if (!this.otp || !this.otp.code) return false;
  if (this.otp.expiresAt < new Date()) return false;
  return this.otp.code === otpCode;
};

// Method to check if user can vote
userSchema.methods.canVote = function() {
  return this.isVerified && this.isFaceVerified && !this.votingStatus.hasVoted;
};

// Method to record security log
userSchema.methods.addSecurityLog = function(action, ipAddress, userAgent) {
  this.securityLogs.push({
    action,
    ipAddress,
    userAgent
  });
  return this.save();
};

const User = mongoose.model('User', userSchema);

module.exports = User;