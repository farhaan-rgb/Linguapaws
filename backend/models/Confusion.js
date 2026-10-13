const mongoose = require('mongoose');

/**
 * A pair of taught words the learner mixed up: they said `said` where `needed`
 * was wanted (Kannada Nimma "your" for Avara "her, respectful"). Step mode
 * brings an open pair back in a later lesson's review round as one contrast
 * screen asking for both; two clean contrast answers retire it.
 */
const confusionSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        lang: { type: String, required: true },
        said: { type: String, required: true },
        needed: { type: String, required: true },
        saidKey: { type: String, required: true },
        neededKey: { type: String, required: true },
        saidMeaning: { type: String, default: '' },
        neededMeaning: { type: String, default: '' },
        count: { type: Number, default: 0 },       // times the mix-up happened
        lastSeen: { type: Date, default: Date.now },
        lastScenario: { type: String, default: '' }, // lesson it was last seen or checked in
        wins: { type: Number, default: 0 },        // clean contrast answers in a row
        retired: { type: Boolean, default: false },
    },
    { timestamps: true }
);

confusionSchema.index({ userId: 1, lang: 1, saidKey: 1, neededKey: 1 }, { unique: true });
confusionSchema.index({ userId: 1, lang: 1, retired: 1 });

module.exports = mongoose.model('Confusion', confusionSchema);
