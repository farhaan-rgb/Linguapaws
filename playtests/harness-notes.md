# Playtest harness — fidelity fixes and my own findings

The point of the harness is that a simulated learner's complaints are the app's
fault, not the harness's. Three things had to be fixed before round 1's reports
could be trusted.

## Harness fidelity fixes (tools/lesson-sim.mjs, src/services/lessonEngine.js)

1. **`--session <name>`** — state was a single file, so two testers mid-lesson
   overwrote each other. Sessions get their own file under `.lesson-sim/`.

2. **`--notes --lang X --scenario N`** — prints the vocabulary from lessons
   1..N-1. Dropping a tester straight into lesson 12 with an empty head produced
   complaints about words that *were* taught, six lessons earlier.

3. **Teach-stage help hatch** — the harness graded "I don't know" as a wrong
   answer during vocabulary and re-presented the same word forever, with no
   escape. The app does not do this: `Chat.jsx` has a `teachIsQuestion` branch
   that routes help requests to the model. `HELP_WORDS`/`isHelpRequest` moved
   into `lessonEngine.js` so both sides share one list, and the harness grew the
   matching branch. **This was a harness bug, not a course bug** — worth stating
   plainly, because an infinite loop on "I don't know" is otherwise the headline
   finding of every report.

4. **Level-appropriate system prompt** — `Chat.jsx` picks the level from the
   step (`zero` for vocabulary and review, `basic` for sentence building,
   `conversational` after). The harness sent `conversational` at every step. The
   levels differ on exactly what a beginner notices: `zero` says "100% of your
   dialogue must be in English", `conversational` does not. So a learner on their
   very first word was answered in fluent Telugu — `ante`, `cheppandi`, `Meeru`,
   none of them taught — and the transcript blamed the course. Fixed: the
   harness now derives the level from the step the way the app does.

## New tool: `tools/gap-check.mjs`

`CURRICULUM-GAPS.md` checks each lesson against its own vocabulary only, so it
reports words as untaught that an earlier lesson taught — it flags `illu` as
missing in L7 when L3 teaches it. `gap-check.mjs` is cumulative and order-aware:
at lesson N the learner knows every word and every `alt` spelling from lessons
1..N. It also scores the EASIEST accepted answer, not the canonical one, since
that is all the learner has to produce.

Telugu result: **70 blocked drills** (vs. 28 claimed, differently composed).

## New tool: `tools/leak-check.mjs`

A model playing a beginner knows Telugu perfectly well, so its ignorance has to
be verified rather than trusted. Walks a transcript in order and flags any
non-English token in a learner turn that no earlier tutor turn had shown. Run it
on every playtest before reading the report.

## My own findings before the learners reported

### F1. The verb "to be" is demanded from L7 and never taught (severity: high)

The single largest hole. `undi`, `unnanu`, `unnaru`, `unnara`, `unnaya`,
`untanu`, `bagundi` and the intensifier `chala` are between them required by
**26 drills** and appear in no lesson's vocabulary. L1 does teach `Bagunnanu`
and its grammar note explains `baga` + `unnanu`, but `unnanu` is never a
vocabulary item, so nothing carries it forward and the review quiz never asks
for it.

### F2. L1 drills a word L1 does not teach

`Ask 'How are you?'` has `correct: "Meeru ela unnaru"`. `unnaru` is not in L1's
vocabulary. The learner is saved only because `acceptable` includes `meeru ela` —
but on a miss the tutor reveals the canonical answer, showing a word it never
taught. Same shape in L16 (`Mee snehithudu ela unnaru?`) and L26.

### F3. Imperatives are demanded from a bare stem

L3 teaches `Vellu` = "Go" and then asks for `Akkada vellandi`. `vellandi` (and
later `cheyandi`, `theeskondi`, `vellandi` again in L16/L21) is the polite
imperative — a different form, never taught, and not derivable from `vellu` by
anything the course has said. `vellandi` alone blocks 4 drills.

### F4. Tense is asserted, not taught

L12 teaches time *adverbs* (`ninna`, `repu`, `eeroju`) and then asks for
`chesanu`, `chestanu`, `thinnanu`, `velthunnara` — the past/present/future verb
forms themselves. The lesson's own vocabulary contains none of them. A learner
who finishes L12 cannot put any *new* verb into the past tense, which is the
entire point of a tense lesson.

### F5. Several prompts hand the learner the answer

`Say 'Many books' (Chala pusthakalu)`, `Say 'Hundred rupees' (Vanda rupayalu)`,
`Tell Miko 'I have one sister' (using Naaku oka akka undi)`. The bracketed answer
is how the untaught word gets smuggled in. It converts a drill into a copying
exercise and hides the gap from anyone reading the lesson.

---

# Round 1 → fixes applied

## The root cause behind most of the pain

All four testers' worst moments were the same event: **the tutor stated an answer
and the grader marked that exact answer wrong.** Eleven instances across the four
reports, and every stuck point in two of them.

- "Ninna + nenu + **chesa**" — the answer was `chesanu`
- "the correct form is **Repu okati ganta**" — it was `Repu oka ganta`
- "the plural of Illu is **Illulu**" — not a word; invented on the spot, then
  doubled down on when challenged
- "the answer is **Ela chestanu**" — it was `Ela cheyali`
- told to add **mariyu** for "and", then told by the grammar note that the
  natural sentence has no "and" in it

The cause is the instruction, not the model. `Chat.jsx` hands the model the
target answer and then says *"Do NOT reveal ANY part of the translation — not
even as an example, tip, or 'native touch'"*, and then a learner says "I don't
know". Satisfying both at once is impossible, so the model improvises something
that looks like help and is wrong. Tightening the prohibition produces more
fabrication, not less.

**Fix** — `antiFabricationRule()` in `lessonEngine.js`, used by both the app and
the harness. It inverts the rule: the model may not invent. It may write no
target-language word that is not either in the target string or on the learner's
taught list; if it refers to the answer it must quote it character for character;
withholding is expressed as saying nothing, never as substituting. Plus
`fabricatedForms()`, which checks the reply before it is shown — a token 1-3
edits from a real word while sharing its opening is an invented inflection, and
the harness retries once, then falls back to its templated line rather than
display it.

Two turns competing for one answer was the other structural complaint (three of
four testers). `ONE_QUESTION_RULE` tells the model not to ask anything of its
own, since a templated instruction follows it.

## Curriculum fixes

`gap-check` count of drills whose easiest accepted answer needs an untaught word:

| | before | after |
|---|---|---|
| Blocked drills | 70 | **0** |
| — of which out of order | 14 | 0 |
| — of which never taught | 56 | 0 |
| Unseen ending on a taught stem | 11 | **0** |
| Lessons completable, ideal learner | 28/30 | **30/30** |
| Lessons completable, learner who only says what it was taught | — | **30/30** |

What actually changed:

- **The verb "to be" is now taught.** It was demanded by 26 drills and appeared
  in no lesson's vocabulary. `Unnaru` (L1), `Undi` (L3), `Unnanu` (L11),
  `Bagundi` (L9), `Unnara` (L26) — each placed in the lesson where it is first
  needed and where it fits the topic. `Naaku` (L5) with it, since Telugu has no
  verb "to have" and every "I have" sentence in the course routes through the
  dative.
- **`Chala`** (many/very) — 8 drills, taught nowhere, now L8.
- **L7 and L8 were the wrong way round.** L7 (Numbers) drilled `snehithulu` and
  `pusthakalu`, the plurals L8 teaches. Numbers alone now stay in L7; numbers
  with plurals moved to L8, which also gained the third sentence drill every
  other lesson has and lost `Illu` — its plural is invisible in this
  romanisation, which is what let the tutor invent "Illulu".
- **`Vellandi`** was taught in L28 and demanded in L3, L16 and L21. It is now a
  form of the `Vellu` L3 already teaches, with either accepted.
- **L12 was an exam for L13 and L14** — the time lesson demanded the past and
  future forms those lessons teach. Retargeted onto the present continuous the
  learner has; the tense lessons now reuse L12's time words rather than the
  reverse.
- **The two productive endings are taught where first needed**: `-ki` (L3, so
  `intiki` and `paniki` are derivable) and `-ga` (L16, so `santhoshamga` and the
  L26 feelings are).
- **Answers stopped being handed over in prompt brackets** — "Say 'Many books'
  (Chala pusthakalu)", "(Vanda rupayalu)", "(using Naaku oka akka undi)" and five
  more. That bracket was how every untaught word got smuggled past a reader.
- **94 pronunciation guides rewritten.** L11-L30 used the old scheme, which wrote
  "nah" for both short and long a and "noo" for a short u — `Chesanu` was hinted
  `cheh-sah-noo` when it is chay-saa-nu. Every tester's typos traced to a hint
  that disagreed with the spelling they had to type. One scheme now covers all 30.
- **Forgiven typos now show the spelling.** `Bagunanu` and `Ikada` were accepted
  with a bare "Good." and testers left believing their spelling was correct.
  `spellingNote()` appends "It is spelled **X**." when the accepted answer was
  not exact, and nothing when it was.

## Known, not addressed

- **No Telugu script anywhere.** One tester: "I've learned ten words in a
  spelling system that doesn't exist." Real, and a product decision rather than a
  content fix.
- **Odiya (60 blocked drills), Hindi (26), Kannada (1)** have the same class of
  gaps. Untouched — this pass was Telugu only. `gap-check.mjs` covers them.

---

# Round 2 → fixes applied

Round 2 confirmed the curriculum work held: no tester hit an untaught word, all
eight lessons completed, and lesson 12 — an exam for lessons 13 and 14 in round 1
— drew "genuinely fixed, cleanly". But three of four testers reported the *same*
symptom as round 1 in a new form, and one of them found the mechanism.

## The real cause of "you said correct, then marked me wrong"

Round 1 diagnosed this as the model fabricating an answer. That was one cause and
it is fixed — no invented words in round 2. But the contradiction kept happening,
and the round-2 tester on lessons 7-8 identified the trigger exactly:

> Attaching any English commentary to a correct Telugu answer fails the grader.
> Resubmitting the identical Telugu bare passes instantly. So the lesson actively
> punishes asking questions — I stopped asking mid-lesson-8 because of it.

That is a matcher bug, not a model bug. `Ee kurchilu oddu. Why is it ee and not
idhi?` has **coverage 1.000** — every required word present — and **ratio 0.381**,
because the whole-string Levenshtein is measured against a three-word target. So
the grader rejected it while the model, reading the same answer, called it
correct. Both halves of the contradiction, from one line of arithmetic.

Two testers independently changed their behaviour because of it: one stopped
asking questions, one only escaped by typing the hint verbatim. It is the single
most damaging bug found in either round.

**Fixed** — `bestWindowRatio` in `lessonEngine.js` measures similarity against
the best-fitting stretch of what the learner said rather than the whole
utterance. Coverage still decides whether the required words are present; the
person-ending guard still decides whether they are the right words. Extra
commentary simply stops counting as evidence against them.

## Three more matcher faults, all found by testers

