const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Vote = require('../models/Vote');
const User = require('../models/User');
const Candidate = require('../models/Candidate');
const crypto = require('crypto');

// AI Face Verification Middleware
const verifyFace = async (faceEncoding) => {
    // This would integrate with an AI service like AWS Rekognition, Azure Face API, etc.
    // For now, we'll simulate verification
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(Math.random() > 0.1); // 90% success rate for simulation
        }, 1000);
    });
};

// Submit Vote
router.post('/submit', auth, async (req, res) => {
    try {
        const { candidateId, electionId, faceEncoding, deviceFingerprint } = req.body;
        
        // Check if user has already voted
        const user = await User.findById(req.user.id);
        if (user.hasVoted) {
            return res.status(400).json({ msg: 'You have already voted' });
        }

        // AI Face Verification
        const isFaceVerified = await verifyFace(faceEncoding);
        if (!isFaceVerified) {
            return res.status(400).json({ msg: 'Face verification failed' });
        }

        // Check for duplicate voting using device fingerprint
        const existingVote = await Vote.findOne({ 
            $or: [
                { userId: req.user.id },
                { deviceFingerprint: deviceFingerprint }
            ]
        });
        
        if (existingVote) {
            return res.status(400).json({ msg: 'Duplicate vote detected' });
        }

        // Create unique vote hash
        const voteData = `${req.user.id}-${candidateId}-${electionId}-${Date.now()}`;
        const voteHash = crypto.createHash('sha256').update(voteData).digest('hex');

        // Create vote record
        const vote = new Vote({
            userId: req.user.id,
            candidateId,
            electionId,
            voteHash,
            ipAddress: req.ip,
            deviceFingerprint
        });

        await vote.save();

        // Update user's voting status
        user.hasVoted = true;
        user.voteFingerprint = voteHash;
        await user.save();

        // Update candidate vote count
        await Candidate.findByIdAndUpdate(candidateId, { $inc: { votes: 1 } });

        res.json({ 
            msg: 'Vote submitted successfully', 
            voteHash,
            timestamp: new Date().toISOString()
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Get Election Results
router.get('/results/:electionId', async (req, res) => {
    try {
        const results = await Vote.aggregate([
            { $match: { electionId: req.params.electionId } },
            { $group: { _id: "$candidateId", count: { $sum: 1 } } }
        ]);

        res.json(results);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
