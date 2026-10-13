const mongoose = require('mongoose');

/**
 * A lesson screen the learner did not get: the answer had to be revealed.
 * `kind` is 'word' (a teach screen, keyed by the word) or 'drill' (a phrase or
 * conversation screen, keyed by its answer). Practice brings open ones back;
 * one clean first-try answer there retires it, and a fresh miss reopens it.
 */
const missedScreenSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        lang: { type: String, required: true },
        lessonIdx: { type: Number, required: true },
        kind: { type: String, enum: ['word', 'drill'], required: true },
        key: { type: String, required: true },
        keyNorm: { type: String, required: true },
        count: { type: Number, default: 0 },
        lastMissed: { type: Date, default: Date.now },
        retired: { type: Boolean, default: false },
    },
    { timestamps: true }
);

missedScreenSchema.index({ userId: 1, lang: 1, lessonIdx: 1, kind: 1, keyNorm: 1 }, { unique: true });
missedScreenSchema.index({ userId: 1, lang: 1, retired: 1 });

module.exports = mongoose.model('MissedScreen', missedScreenSchema);
