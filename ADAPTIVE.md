# Adaptive learning

The thesis: what sets this app apart is understanding *how* a learner answers
and where they struggle, not just whether they were right. Four phases; this
file is the design record for all of them.

| Phase | What | State |
|---|---|---|
| 1 | Skill taxonomy, drill tagging, attribution, per-learner skill model | **done — measure only** |
| 2 | Practice and the in-lesson Memory check aim at weak skills, and say why | **done** |
| 3 | The lesson after New words adapts: pool drills for weak skills, one strong drill skipped, hint timing, listen words | **done** |
| 4 | AI-generated drill pools at scale | not started |

Phase 1 changes nothing a learner sees, is asked, or is accepted on. Grading
stays in `lessonEngine.scoreAnswer`; attribution runs after the engine has
decided, and reads the engine's own miss diagnosis.

## Skills (`src/services/skills.js`)

| Type | Id | Source |
|---|---|---|
| word | `w:<headword>` | every vocabulary word (spaces → `-`) |
| ending | `e:<ending>` | every `WORD_ENDINGS` entry |
| construction | `c:<name>` | `CONSTRUCTIONS` in skills.js, hand-curated (Kannada 12, Telugu 11) |
| order | `order` | one per language: words of a sentence in order (verb last) |

`skillsFor(lang)` → `Map(id → { id, type, label, lesson })`. `label` is
plain English for a learner ("Saying “I want” with nanage … beku"). `lesson`
(1-based) is authored for endings and derived for everything else: the first
lesson whose screens test it.

A construction is `parts`: each part a regex that must match some token of the
**expected** answer. The matching tokens are its keys, so a miss on *nanage* is
also a miss on `c:nanage-want`. Constructions are matched on the course's
answer, never on what the learner wrote — so a construction that appears only
in `acceptable` forms is never tagged (Telugu `c:naaku-want` today: every
expected answer drops *naaku*; skill-check lists it as never tested).

## Tagging

`tagStep(step, { lang, lessonNo })` works on any stepPlan screen: teach,
review, contrast, phrase, conversation, practice. Each token of the expected
answer gives its word skill (via headword or `alt`), the word under it if it is
a taught stem plus a taught ending (`engine.carriesEnding`, the same test
missHelp uses), and that ending's skill. Drills with two or more known words get
`order`; teach, review and contrast screens do not.

`node tools/skill-check.mjs <Language> [--verbose]` reports per-lesson
coverage, screens with no skill (exit 1 if any drill), and answer words no skill
covers. Today: every screen of Kannada and Telugu carries a skill; 98.7% of
Telugu answer words do (the rest are names and fused forms like *hegiddeera*).

## Attribution: `skillEvidence(...)`

One settled screen in, `[{ skillId, score, weight }]` out. `score` is 0 (failed)
to 1 (succeeded); `weight` 0–1 is how far to trust it. The input is the step,
the outcome, and every missed attempt with `missHelp`'s result for it — missHelp
now returns `kind` (`trap` | `ending` | `wrong-word` | `extra` | `reasoned` |
`other`) plus `ending: { word, wanted, added }` and `subs: [{ said, needed, near }]`.

| Evidence | Score | Weight |
|---|---|---|
| correct first try, unaided — every tagged skill | 1 | 1.0 |
| correct after a miss — every tagged skill | 1 | 0.4 |
| correct but helped (tap-to-translate, asked about an answer word) | 0.5 | 0.5 |
| "I don't know" with no attempt — every tagged skill | 0 | 0.6 |
| revealed — a tagged skill the misses said nothing about | 0 | 0.5 |
| wrong word: the answer word it stood in for (+ its constructions) | 0 | 1.0 |
| … the taught word said instead (the confused partner) | 0 | 0.5 |
| wrong ending: the ending needed / an ending added where none belongs | 0 | 1.0 |
| … a sibling ending used instead (*-galu* for *-aru*) | 0 | 0.5 |
| … the stem under it — they knew the word | 1 | 0.3 |
| answer word missing / left in English | 0 | 0.8 |
| word order (engine `orderMiss`) / order among the words present | 0 | 1.0 / 0.5 |
| spelling slip of an answer word — the word skill only | 0 | 0.3 |
| answer word written right inside a missed attempt | 1 | 0.3 |
| the engine could diagnose nothing — every tagged skill | 0 | 0.4 |

