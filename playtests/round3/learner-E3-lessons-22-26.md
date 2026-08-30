# Playtest — Learner E3 — Telugu lessons 22 ("Can / Can't") and 26 ("Feeling Words")

Round 3. English-only beginner, came in with the notebook from lessons 1–21 (and 1–25 for lesson 26).
Sessions: `r3e22`, `r3e26`.

---

## How it went, in my own words

### Lesson 22 — Can / Can't

This one was genuinely good, and it's the first lesson in a while where I finished feeling like I
*understood* something rather than just having memorised six sounds.

The setup was smart: I got `Galanu` = "can" and `Lenu` = "can't" as bare endings first, then
immediately got the pair `Cheyagalanu` / `Cheyalenu` hanging off them. Seeing the two side by side is
what made it click. The system note that came after my first sentence spelled it out properly:

> *-galanu* and *-lenu* are endings, not words. The "I" is already inside them, so *cheyagalanu* on
> its own is a complete "I can do" and *nenu* in front is optional — both are accepted here.

That is exactly the sentence I needed. And then, two turns later, the lesson **broke its own rule and
marked me wrong for following it** (details in Q1 below). That soured a lesson I otherwise liked.

Two things I was asked for that I had never been given:

- **"Say 'I can speak Telugu'."** I have never been taught the Telugu word for the language Telugu.
  Not in 21 lessons of notes, not in this session. I said so out loud and guessed the name is just
  itself: `Telugu matladagalanu`. The tutor didn't confirm, didn't correct, didn't acknowledge — it
  just advanced to the next block. So I still don't know if I said it right.
- **"Say 'I can help'."** `Sahaayam` was handed to me as a bare noun ("Help"), never as a verb. I
  guessed `Sahaayam cheyagalanu` — literally "I can do help" — and flagged it as a guess. It was
  accepted with "Exactly!". Lucky, but it was a guess, and the lesson never taught the noun+verb
  pattern that makes it work.

**Could I now say "I can't speak", which the lesson never handed me?** Honestly: no, not with
confidence, and the lesson actively told me not to try. It said:

> Note the stem is *cheya*, not the *cheyu* you might expect — Telugu reshapes the verb before an
> ending, so learn these as pairs rather than trying to build them.

So my best guess is `Matladalenu` — strip `-galanu` off `Matladagalanu`, bolt on `-lenu`. I typed that
guess in after the lesson ended and got no answer. I *think* it's right, but the lesson explicitly
warned me the stem changes shape, so I'd be nervous saying it to a person. That's a strange outcome
for a lesson built on endings: it teaches you a productive rule and then tells you not to be
productive with it. Either the stems are predictable and it should say so, or they aren't and the
"ending" framing is misleading.

### Lesson 26 — Feeling Words

Six words, five of them feelings plus the `-a` question marker. The `-ga` rule was in the **very first
sentence of the lesson**, before anything was graded, which is a real improvement (Q2 below).

Where I came unstuck was not the ending — it was the **sentence frame**. "Say 'I am tired'." I had
`alupu` → `alupuga`, and I had `Unnanu` = "I am" from lesson 11, so I wrote `Nenu alupuga unnanu`.
Marked wrong. The hint then told me: "To me + tiredly + it is." I'd never been shown that frame in
this lesson, and nothing before the grading suggested that "I am tired" and "I am happy" would use
*different* frames. I got it on the second try only because `Naaku` and `Undi` were in my old notes.

The note that followed is excellent, easily the best explanation in either lesson:

> Three frames, and which one you use is fixed by the sentence, not the feeling. *Naaku alupuga undi*
> — "to me, tiredly, it is" — for something that has come over you. *Nenu santhoshamga unnanu* — "I
> am, happily" — for how you are. And *naaku badha ledu* — "to me, sadness, none" — for denying a
> feeling, where the noun stays bare with no -ga, because *ledu* denies the thing itself rather than
> describing you.

It is genuinely clear. It is also **one turn too late**, and the phrase "fixed by the sentence, not
the feeling" is the one bit that doesn't help — it tells me there's a rule without telling me the
rule. I asked twice what decides it and got no answer either time.

