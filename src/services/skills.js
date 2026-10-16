/**
 * Skills: what a drill tests, and what a learner's answer says about each.
 *
 * Phase 1 of adaptive learning (ADAPTIVE.md). MEASURE ONLY — nothing here
 * changes what a learner is asked, accepted on, or told. Grading stays in
 * `lessonEngine.scoreAnswer`; this module runs after the engine has decided
 * and reads the engine's own miss diagnosis (`missHelp`'s `kind`).
 *
 * Four skill types, one id scheme:
 *   word          w:<headword>      every vocabulary word         ("w:hoovu")
 *   ending        e:<ending>        every WORD_ENDINGS entry      ("e:galu")
 *   construction  c:<name>          the hand-curated list below   ("c:nanage-want")
 *   order         order             one per language: putting a sentence's words in order
 *
 * A skill's `lesson` (1-based) is the first lesson whose screens test it,
 * derived from the course rather than written down, so it cannot drift.
 */

import { CURRICULUM, WORD_ENDINGS } from './curriculum.js';
import * as engine from './lessonEngine.js';

/* ── Constructions ──────────────────────────────────────────────────────────
   A construction is a pattern the course teaches across words: Kannada says
   "I want" as *nanage … beku* ("to me … is wanted"), not *naanu beku*. Each
   is `parts`: every part must match some token of the answer, and the tokens
   that match are the construction's keys — so a miss on *nanage* is a miss
   on the construction as well as on the word. Matched on normalised tokens
   of the answer the course expects, never on what the learner wrote. */
export const CONSTRUCTIONS = {
    Kannada: [
        { id: 'c:nanage-want', label: 'Saying “I want” with nanage … beku', parts: [/^nanage$/, /^(beku|beda)$/] },
        { id: 'c:nanage-like', label: 'Saying “I like” with nanage … ishta', parts: [/^nanage$/, /^ishta$/] },
        { id: 'c:nanage-know', label: 'Saying “I know / remember” with nanage', parts: [/^nanage$/, /^(gottu|gottilla|nenapide|nenapilla)$/] },
        { id: 'c:nanage-can', label: 'Saying “I can” with nanage … baruttade', parts: [/^nanage$/, /^(baruttade|baruvudilla|aaguttade|aaguvudilla)$/] },
        { id: 'c:nanage-feel', label: 'Saying how you feel with nanage', parts: [/^nanage$/, /^(aagide|aagilla|kushi|bhaya|hasivu|sustu|bejaaru|baayaarike)$/] },
        { id: 'c:continuous', label: 'Saying what you are doing now (-ttiddene)', parts: [/ttidd(ene|eeni|eera|are)$/] },
        { id: 'c:past', label: 'Saying what you did (past -de)', parts: [/^(maadide|hode|tinde|nodide|helide|bande|kudide|edde)$/] },
        { id: 'c:future', label: 'Saying what you will do (-ttene)', parts: [/^(?!.*ttidd).+ttene$/] },
        { id: 'c:must', label: 'Saying “must” (-abeku)', parts: [/.abeku$/] },
        { id: 'c:must-not', label: 'Saying “must not” (-baaradu)', parts: [/baaradu$/] },
        { id: 'c:if', label: 'Saying “if” (-dare)', parts: [/^(?!aadare$|yaakendare$).+dare$/] },
        { id: 'c:have', label: 'Saying “I have” with hattira … ide', parts: [/^hattira$/, /^(ide|ideya|illa)$/] },
    ],
    Telugu: [
        { id: 'c:naaku-want', label: 'Saying “I want” with naaku … kaavali', parts: [/^naaku$/, /^(kaavali|vaddu|oddu|voddu)$/] },
        { id: 'c:naaku-like', label: 'Saying “I like” with naaku … ishtam', parts: [/^naaku$/, /^ishtam$/] },
        { id: 'c:naaku-have', label: 'Saying “I have / I feel” with naaku … undi', parts: [/^naaku$/, /^(undi|ledu|gurthundi)$/] },
        { id: 'c:continuous', label: 'Saying what you are doing now (-tunnanu)', parts: [/(tunnanu|thunnanu|tunnaru|thunnaru)$/] },
        { id: 'c:past', label: 'Saying what you did (past -anu)', parts: [/^(chesanu|vellanu|thinnanu|chusanu|cheppanu|perigaanu)$/] },
        { id: 'c:future', label: 'Saying what you will do (-tanu)', parts: [/^(chestanu|velthanu|tintanu|chustanu)$/] },
        { id: 'c:can', label: 'Saying “I can / can’t” (-galanu / -lenu)', parts: [/(galanu|lenu)$/] },
        { id: 'c:should', label: 'Saying “I should” (-ali)', parts: [/^(cheyali|vellali|thinali|matladali|aali)$/] },
        { id: 'c:if', label: 'Saying “if” (-te / -the)', parts: [/^(unte|velthe|thinte|chesthe)$/] },
        { id: 'c:feel-ga', label: 'Saying how you feel (-ga undi)', parts: [/^(?!baga$|tvaraga$|mellaga$).+ga$/, /^(undi|unnanu|unnara|unnaru|unnavu)$/] },
        { id: 'c:polite-ask', label: 'Asking politely (-andi)', parts: [/^(?!paduth?ondi$).+(andi|ondi)$/] },
    ],
};

