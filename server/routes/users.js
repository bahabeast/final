const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
    try {
        const users = await User.find().select('firstName surname role'); // Select relevant fields
        const formattedUsers = users.map(user => ({
            firstName: user.firstName,
            surname: user.surname,
            role: user.role,
            _id: user._id
        }));
        res.json(formattedUsers);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching users' });
    }
});

module.exports = router;    