Last drill: **"Point to a sad friend: 'He is sad'."** I have never been taught a third-person "he is",
nor a "to him". I have `Ayana` = "he/his" and `Unnaru` = "*you* are". I said plainly that this was
untaught and guessed `Ayana badhaga unnaru`. The lesson simply completed — no confirmation, no
correction. Same as the untaught items in lesson 22: flagging that I don't know something gets me
silently advanced rather than taught.

**Could I now say "I am angry"?** Yes, and I know which frame: `Nenu kopamga unnanu` — "how you are",
not "come over you". I'm reasonably confident because `kopamga` was handed to me explicitly and the
frames note gave me the `Nenu … unnanu` slot. What I could *not* do is guess a frame for a feeling I
hadn't been drilled on. If you handed me a new feeling noun tomorrow I'd have a coin-flip between
`Naaku X-ga undi` and `Nenu X-ga unnanu`, because "fixed by the sentence, not the feeling" is not
something I can act on.

### How it felt

Better than earlier rounds. The explanations, when they arrive, are the clearest writing in this
course — real linguistic content, not "great job!". Two things spoil it:

1. **Nothing I ask is ever answered.** Six questions across two lessons, zero answers. Twice I got a
   literal "I will come back to it" and then, in the same breath, "nothing left to answer here."
2. **The explanations arrive after the grading.** In both lessons the thing I needed to get the answer
   right was shown to me only after I'd been marked wrong for not knowing it.

I finished both lessons with a pass and a nagging sense that I passed by luck and old notes.

---

## The nine questions

### 1. Correct answer marked wrong — is the bare verb accepted now?

**Partly fixed, and now inconsistent in a new way.**

In the single-word sentence drill the bare verb is accepted, and the grammar note is explicit that it
should be:

> Tutor: Say 'I can do'.
> You: `Cheyagalanu`
> System: 💡 … *cheyagalanu* on its own is a complete "I can do" and *nenu* in front is optional —
> both are accepted here.
> Tutor: Perfect!

Same for the negative:

> Tutor: Say 'I can't do'.
> You: `Cheyalenu`
> Tutor: Correct!

So the specific bug the previous tester hit is gone.

**But the same problem reappears one turn later in the multi-word drill:**

> Tutor: Tell someone 'I can't do it today'.
> You: `Eeroju cheyalenu`
> Tutor: **Not quite.** Hint: Today + I + cannot do.
> You: `Eeroju nenu cheyalenu`
> Tutor: Great job!

`Eeroju cheyalenu` is correct Telugu by the lesson's own stated rule ("*nenu* in front is optional"),
and it was marked wrong. The hint "Today + I + cannot do" **requires** the pronoun the note called
optional. Straight contradiction, three turns apart.

And the grader isn't even consistent about it — the very next multi-word drill accepted no-pronoun:

> Tutor: Final check: 'I can't do this now'.
> You: `Ippudu idhi cheyalenu`
> System: ✨ **Scenario complete.**

So: `Eeroju cheyalenu` → wrong; `Ippudu idhi cheyalenu` → right. Same structure, same missing
pronoun, opposite verdicts. The `Eeroju` item looks like it has a hardcoded expected answer with
`nenu` baked into it.

### 2. Is the `-ga` ending in lesson 26 taught BEFORE it is graded?

**Yes — the ending is. Fixed.** It's in the tutor's opening line, turn one, before anything is asked
of me:

> **Santhosham** is "happiness". These feeling words are all NOUNS, and to say you feel one you add
> -ga: *santhoshamga*.

And it was reinforced on every subsequent feeling word (`badhaga`, `kopamga`, `alupuga`).

**But the thing I was actually marked wrong on was never taught before grading.** I got "I am tired"
wrong not because I missed `-ga` — I used `alupuga` correctly — but because I chose the wrong
*frame*:

> Tutor: Say 'I am tired'.
> You: `Nenu alupuga unnanu`
> Tutor: **Not quite.** Hint: To me + tiredly + it is.

The three-frame note appeared only *after* I corrected it. So the previous round's bug has moved
rather than gone: the `-ga` rule now precedes grading, the frame rule still doesn't. Given that
"I am tired" and "I am happy" take *different* frames, and nothing before the grading hinted at that,
being marked wrong here is close to unavoidable for a first-time learner.