- **Vowel-length typos were rejected while consonant typos passed.** `Mudu` for
  *Moodu* costs two edits and scored 0.6; the rescue rule for single-vs-double
  vowels was gated at 0.8, so it never fired. `snehitulu` for *snehithulu* costs
  one and passed. That asymmetry is the "typo handling is inconsistent" three
  testers reported — and it is the course's own fault twice over, since its
  pronunciation hints spell long vowels as doubled letters. `vowelSkeleton` /
  `isSpellingSlip` now forgive vowel length in both the ratio and the coverage
  check, and the 0.8 gate is gone. The person-ending guard is untouched:
  `bagunnaru` for *bagunnanu* still fails, correctly.
- **Two different taught verbs were treated as typos of each other.**
  `Nenu adhi chusanu` ("I saw that") was accepted for a target of `Nenu ninna
  adhi chesanu` ("I did that yesterday") — one edit apart, both real words the
  course teaches. `buildRealWordSet` now refuses the fuzzy match when both
  spellings are real course words, the same principle as the person-ending guard.
- **A required word could be dropped from any four-word target.** `Nenu ippudu
  velthunnanu` passed for `Nenu ippudu intiki velthunnanu` at exactly 0.75,
  against a flat floor of 0.7. Nothing may be missing now unless the target runs
  to five words or more, where one omission is forgiven. Shorter-answer-accepted
  cases across the course dropped from 8 to 2, and both survivors are the
  intended dropped-pronoun form.
- **Telugu's optional subject pronoun.** A lesson 22 note says outright that the
  "I" is inside the verb ending, and the drill then rejected the bare
  *Cheyalenu* the tutor had just taught. Rather than adding an `acceptable` entry
  to a hundred drills, `scoreAnswer` generates the dropped-pronoun variant.

## The app had its own copy of the matcher

`Chat.jsx` carried private duplicates of the synonym map, the person-ending
guard, `tokenCoverage` and the scoring — roughly 90 lines shadowing
`lessonEngine.js`. That is exactly the drift the engine file was extracted to
prevent, and it meant **every fix above would have landed in the harness and
never reached a learner.** The duplicates are deleted; the page now calls
`engine.scoreAnswer` and takes its `accepted` verdict, so the harness and the app
grade identically by construction.

## Turn-level fixes

- **Two live instructions per turn** — reported by three testers in round 1 and
  all four in round 2, so the instruction not to ask a question was plainly not
  enough. `stripQuestions` now removes the model's interrogative sentences
  deterministically; if that empties the reply, the templated instruction stands
  alone.
- **Premature reveals.** Typing "ok" got the answer printed and the learner was
  then scored on producing it. The engine already reveals on the second miss, so
  a model reply that reveals earlier is dropped.
- **Internal text reaching learners** — `[conversation step — not simulated]` and
  a literal `null` (from appending a drill prompt past the end of a lesson). Both
  fixed; a miss past the last drill now says the scenario is done.
- **The notebook now lists alt forms.** A tester was told the polite `-andi`
  ending came from lesson 3 and could not find it in their notes, because
  `--notes` printed only headwords.

## Content contradictions testers caught

- **Lessons 7 and 8 disagreed about numbers and plurals, and lesson 7 was
  wrong.** Its note claimed a noun stays unchanged after a numeral. Telugu takes
  the plural after any number above one — *rendu snehithulu*, *moodu
  pusthakalu*; the example that made it look otherwise (*aidhu illu*) only did so
  because `illu` romanises the same in both numbers. The false note is gone, the
  drill with it, and lesson 8 now states the rule plainly, with *oka* as the one
  exception.
- **`undi` vs `unnaru` was framed as things vs people**, which made lesson 7's
  *naaku oka akka undi* wrong by lesson 8's own rule. It is singular vs plural;
  both lessons now say so and cross-reference each other.
- **Lesson 26 graded the `-ga` ending before teaching it** — the grammar note
  fired only after the learner had failed. It is now on the vocabulary items,
  which are presented first. And "every feeling word takes -ga" was contradicted
  by the very next drill's bare `Naaku badha ledu`; all three sentence frames are
  now named, with why the negative keeps the bare noun.
- **One gloss per word.** `Santhosham` was taught as "happiness" and quizzed as
  "Happy"; `Bhayam` was "Fear" and "Scared/Fear"; `Adhi` was "That" and
  "That/Um". Each now has one meaning, except `Adhi`, whose second entry is
  explicitly its second job as a filler.

## A note on method: do not patch mid-round

Several round-2 findings were artefacts of my own edits landing while testers
were playing — the spelling-correction feature appeared between one tester's
lesson 1 and their lesson 2, which they correctly reported as an inconsistency
between lessons. Round 3 was run against a frozen tree.

---

# Round 3 → fixes applied

Run against a frozen tree. The two round-2 headline bugs were confirmed dead by
all three testers — no invented words, and no "correct answer marked wrong" on
six deliberate attempts. Lessons 7 and 8 were called "resolved" on the plurals
contradiction. But all three testers independently reported the same two things,
and between them they had asked **seventeen questions and received zero
answers.**

## Learner questions went nowhere — and I had caused it

> "Five asked, zero answered in-lesson. Bundled onto a correct answer they're
> silently discarded (credit given, question vanishes). Asked alone mid-lesson:
> 'I will come back to that.' — it never does."

Three causes, two of them mine from round 2:

1. **The reveal guard was eating the answers.** Round 2 added a rule that a model
   reply revealing the target before the second miss is dropped, so the drill
   does not become copying. But a question *about* a word is normally answered by
   naming the word — so the guard silently discarded exactly the replies that
   answered questions. Now scoped: it applies to a plain wrong answer, never when
   the learner asked something.
2. **`!ok` skipped the question branch.** Round 2 guarded the question paths on
   "the answer wasn't correct", to stop a correct answer being misread as a cry
   for help. Correct as far as it went — but a learner who answers correctly *and*
   asks now got the credit and no answer. `answerAside` runs alongside the
   advance, so they get both.
3. **"Say you will come back to it" was being used for everything.** The
   anti-fabrication rule offered that as the escape hatch when unsure of a *form*.
   The model took it as the general-purpose way to handle any question. The clause
   is now scoped to target-language forms, with an explicit instruction that
   deferring is never the right response to a question.

## Explanations arrived after the grading that needed them

All three testers, in almost the same words. A `grammarNote` was only ever shown
on success, so a learner graded on a pattern met the explanation of it one turn
*after* being marked wrong:

> "`Say 'Two friends'` with no rule given; I applied lesson 7's pattern, got 'Not
> quite. Hint: Two + friends.'"

> "I used `alupuga` correctly and still failed on `Nenu alupuga unnanu`; the
> three-frame note appeared only after. The bug has moved, not gone."

The note is now shown on the FIRST miss alongside the hint, and the patterns that
whole lessons turn on moved out of drill notes and onto the vocabulary items,
which are presented before any drill: the plural rule onto `Lu`, the `-ga` ending
onto the lesson-26 feelings.

## The tutor invented grammar when asked

> Lesson: "*Idhi* stands alone… but *Ee pusthakam* is 'this book'".
> Post-lesson answer: "Idhi is used for something that is a bit farther away,
> while Ee is for something very close."

Recast as distance — wrong, contradicting the lesson's own gloss, and colliding
with what `Adhi` means. A learner with only that answer walks away with wrong
Telugu. `lessonExplanations()` now hands the lesson's own authored `teach` lines
and grammar notes to the model as the authority, with instructions to explain
from them and never invent a different reason. Asked the same question now, it
answers with the lesson's actual distinction.

## Everything else round 3 found

- **The grader looked arbitrary about the optional pronoun.** `Eeroju cheyalenu`
  was rejected on the same lesson where `Ippudu idhi cheyalenu` passed, because
  the dropped-pronoun variant was only generated when the pronoun came *first* —
  and a time word often leads. Dropped from any position now.
- **"It is spelled X" fired on correctly spelled words.** Attaching an English
  question made the whole utterance differ from the target, so the check reported
  a misspelling that was not there. It now looks for the target intact anywhere in
  what the learner said. It also only fired at the vocabulary stage; the sentence
  stages have it now too.
- **A false rule about plurals.** "It works the same on the other nouns you know:
  *kurchi* to *kurchilu*, *guruvu* to *guruvulu*" — but *pusthakam* loses its
  `-am`. A tester asked about exactly this twice, was told their observation was
  wrong, and left unable to pluralise anything. The three real patterns
  (vowel-ending takes `-lu`; `-am` becomes `-aalu`; `-udu` becomes `-ulu`) are now
  on the `Lu` item. `Kurchilu` was also referenced against a singular `kurchi` the
  course never taught; it teaches it now.
- **Doubled pronunciation tags.** A step teaching two words emitted two tags each
  with a label inside: `[say it like: Guruvulu: gu-ru-vu-lu]  [say it like:
  Kurchilu: kur-chee-lu]`. One tag now.
- **Model-authored pronunciation guides and scene-setting** in helper replies —
  unverified, and on a doubled step contradicting the real guide beside it.
  Stripped, along with the re-teaching that made the turn read as two
  instructions.
- **`Ee` was taught, summarised, and never drilled.** It has a sentence drill now,
  contrasting `ee pusthakam` with `idhi pusthakam`, which is the distinction
  testers kept asking about. The duplicate name question that occupied the slot
  was already in the conversation stage.
- Assorted content: lesson 7's handoff promised the noun changes after a number
  when its own example does not; "Where are the books?" needs no verb and nobody
  said so; "I can help" is a noun plus "can do" and nobody said so; `unnaru`
  doubles as the respectful "he is" and nobody said so; lesson 26 claimed *all*
  feeling words take `-ga` while its own negation drill does not; the `-ga` frame
  rule said "fixed by the sentence, not the feeling", which names a rule without
  giving it — there is now a default that always works.

## Structural check added

Every lesson in every language is now verified to carry exactly three sentence
drills and four conversation drills, which is what the engine's fifteen steps
allot. Lesson 8 had two sentence drills and the missing one left a content-free
"Let's move on." turn; adding an unused fourth is equally invisible.

---

# Round 4 → fixes applied

Confirmed dead: the fabricated answer, the correct-answer-marked-wrong, the
plurals contradiction, the arbitrary pronoun, `-ga` graded before teaching, the
unusable frame rule. One tester called the "I can help" step "the best step in
either lesson" and derived the sentence unaided; another said they would
continue and that what remained was "cosmetic-to-confusing, not teaching
failures."

Still, three of three testers reported questions being dropped — 4 of 8, 5 of 12,
and 6 of 8 unanswered — so the round-3 fix was incomplete.

## Why questions were still dropped, and it was mine again

`taughtSoFar` built the model's allow-list from vocabulary **headwords only,
without the `alt` forms.** So `santhoshamga` and `alupuga` — forms the lessons
teach and the drills require — looked invented to `fabricatedForms`, the reply
was rejected, the retry produced the same words, and the second rejection
returned nothing. The model was answering; the harness was throwing the answer
away. Alt forms are in the allow-list now.