const ORDER_LABEL = {
    Kannada: 'Putting the words in order (the verb goes last)',
    Telugu: 'Putting the words in order (the verb goes last)',
};
export const ORDER_ID = 'order';

const norm = (t) => engine.normalizeLatin(t);
const toks = (t) => norm(t).split(' ').filter(t => t && !/[[\]()]/.test(t));
/* Skill id of a word: its normalised headword, spaces as hyphens (Odiya has
   multi-word headwords; the backend accepts [a-z0-9-] only). */
export const wordSkillId = (w) => { const k = norm(w).replace(/ /g, '-'); return k ? `w:${k}` : null; };
const capital = (w) => String(w || '').charAt(0).toUpperCase() + String(w || '').slice(1);

/* ── Context: what was taught up to lesson N ────────────────────────────── */
const ctxCache = new Map();
function contextFor(lang, lessonNo) {
    const lessons = (CURRICULUM[lang] || []).slice(0, Math.max(1, lessonNo));
    const key = `${lang}|${lessons.length}`;
    if (ctxCache.has(key)) return ctxCache.get(key);
    const words = new Map();           // token (headword or alt) -> headword key
    lessons.forEach(l => (l.vocabulary || []).forEach(v => {
        const k = norm(v.word);
        if (!k) return;
        if (!words.has(k)) words.set(k, k);
        for (const a of v.alt || []) { const ak = norm(a); if (ak && !words.has(ak)) words.set(ak, k); }
    }));
    const ends = WORD_ENDINGS[lang] || { endings: [], changes: [] };
    const ctx = {
        lang, lessonNo: lessons.length, words,
        endings: ends.endings.filter(e => e.lesson <= lessons.length),
        changes: ends.changes || [],
        stems: [...new Set(words.values())],
        constructions: CONSTRUCTIONS[lang] || [],
    };
    ctxCache.set(key, ctx);
    return ctx;
}

/* The endings a token carries on a taught stem — the engine's own test. */
function endingsOf(tok, ctx) {
    return ctx.endings.filter(e => ctx.stems.some(s => s !== tok && engine.carriesEnding(tok, s, e, ctx.changes)))
        .map(e => `e:${e.ending}`);
}
/* The stem a token is built on, when it is not a taught word itself. */
function stemOf(tok, ctx) {
    for (const e of ctx.endings) {
        const s = ctx.stems.find(st => st !== tok && engine.carriesEnding(tok, st, e, ctx.changes));
        if (s) return s;
    }
    return null;
}

/**
 * Tag an answer: every skill it tests, and which tokens carry which skill.
 * `{ skills: [id], byToken: Map(token -> [id]), constructions: [{ id, keys }] }`
 */