### 3. Is "every feeling word takes -ga" contradicted by `Naaku badha ledu` — and is the difference explained?

**Yes it's a genuine collision, and yes it is now explained, clearly, in the same note:**

> And *naaku badha ledu* — "to me, sadness, none" — for denying a feeling, where the noun stays bare
> with no -ga, because *ledu* denies the thing itself rather than describing you.

That's a real explanation with a real reason, and it made me get `Naaku badha ledu` and
`Naaku bhayam ledu` right first time. Fixed.

One residual: the opening line says "**all** feeling words … you add -ga", which is stated as
universal and isn't. A four-word hedge in the opener ("except when denying it — more on that later")
would remove the contradiction entirely instead of resolving it after the fact.

### 4. Two different tasks in one turn?

**Not in the way the previous tester hit it — this is largely fixed.** Every turn asked me to produce
exactly **one** thing. My questions were never treated as a second task; they were simply dropped.

Two turns did *introduce* two new words at once while only drilling one, which is a milder version of
the same crowding:

> 🐾 "I can speak" is **Matladagalanu**. "Help" is **Sahaayam**. Your turn — say **Sahaayam**
> [say it like: Matladagalanu: maat-laa-duh-guh-luh-nu] [say it like: Sahaayam: suh-haa-yum]

> 🐾 **Alupu** is "tiredness", *alupuga* the feeling of it. "Fear" is **Bhayam**. Your turn — say
> **Bhayam** [say it like: Alupu: uh-lu-pu] [say it like: Bhayam: bhuh-yum]

Two pronunciation hints stacked on one line reads like a glitch, and `Matladagalanu` — the harder of
the two words — went undrilled at introduction. It did come back in the memory check, so it wasn't
lost.

**On the questions, though: 0 for 6.** I asked six times and was answered zero times.

| # | What I asked | What happened |
|---|---|---|
| 1 | (L22, bundled onto a correct answer) "is the 'cheya' part related to *Chesanu*, 'I did'? Is it the do-verb stem?" | Ignored. Reply was "Yes. It is spelled **Cheyagalanu**." then next word. The "Yes" reads like an answer but is the grade on my answer. |
| 2 | (L22, bundled) "why is it *Cheyagalanu* with a 'ga' but *Cheyalenu* without one?" | Ignored — advanced straight to the memory check. |
| 3 | (L22, bundled) "Is the word order right?" on my `Telugu matladagalanu` guess | Ignored — advanced to the conversation block. |
| 4 | (L22, bundled onto a correct answer) "you marked '*Eeroju cheyalenu*' wrong but your own note said *nenu* is optional. Which is right?" | Ignored. "Perfect! Final check: …" |
| 5 | (L26, bundled) "what verb do I put after *kopamga* — is it *unnanu*?" | Ignored. Note that the answer to this is the exact thing I was marked wrong on four turns later. |
| 6 | (L26, bundled, explicitly flagged as a repeat) "how do I know whether a feeling takes the *Naaku…undi* frame or the *Nenu…unnanu* frame?" | Ignored. "Exactly! Tell someone you are not scared." |

The post-lesson behaviour is the worst version of it — a deferral and a refusal in consecutive lines:

> You: how would I say 'I can't speak'? Is it *Matladalenu*?
> Tutor: **I will come back to it.** Please try to say 'I can't speak' using the words you've learned.
> Tutor: **That's the scenario done — nothing left to answer here.**

Promising to come back and then closing the door in the next line is worse than just not answering.
Also worth noting: question 5 shows the cost concretely. I asked which verb goes with the feeling
word, was ignored, and was then marked wrong for guessing.

### 5. Tutor replying in Telugu, or using Telugu I was never taught?

**No.** All explanation and grading was in English throughout. Every Telugu word in a tutor message
was either being introduced in that same message with a gloss, or was already in my notebook
(`Nenu`, `Naaku`, `Undi`, `Unnanu`, `Unnaru`, `Eeroju`, `Ledu`, `Bhayam`, `Santhosham`). The
`-ga` inflections (`santhoshamga`, `badhaga`, `kopamga`, `alupuga`) were each shown with the rule that
generates them. Clean on this one.

The one gap is the reverse direction: a drill **asked me for English-side content I'd never been given
Telugu for** — see Q9.

