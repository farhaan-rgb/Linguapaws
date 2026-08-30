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

## Answering out loud

The rest of the app is voice-first and this surface was not, so `Type ⇄ Speak`
sits above the answer box, remembered in `linguapaws_answer_mode`. Speak mode
mounts the microphone **above** the text box, not instead of it — the box is
present in every state, including every state where the mic has failed, because
a learner who cannot get a microphone working must never be stuck on a screen.

The path is chat's, reused: `useAudioRecorder` → `aiService.transcribeAudio`.
Two differences that matter here.

- **A step knows its own answer,** so `targetText` is `step.expected` rather
  than a phrase scraped out of the tutor's last message. The backend snaps a
  phonetically close reading onto the spelling the course actually uses.
- **The transcript is not checked for the learner.** It lands in the box, still
  editable, and they press Check. A mis-hearing must not be able to spend one of
  the two tries the screen allows — the streak dies on the first miss, and one
  lost to Whisper is a miss the learner did not make.

One recorder for the whole lesson, not one per screen: a hook per step would
open a `MediaStream` on each screen and drop it on the next, leaving the
browser's recording light on behind the learner. The stream is released the
moment a recording stops, and again when the lesson unmounts.

Every way it goes wrong has a line and a way forward — no microphone, blocked
permission, offline, nothing recorded, transcription failed, a language nothing
in the stack can transcribe, and a transcript in a script the romanisation table
cannot spell out. All amber, all in `praise.voiceTrouble`. The ones that mean
speaking is not going to work here put the cursor in the box and stop the
placeholder offering a microphone that will not answer.

### A rejected recording does not empty the box

`voiceTrouble` takes `hasAnswer`, and the line is built at **render** rather than
stored on the voice state, because whether there is an answer standing changes
under the learner's fingers.

This is a bug that was live: a Kannada learner had `Namaste` in the box — a
listed `alt` for `Namaskara`, which `scoreAnswer` accepts — sitting underneath an
amber note about a *different*, discarded transcript, telling them to say it
again or type it. Pressing Check would have passed. A message written for an
empty box was being shown to somebody holding a right answer, and it read as
*this is your problem to solve*.

So: a discarded recording leaves the box exactly as it was, and the note says so
— it names the standing answer and points at the button that would settle the
screen, by that button's own label (`Check` under the box, `Lock it in` inside
the revealed panel). Emptying the box on a new recording was the other candidate
and it is worse in every branch: a successful retry overwrites the text anyway,
and a failed one — the entire reason this comes up — would have destroyed
something the learner had, which in the reported case was an accepted answer.
Tapping the mic is an offer to replace an answer, not an instruction to bin one.

Because the line is computed at render it also tracks typing: "nothing came
through, or type it" turns into "your answer below still stands — tap Check" the
moment there is something to stand on.

## Hear it, then say it

A teaching screen speaks its word on arrival, unasked — the listen-and-repeat
loop, at the one moment the learner has nothing else to do. On the sound switch,
like everything else. **This is the whole of listen-first on a teach screen.**

The word itself is never hidden. It used to be, in speak mode, behind a *Show the
spelling* tap, and that was wrong for three reasons:

- **A teach screen is first exposure.** Its job is to introduce a word, the
  course is written in romanised Latin, and the sound-to-spelling mapping is a
  large part of what is being taught. Masking the word and its phonetic at the
  moment of introduction leaves "Hello" and an audio clip, which is not a lesson.
- **Masking is a recall aid, and this is not a recall moment.** "Say it without
  looking" already has a home: the review screens at steps 6–8 prompt with the
  meaning and never show the word at all. The mask was running that drill three
  screens early, at the one moment it cost teaching.
- **It contradicted itself.** The unmasking condition covered only the device
  troubles, so on a `script`, `empty` or `failed` transcript the word stayed
  blurred while the note underneath said "or type it". Whatever else changes,
  this rule holds: **never offer typing as the fallback while the word to be
  typed is hidden.**

The meaning stays visible, as it always did: you should know what you are
producing.

## One key

Enter checks an answer, and Enter moves on once the screen has settled. The
second half needs a `keydown` listener on the document rather than the input's
own handler, because a settled screen *replaces* the box with the panel and
there is no mounted input left to receive the keypress. (Before that it was
replaced by `disabled`, which does not deliver key events either — so Enter had
never advanced this surface.) Guards, all of which cost a screen if missing: a
focused button already turns Enter into a click and must not be handled twice;
the revealed panel's own box owns Enter, where it locks in; and 500ms after a
screen settles, so a fast double-press cannot spend the celebration unread.

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
- `?answer=speak|type` — which answer mode the lesson opens in
- `?voice=listening|heard|native|denied|none|offline|script|failed|empty` — the
  voice states, with `getUserMedia`, `MediaRecorder` and `transcribeAudio`
  stubbed so the real page code runs against them. `native` returns the target's
  own script and is the ordinary Indic case; `script` returns Urdu's Arabic,
  which is what is left of the unromanisable one.
- `?type=…` — puts an answer in the box after the other drivers finish and
  **before** the microphone driver, so `?voice=script&type=Namaste` reproduces
  the report: a right answer standing when a recording is rejected. There is no
  other way in — the only ways text reaches that box are typing and being heard.
- `?enter=N` — plays N screens with **no clicks at all**: type, Enter, Enter
- `?press=N` — taps Enter N times once the other drivers finish, e.g.
  `?lock=9&press=1` locks the revealed answer in and moves on without Continue
- `?screen=toggle&mode=steps|chat` — the mode switch

Not part of `npm run build`; vite only builds `index.html`.

## Not done yet

- **No pronunciation feedback.** A spoken answer is transcribed and then graded
  as text, so *how* it was said is not assessed —
  `POST /api/ai/pronunciation` exists and is not called from here.
- **Paws and streaks end with the lesson.** They are honest about that on the
  summary. Carrying them across lessons needs a server counter that does not
  exist yet — `/api/progress` tracks successful repeats and nothing else.
- **Audio is browser TTS**, not the app's own voice — `speechSynthesis` with the
  language code, which is absent for some Indian languages on some machines.
- **No chat → steps control inside Chat.jsx**, because that file had uncommitted
  work in it and I left it alone. Switching mid-chat means going Home first.
