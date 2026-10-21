const express = require('express');
const User = require('../models/User');
const LearnedWord = require('../models/LearnedWord');
const Confusion = require('../models/Confusion');
const MissedScreen = require('../models/MissedScreen');
const SkillStat = require('../models/SkillStat');
const requireAuth = require('../middleware/auth');
const { nextSchedule, initialSchedule, reviewKey, kindFilter } = require('../services/srs');
const {
    validateCompletion, completionUpdate, progressPayload,
    validatePosition, positionUpdate, positionClearFilter, positionClearUpdate,
} = require('../services/lessonProgress');
const {
    validatePair, filterFor, confusionUpdate, checkUpdate, pickDue, pickOpenPairs, pairPayload,
} = require('../services/confusions');
const {
    validateMissed, missedFilter, missedUpdate, pickOpen, missedPayload,
} = require('../services/missedScreens');
const {
    validateEvidence, applyEvidence, skillPayload, byWeakness,
} = require('../services/skillStats');
const {
    readMissKind, applyTally, missHistory, profileFilter, profileUpdate, profilePayload,
} = require('../services/missKinds');
const MissKindStat = require('../models/MissKindStat');
const { summaryPayload } = require('../services/progressSummary');

const router = express.Router();
router.use(requireAuth);

const keyOf = (word) => String(word || '').toLowerCase().trim();

// GET /api/progress — repeat count, learned words, and per-language lesson progress
router.get('/', async (req, res) => {
    const user = await User.findById(req.user._id);
    res.json(progressPayload(user));
});

// POST /api/progress/increment — increment successful repeats
router.post('/increment', async (req, res) => {
    const user = await User.findById(req.user._id);
    user.successfulRepeats = (user.successfulRepeats || 0) + 1;
    await user.save();

    // The chat replaces its whole progress state with this response, so it has
    // to carry `lessonProgress` too or the next increment would erase it there.
    res.json(progressPayload(user));
});

// POST /api/progress/lesson-complete — record a finished lesson
// Body: { lang, lessonIdx }
//
// Idempotent and forward-only: stores the highest lesson index completed in
// that language. Resume is completed + 1, computed on the client, which knows
// how many lessons the language has.
router.post('/lesson-complete', async (req, res) => {
    const parsed = validateCompletion(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });

    await User.updateOne(
        positionClearFilter(req.user._id, parsed.lang, parsed.lessonIdx),
        positionClearUpdate(parsed.lang)
    );
    const user = await User.findByIdAndUpdate(
        req.user._id,
        completionUpdate(parsed.lang, parsed.lessonIdx),
        { returnDocument: 'after' }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json(progressPayload(user));
});

// POST /api/progress/position — where the learner is inside a lesson
// Body: { lang, lessonIdx, stepIdx } — stepIdx is the next screen to show.
// Sent fire-and-forget after every answered step so a killed app resumes there.
router.post('/position', async (req, res) => {
    const parsed = validatePosition(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });

    const user = await User.findByIdAndUpdate(
        req.user._id,
        positionUpdate(parsed.lang, parsed.lessonIdx, parsed.stepIdx),
        { returnDocument: 'after' }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ lessonPosition: progressPayload(user).lessonPosition });
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
// Words only, unless `kind=phrase`: then phrases and conversation lines only.
router.get('/due', async (req, res) => {
    const { lang } = req.query;
    if (!lang) return res.status(400).json({ error: 'lang query param is required' });

    const requested = parseInt(req.query.limit, 10);
    const limit = Math.min(Math.max(Number.isNaN(requested) ? 3 : requested, 1), 50);

    const due = await LearnedWord.find({
        userId: req.user._id,
        lang,
        ...kindFilter(req.query.kind),
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
            ...(w.kind === 'phrase' ? { kind: 'phrase', lessonIdx: w.lessonIdx, phase: w.phase } : {}),
            /* Why this one has been missed before, so a picker can prefer a
               drill that exercises the mistake and not just the word. */
            ...missHistory(w),
        }))
    );
});

