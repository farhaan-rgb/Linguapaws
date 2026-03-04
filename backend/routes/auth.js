const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// POST /api/auth/google
// Body: { credential: <Google ID token> }
router.post('/google', async (req, res) => {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: 'credential is required' });

    // 1. Verify Google token
    const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { sub, name, email, picture } = ticket.getPayload();

    // 2. Upsert user in MongoDB
    let user = await User.findOneAndUpdate(
        { googleSub: sub },
        { name, email, picture },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    // 3. Issue JWT
    const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
    );

    res.json({
        token,
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            picture: user.picture,
            nativeLang: user.nativeLang || null,
            englishLevel: user.englishLevel || null,
            targetLang: user.targetLang || null,
        },
    });
});

// POST /api/auth/guest
// Creates or restores a persistent guest user session
router.post('/guest', async (req, res) => {
    // Generate a unique identifier. If they clear local storage, they get a new one.
    const guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    let user = await User.findOneAndUpdate(
        { googleSub: guestId },
        {
            name: 'Guest Explorer',
            email: 'guest@linguapaws.local',
            picture: '👤',
            isGuest: true
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

    res.json({
        token,
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            picture: user.picture,
            nativeLang: user.nativeLang || null,
            englishLevel: user.englishLevel || null,
            targetLang: user.targetLang || null,
            isGuest: true
        }
    });
});

module.exports = router;
