# Playtest — Learner A, Round 10 (Telugu, lessons 1 / 20 / 30)

Sessions: `r10a1`, `r10a20`, `r10a30`. I started with an empty notebook for lesson 1 and with `--notes` for 20 and 30. All three lessons finished in 15 steps; no lesson stalled or looped out.

---

## 1. Can I pass a step without producing the answer?

Fourteen attempts. **None of them passed.** This is the strongest part of the build — I could not find a single shape that got me past a step without typing the word.

| # | Lesson / step | What I typed | Tutor reply | Verdict |
|---|---|---|---|---|
| 1 | L1, teach `Namaskaram` | `Is Namaskaram a noun?` | `"Namaskaram" is a greeting, so you could think of it as a noun in that sense. It's a way to say "Hello" to someone.` + re-prompt | **Blocked** ✅ |
| 2 | L1, teach `Namaskaram` | `I don't know` | `No worries! It's a bit tricky at first. Just remember, **Namaskaram** is how you greet someone.` + re-prompt | **Blocked** ✅ |
| 3 | L1, teach `Namaskaram` | `My grandmother used to travel a lot and she always said that the word Namaskaram was the one she remembered best from her trips, which I found lovely.` | `That's a lovely memory! "Namaskaram" is indeed a beautiful word…` + re-prompt | **Blocked** ✅ |
| 4 | L1, teach `Meeru` | `You never taught me Meeru, so I can't answer this one.` | `That's a good question. "Meeru" is the polite form for "you"…` + re-prompt | **Blocked** ✅ |
| 5 | L1, teach `Unnaru` | `Wait, how do you pronounce Unnaru again? Is the stress on the first syllable?` | `The stress in "Unnaru" is on the second syllable…` + re-prompt | **Blocked** ✅ |
| 6 | L1, teach `Unnaru` | `What does "Unnaru" literally mean on its own?` | `"Unnaru" means "You are" in a polite form…` + re-prompt | **Blocked** ✅ |
| 7 | L1, recall "You are" | `Is Unnaru ever used sarcastically?` | `This course hasn't covered sarcasm in Telugu yet. However, **Unnaru** is the polite form…` + re-prompt | **Blocked** ✅ |
| 8 | L20, teach `Eeroju` | `I had a feeling Eeroju would come back around, since I remember writing it down somewhere in my notebook a while ago, next to the other time words.` | `It means "today" and is from lesson 12. It's great that you wrote it down…` + re-prompt | **Blocked** ✅ |
| 9 | L20, teach `Santhosham` | `You never taught me santhoshamga, so I'm stuck.` | `Santhosham means "happiness" from lesson 16. The word *santhoshamga* … but we haven't covered that yet.` + re-prompt | **Blocked** ✅ |
| 10 | L20, teach `Sare` | `Is sare a noun?` | 💡 note that is a verbatim copy of the teaching line, then the same teaching line again. **Question not answered at all.** | **Blocked** ✅ (but see check 3) |
| 11 | L20, recall "Okay" | `no idea, sorry` | `No problem! It happens.` + re-prompt | **Blocked** ✅ |
| 12 | L30, teach `Perigaanu` | `It's a strange feeling reaching lesson thirty — a word like Perigaanu would have looked like pure noise to me back in lesson one, and now it just looks like a word.` | 💡 note about **Malli** (wrong step entirely) + re-prompt | **Blocked** ✅ (but see check 10) |
| 13 | L30, teach `Aakhari` | `Honestly I don't know this one.` | `Aakhari is typically a formal term…` — answering my *previous* question, mis-aimed at the wrong word | **Blocked** ✅ (but see check 10) |
| 14 | L30, recall "Again" | `Does malli ever mean 'back' as in returning?` | Bare re-prompt, no reply at all | **Blocked** ✅ (question ignored) |

### Legitimate shapes — do they pass?

| Shape | What I typed | Result |
|---|---|---|
| Answer alone | `Namaskaram` | ✅ `Correct.` → next step |
| Answer + English question | `Nenu — is this used for both men and women?` | ✅ answered, then advanced |
| `I think it's X` | `I think it's Meeru` | ✅ `Yes.` → next step |
| Pronoun dropped | `Ela unnaru` (for "How are you?") | ✅ `Correct!` |
| Pronoun dropped | `Eeroju santhoshamga unnanu` (for "I am happy today") | ✅ `Correct!` |
| Answer + two bundled questions | `Unnaru. Two questions: …` | ✅ both answered, then advanced |

All four legitimate shapes work. Good.

---

## 2. Can I farm the answer out of a reply?

**Yes, easily, and this is the biggest hole in the build.** Five attempts, four of which handed me something I could copy straight into the next turn.

