const express = require('express');
const Chat = require('../models/Chat');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/chats?characterId=miko&topic=free — load chat messages
router.get('/', async (req, res) => {
    const { characterId = 'miko', topic = 'free' } = req.query;
    const chat = await Chat.findOne({
        userId: req.user._id,
        characterId,
        topic,
    }).lean();
    res.json({ messages: chat?.messages || [] });
});

// PUT /api/chats — upsert (save) chat messages
// Body: { characterId, topic, messages }
router.put('/', async (req, res) => {
    const { characterId = 'miko', topic = 'free', messages = [] } = req.body;
    const chat = await Chat.findOneAndUpdate(
        { userId: req.user._id, characterId, topic },
        { messages },
        { upsert: true, new: true }
    ).lean();
    res.json({ ok: true, count: chat.messages.length });
});

// DELETE /api/chats?characterId=miko&topic=free — clear a chat
router.delete('/', async (req, res) => {
    const { characterId = 'miko', topic = 'free' } = req.query;
    await Chat.deleteOne({ userId: req.user._id, characterId, topic });
    res.json({ ok: true });
});

module.exports = router;
