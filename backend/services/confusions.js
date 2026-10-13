/* Confused pairs: validation and the update shapes, kept apart from the route
   so they can be tested without a database. */

/** Clean contrast answers in a row that retire a pair. */
const RETIRE_AFTER = 2;

const str = (v, max = 80) => (typeof v === 'string' && v.trim() && v.length <= max ? v.trim() : null);
const keyOf = (w) => String(w || '').toLowerCase().trim();
const scenarioOf = (v) => (v === undefined || v === null ? '' : String(v).slice(0, 20));

/* Strings only, so nothing in the body can become a Mongo operator. */
function validatePair(body = {}) {
    const lang = str(body.lang, 40);
    const said = str(body.said);
    const needed = str(body.needed);
    if (!lang || !said || !needed) return { error: 'lang, said and needed are required strings' };
    if (lang.startsWith('$') || lang.includes('.')) return { error: 'bad lang' };
    if (keyOf(said) === keyOf(needed)) return { error: 'said and needed are the same word' };
    return {
        lang, said, needed,
        saidKey: keyOf(said), neededKey: keyOf(needed),
        saidMeaning: str(body.saidMeaning, 120) || '',
        neededMeaning: str(body.neededMeaning, 120) || '',
        scenario: scenarioOf(body.scenario),
    };
}

const filterFor = (userId, p) => ({ userId, lang: p.lang, saidKey: p.saidKey, neededKey: p.neededKey });

/** A fresh mix-up: count it, and reopen the pair if it had been retired. */
function confusionUpdate(p, now = new Date()) {
    return {
        $inc: { count: 1 },
        $set: { lastSeen: now, lastScenario: p.scenario, wins: 0, retired: false,
            said: p.said, needed: p.needed,
            ...(p.saidMeaning ? { saidMeaning: p.saidMeaning } : {}),
            ...(p.neededMeaning ? { neededMeaning: p.neededMeaning } : {}) },
    };
}

/** The result of a contrast screen: a clean answer is a win, anything else starts over. */
function checkUpdate(doc, correct, scenario) {
    const wins = correct ? (doc.wins || 0) + 1 : 0;
    return { wins, retired: wins >= RETIRE_AFTER, lastScenario: scenarioOf(scenario) };
}

/** Open pairs, not the lesson they were last seen in, most frequent first. */
function pickDue(docs = [], scenario) {
    const here = scenarioOf(scenario);
    return docs
        .filter(d => !d.retired && d.lastScenario !== here)
        .sort((a, b) => (b.count - a.count) || (new Date(a.lastSeen) - new Date(b.lastSeen)))[0] || null;
}

/** Open pairs for a practice session, most frequent first; no lesson rule. */
function pickOpenPairs(docs = [], limit = 3) {
    return docs.filter(d => !d.retired)
        .sort((a, b) => (b.count - a.count) || (new Date(a.lastSeen) - new Date(b.lastSeen)))
        .slice(0, limit);
}

const pairPayload = (d) => (d ? {
    said: d.said, needed: d.needed, saidMeaning: d.saidMeaning, neededMeaning: d.neededMeaning,
    count: d.count, wins: d.wins, retired: d.retired,
} : null);

module.exports = { RETIRE_AFTER, validatePair, filterFor, confusionUpdate, checkUpdate, pickDue, pickOpenPairs, pairPayload };
