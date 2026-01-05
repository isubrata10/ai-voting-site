const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  voter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  candidate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidate',
    required: true,
    index: true
  },
  
  constituency: {
    type: String,
    required: true,
    index: true
  },
  
  voteMethod: {
    type: String,
    enum: ['online', 'offline'],
    default: 'online'
  },
  
  verificationData: {
    otpVerified: Boolean,
    faceVerified: Boolean,
    locationVerified: Boolean,
    deviceFingerprint: String,
    ipAddress: String
  },
  
  blockchainData: {
    transactionId: String,
    blockNumber: Number,
    timestamp: Date,
    smartContractAddress: String
  },
  
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'rejected', 'audited'],
    default: 'pending'
  },
  
  isAnonymous: {
    type: Boolean,
    default: true
  },
  
  metadata: {
    votingTime: {
      type: Date,
      default: Date.now
    },
    deviceType: String,
    browser: String,
    sessionId: String
  }
  
}, {
  timestamps: true
});

// Compound indexes for faster queries
voteSchema.index({ voter: 1, constituency: 1 }, { unique: true });
voteSchema.index({ candidate: 1, constituency: 1 });
voteSchema.index({ 'blockchainData.transactionId': 1 });

// Virtual for vote receipt
voteSchema.virtual('receiptId').get(function() {
  return `VOTE-${this._id.toString().slice(-8).toUpperCase()}`;
});

// Pre-save middleware to update user voting status
voteSchema.pre('save', async function(next) {
  if (this.isNew) {
    await User.findByIdAndUpdate(this.voter, {
      'votingStatus.hasVoted': true,
      'votingStatus.votedAt': new Date(),
      'votingStatus.candidateId': this.candidate,
      'votingStatus.voteId': this.blockchainData?.transactionId || `LOCAL-${Date.now()}`
    });
  }
  next();
});

// Method to get formatted vote receipt
voteSchema.methods.getReceipt = function() {
  return {
    receiptId: this.receiptId,
    voterId: this.voter._id || this.voter,
    candidateId: this.candidate._id || this.candidate,
    constituency: this.constituency,
    timestamp: this.metadata.votingTime,
    blockchainTransaction: this.blockchainData?.transactionId,
    status: this.status
  };
};

const Vote = mongoose.model('Vote', voteSchema);

module.exports = Vote;