// POST /api/progress/review — record a review outcome and reschedule
// Body: { word, lang, wasCorrect, meaning?, scenario?, missKind? | missKinds? }
//
// `missKind` is why the miss happened (shared/missKinds.js): 'order' when every
// word was there in the wrong sequence, 'ending' when the stem was right and
// the ending was not, and so on. Optional and ignorable — a body without it
// schedules exactly as it did before, which is what every old client sends.
router.post('/review', async (req, res) => {
    const { word, lang, wasCorrect, outcome } = req.body;
    // `outcome` carries how much help was needed ('unaided' | 'hinted' |
    // 'revealed' | 'missed'); `wasCorrect` is the older boolean form.
    const graded = outcome !== undefined ? outcome : wasCorrect;
    if (!word || !lang || (typeof wasCorrect !== 'boolean' && typeof outcome !== 'string')) {
        return res.status(400).json({ error: 'word, lang and one of outcome (string) or wasCorrect (boolean) are required' });
    }

    const kind = req.body.kind === 'phrase' ? 'phrase' : 'word';
    const lessonIdx = Number(req.body.lessonIdx);
    if (kind === 'phrase' && (!Number.isInteger(lessonIdx) || lessonIdx < 0)) {
        return res.status(400).json({ error: 'a phrase needs lessonIdx' });
    }
    const wordKey = reviewKey(word, kind);
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
        ...(kind === 'phrase' ? { kind, lessonIdx, phase: String(req.body.phase || '') } : {}),
    });

    const now = new Date();
    /* Why it was missed is read BEFORE the schedule, because the schedule
       depends on it: an order, extra-word or spelling miss is an answer whose
       words were all there, so the ladder drops one rung instead of to the
       bottom (srs.js SCHEDULE_DEMOTE_KINDS). An old client sends no kind and
       gets exactly today's behaviour. */
    const why = readMissKind(req.body);
    const scheduled = nextSchedule(target.box, graded, now, { missKind: why });

    target.box = scheduled.box;
    target.dueAt = scheduled.dueAt;
    target.reviews = (target.reviews || 0) + 1;
    if (scheduled.lapse) {
        target.lapses = (target.lapses || 0) + 1;
    }
    target.lastOutcome = scheduled.outcome;
    target.lastReviewedAt = now;

    /* Why it was missed, on the item and in the learner's profile. Both are
       written beside the schedule rather than on their own endpoint: a miss
       counted twice (a retry, a resend) would skew the profile, and the review
       post is already the one call step mode makes exactly once per screen. */
    const missKind = applyTally(target, why, scheduled.outcome);

    await target.save();
    if (missKind) {
        /* Fire and forget as far as the response is concerned: the schedule is
           the contract of this endpoint, and a failed profile write must not
           turn a recorded review into an error the client retries. */
        MissKindStat.updateOne(
            profileFilter(req.user._id, lang, missKind),
            profileUpdate(target.word, now),
            { upsert: true }
        ).catch((err) => console.warn('[progress] miss-kind profile write failed', err.message));
    }

    res.json({
        word: target.word,
        lang: target.lang,
        box: target.box,
        dueAt: target.dueAt,
        reviews: target.reviews,
        lapses: target.lapses,
        outcome: scheduled.outcome,
        ...(missKind ? { missKind } : {}),
    });
});

// GET /api/progress/miss-kinds?lang=Kannada — how this learner gets things
// wrong, most frequent first: [{ kind, label, count, share, lastSeen,
// recentWords }]. Eleven rows at most, so no limit and no paging.
router.get('/miss-kinds', async (req, res) => {
    const { lang } = req.query;
    if (typeof lang !== 'string' || !lang) return res.status(400).json({ error: 'lang query param is required' });
    const docs = await MissKindStat.find({ userId: req.user._id, lang }).limit(50).lean();
    res.json(profilePayload(docs));
});

// GET /api/progress/vocab?lang=Telugu — full vocabulary with schedule state.
// Makes the ladder inspectable, and gives the Word History screen something
// truthful to show ("47 words, 6 due now") instead of an utterance count.
router.get('/vocab', async (req, res) => {
    const { lang } = req.query;
    const query = { userId: req.user._id, ...(lang ? { lang } : {}), ...kindFilter(req.query.kind) };

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
            ...missHistory(w),
        })),
    });
});

// GET /api/progress/summary?lang=Kannada — the home page's stats in one light
// read: lessons completed, words and phrases learned, skills by level.
router.get('/summary', async (req, res) => {
    const { lang } = req.query;
    if (typeof lang !== 'string' || !lang) return res.status(400).json({ error: 'lang query param is required' });
    const userId = req.user._id;
    const [user, words, skills] = await Promise.all([
        User.findById(userId).select('lessonProgress').lean(),
        LearnedWord.find({ userId, lang }).select('kind dueAt').lean(),
        SkillStat.find({ userId, lang }).select('mastery evidence').limit(2000).lean(),
    ]);
    res.json(summaryPayload({ lang, user, words, skills }));
});

