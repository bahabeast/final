const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
    const token = req.header('x-auth-token');
    console.log('Received token:', token); // Add for debugging
    if (!token) return res.status(401).json({ success: false, message: 'No token, authorization denied' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        console.log('Token decoded, user:', decoded); // Add for debugging
        next();
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(400).json({ success: false, message: 'Token is not valid' });
    }
};

module.exports = auth;