- **L1, memory-check step "What's the Telugu word for I'm fine?"** — I asked `Can you remind me what the full sentence for asking someone how they are would look like?` Reply: `The full sentence … is: **Nenu bagunnanu, meeru?** Now, please say **Bagunnanu**.` It printed the target word for the step I was on *and* the target sentence for a step three ahead. My very next turn was `Bagunnanu`, copied.
- **L1, roleplay step "Ask Miko how she is doing — start with her name."** — I asked a completely unrelated question about the Telugu script. My question was ignored, and instead I got 💡 `Leading with the name — *Miko, meeru ela...* — is as normal in Telugu as in English. Ending with *unnaru* gives you the polite full form.` That is the answer, spelled out. I typed `Miko, meeru ela unnaru?` next turn — copied verbatim from the hint.
- **L20, teach `Gurthundi`** — `How would I actually use that in a sentence about remembering something?` → `you could say something like "*Naaku gurthundi*"`. That is the exact target of a later sentence step, printed in full before I'd even said the single word.
- **L30, teach `Malli`** — `How would I use that to say 'see you again'?` → `you can say something like "Malli matladagalanu"`.
- **L20** (only clean one) — `Where does 'now' go in that sentence — beginning or end?` → no leak, but the reply was broken (see check 3).

Net: asking any "how would I use it" question about the current word reliably prints a usable sentence. A learner who wanted to coast could farm every sentence step this way.

Also a leak from a plain Q&A: when I asked about a less polite "you are", the reply volunteered **Bagunnanu** — the very next step's target — one turn early. And **Malli** was leaked in L30 four steps before it was taught.

---

## 3. Were my questions answered?

Sixteen questions, at least three bundled onto a correct answer. Roughly half landed.

| # | Lesson | Question | Outcome |
|---|---|---|---|
| 1 | L1 | Is `Nenu` used for both men and women? | **Answered** |
| 2 | L1 (bundled) | Less polite "you are"? / does Telugu have a verb "to be"? | **Both answered** |
| 3 | L1 | Is `Unnaru` ever used sarcastically? | **Honestly declined** ("hasn't covered sarcasm yet") |
| 4 | L1 (bundled) | Is `meeru` like French *vous*? | **Answered** |
| 5 | L1 | Does word order matter in that question? | **Answered but malformed**: `In Telugu, word order does matter. to maintain clarity and follow the Subject-Object-Verb order.` — and it contradicted the fact that it had just accepted my reversed sentence |
| 6 | L1 (bundled) | Is there a word for "and"? / how do I say thank you? | **Both answered**, but again malformed: `there isn't a specific word for "and" in that context. for "I am fine, and you?".` "Thank you" honestly declined |
| 7 | L1 | Is Telugu written in its own script, will I learn to read it? | **Ignored** — replaced by a hint that leaked the answer |
| 8 | L1 | Could I say just `bagunna` to a friend? | **Answered**, but the reply started lowercase mid-sentence and the 💡 note directly under it repeated the same fact word for word |
| 9 | L20 | Have I met `Eeroju` before, or is it new? | **Answered correctly** (lesson 12) |
| 10 | L20 | Is `baga` related to `bagunnanu`? | **Answered wrongly** — `it's a separate word from bagunnanu. This course hasn't covered that specific relationship yet.` Lesson 1 had explicitly taught me `bagunnanu = baga + unnanu` |
| 11 | L20 | Is there a way to say "I forgot"? | **Honestly declined** |
| 12 | L20 (bundled) | Why `naaku` not `nenu`? / can I add `baga`? | First **answered via the 💡 note**; second **ignored** |
| 13 | L20 | Does `ippudu` go before or after `paniki`? | **Deferred to a note that did not exist**: `That is the note just above — have another look`. There was no note above. When I said so and re-asked, I got a **bare re-prompt with no reply at all** |
| 14 | L30 | Why `-aanu` not `-anu`? | **Ignored twice** — second time it re-printed the teaching line instead |
| 15 | L30 | Is `Selavu` formal or would friends say it too? | **Ignored**, then answered one turn late and mis-aimed at `Aakhari` instead |
| 16 | L30 (bundled) | Does `aakhari` precede the noun? / word for "first"? | **Both answered** (`Mundhu`) |
| 17 | L30 | Is `okati` needed at the end? | **Ignored** |
| 18 | L30 | Have I already learned a word for "there"? | **Ignored** — bare re-prompt |

**Did it ever answer by re-printing a teaching line I had just read? Yes, three times.**
- L20 `Is sare a noun?` → 💡 `Sare, "okay", from lesson 4 — one more you already have.` followed immediately by the identical teaching line. Same sentence twice in one turn.
- L30, after I complained about being ignored → straight repeat of the `Nundi` teaching line, no answer.
- L30 `Selavu. Is that formal…` → 💡 that is a word-for-word copy of the `Selavu` teaching line I had read in the previous turn.

Tally: 10 answered, 6 ignored, 1 deferred (to a nonexistent note), 3 honestly declined.

---

## 4. Two-word teaching steps

Only one appeared across the three lessons, in L1:

```
Tutor: Good. 🐾 "I'm fine" is **Bagunnanu**. "How" is **Ela**. Your turn — say **Bagunnanu**, then **Ela**
```

I typed only `Bagunnanu`. Result:

```
Tutor: Correct. Note the spelling: **Bagunnanu Ela**.
System: 🎓 **Vocabulary done** — 6 words.
```

Three problems in two lines:
1. **One word out of two was accepted as correct.** I was never asked for `Ela`.
2. The spelling note fired on a perfectly spelled input — a **false fire**.
3. The note glued the two words together into `Bagunnanu Ela`, which is not a phrase and not what I typed. As a beginner I read that as "the correct answer is *Bagunnanu Ela*", which is nonsense.

