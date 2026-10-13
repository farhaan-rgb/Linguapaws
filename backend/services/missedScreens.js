/* Missed screens: validation and update shapes, apart from the route so they
   can be tested without a database. Same pattern as confusions.js. */

const str = (v, max = 200) => (typeof v === 'string' && v.trim() && v.length <= max ? v.trim() : null);
const normKey = (k) => String(k || '').toLowerCase().replace(/\s+/g, ' ').trim();

/* Strings and a bounded integer only, so nothing in the body becomes an operator. */
function validateMissed(body = {}) {
    const lang = str(body.lang, 40);
    const key = str(body.key);
    const kind = body.kind === 'word' || body.kind === 'drill' ? body.kind : null;
    const lessonIdx = Number.isInteger(body.lessonIdx) && body.lessonIdx >= 0 && body.lessonIdx < 500
        ? body.lessonIdx : null;
    if (!lang || !key || !kind || lessonIdx === null) {
        return { error: 'lang, kind (word|drill), key and lessonIdx are required' };
    }
    if (lang.startsWith('$') || lang.includes('.')) return { error: 'bad lang' };
    return { lang, key, kind, lessonIdx, keyNorm: normKey(key) };
}

const missedFilter = (userId, m) => ({ userId, lang: m.lang, lessonIdx: m.lessonIdx, kind: m.kind, keyNorm: m.keyNorm });

/** A fresh miss: count it and (re)open it. */
const missedUpdate = (m, now = new Date()) => ({
    $inc: { count: 1 },
    $set: { key: m.key, lastMissed: now, retired: false },
});

/** Open ones, most-missed first, then most recent. */
function pickOpen(docs = [], limit = 5) {
    return docs.filter(d => !d.retired)
        .sort((a, b) => (b.count - a.count) || (new Date(b.lastMissed) - new Date(a.lastMissed)))
        .slice(0, limit);
}

const missedPayload = (d) => (d ? {
    lang: d.lang, lessonIdx: d.lessonIdx, kind: d.kind, key: d.key, count: d.count, retired: d.retired,
} : null);

module.exports = { validateMissed, missedFilter, missedUpdate, pickOpen, missedPayload };