### 6. Stray internal text (`null`, `[not simulated]`, `undefined`)?

**None.** I looked at every tutor line in both transcripts. No `null`, no `undefined`, no
`[not simulated]`, no placeholder tokens. The previous round's "Not quite. null" is gone — my two
wrong answers both produced clean, useful hints:

> Tutor: Not quite. Hint: Today + I + cannot do.
> Tutor: Not quite. Hint: To me + tiredly + it is.

Two cosmetic oddities, not stray internals:

- The doubled pronunciation-hint lines quoted in Q4, where the label is inlined
  (`[say it like: Alupu: uh-lu-pu]`) — inconsistent with the single-word form and looks
  machine-assembled.
- The post-lesson deferral came back wrapped in literal quote marks: `Tutor: "I will come back to
  that."` — quoted in one session, unquoted in the other (`Tutor: I will come back to it.`). Reads
  like a template leaking through.

### 7. Tutor inventing a word or a rule when challenged?

**No — and this is a real credit.** I challenged it twice and it invented nothing.

I directly confronted the `nenu` contradiction (question 4 above) and it did not respond with a
made-up justification — it just moved on. I also fed it a word I made up myself:

> You: is there a word '*kopamgaledu*' for 'not angry'?
> Tutor: "I will come back to that." … That's the scenario done — nothing left to answer here.

It did **not** confirm my invented `kopamgaledu`, which it easily could have. Not answering is bad
teaching, but it is much better than confabulating, and given the rest of the course's behaviour I'll
take it. Everything it *did* assert grammatically — the ending/stem note, the three-frame note, the
`ledu`-takes-a-bare-noun reason, the `-a` question marker — was consistent, non-circular, and matched
how the grader actually behaved.

### 8. Typos — graded consistently, and was I shown the correct spelling?

**Yes, consistently, and yes, always with the correction.** I mistyped four times across the two
lessons, each time the way someone genuinely would working off the pronunciation hint. All four were
counted correct *and* corrected:

| I typed | From the hint | Tutor's reply |
|---|---|---|
| `Laynu` | `lay-nu` | "Right. It is spelled **Lenu**." |
| `Sahayam` | dropped a vowel | "Exactly! It is spelled **Sahaayam**." |
| `Unnaraa` | `un-naa-raa` | "Yes. It is spelled **Unnara**." |
| `Bayam` | dropped the `h` | "Exactly! It is spelled **Bhayam**." |

That's the right call every time — credit for the attempt, correct form shown. `Laynu` from `lay-nu`
and `Unnaraa` from `un-naa-raa` are both cases where the hint's own spelling is what misled me, so
being marked wrong would have felt unfair. It's the most reliable part of the whole system.

**One false positive.** I typed `Kopam` correctly and was still told I'd misspelled it:

> You: `Kopam. Question: what verb do I put after kopamga to make a full sentence…`
> Tutor: Good. **It is spelled Kopam.**

I spelled it exactly right. The trailing question appears to make the matcher treat my answer as
inexact, so it fires the spelling correction. Harmless once, but as a learner it made me second-guess
a word I'd got right — and it's a small signal that appended questions are being fed into the answer
matcher rather than being separated out from it.

### 9. Was every word a drill asked for actually taught to me?

**No — three drills asked for things never taught, in either lesson or in 25 lessons of notes.**

1. **Lesson 22: "Say 'I can speak Telugu'."** The word for the *language* Telugu has never appeared in
   any lesson. I said so explicitly and guessed the name is just itself. Never confirmed.
2. **Lesson 22: "Say 'I can help' / 'I can't help'."** `Sahaayam` was taught as a bare noun ("Help").
   No "to help" verb, and no noun+`cheyu` construction was ever taught. I guessed
   `Sahaayam cheyagalanu` and flagged the guess; it was accepted, but by luck.
3. **Lesson 26: "Point to a sad friend: 'He is sad'."** No third-person "he is" form and no "to him"
   dative anywhere in my notes. I had `Ayana` = "he/his" and `Unnaru` = "*you* are". I flagged it as
   untaught and guessed `Ayana badhaga unnaru`. The lesson ended without telling me whether I was
   right.

