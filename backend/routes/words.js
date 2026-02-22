const express = require('express');
const Word = require('../models/Word');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/words — return all words for the current user, sorted by count desc
router.get('/', async (req, res) => {
    const words = await Word.find({ userId: req.user._id })
        .sort({ count: -1 })
        .lean();
    res.json(words.map(w => ({ text: w.word, count: w.count })));
});

// POST /api/words — add or increment a word
// Body: { word: string }
router.post('/', async (req, res) => {
    const { word } = req.body;
    if (!word || !/^[a-z]{4,}$/.test(word.toLowerCase().trim())) {
        return res.status(400).json({ error: 'Invalid word' });
    }
    const normalized = word.toLowerCase().trim();
    const updated = await Word.findOneAndUpdate(
        { userId: req.user._id, word: normalized },
        { $inc: { count: 1 }, $set: { lastUsed: new Date() } },
        { new: true, upsert: true }
    );
    res.json({ text: updated.word, count: updated.count });
});

// DELETE /api/words — clear all words for the current user
router.delete('/', async (req, res) => {
    await Word.deleteMany({ userId: req.user._id });
    res.json({ message: 'Word history cleared' });
});

module.exports = router;
