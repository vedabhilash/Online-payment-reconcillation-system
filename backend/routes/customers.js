const router = require('express').Router();
const auth = require('../middleware/auth');
const Customer = require('../models/Customer');
const User = require('../models/User');

// GET /api/customers
router.get('/', auth, async (req, res) => {
    try {
        const customers = await Customer.find({ userId: req.userId }).sort({ name: 1 });
        res.json(customers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/customers
router.post('/', auth, async (req, res) => {
    try {
        const { name, email, phone, billingAddress, taxId, notes } = req.body;

        let loginUserId = null;
        if (email) {
            const existingUser = await User.findOne({ email: new RegExp(`^${email}$`, 'i'), role: 'CUSTOMER' });
            if (existingUser) loginUserId = existingUser._id;
        }

        const customer = await Customer.create({
            userId: req.userId,
            loginUserId,
            name, email, phone, billingAddress, taxId, notes
        });
        res.json(customer);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/customers/:id
router.get('/:id', auth, async (req, res) => {
    try {
        const customer = await Customer.findOne({ _id: req.params.id, userId: req.userId });
        if (!customer) return res.status(404).json({ error: 'Customer not found' });
        res.json(customer);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
