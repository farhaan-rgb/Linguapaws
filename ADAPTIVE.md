# Adaptive learning

The thesis: what sets this app apart is understanding *how* a learner answers
and where they struggle, not just whether they were right. Four phases; this
file is the design record for all of them.

| Phase | What | State |
|---|---|---|
| 1 | Skill taxonomy, drill tagging, attribution, per-learner skill model | **done — measure only** |
| 2–4 | Act on the model | not started |

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
the message log — left for phase 2.

Debug: `/debug/skills` (hidden route, `?lang=Telugu`, `?weak=1`) lists the
signed-in learner's model with labels.

## What phase 2 can read

- `GET /api/progress/skills?lang=…` — mastery, level and recent scores per skill.
- `skillsFor(lang)` — label, type and lesson of every skill.
- `tagStep(step, …)` — which skills any screen tests, so a plan can be built
  toward weak skills (e.g. pick practice drills whose tags hit `weak` ones).
- The confused partner and the ending a learner over-applies are in the
  evidence, so `w:hoguttene` low after `w:maaduttiddene` misses is visible.