And when a reply IS rejected, silence is no longer an option: the lesson's own
authored explanation goes out instead.

## The bigger decision: stop paraphrasing grammar

Round 3 handed the lesson's explanations to the model as the authority. Round 4
shows that is not enough — it paraphrases, and paraphrasing grammar goes wrong.
Asked how to pluralise a noun it reproduced the three-branch rule correctly and
attached the wrong example to the wrong branch, offering *pusthakam* as the
vowel-ending case. Asked about `idhi`/`ee` in round 3 it invented distance.

So where the lesson already answers the question, **its own sentence goes out
verbatim and the model is not consulted at all.** `bestExplanationFor` picks the
one relevant note — scored on distinct terms the learner asked about, with a
question that names a word getting that word's own line, and a real grammar note
beating a bare definition on a tie. The model still handles everything the lesson
does not cover, which is what it is good at and where a paraphrase costs nothing.

Testers have praised these notes in every round. They are the best content in the
course; there was never a reason to let them be restated less accurately.

## "Note the spelling" was correcting correct answers

Reported five times, twice, and "always". The note measured against the canonical
sentence, so an optional *nenu* the learner had rightly omitted looked like a
misspelling. Worst case it proposed a different sentence: `Nenu alupuga unnanu`
"is spelled" `Naaku alupuga undi`, one line after being told theirs was also
correct. It now compares against every accepted form including the dropped-pronoun
variants, reports only an actual misspelling, and names the closest form rather
than the canonical one. Two related fixes: the intact-target test is token-based,
so `Unnaraa` no longer passes by "containing" `unnara`; and the wording is "Note
the spelling" rather than "It is spelled", which read as a contradiction stapled
to praise.

## Enforcing English at the beginner levels

`zero` and `basic` both require the whole reply in the learner's own language, and
the model intermittently ignores it — "Katha anedi stories ki, illu anedi houses
ki" to someone asking in English how to pluralise a noun. `fabricatedForms` cannot
see these: they are real Telugu, just not words this course teaches, so nothing
they resemble is on the allow-list.

`speaksForeign` decides on the PROPORTION of unrecognised words rather than a
count. A closed English list always has holes — "greeting" and "anyone" were
missing from the first draft — and every hole is a false rejection if two stray
tokens condemn a reply. English prose scores a few percent unrecognised however
incomplete the list; a sentence in Telugu scores a third or more. It errs toward
rejecting, because a false positive costs only conversational warmth while a false
negative puts untaught Telugu in front of a beginner.

## Leaks that were the harness, not the course