// POST /api/progress/confusion — the learner said one taught word for another
// Body: { lang, said, needed, saidMeaning?, neededMeaning?, scenario? }
// Fire-and-forget from step mode, after missHelp names the pair.
router.post('/confusion', async (req, res) => {
    const p = validatePair(req.body);
    if (p.error) return res.status(400).json({ error: p.error });
    const doc = await Confusion.findOneAndUpdate(
        filterFor(req.user._id, p),
        confusionUpdate(p),
        { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
    ).lean();
    res.json(pairPayload(doc));
});

// GET /api/progress/confusions/due?lang=Kannada&scenario=4 — at most one open
// pair to contrast in this lesson; never one last seen in this same lesson.
router.get('/confusions/due', async (req, res) => {
    const { lang } = req.query;
    if (typeof lang !== 'string' || !lang) return res.status(400).json({ error: 'lang query param is required' });
    const open = await Confusion.find({ userId: req.user._id, lang, retired: false }).limit(50).lean();
    res.json(pairPayload(pickDue(open, req.query.scenario)));
});

// POST /api/progress/confusion/check — how a contrast screen went
// Body: { lang, said, needed, correct, scenario? }. Two clean answers in a row retire it.
router.post('/confusion/check', async (req, res) => {
    const p = validatePair(req.body);
    if (p.error) return res.status(400).json({ error: p.error });
    if (typeof req.body.correct !== 'boolean') return res.status(400).json({ error: 'correct (boolean) is required' });
    const doc = await Confusion.findOne(filterFor(req.user._id, p));
    if (!doc) return res.status(404).json({ error: 'no such pair' });
    Object.assign(doc, checkUpdate(doc, req.body.correct, p.scenario));
    await doc.save();
    res.json(pairPayload(doc));
});

// GET /api/progress/confusions/open?lang=Kannada&limit=3 — open pairs for a
// practice session, most frequent first. Unlike /confusions/due there is no
// "not this lesson" rule: practice is not a lesson.
router.get('/confusions/open', async (req, res) => {
    const { lang } = req.query;
    if (typeof lang !== 'string' || !lang) return res.status(400).json({ error: 'lang query param is required' });
    const requested = parseInt(req.query.limit, 10);
    const limit = Math.min(Math.max(Number.isNaN(requested) ? 3 : requested, 1), 10);
    const open = await Confusion.find({ userId: req.user._id, lang, retired: false }).limit(50).lean();
    res.json(pickOpenPairs(open, limit).map(pairPayload));
});

// POST /api/progress/missed — a lesson screen whose answer had to be revealed
// Body: { lang, lessonIdx, kind: 'word'|'drill', key }. Fire-and-forget from step mode.
router.post('/missed', async (req, res) => {
    const m = validateMissed(req.body);
    if (m.error) return res.status(400).json({ error: m.error });
    const doc = await MissedScreen.findOneAndUpdate(
        missedFilter(req.user._id, m), missedUpdate(m),
        { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
    ).lean();
    res.json(missedPayload(doc));
});

// GET /api/progress/missed?lang=Kannada&limit=5 — open missed screens for practice
router.get('/missed', async (req, res) => {
    const { lang } = req.query;
    if (typeof lang !== 'string' || !lang) return res.status(400).json({ error: 'lang query param is required' });
    const requested = parseInt(req.query.limit, 10);
    const limit = Math.min(Math.max(Number.isNaN(requested) ? 5 : requested, 1), 20);
    const open = await MissedScreen.find({ userId: req.user._id, lang, retired: false }).limit(100).lean();
    res.json(pickOpen(open, limit).map(missedPayload));
});

// POST /api/progress/missed/check — how a missed screen went when practice
// brought it back. Body: { lang, lessonIdx, kind, key, correct }. A clean
// first-try answer retires it.
router.post('/missed/check', async (req, res) => {
    const m = validateMissed(req.body);
    if (m.error) return res.status(400).json({ error: m.error });
    if (typeof req.body.correct !== 'boolean') return res.status(400).json({ error: 'correct (boolean) is required' });
    const doc = await MissedScreen.findOne(missedFilter(req.user._id, m));
    if (!doc) return res.status(404).json({ error: 'no such screen' });
    if (req.body.correct) doc.retired = true;
    await doc.save();
    res.json(missedPayload(doc));
});

// POST /api/progress/skills/evidence — what one settled screen said about each
// skill it tested. Body: { lang, items: [{ skillId, score 0..1, weight 0..1 }] },
// computed client-side by skills.skillEvidence. Fire-and-forget from step mode.
router.post('/skills/evidence', async (req, res) => {
    const e = validateEvidence(req.body);
    if (e.error) return res.status(400).json({ error: e.error });
    const userId = req.user._id;
    const prev = await SkillStat.find({ userId, lang: e.lang, skillId: { $in: e.items.map(i => i.skillId) } }).lean();
    const byId = new Map(prev.map(d => [d.skillId, d]));
    const now = new Date();
    const ops = e.items.map(it => ({
        updateOne: {
            filter: { userId, lang: e.lang, skillId: it.skillId },
            update: { $set: applyEvidence(byId.get(it.skillId), it, now) },
            upsert: true,
        },
    }));
    await SkillStat.bulkWrite(ops, { ordered: false });
    res.json({ updated: ops.length });
});

// GET /api/progress/skills?lang=Kannada[&weak=1][&limit=50] — mastery per
// skill, weakest first, each with `level` (new|weak|learning|strong) and `weak`.
router.get('/skills', async (req, res) => {
    const { lang } = req.query;
    if (typeof lang !== 'string' || !lang) return res.status(400).json({ error: 'lang query param is required' });
    const requested = parseInt(req.query.limit, 10);
    const limit = Math.min(Math.max(Number.isNaN(requested) ? 500 : requested, 1), 1000);
    const docs = await SkillStat.find({ userId: req.user._id, lang }).limit(2000).lean();
    let out = docs.map(skillPayload).sort(byWeakness);
    if (req.query.weak === '1') out = out.filter(s => s.weak);
    res.json(out.slice(0, limit));
});

module.exports = router;
