const express = require('express');
const router = express.Router();
const store = require('../data/store');

// Public endpoint to list candidates
router.get('/', (req, res) => {
  const candidates = store.listCandidates();
  // Map fields expected by frontend
  const mapped = candidates.map(c => ({ id: c.id, name: c.name, party: c.party, symbol: c.symbol }));
  res.json({ success: true, candidates: mapped });
});

module.exports = router;