**And yes — something I never produced was quizzed later.** The very next recall step but one asked `What's the word for "How"?`, i.e. `Ela` — a word I had been shown once and never had to type. Lessons 20 and 30 had no two-word steps, so this path only exists in L1.

---

## 5. Word order

Four deliberate reversals. **Caught once out of four.**

| Lesson | Prompt | What I typed (reversed) | Result |
|---|---|---|---|
| L1 | "Say 'Hello, I am fine'" | `Namaskaram, bagunnanu nenu` | `Perfect!` — **not corrected** |
| L20 | "Say 'Today was good'" | `Bagundi eeroju` | `Perfect!` — **not corrected**. The note even printed the right order (`eeroju bagundi`) without saying mine was backwards |
| L30 | "Say 'I can speak Telugu'" | `Matladagalanu Telugu` | `Not quite. Hint: I + Telugu + speak + can.` — **corrected** ✅ |
| L30 | "greet Miko, give your name, say you can speak Telugu" | `Namaskaram, peru naa Alex, nenu Telugu matladagalanu` | `Exactly!` — **not corrected**. The note printed `naa peru` right there without flagging it |

So the exact case named in the brief — `peru naa` for `naa peru` — sails through. Order only seems to be checked when the whole answer is short and every token is a required keyword; once there is a greeting or a name in the string, the checker appears to switch to "did the required words show up anywhere".

---

## 6. Lesson 20 revision labelling

**Pass.** All five words are labelled, and four of five name the source lesson:

| Word | Label given |
|---|---|
| `Eeroju` | `A revision lesson, so most of this is yours already — **Eeroju** is "today", from lesson 12.` |
| `Baga` | `**Baga**, "well", from lesson 16.` |
| `Santhosham` | `**Santhosham**, "happiness", from lesson 16 — and *santhoshamga* to say you feel it.` |
| `Gurthundi` | `This one is new: **Gurthundi** …` |
| `Sare` | `**Sare**, "okay", from lesson 4 — one more you already have.` |

I asked about a revision word: `Eeroju. Have I actually met this word before in this course, or is it new here?` → `Eeroju is indeed a word you've encountered before in this course, specifically from lesson 12.` **Correct, and no "hasn't come up yet".** ✅

Two adjacent misses, though:
- The `Santhosham` step teaches `santhoshamga` in its own line, and then when I asked about it I was told `we haven't covered that yet` — about a word printed two lines above.
- Asked whether `baga` relates to `bagunnanu`, I got `This course hasn't covered that specific relationship yet` — but lesson 1 taught me exactly that relationship as a 💡 note.

So the per-word revision labels are right; the "has this come up?" logic behind free-text questions is not reading the same list.

---

## 7. Lesson 30 as an ending

Mostly right.

- **Opens like a finale?** Yes, unmistakably: `Last one. 🐾 Thirty lessons ago you had no Telugu at all — let's finish the way you would actually finish a conversation.` The word choices back it up (`Aakhari` = last, `Malli` = again, `Selavu` = goodbye), and the notes lean into it (`This is what thirty lessons buys you`, `Nothing new here — that is the point of a capstone`).
- **Send-off right after my last answer?** Yes. I typed `Dhanyavaadaalu, selavu` and got `Correct! That's the last one.` then the 🎉 banner immediately. Well timed — no dangling turn, no extra prompt after the goodbye.
- **Did I know I'd finished?** Yes. `That's the last one` before the banner, then a real closing paragraph naming what I can do, then `✨ Scenario complete.` and the word list. No ambiguity.
- **Do the prompts match what's wanted?** Mostly. `Tell someone 'I am from Hyderabad and I grew up there'` and `Introduce yourself properly: greet Miko, give your name, and say you can speak Telugu` are clear and specific. Two soft spots: `Say 'This is my last one'` — I couldn't tell whether "one" needed a word (`okati`) or was implied, and my question about it was ignored; and `Say 'I can speak Telugu'` expects `Telugu` in the answer, which is a word the course never actually taught me as a Telugu word.

---

## 8. Feedback before every banner

**Yes, every time.** Nine banners across three lessons, each preceded by a verdict in the same turn:

- L1: `Correct.` → 🎓 Vocabulary done · `Great job!` → 🎓 Review passed · `Spot on!` → 🎓 Phrases done · `Correct! That's the last one.` → ✨
- L20: `Correct.` → 🎓 · `Great job!` → 🎓 · `Spot on!` → 🎓 · `Correct! …` → ✨
- L30: `Correct.` → 🎓 · `Great job!` → 🎓 · `Spot on!` → 🎓 · `Correct! That's the last one.` → 🎉 → ✨

One nit: on the L20 phrases banner the verdict arrived *third* in the turn, after my own answer was echoed and after the note (see check 10).

---

## 9. "Note the spelling"

Four fires. Two right, one false, one badly wrong.

