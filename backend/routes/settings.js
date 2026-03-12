const router = require('express').Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// GET /api/settings
router.get('/', auth, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('settings displayName email');
        res.json(user.settings || {});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/settings
router.put('/', auth, async (req, res) => {
    try {
        const { dateTolerance, amountTolerance, defaultCurrency, displayName } = req.body;
        const update = {};
        if (dateTolerance !== undefined) update['settings.dateTolerance'] = dateTolerance;
        if (amountTolerance !== undefined) update['settings.amountTolerance'] = amountTolerance;
        if (defaultCurrency !== undefined) update['settings.defaultCurrency'] = defaultCurrency;
        if (displayName !== undefined) update['displayName'] = displayName;

        await User.findByIdAndUpdate(req.userId, update);
        res.json({ message: 'Settings saved' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
