const mongoose = require('mongoose');

const CandidateSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    party: {
        type: String,
        required: true
    },
    electionId: {
        type: String,
        required: true
    },
    symbol: {
        type: String
    },
    votes: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
});

module.exports = mongoose.model('Candidate', CandidateSchema);