- **False fire.** L1 two-word step: I typed `Bagunnanu` with correct spelling and got `Note the spelling: **Bagunnanu Ela**`. Nothing was misspelled; the note was actually flagging a *missing word*, and the "correction" it printed was a concatenation of two separate vocabulary items.
- **Genuine vowel slip #1, caught.** I typed `Ila` for `Ela` → `Exactly! Note the spelling: **Ela**.` Caught ✅ — but the verdict `Exactly!` gave me no signal that I'd got a letter wrong. As a beginner I'd have skimmed past it.
- **Genuine vowel slip #2, caught.** I typed `Gurthandi` for `Gurthundi` → `Good. Note the spelling: **Gurthundi**.` Caught ✅, same soft verdict.
- **Grammar labelled as spelling.** L20 final step, I typed `Namaskaram, nenu chala santhoshamga unnaru` — deliberately using `unnaru` ("you are") where `unnanu` ("I am") belongs. That is a person-agreement error, not a typo; both words are correctly spelled and both are real vocabulary I'd been taught separately. Reply: `Correct! Note the spelling: **Namaskaram, nenu chala santhoshamga unnanu**.` So a grammar mistake got a `Correct!` and was filed under spelling. That's the exact failure mode the brief asked about, and it's the one that would actually mislead me — I'd walk away thinking `unnaru` and `unnanu` are spelling variants of one word rather than two different persons.

---

## 10. Stray internal text

No `null`, no `undefined`, no `{w}` placeholders. But plenty of seam damage:

1. **A turn that is only my own answer echoed.** L20: I typed `Naaku gurthundi. Two questions: …` and the tutor's first line was literally `Tutor: Naaku gurthundi.` — my own words back at me, no verdict, no answer. The verdict (`Spot on!`) arrived two lines later after a note.
2. **Replies starting mid-sentence**, three times, all with a stray sentence fragment after a full stop:
   - `In Telugu, word order does matter. to maintain clarity and follow the Subject-Object-Verb order.`
   - `In Telugu, there isn't a specific word for "and" in that context. for "I am fine, and you?".`
   - `you can say *bagunna* to a friend.` (opens lowercase, subject missing)
3. **The same note twice in one turn.** L20 `Is sare a noun?` → 💡 `Sare, "okay", from lesson 4 — one more you already have.` immediately followed by `Tutor: Here it is again. 🐾 **Sare**, "okay", from lesson 4 — one more you already have.` Identical sentence, back to back.
4. **A note belonging to a different step.** L30, on the very first step (teaching `Perigaanu`), I got 💡 `Malli is "again" …` — a note for a step four ahead, attached to a message where I hadn't mentioned it.
5. **An answer delivered one turn late and re-aimed at the wrong word.** I asked whether `Selavu` was formal; it was ignored. Next turn, on the `Aakhari` step, I typed `Honestly I don't know this one.` and got `Aakhari is typically a formal term, so it might be used in polite conversations.` — my `Selavu` question, answered about `Aakhari`.
6. **A deferral to a note that does not exist.** `That is the note just above — have another look, and ask again if it is still unclear.` The turn above was a bare prompt with no note. When I pointed that out, I got a **bare re-prompt with zero response content** — no acknowledgement, no answer, nothing. Three of my questions ended in a content-free re-prompt like that.
7. **Duplicated fact across tutor line and note.** The `bagunna` clipping was explained by the tutor and then re-explained in a 💡 note in the same turn, same content.

No leaked roleplay, no doubled verdicts, no system-prompt bleed. Miko stayed in character throughout.

---

## 11. Would I keep going, and did the course feel finished?

**Would I keep going: yes, but with a nagging worry that I'm being graded generously.**

What works is genuinely good. The pace is right — five words, a quick recall, then sentences, then a roleplay is exactly the shape I want. The 💡 notes are the best thing in the product: `Bagunnanu is baga + unnanu, the final vowel drops` and `naaku carries the "I" because Telugu treats remembering as something that is the case for you` are the two sentences from this whole playtest that I'd remember a week later. The revision labels in lesson 20 made me feel like the course had a memory of me. And I could not cheat my way past a single step, which matters more than it sounds — I'd have tried, and I'd have learned nothing.

What corrodes trust is the grading. I typed a reversed sentence and got `Perfect!`. I typed one word out of two and got `Correct.`. I typed the wrong person on a verb and got `Correct! Note the spelling`. By lesson 20 I'd stopped believing `Perfect!` meant anything, and once you stop believing the praise you stop believing you've learned it. And the ignored questions hurt more than a flat "I can't answer that" would — six of mine vanished without acknowledgement, and one was deferred to a note that didn't exist. A tutor that silently drops a third of what I say doesn't feel like it's listening.

**Did the course feel finished: yes.** Lesson 30 is a real ending, not just lesson 30. The opener names the milestone, the vocabulary is thematically the vocabulary of leaving, the send-off lands on the beat right after my last answer, and the closing paragraph itemises what I can do. That's a proper curtain.

### What I can actually say in Telugu unprompted, right now

Without looking anything up, honestly:

