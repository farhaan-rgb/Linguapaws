/* The home page's two numbers — words learned and how far along the course is —
   built from what step mode and chat actually write: LearnedWord rows, the
   per-language lessonProgress index, and SkillStat levels. Pure, so the counts
   can be tested without a database.

   Replaces the legacy `wordTracker` count (words *typed* in chat), which step
   mode never fed: a learner twelve Kannada lessons in saw 0 words and "Newbie". */
const { levelOf } = require('./skillStats');
const { lessonProgressOf } = require('./lessonProgress');

const LEVELS = ['strong', 'learning', 'weak', 'new'];

/** `words`: LearnedWord rows ({ kind, dueAt }); `skills`: SkillStat rows. */
function summaryPayload({ lang, user, words = [], skills = [], now = new Date() }) {
    const idx = lessonProgressOf(user)[lang];
    const skillCounts = Object.fromEntries(LEVELS.map(l => [l, 0]));
    for (const s of skills) skillCounts[levelOf(s)] += 1;
    const vocab = words.filter(w => w.kind !== 'phrase');
    return {
        lang,
        // lessonProgress holds the highest completed lesson *index*.
        lessonsCompleted: Number.isInteger(idx) && idx >= 0 ? idx + 1 : 0,
        words: vocab.length,
        wordsDue: vocab.filter(w => w.dueAt && new Date(w.dueAt) <= now).length,
        phrases: words.length - vocab.length,
        skills: { ...skillCounts, total: skills.length },
    };
}

module.exports = { summaryPayload };
