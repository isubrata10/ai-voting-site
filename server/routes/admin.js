const express = require('express');
const router = express.Router();

// Minimal admin placeholder
router.get('/', (req, res) => {
  res.json({ msg: 'Admin routes not implemented in this instance.' });
});

module.exports = router;
