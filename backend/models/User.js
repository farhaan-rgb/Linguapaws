const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        googleSub: { type: String, required: true, unique: true }, // Google user ID
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
    },
    { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
