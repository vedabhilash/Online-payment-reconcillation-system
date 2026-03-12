const router = require('express').Router();
const auth = require('../middleware/auth');
const AuditLog = require('../models/AuditLog');

// GET /api/audit
router.get('/', auth, async (req, res) => {
    try {
        const logs = await AuditLog.find({ userId: req.userId })
            .sort({ createdAt: -1 })
            .limit(100);
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