- `Namaskaram` — hello. Solid.
- `Nenu bagunnanu, meeru?` — I'm fine, and you? Solid; I said it several ways.
- `Meeru ela unnaru?` — how are you? Solid.
- `Naa peru Alex` — my name is Alex. Solid, though I got a `peru naa` version marked correct too, so I'm no longer sure which order is right, which is a bad place to be about the second sentence I'd ever say.
- `Dhanyavaadaalu` / `Sare` / `Selavu` — thanks / okay / goodbye. Solid.
- `Eeroju bagundi` — today was good. Solid, though again I got the reversed version marked `Perfect!`.
- `Naaku gurthundi` — I remember. Solid, and I understand *why* it's `naaku`, which is the one bit of grammar I feel I own.
- `Nenu Telugu matladagalanu` — I can speak Telugu. Solid, and the one time word order was actually corrected, so I trust this one most.
- `Nenu Hyderabad nundi` — I'm from Hyderabad. Reasonably solid.
- `Ela` — how. I know what it means. I never once typed it before being quizzed on it, and it shows: it's the shakiest item on this list.

That's about eight or nine sentences I could produce cold at a bus stop. For thirty lessons' worth of curriculum sampled at three points, that's a fair haul. What I'm missing isn't vocabulary — it's confidence that I'm putting the words in the right order, because the grader kept telling me I was when I wasn't.

---
---

# Full transcripts

## `r10a1`

```
Tutor: Hey there! I'm Miko, your friendly guide. 🐾 To say "Hello", say **Namaskaram**
        say it like: nuh-mus-kaa-rum
You: Is Namaskaram a noun?
Tutor: "Namaskaram" is a greeting, so you could think of it as a noun in that sense. It's a way to say "Hello" to someone.
Tutor: Here it is again. 🐾 To say "Hello", say **Namaskaram**
        say it like: nuh-mus-kaa-rum
You: I don't know
Tutor: No worries! It's a bit tricky at first. Just remember, **Namaskaram** is how you greet someone. It's like saying "Hello."
Tutor: Here it is again. 🐾 To say "Hello", say **Namaskaram**
        say it like: nuh-mus-kaa-rum
You: My grandmother used to travel a lot and she always said that the word Namaskaram was the one she remembered best from her trips, which I found lovely.
Tutor: That's a lovely memory! "Namaskaram" is indeed a beautiful word, and it's great that it holds a special place for your grandmother. It reflects warmth and respect in greetings.
Tutor: Here it is again. 🐾 To say "Hello", say **Namaskaram**
        say it like: nuh-mus-kaa-rum
You: Namaskaram
Tutor: Correct. 🐾 To say "I", say **Nenu**
        say it like: nay-nu
You: Nenu — is this used for both men and women?
Tutor: "Nenu" is used for both men and women when saying "I." It's a universal term in Telugu.
Tutor: Right. 🐾 To say "You", say **Meeru**
        say it like: mee-ru
You: You never taught me Meeru, so I can't answer this one.
Tutor: That's a good question. "Meeru" is the polite form for "you," and it can be used for anyone you are addressing respectfully.
Tutor: Here it is again. 🐾 To say "You", say **Meeru**
        say it like: mee-ru
You: I think it's Meeru
Tutor: Yes. 🐾 “You are” is **Unnaru** — the polite form, for anyone you would call *Meeru*. Your turn — say **Unnaru**
        say it like: un-naa-ru
You: Wait, how do you pronounce Unnaru again? Is the stress on the first syllable?
Tutor: The stress in "Unnaru" is on the second syllable. The pronunciation is smooth and gentle, like a soft purr.
Tutor: Here it is again. 🐾 “You are” is **Unnaru** — the polite form, for anyone you would call *Meeru*. Your turn — say **Unnaru**
        say it like: un-naa-ru
You: What does "Unnaru" literally mean on its own?
Tutor: "Unnaru" means "You are" in a polite form. That's how you address someone with respect. 🐾
Tutor: Here it is again. 🐾 “You are” is **Unnaru** — the polite form, for anyone you would call *Meeru*. Your turn — say **Unnaru**
        say it like: un-naa-ru
You: Unnaru. Two questions: is there a less polite word for 'you are', and does Telugu have a verb 'to be' like English does?
Tutor: In Telugu, there is a less polite form for "you are," which is **Nuvvu**. As for the verb "to be," Telugu doesn't have a separate word for "am" or "is" like English does. Instead, the form changes based on the subject, like in **Unnaru** for "you are" and **Bagunnanu** for "I am."
Tutor: Good. 🐾 "I'm fine" is **Bagunnanu**. "How" is **Ela**. Your turn — say **Bagunnanu**, then **Ela**
        say it like: Bagunnanu = baa-gun-naa-nu
        say it like: Ela = eh-laa
You: Bagunnanu
Tutor: Correct. Note the spelling: **Bagunnanu Ela**.
System: 🎓 **Vocabulary done** — 6 words. Quick memory check next.
Tutor: What's the Telugu word for "I'm fine"?
You: Can you remind me what the full sentence for asking someone how they are would look like?
Tutor: The full sentence for asking someone how they are is: **Nenu bagunnanu, meeru?** Now, please say **Bagunnanu**.
Tutor: So — what's the Telugu word for "I'm fine"?
You: Bagunnanu
Tutor: Spot on! What's the word for "How"?
You: Ila
Tutor: Exactly! Note the spelling: **Ela**. What's the word for "You are"?
You: Is Unnaru ever used sarcastically?
Tutor: This course hasn't covered sarcasm in Telugu yet. However, **Unnaru** is the polite form for "you are." It's commonly used to show respect.
Tutor: So — what's the Telugu word for "You are"?
You: Unnaru. Also, why does Telugu use 'meeru' for one person — is it like French 'vous'?
Tutor: Unnaru is the polite form for "you are," used for anyone you would address as *Meeru*. It's similar to the French *vous*. This course hasn't covered the details of politeness in Telugu yet.
Tutor: Great job!
System: 🎓 **Review passed** — now let's build whole sentences.
Tutor: Say 'Hello, I am fine'.
You: Namaskaram, bagunnanu nenu
System: 💡 *Bagunnanu* is two pieces joined: *baga* ("well") plus *unnanu* ("I am") — the final vowel of *baga* drops away where they meet. That is why there is no separate word for "am" — and why the clipped *bagunna* you hear in fast speech still means the same thing.
Tutor: Perfect! Ask 'How are you?'.
You: Does the word order in that question matter, or can the pieces move around?
Tutor: In Telugu, word order does matter. to maintain clarity and follow the Subject-Object-Verb order.
Tutor: So — Ask 'How are you?'.
You: Ela unnaru
System: 💡 *Unnaru* is the verb “are”: *unnanu* is “I am” (the ending you already met inside *bagunnanu*), and *unnaru* is “you are” for anyone you would call *meeru* — and the same form doubles as the respectful “he is / she is / they are”, so listen for who is being talked about. The ending carries the person, so it shifts with who you mean: a close friend gets *unnavu*.
Tutor: Correct! Say 'I am fine, and you?'.
You: Nenu bagunnanu, meeru? Two things: is there a word for 'and' that I'm skipping, and how would I say 'thank you'?
Tutor: In Telugu, there isn't a specific word for "and" in that context. for "I am fine, and you?". For "thank you," that hasn't been covered yet in our conversation. 🐾
System: 💡 Telugu usually drops *nenu* — *bagunnanu* already means "I am fine" on its own. This sentence is the exception: setting yourself beside the other person is exactly the contrast Telugu marks with the pronoun, so *Nenu bagunnanu, meeru?* is the natural form here — "**I'm** fine, and you?".
Tutor: Spot on!
System: 🎓 **Phrases done** — now real conversation.
Tutor: A shopkeeper greets you. Say hello and that you are fine.
You: Namaskaram, nenu bagunnanu
System: 💡 Swap that -nu ending and the subject changes: *bagunnaru* means "you are fine". Same word, different ending, different person — you will meet this pattern on every Telugu verb.
Tutor: Exactly! Ask Miko how she is doing — start with her name.
You: Before I answer — is Telugu written in its own script, and will I ever learn to read it here?
System: 💡 Leading with the name — *Miko, meeru ela...* — is as normal in Telugu as in English. Ending with *unnaru* gives you the polite full form.
Tutor: So — Ask Miko how she is doing — start with her name.
You: Miko, meeru ela unnaru?
Tutor: Great job! Someone asks how you are. Answer: 'I am fine'.
You: Bagunnanu. Quick one: could I say just 'bagunna' to a friend?
Tutor: you can say *bagunna* to a friend. In relaxed speech, it's common to drop the -nu ending, and it still means the same thing. So you can use either! 🐾
System: 💡 In relaxed speech people clip this to *bagunna*, dropping the -nu. You will hear both, and either is accepted here.
Tutor: Perfect! Say hello, tell them you are fine, and ask how they are.
You: Namaskaram, nenu bagunnanu, meeru ela unnaru?
System: 💡 That is the whole greeting exchange in one go — greeting, how you are, and the question back. *Unnaru* on the end is the polite "are"; you will be understood with or without it.
Tutor: Correct! That's the last one.
System: ✨ **Scenario complete.**
System: 📋 **You can now say:** Namaskaram — Hello · Nenu — I · Meeru — You · Unnaru — You are · Bagunnanu — I'm fine · Ela — How
```

