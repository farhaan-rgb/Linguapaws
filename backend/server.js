require('express-async-errors');
const path = require('node:path');
const fs = require('node:fs');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
/* Pinned to this directory rather than the working one. Started from the repo
   root — which is how the deployed service starts it, so that the frontend
   build and the server share a cwd — a bare `config()` resolves `.env` against
   the root and silently loads the FRONTEND's two Vite variables instead of the
   backend's ten. The first symptom is mongoose being handed `undefined`. In a
   deployment there is no file at either path and the real environment is used,
   which is the intended behaviour there. */
require('dotenv').config({ path: path.join(__dirname, '.env') });

const authRoutes = require('./routes/auth');
const wordsRoutes = require('./routes/words');
const settingsRoutes = require('./routes/settings');
const aiRoutes = require('./routes/ai');
const progressRoutes = require('./routes/progress');
const chatsRoutes = require('./routes/chats');

const app = express();

// ── Security & parsing ───────────────────────────────────────────────
/* CSP off, and only CSP. This process serves the built frontend as well as the
   API (see below), and helmet's default policy is `default-src 'self'`, which
   blocks the Google Identity script the sign-in page loads from
   accounts.google.com — the app would deploy and then refuse to let anyone in.
   Everything else helmet sets is left on. Worth revisiting with a real policy
   if this stops being a test deployment. */
app.use(helmet({ contentSecurityPolicy: false }));
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

/* ── The built frontend, from this same process ───────────────────────
   One service and one URL rather than two. The app and its API share an
   origin, so there is no CORS to keep in sync and only one domain to add to
   the Google OAuth client — two of the three things that make a first deploy
   fail. `dist/` does not exist in local development (Vite serves the frontend
   on its own port), so this is conditional and local dev is untouched. */
const DIST = path.join(__dirname, '..', 'dist');
if (fs.existsSync(DIST)) {
    app.use(express.static(DIST));
    /* Every path that is not the API is a client-side route: React Router owns
       /steps and /chat, and a reload on one of them must return the app rather
       than a 404. Explicitly NOT a catch-all for /api — an unknown API path
       should still 404 as JSON, not hand back an HTML page that the fetch
       layer would then fail to parse. */
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api/') || req.path === '/health') return next();
        res.sendFile(path.join(DIST, 'index.html'));
    });
    console.log(`🗂️   Serving the built frontend from ${DIST}`);
} else {
    console.log('🗂️   No dist/ — API only (run `npm run build` at the repo root to serve the app too)');
}

/* An unmatched /api path, as JSON. Express's default is an HTML error page,
   which the fetch layer cannot read an error message out of — it falls back to
   "HTTP 404" and the real path is lost. Below the routes, so it only catches
   what nothing else claimed. */
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

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
