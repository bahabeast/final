const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const admin = await Admin.findOne({ username });
        console.log('Admin found:', admin); // Debugging
        if (!admin || !await bcrypt.compare(password, admin.password)) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        const token = jwt.sign({ id: admin._id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ success: true, token }); // Ensure token is in the response body
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Login error' });
    }
});

router.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        // Check if username already exists
        const existingAdmin = await Admin.findOne({ username });
        if (existingAdmin) {
            return res.status(400).json({ success: false, message: 'Username already exists' });
        }
        // Validate password (optional, add your own rules)
        if (!password || password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
        }
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        // Create new admin
        const admin = new Admin({ username, password: hashedPassword });
        await admin.save();
        // Generate token
        const token = jwt.sign({ id: admin._id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ success: true, token });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, message: 'Registration error: ' + error.message });
    }
});
router.get('/', auth, async (req, res) => {
    try {
        const query = {};
        if (req.query.username) query.username = req.query.username;
        const admins = await Admin.find(query).select('username'); // Only return username
        console.log('Admin query result:', admins); // Add for debugging
        res.json(admins);
    } catch (error) {
        console.error('Error fetching admins:', error);
        res.status(500).json({ success: false, message: 'Error fetching admins' });
    }
});
module.exports = router;