export function tagAnswer(text, { lang, lessonNo, order = true } = {}) {
    const ctx = contextFor(lang, lessonNo);
    const tokens = toks(text);
    const byToken = new Map();
    const stems = new Map();           // token -> the taught word it is built on
    const add = (t, id) => { const l = byToken.get(t) || []; if (!l.includes(id)) l.push(id); byToken.set(t, l); };
    for (const t of tokens) {
        const head = ctx.words.get(t);
        if (head) add(t, wordSkillId(head));
        const s = stemOf(t, ctx);
        if (s) stems.set(t, wordSkillId(ctx.words.get(s) || s));
        if (!head && s) add(t, stems.get(t));
        for (const e of endingsOf(t, ctx)) add(t, e);
    }
    const constructions = [];
    for (const c of ctx.constructions) {
        const keys = c.parts.map(re => tokens.find(t => re.test(t)));
        if (keys.every(Boolean)) {
            constructions.push({ id: c.id, keys });
            keys.forEach(k => add(k, c.id));
        }
    }
    const skills = [...new Set([...byToken.values()].flat())];
    /* Order is a skill only where there is an order to get wrong: two or more
       words the course taught. A name ("Miko, …") does not count. */
    const known = tokens.filter(t => byToken.has(t));
    if (order && known.length >= 2) skills.push(ORDER_ID);
    return { skills, byToken, constructions, tokens, stems, lang };
}

/** The answer a step asks for, as tagging sees it. */
const stepAnswer = (step) => (step?.item?.contrast
    ? `${step.item.contrast.said} ${step.item.contrast.needed}` : step?.expected || '');

/** Tag one screen from stepPlan (teach, review, contrast, phrase, conversation, practice). */
export function tagStep(step, { lang, lessonNo }) {
    /* A listen screen's answer is an English meaning; what it tests is the
       one word it plays — heard and understood, not produced. */
    if (step?.kind === 'listen') {
        const tag = tagAnswer(step.word || '', { lang, lessonNo, order: false });
        tag.skills = tag.skills.filter(id => id.startsWith('w:')).slice(0, 1);
        tag.core = [...tag.skills];
        tag.constructions = [];
        return tag;
    }
    /* A teach screen and a memory check ask for words, not a sentence; a
       contrast asks for two words in an order the prompt dictates. */
    const order = step?.kind === 'drill';
    const tag = tagAnswer(stepAnswer(step), { lang, lessonNo, order });
    /* A construction the course accepts but does not expect. Telugu drops
       *naaku*: "Neeru kaavali" is the answer and "naaku neeru kaavali" is
       accepted, so matching the expected answer alone never tagged
       c:naaku-want. A construction found in an accepted form, sharing a key
       with the expected answer, is tagged `optional`: it is in `skills` (a
       plan can aim at it), but it only takes evidence when the learner's own
       answer used it — dropping naaku is not a failure of it. */
    tag.core = [...tag.skills];
    if (order) {
        const have = new Set(tag.constructions.map(c => c.id));
        for (const c of contextFor(lang, lessonNo).constructions) {
            if (have.has(c.id)) continue;
            for (const v of step.variants || []) {
                const vt = toks(v);
                const keys = c.parts.map(re => vt.find(t => re.test(t)));
                if (keys.every(Boolean) && keys.some(k => tag.tokens.includes(k))) {
                    tag.constructions.push({ id: c.id, keys, optional: true });
                    tag.skills.push(c.id);
                    have.add(c.id);
                    break;
                }
            }
        }
    }
    return tag;
}

/* ── The taxonomy ──────────────────────────────────────────────────────── */
const taxCache = new Map();
/**
 * Every skill of a language: `Map(id -> { id, type, label, lesson })`.
 * Words and endings come from the course; constructions from CONSTRUCTIONS;
 * `lesson` is the first lesson whose screens are tagged with it.
 */