Multipliers: a spoken attempt ×0.5 (recognisers mishear); a spoken miss whose
best `similarityRatioLatin` to any accepted form is under 0.4 ×0.1. Phase:
teach ×0.3 (the word is on screen), phrase ×0.8, review and conversation ×1.
A re-ask ×0.5 (the answer was shown minutes ago). Items for one skill are merged
— weighted mean score, summed weight capped at 1 — before the phase multiplier,
so one screen is at most one unit of evidence per skill. All in `WEIGHTS`.

## The learner model (backend)

`SkillStat { userId, lang, skillId, mastery, attempts, evidence, lastSeen,
lastOutcome, recent[8] }`, unique on (userId, lang, skillId).
`backend/services/skillStats.js` holds the rule:

    mastery starts at 0.5
    a = 1 − (1 − 0.3)^weight
    mastery ← mastery + a · (score − mastery)

A full-weight item moves mastery 30% of the way to its score; two half-weight
items move it as far as one full one. `evidence` sums the weights.

Level: `new` while evidence < 1; then `weak` if mastery < 0.5, `strong` if
≥ 0.8, else `learning`. `weak` is `level === 'weak'`.

| Endpoint | |
|---|---|
| `POST /api/progress/skills/evidence` | `{ lang, items: [{ skillId, score, weight }] }`, ≤ 40 items; fire-and-forget |
| `GET /api/progress/skills?lang=&weak=1&limit=` | `[{ skillId, mastery, attempts, evidence, lastSeen, lastOutcome, recent, level, weak }]`, weakest first |

`Steps.jsx` posts after every settled screen, lesson and practice, first
attempt and re-ask. **Chat.jsx does not post yet**: its turns are not screens
with a known step and attempt list, and wiring it means reconstructing both from
the message log — not cheap, so deferred again to phase 3.

Debug: `/debug/skills` (hidden route, `?lang=Telugu`, `?weak=1`) lists the
signed-in learner's model with labels.

## What phase 2 can read

- `GET /api/progress/skills?lang=…` — mastery, level and recent scores per skill.
- `skillsFor(lang)` — label, type and lesson of every skill.
- `tagStep(step, …)` — which skills any screen tests, so a plan can be built
  toward weak skills (e.g. pick practice drills whose tags hit `weak` ones).
- The confused partner and the ending a learner over-applies are in the
  evidence, so `w:hoguttene` low after `w:maaduttiddene` misses is visible.

## Phase 2: selection (`src/services/adaptive.js`)

One rule chooses which screens Practice and the Memory check ask. It only
chooses among screens the course already has, from lessons already taught;
what a screen asks and what it accepts are unchanged.

A candidate scores by the neediest skill it tests (`skillsOfStep` = `tagStep`,
plus — for a one-word review — every taught construction the word is a key of,
so *nanage* answers to `c:nanage-like`):

    need:  weak 1.0 > learning 0.6 > new-but-taught 0.35 > strong 0.1
           (strong but unseen for 21 days counts as learning: it is decaying)
    score: need of the neediest skill + 0.25 × mean need
           + source bonus (confusion 0.6, due 0.4, missed 0.3) + seeded jitter ≤ 0.05

Then, in order: every open confused pair; 40% of slots held for due words
(neediest first) so the SRS still moves; the rest by score, each earlier pick
for the same skill costing 0.3 so one weak skill gets several screens, not the
session; and 20% (at least one) for strong skills, longest-unseen first, for
retention. Practice caps one kind (word reviews vs drills) at 60%. The picks are
reordered so no skill comes twice in a row where there is a choice (in practice,
within each phase group, since re-asks need the phases grouped). Seeded:
practice by `Date.now()`, the Memory check by lesson index.

