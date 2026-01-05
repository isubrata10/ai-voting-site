const axios = require('axios');
const crypto = require('crypto');
const winston = require('winston');

class AadhaarService {
  constructor() {
    // This is a simulation service
    // In production, integrate with actual UIDAI APIs
    this.validAadhaarPrefixes = ['1234', '5678', '9012'];
    this.facialMatchThreshold = 0.85;
  }

  async verifyAadhaar(aadhaarNumber) {
    try {
      // Simulate Aadhaar verification
      await this.simulateNetworkDelay();
      
      // Check if Aadhaar number is valid format
      if (!/^\d{12}$/.test(aadhaarNumber)) {
        return {
          success: false,
          error: 'Invalid Aadhaar number format'
        };
      }
      
      // Check if Aadhaar exists in our simulation database
      const isValid = this.validAadhaarPrefixes.some(prefix => 
        aadhaarNumber.startsWith(prefix)
      );
      
      if (!isValid) {
        return {
          success: false,
          error: 'Aadhaar number not found in database'
        };
      }
      
      // Simulate demographic data retrieval
      const demographicData = this.generateDemographicData(aadhaarNumber);
      
      return {
        success: true,
        data: {
          aadhaarNumber: this.maskAadhaar(aadhaarNumber),
          name: demographicData.name,
          dob: demographicData.dob,
          gender: demographicData.gender,
          address: demographicData.address,
          isVerified: true
        },
        message: 'Aadhaar verified successfully'
      };
      
    } catch (error) {
      winston.error(`Aadhaar Verification Error: ${error.message}`);
      return {
        success: false,
        error: 'Aadhaar verification service unavailable'
      };
    }
  }

  async verifyFace(aadhaarNumber, faceImage) {
    try {
      // Simulate face verification
      await this.simulateNetworkDelay();
      
      // In production, use face-api.js or similar
      // This is a simulation
      
      const isValidAadhaar = await this.verifyAadhaar(aadhaarNumber);
      if (!isValidAadhaar.success) {
        return isValidAadhaar;
      }
      
      // Simulate face matching
      const matchScore = Math.random();
      const isMatch = matchScore >= this.facialMatchThreshold;
      
      return {
        success: isMatch,
        data: {
          matchScore: parseFloat(matchScore.toFixed(2)),
          threshold: this.facialMatchThreshold,
          isMatch,
          aadhaarNumber: this.maskAadhaar(aadhaarNumber)
        },
        message: isMatch 
          ? 'Face verification successful' 
          : 'Face verification failed'
      };
      
    } catch (error) {
      winston.error(`Face Verification Error: ${error.message}`);
      return {
        success: false,
        error: 'Face verification service unavailable'
      };
    }
  }

  generateDemographicData(aadhaarNumber) {
    const names = [
      'Rajesh Kumar', 'Priya Sharma', 'Amit Patel', 'Sneha Singh',
      'Vikram Reddy', 'Anjali Desai', 'Sanjay Mehta', 'Pooja Verma'
    ];
    
    const addresses = [
      '123 Main Street, Delhi',
      '456 Park Avenue, Mumbai',
      '789 MG Road, Bangalore',
      '321 Beach Road, Chennai'
    ];
    
    const hash = crypto.createHash('md5').update(aadhaarNumber).digest('hex');
    const index = parseInt(hash.slice(0, 2), 16) % names.length;
    
    return {
      name: names[index],
      dob: `19${parseInt(hash.slice(2, 4), 16) % 90 + 10}-${(parseInt(hash.slice(4, 6), 16) % 12 + 1).toString().padStart(2, '0')}-${(parseInt(hash.slice(6, 8), 16) % 28 + 1).toString().padStart(2, '0')}`,
      gender: parseInt(hash.slice(8, 10), 16) % 2 === 0 ? 'Male' : 'Female',
      address: addresses[parseInt(hash.slice(10, 12), 16) % addresses.length]
    };
  }

  maskAadhaar(aadhaarNumber) {
    return `${aadhaarNumber.slice(0, 4)}-XXXX-${aadhaarNumber.slice(-4)}`;
  }

  async simulateNetworkDelay() {
    return new Promise(resolve => setTimeout(resolve, 500));
  }

  // Generate verification signature (for blockchain)
  generateVerificationSignature(data) {
    const hmac = crypto.createHmac('sha256', process.env.JWT_SECRET);
    hmac.update(JSON.stringify(data));
    return hmac.digest('hex');
  }
}

module.exports = new AadhaarService();