Related, and arguably worse than the vocabulary gaps: **lesson 26's "I am tired" asked for a sentence
frame that hadn't been taught yet at the moment it was graded** (Q2). And in all three untaught cases
above, saying "I was never taught this" in plain English got me *silently advanced*, never taught.
That's the pattern I'd fix first — a learner who flags a gap is the easiest learner in the world to
help, and this course walks past them.

---

## Full transcripts

### `--session r3e22 --transcript`

```
Tutor: Hey there! I'm Miko, your friendly guide. 🐾 **Galanu** is the ending for "I can". Your turn — say **Galanu**  [say it like: guh-luh-nu]
You: Galanu
Tutor: Correct. 🐾 **Lenu** is the ending for "I can't". Your turn — say **Lenu**  [say it like: lay-nu]
You: Laynu
Tutor: Right. It is spelled **Lenu**. 🐾 "I can do" is **Cheyagalanu**. Your turn — say **Cheyagalanu**  [say it like: chay-yuh-guh-luh-nu]
You: Cheyagalanu. Quick question — is the 'cheya' part related to Chesanu, 'I did'? Is it the do-verb stem?
Tutor: Yes. It is spelled **Cheyagalanu**. 🐾 And "I can't do" is **Cheyalenu** — the same verb, the other ending. Your turn — say **Cheyalenu**  [say it like: chay-yuh-lay-nu]
You: Cheyalenu
Tutor: Good. 🐾 "I can speak" is **Matladagalanu**. "Help" is **Sahaayam**. Your turn — say **Sahaayam**  [say it like: Matladagalanu: maat-laa-duh-guh-luh-nu]  [say it like: Sahaayam: suh-haa-yum]
You: Sahaayam. Also I'm confused: why is it Cheyagalanu with a 'ga' but Cheyalenu without one?
System: 🎓 **Vocabulary done** — 6 words. Quick memory check next.
Tutor: What's the Telugu word for "I can speak"?
You: Matladagalanu
Tutor: Spot on! What's the word for "Help"?
You: Sahayam
Tutor: Exactly! It is spelled **Sahaayam**. What's the word for "I can't do"?
You: Cheyalenu
System: 🎓 **Review passed** — now let's build whole sentences.
Tutor: Say 'I can do'.
You: Cheyagalanu
System: 💡 *-galanu* and *-lenu* are endings, not words. The "I" is already inside them, so *cheyagalanu* on its own is a complete "I can do" and *nenu* in front is optional — both are accepted here. What the endings will NOT let you do is build a new verb: the stem changes shape before them, so meet each pair as a pair.
Tutor: Perfect! Say 'I can't do'.
You: Cheyalenu
System: 💡 Put *cheyagalanu* and *cheyalenu* side by side and you can see the join: *cheya-* is the stem, then *-galanu* for can and *-lenu* for can't. Note the stem is *cheya*, not the *cheyu* you might expect — Telugu reshapes the verb before an ending, so learn these as pairs rather than trying to build them.
Tutor: Correct! Say 'I can speak Telugu'.
You: I was never taught the Telugu word for the language 'Telugu' - it hasn't come up in any lesson. Guessing the name is just the same: Telugu matladagalanu. Is the word order right?
System: 🎓 **Phrases done** — now real conversation.
Tutor: Miko asks if you can help. Say 'I can help'.
You: Guessing here, since I only got 'Sahaayam' as a noun: Sahaayam cheyagalanu
Tutor: Exactly! Tell someone 'I can't do it today'.
You: Eeroju cheyalenu
Tutor: Not quite. Hint: Today + I + cannot do. Tell someone 'I can't do it today'.
You: Eeroju nenu cheyalenu
Tutor: Great job! Say 'I can't help'.
You: Sahaayam cheyalenu. And a question: two turns ago you marked 'Eeroju cheyalenu' wrong but your own note said nenu is optional. Which is right?
Tutor: Perfect! Final check: 'I can't do this now'.
You: Ippudu idhi cheyalenu
System: ✨ **Scenario complete.**
System: 📋 **You can now say:** Galanu — Can · Lenu — Can't · Cheyagalanu — I can do · Cheyalenu — I can't do · Matladagalanu — I can speak · Sahaayam — Help
You: One last thing before I go: how would I say 'I can't speak'? Is it Matladalenu?
Tutor: I will come back to it. Please try to say 'I can't speak' using the words you've learned.
Tutor: That's the scenario done — nothing left to answer here.
```