- **A line ending mid-sentence** — `You were very close! In this case, you would
  say \` . The harness picked the model's reply out of its JSON envelope with a
  regex whose `"(.*?)"` stopped at the first ESCAPED quote. The app uses
  `JSON.parse` and never had this; the harness does now too.
- **A literal `{w}`** on screen. `String.replace` substitutes only the first
  match, and one teach line uses the placeholder twice. Four call sites in the
  engine and four more in the duplicated copies inside `Chat.jsx`.

## The app was still carrying duplicated engine code

`Chat.jsx` had its own `buildTeachingLine` and `buildTeachingStep`, which is why
the placeholder bug existed in four places at once. Collapsed into the engine, as
the matcher was in round 2. **This is the second time duplicated engine code has
turned one bug into four; there is now no second copy of either.**

## Model-invented tasks

A tester was graded "Perfect!" on a turn they never took: the model had set its own
task, and the template's praise for the previous answer landed underneath it.
Another was handed a bonus drill needing a word the lesson had not taught, and a
third got "Next, *Kaavali* is used for 'I want'" welded onto an unrelated answer.
`stripInstructions` now drops imperatives addressed to the learner and volunteered
vocabulary, alongside the questions and re-teaching it already removed.

## Content

Lesson 7 answered a question with "*rendu pusthakam* for 'two books'" and then
contradicted itself four steps later — the plural rule is now in lesson 7's own
explanations, so there is nothing to reconstruct. The `-am` rule said the ending
is `-aalu` while the word it teaches is written *pusthakalu*; it says `-alu` and
points at the pronunciation guide for the long vowel. `kurchi` was referenced as
a word "you know" and appeared in no word list, notebook or summary. Lesson 26's
frame rule now names the feelings it covers and both exceptions, since a tester
asked which verb went with *kopamga*, was ignored, and was marked wrong four turns
later for guessing.

---

# Round 5 → fixes applied

Six testers, eighteen lessons, fifteen of them never played before. Every lesson
completed. The round found the worst bug of the whole exercise and one honest
pedagogical failure that no static check could have caught.

## An honest "I don't know" was graded correct

A tester on lesson 27 wrote:

> "I can't do this one. I've never been taught a word for 'price' or for 'how
> much' in Telugu. All I have is the numbers and 'rupayalu'. Can you teach me?"

and got **"Exactly!"** and the step.

Tokenising "I've" leaves a `ve`, and `veyi` — the target word — collapses to the
same vowel skeleton as `ve` once `y` counts as a vowel. So the coverage check
found the target word inside an English refusal and scored it 1.000.

This is the worst thing a grader can do. It does not merely mismark an answer; it
teaches the learner that saying "I don't know" is how you pass, and it advances
them through material they have explicitly said they cannot do.

**Fixed** — the shorter of the two words must now be substantial (four
characters) before any fuzzy match applies, and a spelling slip requires
comparable lengths. A two-character fragment is never a misspelling of a
four-character word. **And `matcher-check` now runs ten things a stuck learner
actually writes against every drill in the course; none may ever be accepted.**
All four languages: zero.

## Lessons 13 and 14 did not teach tense

Two testers independently. They hand over four past forms and four future forms
as flashcards and never state a rule:

> "Given a new verb I could only invent an ending and hope. The one pattern I did
> find — past→future inserts a `t` before `-anu` — I worked out myself afterwards
> by lining up lessons 11, 13 and 14."

A tense lesson that leaves you unable to make a tense has not taught tense. The
pattern is now stated on the first word of each lesson, **with its limits**: the
past is stem + `-anu`, the future is that plus a `t`, and the stems really are
irregular (*vellanu*, *thinnanu*, *chusanu* have no derivation from each other),
so the honest instruction is to learn each stem as a word and expect only the
ending to transfer. Saying that plainly is better than a rule that breaks on the
second verb a learner tries, and better than silence.

Also named: the `velthanu`/`velthunnanu` trap, which one tester walked into
deliberately and got a bare "Not quite!" with no hint that they had said the
present tense.

## Questions: 55 asked, 9 answered

Across the six testers. Three causes:

- **Over-stripping.** The filters that remove the model's questions,
  re-teaching, invented tasks and scene-setting could empty a genuinely helpful
  reply, and an empty reply showed nothing. The model was answering. Cleaning is
  now never the reason a learner gets no answer: a reply that survives nothing
  keeps its plainest form.
- **A question graded as a wrong answer.** The conversation stage stamped "Not
  quite" on a question — one tester asked "before I answer, how would I say 'very
  good'?" and was marked wrong for asking. The phrase stage already knew better.
- **An off-syllabus question got silence.** Asked for a word the course has never
  covered, the model was rejected, there was no authored note to fall back on, and
  nothing was shown. It now says so in one line. Silence reads as not having been
  heard; a straight "that has not come up yet, and I will not guess" does not.

**And the retrieval design changed.** Round 4 had the lesson's own sentence go out
verbatim where it addressed the question. Round 5 showed why picking exactly one
note is the wrong target: keyword scoring over ten short paragraphs preferred a
note mentioning "noun" and "plural" to the note that *is* the plural rule, and no
tie-breaking fixed it reliably. The top three candidates now go to the model as
grounding, with instructions to answer from them and contradict none; the
fabrication and foreign-language guards still hold it to the truth, and the
deterministic fallback picks the most substantive candidate rather than the
top-ranked one. Retrieval only has to get the right note into a shortlist.

## Grammar delivered as a spelling correction

Three real rules reached testers labelled "Note the spelling" — the `-ga`
adverbial, the `-ki` dative, and `illu`/`inti` — on answers that were graded
correct. The note measured raw strings, so a learner who had applied a rule looked
like they had mistyped. Alt forms now canonicalise through the curriculum's own
lists before comparing.

The same note was also missing at both stage transitions, so the answer just
before a `🎓` banner got no verdict and no correction at all — every tester who
reached a boundary reported it.

## Other fixes

- **The model's own praise** competed with the template's verdict; one tester's
  plain-English refusal drew "Correct!" from the model with the grader's verdict
  underneath. Stripped — the template owns the verdict.
- **A wrong answer with a question attached lost its verdict entirely.**
  `Naaku dabbulu undi (guessing at the verb...)` returned only "So — Say 'I have
  money'." while the bare answer next turn was properly corrected. Now the
  question is answered *and* the answer graded.
- **Repeated notes** — one tester saw the same note five times in a lesson,
  another twice in a single turn. Deduplicated per session.
- **"Review passed"** was printed when the learner had been let through on the
  retry cap. It says "Moving on — that one will come back later."
- **The merged pronunciation block**, reported in four straight rounds by five
  testers, is one tag per word on its own line.
- **`SIM_DEBUG=1`** reports why a model reply was rejected. The guards are silent
  by design, which made a discarded reply indistinguishable from a model that said
  nothing — and that ambiguity cost a round.

## Content

Lesson 5 demanded the name `Ravi` in a drill that asks you to introduce
*yourself* — it now uses the engine's `[name]` wildcard. "and" was needed in
lessons 10 and 13 and taught in 24, so `Mariyu` moved to 10. Lesson 3 explained
the `-ki` ending and never asked for it; lesson 5 did the same with `naaku`; both
are now drilled. Lesson 15's "Say 'Because I am tired'" was graded against "that's
why I am going". Lesson 19's "Which colour" is answered with the word for "what".
Lesson 20's "Today was good" hinted at `baga` and wanted `bagundi`, and presented
four revision words as new. Lesson 21 graded `Illu lo` correct while its note
called the phrase `inti lo`. Lessons 4 and 19 had no explanations at all.

---

# Round 6 → fixes applied

Two testers, six lessons, all the round-5 findings under test. What round 5 fixed
stayed fixed:

- **The honest "I don't know" is no longer graded correct.** Five deliberate
  attempts between the two testers, including the exact "I've never been taught a
  word for 'price'" shape that broke it; every one was taught and re-asked.
- Lesson 5 accepts your own name. `naaku` is genuinely drilled. Lesson 13 states
  up front that verb stems change unpredictably and "there is no rule" — one
  tester called that "exactly the honest framing needed". Lesson 20 is framed as
  revision with per-word provenance and its hint is right. "Note the spelling"
  produced no false positives. The tutor refused to invent a word for "snow".

## Questions bundled onto a correct answer — 8 of 8 dropped

The remaining half of the question problem, and `SIM_DEBUG` found it in one run:
the reply was being **rejected by the foreign-language guard for the words
"possession", "delicious", "ownership" and "imagine".**

The curated English list was always going to lose this way. It exists because the
engine runs in the browser and cannot read a dictionary — but the harness runs in
Node, which can. The system wordlist is now passed in and consulted first, with
the curated list as the floor covering its gaps ("hang", "using"). The good reply
passes; every real Telugu-leak case from rounds 3, 4 and 5 still fails.

Two smaller holes in the same guard: the contents of pronunciation tags ("pah",
"loo") were counted as foreign words, and a reply too short for a proportion to
mean anything skipped the check entirely — which let a tester's entire tutor turn
be the untranslated `ani adugandi.`

## The stage boundary swallowed every answer that crossed it

Ten out of ten for one tester, "structural, 6+ occurrences" for the other,
including each lesson's final answer. Round 5 added the spelling correction at
those transitions but not the verdict, so an answer still got no acknowledgement
at all. It now gets praise, the spelling note if one applies, and — at the end of
a lesson — an explicit "that's the last one" before the banner.

## Other fixes

- **A note repeated one turn after it first appeared**, three times. The
  deduplication only knew what it had pushed itself, and a lesson's teaching step
  prints the same `teach` text by another route. It now also checks what is
  actually on screen.
- **`Note the spelling: Namaskaram, naa peru [name]`** — the wildcard slot offered
  as a spelling, on an answer that was entirely correct. Suppressed for any target
  containing a slot.
- **Vowel slips graded inconsistently**: `Me` for *Mee* marked wrong while
  `Thinnaanu` was forgiven, and `Santhoshamgaa` marked wrong while `Baaga` passed.
  Two separate causes — the four-character floor added in round 5 to stop "ve"
  standing in for *veyi* also excluded genuinely short words (fixed by requiring
  comparable lengths instead of absolute ones), and canonicalising an `alt`
  spelling to its headword moved the target three characters away from what the
  learner typed (fixed by comparing raw and canonical forms both ways).
- **"Not quite, not quite."** — mine, from round 5. `MISS_MARKER` already reads
  "Not quite".

## Content

- **Lesson 27's price drill was unanswerable.** It asked the learner to ask a
  price with no word for "price" or "how much" anywhere in thirty lessons; the
  tutor correctly refused to invent one, so the only exit was a guess being
  praised. `Entha` ("how much") is now taught, and the drill asks for
  *idhi entha?* — the natural sentence.
- **Lesson 27 contradicted lesson 5 and graded you on it.** `Naaku dabbulu undi`
  — the pattern lesson 5 teaches — was marked wrong in favour of `Naa daggara
  dabbulu`, an idiom taught nowhere. Both are accepted now, and the note explains
  the difference: money that exists for you against money you have on you.
- **`Mariyu` ("and") was cited as "from lesson 10" and was not in lesson 10.** It
  was used in a lesson-10 drill and in a lesson-13 note, but never in any
  lesson's vocabulary, so it appeared in no notebook. Now taught in lesson 10.
- **Lesson 30 was not a finale.** A tester: *"It ends with character-for-character
  the same `✨ Scenario complete` as lessons 20 and 27. It teaches Aakhari,
  'last/final', and never uses it to say goodbye. I finished the course without
  knowing I had."* Rebuilt: `Selavu` ("goodbye") replaces a slot that was spent on
  the word "Telugu"; the drills now reach back to lesson 1's greeting, lesson 5's
  name, lesson 22's "I can speak", lesson 27's money and lesson 28's weather; the
  last thing the course asks for is *Dhanyavaadaalu, selavu*; and lessons can now
  carry a `farewell` line, which the final one does.
- Lesson 10's "Ask for 'Hot water' (Vedi neeru kaavali)" handed over its own
  answer. Lesson 27 taught `Veyi` and never used it, and at seven words crowded
  two teaching steps — "thousand" folded into the "hundred" entry.

---

# Round 7 → fixes applied

Confirmed fixed by the testers who had reported them: lesson 27's price drill
(`Entha` taught seven steps before it is needed), lesson 27 against lesson 5 in
the positive direction, feedback before every banner (12 of 12, twice over),
`mariyu` in the notebook with lesson 13's citation matching, lesson 9's `undi`
now coherent, lesson 13 honest about stems, no false spelling fires, lesson 30
with a real bespoke ending and five cross-lesson callbacks.

## A question that names the answer was graded as the answer

> Tutor: What's the Telugu word for "Happiness"?
> Learner: **Is santhosham a noun or an adjective?**
> Tutor: Great job! → 🎓 Review passed

The word the question asks about is also the answer it was checked against, so
coverage was full and the ratio was perfect. Same family as round 5's "I've"
fragment, and just as damaging: it passes a review the learner never took.

**Fixed** — an utterance whose first word is an interrogative or an auxiliary is
asking, not answering, and is never graded correct whatever it contains. An
answer leads with the answer. `matcher-check` now generates three such questions
per drill from that drill's own answer and requires all of them to be refused.

That check immediately found **two of the same holes in Odiya**, which this pass
has not otherwise touched — recorded in `CURRICULUM-GAPS.md`.

The related case is not a bug: a tester wrote *"Best I can do is 'Idhi naa
aakhari' and stop, which isn't a sentence"* and was marked correct. They did
produce the answer, and a human teacher would say so. What was wrong there was
the objection going unanswered, which is the next item.

## Bare echoes, and silence from my own deduplication

Testers got whole tutor turns reading `Mariyu.`, `Aakhari.`, `Idhi naa aakhari.`
— the model returning the target word and nothing else in answer to a question
about grammar. Now detected and discarded rather than shown.

And when the fallback note had already been given, the deduplication added in
round 6 suppressed it and left nothing at all — seven of eleven questions in one
session got silence for that reason. It now points at the note instead.

## A word shown and never practised

Reported on lessons 1, 5, 9, 10, 19 and 27 across five rounds: a teaching step
that shows two words asks for only the last, so the other is displayed, never
practised, and then quizzed in the memory check — with the banner claiming six
words when five had been elicited. The step now asks for both, and the matcher
accepts either or both.

## An alt/headword cycle of my own making

Lesson 16 taught `Santhosham` with `santhoshamga` as an alt; lesson 30 taught
`Santhoshamga` as a headword with `santhosham` as an alt. The synonym map then
canonicalised the same sentence differently depending which side you started
from, and a correct answer drew a spelling correction. `buildSynonymMap` now
refuses an alt that is a headword elsewhere, and lesson 30's review slot became
`Malli` ("again") — a word the finale can actually use.

## Spelling notes, once more

Suppressing the note whenever coverage was full also suppressed it for genuine
typos, because coverage is deliberately fuzzy. It now requires every target word
to be present EXACTLY before staying quiet. (`Dhanyavadalu` draws no note, but
correctly: the curriculum declares it an accepted alternative spelling.)

## Content

Lesson 27 accepted `Naaku dabbulu undi` and then rejected `Naaku chillar ledu`
two steps later, contradicting its own note; both frames are accepted now.
Lesson 30 was restructured to the engine's three-plus-four shape with every one
of its five words used and each drill reaching back to a different lesson.

---

# Round 8 → fixes applied

The question-shape guard from round 7 held: **8 of 8 bare questions naming the
answer were refused** across the two testers, each answered and then re-asked.
Spelling notes: six fires between them, all on real slips, zero false positives,
never mislabelling grammar. Two-word teaching steps clean. Lesson 13 called "the
best-taught lesson" — states stem + `-anu` and then warns unprompted that the
stem is unpredictable. Lesson 22 keeps its promise about the optional pronoun.

## Two more ways to pass without producing the answer

The guard was too narrow. It caught the interrogative form and missed these:

> "Hang on, didn't we already do **Sare** back in lesson 4?" → **"Correct."**
> "I can't do that one — you never taught me the word for **'Telugu'** itself" → **"Spot on!"**

Both name the target inside a sentence of English, which satisfies the coverage
check. The general principle is position, not phrasing: **an answer is put
forward, not mentioned.** It sits at the start of the turn, or the turn is short
enough to be an answer with a remark attached. Buried in the eighth word of a
twenty-word sentence, the learner is talking ABOUT the word, not saying it.

Verified against all 688 answers the four curricula declare correct: none is
rejected. The legitimate shapes all still pass — the answer alone, the answer
with a question attached, the dropped pronoun, "I think it's sare".

That is the third distinct route to this bug (round 5's tokenised "I've", round
7's interrogative, round 8's mention) and the first fix that addresses the
category rather than an instance.

## The finale's staging

The content of the ending was called good — real callbacks, and "this is what
thirty lessons buys you" landing. The staging was not: Miko **reintroduced
herself on lesson 30** ("Hey there! I'm Miko, your friendly guide"), nothing said
this was the last lesson, and the send-off arrived *fourth*, after "that's the
last one", the generic completion stamp and a vocabulary list. Lessons can now
carry an `opener` as well as a `farewell`, the final one has both, and the
send-off comes immediately after the last answer.

## My own bug on the final drill

The prompt read "Say 'I will speak Telugu again'" and the expected answer was the
*can* form, `matladagalanu`. A tester answered it, asked which was meant, and was
told "Spot on!" with the question ignored — in the last exercise of the course.
The prompt now says "can", with a note explaining that this course never taught a
plain future for that verb.

## Fragments and stray staging

`Tutor: for "I am fine, and you?".` and `Tutor: question! The course hasn't
covered...` — both my strippers cutting a sentence in half. A cleaned reply that
no longer begins like a sentence now falls back to the unstripped form, and the
praise pattern recognises "Great question!" as a unit. Third-person staging
("Your friend says they feel happy today") is stripped alongside the "is …ing"
form it already caught.

## Not fixed, and worth stating plainly

A tester's honest summary after thirty lessons: **every verb form the course
teaches is first person.** There is no second- or third-person verb beyond
`unnaru`, so a learner cannot ask "where did you go?" or say "she went"; there is
no past negation; and there is not one character of the Telugu script anywhere.

That is a curriculum-design limit, not a defect to patch — thirty lessons of five
words is 150 slots, and this course spends them on breadth. It is the honest
answer to "what can I say after finishing", and it belongs in front of whoever
decides what the course is for.

---

# Round 9 → fixes applied

A round dedicated to attacking the grader. **23 attempts to pass a step without
producing the answer; zero succeeded.** All four shapes repelled every time — the
bare question containing the answer word, the refusal naming the missing word,
the answer buried mid-sentence, and the flat "I don't know". All the legitimate
shapes still passed, with eleven separate confirmations of the dropped pronoun.

Also clean: feedback before all twelve banners; the spelling note fired once, on a
planted vowel slip, with no false positives and no grammar mislabelled; lesson 30
opened as a finale, did not reintroduce Miko, and the send-off landed immediately
after the last answer — the tester knew they had finished.

## The grader held; the reply text gave the answer away

> Learner: "Wait — isn't *sahaayam cheyagalanu* a noun and a verb stuck together?"
> Tutor: **Nenu sahaayam cheyagalanu.** (I can help.)

Ask once, read the answer off the reply, type it back next turn. The reveal guard
was deliberately switched off when the learner asked a question, because a
question about a word is usually answered by naming it — but that also let the
whole target SENTENCE through. Now: naming a single word while explaining it is
fine; printing a target of two or more words is not.

## A word could still be skipped on a doubled teaching step

Lesson 22 asked for `Matladagalanu`, then `Sahaayam`. Typing only the first got
"Correct." and `🎓 Vocabulary done — 6 words`, and `Sahaayam` was quizzed four
turns later having never been typed. Round 8 made the step ASK for both; the
matcher was still accepting either.

`expectedForTeachStep` is now the single place that decides what a teaching step
wants, shared by the engine, the harness and the app — three callers that
previously disagreed. **That is the third time a duplicated decision has produced
the same class of bug** (the matcher in round 2, the teaching-line builders in
round 4).

## Word order was not checked at all

`peru naa` for *naa peru* drew "Exactly!". Coverage is order-blind by design and
the ratio forgives a swap, so on a two-word phrase — where order is the whole
grammar — nothing was checking. Now enforced on targets of two or three words,
where every word is structural; longer sentences keep the variation the
curriculum lists as `acceptable`.

## A note from a later step, and a teaching line as an answer

The `💡` note belonging to the self-introduction drill printed on a drill three
steps earlier. Explanations are now drawn only from material the learner has
actually reached.

And the commonest complaint about question handling across every round — "it
printed the teaching line I'd just read as if it were an answer" — is addressed
by preferring a grammar note over a vocabulary line in the fallback. A vocabulary
line is what they just finished reading; a note is at least new information.

## Telling a learner a word is uncovered when it is in their notebook

Asked about *Sare* — a lesson-4 word, on screen at that moment — the tutor said
twice that it "has not come up in the course yet". The honest-decline line now
checks the learner's taught vocabulary first and points at their notes instead.
Lesson 20 also labels all five of its words as revision or new; `Sare` was the
one without a label.

---

# Round 10 → fixes applied

Anti-cheat held again: **14 of 14 attempts blocked**, all four shapes, and all
four legitimate shapes accepted. Feedback before all nine banners. Lesson 20
labelled every word with its source lesson; lesson 30 opened and closed as a
finale.

Three real holes, two of them regressions in fixes from the previous round.

## Answer farming was wide open

> "How would I use that in a sentence?" → `The full sentence … is: **Nenu
> bagunnanu, meeru?** Now, please say **Bagunnanu**.`

Round 9's giveaway guard only looked at the CURRENT drill's target. At a
vocabulary step the target is one word, so the guard stood down — and the reply
printed a *later* drill's sentence, which the tester copied on the next turn. The
guard now covers every answer the lesson has not yet reached, and a reply that
reveals one is withheld.

Withheld, not silent: a rejected reply used to `return` and leave the turn empty,
which is the dead end the guards existed to remove. It now falls through to the
lesson's own note, or to an honest line — *"I would rather not answer that with a
sentence you have not been taught yet."*

## Word order was checked on short targets only

`peru naa` was caught. The same swap inside the capstone sentence was not, because
the first version of the check exempted anything longer than three words — and
`[name]` slots exempted their whole sentence as well, since the slot's token is
never present in what the learner typed.

Rewritten: any length, and rejection requires a genuine **permutation** — every
word of the target present, and not in the target's order. A missing word or extra
words remain coverage's business, so the `acceptable` variation is untouched.

## One word of a two-word step still passed

Round 8 made the step ask for both and round 9 made the matcher require both, but
`tutorModelled` — the rule that forgives a learner for repeating what the tutor
just modelled — accepted a single word against a two-word target. So the step was
graded "Correct.", the second word was quizzed two steps later having never been
typed, and the spelling note concatenated the pair into nonsense
(`Note the spelling: **Bagunnanu Ela**`). It now requires as many words as the
answer has.

## Smaller

A reply reduced to nothing but a pleasantry ("That's a great question!") is
treated as no reply. A fallback no longer repeats the vocabulary line the
teaching step is about to print anyway. Vocabulary lines are step-limited like
grammar notes, so a note about the fifth word cannot appear on the first.

---

# Round 11 → fixes applied

**The answer gate and the spelling checker are done.** Twelve evasion attempts
across four shapes in three lessons: none passed. All seven legitimate shapes
passed, including the dropped pronoun three times. Four planted misspellings,
four catches, no false fires — and a wrong person ending (`Gurthunnanu` for
`Gurthundi`) was rejected as *wrong* rather than mislabelled a spelling slip,
which is the distinction that took four rounds to get right.

Three defects left, all now fixed.

## Word order, third attempt — and the rule that finally works

Four of six reversals caught, two waved through. `Unnaru meeru ela` passed for
*Meeru ela unnaru* because the shorter listed variant "meeru ela" sits in order
inside it, with a stray verb in front making the whole thing ungrammatical.

Judging against the canonical answer alone then rejected five answers the course
declares correct — Telugu really does allow the time word on either side of the
pronoun (`nenu eeroju pani chestunnanu`), and the curriculum says so.

Neither half works alone. The rule that does: **order is judged against the
canonical answer, and a listed variant licenses a reordering only if it is as
long as the canonical** — a full alternative phrasing, not a shorter form that
happens to sit in order inside a scrambled answer. Zero declared answers
rejected; every reversal caught.

## Answer farming, second attempt

"How would I use that in a sentence?" was refused in lesson 1 and honoured in
lesson 30 with `Nenu Hyderabad nundi perigaanu` — the target minus two words,
which an exact-substring reveal test missed completely. `answerWasRevealed` now
also catches a near-quote: four or more of the answer's words, in the answer's
order, is the answer.

And "Can you show me an example sentence?" returned *"I understand you'd like an
example sentence."* — an acknowledgement with no content, seven words long, so it
cleared the too-short filter. A reply must now actually explain something: name a
word the learner knows, or use the vocabulary of explaining. Otherwise it is
treated as no reply and the fallback speaks.

## A pointer to a note that was not there

*"That is the note just above — have another look"* fired three times when the
note either did not exist or appeared BELOW the pointer. The deduplication
remembers every note it has shown, but "just above" is a claim about the screen.
It now checks the recent turns, and shows the note again if it is not there — a
repeat beats a false direction.

## The leak checker, one last false positive

A tester wrote "my neighbour is from Hyderabad" and was flagged, because
*Hyderabad* appears inside a lesson-30 answer. Proper nouns — capitalised, only
ever inside a drill answer, never a vocabulary item — are excluded now, as the
language's own name already was. Confirmed against a synthetic transcript that
the checker still catches a genuine leak.

---

# The blind spot: eleven rounds of testing a channel the learner does not use

Farhaan tried the app himself and said two things:

> "My impression was that it is not focussed on making the user learn."
> "There is a lot of information popping up on screen as feedback, but it is
> being glossed through as the voice focusses on the next task rather than
> feedback. I feel feedback is very important for learning."

He was right, and the mechanism is exact. `Chat.jsx` sent **only**
`role: 'assistant'` messages to text-to-speech:

```js
const spoken = out.filter(m => m.role === 'assistant').map(m => m.content).join(' ');
```

Every 💡 grammar note and every 🎓 stage banner is `role: 'system'`. So the whole
of the feedback was printed and never spoken, at all five synthesis sites. The
learner heard *"Great job!"*, then *"Say 'Hello, I am fine'."*, then *"Perfect!
Ask 'How are you?'."* — and the `baga` + `unnanu` explanation that testers
repeatedly named the best teaching in the course went past in silence.

**Eleven rounds of playtesting could not have found this.** The harness rendered a
transcript in which a spoken line and a silent one look identical, so every
simulated learner read the feedback attentively and reported on its content. I
spent the whole exercise improving the wording of explanations that a voice-first
learner never hears. The tooling measured the thing it could see.

## The harness fix comes first

`lesson-sim` now marks the channel:

```
🔊 Tutor: Perfect!
👁  On screen: 💡 *Bagunnanu* is two pieces joined: *baga* ("well") plus ...
🔊 Spoken:    Bagunnanu is two pieces joined: baga ("well") plus unnanu ...
🔊 Tutor: Ask 'How are you?'.
```

and playtesters are told to judge by ear, treating screen text as something they
catch about one line in three. Any future round asks the right question by
default.

## The app fix

- **`speechForTurn`** in the engine builds one utterance from a whole turn, both
  roles, so feedback reaches the voice. Used at every synthesis site.
- **`spokenFormOfNote`** takes the note's opening sentences up to a cap. The
  notes are written to be read — several run three or four sentences — so the
  voice gets the rule and the screen keeps the detail. Median spoken feedback is
  now about nine seconds.
- **Order changed to verdict → why → next**, in both channels. The note used to be
  printed *before* the verdict and the next instruction was glued to the praise in
  a single message, so there was nowhere to put an explanation even if it had been
  spoken.
- **Stage transitions are announced aloud.** A listener got no warning that the
  format had changed from repeating words to being quizzed on them.
- **Three notes were rewritten.** The voice says a note's opening sentence, so
  that sentence has to be a complete rule: three of them opened with 170-260
  characters, eleven to seventeen seconds before the first full stop. A round-1
  tester on the worst of them: *"I nodded and moved on."*
- **A new check** fails any note whose opening sentence is over 170 characters —
  the content standard that keeps this from coming back. All four languages: zero.

## What is still open

`Chat.jsx` speaks a note's first sentence or two and shows the rest. Whether that
is the right split, or whether feedback deserves its own pause before the next
instruction rather than being run together in one utterance, is a question the
round-12 testers are being asked directly.

---

# Round K1 (Kannada) → fixes applied

First playtest of any language other than Telugu. Four simulated learners covered
all ten Kannada lessons — A (1-2), B (3-5), C (6-8), D (9-10) — on a frozen tree.
`leak-check --chain` on all ten transcripts: **clean**, no learner produced a
course word before the course showed it, so the reports are worth reading.

An independent content audit was written *before* the reports came back
(`playtests/roundK1/curriculum-audit.md`) so the two are separate evidence. They
agreed on the big things, which is the useful signal.

## The one that matters most: the grader taught learners the wrong word

`vowelSkeleton` replaced every run of vowels with a single `v`. It was written to
forgive vowel LENGTH (`kavali` / `kaavali`) and it did — but it also erased vowel
IDENTITY, so `alli` and `illi` normalised to the same string. The grader scored
**"Alli" as a 1.00 match for *Illi*** and reported the difference as a spelling
slip. Learner B was told, twice, in praise:

> Me: Illi                    (the drill wanted "there")
> Tutor: Exactly! Note the spelling: **Alli**.
> Me: Idu nimma pustaka       (the drill wanted "that")
> Tutor: Great job! Note the spelling: **Adu nimma pustaka**.

They finished the lesson unable to tell either pair apart and said so. This is
worse than a rejection: a rejection leaves the learner uncertain, this certifies
the error. Every Dravidian minimal pair was affected — `idu`/`adu`,
`illi`/`alli`, `ivaru`/`avaru`, and in **Telugu** `idhi`/`adhi`,
`ikkada`/`akkada`. Eleven rounds of Telugu testing never caught it.

The i-/a-/e- contrast is the deictic system of the whole family; a grader for
these languages may not treat the first vowel as noise. `vowelSkeleton` is now a
spelling normal form that collapses only the slips this romanisation actually
produces — doubled letters (length AND consonant doubling), inconsistent
aspiration (`th`/`t`), and `oo` for long ū — leaving vowel quality intact. A new
`differsOnlyByDeicticInitial` mirrors `differsOnlyByPersonEnding` at the front of
the word, and the loose `levenshtein <= 1` token rule now applies only from six
characters up, because in a four-letter word one edit is a quarter of the word
and in this family that quarter is the meaning.

Side effect, and a good one: `Aka` for *Akka* now passes with a spelling note.
Learner C had reported it failing hard in lesson 6 while a genuinely wrong word
sailed through in lesson 3 — "fuzzy matching is backwards" was exactly right, and
it was one bug wearing two faces.

Regression net: every documented typo still forgiven (`kavali`, `mudu`, `Me` for
*Mee*, `ikada`, `nalku`, `snehitulu`, `bagunanu`), every person ending still
refused, and Telugu still runs 30/30 ideal, 30/30 strict, 0 rejected.

## Content: the course asked for Kannada that is not Kannada

Three drills declared answers that are ungrammatical, and all three were in the
part of the lesson the learner is graded on.

- **L3 "Say 'I am going home'" → `Naanu manege hogu`.** `hogu` is the bare
  imperative, so this reads "I go!". The course taught no finite verb at all in
  ten lessons, and this drill papered over that. It now teaches `Hoguttene`
  ("I go / I am going") and says the -ttene is the same "I" the learner already
  met inside `chennagiddeeni`.
- **L9 "Tell Miko the food is good" → `Oota olleya`,** and **"Describe your house
  as small" → `Nanna mane chikka`.** `olleya` and `chikka` are attributive only;
  neither can end a sentence. L9 drilled three adjectives correctly and two
  incorrectly and never mentioned that Kannada splits the two positions — which
  was the entire content of the lesson. It now teaches `Chennagide` ("it is
  good"), which decomposes into the *chennagi* of `chennagiddeeni` and the `ide`
  of lesson 3, so the rule arrives built out of words the learner has.

Learner D, who had no way to know any of this, still reported the symptom:
"attributive vs predicative word order both went past unnamed. I passed both by
guessing and explicitly said I was guessing; it just said 'Perfect!'".

## Content: the rest

- **Three of ten grammar notes were attached to the wrong drill**, so the tutor
  explained a word that was not on screen. The *Illa* note fired on `Neeru beku`,
  the gender note on `Nanna hesaru`, the polite-command note on `Eshtu?`. All
  moved. Learner D: "the one grammar tip fired after an unrelated answer, before
  I'd used *kodi*".
- **L8 stated one plural rule and broke it one line later.** "*Galu* is **the**
  ending that makes a word plural", then `Snehitaru`. Learner C asked why, was
  re-read the broken rule verbatim, later answered `Snehitagalu` and was marked
  wrong with no explanation. The -aru/-galu animacy split is now taught on the
  word itself. `Hoovu` ("flower") was added so the one decomposable example has a
  stem the learner knows.
- **L7 and L8 contradicted each other** on whether a noun changes after a number
  (`Eradu pustaka` vs `Mooru pustakagalu`, both praised). L7 now states the rule —
  no plural ending after a number, because the number already said it — and L8's
  drills no longer use numbers.
- **L10 was called "Review & Survival Dialogue" and reviewed nothing.** Five new
  words, one recombining drill. Its four conversations now each rebuild a
  sentence out of earlier lessons.
- **"Thank you" and "sorry" arrived in lesson 10 of 10** — after eight lessons of
  asking strangers for food and water with no way to thank them. `Dhanyavada`
  moved to L4, next to the asking.
- **Prompts that asked for something other than the answer**: "This is my book"
  keyed to `Idu pustaka` ("this is A book") with the answer leaked in the prompt;
  "you have four friends" keyed to `Nanna naalku snehitaru` ("my four friends"),
  a noun phrase; "She is my elder sister" keyed to `Ivaru`, which the lesson had
  taught five steps earlier as "this person". All rewritten. Learner C: "the
  English side actively teaches wrong meanings."
- **Phonetic hints that disagreed with the spelling the learner has to type** —
  `Neeru` hinted `nee-roo`, `Estu` hinted `ehsh-tu`, `Chennagiddini` hinted
  `dee-nih`, `Akka` hinted `ak-kah`. This is the exact defect the file header
  says was fixed in Telugu L11-L30; Kannada had it too. Spellings and hints now
  agree, and `Kathey` became `Kathe` to match `Mane`.
- **L1's final check silently required two pronouns the lesson had twice called
  optional**, and answered every attempt with the unchanging hint "Full intro".
  Learner A: "this is the moment I would have closed the app". The acceptable
  list now carries the pronoun-dropped and unfused forms, and the hint says what
  the sentence is made of.
- **Lessons 1-5 had no icon or colour and 6-10 did** — the visible seam between
  two authoring passes. Levelled.

Result: `blocked 0, endings 0, rejected 0, misshapen 0, ideal 10/10,
strict 10/10` — Kannada now completes for a learner who only ever says what it
taught them. It did not before: L2 and L3 were unfinishable.

## The harness was lying to testers

All four learners hit the same two canned lines, and both are false:

> "Good question — that one is in your notes already, so have another look there"
> "I would rather not answer that with a sentence you have not been taught yet"

The first fired when the word was genuinely not in their notes. The second fired
when they had asked for a single WORD, and the drill then demanded that word
again — a closed loop. Learner A drew the correct conclusion: "the optimal
strategy in this app is to stop asking and start submitting rubbish", because
`Nimma` was never taught and only ever appeared in a failure hint.

These strings live in `lesson-sim.mjs`, not in the app — the app lets the model
answer, guarded by `antiFabricationRule` — so the specific wording was a harness
artefact and should be reported as one. But a harness that lies corrupts every
round run through it, so it now detects a learner REPORTING a gap ("you haven't
taught me the word for she") separately from a learner asking a question, and
answers honestly: "You are right, that has not come up yet — that is the course's
gap, not yours."

The underlying complaint was not an artefact, and it is fixed at the source: with
`gap-check` at 0 blocked drills, the course no longer asks for words it has not
given.

## Still open after K1

- **No past or future tense anywhere.** L3 now teaches one present-tense verb;
  the learner still cannot say "I went" or "I will go". Ten lessons is thin —
  Telugu has thirty.
- **Odiya (60 blocked drills) and Hindi (26)** still have the class of gaps
  Kannada had. Both are below MIN_LESSONS so neither is reachable in the app.

---

# Rounds 12-13: voice, and the feedback that was wrong

Two voice rounds on the spoken-feedback change, and a third fixing what they
found. Their shared verdict, in one tester's words: *"a quiz that has learned to
talk"* — the scheduled teaching is good, and the part that REACTS to the learner
was disconnected from it.

## My own fix was making the audio lie

Speaking a note's opening sentence and leaving the rest on screen sounded
reasonable and was wrong. The cut consistently landed on the caveat: fourteen of
seventy notes lost their second half, which is where the exception lives. In
lesson 26 the audio promised *"use naaku X-ga undi and you will be right with
every feeling here"* while the qualifier that follows stayed on screen — a
half-rule delivered confidently, which is worse than no rule.

Notes are spoken **whole** now, and the limit moved to the writing: seven were
shortened, and `matcher-check` fails any note over about twenty seconds. All four
languages: zero. The lesson-26 rule is now heard entire, with both exceptions, and
the next tester used it unprompted two prompts later.

## Two findings that were my harness, not the app

Both testers led with "every wrong answer gets nothing but 'Not quite'". That is
true of the harness and **false of the product**: `Chat.jsx` calls
`aiService.diagnoseAttempt` on all three miss paths. I nearly fixed a bug that did
not exist. The harness mirrors it now — same prompt, same refusal to accept a
diagnosis containing the answer — so the round measures the app.

The same applies to markdown and emoji heard in the spoken channel: the app runs
`buildSpeechText` over everything and the harness did not.

## But the diagnosis itself is frequently wrong

With the harness faithful, the next round could see the real behaviour, and it is
poor. Across thirteen wrong answers: five named the wrong part of the learner's
word, two gave backwards instructions that cost a turn, one **invented a meaning**
— telling the learner *Badha* meant "obstacle" four cards after the lesson taught
it as "sadness". Confidently wrong feedback is worse than a hint, because the
learner acts on it.

The grader already knows why it refused. `explainMiss` answers from that:

| the learner writes | what they now hear |
|---|---|
| `Adhi` for *Idhi* | adhi means "That" — here you want the word for "This" |
| `Nenu bagunnaru` | That ending makes it "you" — you want the "I" form |
| `peru naa` | All the right words — the order is not. naa comes first |
| `Tintunnanu` for *Thinnanu* | tintunnanu means "I am eating" — here you want "I ate" |
| `Mudu` for *Moodu* | Close — check the vowels in moodu |
| `Ikada` for *Ikkada* | Close — check the vowels in ikkada |

It uses the guards already in the engine — including
`differsOnlyByDeicticInitial`, which exists because i-/a-/e- is the whole pointing
system in these languages — so a first-vowel swap is named as the word the learner
actually said. When nothing certain fits, it returns null and the model is asked;
if that fails too, the curriculum's hint stands, which is at least never wrong.

## `skip` was promised and did nothing

When the tutor concedes a gap it offers: *'Say "skip" and I will give you the
answer and move us on.'* Typing "skip" was graded as a **wrong answer**, twice in
a row, with the learner stuck on the same step. A promise the app does not keep,
and it is the "no way out" complaint that made two testers stop asking questions
and start guessing. Implemented now in both app and harness, at every stage.

## Numbers had been missing from the audio all along

`buildSpeechText` stripped emoji with `[\p{Extended_Pictographic}\p{Emoji_Component}]`,
and **`\p{Emoji_Component}` matches the ASCII digits** — they are what keycap
emoji are built from. So every number was silently deleted from speech:
"Vocabulary done — 6 words" was said as "Vocabulary done — words", and "Mariyu
from lesson 10" as "Mariyu from lesson". Pre-existing, in the app's own speech
path, and invisible to anyone reading a transcript.

## Note on provenance

This repository has committed playtest rounds from before this session
(`playtest round 1/2/3`). Some of the careful handling here — the Dravidian
deictic guard, the gap-reporting reply — is that earlier work, not mine.

---

# Round K2 (Kannada) → fixes applied

Three learners on the post-K1 tree: two regression testers (lessons 1-3 and
7-10) given specific things to probe, and one who took **all ten lessons in
order** and then sat a 30-item held-out exam with the app closed. All thirteen
transcripts `leak-check` clean.

## The K1 fixes held

The minimal-pair fix is confirmed from the learner's side. Four deliberate
wrong-member-of-a-pair answers, four correct rejections, each naming the MEANING
error rather than calling it a spelling slip — and it caught the wrong word
buried mid-sentence with everything else correct:

> Me: Mane illi ide            (the drill wanted "there")
> Tutor: Not quite. You used the word for 'here' instead of the word for 'there'.

And the split a learner actually needs is now clean and legible: three deliberate
typos (`Chenagiddeeni`, `Pustka`, `Yeli`) all passed with "Note the spelling",
while the right spelling of the wrong word failed with a meaning explanation.
That is the exact inversion of what round K1 found.

Also confirmed fixed: L1's optional pronouns are now genuinely optional (the
round-K1 quit point), L7 and L8 no longer contradict each other on plurals, and
L9's adjectives were called "the strongest teaching moment in the four lessons".
Nine out of nine answers that carried an English aside were accepted.

## New: the spoken track was deleting every number

`spokenFormOfNote` stripped emoji with
`[\p{Extended_Pictographic}\p{Emoji_Component}]`. **`Emoji_Component` includes the
ASCII digits 0-9**, because they are the components of keycap emoji like 1️⃣. So
every number in the course was silently removed from what the voice says — in
every language, in every lesson:

> on screen: **Vocabulary done** — 6 words.
> spoken:    Vocabulary done — words.
> on screen: the same one that turns hogu into hogi back in lesson 3
> spoken:    ...back in lesson.
> on screen: Lesson 1, lesson 7, lesson 4 and today in one line.
> spoken:    Lesson , lesson , lesson and today in one line.

Both regression learners reported it independently in every lesson they played.
Every cross-lesson reference the course makes is a number, so for an audio-only
learner the entire scaffolding between lessons was inaudible. The pictographs,
skin tones, flags, variation selector, ZWJ and keycap mark are now listed
explicitly and digits survive.

## New: a wrong answer with a question attached had its verdict swallowed

The conversation stage suppressed "Not quite" whenever the turn looked like a
question — a fix from an earlier round, over-applied. A tester typed a wrong
answer with an aside on the end and got no verdict at all, just the prompt again:

> Me: Adu yenu? — though I honestly can't tell from the prompt whether the book
>     is near me or far…
> Tutor: So — Someone points to a book. Ask them what it is.

They could not tell whether they had been marked wrong or ignored, retyped it
bare, and only then got the real answer. Their conclusion is the right one:
"writing out loud makes your errors less legible" — which punishes exactly the
behaviour the mixed-language handling exists to allow. The verdict is now
suppressed only when the turn carries no attempt at the target, using the same
`attempted` test the phrase stage already used.

## New: the note on a miss handed over the answer

`grammarNote` fires on the first miss. When the note contains the word the
learner just got wrong, that prints the answer before the retry, and the retry
then tests nothing:

> Tutor: Not quite. You used the word for 'here' instead of the word for 'there'.
> 💡 without it `mane alli` is just "house there"...

The tester called it "a free answer for getting it wrong". `pushNote` now
withholds a note on a miss if it names a word from the target. Notes on a hit,
which is where most fire, are untouched.

## Content fixed

- **The same English prompt wanted opposite words in two lessons.** L5 "tell Miko
  it is your book" wanted *nimma* (Miko's); L6 "tell Miko this person is your
  teacher" wanted *nanna* (the learner's). Same frame, opposite answers, no way
  to tell from the prompt. Both prompts now say whose, and L5 carries a note on
  which "your" an English prompt means.
- **A fifth of the vocabulary was dead** — *avara*, *avaru* and *ketta* were
  taught, quizzed in the review, listed on the summary card, and never required
  in any sentence the learner had to build. *Avaru* was worse than dead: it
  appeared only inside another word's teaching line, so the tester who produced
  `Avaru yaaru?` in the exam had reached it by generalising the i-/a- pattern,
  not by being taught. All three are now drilled, and *avaru* has its own
  teaching step that names the pattern for the third time.
- **Two holes the course pointed at and refused to fill.** L3 said *ide* is for
  things and never gave the person form, so a learner had no way to say anyone
  was anywhere — one tester asked directly and was not answered. L9 ended by
  saying "my house IS small" needs "the *chennagide* pattern with a different
  word" and never gave the word. Both now name it: *iddeeni*/*iddeera*, and
  *chikkadu* / *chennagilla*.
- **L3's rule note was wrong about its own sentence.** "*Yelli* went to the end"
  is false of `Mane yelli ide?`, which the course accepts and which a tester
  produced. Reworded to say what is actually true — *yelli* follows the thing
  asked about, and keeps that position when the verb is added.
- **L2's "someone points to a book" gave no distance cue.** Distance-neutral in
  English, and now that the matcher correctly enforces *idu* against *adu* it was
  a coin flip the learner got marked wrong for. Compare the very next drill,
  which does it right: "Point to a **distant** object".
- **L10 asserted lesson 3 had taught *hogi*.** It had not — it is inside *hogu*'s
  teaching line as an aside. Reworded to teach the form rather than back-reference
  it.
- **L3 crammed two new words plus two grammar rules into one teaching step**,
  twice. Reordered so the doubled step is *Illi* + *Alli* — a contrast pair that
  is better taught together than apart.
- Five lessons ended with no send-off. All ten now have one.

## The exam

30 items, held out, app closed, graded against real Kannada rather than the
course key. **30/30**, including six sentences the course never drilled, all
correct — and one, `Mane yelli ide?`, better Kannada than the course's own key.

`playtests/roundK2/exam-grading.md` says at length why this does **not** prove the
course taught it: a model playing a beginner already knows Kannada, and
`leak-check` can only police the play transcripts, not the exam. The strongest
evidence for the course is that the learner's IGNORANCE was shaped like the
course's gaps — it declined to write a sentence it had the outside knowledge to
write, because the course had not taught the form. Round K3 makes that a real
control by putting items on the exam that the course genuinely never covered.

## Still open

- **Direct questions get a canned hint replayed rather than an answer.** Only 2 of
  9 questions across the two regression testers were actually addressed; the rest
  drew a hint selected by step rather than by what was asked. It looks like an
  answer, so the learner reads it carefully before realising it did not address
  them. This is `bestExplanationFor` choosing on position, and it is the largest
  remaining defect.
- **Extra-pronoun leniency.** `Naanu neeru beku` is accepted as "Perfect!" for
  *Neeru beku* — the learner said more than the target, which the matcher forgives
  by design. But it is not grammatical: the explicit form is *nanage neeru beku*,
  and the course says so in a note the learner is not required to act on. Same
  class of fault as the K1 minimal-pair bug (certifying an error), narrower.
- **One verb, no tense, no script, no listening.** See `human-transfer.md`.

---

# Round K3 (Kannada) → fixes applied

Two learners: one on lessons 5, 6 and 9 probing the round-K2 rewrites, and a
second taking all ten lessons and sitting an exam **with a control** (see below).
All thirteen transcripts `leak-check` clean.

## The exam now has a control, and it passed

The round-K2 exam scored 30/30 and `roundK2/exam-grading.md` said plainly that
this did not prove the course taught it: a model playing a beginner already knows
Kannada, and `leak-check` reads the play transcripts but cannot police an exam
written from memory.

Round K3's exam adds **Part 4: eight items, six of which the course genuinely
never covers.** If the learner answers those in real Kannada, the exam is
measuring the model and should be discarded.

**It answered "I DON'T KNOW" to six of eight**, and named the missing piece each
time — no past tense, no verb for "understand", numbers stop at five, no word for
"toilet". These are sentences the underlying model can certainly produce in
Kannada; it did not. The two it answered are both legitimate:

- *Naanu shikshaka* ("I am a teacher"), reached by extending lesson 2's no-copula
  rule to a new subject, and flagged as an extension rather than a recall.
- "Where is the toilet?" answered `I DON'T KNOW` **while noting the frame was
  there** — "I have the whole sentence frame, `X yelli ide?`... I just have no
  word for toilet."