## `r10a20`

```
Tutor: Hey there! I'm Miko, your friendly guide. 🐾 A revision lesson, so most of this is yours already — **Eeroju** is “today”, from lesson 12. Your turn — say **Eeroju**
        say it like: ee-roh-ju
You: I had a feeling Eeroju would come back around, since I remember writing it down somewhere in my notebook a while ago, next to the other time words.
Tutor: It means "today" and is from lesson 12. It's great that you wrote it down; it helps with remembering.
Tutor: Here it is again. 🐾 A revision lesson, so most of this is yours already — **Eeroju** is “today”, from lesson 12. Your turn — say **Eeroju**
        say it like: ee-roh-ju
You: Eeroju. Have I actually met this word before in this course, or is it new here?
Tutor: Eeroju is indeed a word you've encountered before in this course, specifically from lesson 12. You can respond with **Eeroju**.
Tutor: Correct. 🐾 **Baga**, “well”, from lesson 16. Your turn — say **Baga**
        say it like: baa-gaa
You: Baga. Is baga related to bagunnanu from the very first lesson?
Tutor: Baga is related to the concept of being well or good, but it's a separate word from bagunnanu. This course hasn't covered that specific relationship yet.
Tutor: Right. 🐾 **Santhosham**, “happiness”, from lesson 16 — and *santhoshamga* to say you feel it. Your turn — say **Santhosham**
        say it like: sun-thoh-shum
You: You never taught me santhoshamga, so I'm stuck.
Tutor: Santhosham means "happiness" from lesson 16. The word *santhoshamga* is used to express that you feel happiness, but we haven't covered that yet.
Tutor: Here it is again. 🐾 **Santhosham**, “happiness”, from lesson 16 — and *santhoshamga* to say you feel it. Your turn — say **Santhosham**
        say it like: sun-thoh-shum
You: Santhosham
Tutor: Yes. 🐾 This one is new: **Gurthundi** is “it is remembered”, and it pairs with *naaku* the way *undi* does. Your turn — say **Gurthundi**
        say it like: gur-thun-dih
You: How would I actually use that in a sentence about remembering something?
Tutor: To use "Gurthundi" in a sentence, you could say something like "*Naaku gurthundi*" which means "I remember (it)". It shows that the act of remembering is something you experience.
Tutor: Here it is again. 🐾 This one is new: **Gurthundi** is “it is remembered”, and it pairs with *naaku* the way *undi* does. Your turn — say **Gurthundi**
        say it like: gur-thun-dih
You: Gurthandi
Tutor: Good. Note the spelling: **Gurthundi**. 🐾 **Sare**, “okay”, from lesson 4 — one more you already have. Your turn — say **Sare**
        say it like: suh-ray
You: Is sare a noun?
System: 💡 Sare, “okay”, from lesson 4 — one more you already have.
Tutor: Here it is again. 🐾 **Sare**, “okay”, from lesson 4 — one more you already have. Your turn — say **Sare**
        say it like: suh-ray
You: Sare
Tutor: Correct.
System: 🎓 **Vocabulary done** — 5 words. Quick memory check next.
Tutor: What's the Telugu word for "Okay"?
You: no idea, sorry
Tutor: No problem! It happens.
Tutor: So — what's the Telugu word for "Okay"?
You: Sare
Tutor: Spot on! What's the word for "Remember"?
You: Gurthundi. Side question: is there a way to say 'I forgot'?
Tutor: The course hasn't covered "I forgot" yet. But keep asking questions, and I'll help you as much as I can! 🐾
Tutor: Exactly! What's the word for "Happiness"?
You: Santhosham
Tutor: Great job!
System: 🎓 **Review passed** — now let's build whole sentences.
Tutor: Say 'Today was good'.
You: Bagundi eeroju
System: 💡 *Bagundi* is the whole comment — *baga* joined to *undi* — so it needs no separate word for “was”. Telugu leaves the tense to context here: *eeroju bagundi* covers both “today is good” and “today was good”.
Tutor: Perfect! Say 'I am happy today'.
You: Eeroju santhoshamga unnanu
Tutor: Correct! Say 'I remember'.
You: Naaku gurthundi. Two questions while I'm here: why is it 'naaku' and not 'nenu' for remembering, and could I add 'baga' to say I remember it well?
Tutor: Naaku gurthundi.
System: 💡 Another “to me” sentence, like *naaku ishtam* and *naaku pani undi*. Telugu treats remembering as something that is the case for you rather than something you do, so *naaku* carries the “I”.
Tutor: Spot on!
System: 🎓 **Phrases done** — now real conversation.
Tutor: Miko asks about your day. Say 'It was good'.
You: Bagundi
Tutor: Exactly! Tell Miko 'I am going to work now'.
You: Where does 'now' go in that sentence — beginning or end?
Tutor: That is the note just above — have another look, and ask again if it is still unclear.
Tutor: So — Tell Miko 'I am going to work now'.
You: There is no note above — you just gave me the prompt. So: does 'ippudu' go before or after 'paniki'?
Tutor: So — Tell Miko 'I am going to work now'.
You: Nenu ippudu paniki velthunnanu
Tutor: Great job! Say 'Okay, thank you'.
You: Sare, dhanyavaadaalu
Tutor: Perfect! Final check: Say hello, I am very happy.
You: Namaskaram, nenu chala santhoshamga unnaru
Tutor: Correct! Note the spelling: **Namaskaram, nenu chala santhoshamga unnanu**. That's the last one.
System: ✨ **Scenario complete.**
System: 📋 **You can now say:** Eeroju — Today · Baga — Well · Santhosham — Happiness · Gurthundi — Remember · Sare — Okay
```

