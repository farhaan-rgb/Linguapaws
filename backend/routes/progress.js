const express = require('express');
const User = require('../models/User');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const PROGRESSION_THRESHOLDS = { zero: 3, basic: 5, conversational: 8 };
const NEXT_LEVEL = { zero: 'basic', basic: 'conversational', conversational: 'fluent' };
const LEVEL_LABELS = { zero: 'Beginner', basic: 'Basic', conversational: 'Conversational', fluent: 'Fluent' };

// GET /api/progress — return current level and repeat count
router.get('/', async (req, res) => {
    const user = req.user;
    const currentLevelId = user.englishLevel?.id || 'zero';
    const needed = PROGRESSION_THRESHOLDS[currentLevelId] || null;
    res.json({
        level: currentLevelId,
        levelLabel: LEVEL_LABELS[currentLevelId] || 'Beginner',
        successfulRepeats: user.successfulRepeats || 0,
        needed, // null if at max level (fluent)
        nextLevel: NEXT_LEVEL[currentLevelId] || null,
        nextLevelLabel: LEVEL_LABELS[NEXT_LEVEL[currentLevelId]] || null,
    });
});

// POST /api/progress/increment — increment successful repeats; auto-level-up if threshold reached
router.post('/increment', async (req, res) => {
    const user = await User.findById(req.user._id);
    const currentLevelId = user.englishLevel?.id || 'zero';
    const needed = PROGRESSION_THRESHOLDS[currentLevelId];

    // Already at max level
    if (!needed) {
        return res.json({
            leveledUp: false,
            level: currentLevelId,
            levelLabel: LEVEL_LABELS[currentLevelId],
            successfulRepeats: user.successfulRepeats || 0,
            needed: null,
        });
    }

    user.successfulRepeats = (user.successfulRepeats || 0) + 1;

    let leveledUp = false;
    let newLevelId = currentLevelId;

    if (user.successfulRepeats >= needed && NEXT_LEVEL[currentLevelId]) {
        newLevelId = NEXT_LEVEL[currentLevelId];
        user.englishLevel = { id: newLevelId, label: LEVEL_LABELS[newLevelId], appDetected: true };
        user.successfulRepeats = 0; // Reset for next level
        leveledUp = true;
    }

    await user.save();

    res.json({
        leveledUp,
        level: newLevelId,
        levelLabel: LEVEL_LABELS[newLevelId],
        successfulRepeats: user.successfulRepeats,
        needed: PROGRESSION_THRESHOLDS[newLevelId] || null,
        nextLevel: NEXT_LEVEL[newLevelId] || null,
        nextLevelLabel: LEVEL_LABELS[NEXT_LEVEL[newLevelId]] || null,
    });
});

module.exports = router;
