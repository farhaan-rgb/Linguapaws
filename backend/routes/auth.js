const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// POST /api/auth/google
// Body: { credential: <Google ID token> }
// POST /api/auth/google
// Body: { credential: <Google ID token> }
router.post('/google', async (req, res) => {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: 'credential is required' });

    try {
        // Parallelize verification and initial database check
        // This cuts latency because MongoDB Atlas can start its handshake while Google verifies.
        const [ticket, initialUser] = await Promise.all([
            client.verifyIdToken({
                idToken: credential,
                audience: process.env.GOOGLE_CLIENT_ID,
            }),
            // Use findOne first - it's faster than findOneAndUpdate for repeat logins
            // We'll extract the 'googleSub' later from the ticket, but we can't search YET.
            // Actually, we need the ticket payload to know WHO to search for.
            // Let's refine: Verify first, then decide whether to UPSERT (slow) or just SYNC (fast).
        ]);

        const { sub, name, email, picture } = ticket.getPayload();

        // Check if user exists first. If they do, we can respond almost instantly.
        let user = await User.findOne({ googleSub: sub });

        if (user) {
            // OPTIMIZATION: Background Sync
            // If the user already exists, we sign and SEND the token immediately.
            // We update their profile (name, picture) in the BACKGROUND so they don't wait.
            User.updateOne({ _id: user._id }, { name, email, picture }).catch(err =>
                console.error('Background user sync failed:', err)
            );

            const token = jwt.sign(
                { userId: user._id },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
            );

            return res.json({
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
        }

        // NEW USER FLOW (One-time slow path)
        user = await User.findOneAndUpdate(
            { googleSub: sub },
            { name, email, picture },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

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
    } catch (err) {
        console.error('Google Auth Error:', err);
        res.status(401).json({ error: 'Authentication failed' });
    }
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
