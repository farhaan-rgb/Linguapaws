# Why a miss happened

A miss was a boolean. `recordReview` sent `outcome` — `unaided | hinted |
revealed | missed` — which says how much help the learner needed and nothing at
all about what went wrong. Farhaan, learning Kannada, wrote

    wanted:   naanu eega tinnuttiddene, aamele hoguttene
    written:  naanu eega tinnuttiddene, hoguttene aamele

Every word right, the last two swapped. That reached the scheduler as the same
fact as not knowing *hoguttene*: the word dropped to box 0 and came back as a
vocabulary question, which drills something he had just demonstrated he knows,
while the thing he actually lacks — where the verb goes — was written down
nowhere a later lesson could read it. Word order, verb endings, case endings,
mixed-up words and plain vocabulary gaps all collapsed into one signal.

The galling part is that the engine already knows. Run that answer through
`missHelp` today and it says, out loud, to the learner:

    L3  "Naanu manege hoguttene"  <-  "Naanu hoguttene manege"
        line:     All the right words — the order is not. hoguttene goes last.
        orderMiss: { word: 'hoguttene', index: 2, last: true, exact: true }
        kind:     'other'

`orderMiss` found the swap, the line named it, and the structured result
threw it away as `other`. Everything below exists to stop that: a name for
each failure the engine can already tell apart, a place to put it, and a plan
for reading it back.

Nothing here grades anything. A kind is attached *after*
`lessonEngine.scoreAnswer` has already rejected an answer, and no value
described in this file can turn a rejection into an acceptance or the reverse.

## The taxonomy

`shared/missKinds.js` — ESM, dependency-free, imported by the frontend and
`require()`d by the backend, the way `shared/languages.js` is. One definition,
because three copies of a mapping is how *Odiya* came to resolve to two
different language codes.

Eleven kinds. Each one is named after a detection the engine already performs;
`signal` is the load-bearing column, because a kind nothing can detect is a
kind that will never be recorded.

| kind | what it is | the engine already finds it with |
|---|---|---|
| `order` | every word of the answer, in the wrong sequence | `orderMiss` / `misplacedWord` |
| `ending` | the right stem with the wrong ending — a dropped `-ge`, `-galu` for `-aru`, "I" where "you" was asked | `endingMiss`, `carriesEnding`, `differsOnlyByPersonEnding` |
| `confusion` | one taught word said for another the course teaches against it: *beku* for *beda*, *nimma* for *avara* | `DISTINCT_WORDS`, families, authored `traps` — `missHelp.pairs` |
| `wrong-word` | a word that is not the one wanted, with no partner nameable with confidence | `missHelp.subs` with no pair; near-forms of a taught word |
| `missing-word` | a word of the answer simply absent, nothing standing in for it | `missHelp` `missing` with no wrong word to blame |
| `extra-word` | the whole answer plus a word this sentence leaves out — *naanu* where the verb already carries "I" | `missHelp` kind `extra` |
| `english` | a word of the answer left in English | `missHelp.english` |
| `spelling` | the right words, one misspelt past what the grader takes | `isSpellingSlip`, `droppedSyllable`, `levenshtein` — `spellingNote` |
| `reasoned` | two taught words put together where the language has one | `builtFromParts` — `missHelp` kind `reasoned` |
| `blank` | nothing offered: "I don't know", or a skip | no tokens in the attempt |
| `unknown` | the engine looked and could not say | `missHelp` kind `other`, nothing else matching |

`unknown` is a floor, not a verdict about the learner, and it is the one kind
excluded from `DIAGNOSTIC_MISS_KINDS`. A profile that is mostly `unknown` is a
finding about the engine.

### What is deliberately not in the list

**Severity.** No kind is worse than another here. `order` is not a lesser
mistake than `missing-word`; it is a different one, and the only reason to
rank them would be to show a learner a league table of their failings.

**Anything the engine cannot see.** "Thinking in English", "panicked", "typed
too fast" are all plausible and none are detectable, so naming them would
produce a column that is always empty or always guessed.

**A kind per word.** The kind says what *sort* of mistake; which word it
happened on is the item the review is about, and for the profile it is
`recentWords`.

