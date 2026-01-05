const express = require('express');
const router = express.Router();
const Candidate = require('../models/candidate');

// Public endpoint to list active candidates (no auth)
router.get('/', async (req, res) => {
  try {
    const { constituency } = req.query;
    const query = { status: 'active' };
    if (constituency) query.constituency = constituency;

    const candidates = await Candidate.find(query).select('name party partySymbol candidateNumber votes');
    const mapped = candidates.map(c => ({
      id: c._id,
      name: c.name,
      party: c.party,
      symbol: c.partySymbol,
      candidateNumber: c.candidateNumber,
      votes: c.votes
    }));

    res.status(200).json({ success: true, candidates: mapped });
  } catch (err) {
    console.error('Candidates fetch error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch candidates' });
  }
});

module.exports = router;
