const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        googleSub: { type: String, unique: true, sparse: true }, // Google user ID, optional for guests
        isGuest: { type: Boolean, default: false },
        name: { type: String, required: true },
        email: { type: String, required: true },
        picture: { type: String },
        nativeLang: {
            // e.g. { id: 'hi', name: 'Hindi', native: 'हिन्दी' }
            id: String,
            name: String,
            native: String,
        },
        englishLevel: {
            // e.g. { id: 'basic', label: 'थोड़ी बहुत' }
            id: String,
            label: String,
            appDetected: Boolean, // true = AI recalibrated, false = user chose
        },
        targetLang: {
            // e.g. { id: 'es', name: 'Spanish', native: 'Español' }
            id: String,
            name: String,
            native: String,
        },
        successfulRepeats: { type: Number, default: 0 },
        // Highest lesson index completed, per course: { Telugu: 4, Kannada: 0 }.
        // `successfulRepeats` is one counter across every language, so it cannot
        // say where a learner is in any one of them; this can. Forward-only —
        // see POST /api/progress/lesson-complete.
        lessonProgress: { type: Map, of: Number, default: {} },
        // Where the learner is INSIDE a lesson, per course: { Kannada: { lessonIdx: 0,
        // stepIdx: 3 } } means the next screen to show is step 3 of lesson 0.
        // Overwritten on every answered step, cleared when that lesson completes.
        lessonPosition: {
            type: Map,
            of: new mongoose.Schema({ lessonIdx: Number, stepIdx: Number, updatedAt: Date }, { _id: false }),
            default: {},
        },
        learnedWords: [{ word: String, meaning: String, scenario: String }],
    },
    { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
