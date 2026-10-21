/* The home page's proficiency tier and word count, from what lessons actually
   record (GET /api/progress/summary) rather than the legacy `wordTracker`,
   which counted words typed in chat and was never fed by step mode — a learner
   thirteen Kannada lessons in saw 0 words and "Newbie".

   Pure apart from the two cache helpers, so the tier rule runs under plain node. */

/* ── Tiers ──
   Lessons completed in the current language decide the tier. Skill strength
   (SkillStat level 'strong', mastery >= 0.8) gates only the two tiers past the
   end of the course, because finishing every lesson is not the same as
   knowing it:

     Newbie     0 lessons
     Beginner   1–4 lessons
     Learner    5–9
     Confident  10–19
     Fluent     20+
     Expert     every lesson in the course, and >= 50% of practised skills strong
     Master     every lesson in the course, and >= 80% of practised skills strong

   "Practised" = the skill has at least one unit of evidence (anything but
   level 'new'); a skill the learner has only glimpsed is not counted against
   them. A short course (Hindi, 5 lessons) tops out at whatever lesson tier its
   length reaches, unless its skills are strong enough for Expert. */
export const TIERS = [
    { status: 'Newbie', icon: '🐣', color: '#94a3b8', from: 0 },
    { status: 'Beginner', icon: '🐥', color: '#10b981', from: 1 },
    { status: 'Learner', icon: '📖', color: '#3b82f6', from: 5 },
    { status: 'Confident', icon: '🦁', color: '#6366f1', from: 10 },
    { status: 'Fluent', icon: '🦸', color: '#8b5cf6', from: 20 },
    { status: 'Expert', icon: '🎓', color: '#ec4899', strongShare: 0.5 },
    { status: 'Master', icon: '👑', color: '#f59e0b', strongShare: 0.8 },
];

/** Strong skills as a share of practised ones, 0..1 (0 when none practised). */
export function strongShare(skills) {
    const practised = (skills?.total || 0) - (skills?.new || 0);
    return practised > 0 ? (skills.strong || 0) / practised : 0;
}

const pct = (x) => Math.round(Math.min(1, Math.max(0, x)) * 100);

/**
 * `summary`: the /summary payload (or a cached copy, or null).
 * `totalLessons`: lessons in this language's course.
 * Returns the tier, a 0..100 progress bar, the "13 of 30 lessons · 11% of
 * skills strong" line, and what the next tier needs.
 */
export function proficiencyOf(summary, totalLessons) {
    const done = summary?.lessonsCompleted || 0;
    const share = strongShare(summary?.skills);
    const finished = totalLessons > 0 && done >= totalLessons;

    let i = 0;
    for (let k = 0; k < TIERS.length; k++) {
        const t = TIERS[k];
        if (t.strongShare !== undefined ? (finished && share >= t.strongShare) : done >= t.from) i = k;
    }
    const tier = TIERS[i];
    const next = TIERS[i + 1] || null;

    let progress = 100;
    let nextLine = null;
    if (next && next.strongShare === undefined) {
        progress = pct((done - tier.from) / (next.from - tier.from));
        nextLine = `Next: ${next.status} at ${next.from} lesson${next.from === 1 ? '' : 's'}`;
    } else if (next && !finished) {
        progress = pct(done / Math.max(1, totalLessons));
        nextLine = `Next: ${next.status} — finish all ${totalLessons} lessons`;
    } else if (next) {
        progress = pct(share / next.strongShare);
        nextLine = `Next: ${next.status} at ${pct(next.strongShare)}% of skills strong`;
    }

    const detail = `${done} of ${totalLessons} lessons · ${pct(share)}% of skills strong`;
    return { ...tier, progress, nextLine, detail, lessonsCompleted: done, strongShare: share };
}

/* ── Cache: the last summary per language, shown before the fetch returns ── */
const key = (prefix, lang) => `linguapaws_${prefix}:${lang}`;

export function readCache(prefix, lang) {
    if (!lang) return null;
    try {
        const raw = localStorage.getItem(key(prefix, lang));
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function writeCache(prefix, lang, value) {
    if (!lang) return;
    try {
        localStorage.setItem(key(prefix, lang), JSON.stringify(value));
    } catch {
        // storage full or blocked: the next visit just waits for the fetch
    }
}

/** What a learned word's schedule says, for the Word History list. */
export function wordState(w, now = Date.now()) {
    if (w.dueAt && new Date(w.dueAt).getTime() <= now) return 'due';
    // Box 3 = a 7-day interval: recalled correctly across several sessions.
    return (w.box || 0) >= 3 ? 'strong' : 'learning';
}

/**
 * The lesson a learned word came from, as "Lesson 4 · The 'Where'".
 * Step mode records `scenario` as the 0-based lesson index (a string on the
 * row); lesson 0 is stored as '' because the index is falsy, and older rows
 * may carry nothing — so a word with no usable index is looked up in the
 * course's own vocabulary lists. `lessons` is CURRICULUM[lang].
 */
export function lessonLabel(w, lessons = []) {
    let idx = /^\d+$/.test(String(w.scenario ?? '')) ? Number(w.scenario) : -1;
    if (!lessons[idx]) {
        const key = String(w.word || '').toLowerCase();
        idx = lessons.findIndex(l => (l.vocabulary || []).some(v => String(v.word).toLowerCase() === key));
    }
    return lessons[idx] ? `Lesson ${idx + 1} · ${lessons[idx].scenario}` : '';
}
