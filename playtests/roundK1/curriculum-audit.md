# Kannada curriculum — independent content audit (before round K1 reports)

Written by reading the 10 Kannada lessons directly, against my own knowledge of
Kannada. Deliberately done *before* the learner reports came in, so the two are
independent evidence. Confidence stated per item.

Comparison point: Telugu has 30 lessons, a `grammarNote` on most drills, `teach`
strings on most vocabulary, and a documented phonetic scheme applied throughout.
Kannada has 10 lessons, roughly one note per lesson, and — see below — three of
those notes are attached to the wrong drill.

---

## A. Sentences that are not grammatical Kannada

These are the serious ones: the course declares them correct and drills them.

1. **L3 "Final Check: Say 'I am going home'" → `Naanu manege hogu`** — high confidence.
   `hogu` is the bare informal imperative ("go!"). The sentence therefore reads
   "I go!" — it is not "I am going". The real form is *Naanu manege hoguttene*.
   The course never teaches a single finite verb, so it cannot express this
   sentence at all; the drill papers over that with an imperative.
   (`gap-check` sees the *manege* half of this — an unseen dative ending on
   *mane* — but not that the sentence is ungrammatical.)

2. **L9 "Tell Miko the food is good" → `Oota olleya`** — high confidence.
   *olleya* is attributive only: it must sit in front of a noun (*olleya oota*,
   "good food"). Used predicatively it is ungrammatical. "The food is good" is
   *Oota chennagide*, or *Oota olleyadu*.

3. **L9 "Describe your house as small" → `Nanna mane chikka`** — high confidence.
   Same fault. *chikka* is attributive; predicatively it needs *chikkadu* /
   *chikkadaagide*.

   L9 teaches five adjectives, drills three of them attributively (correct) and
   two predicatively (incorrect), and carries no note that Kannada distinguishes
   the two positions. That distinction is the whole content of the lesson and it
   is both untaught and mistaught.

4. **L3 "Tell someone to go here" → `Illi hogu`** — medium-high confidence.
   Not ungrammatical so much as not something anyone says: motion towards the
   speaker takes *baa* ("come"). *Illi baa*. The English prompt "go here" is
   already odd, which is the tell.

5. **L3 "Say 'I am here'" → `Naanu illi`** — medium confidence.
   Verbless. Acceptable in clipped speech, but the course taught *chennagiddini*
   in L1, which contains the very copula (*iddini*) this sentence needs, and
   never connects them. *Naanu illi iddini* is the full form.

## B. Drills whose English prompt does not match the answer

6. **L2 "Tell Miko 'This is my book' (using Idu pustaka)" → `Idu pustaka`.**
   The prompt asks for "my book"; the answer means "this is a book"; the
   `meaning` field says "This is a book". The prompt is simply wrong — and it
   asks for *nanna*, which is not taught until L5.

7. **L8 "Tell Miko you have four friends" → `Nanna naalku snehitaru`.**
   That phrase means "my four friends" — a noun phrase, not a statement. "I have
   four friends" is *Nanage naalku snehitaru iddare*. The course has no way to
   say "have", so the prompt should not ask for it.

8. **L7 "Ask for two waters" → `Eradu neeru beku`** — minor. Passable.

## C. Grammar notes attached to the wrong drill

The engine shows a `grammarNote` when its own drill is answered. Three of
Kannada's ten notes are on a drill they have nothing to do with — so the learner
gets an explanation of a word that is not on screen.

9. **L4** — the note *"Illa serves as 'no', 'not' and 'isn't', and it goes at the
   end"* is attached to **"Say 'I want water'" (`Neeru beku`)**. *Illa* is not in
   that sentence. It belongs on the *Illa* drill in the same lesson.
10. **L5** — the note *"Kannada makes no gender distinction in the formal form —
    avara covers both 'his' and 'her'"* is attached to **"Say 'My name'"
    (`Nanna hesaru`)**. It belongs on the *Avara* drill.
11. **L10** — the note *"That -i ending on kodi is the polite command form"* is
    attached to **"Ask 'How much?'" (`Estu?`)**. It belongs on `Lekka kodi`.

## D. Romanization and phonetics that disagree with themselves

The file header documents one scheme: short u → `u`, long uu → `oo`; short i →
`ih`, long ii → `ee`. The header claims "all of Kannada now follows it". It does
not.

12. **`Neeru` (L4) is hinted `nee-roo`.** ನೀರು ends in a short u — it is
    *nee-ru*, and Telugu's identical word is correctly hinted `nee-ru` in the
    same file. A learner typing from the hint writes "neeroo".
13. **`Estu` (L10) is hinted `ehsh-tu`.** The spelling has no *sh*; ಎಷ್ಟು is
    *eshtu*. Spelling and hint disagree, and the spelling is the one that loses.
14. **`Chennagiddini` (L1) is hinted `chehn-naa-gih-dee-nih`.** By the file's own
    scheme `dee` is long ii, so the spelling should be *chennagiddeeni*. Also
    `chehn-naa` writes short e + long aa for what is long e + long aa
    (*chennaagi*). This is precisely the defect the header says was fixed in
    Telugu L11-L30 — the hint disagrees with the string the learner must type,
    which is where typos come from.
15. **`Kathey` (L5)** — ಕಥೆ is *kathe*. The course writes *Mane*, not *Maney*,
    for the identical ending, so the -ey spelling is internally inconsistent.
16. **`Akka` (L6) is hinted `ak-kah`** — the only `-ah` in the whole Kannada
    section; the scheme says short a is `uh`. Should be `uk-kuh`.

## E. Things taught in an order that cannot work

17. **L2 asks "What is your name?" → `Nimma hesaru yenu?` but *nimma* is not
    taught until L5.** Confirmed by `gap-check` as the one out-of-order word.
18. **L8 teaches `Snehitaru` ("friends") in a lesson whose stated rule is that
    -galu makes plurals.** Kannada pluralises human nouns with -aru, not -galu.
    The lesson never says this, so its one rule is contradicted by its own second
    example, one line later. High confidence, and the kind of thing a learner
    notices immediately.
19. **L8 teaches `Hoovugalu` ("flowers") without ever teaching *hoovu*
    ("flower").** The learner cannot decompose the only example that would show
    the suffix attaching to a stem they know.
20. **L7 drills `Eradu pustaka` ("two books") and L8 drills `Mooru pustakagalu`
    ("three books").** Both are acceptable Kannada, but the course presents them
    one lesson apart with no acknowledgement that it just contradicted itself.

## F. Structural gaps

21. **No finite verb anywhere in ten lessons.** Every "verb" taught (*hogu*,
    *kodi*) is an imperative. The learner finishes the course unable to say "I
    am going", "I eat", "he came" — any tensed sentence. *Beku*/*beda* are not
    verbs in the relevant sense. This is the single biggest ceiling on what the
    course can deliver.
22. **L10 is titled "Review & Survival Dialogue" and reviews nothing.** It
    introduces five new words and recombines earlier vocabulary in exactly one
    drill (*Pustaka estu?*). There is no consolidation lesson in the course.
23. **The dative (-ge/-ige) is used twice (*manege*) and taught zero times.**
    It is the case a beginner needs most: to a place, to a person, "I want" 
    (*nanage ... beku*).
24. **Lessons 1-5 have no `icon`/`color`; lessons 6-10 do.** Cosmetic, but it is
    the visible sign that lessons 6-10 were written by a different pass.