### Its relationship to the skill model

Adaptive phase 1 (ADAPTIVE.md) already built a per-skill learner model, and it
already has an `order` skill scored by `skills.missEvidence`. So why store a
kind at all?

Because the two answer different questions, and three things the skill model
cannot do fall out of the difference.

- **The scheduler cannot see SkillStat.** Rescheduling happens in
  `POST /api/progress/review`, which knows the word, the outcome and nothing
  else. The reason Farhaan's *hoguttene* dropped to box 0 is that the only
  thing the ladder was told was "missed".
- **The skill model aggregates away the item.** `w:hoguttene` low tells you the
  word is shaky. It cannot tell you that every single one of its misses was an
  order miss and the word itself has never been got wrong.
- **Chat posts reviews and no skill evidence.** `Chat.jsx` has never posted to
  `/skills/evidence` (ADAPTIVE.md says so, twice, deferring it). For the chat
  surface the review record is the only channel there is.

And one thing the kind cannot do that the skill model does: say *which* word or
ending or construction. Eleven buckets per language will never pick a drill on
their own. The two are meant to be read together — the skill model chooses
what to ask about, the miss profile chooses what shape to ask it in.

That is also why miss kinds are **not** folded into `SkillStat` as `m:` ids. A
SkillStat is a mastery: evidence in both directions, smoothed, decaying. A miss
kind is a count of occurrences with no positive evidence — nothing observes
"the learner did not make a spelling mistake" — so the weak/learning/strong
ladder would be measuring an interval that only ever grows. The one kind with a
genuine mastery equivalent is `order`, and it already has one as the `order`
skill; routing the profile through SkillStat would double-count exactly that
case and no other.

## The interface the classifier must satisfy

The classifier itself belongs in `src/services/lessonEngine.js`, which was
being edited by another agent while this landed, so it is **not** built here.
Everything downstream of this interface is built, tested and consuming a kind
passed in. Wiring it up is the following, and nothing else.

**1. A named export on the engine.**

```js
/**
 * Which kind of mistake a rejected answer was: one of shared/missKinds.js
 * MISS_KINDS. Never null — 'unknown' is the floor. Pure; called only after
 * scoreAnswer has rejected, and it must not be able to change that verdict.
 */
export function classifyMiss(said, expected, {
    variants = [], lexicon = new Map(), taughtLessons = [], endings = null,
    help = null,            // a missHelp result for this attempt, when the caller has one
} = {}) -> string
```

It takes a `help` because `missHelp` has already done nearly all of the work,
and it must work without one because `Chat.jsx` calls `explainMiss`, not
`missHelp`, and computes its diagnosis *after* it posts the review.

**2. One new field on `missHelp`'s return value: `missKind`.**

Add it; do not repurpose the existing `kind`. `kind` is which explanation
template fired and `skills.missEvidence` branches on it — changing its values
would silently re-weight the skill model. The mapping is:

| `missHelp.kind` | `missKind` |
|---|---|
| `ending` | `ending` |
| `trap` | `confusion` when `pairs.length`, else `wrong-word` |
| `wrong-word` | `confusion` when `pairs.length`; `english` when only `english` is non-empty; else `wrong-word` |
| `extra` | `extra-word` |
| `reasoned` | `reasoned` |
| `other` | the new work, below |

`other` is where the gap is. It is returned from four places in `missHelp`, and
it is what an order miss gets today. In that branch, in this order:

1. no tokens in the attempt → `blank`
2. `orderMiss(said, expected, variants, lexicon)` is truthy → `order`
3. every needed token is present or is a typo of something written, and at
   least one is a typo → `spelling`
4. words are missing and no wrong or English word can be blamed → `missing-word`
5. an English word is in the attempt → `english`
6. otherwise → `unknown`

The order matters: an answer can be several of these at once, and the list runs
from the most teachable to the least. It is the same ranking `missHelp.finish()`
already uses for which line leads.

**3. The two call sites, after the classifier exists.**

`src/pages/Steps.jsx` keeps `attempts: [{ said, spoken, help }]`, so both of its
`recordReview` calls take one new line:

