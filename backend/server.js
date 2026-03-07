require('express-async-errors');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const wordsRoutes = require('./routes/words');
const settingsRoutes = require('./routes/settings');
const aiRoutes = require('./routes/ai');
const progressRoutes = require('./routes/progress');
const chatsRoutes = require('./routes/chats');

const app = express();

// ── Security & parsing ───────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// ── Routes ───────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/words', wordsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/chats', chatsRoutes);

// ── Health check ─────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ── Global error handler ─────────────────────────────────────────────
app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ── Start ────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

mongoose
    .connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000, // Keep it short to fail fast
        socketTimeoutMS: 45000,
        family: 4 // Use IPv4 for stability in some environments
    })
    .then(() => {
        console.log('✅  MongoDB connected');
        app.listen(PORT, () => console.log(`🚀  Server running on http://localhost:${PORT}`));
    })
    .catch((err) => {
        console.error('❌  MongoDB connection failed:', err.message);
        process.exit(1);
    });