export function skillsFor(lang) {
    if (taxCache.has(lang)) return taxCache.get(lang);
    const lessons = CURRICULUM[lang] || [];
    const map = new Map();
    const put = (id, type, label, lesson) => { if (!map.has(id)) map.set(id, { id, type, label, lesson }); };
    lessons.forEach((l, i) => (l.vocabulary || []).forEach(v => {
        const k = norm(v.word);
        if (k) put(wordSkillId(k), 'word', `${capital(v.word)} (“${engine.cleanGloss(v.meaning)}”)`, i + 1);
    }));
    for (const e of (WORD_ENDINGS[lang]?.endings || [])) {
        put(`e:${e.ending}`, 'ending', `The -${e.ending} ending: it ${e.means}${e.kind ? ` (${e.kind})` : ''}`, e.lesson);
    }
    for (const c of CONSTRUCTIONS[lang] || []) put(c.id, 'construction', c.label, null);
    put(ORDER_ID, 'order', ORDER_LABEL[lang] || 'Putting the words in the right order', null);
    /* First lesson that tests it, for the two whose lesson is not authored. */
    lessons.forEach((l, i) => {
        const answers = [...(l.phrases || []), ...(l.conversations || [])].map(d => d.correct).filter(Boolean);
        for (const a of answers) {
            for (const id of tagAnswer(a, { lang, lessonNo: i + 1 }).skills) {
                const s = map.get(id);
                if (s && s.lesson == null) s.lesson = i + 1;
            }
        }
    });
    taxCache.set(lang, map);
    return map;
}

export const skillLabel = (lang, id) => skillsFor(lang).get(id)?.label || id;

/* ── Attribution ───────────────────────────────────────────────────────────
   One settled screen in, per-skill evidence out: `[{ skillId, score, weight }]`
   with score 0 (failed) … 1 (succeeded) and weight 0 … 1 (how much to trust
   it). Each skill gets at most one item per screen, weight capped at 1.     */

export const WEIGHTS = {
    /* how a screen ended */
    firstTry: 1.0,          // correct, first try, unaided: every tagged skill, score 1
    finallyRight: 0.4,      // correct after a miss: every tagged skill, score 1
    helped: 0.5,            // correct but helped (tap-to-translate, asked): every skill, score 0.5
    dontKnow: 0.6,          // "I don't know" with no attempt: every skill, score 0
    revealedRest: 0.5,      // revealed: a tagged skill no attempt said anything about, score 0
    /* what one miss says (score 0 unless noted) */
    wrongWord: 1.0,         // the answer word a wrong word stood in for
    confusedWith: 0.5,      // the taught word said in its place (the confused partner)
    endingNeeded: 1.0,      // the ending the answer needed
    endingMisused: 0.5,     // an ending added where it did not belong, or the wrong sibling
    stemKnown: 0.3,         // the stem under a wrong ending — score 1, they knew the word
    missingWord: 0.8,       // an answer word nowhere in the attempt
    english: 0.8,           // an answer word left in English
    order: 1.0,             // right words, wrong order
    orderPartial: 0.5,      // the words that are there are out of order
    spelling: 0.3,          // a needed word misspelt: still the word, a little evidence against
    present: 0.3,           // a needed word written right inside a missed attempt — score 1
    undiagnosed: 0.4,       // the engine could say nothing: every tagged skill
    /* multipliers */
    spoken: 0.5,            // a spoken attempt: recognisers mishear
    spokenFar: 0.1,         // a spoken miss nowhere near any accepted form: probably a mishearing
    farBelow: 0.4,          // "nowhere near" = best similarity to an accepted form under this
    reask: 0.5,             // a re-ask comes minutes after the answer was shown
    phase: { teach: 0.3, review: 1.0, phrase: 0.8, conversation: 1.0, listen: 1.0 },
    /* Listening (comprehension, a four-way tap): it says the learner knows
       what the word MEANS, not that they can say it, and a tap can be a
       guess — so a right tap is credit at reduced weight and a wrong one a
       small penalty. */
    listen: { first: 0.4, afterMiss: 0.15, helped: 0.1, wrong: 0.25 },
};

/* Outcome of a settled screen, from what Steps.jsx knows. */
export function outcomeOf({ correct, misses = 0, helped = false, attempts = 0 }) {
    if (correct) return misses > 0 ? 'after-miss' : helped ? 'helped' : 'first';
    return attempts > 0 ? 'revealed' : 'dont-know';
}

const typoOf = (g, t) => Math.min(g.length, t.length) >= 3 && g !== t
    && (engine.levenshtein(g, t) <= (Math.min(g.length, t.length) >= 5 ? 2 : 1)
        || (Math.min(g.length, t.length) >= 4 && engine.isSpellingSlip(g, t))
        || engine.droppedSyllable(g, t));