So the 30/30 on Parts 1-3 can be read as measuring the course. It is a statement
about the curriculum's coherence — that what it teaches recombines — not about
human retention, which no agent run can measure.

The most valuable single answer in the whole exercise was on "do you speak
English?":

> unanswerable for a structural reason, not just vocabulary: **the course never
> taught a yes/no question**. Every question I can form uses a question word
> sitting at the end. I have no way to turn a statement into a question.

That gap was not on any of my lists. Three rounds of playtesting and a content
audit missed it; a learner asked to be honest about what it could not do found it.

## Faults I introduced in round K2, found in K3

Worth recording separately, because the fixes caused them:

1. **L9's `ketta` drill contradicted its own lesson.** I added the drill so
   *ketta* would stop being a dead flashcard, and worded the prompt "The food is
   bad" — which the same lesson teaches as *oota chennagilla*. The drill wanted
   *Ketta oota beda*. The tester answered the prompt as written and was told the
   word for "bad before a noun" was missing — ordered to use the word the lesson
   had just explained cannot end a sentence.
2. **L5's rewritten prompt fought the grader's own correction.** I changed it to
   "tell Miko that the book is HERS" to disambiguate "your"; the correction then
   read "here you want the word for 'Your'". Worse than the ambiguity it fixed —
   and capitalising HERS actively points at *avara*.
