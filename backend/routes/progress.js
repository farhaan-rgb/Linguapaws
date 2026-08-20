const express = require('express');
const User = require('../models/User');
const LearnedWord = require('../models/LearnedWord');
const requireAuth = require('../middleware/auth');
const { nextSchedule, initialSchedule } = require('../services/srs');

const router = express.Router();
router.use(requireAuth);

const keyOf = (word) => String(word || '').toLowerCase().trim();

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

// POST /api/progress/learn-word — record a word as taught and put it on the ladder
// Body: { word, lang, meaning?, scenario? }
//
// Idempotent by design: re-teaching a word the learner already has must not
// reset its schedule, or a repeated curriculum entry (`sare` appears in Telugu
// L4, L20, L24 and L29) would knock it back to box 0 every time.
router.post('/learn-word', async (req, res) => {
    const { word, lang, meaning, scenario } = req.body;
    if (!word || !lang) return res.status(400).json({ error: 'word and lang are required' });

    const wordKey = keyOf(word);
    if (!wordKey) return res.status(400).json({ error: 'word is empty' });

    const { box, dueAt } = initialSchedule();

    const doc = await LearnedWord.findOneAndUpdate(
        { userId: req.user._id, lang, wordKey },
        {
            $setOnInsert: {
                word,
                meaning: meaning || '',
                scenario: scenario || '',
                box,
                dueAt,
            },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    res.json({
        word: doc.word,
        lang: doc.lang,
        meaning: doc.meaning,
        box: doc.box,
        dueAt: doc.dueAt,
    });
});

// GET /api/progress/due?lang=Telugu&limit=3 — the review queue, most overdue first
router.get('/due', async (req, res) => {
    const { lang } = req.query;
    if (!lang) return res.status(400).json({ error: 'lang query param is required' });

    const requested = parseInt(req.query.limit, 10);
    const limit = Math.min(Math.max(Number.isNaN(requested) ? 3 : requested, 1), 50);

    const due = await LearnedWord.find({
        userId: req.user._id,
        lang,
        dueAt: { $lte: new Date() },
    })
        .sort({ dueAt: 1 })
        .limit(limit)
        .lean();

    res.json(
        due.map((w) => ({
            word: w.word,
            meaning: w.meaning,
            scenario: w.scenario,
            box: w.box,
            dueAt: w.dueAt,
        }))
    );
});

// POST /api/progress/review — record a review outcome and reschedule
// Body: { word, lang, wasCorrect, meaning?, scenario? }
router.post('/review', async (req, res) => {
    const { word, lang, wasCorrect } = req.body;
    if (!word || !lang || typeof wasCorrect !== 'boolean') {
        return res.status(400).json({ error: 'word, lang and wasCorrect (boolean) are required' });
    }

    const wordKey = keyOf(word);
    if (!wordKey) return res.status(400).json({ error: 'word is empty' });

    const existing = await LearnedWord.findOne({ userId: req.user._id, lang, wordKey });

    // A word can be reviewed without ever having been recorded as taught — the
    // review slots fall back to current-lesson vocabulary before the learner has
    // built up any history. Create the record rather than 404, so the fallback
    // still seeds a schedule.
    const target = existing || new LearnedWord({
        userId: req.user._id,
        lang,
        word,
        wordKey,
        meaning: req.body.meaning || '',
        scenario: req.body.scenario || '',
    });

    const now = new Date();
    const { box, dueAt } = nextSchedule(target.box, wasCorrect, now);

    target.box = box;
    target.dueAt = dueAt;
    target.reviews = (target.reviews || 0) + 1;
    if (!wasCorrect) target.lapses = (target.lapses || 0) + 1;
    target.lastReviewedAt = now;

    await target.save();

    res.json({
        word: target.word,
        lang: target.lang,
        box: target.box,
        dueAt: target.dueAt,
        reviews: target.reviews,
        lapses: target.lapses,
    });
});

// GET /api/progress/vocab?lang=Telugu — full vocabulary with schedule state.
// Makes the ladder inspectable, and gives the Word History screen something
// truthful to show ("47 words, 6 due now") instead of an utterance count.
router.get('/vocab', async (req, res) => {
    const { lang } = req.query;
    const query = { userId: req.user._id, ...(lang ? { lang } : {}) };

    const words = await LearnedWord.find(query).sort({ box: -1, dueAt: 1 }).lean();
    const now = new Date();

    res.json({
        total: words.length,
        dueNow: words.filter((w) => w.dueAt <= now).length,
        words: words.map((w) => ({
            word: w.word,
            lang: w.lang,
            meaning: w.meaning,
            scenario: w.scenario,
            box: w.box,
            dueAt: w.dueAt,
            reviews: w.reviews,
            lapses: w.lapses,
        })),
    });
});

module.exports = router;