| Surface | Candidates | Without a model |
|---|---|---|
| Practice (`buildPracticeSteps({ skills })`) | due words, open pairs, missed screens, every word and drill of finished lessons | the old priority plan, byte for byte (tested) |
| Memory check (`srs.ensureReviewSet` → `pickReviewItems`) | due words and every word of the lessons **before** this one; top-up from this lesson as before | the old three most-due + top-up |

The Memory check keeps its three slots and the contrast still takes the last,
so plan length, resume and the lesson map do not move. The set is cached per
lesson as before, so Chat asks the same words — Chat reads `source: 'earlier'`
as an older word, and shows no caption.

**Why captions.** A pick whose neediest skill is `weak` may carry `why`, e.g.
*"Because the -ge ending tripped you up before"* or, for a word with an open
confused pair, *"Because Nanage and Naanu got mixed up before"*. At most one
per round (phase) and one per skill per session; never on a default pick, never
on a re-ask, never spoken — it renders as `.adaptive-why` under the header, out
of everything the voice reads.

**Fetching.** `srs.fetchSkillModel(lang)`: prefetched when the lesson mounts,
1.5 s timeout, memoised 60 s, never rejects; anything but a non-empty list is
"no model". Nothing waits on it beyond that timeout.

**Optional constructions.** A drill whose accepted forms carry a construction
its expected answer drops (Telugu *naaku … kaavali*) is now tagged with it,
marked `optional`. It is a target for selection, but takes evidence only when
the learner's own accepted answer used it (`skillEvidence({ finalSaid })`) —
dropping *naaku* is correct, not a failure. `c:naaku-want` is now tested by 9+
Telugu screens; skill-check reports 162/162 Telugu skills tested.

**Preview.** `preview.html?…&skills=c:nanage-like,e:ge[&confused=Naanu>Nanage]`
stubs a model (those weak, five words strong) for the Memory check and
`screen=practice&done=N`.

Tests: `tests/adaptive.test.mjs`; practice-check also builds every plan with a
model and holds it to the same promises.

## Phase 3: the lesson after "New words" (`adaptive.planLessonAdaptation`)

