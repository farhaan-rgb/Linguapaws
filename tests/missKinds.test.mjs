/* The miss taxonomy: the enum both halves of the app store, and the two rules
   that turn a screen's attempts into one recorded kind.
   Run: node --test tests/*.test.mjs */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    MISS_KINDS, MISS_KIND_INFO, DIAGNOSTIC_MISS_KINDS,
    isMissKind, normaliseMissKind, missKindLabel, dominantMissKind, reviewMissKind,
} from '../shared/missKinds.js';

test('every kind is described, and says which engine detection finds it', () => {
    assert.equal(new Set(MISS_KINDS).size, MISS_KINDS.length, 'no duplicates');
    for (const k of MISS_KINDS) {
        const info = MISS_KIND_INFO[k];
        assert.ok(info, `${k} has no entry`);
        assert.ok(info.label && info.what && info.signal, `${k} is missing a column`);
        /* Stored verbatim in Mongo and sent over the wire: lowercase,
           hyphenated, short. These strings are an interface. */
        assert.match(k, /^[a-z][a-z-]{0,20}$/);
    }
    assert.equal(Object.keys(MISS_KIND_INFO).length, MISS_KINDS.length, 'no orphan entries');
    assert.ok(!DIAGNOSTIC_MISS_KINDS.includes('unknown'));
    assert.equal(DIAGNOSTIC_MISS_KINDS.length, MISS_KINDS.length - 1);
});

test('the kinds Farhaan\'s answer and its neighbours need all exist', () => {
    /* "naanu eega tinnuttiddene, hoguttene aamele" — every word right, the
       last two swapped — must be storable as something other than a bare
       miss, and as something other than not knowing the word. */
    for (const k of ['order', 'ending', 'confusion', 'wrong-word', 'spelling']) {
        assert.ok(isMissKind(k), k);
    }
    assert.equal(missKindLabel('order'), 'Word order');
    assert.notEqual(missKindLabel('order'), missKindLabel('wrong-word'));
});

test('only an exact kind survives normalisation', () => {
    assert.equal(normaliseMissKind('ending'), 'ending');
    assert.equal(normaliseMissKind('Ending'), null);
    assert.equal(normaliseMissKind('word-order'), null);
    assert.equal(normaliseMissKind(''), null);
    assert.equal(normaliseMissKind(undefined), null);
    assert.equal(normaliseMissKind({ toString: () => 'order' }), null, 'strings only');
});

test('a screen is recorded by its first diagnosed attempt', () => {
    assert.equal(dominantMissKind(['order', 'ending', 'ending']), 'order');
    assert.equal(dominantMissKind('ending'), 'ending', 'one kind, not a list');
    /* The second attempt is written after being told what the first got
       wrong, so it is the contaminated one. The first is the evidence. */
    assert.equal(dominantMissKind(['confusion', 'spelling']), 'confusion');
    assert.equal(dominantMissKind(['unknown', 'order']), 'order', 'undiagnosed says nothing');
    assert.equal(dominantMissKind(['unknown', 'unknown']), 'unknown');
    assert.equal(dominantMissKind(['blank', 'ending']), 'ending', 'they tried after all');
    assert.equal(dominantMissKind(['blank']), 'blank');
    assert.equal(dominantMissKind(['nonsense', 'order']), 'order', 'junk is dropped, not stored');
    assert.equal(dominantMissKind([]), null);
    assert.equal(dominantMissKind(undefined), null);
});

test('a clean first-try answer never carries a kind', () => {
    assert.equal(reviewMissKind({ outcome: 'unaided', missKind: 'order' }), null);
    assert.equal(reviewMissKind({ outcome: 'hinted', missKind: 'order' }), 'order');
    assert.equal(reviewMissKind({ outcome: 'missed', missKinds: ['ending'] }), 'ending');
    assert.equal(reviewMissKind({ outcome: 'missed' }), null, 'nothing to send');
    assert.equal(reviewMissKind({ outcome: 'revealed', missKinds: [] }), null);
    assert.equal(reviewMissKind(), null);
});
