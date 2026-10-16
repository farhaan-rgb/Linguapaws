const mongoose = require('mongoose');

/**
 * One vocabulary item a learner has been taught, plus its review schedule.
 *
 * Kept in its own collection rather than as an array on User: the due-word
 * lookup needs an index on `dueAt`, and a subdocument array would have to be
 * pulled in full on every progress read.
 *
 * Distinct from the `Word` model — that one counts every word the learner has
 * ever *uttered* (for the Word History screen). This one is the curriculum
 * vocabulary they have been *taught*, and it is what the review slots draw on.
 */
const learnedWordSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

        // Curriculum language name, e.g. 'Telugu' | 'Kannada'.
        // Required: without it, Telugu "Nanna" (Father, L17) and Kannada
        // "Nanna" (My, L5) collapse into one record with the wrong gloss.
        lang: { type: String, required: true },

        word: { type: String, required: true },      // canonical form, for display
        wordKey: { type: String, required: true },   // lowercased, for the unique index
        meaning: { type: String, default: '' },
        scenario: { type: String, default: '' },

        // 'word' — a vocabulary item; 'phrase' — a lesson's phrase or
        // conversation line, scheduled as a whole chunk. A phrase's wordKey is
        // prefixed `phrase:` so it can never collide with a one-word answer,
        // and `lessonIdx` is how the client finds the drill (and its accepted
        // forms) again. Absent on older rows, which are all words.
        kind: { type: String, enum: ['word', 'phrase'], default: 'word' },
        lessonIdx: { type: Number },
        phase: { type: String },

        // ── SRS state ──
        box: { type: Number, default: 0 },
        dueAt: { type: Date, default: Date.now },
        reviews: { type: Number, default: 0 },
        lapses: { type: Number, default: 0 },
        lastOutcome: { type: String },   // 'unaided' | 'hinted' | 'revealed' | 'missed'
        lastReviewedAt: { type: Date },

        // ── Why the misses happened (shared/missKinds.js) ──
        // `lastOutcome` says how much help was needed; these say what went
        // wrong. Without them an answer with every word right and two of them
        // swapped is stored as the same fact as not knowing the word, and the
        // word gets re-drilled while word order never can be.
        //
        // Absent on every row written before 2026-10-16, and absent on any row
        // whose misses the engine could not classify. A reader must treat a
        // missing tally as "we do not know", never as "no such mistake".
        lastMissKind: { type: String },
        missKinds: { type: Map, of: Number, default: undefined },
    },
    { timestamps: true }
);

// One record per word per language per learner.
learnedWordSchema.index({ userId: 1, lang: 1, wordKey: 1 }, { unique: true });

// Drives the due-queue lookup.
learnedWordSchema.index({ userId: 1, lang: 1, dueAt: 1 });

module.exports = mongoose.model('LearnedWord', learnedWordSchema);
