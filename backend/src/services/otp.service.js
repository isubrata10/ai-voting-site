const twilio = require('twilio');
const crypto = require('crypto');
const winston = require('winston');

class OTPService {
  constructor() {
    // In production, use Twilio
    // this.client = twilio(
    //   process.env.TWILIO_ACCOUNT_SID,
    //   process.env.TWILIO_AUTH_TOKEN
    // );
    
    this.otpExpiry = 2 * 60 * 1000; // 2 minutes
    this.otpStore = new Map(); // In-memory store for demo
  }

  async generateOTP(phone) {
    try {
      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + this.otpExpiry);
      
      // Store OTP in memory (in production, use Redis)
      this.otpStore.set(phone, {
        otp,
        expiresAt,
        attempts: 0
      });
      
      // Clean expired OTPs
      this.cleanExpiredOTPs();
      
      // In production, send via Twilio
      // await this.client.messages.create({
      //   body: `Your SecureVote OTP is: ${otp}. Valid for 2 minutes.`,
      //   from: process.env.TWILIO_PHONE_NUMBER,
      //   to: `+91${phone}`
      // });
      
      // For demo, log the OTP
      winston.info(`OTP for ${phone}: ${otp}`);
      
      return {
        success: true,
        otp, // In production, don't return OTP
        expiresAt,
        message: 'OTP generated successfully'
      };
      
    } catch (error) {
      winston.error(`OTP Generation Error: ${error.message}`);
      throw new Error('Failed to generate OTP');
    }
  }

  async verifyOTP(phone, otpCode) {
    try {
      const otpData = this.otpStore.get(phone);
      
      if (!otpData) {
        return {
          success: false,
          error: 'OTP not found or expired'
        };
      }
      
      // Check expiry
      if (new Date() > otpData.expiresAt) {
        this.otpStore.delete(phone);
        return {
          success: false,
          error: 'OTP expired'
        };
      }
      
      // Check attempts
      if (otpData.attempts >= 3) {
        this.otpStore.delete(phone);
        return {
          success: false,
          error: 'Too many attempts. Please request new OTP'
        };
      }
      
      // Verify OTP
      if (otpData.otp !== otpCode) {
        otpData.attempts++;
        this.otpStore.set(phone, otpData);
        
        return {
          success: false,
          error: 'Invalid OTP',
          attemptsLeft: 3 - otpData.attempts
        };
      }
      
      // OTP verified successfully
      this.otpStore.delete(phone);
      
      return {
        success: true,
        message: 'OTP verified successfully'
      };
      
    } catch (error) {
      winston.error(`OTP Verification Error: ${error.message}`);
      throw new Error('Failed to verify OTP');
    }
  }

  async resendOTP(phone) {
    // Check if recent OTP exists
    const otpData = this.otpStore.get(phone);
    
    if (otpData) {
      const timeSinceLastOTP = Date.now() - otpData.expiresAt.getTime() + this.otpExpiry;
      
      if (timeSinceLastOTP < 30000) { // 30 seconds cooldown
        return {
          success: false,
          error: 'Please wait before requesting new OTP',
          retryAfter: Math.ceil((30000 - timeSinceLastOTP) / 1000)
        };
      }
    }
    
    return this.generateOTP(phone);
  }

  cleanExpiredOTPs() {
    const now = new Date();
    for (const [phone, otpData] of this.otpStore.entries()) {
      if (now > otpData.expiresAt) {
        this.otpStore.delete(phone);
      }
    }
  }
}

module.exports = new OTPService();