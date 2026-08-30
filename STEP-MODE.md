# Step mode

An alternative delivery surface for the same course: instead of one chat thread,
a lesson is walked one screen at a time. Added to test whether the format
teaches better. **Chat.jsx is untouched** — both surfaces are live and the
learner switches between them.

## What it is not

It does not invent content, and it does not re-implement grading. The words,
`phonetic` readings, `alt` spellings, `acceptable` answers and `grammarNote`s
all come from `curriculum.js`, and every accepted/rejected decision goes through
`lessonEngine.scoreAnswer`. A step screen is a different way of *presenting* a
turn the engine already defines.

## The cycle, unchanged

Same 15 steps Chat.jsx walks — 5 teach · 3 review · 3 phrase · 4 conversation.
`stepPlan.js` lays that out declaratively; `Steps.jsx` renders it.

| Steps | Screen | Expected answer |
|---|---|---|
| 1–5 | The word(s), phonetic, meaning, `teach` note | `expectedForTeachStep` + `teachStepVariants` |
| 6–8 | Review, from the SRS due queue | the word + its `alt` spellings |
| 9–11 | `phrases[]` | `correct` + `acceptable` |
| 12–15 | `conversations[]` | `correct` + `acceptable` |

Rules carried over from the playtests, deliberately:

- A teach step showing two words asks for **both** — `expectedForTeachStep`, not
  the last bold span.
- Accepted-but-misspelled still gets `spellingNote`, so nobody learns the wrong
  spelling in silence.
- Two misses reveals the answer and moves on (`REVIEW_RETRY_LIMIT`). Nothing
  traps a learner on a screen.
- A cleared step posts `/api/progress/increment`, the same counter the chat
  advances — so a lesson done in steps leaves the learner exactly where the chat
  would have, and `?scenario=` resolves from it when the URL doesn't say.

## The reward layer

The first version of these screens graded correctly and said almost nothing
about it. A right answer produced the word "Correct." in a green bar; a wrong
one produced "Not quite — one more try" and no indication of what had been
wrong, on a surface where `lessonEngine.explainMiss` — the diagnosis chat has
used since round 3 — was sitting unused. Fifteen screens of that is a form to
fill in, not a lesson.

So a right answer is now three things, each doing a different job:

| | |
|---|---|
| the target, set large and spoken back | you produced this — hear it |
| a verdict | you were right |
| **a clause naming what you just did** | and here is why that mattered |

The third is the one worth defending in review. "Perfect!" is a sticker.
"A whole sentence — three words of Telugu" is a fact about the learner that was
not true five minutes ago, and it is why the screen is worth reading rather than
clicking past. Review screens get the version of it that lands hardest: *Still
there, from an earlier lesson.*

Around that: a chime that climbs a step of the scale for each answer in the
streak, a confetti burst, a flame that counts consecutive **clean** answers, and
paws — points, lesson-local and labelled as such, because there is no server
counter behind them and a lifetime score the backend cannot keep is a lie the
next session exposes. A streak milestone (3, 5, 8, 12) drops a banner and a
bigger burst. All of it is off under `prefers-reduced-motion`, and the sound has
a switch in the lesson header (`linguapaws_fx`).

### A miss

The most fragile moment in the lesson is the one where people quit, so:

- **No red anywhere.** Amber, on the input and the feedback, because the learner
  has another try and the screen should look like they do.
- **`explainMiss` runs.** "All the right words — the order is not." beats "Not
  quite" by the width of the room.
- **The hint opens itself.** A learner who has just missed has earned it without
  having to ask for it.
- When the engine cannot diagnose and the drill carries no hint,
  `praise.scaffoldFor` gives the *shape* of the answer — how many words, what
  the first one starts with. Enough to start writing, never enough to copy.
- **The second miss hands the answer over and invites them to type it once.**
  Locked in, worth 2 paws. A screen that ends in failure teaches the failure;
  this one ends on an action the learner completed.
- The next clean answer is met with **Back on it.**

The streak resets on the *first* miss, not at the end of the screen — a streak
that survives a miss and only dies on a full reveal is a streak nobody can lose,
and a counter nobody can lose is not worth having.

### The summary

Graded on first-try answers, not on completion — everybody completes, and a
screen that congratulates you for pressing Continue fifteen times is
congratulating you for nothing. It carries the first-try ring, paws, best
streak, and **You can say this now**: the actual sentences the learner produced,
with audio. That list is the artefact of the lesson; the score is not.

### Checked, not just eyeballed

`node tools/reward-check.mjs` walks all 1,215 screens of all ten languages and
fails if any one of them has no verdict, nothing to say about what the learner
did, or nothing to offer on a miss. It found five single-word drills celebrating
with an empty string.

## Switching

`How you learn` is the first card on Home — `Step by step ⇄ Chat`, stored in
`linguapaws_learn_mode`. The lesson summary also offers *Practise this scenario
in chat*. Picking a character always means chat: step mode has no tutor persona.

## Preview harness (dev only)

The app is behind Google sign-in and a live backend, so the screens are hard to
look at while iterating. `npx vite` → `/preview.html` mounts the real `Steps`
page with a language seeded and every API call failing harmlessly (review slots
fall back to current-lesson vocabulary).

The harness computes the run's expected answers from the same
`buildLessonSteps` the page uses, so it can drive the screens to states that
cannot be reached by clicking alone.

- `?lang=Telugu&scenario=0` — a lesson
- `?step=N` — clicks through to screen N, answering wrongly
- `?win=N` — plays correctly to screen N and clears it: the celebration
- `?miss=N` / `?reveal=N` — one wrong answer there, or two
- `?recover=N` — wrong once, then right
- `?lock=N` — wrong twice, then types the revealed answer back
- `?bounce=N` — misses screen N, clears it, then clears N+1: the recovery line
- `?type=<answer>` — types an answer on the screen it lands on and checks it
- `?screen=toggle&mode=steps|chat` — the mode switch

Not part of `npm run build`; vite only builds `index.html`.

## Not done yet

- **Text input only.** The chat's voice path (`useAudioRecorder` + Whisper) is
  not wired into step screens.
- **Paws and streaks end with the lesson.** They are honest about that on the
  summary. Carrying them across lessons needs a server counter that does not
  exist yet — `/api/progress` tracks successful repeats and nothing else.
- **Audio is browser TTS**, not the app's own voice — `speechSynthesis` with the
  language code, which is absent for some Indian languages on some machines.
- **No chat → steps control inside Chat.jsx**, because that file had uncommitted
  work in it and I left it alone. Switching mid-chat means going Home first.
