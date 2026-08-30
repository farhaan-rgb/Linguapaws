# Would a human learn this? An estimate.

The agent exams say the Kannada course is **coherent** — what it teaches adds up,
and a learner who holds it all in mind can recombine it into sentences the course
never drilled. That is a real property of a curriculum and it was not true before
round K1: the course then contained ungrammatical target sentences, contradicted
itself on plurals, and had a grader that certified `alli` as a correct answer for
*illi*.

It is a different question from "would a person learn Kannada from this", and the
agent runs cannot answer that one. Stating why, and then estimating anyway,
because an estimate with its assumptions on the table is more useful than a
refusal.

## Four ways the simulated learner is not a human learner

1. **Perfect retention inside a session.** The agent carries lesson 1 into lesson
   10 with no decay. A human forgets most new vocabulary within days unless it is
   re-met. The course's SRS (`srs.js`) exists for this, and none of these runs
   exercised it — every playtest was a single sitting.
2. **No production channel.** The agent types transliteration and reads
   transliteration. A human has to hear it, say it, and be understood. The
   agent's own summary names this as the thing it cannot claim: *nanna*/*nimma*
   and *illi*/*alli*/*illa* are separable on a screen at your own pace and much
   harder at speaking speed.
3. **Vastly better pattern extraction.** Told the -aru/-galu split once, the agent
   applied it flawlessly and could still explain it thirty minutes later. Humans
   typically need the same rule five to ten times across spaced sessions.
4. **It already knows Kannada.** Verified not to *use* that while playing.
   **Round K3 tested it on the exam too, and it held**: of eight items, six of
   which the course never covers, the learner answered "I DON'T KNOW" to six and
   named the missing piece each time — no past tense, no verb for "understand",
   numbers stop at five, no word for "toilet". Those are sentences the underlying
   model can certainly produce in Kannada. It did not. So the exam is measuring
   the course rather than the model, and the 30/30 stands as a statement about the
   curriculum — that what it teaches recombines into sentences it never drilled.
   It remains a statement about coherence, not about human retention.

## What transfers, roughly

Splitting by what kind of knowledge it is, because they decay very differently.

**Rules stated as rules, contrasted, and re-met — the strongest part of the
course.** Question word goes last; no plural ending after a number; -aru for
people and -galu for things; *olleya* in front of a noun against *chennagide* to
end a sentence; the i-/a- near/far pattern; the dropped pronoun. There are six of
them, each stated explicitly, each contrasted against the thing it is not, and
most re-met in a later lesson. This is well above what a typical beginner app
does — most teach vocabulary and let grammar be inferred. Both K2 learners
retained all six and one said the recombination note had converted four
memorised sentences into "a rule I hold". **Estimate: a motivated adult retains
4 of 6 after a week, 3 of 6 after a month without review.** Rules are sticky when
they are contrastive, and these are.

**Vocabulary: about 55 words across ten lessons.** Every word is now used in at
least one sentence the learner has to build — that was not true before this round
(*avara*, *avaru*, *ketta* were taught, reviewed, and never required). Recognition
outlasts production by a wide margin. **Estimate: 60-70% recognised after a week,
25-35% produced unprompted; after a month with no review, 40% and 15%.** The
minimal pairs are where a human will do much worse than the agent — *nanna* and
*nimma* differ by two letters and mean opposite things, and the course now says so
but cannot make a human hear it.

**Fixed phrases: eight to ten of them.** *Namaskara*, *chennagiddeeni*,
*hegiddeera*, *idu yenu*, *neeru beku*, *oota beda*, *lekka kodi*, *dhanyavada*,
*kshamisi*, *eshtu*. These behave like song lyrics rather than grammar and are the
most durable thing in the course. **Estimate: 70-80% retained after a month.**

**Novel recombination — the thing the exam actually tested.** The agent built six
sentences the course never drilled. A human at this stage will manage the
shortest frames (`[thing] beku`, `[number] + noun`, `[possessive] + noun`) and
will not reliably manage the longer ones (`Kshamisi, oota yelli ide?`) without
hesitation and error. **Estimate: 30-50% of the agent's novel-sentence
performance, and slowly.**

## The honest headline

**A motivated adult who finishes all ten lessons ends up with a working tourist
phrasebook and three or four grammar rules they could defend — not a language.**
That is roughly what ten lessons should produce, and the course is now honest
about which parts it delivers.

The ceiling is not effort, it is scope. Three constraints set it, and the third
was found by a learner rather than by any check I ran:

**The course contains one verb.** *Hogu* / *hoguttene*, added in round K1 —
before that it contained none. There is no past, no future, no "I don't
understand", no "say that again". Every sentence a graduate can build is a naming,
wanting, or pointing sentence. Telugu has thirty lessons; Kannada has ten, and it
shows in exactly this way.

**There is no yes/no question.** Every question the course teaches is built with
a question word — *yenu, yelli, yaaru, eshtu, hege* — sitting at the end. A
graduate cannot turn a statement into a question, so "do you speak English?",
"is this yours?", "are you coming?" are all unreachable regardless of vocabulary.
The K3 learner found this by being asked to be honest about what it could not do;
three rounds of playtesting, a gap-check and a content audit all missed it,
because every tool checks whether the course teaches what it claims and none
checks what it never claims at all.

Two further limits worth stating plainly:

- **No script.** The course teaches romanised Kannada. A graduate cannot read a
  shop sign, a bus board, or a menu. For a language with a live, universally-used
  script this is a large omission, and it is a product decision rather than a
  content bug.
- **No listening.** Every playtest was reading. The app does speak, but nothing in
  the course requires the learner to understand something they did not first see
  written. A learner who can ask *mane yelli ide?* and cannot parse the answer has
  not gained much.

## What would move the number most

In order of effect per lesson written:

0. **A yes/no question form.** One lesson, and it unlocks a whole class of
   sentence the graduate currently cannot form at all.
1. **Verbs with tense.** Five or six common verbs (*come, eat, drink, see,
   understand, speak*) in present and past would roughly double the sentence space,
   because every existing noun becomes usable in a new frame. This is the single
   highest-value addition and nothing else is close.
2. **"I don't understand" and "please say it again."** Two phrases, and they are
   what actually keeps a beginner in a conversation instead of ending it.
3. **Numbers past five, and directions.** The course teaches two questions —
   "how much?" and "where?" — whose answers it cannot parse.
4. **Lessons 11-20.** Ten lessons is the app's minimum, not a course. Kannada
   qualifies for the app by exactly one lesson.
