const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  manageCandidates,
  getVoterAnalytics,
  exportVoteData,
  resetSystem
} = require('../controllers/admin.controller');
const { protect, adminOnly } = require('../middleware/auth');

// All admin routes require authentication and admin privileges
router.use(protect);
router.use(adminOnly);

router.get('/dashboard', getDashboardStats);
router.post('/candidates', manageCandidates);
router.get('/voters/analytics', getVoterAnalytics);
router.get('/export', exportVoteData);
router.post('/reset', resetSystem);

module.exports = router;