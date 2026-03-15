const express = require('express');
const User = require('../models/User');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/progress — return repeat count + learned words
router.get('/', async (req, res) => {
    const user = await User.findById(req.user._id);
    res.json({
        successfulRepeats: user.successfulRepeats || 0,
        learnedWords: user.learnedWords || []
    });
});

// POST /api/progress/increment — increment successful repeats
router.post('/increment', async (req, res) => {
    const user = await User.findById(req.user._id);
    user.successfulRepeats = (user.successfulRepeats || 0) + 1;
    await user.save();

    res.json({
        successfulRepeats: user.successfulRepeats,
        learnedWords: user.learnedWords || []
    });
});

// POST /api/progress/learn-word — add a word to learnedWords (deduplicated)
router.post('/learn-word', async (req, res) => {
    const { word, meaning, scenario } = req.body;
    if (!word || !meaning) return res.status(400).json({ error: 'word and meaning are required' });

    const user = await User.findById(req.user._id);
    if (!user.learnedWords) user.learnedWords = [];

    // Only add if not already learned
    const alreadyKnown = user.learnedWords.some(w => w.word === word);
    if (!alreadyKnown) {
        user.learnedWords.push({ word, meaning, scenario: scenario || 'Unknown' });
        await user.save();
    }

    res.json({
        successfulRepeats: user.successfulRepeats || 0,
        learnedWords: user.learnedWords
    });
});

module.exports = router;
