# Kannada — deterministic checks BEFORE round K1

## gap-check
```
# Kannada — 10 lessons, cumulative gap check

## Blocked drills (1)

Split by what the fix is. **Out of order** (1) — every missing word IS taught, just in a later lesson; reorder or move the word earlier. **Never taught** (0) — at least one word appears in no lesson's vocabulary and has to be written.

### Out of order — word exists, taught too late (1)

- L2 (conversation) "Ask 'What is your name?'" → `Nimma hesaru yenu?` — nimma (taught later, L5)

### Never taught anywhere in the course (0)

_None._


## Needs an unseen ending on a taught stem (1)

- L3 (conversation) "Final Check: Say 'I am going home'." → `Naanu manege hogu` — manege (stem: mane)

## Missing words ranked by how many drills they block

- `nimma` — 1 drill(s) — taught in L5
```
## matcher-check
```
# Kannada — answer-matcher self-consistency

## Declared-correct answers the matcher REJECTS (0)

_None — every listed answer passes._


## Variants that differ only by a person ending (1)

These accept a form that means a different PERSON — the one distinction
the lessons exist to teach and the matcher explicitly refuses to blur.

- L1 "Ask 'How are you?' (formal)" — `Neevu hegiddeera?` also accepts `neevu hegiddeeri?` (hegiddeera vs hegiddeeri)

## Another drill's answer accepted for this one

29 where the learner said at least as much as the target asked for — they produced the whole answer plus extra, which is fair.

### Shorter answer accepted for a longer target (1)

- L1: `Neevu hegiddeera?` accepted for `Miko, neevu hegiddeera?`

## Plain-English non-answers accepted as correct (0)

A learner who says they do not know must never be graded correct.

_None._


## Lessons whose drill count does not match the engine's layout (0)

The fifteen steps allot 3 sentence drills and 4 conversation drills.

_None._

```
## autoplay ideal
```
# Kannada autoplay — ideal (says the curriculum answer)

10 of 10 lessons completed.

```
## autoplay strict
```
# Kannada autoplay — strict (only says what it was taught)

8 of 10 lessons completed.

## Lessons that could not be completed (2)

- **L2 The 'What' & 'This/That'** — stuck at step 15 (converse) for 4 turns
- **L3 The 'Where' & 'Going'** — stuck at step 15 (converse) for 4 turns

## Lessons where the learner had to say "I don't know" (2)

- L2 The 'What' & 'This/That' — 4 drills unanswerable (lesson not completed)
- L3 The 'Where' & 'Going' — 4 drills unanswerable (lesson not completed)
```