```js
missKinds: attempts.map(a => a.help?.missKind),
```

`recordReview` reduces the list itself (`shared/missKinds.js reviewMissKind`),
so the surface does not have to know the rule. `src/pages/Chat.jsx` has no
attempt list; at each of its four `recordReview` calls it passes
`missKind: engine.classifyMiss(text, expected, { variants, lexicon })` — except
the skip path, which is `missKind: 'blank'` without asking the engine, because
a skip is not an attempt.

Both surfaces must be wired in the same change. They deliver the same 15-step
cycle and a profile built from one of them would be a profile of the surface,
not of the learner.

**4. The rule the reduction follows** (built, `dominantMissKind`): a screen is
recorded by its **first diagnosed attempt**. Steps.jsx already holds "the SRS
hears the first attempt only" for the outcome, and it holds harder here — by
the second attempt the learner has been told what was wrong with the first, so
a second-attempt ending slip may be a slip while reading the sentence that
named it. `unknown` attempts are skipped; `blank` is skipped if any later
attempt was diagnosed, because a learner who said "I don't know" and then tried
and got the ending wrong has an ending problem.

## Storage

Three places, all additive.

**On the item — `LearnedWord`.** `lastMissKind` (a string) and `missKinds` (a
`Map` of kind → count). Written in `POST /api/progress/review` beside the
schedule, by `backend/services/missKinds.js applyTally`, and only when the
outcome is not `unaided`: a clean first-try answer has no miss to have a kind,
and recording one would make the tally lie. Returned by `/due` and `/vocab`
through `missHistory(doc)`, which emits nothing at all for a row with no
history — "never classified" and "never missed" must not be confusable.

**On the learner — `MissKindStat`.** `{ userId, lang, kind, count, lastSeen,
recentWords[5] }`, unique on `(userId, lang, kind)`. Eleven documents per
language at most, so reading the whole profile is a find, not an aggregation.
This is the collection that can answer "is word order a problem for this
learner at all", which no row on a word can. Written in the same request as the
schedule — a miss counted twice (a retry, a resend) would skew it, and the
review post is already the one call step mode makes exactly once per screen —
but not awaited, because the schedule is the contract of that endpoint and a
failed profile write must not turn a recorded review into an error the client
retries.

**On the wire.** `POST /api/progress/review` accepts `missKind` (one kind) or
`missKinds` (one per attempt, in order, reduced server-side by the same shared
rule). `GET /api/progress/miss-kinds?lang=` returns
`[{ kind, label, count, share, lastSeen, recentWords }]`, most frequent first,
`share` computed server-side so two readers cannot disagree about the
denominator.

### Compatibility, and why there is no migration

There is nothing to migrate: every field is new, optional and absent-by-default,
and no existing index changes. Four asymmetries, all handled and all tested in
`backend/tests/missKinds.test.js`:

- **Old rows** have no `lastMissKind` and no `missKinds`. `missHistory` returns
  `{}` for them, and the writer creates the Map on first use.
- **An old server** ignores an unknown body field; the review schedules exactly
  as it does today. This is the precedent `kind: 'phrase'` already set in
  `srs.js`, and the reason the kind rides on the existing review post rather
  than on an endpoint of its own — a second request could 404 on an old server
  and an offline client would drop half the record.
- **An old client** sends no kind; nothing is written, and the response omits
  `missKind` rather than inventing one.
- **A newer client** may send a kind this server has never heard of. It is
  dropped, not rejected: the schedule is the contract, and failing the review
  over a vocabulary disagreement would lose the thing that matters.

A reader must treat an absent kind as *we do not know*, never as *no such
mistake*. The profile's denominator is classified misses only, so a learner
with two hundred misses from before this landed starts with an empty profile
and that is the honest answer.

## Reading it back

Designed here, **not built** — the profile is empty until the classifier lands,
and selection rules fitted to no data are rules fitted to noise. What is built
is the path to the data: `GET /api/progress/miss-kinds`, `srs.fetchMissProfile`
(same contract as `fetchSkillModel`: 1.5 s timeout, memoised 60 s, never
rejects, empty list means "no profile"), the per-item history on `/due` and
`/vocab`, and a table on `/debug/skills` to look at it.