3. **A turn that was ONLY a question got graded wrong**: "Not quite. 2 of the
   words are missing". My K2 fix made a wrong answer keep its verdict when a
   question was attached, but the attempt test counted a question that merely
   QUOTED a target word ("is it *ketta* or *chennagilla* here?") as an attempt.
   Now gated on `askingOnly`.

All three are fixed. The lesson for (1) and (2) is the same one: **prompts should
quote the sentence the learner is to say** rather than describing it in English,
because English perspective words ("your", "hers") do not survive the translation
into a language that marks the distinction differently. Four prompts were
rewritten that way.

## Other fixes

- **"That is the note just above" was still firing on gap reports.** Round K1
  added an honest reply for a learner reporting a hole, but put it *downstream* of
  the note fallback, so any lesson carrying a vaguely relevant note still answered
  "have another look". A K3 tester hit it on lesson 1's untaught "and", was
  pointed at a note that did not contain the answer, was marked wrong, and called
  it the worst moment in the course. The check is now hoisted above the fallback.
- **A correct answer after a long preamble was rejected with a wrong reason.**
  `Oh, I see — I'm talking to her, so it's 'your'. Adu nimma pustaka` drew "You
  missed the word for 'that' at the beginning", with *Adu* plainly present.
  `answerIsOffered` accepted an answer that LEADS the turn or a turn short enough
  to be an answer plus an aside, but not reasoning-then-answer — the other natural
  shape of thinking aloud, and the one the course most wants to see.
  It now also accepts the full target contiguously at the END, which keeps the
  original guarantee that a target merely mentioned mid-sentence does not count.