/* What one missed attempt says, as raw items (before channel and merge). */
function missEvidence(attempt, tag, step, lexicon) {
    const W = WEIGHTS;
    const out = [];
    const push = (ids, score, weight) => (ids || []).forEach(id => out.push({ skillId: id, score, weight }));
    const need = tag.tokens;
    const got = toks(attempt.said);
    const synonyms = lexicon?.synonyms || (lexicon instanceof Map ? lexicon : new Map());
    const canon = (t) => synonyms.get(t) || t;
    const has = (t) => got.some(g => g === t || canon(g) === canon(t));
    const help = attempt.help || {};
    const charged = new Set();          // answer tokens already explained
    const charge = (t, weight) => {
        if (!t || charged.has(t)) return;
        charged.add(t);
        push(tag.byToken.get(t), 0, weight);
    };
    const partners = new Set();
    const partner = (w) => {
        const k = norm(w);
        /* A taught word only: a KNOWN_WORDS form (*ivu*) is not a skill. */
        if (k && !partners.has(k) && skillsFor(tag.lang).has(wordSkillId(k))) {
            partners.add(k);
            push([wordSkillId(k)], 0, W.confusedWith);
        }
    };

    if (help.kind === 'ending' && help.ending) {
        const e = help.ending;
        if (e.wanted) push([`e:${e.wanted}`], 0, W.endingNeeded);
        if (e.added) push([`e:${e.added}`], 0, e.wanted ? W.endingMisused : W.endingNeeded);
        /* The word under the ending was right: the stem is known. */
        const stemIds = tag.stems.get(e.word) ? [tag.stems.get(e.word)]
            : (tag.byToken.get(e.word) || []).filter(id => id.startsWith('w:'));
        push(stemIds, 1, W.stemKnown);
        charged.add(e.word);
    } else if (help.kind === 'trap' || help.kind === 'wrong-word' || help.kind === 'reasoned') {
        for (const p of help.pairs || []) {
            charge(norm(p.needed), W.wrongWord);
            partner(p.said);
        }
        for (const s of help.subs || []) {
            if (s.needed) charge(s.needed, W.wrongWord);
            if (s.needed || s.near) partner(s.said);
        }
        for (const t of help.replaced || []) charge(t, help.english?.length ? W.english : W.wrongWord);
        if (help.kind === 'trap' && help.word) charge(norm(help.word), W.wrongWord);
    }
    /* Words the attempt left out (and no typo of them is there). */
    for (const t of need) {
        if (charged.has(t) || has(t)) continue;
        if (got.some(g => typoOf(g, t))) {
            charged.add(t);
            push((tag.byToken.get(t) || []).filter(id => id.startsWith('w:')), 0, W.spelling);
        } else if (help.kind !== 'ending') {
            charge(t, W.missingWord);
        }
    }
    /* Order: the engine's own test when every word is there; otherwise the
       words that are there, in an order no accepted form has. */
    if (tag.skills.includes(ORDER_ID)) {
        const om = engine.orderMiss(attempt.said, step.expected, step.variants || [], lexicon);
        if (om) push([ORDER_ID], 0, W.order);
        else {
            const forms = [step.expected, ...(step.variants || [])].map(toks);
            const mine = got.map(canon);
            const inOrder = (f) => {
                const pos = f.map(canon).filter(t => mine.includes(t)).map(t => mine.indexOf(t));
                return pos.length < 2 || pos.every((p, i) => i === 0 || p > pos[i - 1]);
            };
            const present = need.filter(has);
            if (present.length >= 2) {
                if (!forms.some(inOrder)) push([ORDER_ID], 0, W.orderPartial);
                else push([ORDER_ID], 1, W.present);
            }
        }
    }
    /* Right words inside a wrong answer: a little credit for each. */
    for (const t of need) {
        if (has(t) && !charged.has(t)) push((tag.byToken.get(t) || []).filter(id => !id.startsWith('c:')), 1, W.present);
    }
    for (const c of tag.constructions) {
        if (c.keys.every(has) && !c.keys.some(k => charged.has(k))) push([c.id], 1, W.present);
    }
    if (!out.some(e => e.score < 1)) push(tag.core || tag.skills, 0, W.undiagnosed);
    return out;
}

