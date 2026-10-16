/**
 * backfill-skills.js
 * Seeds SkillStat from activity learners had before skill evidence existed
 * (633f4a8): LearnedWord SRS history, Confusion pairs, MissedScreen records
 * and finished lessons. Mapping and weights: services/skillBackfill.js and
 * ADAPTIVE.md "Backfill".
 *
 * DRY RUN BY DEFAULT — reads only, prints what it would write.
 *   node scripts/backfill-skills.js                       # every learner, dry run
 *   node scripts/backfill-skills.js --user <id> --lang Kannada
 *   node scripts/backfill-skills.js --apply               # writes
 *
 * Idempotent: a user+lang that already has a backfilled SkillStat is skipped.
 * Live evidence is never overwritten — backfill is placed under it (rebase).
 * Output names learners by user id only.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const LearnedWord = require('../models/LearnedWord');
const Confusion = require('../models/Confusion');
const MissedScreen = require('../models/MissedScreen');
const SkillStat = require('../models/SkillStat');
const User = require('../models/User');
const { levelOf, byWeakness, skillPayload } = require('../services/skillStats');
const { planFor } = require('../services/skillBackfill');
const path = require('path');
const { skillLabel } = require(path.resolve(__dirname, '../../src/services/skills.js'));

function args(argv) {
    const a = { apply: false, user: null, lang: null, top: 10 };
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--apply') a.apply = true;
        else if (argv[i] === '--dry-run') a.apply = false;
        else if (argv[i] === '--user') a.user = argv[++i];
        else if (argv[i] === '--lang') a.lang = argv[++i];
        else if (argv[i] === '--top') a.top = Number(argv[++i]) || 10;
    }
    return a;
}

const tally = (stats) => stats.reduce((o, s) => { const l = levelOf(s); o[l] = (o[l] || 0) + 1; return o; }, {});

async function main() {
    const opt = args(process.argv.slice(2));
    if (opt.user && !mongoose.isValidObjectId(opt.user)) throw new Error('--user must be an ObjectId');
    console.log(`=== skill backfill — ${opt.apply ? 'APPLY (writes)' : 'DRY RUN (read-only)'} ===`);
    await mongoose.connect(process.env.MONGODB_URI);

    const filter = {};
    if (opt.user) filter.userId = new mongoose.Types.ObjectId(opt.user);
    if (opt.lang) filter.lang = opt.lang;
    const [lws, cfs, mss, sss] = await Promise.all([
        LearnedWord.find(filter).lean(), Confusion.find(filter).lean(),
        MissedScreen.find(filter).lean(), SkillStat.find(filter).lean(),
    ]);
    const groups = new Map();
    const group = (row) => {
        const k = `${row.userId}|${row.lang}`;
        if (!groups.has(k)) groups.set(k, { userId: String(row.userId), lang: row.lang, learnedWords: [], confusions: [], missedScreens: [], existing: [] });
        return groups.get(k);
    };
    lws.forEach(r => group(r).learnedWords.push(r));
    cfs.forEach(r => group(r).confusions.push(r));
    mss.forEach(r => group(r).missedScreens.push(r));
    sss.forEach(r => group(r).existing.push(r));
    const userIds = [...new Set([...groups.values()].map(g => g.userId))];
    const users = await User.find({ _id: { $in: userIds } }, { lessonProgress: 1 }).lean();
    const progress = new Map(users.map(u => [String(u._id), u.lessonProgress || {}]));
    /* A learner with lessons finished but no other rows still gets the prior. */
    const progUsers = await User.find(opt.user ? { _id: opt.user } : {}, { lessonProgress: 1 }).lean();
    for (const u of progUsers) {
        for (const [lang, idx] of Object.entries(u.lessonProgress || {})) {
            if (opt.lang && lang !== opt.lang) continue;
            if (!Number.isInteger(idx)) continue;
            group({ userId: u._id, lang });
            progress.set(String(u._id), u.lessonProgress);
        }
    }

    const now = new Date();
    let total = 0, skippedConflicts = 0;
    for (const g of groups.values()) {
        const live = g.existing.filter(d => !d.backfill);
        const cutoff = live.length ? Math.min(...live.map(d => new Date(d.createdAt).getTime())) : null;
        const lastLessonIdx = progress.get(g.userId)?.[g.lang] ?? null;
        const plan = planFor({ ...g, lastLessonIdx, cutoff }, now);
        console.log(`\nuser ${g.userId} · ${g.lang}`);
        if (plan.already) { console.log('  already backfilled — skipped'); continue; }
        console.log(`  sources: ${JSON.stringify(plan.counts)}${cutoff ? `  (live evidence since ${new Date(cutoff).toISOString()})` : ''}`);
        const after = new Map(g.existing.map(d => [d.skillId, d]));
        plan.writes.forEach(w => after.set(w.skillId, { skillId: w.skillId, ...w.set }));
        const before = tally(g.existing), result = tally([...after.values()]);
        console.log(`  would write ${plan.writes.length} skills (${plan.writes.filter(w => w.live).length} merged under live evidence)`);
        console.log(`  levels before: ${JSON.stringify(before)}  after: ${JSON.stringify(result)}`);
        const weak = [...after.values()].map(skillPayload).filter(s => s.weak).sort(byWeakness).slice(0, opt.top);
        if (weak.length) {
            console.log(`  weakest ${weak.length}:`);
            weak.forEach(s => console.log(`    ${s.skillId.padEnd(22)} m=${s.mastery.toFixed(3)} ev=${s.evidence}  ${skillLabel(g.lang, s.skillId)}`));
        }
        total += plan.writes.length;
        if (!opt.apply || !plan.writes.length) continue;
        const ops = plan.writes.map(w => ({
            updateOne: {
                /* A live doc is only touched if nothing posted since we read it. */
                filter: w.live
                    ? { userId: g.userId, lang: g.lang, skillId: w.skillId, updatedAt: w.liveUpdatedAt, backfill: { $exists: false } }
                    : { userId: g.userId, lang: g.lang, skillId: w.skillId },
                update: w.live ? { $set: w.set } : { $setOnInsert: w.set },
                upsert: !w.live,
            },
        }));
        const res = await SkillStat.bulkWrite(ops, { ordered: false }).catch(e => e.result || { error: e.message });
        const hit = (res.matchedCount || 0) + (res.upsertedCount || 0);
        skippedConflicts += ops.length - hit;
        console.log(`  applied: ${JSON.stringify({ matched: res.matchedCount, upserted: res.upsertedCount, modified: res.modifiedCount })}`);
    }
    console.log(`\n${opt.apply ? 'wrote' : 'would write'} ${total} skill docs across ${groups.size} user+lang groups${opt.apply ? `; ${skippedConflicts} skipped (changed under us)` : ''}`);
    await mongoose.disconnect();
}

main().catch((err) => { console.error('Error:', err.message); process.exit(1); });