- **`Galu` was drilled as a word while its own teaching line said it is not one.**
  It was a vocabulary entry, so a teaching step asked the learner to say it and
  the summary card listed it under "you can now say". A tester called that
  incoherent. The rule moved onto *Pustakagalu*, the first word that carries it.
- **Two more distance-ambiguous prompts** of the class fixed in K2 ("Someone
  points at a person. Ask who they are." — near or far is not stated). Fixed.

## What the round confirmed is working

- The i-/a- near/far pattern is now taught three times across lessons 2, 3 and 6,
  each time linking back to the previous. Both K3 testers named it the best-taught
  thing in the course, and one produced `Avaru yaaru?` in the exam by predicting
  the pattern rather than recalling a drill.
- The `-aru`/`-galu` people/things split, taught with its counterexample up front.
- The `olleya` / `chennagide` attributive-predicative split — flagged at
  introduction rather than after a failure, which is the fix lesson 1 needed.
- Deliberate wrong-member-of-a-pair answers still get meaning-level corrections,
  not spelling ones.

## Still open

- **Live question handling.** Both testers hit the same thing: the content that
  answers their question exists and arrives one turn LATER on its own, but the
  question itself draws a hint selected by step rather than by what was asked.
  "The content is there; the live-question handling just isn't." This is
  `bestExplanationFor` ranking on position, it has several rounds of attempted
  fixes layered on it already, and it is the largest remaining defect.
- **`Naanu neeru beku` is graded "Perfect!"** though it is not grammatical — the
  explicit form is *nanage neeru beku*. Extra-word leniency, by design, but it
  certifies an error.
- **Words mentioned but never drilled**: *chennagilla*, *chikkadu*, *hogi*,
  *matte*, *nanage*. Naming them is better than the round-K1 state of withholding
  them entirely, but a learner can recognise and not produce them.
- **No past tense, no yes/no question, four verbs, numbers stop at five.** The
  structural ceiling. See `human-transfer.md`.

---

# Rounds 14-15: the explanations are true now

Round 14 confirmed the rewritten error feedback works on words — **correct 11 out
of 11**, including both directions of the *Idhi*/*Adhi* first-vowel swap, which is
the distinction the whole pointing system rests on. Round 15 then hunted the
remaining false statements, and found three.

## Three replies that said something untrue

- **`Nenu illu lo unnaru` → "Exactly!"** for "I am in the house", whose answer has
  no verb at all. The learner had added a wrong-person copula and been praised for
  it. Extra words are tolerated in general — greeting an answer is not an error —
  but a form of "to be" is structural, so adding one where none belongs, or the
  wrong one, is now a different sentence.
- **`Naaku alupu undi` → "Perfect!"** for "I am tired", with the `-ga` missing.
  That is the entire subject of lesson 26, and the explanation stating the rule
  fired one second after the praise. **My own doing**: I had listed the base form
  in that drill's `acceptable` in an earlier round.
- **"you want the 'you' form"** for *Ayana badhaga unnanu*. Verdict right, reason
  false: `-ru` there is the respectful *he/she*, which the card's own note spells
  out one line later. `explainMiss` now reads the subject and says "he/she
  (respectful)" when the sentence is about someone.

## Wording

"It should not have the ending sound you used" is near-useless by ear. The ending
has a name and the learner has just been taught it, so it is named — and an
inflection of the right root is explained before falling back to "that is a
different word", because reaching for the right root and missing the ending is a
different mistake:

| the learner writes | what they now hear |
|---|---|
| `Naaku alupu undi` | That one needs the -ga ending: alupuga, not alupu. |
| `Naaku badhaga ledu` | Drop the -ga here: badha, not badhaga. |
| `Nenu ippudu pani velthunnanu` | That one needs the -ki ending: paniki, not pani. |
| `Meeru kopamga unnaru` | Almost — unnara is the question form; unnaru states it instead of asking. |
| `Neeru oddu` for "I want water" | oddu means "Don't want" — here you want the word for "Want". |

## Confirmed fixed in round 15

Statement-for-question no longer blamed on person. Opposite-meaning answers no
longer praised. `-ga` kept in a negation now marked wrong. `skip` worked three
times including twice on a section's last card, with the section announcement
firing correctly. Verdict → explanation → next held everywhere, including all
three final turns. Numbers are audible.

And the tightening did not overshoot: **zero declared-correct answers rejected in
any of the four languages**, with four valid variations checked by hand — an
English aside on a right answer, the optional pronoun added and dropped, and the
tutor's own accepted-but-not-ideal form.

## Still open

The tester's summary — *"a quiz with unusually good margin notes"* — points at
something no bug fix reaches. The vocabulary and review stages are pure drill: the
word is on screen and the learner types it back. That is copying, not retrieval,
and it is a third of every lesson. The sentence stages, where the explanations
live, are the part they called excellent. Moving the teaching stage toward recall
is a product decision, not a defect, and it is the most likely remaining answer to
"it is not focussed on making the user learn".

Questions are also still answered at about two in eight, and the honest-decline
line still fires occasionally on material the lesson has covered.

---

# External review of a lesson-1 transcript → applied course-wide

A reviewer read one lesson-1 transcript cold and rated the dialogue 7.5/10:
architecture strong, "the main thing holding it back is that the tutor is trying
to teach Kannada grammar through catchy rules that are a little too absolute".
That diagnosis was right, and it generalised past the lesson it was made about.

## The catchy-but-wrong rule

> "*Chennagiddeeni* is a whole sentence on its own — the -eeni on the end IS the
> "I", so there is no separate word for "am"."

The -eeni is a first-person singular VERB ending. It is not a pronoun, and
calling it one is the kind of thing a learner later has to unlearn. The useful
idea underneath — Kannada carries the subject in the verb ending, so *naanu* can
be dropped — survives an accurate statement of it perfectly well.

Grepping the course for the same framing found it in four places, not one:
lesson 1's note, lesson 3's *Hoguttene* teaching line ("that -ttene on the end is
the "I" on a verb") and lesson 3's *manege* note ("-ttene says "I""). All four now
say the ending *tells you* the subject rather than *being* it.

## The grammatical bridge arrived as a reward

The reviewer's sharpest structural point. The course taught *hege* ("how") and
*iddeera* ("are you"), then drilled *Neevu hegiddeera?* — and the note explaining
that the two fuse into one word fired only AFTER the learner got it right. A
learner who had not guessed the fusion was left to reconstruct it from nothing,
and the transcript shows exactly that happening.

The bridge is now in *Iddeera*'s teaching step, before any drill asks for it:
"Put it straight after *hege* and Kannada runs the two together: *hege iddeera*
becomes **hegiddeera?**". Same principle already held elsewhere by accident —
*chennagi* + *ide* → *chennagide* in lesson 9, *mane* + -ge → *manege* in lesson 3
— so this was the one place the course broke its own pattern.

## A register rule stated too narrowly

> "*Neevu* — the polite form, for anyone you are not close to."

True as far as it goes and it omits the commonest other use: *neevu* is also
plural "you". Now: "use it when you are speaking politely or respectfully, and
also whenever you are speaking to more than one person." Lesson 5's *avara* line
had the same over-tight framing ("anyone older than you or senior to you") and
was widened to "anyone you would speak of respectfully".

## An internal contradiction the review implied but did not name

Auditing every note for absolutes turned up one the reviewer had not seen.
Lesson 9 told the learner that *olleya* "cannot end a sentence" — and then, four
drills later, handed them *nanna mane chikkadu* ("my house is small"), an
adjective ending a sentence. The -du predicate form was being used while the
lesson's own rule denied it existed. The paradigm is now stated once and
consistently: attributive in front of the noun, -du to stand alone, and
*chennagide* / *chennagilla* as the idiomatic pair for good and bad.

## "I don't know" was an inescapable loop

> Learner: Hega Neevu
> Tutor: Not quite. One word of the answer is missing.
> Learner: I guess I don't know then
> Tutor: ...say Neevu hegiddeera?. Now, give it a try and say it!
> Tutor: So — Ask 'How are you?' (formal)

Two instructions in one turn, and the drill re-asked after the answer had been
given. The cause: "I don't know" matches `isHelpRequest`, help requests are never
graded as misses, and only misses count toward the two-miss cap that reveals the
answer and advances. So a learner who admits they are stuck can never reach the
escape hatch — the more honest they are, the longer they are held.

An explicit surrender AFTER at least one failed attempt now counts as reaching
the cap: the answer is given, the reason is named, and the lesson moves on.
Without a prior attempt it stays a help request, because "I don't know" on first
sight of a drill is a request for a hint, not a surrender.

## Not adopted

The reviewer suggested teaching *chennagiddēne* (ಚೆನ್ನಾಗಿದ್ದೇನೆ). The course
teaches the colloquial *chennagiddeeni* (ಚೆನ್ನಾಗಿದ್ದೀನಿ) instead, with -ene on
the `alt` list. That is deliberate: this is a spoken-only course with no script,
and the colloquial form is what a learner will hear and be answered with. Medium
confidence — the written form is the better choice the moment the course teaches
the script, and it does not.

## Follow-up: the bridge fix created the fault it was meant to prevent

Adding the *hege* + *iddeera* → *hegiddeera* bridge to the teaching line told the
learner the fused form was correct. The grader then refused it:

> Tutor: ...Kannada runs the two together: hege iddeera becomes hegiddeera?.
>        Your turn — say Hege, then Iddeera
> Learner: Hegiddeera?
> Tutor: Not quite. The word for "How" is missing.

The tutor declaring a form correct and the grader refusing it is the exact fault
rounds 1 and 2 were spent removing, and the bridge reintroduced it in a new
place. `teachStepVariants` accepted only the reversed word order, never the
run-together form — which is a strange omission for a language family that fuses
adjacent words as a matter of course. It now returns the concatenation as well,
built across each word's `alt` spellings so `hegiddira` passes too (the course
already lists that variant as correct in its own drill).

Two consequences worth noting:

- **The spelling note had to be filtered separately.** The fused variants are
  synthetic — *hege* + *iddeera* concatenates to `HegeIddeera`, which nobody
  writes — and `spellingNote` promptly offered it: "Correct. Note the spelling:
  HegeIddeera." A single-token candidate is now never offered as the spelling for
  a multi-word target. Grading still accepts them; only the advice is filtered.

- **The app diagnosed against the wrong target.** A second bug in the same
  transcript: the learner said `Hege` alone and was told "your pronunciation is
  close, but one sound is off". `Chat.jsx` grades a two-word teaching step
  against `expectedForTeachStep` but *explained* the miss against `current[0]`
  with no variants — so it compared "Hege" to "Hege", found nothing wrong,
  returned null, and the model filled the silence with an invented pronunciation
  fault. The harness had it right all along (`explainMiss` returns "The word for
  'Are you (polite)' is missing"), so this never showed up in a playtest: it is
  app-only, and only reachable by a learner who says one word of a two-word step.
  The diagnosis now uses the same target and variants as the grader.

That divergence is the third time an app-only copy of engine logic has drifted
from the engine (round 2 found the matcher, round K1 found `tutorModelled`). The
harness cannot catch these by construction. Worth a pass over every remaining
place `Chat.jsx` computes something the engine already computes.
