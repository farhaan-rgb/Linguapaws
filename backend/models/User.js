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
    },
    { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