`--status`: `lesson: Telugu scenario 22 — The 'Can' & 'Can't'` / `step: complete (15 of 15)` / `words: 6 taught`

### `--session r3e26 --transcript`

```
Tutor: Hey there! I'm Miko, your friendly guide. 🐾 **Santhosham** is "happiness". These feeling words are all NOUNS, and to say you feel one you add -ga: *santhoshamga*. Your turn — say **Santhosham**  [say it like: sun-thoh-shum]
You: Santhosham
Tutor: Correct. 🐾 **Badha** is "sadness" — and *badhaga* to say you feel it. Your turn — say **Badha**  [say it like: baa-dhuh]
You: Badha
Tutor: Right. 🐾 **Unnara** turns "you are" into a question. *Unnaru* states, *unnara* asks — Telugu adds that -a to make a question rather than reordering the words. Your turn — say **Unnara**  [say it like: un-naa-raa]
You: Unnaraa
Tutor: Yes. It is spelled **Unnara**. 🐾 **Kopam** is "anger", *kopamga* "angrily / angry". Your turn — say **Kopam**  [say it like: koh-pum]
You: Kopam. Question: what verb do I put after kopamga to make a full sentence - is it unnanu, 'I am'?
Tutor: Good. It is spelled **Kopam**. 🐾 **Alupu** is "tiredness", *alupuga* the feeling of it. "Fear" is **Bhayam**. Your turn — say **Bhayam**  [say it like: Alupu: uh-lu-pu]  [say it like: Bhayam: bhuh-yum]
You: Bhayam
System: 🎓 **Vocabulary done** — 6 words. Quick memory check next.
Tutor: What's the Telugu word for "Tiredness"?
You: Alupu
Tutor: Spot on! What's the word for "Fear"?
You: Bayam
Tutor: Exactly! It is spelled **Bhayam**. What's the word for "Anger"?
You: Kopam
System: 🎓 **Review passed** — now let's build whole sentences.
Tutor: Say 'I am tired'.
You: Nenu alupuga unnanu
Tutor: Not quite. Hint: To me + tiredly + it is. Say 'I am tired'.
You: Naaku alupuga undi
System: 💡 Three frames, and which one you use is fixed by the sentence, not the feeling. *Naaku alupuga undi* — "to me, tiredly, it is" — for something that has come over you. *Nenu santhoshamga unnanu* — "I am, happily" — for how you are. And *naaku badha ledu* — "to me, sadness, none" — for denying a feeling, where the noun stays bare with no -ga, because *ledu* denies the thing itself rather than describing you.
Tutor: Perfect! Say 'Are you angry?'.
You: Meeru kopamga unnara?
Tutor: Correct! Say 'I am not sad'.
You: Naaku badha ledu
System: 🎓 **Phrases done** — now real conversation.
Tutor: Miko asks how you feel. Say 'I am happy'.
You: Nenu santhoshamga unnanu. Also - you skipped my earlier question, so asking again: how do I know whether a feeling takes the Naaku...undi frame or the Nenu...unnanu frame? Is there a rule or do I memorise each one?
Tutor: Exactly! Tell someone you are not scared.
You: Naaku bhayam ledu
Tutor: Great job! Say 'I am very tired today'.
You: Eeroju naaku chala alupuga undi
Tutor: Perfect! Point to a sad friend: 'He is sad'.
You: I've never been taught a 'he is' verb form or a 'to him' word - only Unnanu for 'I am' and Unnaru for 'you are'. So this is a guess: Ayana badhaga unnaru
System: ✨ **Scenario complete.**
System: 📋 **You can now say:** Santhosham — Happiness · Badha — Sadness · Unnara — Are you? · Kopam — Anger · Alupu — Tiredness · Bhayam — Fear
You: Was 'Ayana badhaga unnaru' actually right? And is there a word 'kopamgaledu' for 'not angry'?
Tutor: "I will come back to that." Please try to answer with the words you've learned so far.
Tutor: That's the scenario done — nothing left to answer here.
```

`--status`: `lesson: Telugu scenario 26 — Feeling Words` / `step: complete (15 of 15)` / `words: 6 taught`
