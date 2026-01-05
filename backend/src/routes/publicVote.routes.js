const express = require('express');
const router = express.Router();
const Vote = require('../models/Vote');
const crypto = require('crypto');

// Public endpoint used by frontend: POST /api/vote
router.post('/', async (req, res) => {
  try {
    const { userId, candidateId } = req.body;
    if (!userId || !candidateId) return res.status(400).json({ success: false, error: 'Missing userId or candidateId' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    if (!user.isVerified || !user.isFaceVerified) return res.status(403).json({ success: false, error: 'User not fully verified' });
    if (user.votingStatus && user.votingStatus.hasVoted) return res.status(409).json({ success: false, error: 'User has already voted' });

    const candidate = await Candidate.findById(candidateId);
    if (!candidate) return res.status(404).json({ success: false, error: 'Candidate not found' });

    const voteHash = crypto.createHash('sha256').update(String(userId) + String(candidateId) + Date.now()).digest('hex');

    const vote = await Vote.create({
      userId: user._id,
      candidateId: candidate._id,
      electionId: candidate.electionId || 'default',
      voteHash,
      ipAddress: req.ip,
      deviceFingerprint: req.headers['user-agent']
    });

    // mark user as voted
    user.votingStatus = user.votingStatus || {};
    user.votingStatus.hasVoted = true;
    user.votingStatus.votedAt = new Date();
    user.votingStatus.candidateId = candidate._id;
    user.votingStatus.voteId = voteHash;
    await user.save();

    // increment candidate votes
    candidate.votes = (candidate.votes || 0) + 1;
    await candidate.save();

    res.status(201).json({ success: true, voteId: voteHash });
  } catch (err) {
    console.error('Public vote error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to record vote' });
  }
});

module.exports = router;
