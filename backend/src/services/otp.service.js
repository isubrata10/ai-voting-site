const twilio = require('twilio');
const crypto = require('crypto');
const winston = require('winston');

class OTPService {
  constructor() {
    // In production, use Twilio
    // Initialize Twilio client only if environment variables are provided
    if (process.env.AC1513c303c4f1a0a2bd5a8778bd783555 && process.env.de4c97504f470a2006b75c7a5a2ad9f0) {
      try {
        this.client = twilio(
          process.env.AC1513c303c4f1a0a2bd5a8778bd783555,
          process.env.de4c97504f470a2006b75c7a5a2ad9f0
        );
        winston.info('Twilio client initialized');
      } catch (err) {
        winston.error('Failed to initialize Twilio client: ' + err.message);
        this.client = null;
      }
    } else {
      this.client = null;
    }

    this.otpExpiry = 2 * 60 * 1000; // 2 minutes
    this.otpStore = new Map(); // In-memory store for demo
  }

  async generateOTP(phone) {
    try {
      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const createdAt = new Date();
      const expiresAt = new Date(createdAt.getTime() + this.otpExpiry);

      // Store OTP in memory (in production, use Redis)
      this.otpStore.set(phone, {
        otp,
        createdAt,
        expiresAt,
        attempts: 0
      });
      
      // Clean expired OTPs
      this.cleanExpiredOTPs();
      
      // If Twilio client is configured, send SMS
      if (this.client) {
        try {
          const countryCode = process.env.DEFAULT_COUNTRY_CODE || '+91';
          const toNumber = phone.startsWith('+') ? phone : `${countryCode}${phone}`;

          await this.client.messages.create({
            body: `Your SecureVote OTP is: ${otp}. Valid for 2 minutes.`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: toNumber
          });

          winston.info(`OTP sent via Twilio to ${toNumber}`);

          return {
            success: true,
            expiresAt,
            message: 'OTP sent successfully'
          };
        } catch (sendErr) {
          winston.error(`Twilio send error: ${sendErr.message}`);
          // fall back to returning OTP for debug, but mark as not sent
          return {
            success: false,
            error: 'Failed to send OTP via SMS',
            debugOtp: otp,
            expiresAt
          };
        }
      }

      // For demo (no Twilio), log and return OTP so developer can test
      winston.info(`OTP for ${phone}: ${otp}`);

      return {
        success: true,
        otp, // In production, don't return OTP
        expiresAt,
        message: 'OTP generated (demo)'
      };
      
    } catch (error) {
      winston.error(`OTP Generation Error: ${error.message}`);
      return { success: false, error: 'Failed to generate OTP' };
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
      return { success: false, error: 'Failed to verify OTP' };
    }
  }

  async resendOTP(phone) {
    // Check if recent OTP exists and enforce cooldown
    const otpData = this.otpStore.get(phone);
    const cooldownMs = 30 * 1000; // 30 seconds

    if (otpData) {
      const timeSinceLast = Date.now() - otpData.createdAt.getTime();
      if (timeSinceLast < cooldownMs) {
        return {
          success: false,
          error: 'Please wait before requesting new OTP',
          retryAfter: Math.ceil((cooldownMs - timeSinceLast) / 1000)
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