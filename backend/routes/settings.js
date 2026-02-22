const express = require('express');
const User = require('../models/User');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/settings — return user settings
router.get('/', async (req, res) => {
    res.json({
        nativeLang: req.user.nativeLang || null,
        englishLevel: req.user.englishLevel || null,
    });
});

// PUT /api/settings — update native language and/or english level
// Body: { nativeLang?: { id, name, native }, englishLevel?: { id, label, appDetected? } }
router.put('/', async (req, res) => {
    const { nativeLang, englishLevel } = req.body;

    const update = {};
    if (nativeLang?.id && nativeLang?.name) update.nativeLang = nativeLang;
    if (englishLevel?.id) update.englishLevel = englishLevel;

    if (Object.keys(update).length === 0) {
        return res.status(400).json({ error: 'At least one valid field (nativeLang or englishLevel) is required' });
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        update,
        { new: true }
    ).lean();

    res.json({
        nativeLang: user.nativeLang,
        englishLevel: user.englishLevel,
    });
});

module.exports = router;
