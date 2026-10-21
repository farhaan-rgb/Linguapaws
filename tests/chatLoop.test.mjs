/* Chat's turns as step-mode screens: the learning loop chat now feeds.
   node --test tests/*.test.mjs */
import test from 'node:test';
import assert from 'node:assert';
import { chatStepFor, chatStageOf, chatMissFeedback, missLead, settleChatScreen, chatMissedKeys, familyLine } from '../src/services/chatLoop.js';
import { buildLessonSteps, missedKeyFor } from '../src/services/stepPlan.js';
import { CURRICULUM } from '../src/services/curriculum.js';

test('the 15 turns map onto the four stages', () => {
    assert.deepStrictEqual([0, 4, 5, 7, 8, 10, 11, 14].map(chatStageOf),
        ['teach', 'teach', 'review', 'review', 'phrase', 'phrase', 'conversation', 'conversation']);
});

test('a chat drill turn is the same screen step mode builds for that drill', () => {
    for (const lang of ['Kannada', 'Telugu']) {
        const lesson = CURRICULUM[lang][0];
        const steps = buildLessonSteps(lesson, null, CURRICULUM[lang]);
        for (const pos of [8, 9, 10, 11, 12, 13, 14]) {
            const chat = chatStepFor({ lang, lessonIdx: 0, pos });
            if (!chat) continue;
            const same = steps.find(s => s.kind === 'drill' && s.phase === chat.phase && s.expected === chat.expected);
            assert.ok(same, `${lang} turn ${pos}: ${chat.expected}`);
            assert.deepStrictEqual(chat.variants, same.variants);
            assert.deepStrictEqual(missedKeyFor(chat, 0), missedKeyFor(same, 0));
        }
    }
});

test('a review turn asks the review-set item, phrase items included', () => {
    const word = chatStepFor({ lang: 'Kannada', lessonIdx: 1, pos: 5, reviewItem: { word: 'Naanu', meaning: 'I' } });
    assert.strictEqual(word.kind, 'review');
    assert.strictEqual(word.expected, 'Naanu');
    assert.strictEqual(chatStepFor({ lang: 'Kannada', lessonIdx: 1, pos: 6 }), null, 'no item, no screen');
});

test('a revealed drill posts evidence and a missed screen; a clean answer posts no missed screen', () => {
    const step = chatStepFor({ lang: 'Kannada', lessonIdx: 0, pos: 9 });
    const fb = chatMissFeedback('Naanu hegiddeera', step, { lang: 'Kannada', lessonIdx: 0, reveal: true });
    const out = settleChatScreen({ step, lang: 'Kannada', lessonIdx: 0, correct: false, revealed: true,
        attempts: [{ said: 'Naanu hegiddeera', spoken: false, help: fb.help }] });
    assert.ok(out.evidence.some(e => e.skillId === 'w:neevu' && e.score === 0));
    assert.deepStrictEqual(out.missed, [{ kind: 'drill', key: 'Neevu hegiddeera?', lessonIdx: 0 }]);
    assert.ok(fb.family.includes('needed here'), 'the family card on the reveal');

    const clean = settleChatScreen({ step, lang: 'Kannada', lessonIdx: 0, correct: true, said: 'Neevu hegiddeera?' });
    assert.ok(clean.evidence.every(e => e.score === 1));
    assert.deepStrictEqual(clean.missed, []);
});

test('spoken answers weigh half, as in step mode', () => {
    const step = chatStepFor({ lang: 'Telugu', lessonIdx: 0, pos: 8 });
    const typed = settleChatScreen({ step, lang: 'Telugu', lessonIdx: 0, correct: true, said: step.expected });
    const spoken = settleChatScreen({ step, lang: 'Telugu', lessonIdx: 0, correct: true, said: step.expected, spoken: true });
    assert.strictEqual(spoken.evidence[0].weight, typed.evidence[0].weight / 2);
});

test('a two-word teach turn is missed as each of its words', () => {
    const lessonIdx = CURRICULUM.Telugu.findIndex(l => (l.vocabulary || []).length > 5);
    const step = chatStepFor({ lang: 'Telugu', lessonIdx, pos: 4 });
    assert.strictEqual(step.slice.length, 2);
    assert.deepStrictEqual(chatMissedKeys(step, lessonIdx).map(k => k.key), step.slice.map(w => w.word));
});

test('a miss leads with the engine line and never repeats the outline', () => {
    const step = chatStepFor({ lang: 'Kannada', lessonIdx: 0, pos: 5, reviewItem: { word: 'Hege', meaning: 'How' } });
    const lead = missLead(chatMissFeedback('Nanu', step, { lang: 'Kannada', lessonIdx: 0 }));
    assert.ok(lead.startsWith('Not quite.'));
    assert.strictEqual((lead.match(/H_{2,}/g) || []).length, 1, lead);
    assert.strictEqual(familyLine(null), '');
});
