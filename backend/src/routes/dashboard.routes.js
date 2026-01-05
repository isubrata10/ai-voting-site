const express = require('express');
const router = express.Router();
const {
  getLiveStats,
  getConstituencyResults,
  getVotingTrends,
  getSystemHealth
} = require('../controllers/dashboard.controller');
const { protect } = require('../middleware/auth');

// Public dashboard data
router.get('/live-stats', getLiveStats);
router.get('/results/:constituency', getConstituencyResults);
router.get('/trends', getVotingTrends);
router.get('/health', getSystemHealth);

// Protected detailed dashboard
router.get('/detailed', protect, getLiveStats);

module.exports = router;