const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        characterId: { type: String, default: 'miko' },
        topic: { type: String, default: 'free' },
        messages: [
            {
                role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
                content: { type: String, required: true },
            },
        ],
    },
    { timestamps: true }
);

// Compound index: one chat per user+character+topic combo
chatSchema.index({ userId: 1, characterId: 1, topic: 1 }, { unique: true });

module.exports = mongoose.model('Chat', chatSchema);
