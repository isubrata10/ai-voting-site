const express = require('express');
const router = express.Router();
const auth = require('../../routes/middleware/auth');
const Vote = require('../../models/vote');
const User = require('../../models/user');
const Candidate = require('../../models/candidate');
const crypto = require('crypto');
const store = require('../data/store');

// Simulated AI Face Verification
const verifyFace = async (faceEncoding) => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(Math.random() > 0.1), 500);
  });
};

router.post('/submit', auth, async (req, res) => {
  try {
    const { candidateId, electionId, faceEncoding, deviceFingerprint } = req.body;

    const user = await User.findById(req.user.id);
    if (user && user.hasVoted) {
      return res.status(400).json({ msg: 'You have already voted' });
    }

    const isFaceVerified = await verifyFace(faceEncoding);
    if (!isFaceVerified) return res.status(400).json({ msg: 'Face verification failed' });

    const existingVote = await Vote.findOne({
      $or: [ { userId: req.user.id }, { deviceFingerprint } ]
    });
    if (existingVote) return res.status(400).json({ msg: 'Duplicate vote detected' });

    const voteData = `${req.user.id}-${candidateId}-${electionId}-${Date.now()}`;
    const voteHash = crypto.createHash('sha256').update(voteData).digest('hex');

    const vote = new Vote({ userId: req.user.id, candidateId, electionId, voteHash, ipAddress: req.ip, deviceFingerprint });
    await vote.save();

    if (user) { user.hasVoted = true; user.voteFingerprint = voteHash; await user.save(); }
    await Candidate.findByIdAndUpdate(candidateId, { $inc: { votes: 1 } });

    res.json({ msg: 'Vote submitted successfully', voteHash, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Public vote endpoint matching frontend: POST /api/vote
router.post('/', async (req, res) => {
  try {
    const { userId, candidateId } = req.body;
    if (!userId || !candidateId) return res.status(400).json({ success: false, error: 'Missing userId or candidateId' });

    const result = store.recordVote(userId, candidateId);
    if (!result.ok) return res.status(400).json({ success: false, error: result.reason });

    return res.json({ success: true, voteId: result.voteId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.get('/results/:electionId', async (req, res) => {
  try {
    const results = await Vote.aggregate([
      { $match: { electionId: req.params.electionId } },
      { $group: { _id: '$candidateId', count: { $sum: 1 } } }
    ]);
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

module.exports = router;
