#!/usr/bin/env node
/**
 * check-course — every static check, one command.
 *
 *   node tools/check-course.mjs                     # Telugu
 *   node tools/check-course.mjs Telugu Odiya Hindi  # any set
 *
 * Exits non-zero if any language has a blocked drill, a declared-correct answer
 * the grader rejects, a lesson the engine cannot complete, or a lesson whose
 * drill count does not fit the fifteen-step layout.
 *
 * These are cheap and deterministic and catch most of what a playtester would
 * spend an hour finding. Run them before asking anyone — simulated or real — to
 * sit through a lesson.
 */

import { execFileSync } from 'node:child_process';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

/* Telugu by default. The autoplay pass spawns a process per turn, so a full
   30-lesson language costs roughly a minute per mode — fine for one language,
   several minutes for four. Name the others explicitly when you want them. */
const LANGS = process.argv.slice(2).filter(a => !a.startsWith('--'));
if (!LANGS.length) LANGS.push('Telugu');

const run = (script, args) => {
    try {
        return execFileSync('node', [join(HERE, script), ...args], { cwd: ROOT, encoding: 'utf8' });
    } catch (err) {
        return err.stdout || '';   // these tools exit non-zero when they find things
    }
};

const count = (text, re) => Number(text.match(re)?.[1] ?? -1);

const rows = [];
for (const lang of LANGS) {
    const gaps = run('gap-check.mjs', [lang]);
    const match = run('matcher-check.mjs', [lang]);
    const ideal = run('autoplay.mjs', [lang]);
    const strict = run('autoplay.mjs', [lang, '--strict']);

    rows.push({
        lang,
        blocked: count(gaps, /## Blocked drills \((\d+)\)/),
        endings: count(gaps, /unseen ending on a taught stem \((\d+)\)/),
        rejected: count(match, /answers the matcher REJECTS \((\d+)\)/),
        shorter: count(match, /Shorter answer accepted for a longer target \((\d+)\)/),
        misshapen: count(match, /does not match the engine's layout \((\d+)\)/),
        ideal: (ideal.match(/(\d+) of (\d+) lessons completed/) || []).slice(1, 3).join('/'),
        strict: (strict.match(/(\d+) of (\d+) lessons completed/) || []).slice(1, 3).join('/'),
    });
}

const pad = (v, n) => String(v).padEnd(n);
console.log('');
console.log(`${pad('language', 10)}${pad('blocked', 9)}${pad('endings', 9)}${pad('rejected', 10)}${pad('lenient', 9)}${pad('misshapen', 11)}${pad('ideal', 8)}strict`);
console.log('-'.repeat(74));
for (const r of rows) {
    console.log(`${pad(r.lang, 10)}${pad(r.blocked, 9)}${pad(r.endings, 9)}${pad(r.rejected, 10)}${pad(r.shorter, 9)}${pad(r.misshapen, 11)}${pad(r.ideal, 8)}${r.strict}`);
}
console.log('');
console.log('blocked   drills whose easiest accepted answer needs an untaught word');
console.log('endings   drills needing an unseen ending on a taught stem');
console.log('rejected  answers the course declares correct that the grader refuses');
console.log('lenient   a SHORTER answer accepted for a longer target (pronoun drops are fine)');
console.log('misshapen lessons not carrying 3 sentence + 4 conversation drills');
console.log('ideal     lessons completable when always given the curriculum answer (flow)');
console.log('strict    lessons completable by a learner who only says what it was taught');
console.log('');

const bad = rows.filter(r => r.blocked || r.rejected || r.misshapen
    || r.ideal.split('/')[0] !== r.ideal.split('/')[1]
    || r.strict.split('/')[0] !== r.strict.split('/')[1]);
if (bad.length) console.log(`needs work: ${bad.map(r => r.lang).join(', ')}\n`);
process.exit(bad.length ? 1 : 0);
