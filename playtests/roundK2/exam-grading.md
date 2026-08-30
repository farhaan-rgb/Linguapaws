# Round K2 — grading the full-course exam

One learner took all ten Kannada lessons in order, carrying vocabulary forward
in their head, then closed the app and answered 30 held-out items from memory.
All ten play transcripts are `leak-check` clean, so nothing in the play-through
was produced before the course showed it.

Graded against **real Kannada**, not against the course's own answer key — the
key had errors before round K1 and grading against it would credit them.

## Score

| Part | Items | Correct |
|---|---|---|
| 1 — English → Kannada | 17 | 17 |
| 2 — Kannada → English | 8 | 8 |
| 3 — explain the rule | 5 | 5 |

Six of the seventeen production items were **never drilled anywhere in the
course** and had to be assembled from taught parts. All six are correct Kannada:

- `Nanna pustaka yelli ide?` — "where is my book?" (possessive slotted into the
  lesson-3 question frame)
- `Idu nanna mane` — "this is my house" (the no-copula pattern from lesson 2)
- `Bisi neeru beda` — "I don't want hot water" (lesson 9 adjective + lesson 4 refusal)
- `Avaru yaaru?` — "who is that person?" from a word mentioned once in passing,
  reached by generalising the i-/a- near/far contrast
- `Mooru hoovu` — "three flowers", applying the no-plural-after-a-number rule to a
  noun it had never been demonstrated on
- `Kshamisi, oota yelli ide?` — "excuse me, where is the food?"

The learner also volunteered `Mane yelli ide?` for "where is the house?" — the
course's own key is the shorter `Mane yelli?`. The longer form is the more
natural Kannada. The learner produced better Kannada than the key, from the key's
own parts. (It also exposed a wrong note: see round K2 findings.)

## What this does NOT prove

A model playing a beginner **already knows Kannada**. `leak-check` can verify it
did not use that knowledge while PLAYING — it reads the transcripts — but the
exam is written from the model's own head with the app closed, and nothing
constrains it there. A perfect score is therefore consistent with two very
different stories:

1. the course taught it, or
2. the model answered from Kannada it knew before the session started.

Three things point at (1) rather than (2), and none of them is conclusive:

- **The explanations in Part 3 reproduce the course's own framing**, including
  phrasings that are specific to these lessons ("ask: is it a person?"), not
  general facts about Kannada.
- **The learner honoured the course's arbitrary choices.** It answered "two books"
  as `Eradu pustaka`, singular, *and gave the course's reason*. A model working
  from general Kannada would not reliably pick the course's line on that.
- **Its ignorance is shaped like the course's gaps.** On `Nanna akka illi` it
  said it could read the sentence but "could not have written it", because the
  person-form of "is" was never taught — a true statement about the course. A
  model drawing on outside knowledge had every opportunity to fill that in and
  did not.

That third signal is the strongest, and it is the one round K3 turns into an
actual control: its exam includes items the course genuinely never covered
(past tense, "I don't understand", numbers above five, "do you speak English?").
If a learner answers those in real Kannada, the exam is measuring the model and
should be thrown away. If it answers "I don't know", the exam is measuring the
course.

**Round K3 ran that control and it passed** — six of eight "I DON'T KNOW", each
with the missing piece named. The K2 result above therefore stands. See
`../roundK3/` and the round K3 section of `../harness-notes.md`.

**So: this exam measures whether the course is coherent and teachable — whether
what it teaches adds up to something a learner can recombine. It does not
measure human retention, and cannot.** See `human-transfer.md` for what can
reasonably be said about a human learner.

## What the learner said it could not do

Its own summary, which is more useful than the score:

> Could I survive a five-minute exchange with a Kannada speaker? **No.** I could
> survive about **forty seconds** — hello, I'm fine, how are you, what's your
> name, mine is X. After that I'd collapse.

The reasons it gave are all correct and all structural:

- **One verb in ten lessons** (*hogu* / *hoguttene*). No eat, drink, come, see,
  know, understand. Every sentence it can build is a naming, wanting or pointing
  sentence — "nothing happens in my Kannada".
- **No past or future**, and no "I am" for anything but "fine".
- It can ask `yelli ide?` but **could not understand the answer** — two place
  words, no directions, no near/far/left/right.
- It can ask `eshtu?` but **counts to five**, so any real price is noise.
- Everything was **read as transliteration at its own pace**. `nanna`/`nimma` and
  `illi`/`alli`/`illa` are near-twins on the page; at speaking speed it would
  have no chance.

The last point is the one no amount of curriculum work fixes: this course teaches
romanised Kannada by reading. It does not teach the script, and it does not
train listening.