/* Spoken attempts are worth less, and one nowhere near any answer ~nothing. */
function channelOf(attempt, step) {
    if (!attempt?.spoken) return 1;
    if (attempt.correct) return WEIGHTS.spoken;
    const best = Math.max(0, ...[step.expected, ...(step.variants || [])]
        .map(f => engine.similarityRatioLatin(attempt.said, f)));
    return best < WEIGHTS.farBelow ? WEIGHTS.spokenFar : WEIGHTS.spoken;
}

/* One item per skill: weighted mean score, summed weight capped at 1. */
function merge(items) {
    const by = new Map();
    for (const it of items) {
        if (!it.skillId || !(it.weight > 0)) continue;
        const m = by.get(it.skillId) || { w: 0, ws: 0 };
        m.w += it.weight; m.ws += it.weight * it.score;
        by.set(it.skillId, m);
    }
    return [...by.entries()].map(([skillId, m]) => ({
        skillId, score: Math.round((m.ws / m.w) * 1000) / 1000, weight: Math.min(1, m.w),
    }));
}

/**
 * Evidence from one settled screen.
 *   step      — a stepPlan screen
 *   lang, lessonNo — the language, and how many lessons the learner has been taught
 *   outcome   — 'first' | 'after-miss' | 'helped' | 'revealed' | 'dont-know'
 *   attempts  — the missed attempts, in order: [{ said, spoken, help }] where
 *               `help` is lessonEngine.missHelp's result for that attempt
 *   finalSpoken — the accepted answer was spoken (correct outcomes only)
 *   finalSaid — the accepted answer's text (correct outcomes only); credits an
 *               optional construction the learner chose to use
 *   lexicon   — engine.buildLexicon of the taught lessons
 * Returns `[{ skillId, score, weight }]`, weights after phase and re-ask scaling.
 */
export function skillEvidence({ step, lang, lessonNo, outcome, attempts = [], finalSpoken = false, finalSaid = '', lexicon = new Map() }) {
    if (!step) return [];
    const tag = tagStep(step, { lang, lessonNo });
    if (!tag.skills.length) return [];
    const W = WEIGHTS;
    if (step.kind === 'listen') {
        const L = W.listen;
        const [score, weight] = outcome === 'first' ? [1, L.first]
            : outcome === 'after-miss' ? [1, L.afterMiss]
                : outcome === 'helped' ? [1, L.helped]
                    : [0, L.wrong];
        const w = weight * (step.retry ? W.reask : 1);
        return tag.skills.map(skillId => ({ skillId, score, weight: Math.round(w * 1000) / 1000 }));
    }
    const items = [];
    let lastCh = 1;
    /* An optional construction counts for a right answer only when that
       answer used it ("naaku neeru kaavali", not "neeru kaavali"). */
    const said = new Set(toks(finalSaid));
    const used = tag.constructions.filter(c => c.optional && c.keys.every(k => said.has(k))).map(c => c.id);
    const core = [...(tag.core || tag.skills), ...used];
    const all = (score, weight, mult = 1) => core.forEach(id => items.push({ skillId: id, score, weight: weight * mult }));
    const finalCh = finalSpoken ? W.spoken : 1;

    for (const a of attempts) {
        const ch = channelOf(a, step);
        lastCh = ch;
        for (const it of missEvidence(a, tag, step, lexicon)) items.push({ ...it, weight: it.weight * ch });
    }
    if (outcome === 'first') all(1, W.firstTry, finalCh);
    else if (outcome === 'helped') all(0.5, W.helped, finalCh);
    else if (outcome === 'after-miss') all(1, W.finallyRight, finalCh);
    else if (outcome === 'dont-know') all(0, W.dontKnow);
    else if (outcome === 'revealed') {
        /* A tagged skill the misses said nothing about, either way. */
        const named = new Set(items.map(i => i.skillId));
        (tag.core || tag.skills).filter(id => !named.has(id))
            .forEach(id => items.push({ skillId: id, score: 0, weight: W.revealedRest * lastCh }));
    }
    const scale = (W.phase[step.phase] ?? 1) * (step.retry ? W.reask : 1);
    return merge(items).map(e => ({ ...e, weight: Math.round(e.weight * scale * 1000) / 1000 }))
        .filter(e => e.weight > 0);
}
