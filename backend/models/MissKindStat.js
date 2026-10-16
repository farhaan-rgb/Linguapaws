const mongoose = require('mongoose');

/**
 * How one learner gets things wrong in one language: a count per miss kind
 * (shared/missKinds.js — order, ending, confusion, spelling …).
 *
 * The per-item version of this lives on LearnedWord (`lastMissKind`,
 * `missKinds`) and answers "how does this learner get *this word* wrong". This
 * collection answers the other question, the one no row on a word can:
 * "is word order a problem for this learner at all". Eleven documents per
 * language at most, so it is a read, not an aggregation.
 *
 * Deliberately not folded into SkillStat. A SkillStat is a mastery — evidence
 * both ways, smoothed, decaying — and the planner reads it to pick *which
 * drill*. A miss kind is a count of occurrences with no positive evidence
 * (nothing observes "the learner did not make a spelling mistake"), and it
 * steers *what shape* of drill to pick. Two different quantities; folding the
 * second into the first would have given the weak/strong ladder a meaning it
 * cannot carry here.
 *
 * Written only by POST /api/progress/review, which is also where the schedule
 * is written, so a miss is counted exactly once per screen.
 */
const missKindStatSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        lang: { type: String, required: true },

        // One of shared/missKinds.js MISS_KINDS. Not an enum here on purpose:
        // a client one version ahead must not make a review fail to save, and
        // the route has already normalised anything it writes.
        kind: { type: String, required: true },

        count: { type: Number, default: 0 },
        lastSeen: { type: Date, default: Date.now },

        // The last few words or lines this kind tripped the learner on, so a
        // caption can name one instead of saying "word order" in the abstract.
        recentWords: { type: [String], default: [] },
    },
    { timestamps: true }
);

missKindStatSchema.index({ userId: 1, lang: 1, kind: 1 }, { unique: true });

module.exports = mongoose.model('MissKindStat', missKindStatSchema);