**It does not feed `fetchSkillModel` / `fetchSkills`; it needs its own path.**
A SkillStat is keyed by a skill id that a drill can be tagged with, and ten of
the eleven kinds have no such id. The profile should be fetched alongside the
model — in the same `Promise.all` in `srs.ensureReviewSet` and
`srs.ensureAdaptation`, under the same timeout — and passed into
`pickReviewItems`, `buildPracticeSteps` and `planLessonAdaptation` as a new
`missProfile` argument beside `stats`. Being cached with the adaptation matters
for the same reason the model is: the plan must not move mid-lesson.

A kind is a **standing weakness** at `count >= 3 && share >= 0.25`. Three
consumers, in descending order of how much they are worth:

**1. The scheduler** (`backend/services/srs.js nextSchedule`). Every miss drops
an item to box 0. An `order`, `extra-word` or `spelling` miss on an item whose
words were all there is not evidence that the item is forgotten — it was
recalled. Proposal: `nextSchedule(box, outcome, now, { missKind })` demotes one
rung instead of to the bottom for those three kinds, floor 0, and does not
count a lapse. This is the fix to Farhaan's actual complaint and it is also a
real behaviour change to the ladder, so it should land after the classifier,
behind one named constant, and be spot-checked against a session before it is
believed.

**2. Selection and assistance** (`src/services/adaptive.js`). The skill model
picks *which* skill; the profile picks *what shape*. As a bounded bonus — cap
`+0.3`, so it can reorder candidates of similar need but never outrank a weak
skill:

| standing weakness | what it should change |
|---|---|
| `order` | prefer candidates whose expected answer has three or more taught words; raise the `order` skill's need; never spend a slot on a one-word review for it |
| `ending` | prefer candidates whose `tagStep` carries an `e:` skill |
| `confusion` | raise the confusion source bonus (today a flat `0.6`) — the Confusion collection already holds the pairs |
| `reasoned` | a review of the fused form itself, which is the word the learner built around |
| `spelling` | no drill shape: it belongs to the hint layer (phase 3 `assist: 'more'` on the word), not to selection |
| `blank` | a pacing signal, not a drill filter — a high blank share means the lesson is ahead of the learner |
| `missing-word`, `wrong-word`, `english` | **nothing.** These are ordinary vocabulary gaps, which is exactly what the SRS already handles. A profile dominated by them should produce today's plan, byte for byte |

That last row is the one to hold on to. Most misses are vocabulary misses, and
a mechanism that fires on all of them is a mechanism that fires always.

**3. The caption.** Phase 2's `why` line can name a kind:
`missKindLabel(kind)` plus `recentWords[0]` gives *"Because the word order in
Naanu manege hoguttene tripped you up"*. Same rules as today's captions — at
most one per round, never on a default pick, never on a re-ask, never spoken.

There is also a per-item use with no new machinery: `/due` now carries each
row's own `missKinds`, so the Memory check can see that a word is only ever
missed for its ending and ask for it inside a phrase instead of alone.

## State

| | |
|---|---|
| taxonomy (`shared/missKinds.js`) | **shipped** — 11 kinds, labels, `dominantMissKind`, `reviewMissKind` |
| storage (`LearnedWord`, `MissKindStat`, `POST /review`) | **shipped** |
| read path (`GET /miss-kinds`, `srs.fetchMissProfile`, `/due` + `/vocab` history, `/debug/skills`) | **shipped** |
| the classifier (`engine.classifyMiss`, `missHelp.missKind`) | **not built** — interface above; `lessonEngine.js` |
| the two surfaces' call sites (`Steps.jsx`, `Chat.jsx`) | **not built** — one line each, above; wire both together |
| scheduler, selection, captions | **designed, not built** — above |

Until the classifier lands nothing writes a kind, every profile is empty, and
every surface behaves exactly as it does today. That is the intended
intermediate state, not an unfinished one.

Tests: `tests/missKinds.test.mjs` (the taxonomy and the two reduction rules),
`backend/tests/missKinds.test.js` (the service, and the review route end to end
with every model faked — it has never been run against a real Mongo).
