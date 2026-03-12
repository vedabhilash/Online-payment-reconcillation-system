const router = require('express').Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Customer = require('../models/Customer');

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
    try {
        const { email, password, role } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
        if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

        const existing = await User.findOne({ email });
        if (existing) return res.status(409).json({ error: 'Email already registered' });

        const user = await User.create({ email, password, role: role || 'ADMIN' });

        if (user.role === 'CUSTOMER') {
            await Customer.updateMany({ email: new RegExp(`^${email}$`, 'i') }, { loginUserId: user._id });
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({
            token,
            user: { id: user._id, email: user.email, displayName: user.displayName, role: user.role },
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password, role } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ error: 'Invalid email or password' });

        const valid = await user.comparePassword(password);
        if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

        if (role && user.role !== role) {
            return res.status(403).json({ error: 'Please choose the correct Account Type (Admin / User)' });
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({
            token,
            user: { id: user._id, email: user.email, displayName: user.displayName, role: user.role },
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/auth/me
router.get('/me', require('../middleware/auth'), async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ id: user._id, email: user.email, displayName: user.displayName, settings: user.settings, role: user.role });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