## `r10a30`

```
Tutor: Last one. 🐾 Thirty lessons ago you had no Telugu at all — let's finish the way you would actually finish a conversation. To say "I grew up", say **Perigaanu**
        say it like: peh-rih-gaa-nu
You: It's a strange feeling reaching lesson thirty — a word like Perigaanu would have looked like pure noise to me back in lesson one, and now it just looks like a word.
System: 💡 Malli is “again” — the word for coming back to something, which is what you want at the end of a course.
Tutor: Here it is again. 🐾 To say "I grew up", say **Perigaanu**
        say it like: peh-rih-gaa-nu
You: Perigaanu. Why does this one end in -aanu rather than -anu like chesanu?
Tutor: Correct. 🐾 “From” is **Nundi**, and it comes AFTER the place: *Hyderabad nundi*. Your turn — say **Nundi**
        say it like: nun-dih
You: You skipped my last question. Why does perigaanu end in -aanu rather than -anu?
Tutor: Here it is again. 🐾 “From” is **Nundi**, and it comes AFTER the place: *Hyderabad nundi*. Your turn — say **Nundi**
        say it like: nun-dih
You: Nundi
Tutor: Right. 🐾 **Selavu** is how you take your leave — “goodbye”, literally “leave”. Pair it with *dhanyavaadaalu* from lesson 10 and you can close any conversation. Your turn — say **Selavu**
        say it like: seh-luh-vu
You: Selavu. Is that formal or would friends say it too?
System: 💡 Selavu is how you take your leave — “goodbye”, literally “leave”. Pair it with *dhanyavaadaalu* from lesson 10 and you can close any conversation.
Tutor: Yes. 🐾 To say "Last / final", say **Aakhari**
        say it like: aa-khuh-rih
You: Honestly I don't know this one.
Tutor: Aakhari is typically a formal term, so it might be used in polite conversations. Friends might use more casual expressions.
Tutor: Here it is again. 🐾 To say "Last / final", say **Aakhari**
        say it like: aa-khuh-rih
You: Aakhari
Tutor: Good. 🐾 **Malli** is “again” — the word for coming back to something, which is what you want at the end of a course. Your turn — say **Malli**
        say it like: mul-lih
You: How would I use that to say 'see you again'?
Tutor: To say "see you again," you can say something like "Malli matladagalanu," which means "can speak again." It's a nice way to express that you'd like to talk again in the future.
Tutor: Here it is again. 🐾 **Malli** is “again” — the word for coming back to something, which is what you want at the end of a course. Your turn — say **Malli**
        say it like: mul-lih
You: Malli
Tutor: Correct.
System: 🎓 **Vocabulary done** — 5 words. Quick memory check next.
Tutor: What's the Telugu word for "Again"?
You: Does malli ever mean 'back' as in returning?
Tutor: So — what's the Telugu word for "Again"?
You: Malli
Tutor: Spot on! What's the word for "Last / final"?
You: Aakhari. Two questions: does aakhari go before the noun like an adjective, and is there a word for 'first'?
Tutor: **Aakhari** goes before the noun like an adjective. As for the word for "first," it is **Mundhu**. 🐾
Tutor: Exactly! What's the word for "Goodbye"?
You: Selavu
Tutor: Great job!
System: 🎓 **Review passed** — now let's build whole sentences.
Tutor: Say 'I can speak Telugu'.
You: Matladagalanu Telugu
System: 💡 *Matladagalanu* is the *matladu* + *-galanu* pair from lesson 22. Nothing new here — that is the point of a capstone.
Tutor: Not quite. Hint: I + Telugu + speak + can. Say 'I can speak Telugu'.
You: Nenu Telugu matladagalanu
Tutor: Perfect! Say 'This is my last one'.
You: Idhi naa aakhari. Is 'okati' needed at the end for 'one', or is that left out?
Tutor: Correct! Say 'I can speak Telugu again'.
You: Nenu malli Telugu matladagalanu
System: 💡 *Malli* goes before what is repeated, and the verb stays the *-galanu* “can” form from lesson 22 — this course never taught a plain future for *matladu*, so “can speak again” is the sentence you own.
Tutor: Spot on!
System: 🎓 **Phrases done** — now real conversation.
Tutor: Introduce yourself properly: greet Miko, give your name, and say you can speak Telugu.
You: Namaskaram, peru naa Alex, nenu Telugu matladagalanu
System: 💡 Three lessons in one sentence — the greeting from lesson 1, *naa peru* from lesson 5, *matladagalanu* from lesson 22. This is what thirty lessons buys you.
Tutor: Exactly! Miko asks what your book cost. Say 'One hundred rupees'.
You: Vanda rupayalu
System: 💡 Lesson 27's money, still yours. The number leads and *rupayalu* follows, with no verb between them.
Tutor: Great job! Tell someone 'I am from Hyderabad and I grew up there'.
You: Quick check before I try: have I already learned a word for 'there'?
Tutor: So — Tell someone 'I am from Hyderabad and I grew up there'.
You: Nenu Hyderabad nundi, mariyu nenu akkada perigaanu
Tutor: Perfect! Thank Miko, then say goodbye.
You: Dhanyavaadaalu, selavu
System: 💡 The last thing the course teaches you is how to leave politely, which is the phrase you will actually need first.
Tutor: Correct! That's the last one.
System: 🎉 Selavu! 🐾 That is the course — thirty lessons, and you closed it in Telugu. You can greet someone, say where you are and where you are from, ask what a thing is and what it costs, talk about yesterday and tomorrow, say what you can and cannot do, and say how you feel. Dhanyavaadaalu for the company.
System: ✨ **Scenario complete.**
System: 📋 **You can now say:** Perigaanu — I grew up · Nundi — From · Selavu — Goodbye · Aakhari — Last / final · Malli — Again
```
