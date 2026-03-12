const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }
    const token = header.slice(7);
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = payload.userId;

        const user = await User.findById(req.userId).select('role');
        if (user) {
            req.userRole = user.role;
        } else {
            console.warn(`[AUTH] User not found for ID: ${req.userId}`);
            return res.status(401).json({ error: 'User no longer exists' });
        }

        next();
    } catch (err) {
        console.error('[AUTH] Token error:', err.message);
        res.status(401).json({ error: 'Invalid token' });
    }
};

auth.requireAdmin = (req, res, next) => {
    auth(req, res, () => {
        if (req.userRole !== 'ADMIN') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        next();
    });
};

auth.requireCustomer = (req, res, next) => {
    auth(req, res, () => {
        if (req.userRole !== 'CUSTOMER') {
            return res.status(403).json({ error: 'Customer access required' });
        }
        next();
    });
};

module.exports = auth;
