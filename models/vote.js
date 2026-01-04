const mongoose = require('mongoose');

const VoteSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    candidateId: {
        type: String,
        required: true
    },
    electionId: {
        type: String,
        required: true
    },
    voteHash: {
        type: String,
        required: true,
        unique: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    ipAddress: {
        type: String
    },
    deviceFingerprint: {
        type: String
    },
    blockchainTransactionId: {
        type: String
    },
    isVerified: {
        type: Boolean,
        default: true
    }
});

module.exports = mongoose.model('Vote', VoteSchema);