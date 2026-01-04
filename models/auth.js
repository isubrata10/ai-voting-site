const express = require('express');
const router = express.Router();
const User = require('./User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Register User
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, aadharNumber, phone, faceEncoding } = req.body;
        
        // Check if user exists
        let user = await User.findOne({ $or: [{ email }, { aadharNumber }] });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        // Create new user
        user = new User({
            name,
            email,
            password,
            aadharNumber,
            phone,
            faceEncoding
        });

        await user.save();

        // Create JWT token
        const payload = { user: { id: user.id } };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5h' });

        res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        const payload = { user: { id: user.id } };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5h' });

        res.json({ token, user: { id: user.id, name: user.name, email: user.email, hasVoted: user.hasVoted } });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;