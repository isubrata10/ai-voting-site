const express = require('express');
const router = express.Router();
const {
  getCandidates,
  castVote,
  getVoteReceipt,
  verifyVote
} = require('../controllers/vote.contoller');
const { protect, rateLimitByIP } = require('../middleware/auth');
const { validateVote, validate } = require('../middleware/validation');

// Public routes
router.get('/candidates', getCandidates);
router.get('/verify/:transactionId', verifyVote);

// Protected routes (require full verification)
router.use(protect);
router.use(rateLimitByIP); // Prevent vote spamming

router.post('/cast', validateVote, validate, castVote);
router.get('/receipt', getVoteReceipt);

module.exports = router;