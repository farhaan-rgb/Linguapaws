# Playtesting the course

The question these tools answer is not "does the app work" but **"can someone who
does not know the language learn it from this?"** Those come apart: every lesson
in this course completed end to end while asking learners for 70 words it had
never taught them.

## The four checks

Run these first. They are free, deterministic, and catch most of what a tester
would spend an hour finding.

```
node tools/gap-check.mjs Telugu          # drills that need a word no lesson has taught yet
node tools/matcher-check.mjs Telugu      # does the grader accept the answers the course declares correct?
node tools/autoplay.mjs Telugu           # can every lesson be completed at all?  (flow bugs)
node tools/autoplay.mjs Telugu --strict  # ...by a learner who only says what it was taught?  (content gaps)
```

`gap-check` is cumulative and order-aware, and splits its findings by what the
fix is: **out of order** (the word exists, a later lesson teaches it — move it)
versus **never taught** (it has to be written). Those are very different jobs and
reporting them together hides which one you have.

`autoplay`'s two modes separate flow from content. A failure in `ideal` mode is a
broken lesson — a stage that will not advance, a drill index off the end. A
failure in `--strict` mode is an unteachable one.

## Playing a lesson by hand

```
node tools/lesson-sim.mjs --notes   --lang Telugu --scenario 7   # your notebook from lessons 1-6
node tools/lesson-sim.mjs --session me --reset --lang Telugu --scenario 7
node tools/lesson-sim.mjs --session me --say "Okati"
node tools/lesson-sim.mjs --session me --status
node tools/lesson-sim.mjs --session me --transcript
```

This runs the real `lessonEngine.js` against the real curriculum, so the replies
are the ones a learner actually gets. `--session` keeps play-throughs apart, so
several testers can be mid-lesson at once. Steps 12-15 go through the model; with
`OPENAI_API_KEY` in `backend/.env` that happens for real, otherwise those turns
are marked as not simulated.

## Running a round with simulated learners

A model playing a beginner is useful because it will report confusion in the
first person, ask the questions a real learner asks, and say "I don't know" when
the course asks for something it never taught. Three things make the difference
between a useful report and a worthless one:

1. **Forbid reading the repo.** The curriculum file contains every answer.
2. **Forbid using knowledge from outside the transcript**, and say a checker will
   verify it. Then actually run the checker:
   ```
   node tools/leak-check.mjs --chain .lesson-sim/r3c7.json .lesson-sim/r3c8.json
   ```
   It flags any word this course teaches that appears in a learner turn before
   the course had shown it. `--chain` treats the files as one learner in order.
   Surviving flags still need reading rather than trusting — a tester who says
   "copying the -ali from cheyali, is it thinali? pure guess" has reasoned to a
   real form from taught parts, which is what a learner does. That is a finding
   about the course, not misconduct.
3. **Ask for the report in the first person**, as a person telling a friend how
   the lesson went. Asked for a bug list you get a bug list; asked how it felt you
   find out that the lesson punished them for asking a question, which is what
   actually mattered.

Give each learner the notebook (`--notes`) for the lesson they start at, or they
will report words as untaught that were taught six lessons earlier.

## Test the channel the learner actually uses

The app is voice-first. `Chat.jsx` synthesises speech from the messages it is
about to display, and for a long time it filtered them to `role: 'assistant'` —
so every 💡 grammar note and 🎓 banner was printed and never spoken. Eleven
rounds of playtesting missed it, because a transcript renders a spoken line and a
silent one identically and a reader takes them in equally.

`lesson-sim` now marks the channel:

```
🔊 Tutor: Perfect!
👁  On screen: 💡 *Bagunnanu* is two pieces joined: *baga* ("well") plus ...
🔊 Spoken:    Bagunnanu is two pieces joined: baga ("well") plus unnanu ...
🔊 Tutor: Ask 'How are you?'.
```

Tell testers to **judge by ear** — that screen text is something they glance at
perhaps one line in three, the way you glance at a phone while walking. Then ask
whether they understood *why* an answer was right from the audio alone, and
whether hearing an explanation let them get a later answer right. Those two
questions are what a language app is for, and neither is visible in a plain
transcript.

The general lesson is worth keeping: **check what the product actually delivers to
the user, not what the code produces.** Everything upstream of that can be
correct while the learner receives none of it.

## Do not patch mid-round

Several round-2 findings turned out to be artefacts of fixes landing while
testers were playing — one reported an inconsistency between lesson 1 and lesson 2
that was really a feature appearing between them. Freeze the tree, run the round,
then fix.

## What each round found

See `harness-notes.md`. Briefly:

- **Round 1** — the tutor states an answer, the grader marks that exact answer
  wrong. Eleven instances, every stuck point in two of four reports. Cause: the
  model is handed the target and told to reveal no part of it, then asked to help
  someone who has said "I don't know". It fabricates.
- **Round 2** — same symptom, second cause, found by a tester: appending an
  English question to a correct answer failed the grader, because whole-string
  similarity collapses against a short target while coverage stays at 1.0. Two
  testers changed their behaviour because of it; one stopped asking questions.
  Also: the app carried its own copy of the matcher, so engine fixes were not
  reaching learners at all.
- **Round 3** — run against a frozen tree; see `round3/`.
