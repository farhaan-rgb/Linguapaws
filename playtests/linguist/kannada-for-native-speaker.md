# Kannada: questions for a native speaker

Six yes/no questions. Target register: everyday Bengaluru Kannada. Every other verdict in `kannada-verdicts.json` has been applied (2026-10-16). The drills named below are held back (not live) until answered.

1. **Would you say "Ondu neeru beku"** (ಒಂದು ನೀರು ಬೇಕು) when ordering water? Yes: approve seed k7-2. No: k7-2 becomes *neeru kodi* or is removed.
2. **Is "Naanu Kannada kalite"** (ನಾನು ಕನ್ನಡ ಕಲಿತೆ, L30) natural? No: L30 heads with *kalitukonde* and keeps *kalite* accepted. (k30-g5 already uses *kalite*, the L30 headword.)
3. **Is the bare noun natural before a postposition** ("Meju mele", "Pustaka kelage", "Nimma snehita jote", L21)?
   Yes: approve k21-g2 and k21-g4. No: L21 heads with *mejina mele / pustakada kelage / snehitana jote*, and both drills are rewritten.
4. **Is a singular noun fine after respectful ivaru/avaru** ("Avaru nanna shikshaka", "Ivaru nimma snehita", L6)?
   Yes: approve k6-2 and k6-g2. No: they become *shikshakaru / snehitaru*.
5. **Is "aatana" ("his") everyday Bengaluru speech?** Yes: approve k6-3 and k5-g1. No: L5 teaches *avana*, and every *aatana* answer changes with it.
6. **For a child reaching for a hot pan, would you say "Idu maadabaaradu"** (L23)? No: L23 teaches *maadabeda* for a direct "don't".

## Added by the grammar-order pass (2026-10-16)

These come from `tools/grammar-check.mjs Kannada`. The pass explained the
endings the course used without naming them, and reused a few structures that
appeared once and never again. Anything that needed a call on natural Kannada
was left as a question here and not changed.

7. **Is "-ina means 'of'; a word ending in -e takes -a (maneya)"** a fair one-line rule for a beginner? It is now in L21's *Meju* teach line. No: say what to write instead.
8. **Is "Naanu illi ide"** acceptable for "I am here" (L3 C3 accepts it)? *Ide* is "it is", so it reads as a person-ending error. No: remove it from the accepted answers.
9. **Is "Alli hogu" natural for "Go there"** (L3), or should it be *allige hogu*? Telugu just moved to the dative *akkadiki* for the same drill. No: L3 teaches *allige*.
10. **Drills to reuse structures that appear once.** Approve, fix or reject each one. None of them is in the course yet.
    - L28 conv: "It's raining, you must not go": *Male baruttide, neevu hogabaaradu* (reuses -baaradu from L23).
    - L29 or L30: "Really? The bus is coming?": *Hauda? Bassu baruttideya?* (reuses -uttide from L28).
    - L30 phrase: "I can speak a little Kannada now": *Eega nanage swalpa Kannada baruttade* (reuses -ade from L22).
    - L24 conv: "My friends are coming too": *Nanna snehitaru kooda baruttaare* (reuses -aru from L8; *baruttaare* is not taught).
    - L28 conv: "I have the ticket on me": *Nanna hattira tiket ide* (reuses *nanna hattira* from L27, which no later lesson uses).
