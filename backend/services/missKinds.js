/* Miss kinds: validation, the two update shapes and the payload, apart from
   the route so they can be tested without a database. Same pattern as
   missedScreens.js and skillStats.js.

   The taxonomy itself is `shared/missKinds.js` — one definition for both
   halves of the app, `require()`d here the way routes/ai.js requires
   shared/languages.js. The rules below are documented in MISS-TAXONOMY.md;
   change both. */

const {
    MISS_KINDS, normaliseMissKind, missKindLabel, dominantMissKind,
} = require('../../shared/missKinds.js');

/* The most recent items a kind tripped the learner on, for a caption that can
   name one ("word order — hoguttene, aamele"). Five is enough to say "this
   keeps happening" and short enough to never need a projection. */
const RECENT_WORDS = 5;

/**
 * The miss kind on a POST /review body, or null.
 *
 * Accepts `missKind` (one kind) or `missKinds` (one per attempt, in order,
 * reduced by the shared rule) so a caller that already has the attempt list
 * does not have to reduce it itself. An unrecognised string is null, not an
 * error: a newer client sending a kind this server has not heard of must not
 * fail the review it is attached to — the schedule is the important half.
 */
function readMissKind(body = {}) {
    if (Array.isArray(body.missKinds)) return dominantMissKind(body.missKinds);
    return normaliseMissKind(body.missKind);
}

/**
 * Write the kind onto a LearnedWord document: the latest one, and a tally, so
 * "missed four times, three of them for the ending" is one read of one
 * document rather than a scan of a history collection we do not keep.
 *
 * Does nothing and returns null when there is nothing to record — no kind, or
 * an outcome with no miss in it. A clean first-try answer ('unaided') has no
 * miss kind by definition, and recording one would make the tally lie.
 *
 * In place rather than as an update operator because the route already has the
 * document loaded and is about to save it: one write, and the tally can never
 * land on a review that failed to schedule.
 */
function applyTally(doc, kind, outcome) {
    const k = normaliseMissKind(kind);
    if (!doc || !k || outcome === 'unaided') return null;
    doc.lastMissKind = k;
    /* A Mongoose Map on an old row is undefined, not empty: every reader has
       to cope with that anyway, so the writer creates it here. */
    if (!doc.missKinds || typeof doc.missKinds.get !== 'function') doc.missKinds = new Map();
    doc.missKinds.set(k, (doc.missKinds.get(k) || 0) + 1);
    return k;
}

/**
 * The miss history of one LearnedWord row, for a payload: `{ lastMissKind,
 * missKinds }` or `{}`. A row with no history returns nothing at all rather
 * than an empty tally, because "never classified" and "never missed" are
 * different and the client must not be able to confuse them.
 *
 * `doc` may be lean (a plain object, the Map already a POJO) or a document.
 */
function missHistory(doc = {}) {
    const kind = normaliseMissKind(doc.lastMissKind);
    const raw = doc.missKinds;
    const tally = !raw ? null
        : typeof raw.entries === 'function' ? Object.fromEntries(raw.entries())
            : raw;
    const counts = tally && Object.keys(tally).length ? tally : null;
    if (!kind && !counts) return {};
    return { ...(kind ? { lastMissKind: kind } : {}), ...(counts ? { missKinds: counts } : {}) };
}

const profileFilter = (userId, lang, kind) => ({ userId, lang, kind });

/** A fresh miss of this kind, with the item it happened on. */
const profileUpdate = (word, now = new Date()) => ({
    $inc: { count: 1 },
    $set: { lastSeen: now },
    $push: { recentWords: { $each: [String(word || '')].filter(Boolean), $slice: -RECENT_WORDS } },
});

/**
 * The profile a client reads: every kind this learner has ever been caught by,
 * most frequent first, each with its share of all their misses in this
 * language. `share` is computed here rather than on the client so two readers
 * cannot disagree about the denominator.
 */
function profilePayload(docs = []) {
    const rows = docs.filter((d) => d && normaliseMissKind(d.kind));
    const total = rows.reduce((n, d) => n + (d.count || 0), 0);
    return rows
        .map((d) => ({
            kind: d.kind,
            label: missKindLabel(d.kind),
            count: d.count || 0,
            share: total ? Math.round(((d.count || 0) / total) * 1000) / 1000 : 0,
            lastSeen: d.lastSeen,
            recentWords: (d.recentWords || []).slice(-RECENT_WORDS),
        }))
        .sort(byFrequency);
}

/** Most frequent first, then most recent — the order a planner wants. */
const byFrequency = (a, b) => (b.count - a.count)
    || (new Date(b.lastSeen || 0) - new Date(a.lastSeen || 0))
    || a.kind.localeCompare(b.kind);

module.exports = {
    MISS_KINDS, RECENT_WORDS,
    readMissKind, applyTally, missHistory, profileFilter, profileUpdate, profilePayload, byFrequency,
};
