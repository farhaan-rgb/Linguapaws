#!/usr/bin/env node
/**
 * skill-check — does every screen of the course test a named skill?
 *
 *   node tools/skill-check.mjs Kannada
 *   node tools/skill-check.mjs Telugu --verbose   # every screen's tags, and uncovered words
 *
 * Walks every lesson's teach, review (one per taught word, as practice asks
 * it), phrase and conversation screens through skills.tagStep, and reports
 * per lesson: screens, screens with no skill, and the skills first tested
 * there. Ends with the taxonomy size by type, the skills no screen tests,
 * and every untagged screen. Exit 1 if any drill has no skill.
 */
import { CURRICULUM } from '../src/services/curriculum.js';
import { buildLessonSteps, contrastItem } from '../src/services/stepPlan.js';
import { skillsFor, tagStep } from '../src/services/skills.js';

const lang = process.argv[2];
const verbose = process.argv.includes('--verbose');
const lessons = CURRICULUM[lang];
if (!lessons) {
    console.error(`usage: node tools/skill-check.mjs <Language>  (one of ${Object.keys(CURRICULUM).join(', ')})`);
    process.exit(2);
}

const taxonomy = skillsFor(lang);
const tested = new Set();
const untagged = [];
const partial = [];         // drills with a word no skill covers
let tokens = 0, tokensTagged = 0;
let screens = 0;
console.log(`${lang}: ${lessons.length} lessons\n`);
console.log('lesson  screens  untagged  new skills');
lessons.forEach((lesson, i) => {
    const lessonNo = i + 1;
    const scope = lessons.slice(0, lessonNo);
    /* Every taught word as a memory check, and the lesson's own plan. */
    const reviews = (lesson.vocabulary || []).map(v => ({ word: v.word, meaning: v.meaning, source: 'due' }));
    const steps = buildLessonSteps(lesson, reviews, scope);
    /* One contrast screen per lesson, to check those tag too. */
    const v = lesson.vocabulary || [];
    if (v.length >= 2) {
        const c = contrastItem({ said: v[0].word, needed: v[1].word });
        steps.push(...buildLessonSteps({ vocabulary: [] }, [c], scope));
    }
    const before = tested.size;
    let none = 0;
    for (const s of steps) {
        screens += 1;
        if (s.kind === 'pattern') continue;   // read, not answered: nothing to tag
        const { skills, byToken, tokens: toks } = tagStep(s, { lang, lessonNo });
        tokens += toks.length;
        tokensTagged += toks.filter(t => byToken.has(t)).length;
        const loose = toks.filter(t => !byToken.has(t));
        if (s.kind === 'drill' && loose.length) partial.push(`L${lessonNo} ${s.expected}  [${loose.join(', ')}]`);
        skills.forEach(id => tested.add(id));
        if (!skills.length) {
            none += 1;
            untagged.push(`L${lessonNo} ${s.kind}${s.phase !== s.kind ? `/${s.phase}` : ''}: ${s.expected}`);
        }
        if (verbose) console.log(`   L${lessonNo} ${s.phase.padEnd(12)} ${String(s.expected).padEnd(40)} ${skills.join(' ')}`);
    }
    const fresh = [...tested].slice(before);
    console.log(`L${String(lessonNo).padEnd(6)} ${String(steps.length).padEnd(8)} ${String(none).padEnd(9)} ${fresh.length}`);
});

const byType = {};
for (const s of taxonomy.values()) byType[s.type] = (byType[s.type] || 0) + 1;
const never = [...taxonomy.keys()].filter(id => !tested.has(id));
const unknown = [...tested].filter(id => !taxonomy.has(id));
console.log(`\ntaxonomy: ${taxonomy.size} skills — ${Object.entries(byType).map(([k, n]) => `${n} ${k}`).join(', ')}`);
console.log(`screens: ${screens}, tagged: ${screens - untagged.length} (${((1 - untagged.length / screens) * 100).toFixed(1)}%)`);
console.log(`skills tested by some screen: ${taxonomy.size - never.length} of ${taxonomy.size}`);
console.log(`answer words carrying a skill: ${tokensTagged} of ${tokens} (${((tokensTagged / tokens) * 100).toFixed(1)}%)`);
console.log(`drills with a word no skill covers: ${partial.length}`);
if (never.length) console.log(`  never tested: ${never.join(', ')}`);
if (unknown.length) console.log(`  tagged but not in the taxonomy: ${unknown.join(', ')}`);
if (untagged.length) {
    console.log(`\nscreens with no skill (${untagged.length}):`);
    untagged.forEach(u => console.log(`  ${u}`));
}
if (partial.length && verbose) {
    console.log('\ndrills with an uncovered word (usually a name, or a word the course never lists):');
    partial.forEach(u => console.log(`  ${u}`));
}
const drillsUntagged = untagged.filter(u => / drill\//.test(u)).length;
process.exit(drillsUntagged ? 1 : 0);
