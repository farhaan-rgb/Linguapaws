const mongoose = require('mongoose');

const wordSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        word: { type: String, required: true },
        count: { type: Number, default: 1 },
        lastUsed: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

// Unique word per user
wordSchema.index({ userId: 1, word: 1 }, { unique: true });

module.exports = mongoose.model('Word', wordSchema);
