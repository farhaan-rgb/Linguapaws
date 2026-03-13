const express = require('express');
const User = require('../models/User');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/progress — return repeat count
router.get('/', async (req, res) => {
    const user = await User.findById(req.user._id);
    res.json({
        successfulRepeats: user.successfulRepeats || 0
    });
});

// POST /api/progress/increment — increment successful repeats
router.post('/increment', async (req, res) => {
    const user = await User.findById(req.user._id);
    user.successfulRepeats = (user.successfulRepeats || 0) + 1;
    await user.save();

    res.json({
        successfulRepeats: user.successfulRepeats
    });
});

module.exports = router;