**Pools.** `src/services/drillPools.js` holds `DRILL_POOLS[lang][lessonNo]`;
curriculum.js attaches each list as `lesson.pool`. A pool drill is a lesson
drill plus `id` (stable — a cached plan refers to it), `phase`, `source`
(`seed` | `generated`) and `reviewed`. Skills are never written down: tagStep
derives them. A separate file so phase 4's generator can rewrite it wholesale.
Seed: 3 per lesson for Kannada and Telugu L5–L12 (48), all `reviewed: false`.
gap-check, matcher-check and script-check (and speechScript's native table)
now include pool drills, so check-course holds them to the lesson bar.

**Core.** A lesson drill is core if it carries `core: true` or is the first
drill in the course to test one of its skills (`coreFlags`). Core drills
always run, in the order written.

**What adaptation may do**, and nothing else:

| | Rule |
|---|---|
| add | ≤ 2 pool drills from this lesson's or an earlier lesson's pool whose neediest skill is `weak`; this lesson's pool +0.1; each later pick for the same skill −0.3. Each goes at the end of its own round. |
| skip | ≤ 1 non-core drill whose every (non-optional) skill is `strong`, never one that would empty its round. Keyed by round + answer (Kannada L8 asks *Nanna snehitaru* in both rounds). |
| assist | any tagged skill `weak` → `'more'`: hint shown up front and a "Show the first letters" button before any miss (asking counts as help); every core skill `strong` → `'less'`: no "Show a hint" until a miss. Grading unchanged. |
| listen | slot 1 = the weakest weak word of this lesson, slot 2 = the weakest weak word of any earlier lesson; otherwise the old pick. Same pools, same distractor rules. |
| why | phase 2's caption, ≤ 1 per round, never for a skill the Memory check already explained. |

So a plan is −1…+2 screens from today's. A model with nothing `weak` or
`strong` (a new learner) changes nothing; no model is today's plan exactly.

**Resume.** The adaptation is a small JSON object, made once at lesson start
(after the review set) and cached in `linguapaws_adapt_<lang>_<idx>`
(`srs.ensureAdaptation`). Steps, the lesson map (`getAdaptation`) and the
preview drivers all rebuild from the cache, so the plan does not move however
the model moves mid-lesson. `{ none: true }` caches "plain" just as firmly. A
lesson already part-played with nothing cached stays plain. The cache is
cleared on lesson complete (a replay re-adapts) and with the review sets.
A pool id that no longer exists is dropped — never renumber a published one.

**Listen evidence.** Listen screens are tagged with their word skill. A right
tap is credit at 0.4 (0.15 after a miss, 0.1 after "show the word"), a wrong
one 0 at 0.25; ×0.5 on a re-ask. A four-way tap can be a guess and says the
learner understands, not that they can say it.

**Chat** is not adapted (it keeps the fixed 15-turn cycle and the lesson's own
drills), as in phase 2.

Preview: `preview.html?lang=Kannada&scenario=7&skills=e:galu,w:nimma&win=12`,
then Continue, lands on the added *Nanna manegalu* with its caption and the
hint up front. Tests: `tests/lessonAdapt.test.mjs`.

## Spaced phrases (`src/services/phraseReview.js`)

The SRS scheduled words only. A lesson's phrases and conversation lines were
drilled once and never asked again on a schedule: practice could draw one at
random, a missed one came back through the missed-screen record, and phase 3
adds *pool* drills for weak skills — but none of that brings a chunk such as
*Meeru ela unnaru?* back when it is due. Formulaic chunks are learned whole
and forgotten like words, so they now sit on the same Leitner ladder.

- **Storage.** `LearnedWord` rows with `kind: 'phrase'`, `lessonIdx`, `phase`;
  `wordKey` is `phrase:<answer>` so a one-word answer (*Yaavaga?*) never shares
  a row with the word. `GET /due` and `GET /vocab` return words only unless
  `kind=phrase` — Chat, practice and the word count are unchanged.
- **Recording.** A lesson's own drill, first attempt, once per lesson per
  answer (Telugu L1 asks one line in both rounds), through `POST /review` with
  the same `unaided | hinted | revealed | missed` outcome a word gets. Pool
  drills are not recorded. Chat records its phrase/conversation stages on the
  accepted answer (an echo of the tutor's line counts as `revealed`) and on skip.
- **Asking.** `ensureReviewSet` fetches due phrases and `placeDuePhrases` puts
  at most one (`PHRASE_SLOTS_MAX`) into the Memory check, replacing a word so
  the slot count, resume and the lesson map do not move: a current-lesson
  top-up first, then an adaptive "earlier" pick, then a due word — never the
  first slot, never the last (a confused pair takes that one). Only from a
  lesson before this one that the learner has finished (`lessonProgress`); a
  phrase this lesson drills anyway is skipped.
- **Grading.** The item caches only `{ lessonIdx, phase }` and its answer; the
  drill — and so its `acceptable` list — is looked up in the course each time
  the screen is built, so a fixed variant reaches it. Accepted by
  `lessonEngine.scoreAnswer` on those forms, as the drill itself was.
- **Both surfaces.** The set is the shared review cache, so Chat asks the same
  phrase ("How do you say … in Telugu?") on the same variants.

Preview: `preview.html?lang=Telugu&scenario=2&phrases=1&miss=7&wrong=zzz` — the
previous lesson's phrases stubbed as due. Tests: `tests/phraseReview.test.mjs`,
`backend/tests/phraseSrs.test.js`.
