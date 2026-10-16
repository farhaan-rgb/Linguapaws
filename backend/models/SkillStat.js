const mongoose = require('mongoose');

/**
 * What one learner's answers say about one skill (src/services/skills.js):
 * a word (w:hoovu), an ending (e:galu), a construction (c:nanage-want) or word
 * order (order). Written by POST /api/progress/skills/evidence (and once by
 * scripts/backfill-skills.js); the
 * update rule and the weak flag are in services/skillStats.js and ADAPTIVE.md.
 * Phase 1 measures only — nothing reads this to change a lesson yet.
 */
const skillStatSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        lang: { type: String, required: true },
        skillId: { type: String, required: true },
        mastery: { type: Number, default: 0.5 },      // 0..1, exponentially weighted
        attempts: { type: Number, default: 0 },       // screens that carried evidence
        evidence: { type: Number, default: 0 },       // summed evidence weight
        lastSeen: { type: Date, default: Date.now },
        lastOutcome: { type: Number, default: null }, // score of the latest evidence, 0..1
        recent: { type: [Number], default: [] },      // last 8 scores, newest last
        // Set only by scripts/backfill-skills.js: what pre-evidence history
        // (SRS, confusions, missed screens) contributed. Its presence on any
        // doc of a user+lang is what stops a re-run adding it twice.
        backfill: { type: mongoose.Schema.Types.Mixed, default: undefined },
    },
    { timestamps: true }
);

skillStatSchema.index({ userId: 1, lang: 1, skillId: 1 }, { unique: true });

module.exports = mongoose.model('SkillStat', skillStatSchema);
