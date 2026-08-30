# The voice stack

What should speak Telugu, Odiya and Kannada to a beginner, what should listen
to them, and what — if anything — can honestly score how they said it.

Every vendor claim below carries the URL it came from and the date it was
checked. Speech lineups change monthly; nothing here was answered from memory.
Where a claim is a vendor's own marketing number rather than something measured,
it says so. Where something could not be verified, it says **unverified** rather
than guessing.

All checks in this document were made on **2026-08-30**. Dollar figures use
**$1 = ₹95.39** ([ECB via frankfurter.app](https://api.frankfurter.app/latest?from=USD&to=INR),
rate dated 2026-08-28).

---

## 0. The finding that should be read first

**A learner speaking Odiya into this app is not being graded.** Not graded
badly — not graded at all.

Deepgram rejects the request outright. Asked for `language=or`, the API returns
`Bad Request: No such model/language/tier combination found` (measured against
the live API with the repo's own key, 2026-08-30), which is why
`backend/routes/ai.js` correctly skips it. What it skips *to* is Whisper — and
Whisper has never seen Odia. The model's own language table lists 100 languages
and Odia is not one of them
([openai/whisper tokenizer.py](https://raw.githubusercontent.com/openai/whisper/main/whisper/tokenizer.py),
checked 2026-08-30); the hosted API rejects `language=or`, `ory`, `ori` and
`odi`, and so do `gpt-4o-transcribe`, `gpt-4o-mini-transcribe` and the current
`gpt-transcribe` (all measured 2026-08-30). So Odia audio reaches Whisper on
auto-detect, against a model with no Odia in it, and comes back as Bengali or
Assamese or Hindi-flavoured noise.

That noise is then handed to the transcript-correction pass, whose prompt says,
at `backend/routes/ai.js:461`:

> If the user was specifically asked to say '${targetText}', and the transcript
> sounds phonetically similar to '${targetText}', return exactly '${targetText}'.

The grader then compares that string to the same `targetText`. Thirty lessons of
Odiya — joint-flagship with Telugu — sit on top of a loop that manufactures its
own pass mark. The Deepgram-substitutes-Hindi bug this repo already caught was
the same shape and went unnoticed for months. This one is worse, because the
substitution is not a neighbouring language, it is the right answer.

The fix is not subtle and it is not expensive. **Azure has two real Odia neural
voices and Odia speech-to-text; Sarvam has Odia in both directions; ElevenLabs
Scribe has Odia recognition.** The gap is ours, not the market's.

---

## 1. Text to speech

### What is actually available for our ten languages

The interesting question is not "does this vendor support Indian languages" —
they all say yes — but **does a voice exist that was trained on this language,
or is a multilingual model being handed a script it has to guess at?** For Odia
that distinction eliminates most of the field.

I pulled Google's full voice list rather than trusting a summary of it, and
searched it for each locale:

| Language | Google Cloud TTS | Azure Neural | ElevenLabs v3 | Sarvam Bulbul v3 | OpenAI |
|---|---|---|---|---|---|
| Telugu | Standard ×4, **Chirp3-HD ×30** | `te-IN-MohanNeural`, `te-IN-ShrutiNeural` | `tel` | `te-IN` | — |
| Odiya | **none** | `or-IN-SubhasiniNeural`, `or-IN-SukantNeural` | **none** | `od-IN` | — |
| Kannada | Standard ×4, WaveNet ×4, **Chirp3-HD ×30** | `kn-IN-GaganNeural`, `kn-IN-SapnaNeural` | `kan` | `kn-IN` | listed |
| Hindi | Standard, WaveNet, Neural2 ×4, Chirp3-HD ×30 | 9 neural voices | `hin` | `hi-IN` | listed |
| Tamil | Standard, WaveNet, Chirp3-HD ×30 | 2 neural | `tam` | `ta-IN` | — |
| Bengali | Standard ×4, WaveNet ×4, Chirp3-HD ×30 | 2 neural | `ben` | `bn-IN` | — |
| Marathi | Standard, WaveNet, Chirp3-HD ×30 | 2 neural | `mar` | `mr-IN` | — |
| Malayalam | Standard, WaveNet, Chirp3-HD ×30 | 2 neural | `mal` | `ml-IN` | — |
| Urdu | Standard, WaveNet, Chirp3-HD ×30 | 2 neural | `urd` | **none** | — |
| Punjabi | Standard, WaveNet, Chirp3-HD ×30 (Preview) | 2 neural | `pan` | `pa-IN` | — |

Sources, all checked 2026-08-30:
[Google supported voices](https://docs.cloud.google.com/text-to-speech/docs/list-voices-and-types)
(fetched in full and grepped per locale — `or-IN` returns zero matches and the
strings "Odia" and "Oriya" do not appear on the page at all);
[Chirp 3: HD voices](https://docs.cloud.google.com/text-to-speech/docs/chirp3-hd);
[Azure language support](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=tts);
[ElevenLabs models](https://elevenlabs.io/docs/overview/models.md) (the Eleven v3
"70+ languages" list is enumerated in full and contains no Odia or Oriya);
[Sarvam TTS API reference](https://docs.sarvam.ai/api-reference-docs/text-to-speech/convert.md)
(the `language_code` enum is exhaustive: `bn-IN`, `en-IN`, `gu-IN`, `hi-IN`,
`kn-IN`, `ml-IN`, `mr-IN`, `od-IN`, `pa-IN`, `ta-IN`, `te-IN`);
[OpenAI TTS guide](https://developers.openai.com/api/docs/guides/text-to-speech).

Three things in that table matter more than the rest.

**Google Cloud Text-to-Speech has no Odia voice at any price or quality tier.**
This is not a "Chirp 3 does not cover it yet" situation where a Standard voice
picks up the slack — there is no `or-IN` entry in Google's voice list at all.
The one Google product that speaks Odia is Gemini-TTS, where `or-IN` is listed
as **Preview**
([Gemini-TTS](https://docs.cloud.google.com/text-to-speech/docs/gemini-tts),
checked 2026-08-30). A preview API is not where thirty lessons of the flagship
course should live.

**ElevenLabs, the obvious "just use the good multilingual one" answer, also has
no Odia.** Its own v3 language list runs to seventy-odd languages and includes
Assamese, Sindhi and Chichewa; Odia is absent. Its *speech-to-text* model does
support Odia, which makes the omission on the synthesis side look deliberate
rather than accidental.

**OpenAI's `tts-1-hd`, which the app uses today for every non-English language,
is not documented to support Telugu or Odia.** OpenAI's own guide says TTS
"generally follows the Whisper model in terms of language support" and that
"voices are currently optimized for English"; Whisper's list has Kannada and
Hindi and has neither Telugu nor Odia. I generated the Telugu phrase
నమస్కారం, మీరు ఎలా ఉన్నారు? through `tts-1-hd` and fed the result back to
Whisper, which heard `"Namaskaram! Miru Yelaonaru!"` — an English voice
sounding out a script it does not know, which is exactly what the charter says
and is now measured rather than asserted.

### The recommendation

**Turn Google Chirp 3: HD on for the nine languages it covers, and buy Azure for
Odiya.** Two vendors, because one vendor cannot do it.

Chirp 3: HD is the right choice for the nine because the integration is already
written — `@google-cloud/text-to-speech` is installed, `getGoogleTtsClient()`
exists, and `POST /api/ai/speech` already branches to it — and because thirty
voices per locale for Telugu and Kannada is a different product from Azure's two.
At $30 per million characters
([Cloud TTS pricing](https://docs.cloud.google.com/text-to-speech/pricing),
checked 2026-08-30) with the first million characters each month free, it costs
the same as the `tts-1-hd` we are paying for today and cannot use.

Azure is the right choice for Odiya because it is the only vendor with a
generally-available, purpose-built Odia voice, and at $15 per million characters
([Azure retail prices API](https://prices.azure.com/api/retail/prices),
meter `S1 Neural Text To Speech Characters`, queried 2026-08-30) it is half the
price of the Google tier we are recommending for everything else.

Sarvam Bulbul v3 is the serious alternative for Odia and deserves a listening
test before we commit. It covers `od-IN`, ships 30-plus named personas rather
than two, offers a pronunciation dictionary (`dict_id`) that a language course
could genuinely use, and claims sub-250 ms first-byte streaming. At ₹30 per
10,000 characters — $31.45 per million — it costs twice Azure and roughly what
Chirp 3: HD costs. Its documented latency and quality are **unverified**: I have
no Sarvam key and did not measure it. Note also that Sarvam writes Odia as
`od-IN`, not the `or-IN` every other vendor and our own code uses. That is
exactly the kind of one-character difference that produces a silently
wrong-language voice, which is the failure mode this repo has already lived
through once.

Prices, for the record, all checked 2026-08-30:

| Tier | Price per 1M characters | Free allowance |
|---|---|---|
| Google Standard / WaveNet | $4 | first 4M chars/month |
| Google Neural2 | $16 | first 1M |
| Azure Neural | $15 | free tier: 500K/month |
| **Google Chirp 3: HD** | **$30** | **first 1M** |
| OpenAI `tts-1-hd` (today) | $30 | — |
| Sarvam Bulbul v3 | ₹3,000 ≈ $31.45 | ₹100 signup credit |
| ElevenLabs v3 | $100 | — |
| Google Studio | $160 | first 1M |

### Latency

Measured, from this machine, non-streaming, on the 27-character Telugu phrase
above, two runs each:

| Path | Time to full audio |
|---|---|
| OpenAI `tts-1` | 2.33 s, 3.42 s |
| OpenAI `tts-1-hd` | 2.58 s, 3.73 s |
| Deepgram `nova-3` batch, 2 s clip | 1.69 s, 2.19 s |

Those are honest numbers for the shape of the current code, which awaits the
entire MP3 before playing a byte of it. They are **not** honest numbers for a
mid-range Android on a patchy Indian network, which is the audience — this
machine's egress is not theirs, and the real figure will be worse. Vendor-published
latencies for the streaming alternatives (Sarvam sub-250 ms first byte,
ElevenLabs Flash ~75 ms, ElevenLabs v3 Conversational ~280 ms) are marketing
numbers and are **unverified** here.

The point worth making to a product owner: a two-to-four-second wait before a
beginner hears the word they are about to repeat is not a rounding error, it is
the reason the browser-TTS shortcut was put in front of the paid path in the
first place. Whichever vendor wins, the next latency win after switching is
streaming the first chunk rather than awaiting the file, and that is a code
change in `POST /api/ai/speech`, not a vendor change.

---

## 2. Speech recognition — is Deepgram `nova-3` still right?

### Coverage

Deepgram's current lineup is Flux (streaming, turn-detecting, ten languages —
English, Spanish, French, German, Hindi, Russian, Portuguese, Japanese, Italian,
Dutch), `nova-3` (highest accuracy, no turn detection), and `nova-2` (kept for
languages `nova-3` has not reached)
([Models & Languages Overview](https://developers.deepgram.com/docs/models-languages-overview),
checked 2026-08-30).

Of our ten languages, `nova-3` monolingual covers Hindi, Bengali, Kannada,
Marathi, Punjabi, Tamil, Telugu and Urdu. It does **not** cover Malayalam, and
it does **not** cover Odia. The repo's hardcoded `deepgramSupported` set is
correct on both counts today, which is worth saying out loud, because it was
wrong once before.

Flux does not cover a single one of our four course-carrying languages beyond
Hindi, so the app's most interesting real-time option is closed to us.

The rest of the field:

| | Odia ASR | Telugu | Kannada | Malayalam | Price |
|---|---|---|---|---|---|
| Deepgram `nova-3` | **—** | ✅ | ✅ | **—** | $0.0043/min batch, $0.0048/min stream |
| OpenAI `whisper-1` | **—** | auto-detect only | ✅ | auto-detect only | $0.006/min |
| OpenAI `gpt-transcribe` | **—** | ✅ | ✅ | ✅ | $0.0045/min |
| Sarvam `saaras:v4` | ✅ `od-IN` | ✅ | ✅ | ✅ | ₹30/hr ≈ $0.0052/min |
| ElevenLabs Scribe v2 | ✅ `ori` | ✅ | ✅ | ✅ | $0.22/hr ≈ $0.0037/min |
| Google STT v2 `chirp_2`/`chirp_3` | ✅ `or-IN` | ✅ | ✅ | ✅ | ~$0.016/min, $0.003/min batch |
| Azure Speech | ✅ `or-IN` | ✅ | ✅ | ✅ | $1/hr realtime, $0.18/hr batch |
| AI4Bharat IndicConformer | ✅ (all 22) | ✅ | ✅ | ✅ | self-hosted |

Sources checked 2026-08-30:
[Deepgram pricing](https://deepgram.com/pricing);
[OpenAI pricing](https://platform.openai.com/docs/pricing);
[Sarvam STT reference](https://docs.sarvam.ai/api-reference-docs/speech-to-text/transcribe.md)
and [Sarvam pricing](https://docs.sarvam.ai/api/getting-started/pricing.md);
[ElevenLabs speech-to-text](https://elevenlabs.io/docs/capabilities/speech-to-text.md)
and [ElevenLabs API pricing](https://elevenlabs.io/pricing/api);
[Google STT supported languages](https://docs.cloud.google.com/speech-to-text/docs/speech-to-text-supported-languages)
and [pricing](https://docs.cloud.google.com/speech-to-text/pricing);
[Azure language support](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt)
and the [Azure retail prices API](https://prices.azure.com/api/retail/prices).

### The thing that matters more than word error rate

A speech model that quietly repairs a beginner's mangled attempt into the right
words does not make the app better; it destroys the only measurement the app
takes. So I tested that directly rather than reading about it.

I synthesised a Telugu phrase with a deliberate error in the verb — ఉన్నాము
instead of ఉన్నారు, the mistake a learner actually makes — and gave the same
audio to three transcribers (measured 2026-08-30):

| Model | Returned | Verdict |
|---|---|---|
| `gpt-transcribe` | నామ్స్కారం మీరు ఎలా **ఉన్నారు** | **corrected the learner's error** |
| `gpt-4o-transcribe` | నమస్కారం మీరు ఎలా **ఉన్నాము** | faithful |
| `whisper-1` (auto) | नमसकार मिरु यला उणनम | wrong script entirely |
| `whisper-1` + expected-phrase prompt | నమస్కారం మీరు ఎలా **ఉన్నాము** | right script, error preserved |

That is one clip, on synthesised rather than human audio, so it is a signal and
not a study. But the direction is unambiguous and it inverts the obvious
recommendation. `gpt-transcribe` gives visibly the best Telugu of anything OpenAI
ships — it returned the correct native script when the older models returned
Kannada — and it is precisely the wrong model for a grader, because the quality
comes from normalising toward plausible language. `gpt-4o-transcribe` is worse at
Telugu and better for us.

The fourth row is the encouraging one: giving `whisper-1` a prompt naming the
expected phrase fixed the language detection **without** snapping the answer to
the target. So prompting the transcriber with the target phrase is safe in a way
that instructing an LLM to snap the transcript to it is not.

Two more measured findings from the same session that the code should know:

- **`whisper-1` rejects `language=te`** with
  `Language 'te' is not supported`, despite Telugu being in Whisper's open-source
  language table. The accepted set for our ten is `hi`, `kn`, `ta`, `mr`, `ur`
  (plus `ne`, `en`); rejected are `te`, `bn`, `ml`, `pa`, `or`. The repo's
  `supportedByWhisper` set happens to contain only accepted codes, so nothing
  crashes today — but the comment above it explains the exclusions as a quality
  judgement, and the real reason for Telugu is that the API will 400.
- **`gpt-4o-transcribe` and `gpt-4o-mini-transcribe` accept `language=te`, `ml`
  and `bn` and then ignore them**, returning Kannada script for all three on the
  same Telugu clip. A language parameter that is accepted and disregarded is more
  dangerous than one that errors.

### The alphabet — the defect that was actually losing answers

Everything above is about *which words* come back. The bug a learner reported on
2026-08-30 was about **which alphabet**, and it was costing correct answers on
every Indic language in the product.

The learner started Kannada from zero, hit the first speaking prompt
(`Namaskara`, glossed "Hello"), and said it. The box filled with `Namaste`. They
said it again, correctly, and the screen showed an amber note — *"That came back
written in Kannada script, and this lesson checks the spelled-out form. Say it
once more, or type it."* — above a box **still holding the stale `Namaste`**.

Three separate defects, one screenshot.

**a. No recogniser can be asked for Latin.** Measured against the live APIs on
2026-08-30, on Google's own published `kn-IN-Chirp3-HD-Achernar` sample:

| engine | `language` | returned |
|---|---|---|
| Deepgram `nova-3` | `kn` | `ಮೇಘ ಯಂತ್ರ ಕಲಿಕೆಯೊಂದಿಗೆ …` (conf 0.954) |
| OpenAI `gpt-transcribe` | `kn` | `ಮೇಘ ಯಂತ್ರ ಕಲಿಕೆಯೊಂದಿಗೆ …` |
| OpenAI `whisper-1` | `kn` | `ಮೇಗಾಯಂದ್ರ ಕಳಿಕೆಯೋಂದಿಗೆ …` |

The only romanised Indic code any vendor offers is Deepgram's `hi-Latn`. There
is no `kn-Latn`, `te-Latn` or `or-Latn`. So native script is the **normal** case
for a correct spoken answer, and the course is romanised throughout —
`normalizeLatin` strips everything outside `[a-z0-9]`, which reduces a whole
Kannada answer to the empty string. `Steps.jsx` caught that and refused it. It
was refusing the ordinary case.

**b. The romanising was being done by an LLM, non-deterministically.** The
`gpt-4o-mini` corrector in `backend/routes/ai.js` was, in practice, the
transliterator. Run five times against the production prompt, transcript
`ನಮಸ್ತೆ`, target `Namaskara` (2026-08-30):

```
"ನಮಸ್ಕಾರ"  "ನಮಸ್ಕಾರ"  "ನಮಸ್ಕಾರ"  "Namaste"  "Namaste"
```

Three times the script the app rejects, twice a romanisation. That single line
reproduces both halves of the report: attempt one romanised (to the wrong word,
because Deepgram had misheard `ನಮಸ್ಕಾರ` as `ನಮಸ್ತೆ`), attempt two came back as
script and was thrown away. **The learner's second attempt was correct and was
discarded.**

**c. The box was never cleared.** `onText` was only called on success, and
nothing reset `answer` when a new recording started — so a failed retry left the
previous transcript on screen looking like the current one.

### What shipped

- `shared/transliterate.js` — a deterministic Indic→Latin table. The nine Brahmic
  blocks are laid out in parallel in Unicode (one every 0x80, same letter at the
  same offset), so one offset table romanises Devanagari, Bengali, Gurmukhi,
  Gujarati, Odia, Tamil, Telugu, Kannada and Malayalam. It targets the *course's*
  romanisation, not ISO 15919: `ṇamaskāra` is more correct and scores worse.
- Where the ten courses disagree with each other — Hindi `Theek` against Marathi
  `Mi` for the same long ī, Bengali writing both `Namaskar` and `Kemon` in one
  lesson — the ambiguity is enumerated as candidate spellings and the *matcher*
  picks, with the target in hand. The matcher itself was not loosened by one
  character. `namaste` is still rejected for `Namaskara`.
- `shared/asr.js` — the coverage table, probed rather than remembered, with
  `node tools/stt-check.mjs --probe` to re-derive it.
- The route walks that ladder, and a language with no rung gets
  `error: 'unsupported_language'` **before any audio is sent**. Odiya is that
  language: 30 lessons, no ears.
- A wrong-script guard: we know what script each language is written in, so a
  non-Latin transcript in the wrong one is a language substitution and is
  refused rather than romanised into plausible-looking Latin.
- `tools/stt-check.mjs` — 35 round-trip cases across nine scripts, four negative
  controls, and a regression gate proving the romanisation is inert on all 1,240
  Latin strings in the curriculum.

Two round-trip cases are knowingly unreachable and are printed as such: Punjabi
`ਸਤਿ` → `sati` where the course writes `Sat`, and Malayalam `സുഖം` → `sukham`
where the course writes `Sugam`. Both are the course romanising a different sound
from the one the script writes; no table bridges that. One lesson each.

### Measured latency of the hearing path

Same 1.6 s Kannada clip, 6 runs each, this machine, 2026-08-30:

| engine | min | median | max |
|---|---|---|---|
| OpenAI `gpt-transcribe` | 645 ms | 812 ms | 1025 ms |
| Deepgram `nova-3` | 870 ms | 1227 ms | 1688 ms |
| OpenAI `whisper-1` | 1302 ms | 3718 ms | 6501 ms |

Deepgram was the widest-varying of the three across the session (870 ms to
7850 ms on identical input) and returned an **empty** transcript with confidence
0.000, six times out of six, on one clip that ends mid-word — while
`gpt-transcribe` transcribed the same bytes correctly every time. That is a
mid-word-cut artifact rather than a proven short-utterance failure, and it is
worth knowing because step mode's utterances are single words.

### Biasing: the lever that can help and the lever that cannot

Deepgram's `keyterm` prompting works on `nova-3` monolingual and multilingual and
boosts up to 100 terms
([Keyterm Prompting](https://developers.deepgram.com/docs/keyterm.md), checked
2026-08-30). It is a real accuracy lever and it is exactly the wrong lever here:
feeding the grader's own target phrase to the recogniser makes the recogniser
more likely to hear it whether or not the learner said it. I tried it against
the deliberately-wrong clip and the transcript did not change, but the mechanism
is designed to change it, and we should not build on a boost that happened not to
fire.

Deepgram's `search`, which the code already sends and never reads, is the
opposite and is genuinely interesting. It "searches for terms or phrases by
matching acoustic patterns in audio… rather than trying to look for sufficiently
close matches in the text transcript"
([Search](https://developers.deepgram.com/docs/search.md), checked 2026-08-30),
and returns hits with confidences in `results.channels[0].search` — a field
`backend/routes/ai.js` has never touched. That is a phonetic "did this person
acoustically produce this phrase" score sitting unused in a response we already
pay for. Whether it works when the search term is romanised and the request
language is Telugu is **unverified**; that is a one-afternoon experiment and it
is the cheapest route to a pronunciation signal we have.

### The recommendation

Keep Deepgram `nova-3` for **Hindi**, where it is well covered and where my
control test transcribed a synthesised Hindi phrase correctly while the same
pipeline returned an *empty* transcript for the equivalent Telugu clip and
`Namskaramir yala un narrow.` under `language=multi`. That empty transcript on
accented Telugu is one datapoint on synthetic audio and should not be treated as
a WER measurement — but "listed as supported" and "returns something on a heavy
L1 accent" are different claims, and only the first is documented.

**Run a real A/B before trusting `nova-3` on Telugu and Kannada**, against
Sarvam `saaras:v4` and ElevenLabs Scribe v2, using recordings of actual beginners
from a playtest rather than TTS output. That test is the highest-value piece of
work in this document that I could not do from a terminal.

**For Odiya, adopt Sarvam `saaras:v4` now.** It is the only vendor in the table
that covers Odia *and* offers `mode=verbatim` — "exact word-for-word
transcription without normalization, preserving filler words and spoken numbers
as-is". A grader wants the mode that refuses to tidy up, and Sarvam is the only
one that names it as a product feature. ElevenLabs Scribe v2 is the cheaper
fallback ($0.22/hr against Sarvam's ₹30/hr) and Google `chirp_3` the
already-have-the-account one. All three are **unverified** by me on Odia audio,
because I have keys for none of them; whichever is chosen must be listened to
before it ships.

---

## 3. Pronunciation scoring

The app does not score pronunciation. `POST /api/ai/pronunciation` asks
`gpt-4o-mini` to compare two strings and return a number out of 100, and the
prompt tells it what "Whisper transcribed" as though that were the same thing as
what the learner said. It cannot hear anything. Called from `ShadowCard.jsx` and
`ShadowPractice.jsx`, it produces per-word verdicts and tips about vowel length
for audio it has never been given.

### What real options exist

**Azure Pronunciation Assessment** is the only mature commercial product in this
space and it supports **33 locales**. Of our ten, it covers **Hindi and Tamil**
and nothing else — no Telugu, no Kannada, no Odiya, no Bengali, Marathi,
Malayalam, Urdu or Punjabi
([Azure language support, pronunciation assessment tab](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=pronunciation-assessment),
checked 2026-08-30). It is priced as a speech-to-text add-on at $0.30 per audio
hour on top of the $1/hr recognition
(`S1 Speech to Text Enhanced Feature Audio`, Azure retail prices API,
2026-08-30), which is cheap enough that we would take it if it existed for
Telugu. It does not.

**Speechace** supports six dialects: `en-us`, `en-gb`, `fr-fr`, `fr-ca`, `es-es`,
`es-mx`
([Supported Languages](https://api-docs.speechace.com/getting-started/supported-languages),
checked 2026-08-30). No Indic languages.

**ELSA** is an English-pronunciation product. Its app UI is translated into
Hindi; its assessment is English only
([ELSA API](https://elsaspeak.com/en/elsa-api/), checked 2026-08-30).

**Forced alignment on an open model** is the only route that reaches Telugu,
Kannada and Odia. AI4Bharat's IndicConformer covers all 22 scheduled languages
and is open source
([IndicConformer](https://ai4bharat.iitm.ac.in/areas/model/ASR/IndicConformer/),
checked 2026-08-30); a goodness-of-pronunciation score is a standard construction
on top of a CTC acoustic model's frame posteriors. This is real, it is the
technically correct answer, and it is a GPU, a research effort and a calibration
problem — months, not weeks, and not obviously the best use of them.

### The recommendation

**Keep the fake and stop calling it a measurement.** For eight of our ten
languages, including both flagships, no vendor sells phonetic pronunciation
scoring at all. Pretending otherwise with a number out of 100 is the same class
of error as a Telugu learner hearing an English voice: a confident output that
nobody can tell is wrong.

Concretely: rename what it returns from a score to a verdict about *words*, drop
the 0–100 number in the languages where nothing acoustic is behind it, and change
the per-word "tip" from a pronunciation claim ("Shorten the vowel sound") to what
the data actually supports ("we heard a different word here"). That is a design
and copy change, not an engineering one, and it costs nothing.

Then run the Deepgram `search` experiment from §2. If a phonetic confidence for
"did they acoustically produce this phrase" comes back usable in Telugu, that is
a genuine, cheap, honest signal — weaker than Azure's phoneme-level assessment,
but real, which the current thing is not.

---

## 4. The recommended stack, per language

Empty cells are empty on purpose. A dash means no vendor in this document offers
it for this language and we should say so in the product rather than substitute
something.

| Language | Lessons | TTS | ASR | Pronunciation scoring |
|---|---|---|---|---|
| Telugu | 30 | Google `te-IN-Chirp3-HD-*` | Deepgram `nova-3` `te` ⚠️ *pending A/B vs Sarvam* | — *(word-match only, labelled)* |
| Odiya | 30 | **Azure `or-IN-SubhasiniNeural`** ⚠️ *second vendor* | **Sarvam `saaras:v4` `od-IN`, `mode=verbatim`** ⚠️ *second vendor* | — |
| Kannada | 10 | Google `kn-IN-Chirp3-HD-*` | Deepgram `nova-3` `kn` ⚠️ *pending A/B* | — |
| Hindi | 5 | Google `hi-IN-Chirp3-HD-*` | Deepgram `nova-3` `hi` | Azure Pronunciation Assessment `hi-IN` |
| Tamil | 1 | Google `ta-IN-Chirp3-HD-*` | Deepgram `nova-3` `ta` | Azure Pronunciation Assessment `ta-IN` |
| Bengali | 1 | Google `bn-IN-Chirp3-HD-*` | Deepgram `nova-3` `bn` | — |
| Marathi | 1 | Google `mr-IN-Chirp3-HD-*` | Deepgram `nova-3` `mr` | — |
| Malayalam | 1 | Google `ml-IN-Chirp3-HD-*` | **Sarvam `ml-IN`** ⚠️ *Deepgram has no Malayalam* | — |
| Urdu | 1 | Google `ur-IN-Chirp3-HD-*` | Deepgram `nova-3` `ur` | — |
| Punjabi | 1 | Google `pa-IN-Chirp3-HD-*` ⚠️ *Preview* | Deepgram `nova-3` `pa` | — |

⚠️ marks a compromise, and there are five kinds of them:

- **Odiya needs two vendors nobody else needs.** Google has no voice and Deepgram
  has no model. This is the price of the language, not a mistake in the plan.
- **Telugu and Kannada ASR are marked pending.** `nova-3` lists them; my one
  synthetic test returned an empty Telugu transcript where the same pipeline
  handled Hindi. Listed is not the same as works-on-a-beginner.
- **Malayalam has no Deepgram model**, so its one lesson quietly needs the second
  ASR vendor too. Cheap to absorb once Sarvam is wired for Odiya.
- **Punjabi's Chirp 3: HD voices are Preview.** Fall back to `pa-IN-Wavenet-*`
  if Preview terms are a problem for one lesson's worth of traffic.
- **Eight of ten pronunciation cells are empty** and that is the market, not our
  integration.

There is a legitimate simpler plan worth putting on the table: **Azure for
everything.** Azure has native neural voices for all ten of our languages,
speech-to-text for all ten including Odia, pronunciation assessment for the two
where anyone has it, one credential, one voice map, and TTS at $15/1M — half of
Chirp 3: HD. If the priority is fewest moving parts and lowest bill, that is the
better answer, and the only thing it gives up is thirty Chirp 3 voices per locale
in favour of two older-generation ones. I have not heard either, so the quality
half of that trade is **unverified**; a listening test between
`te-IN-Chirp3-HD-Sulafat` and `te-IN-ShrutiNeural` should settle it before we
commit, and it is an hour's work once both keys exist.

---

## 5. What it costs, per learner-lesson

### What a lesson actually spends

Counted from the code and then from 190 completed 15-step lesson runs in
`.lesson-sim/`:

| | Median | Mean | p90 |
|---|---|---|---|
| Tutor turns spoken per lesson | 25 | 25.4 | |
| Spoken characters per lesson (after `buildSpeechText`) | 1,092 | 1,211 | 1,966 |
| Learner turns per lesson | 16 | 17.3 | 21 |
| Words per learner turn | 2 | 4.27 | |

Twenty-five spoken turns, not fifteen, because a miss produces extra turns and
the greeting is spoken too. Sixteen learner turns at roughly four seconds of
audio each — a two-to-four word phrase plus hesitation plus the recorder's 200 ms
trailing capture — is about **64 seconds of audio per lesson**.

Each of those sixteen transcriptions also fires one `gpt-4o-mini` call for the
correction pass, at $0.15/1M input and $0.60/1M output
([OpenAI pricing](https://platform.openai.com/docs/pricing), checked 2026-08-30).
That prompt is around 600 tokens with the target text and context prompt
interpolated in, so about 9,600 input and 320 output tokens per lesson.

I am costing 1,200 characters of TTS and 64 seconds of ASR per lesson.

#### What the hearing half costs, and what the alphabet fix took off it

64 seconds is 1.067 minutes, so per learner-lesson, ASR alone:

| | per lesson | 30-lesson course |
|---|---|---|
| Deepgram `nova-3` batch @ $0.0043/min | $0.0046 | $0.138 |
| OpenAI `gpt-transcribe` @ $0.0045/min | $0.0048 | $0.144 |
| OpenAI `whisper-1` @ $0.006/min | $0.0064 | $0.192 |
| the `gpt-4o-mini` corrector, 16 calls | $0.0016 | $0.049 |

The corrector was **26% of the hearing bill** and it was mostly being spent on
transliteration it did non-deterministically. It is now skipped entirely whenever
the transcript arrives in a native script — which, for the eight Indic courses,
is nearly every spoken turn. So the hearing half of a Telugu learner's whole
30-lesson course costs about **$0.14**, down from **$0.19**, and the part that
was removed is the part that was producing the bug.

For scale: 5,000 learners each finishing all 30 Telugu lessons is about $690 of
ASR, against $945 before. Neither number is what decides the subscription price;
the TTS side above is roughly ten times larger.

### Per lesson

| Stack | TTS | ASR | Corrector | **Total** |
|---|---|---|---|---|
| **Today** (OpenAI `tts-1-hd` + `nova-3`/Whisper) | $0.0360 | $0.0046 | $0.0016 | **$0.042** |
| **Recommended, nine languages** (Chirp 3: HD + `nova-3`) | $0.0360 | $0.0046 | $0.0016 | **$0.042** |
| **Recommended, Odiya** (Azure Neural + Sarvam `saaras`) | $0.0180 | $0.0056 | $0.0016 | **$0.025** |
| **Azure everywhere** (Neural + Azure batch STT) | $0.0180 | $0.0032 | $0.0016 | **$0.023** |

The headline is the first two rows. **The recommended stack costs the same as
the current one.** We are already paying Chirp-3-HD money for an English voice
reading Telugu script; the difference between what we have and what we should
have is a credential and a voice name, not a budget line.

Blending the recommendation across the course as it stands — Telugu and Odiya
carry sixty of the eighty-one lessons — gives **$0.036 per learner-lesson**.

### Monthly

At one lesson per active learner per day:

| Daily active learners | Lessons/month | Recommended stack | Azure-everywhere | Today |
|---|---|---|---|---|
| 1,000 | 30,000 | **≈ $1,050** (₹100,000) | ≈ $685 (₹65,000) | ≈ $1,265 |
| 10,000 | 300,000 | **≈ $10,700** (₹1,020,000) | ≈ $6,850 (₹653,000) | ≈ $12,650 |

Google's first million TTS characters each month are free, which covers about 830
lessons — visible at 1,000 DAL as a few percent, invisible at 10,000. Azure's
free tier is 500K characters. Neither changes a decision.

Three caveats on those numbers, none of them small:

- **They exclude the tutor LLM.** Generating the lesson text is the dev agent's
  line item, not the voice line item, and at `gpt-4o-mini` prices for the turns
  that go through the model it is of the same order as everything above.
- **They assume every turn hits the paid path.** It does not, and we cannot tell
  how often — see §6, bug 7. On a device with a Telugu voice installed, the
  engine-generated teach turns are spoken free by `speechSynthesis`; the
  LLM-generated conversation turns are paid for regardless. The true bill is
  somewhere below these figures and unmeasurable from the logs as they stand.
- **One lesson per learner per day is a modelling choice, not an observation.**
  Multiply accordingly.

---

## 6. Migration order

Ordered by quality gained per unit of work, not by how interesting the work is.

**1. Fix the Odiya key before turning Google on.** Fifteen minutes. Both language
maps key on `odia` and `or`; the language object in `LearnLanguageSelect.jsx` is
named **`Odiya`**. `resolveLanguageCode('Odiya')` falls through to its `'en-IN'`
default, so the moment credentials land, thirty lessons of Odia script will be
read aloud by an English (India) voice — the exact silent wrong-language failure
this repo's rules exist to prevent, shipped by the act of fixing something else.
Do this first, in the same commit as the credential or before it, and add
`odiya`/`oriya` aliases to both maps.

**2. Turn Google Cloud TTS on, with a named Chirp 3: HD voice.** One credential
and one line. But note that `synthesizeSpeech` is called today with
`{ languageCode, ssmlGender: 'NEUTRAL' }` and no `voice.name`, and Chirp 3: HD
voices can only be selected by name, in the form `<locale>-Chirp3-HD-<voice>` —
so as written, credentials alone would buy us `te-IN-Standard-A`, a 2016-era
voice, at Standard prices, and everyone would reasonably conclude Google was no
better. Pin a voice per language. This is the single largest quality jump in the
document and it is a day's work at most.

**3. Set the language on the step-mode utterance.** `Steps.jsx` reads
`targetLang?.speechCode || targetLang?.code`; the language objects carry `id`,
`name` and `native` and neither of those fields exists, so every step-mode
utterance inherits the system default voice. Step mode has no microphone yet, so
this is the *entire* voice experience of that surface. Reuse `_getLangCode` and
delete the second, broken copy.

**4. Remove the snapping instruction from the corrector prompt.** Rule 3 in the
`/transcribe` prompt tells the model to return `targetText` verbatim when the
transcript "sounds phonetically similar" to it, and the grader then compares that
to `targetText`. Delete the rule. The measured evidence from §2 is that
*prompting the transcriber* with the expected phrase gets the language-detection
benefit without the grading contamination, so move the hint upstream and let the
corrector do only what its name says.

**5. Wire Odiya's real ASR.** Sarvam `saaras:v4`, `language_code=od-IN`,
`mode=verbatim`. Until this ships, Odiya learners are being told they are right
by a coin toss, and the honest interim — per the charter's own rule — is to say
so on the screen rather than keep grading.

**6. Read `results.channels[0].search`.** We already send `search` and already
pay for the response. Log the confidences against known-good and known-bad
learner attempts from a playtest and find out whether they separate. If they do,
that is the first genuine pronunciation signal the product has ever had.

**7. Make the two TTS paths one, and log which engine spoke.** The chat's
`buildSpeechText` (`Chat.jsx:291`) and the inline copy in the backend's
`generateAudio` branch (`backend/routes/ai.js:229`) have diverged: the backend
copy is missing `stripTargetScript`, `cleanupDisplayText`,
`stripLatinDiacritics` and the `<shadow>`/`<word>` unwrapping, so the same
learner in the same lesson hears text built by two different sets of rules
depending on which path served the turn. And because nothing records whether a
given utterance came from `speechSynthesis`, Google, or OpenAI, no quality
complaint about a voice can be traced to the voice that produced it. One shared
function, one field in the response.

**8. Stream the first audio chunk instead of awaiting the file.** Worth doing
only after 1–4, but it is where the next two seconds live.

---

## Bugs found along the way

Recorded, and marked **FIXED** where a later pass closed them. Ordered by how
much damage they do.

1. **`resolveLanguageCode('Odiya')` returns `'en-IN'`.** `backend/routes/ai.js:38`;
   language name at `src/pages/LearnLanguageSelect.jsx:19`. Latent while Google
   is unconfigured; ships a wrong-language voice the moment it is configured.
2. **The corrector is instructed to snap the transcript to the target.**
   `backend/routes/ai.js`. Closes the loop between the grader's question and
   its answer. Still true, and now narrower: the corrector only ever sees Latin
   text, because transliteration moved to a table. It was doing both jobs and
   was not deterministic at either.
3. **Odiya has no ASR anywhere in the stack.** — **half FIXED.** Still true of the
   vendors: no Deepgram model of any generation lists `or`, and `gpt-transcribe`
   rejects all six spellings tried (`or`, `ori`, `ory`, `or-IN`, `odia`,
   `oriya`). What is fixed is the behaviour: it no longer falls through to
   Whisper auto-detect and return confident text in a guessed language. The route
   refuses with `unsupported_language` before sending audio, and both surfaces
   say so in words that do not blame the learner. **Odiya still cannot be spoken
   to.** Thirty lessons. This is the largest open hole in the product.
4. **Chirp 3: HD is unreachable as the call is written.** No `voice.name`, and
   `ssmlGender: 'NEUTRAL'` is not offered for these locales. Credentials alone buy
   a Standard voice.
5. **`_getLangCode('Odiya')` returns `null`.** `src/services/ai.js:257`. The
   browser-TTS ladder never fires for Odiya, so every Odiya utterance goes to the
   server — which, per bug 1, speaks English.
6. **`Steps.jsx` sets no `lang` on its utterance.** `src/pages/Steps.jsx:780`,
   reading two fields that do not exist on the language object.
7. **The charter's mental model of the browser-first ladder is wrong on the main
   chat path.** `getResponse` sends `generateAudio: true`, the backend synthesises
   unconditionally, and `Chat.jsx:1993` prefers that audio over calling
   `generateSpeech` at all. So on LLM-generated turns the paid path runs whether or
   not the device has a Telugu voice; only the engine-generated teach turns
   (`Chat.jsx:1598`, `1689`, `1743`) reach the browser ladder. Worth correcting in
   `agents/linguapaws-voice.md`.
8. **`search: [targetText.toLowerCase()]` is never read.** `backend/routes/ai.js:382`.
   Harmless, and the most promising unused signal in the file.
9. **Two divergent copies of the TTS text builder.** `Chat.jsx:291` versus
   `backend/routes/ai.js:229`.
10. **`whisper-1` would 400 on `language=te`** — **FIXED.** The hand-maintained
    `supportedByWhisper` set is gone; `shared/asr.js` carries the probed truth
    and `tools/stt-check.mjs --probe` re-derives it.
12. **Malayalam was falling through to Whisper auto-detect** — **FIXED.** It is on
    no Deepgram nova model and `whisper-1` rejects `ml`, so every Malayalam
    attempt was transcribed by a model told nothing about the language. Same
    class as the Deepgram-Hindi substitution and equally invisible.
    `gpt-transcribe` accepts `ml` and now carries it.
13. **Both shadowing surfaces sent a language field the route has never read** —
    **FIXED.** `src/pages/ShadowPractice.jsx` and `src/components/ShadowCard.jsx`
    posted `{ language: targetLang.id }`; `/api/ai/transcribe` takes `targetLang`
    and `expectingTargetLang`. So every shadowing attempt in every language was
    transcribed as English, and the pronunciation score was computed against
    whatever English the recogniser could find in Telugu audio.
14. **A spoken answer in native script was deleted on the chat path** — **FIXED.**
    `Chat.jsx` ran `stripTargetScript` over voice input, which removed the target
    script rather than romanising it: a pure-script transcript lost its entire
    content and a mixed one kept only the loanwords.
11. **`filler_words: false` is passed to `nova-3`.** Deepgram documents filler-word
    identification as a reason to stay on `nova-2`. Probably a no-op; **unverified**.

---

## What was measured, and what was not

Measured on 2026-08-30 against live APIs with the repo's own keys: OpenAI
`tts-1`/`tts-1-hd` latency and Telugu output; `whisper-1`, `gpt-transcribe`,
`gpt-4o-transcribe` and `gpt-4o-mini-transcribe` language-code acceptance and
error-preservation behaviour; Deepgram `nova-3` latency, Telugu and Hindi
transcripts, `multi` behaviour, `keyterm` effect, and the `language=or` rejection.
Call counts and character volumes came from 190 completed lesson runs in
`.lesson-sim/`.

Not measured, and marked **unverified** wherever they appear above: anything
about Sarvam, Azure, ElevenLabs or Google Cloud in production, because there are
no keys for any of them in this repo. Every vendor latency figure other than the
three in the table in §1 is the vendor's own published claim. And nobody has yet
done the thing the charter asks for and this document cannot substitute for:
played a Telugu lesson, and an Odiya one, with sound on, and listened.

---

# 7. Can we avoid paying for TTS at all?

**Telugu and Kannada only. Checked and measured 2026-08-30.** No code was
changed in this round. Dollar figures use the same $1 = ₹95.39 as the rest of
this document.

The question from Farhaan was narrow: before creating a Google Cloud credential
and turning on billing, is something free good enough for our two Dravidian
flagships? The answer turned out not to be about vendors at all.

## 7.0 The finding that should be read first

**The entire target-language audio of the Telugu course is 4,488 characters, and
of the Kannada course 1,223.** Counted from `CURRICULUM` — every distinct
`vocabulary[].word`, `phrases[].correct` and `conversations[].correct` across
all 30 Telugu and 10 Kannada lessons, deduplicated: 339 distinct Telugu strings
and 113 distinct Kannada ones, 452 in total, **5,711 characters together**.

Synthesising all of it, once, on the most expensive voice Google sells for these
languages, costs **$0.17**. Google gives away the first million characters every
month. The whole course is *half a percent* of one month's free allowance. You
could re-render both courses in all thirty Chirp 3 voices, every month, for ever,
and never reach the paid tier.

The reason the TTS bill looks like a per-learner cost today is that the app
re-synthesises the same 452 fixed strings at runtime, once per learner per
encounter, for ever. It is not buying anything with that. And measured across
**245 completed lesson runs in `.lesson-sim/`** with `buildSpeechText`'s rules
applied to every assistant turn:

| | Measured |
|---|---|
| Spoken utterances per lesson | 21.0 |
| Spoken characters per lesson | 1,054 |
| — of which is target-language (the bolded phrase) | **59 chars, 5.6%** |
| — of which is English tutor prose | 995 chars, 94.4% |
| Distinct spoken strings across 245 runs | 1,917 of 5,137 → **62.7% would hit a cache** |

That 1,054 sits comfortably beside the 1,092 median this document recorded from
190 runs in §5, so the two counts agree.

**Ninety-four percent of what the app pays to synthesise is English**, and every
Android and iOS device on earth already has a good English voice that costs
nothing. The remaining 5.6% is drawn from a fixed set of 452 strings.

So the honest answer to "can I avoid paying for TTS" is **yes, permanently, at
any scale** — and the route is not a free vendor. It is:

1. **Pre-render the 452 target-language clips** as static audio and ship them.
   One-time, $0.17, on the best voice available. Zero marginal cost per learner.
2. **Let the device speak the English** through `speechSynthesis`, which
   `src/services/speech.js` already does well.

Both of those also fix a quality bug, which is the point of §7.5.

## 7.1 The Android browser path

This is the one already shipped, and the one I can say least about with
certainty. **Neither Farhaan nor I can run an Android device.** Everything below
is documentation plus downloadable samples. This Mac has no Telugu or Kannada
voice at all — `say -v '?'` lists 176 voices whose only Indic entries are `Lekha`
(hi_IN) and `Rishi` (en_IN) — so the `te-IN`/`kn-IN` browser path cannot be
exercised here even in principle.

### Are Android's voices the same models as Google Cloud's?

**No. They are separate catalogues from separate lineages, and the widespread
belief that they are the same comes from a Wikipedia article that conflates two
different Google products.** That article
([Speech Recognition & Synthesis](https://en.wikipedia.org/wiki/Speech_Recognition_%26_Synthesis),
checked 2026-08-30) describes the Android app and then says "Google Cloud
Text-to-Speech is powered by WaveNet" — a true sentence about a different
product, sitting in a paragraph about the phone. Do not rely on it, and I would
not have caught it if I had answered from intuition.

The evidence that they are distinct:

- **Different inventory counts.** Google's own Android post says "All 421 voices
  in 67 languages have been upgraded with a new voice model and synthesizer"
  ([Android Developers Blog, Sept 2022](https://android-developers.googleblog.com/2022/09/listen-to-our-major-text-to-speech-upgrades-for-64-bit-devices.html),
  checked 2026-08-30). Google Cloud advertises 380+ voices in 75+ languages.
  Neither number is a subset of the other.
- **Different naming schemes.** Cloud voices are `te-IN-Standard-A` and
  `te-IN-Chirp3-HD-Achernar` (verified by grepping Google's full voice list,
  below). Android voices are internal three-letter codes exposed as
  `<locale>-x-<code>-local` / `-network`. The sample files attached to that
  Android blog post are named `hic_new.wav`, `hic_old.wav`, `sfg_revised.wav`,
  `iog_revised.wav` — `hic` is the Hindi Android voice, and `sfg`/`iog` are the
  long-familiar en-US Android voice codes. Google's Android and Cloud
  catalogues do not share a single voice name.
- **Different delivery.** Android's local voices are downloadable packs that run
  offline on the phone; Chirp 3: HD is a server-side model Google's own pricing
  page describes as "Powered by our cutting-edge LLMs"
  ([Cloud TTS pricing](https://cloud.google.com/text-to-speech/pricing), checked
  2026-08-30). A phone is not running that offline. Android additionally offers
  *network* voices per locale, which need connectivity and are better than the
  local ones — so "the Android voice" is not even one thing.

### What Android actually ships for te-IN and kn-IN

**Unverified, and I could not close it.** I probed Google's sample host for
Telugu and Kannada equivalents of the Hindi clip — fourteen guesses at
`https://dl.google.com/android/tts/android_dev_blog/<code>.wav` — and every one
returned 404. Hindi is the only Indic Android voice Google has published a
sample of. Whether `te-IN` and `kn-IN` have on-device packs of the same
generation as `hi-IN`, or only network voices, or a 2016-era parametric pack
nobody has refreshed, **is not answerable from documentation** and is exactly
what §7.6 asks Farhaan to find out.

What I could measure is the Hindi one, as a proxy, on the same Deepgram scale as
everything else (see §7.4): the pre-2022 Android Hindi voice and the post-2022
one both transcribe perfectly, at 0.996 and 0.994. Which tells us the voices are
intelligible and tells us nothing about which is nicer — see the warning in §7.4
about what this measurement is worth.

The Sept 2022 post does not name the synthesis architecture. It says only "a new
voice model and synthesizer" and "clearer, more natural voices". Google's
published research on its own mobile TTS runs from LSTM-RNN parametric
synthesis ([Zen et al., 2016](https://research.google/pubs/pub45379)) to fully
neural on-device Tacotron+WaveRNN systems. **Which of those is in the te-IN pack
on a 2026 phone is not documented anywhere I could find.** I am not going to
guess, and the charter is right that a guess here is the expensive kind.

### The one thing that is certain

`src/services/speech.js` already handles the Android form correctly — `pickVoice`
normalises `te_IN` to `te-IN` before matching, which is the underscore form
Android reports. And when no voice is installed it refuses to speak on the chat
path rather than substituting the system default. So the shipped code is ready
for whatever the phone turns out to have. The gap is knowledge, not code.

## 7.2 The free options, verified

Farhaan's sketch was mostly right about which candidates to consider and wrong
about most of them being usable. Corrections in bold.

| Option | Telugu | Kannada | Licence / terms | Free limit | Verdict |
|---|---|---|---|---|---|
| **Google Cloud Chirp 3: HD** | ✅ 30 voices | ✅ 30 voices | commercial | **1M chars/month, recurring** | **the answer** |
| Google Standard | ✅ 4 voices | ✅ 4 voices | commercial | 4M chars/month, recurring | free fallback |
| Google WaveNet | **— none** | ✅ 4 voices | commercial | 4M chars/month (shared SKU) | Kannada only |
| **Azure Neural F0** | ✅ 2 voices | ✅ 2 voices | commercial | **0.5M chars/month, recurring** | real, second account |
| Sarvam Bulbul v3 | ✅ `te-IN` | ✅ `kn-IN` | commercial | **₹100 one-time ≈ 33,000 chars** | ~31 lessons, then paid |
| HF Inference API | — | — | — | **$0.10/month credits** | **dead — see below** |
| Meta MMS-TTS | ✅ `tel` | ✅ `kan` | **CC-BY-NC-4.0** | self-host | **non-commercial — excluded** |
| Indic-Parler-TTS | ✅ | ✅ | Apache-2.0, gated | self-host | usable, heavy |
| AI4Bharat IndicF5 | ✅ | ✅ | **MIT** (not Apache), gated | self-host | usable, heavy |
| Piper | ✅ 3 voices | **— none** | MIT engine / mixed data | self-host | **no Kannada** |
| edge-tts | ✅ `te-IN-ShrutiNeural` | ✅ `kn-IN-SapnaNeural` | **client impersonation** | — | **eval only, never ship** |

Sources and the corrections behind each row, all checked 2026-08-30:

**Google's free tier is the headline and it is recurring.** The pricing page
states it plainly: "You must enable billing to use Text-to-Speech, and will be
automatically charged if your usage exceeds the number of free characters
allowed **per month**". Chirp 3: HD is "0 to 1 million characters" free then $30/1M;
Standard and WaveNet share SKU `9D01-5995-B545` at "0 to 4 million characters"
free then $4/1M; Neural2 1M then $16/1M; Studio 1M then $160/1M
([Cloud TTS pricing](https://cloud.google.com/text-to-speech/pricing)). The
allowances are per-SKU, so 1M Chirp 3 characters *and* 4M Standard/WaveNet
characters are free in the same month. **A credit card is required even to use
the free tier** — that is the one real cost of this route, and it is not money.

**Telugu has no WaveNet voice; Kannada does.** Re-verified by grepping Google's
full voice list: `te-IN` returns 30 Chirp3-HD and 4 Standard and nothing else;
`kn-IN` returns 30 Chirp3-HD, 4 Standard and 4 WaveNet
([supported voices](https://cloud.google.com/text-to-speech/docs/list-voices-and-types)).
So Telugu's cheap tier is `te-IN-Standard-A`, the voice this document has now
twice measured dropping the first half of its own sample sentence.

**Azure's free tier is real and recurring**: 0.5M characters/month for neural
TTS, plus 5 audio hours/month of speech-to-text, both monthly rather than a
12-month trial
([Azure Speech pricing](https://azure.microsoft.com/en-us/pricing/details/cognitive-services/speech-services/)).

**Sarvam's free tier is credits, not an allowance.** ₹100 of one-time signup
credit ([Sarvam pricing](https://docs.sarvam.ai/api/getting-started/pricing.md)),
and at ₹30/10,000 characters that is 33,333 characters — about **31 lessons at
today's 1,054 characters each**, once, and then it is the most expensive option
in the table. It is a trial, not a free tier.

**Hugging Face is dead as a free path, twice over.** Free accounts get **$0.10 of
inference credits per month** and PRO accounts $2.00
([Inference Providers pricing](https://huggingface.co/docs/inference-providers/pricing)).
Ten cents is not a tier. And it does not matter, because *no* Indic TTS model is
actually served: I queried the HF API directly for `facebook/mms-tts-tel`,
`facebook/mms-tts-kan`, `ai4bharat/indic-parler-tts` and `ai4bharat/IndicF5`, and
all four return an empty `inferenceProviderMapping`. The model pages say it
outright — "This model isn't deployed by any Inference Provider." Serving these
means renting a GPU, which is §7.3, not calling a free API.

**MMS-TTS is non-commercial and that is disqualifying.** Both
`facebook/mms-tts-tel` and `facebook/mms-tts-kan` carry `cc-by-nc-4.0` in their
card metadata, confirmed via the HF API rather than read off a badge. It is a
lovely little model — 36M parameters, and §7.3 has real numbers for it — and we
cannot ship it in a paid product.

**IndicF5 is MIT, not Apache-2.0.** A web search told me Apache; the HF API says
`license: mit`. This is why the charter says to check. Both it and
Indic-Parler-TTS (genuinely `apache-2.0`) are `gated: auto` — you must accept
terms while signed in, though approval is automatic rather than a human review.
Worth knowing before someone scripts a download in CI and it 401s.

**Piper has Telugu and no Kannada at all**, which for a course with 10 Kannada
lessons is the whole story. Its three `te_IN` voices also differ in provenance in
a way that matters: `padmavathi` and `venkatesh` are trained on
`ai4bharat/indicvoices_r` under **CC-BY-4.0** — genuinely commercial with
attribution — while `maya` is trained on the IIT-Madras IndicTTS database whose
licence is a PDF at `iitm.ac.in` that **did not resolve when I fetched it**. That
licence is **unverified** and must be read before `maya` is used for anything.
Note also that the current runtime, `piper-tts` 1.7.0, is **GPL-3.0-or-later**,
where the original Piper was MIT.

**edge-tts should never ship, and the reason is not a judgement call.** Reading
its own constants: it posts to `speech.platform.bing.com/consumer/speech/
synthesize/readaloud` with a hardcoded `TRUSTED_CLIENT_TOKEN`, a spoofed
`Mozilla/5.0 ... Edg/143.0.0.0` User-Agent, `Sec-CH-UA` headers claiming to be
Microsoft Edge 143, and `Origin: chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold`
— the Edge Read Aloud extension. That is not an API with generous terms; it is a
consumer endpoint being impersonated, and it can be shut off in an afternoon. It
is an excellent evaluation tool, it produced half the audio in §7.4, and it is
the same underlying Azure neural voices we can buy legitimately for $15/1M.

**One free option worth adding that was not on the list: caching.** It is not a
vendor and it beats all of them — §7.0.

## 7.3 Self-hosting, and where the crossover actually is

I benchmarked what I could actually run rather than estimating. MMS-TTS is
excluded by licence, but it is the fastest realistic architecture and therefore
the best case for self-hosting, so its numbers are the *optimistic* bound:

| Model | Params | Hardware | Time to synthesise | Audio | Speed |
|---|---|---|---|---|---|
| MMS-TTS Telugu (VITS) | 36M | M1 Pro, 10 threads | 0.567 s | 2.91 s | **5.1× realtime** |
| MMS-TTS Kannada (VITS) | 36M | M1 Pro, 10 threads | 0.586 s | 3.46 s | **5.9× realtime** |
| MMS-TTS Telugu | 36M | M1 Pro, **1 thread** | 0.681 s | 2.80 s | **4.1× realtime** |

Measured 2026-08-30, best of three runs each, `torch` 2.13.0. **A single CPU core
runs a VITS-class Indic voice at four times realtime** — no GPU needed. That is
genuinely surprising and it is faster than the 2.8 s round trip this document
measured for OpenAI `tts-1-hd`.

But the two models we may actually license are not VITS. Indic-Parler-TTS is
**938M parameters** and autoregressive; IndicF5 is **351M** and flow-matching
with a reference-audio prompt. Both want a GPU. I could not benchmark either:
Indic-Parler needs a GPU this machine does not have, and Piper's macOS wheel is
broken — it has the build machine's path baked into the compiled espeak-ng
(`/Users/runner/work/piper1-gpl/...`) and ignores the `espeak_data_dir` argument
entirely, so it cannot phonemise on this platform. **Their quality and latency
are unverified.**

### The crossover

Google Chirp 3: HD costs $30/1M characters with the first 1M free each month. At
the measured 1,054 characters per lesson, a month of TTS for *N* lessons costs
`max(0, N × 1054 − 1,000,000) × $30/1,000,000`. Setting that equal to the cost of
a box running 24/7:

| Box | $/hr | $/month | Break-even vs Chirp 3: HD |
|---|---|---|---|
| RunPod RTX A4000, community | $0.17 | $124 | 4,870 lessons/mo = **162 learners/day** |
| RunPod L4, secure cloud | $0.39 | $285 | 9,962 lessons/mo = **332 learners/day** |
| GCP `g2-standard-4` (L4), on-demand | $0.707 | $516 | 17,268 lessons/mo = **576 learners/day** |

GPU prices from [getdeploying L4 comparison](https://getdeploying.com/gpus/nvidia-l4)
and [RunPod pricing](https://docs.runpod.io/serverless/pricing), checked
2026-08-30, at one lesson per learner per day.

**So: below roughly 300 daily learners, self-hosting is simply more expensive
than paying Google.** Call the range 160–580 depending on how cheap and how
unreliable a box you are willing to accept; a single spot instance in a community
cloud with no redundancy is not what a production course runs on, and doubling it
for a second box moves the crossover to ~660/day.

And every one of those numbers ignores the engineering. Three days of setup, a
container, a health check, a queue and somebody's pager is worth more than the
$285/month it saves at the crossover point.

**With the pre-rendering from §7.0, the crossover disappears entirely**, because
the bill it would have to beat is $0.17 one time. Self-hosting Telugu and Kannada
TTS is not a decision this product should be making.

## 7.4 The A/B, and an honest warning about what it measures

Same method as last round: put audio through Deepgram `nova-3` and report the
transcript and confidence. **This is a proxy for intelligibility, not for whether
a voice sounds like a warm tutor.** It cannot hear warmth, pacing, or whether a
child would want to listen to it for twenty minutes.

And this round it saturated, which is worth stating loudly:

| Telugu (`language=te`) | Deepgram heard | Conf. |
|---|---|---|
| `te-IN-Chirp3-HD-Achernar` (Google sample) | clean Telugu | 0.984 |
| `te-IN-Standard-A` (Google sample, same sentence) | **first half missing** | 0.848 |
| Azure `te-IN-ShrutiNeural` via edge-tts, native script | exact | **0.996** |
| **MMS-TTS `tel`, 36M params, 16 kHz** | exact | **0.989** |

| Kannada (`language=kn`) | Deepgram heard | Conf. |
|---|---|---|
| `kn-IN-Chirp3-HD-Achernar` (Google sample) | clean Kannada | 0.954 |
| **`kn-IN-Standard-A` (Google sample)** | clean Kannada | **0.986** |
| Azure `kn-IN-SapnaNeural` via edge-tts, native script | exact | 0.947 |
| **MMS-TTS `kan`, 36M params, 16 kHz** | near-exact | **0.984** |

| Hindi — Android proxy (`language=hi`) | Deepgram heard | Conf. |
|---|---|---|
| Android on-device `hic`, **pre-2022** | exact | 0.996 |
| Android on-device `hic`, **post-2022** | exact | 0.994 |
| `hi-IN-Standard-A` / `Wavenet-A` / `Chirp3-HD` | exact | 0.997 / 0.997 / 0.998 |

**A 36-million-parameter open model at 16 kHz scored higher than Chirp 3: HD, and
Kannada Standard-A beat Kannada Chirp 3: HD by three points.** Neither of those
means what it would appear to mean. Deepgram is telling us that every candidate
here clears the intelligibility bar comfortably and that it cannot rank them.
Anyone who cites these numbers as a quality ranking — including a future me
reading this document — is misreading them. The Telugu Standard-A row at 0.848 is
the only one carrying real signal, because dropping half a sentence is a defect an
ASR *can* see.

**The consequence: the choice between these voices cannot be made from a
terminal.** It has to be made by ear, which is §7.6, and that is not a formality.

Two integrity notes from building this table. Google's published samples for
`hi-IN-Standard-A` and `hi-IN-Neural2-A` are **byte-identical** (same MD5) — do
not trust every sample WAV on that page to be distinct; the te-IN and kn-IN
Standard/Chirp3 pairs are genuinely different files, so last round's finding
stands. And all Deepgram figures here were run twice and were stable to
±0.001.

## 7.5 The finding that outranks the whole vendor question

The step curriculum is romanised Latin. There is no native script in
`CURRICULUM` at all — the Telugu word is stored as `"Namaskaram"`, never
`"నమస్కారం"`. So I tested what a real Indic neural voice does when handed the
Latin string, against the same voice handed the native script. Same voice, same
word, only the orthography changes:

| Word | Script | Deepgram heard | Conf. |
|---|---|---|---|
| ಹೇಗಿದ್ದೀರಿ ("how are you") | **native** | ಹೇಗಿದ್ದೀರಿ ✅ | **0.901** |
| `hegiddeeri` | **Latin** | ಹಿಧ್ಯದಿವೆ ❌ | **0.324** |
| మీరు ఎలా ఉన్నారు | native | మీరు ఎలా ఉన్నారు ✅ | 0.863 |
| `meeru ela unnaru` | Latin | మీరు ఎలా ఉన్నారు ✅ | 0.944 |

Telugu survives romanisation. **Kannada does not.** And it is not a marginal
degradation — it is a specific, reproducible mispronunciation. The Kannada voice
reads Latin `ge` as an English soft *g*, so `hegiddeeri` comes out closer to
"hejidiri". I then ran the six most frequent Kannada words in our own course
through `kn-IN-SapnaNeural` exactly as the curriculum stores them:

| Course word | Meaning | Heard as (kn) | Conf. | Heard as (en) |
|---|---|---|---|---|
| `Hege` | how | ಈಜ್ | **0.512** | "Peach" |
| `Chennagide` | it is good | ಚನ್ನಜಯದ | **0.554** | "Chennajiva" |
| `Hoovugalu` | flowers | ಹೂವಿಗಾಲೆ | **0.400** | "Huvigallu" |
| `Snehitaru` | friends | ಸ್ನೇಹಚಾರು | **0.419** | "Snehutaru" |
| `Olleya` | good | ಒಳ್ಳೆಯ ✅ | 0.776 | "Olea" |
| `Yelli` | where | ಎಲ್ಲಿ ✅ | 0.784 | "Yili" |

**Four of the six most common Kannada words in the course are mispronounced by a
correct, current, native Kannada neural voice, because of how we store them.**
A beginner hears "heh-jay" and repeats "heh-jay". The engine is not the problem.

This reframes the entire round. Upgrading from a free voice to a paid one buys
much less than adding native script to the curriculum, and no vendor on the
market — free or paid, Chirp 3 or Azure or a self-hosted GPU — fixes `Hege`.
Adding a native-script field is the single highest-value change available to the
audio of this product, it is content work rather than voice work, and it belongs
to whoever owns `CURRICULUM`. Filed here because it was found here.

It also happens to be nearly free: 5,711 characters of native script for both
courses, which is the same 5,711 characters §7.0 wants to pre-render.

## 7.6 The five-minute test on Farhaan's own phone

I cannot do this and it is the only part that settles anything. Sound on.

**1. Install the voice packs.** On stock Android: **Settings → System →
Languages & input → Text-to-speech output**. On Samsung: **Settings → General
management → Text-to-speech**. Confirm *Preferred engine* is **Speech
Recognition & Synthesis** (Google), tap the **gear** beside it, then **Install
voice data** → **Telugu (తెలుగు)** and **Kannada (ಕನ್ನಡ)** → download. Note
whether each language offers a choice of voices and whether any is marked as
needing a network connection — **that answer is the thing §7.1 could not
establish, and you are the only one who can report it.**

While you are there, hit the **Play** / *Listen to an example* button for each.
That is Android's own voice reading its own sample, and it is the cleanest
possible impression of the voice before our content complicates it.

**2. Serve the app to the phone.** The dev server currently running is bound to
localhost, so the phone cannot reach it. In a **second** terminal — leave the
running one alone:

```
cd "/Users/farhaaan/Documents/AI Projects/language learning AG"
npm run dev -- --host --port 5174
```

Then on the phone, on the same Wi-Fi, open:

```
http://192.168.1.3:5174/preview.html?lang=Telugu&scenario=0
http://192.168.1.3:5174/preview.html?lang=Kannada&scenario=0
```

`preview.html` is the dev harness — no sign-in, no backend, and it runs the real
`Steps` code against the real `speakInBrowser`, so what you hear is what a
learner hears. (The harness used to seed a hardcoded `code: 'te-IN'` and an id
of `lang.slice(0,2)`, giving Kannada the id `ka`. The TTS path survived it
because `getLangCode` keys off `name`, but it was fixed in `src/dev/preview.jsx`
on 2026-08-30 while this section was being written, so both languages now
resolve from the real table. The test is trustworthy.)

**3. What you will hear, and what to judge.** The words are romanised —
`Namaskaram`, not `నమస్కారం`. Per §7.5 that is fine in Telugu and **not** fine in
Kannada. So:

- **Kannada, listen for the letter g.** The lesson-1 words include `Hege` and
  `Chennagide`. If they come out "heh-jay" and "chenna-jee-day" rather than
  "hay-gay" and "chen-naa-gi-day", you have confirmed §7.5 by ear and the
  curriculum needs native script before anything else gets bought.
- **Telugu, listen for vowel length.** `meeru`, `unnaru` — the long vowels are
  what romanisation loses first.
- **Both: is it a person or a machine?** This is the judgement Deepgram cannot
  make and the reason §7.4 refuses to rank the voices. Would a beginner listen to
  this for twenty minutes?
- **Does the English sound Indian or American?** Ninety-four percent of the audio
  is English scaffolding. If a `te-IN` voice is reading it, the English will sound
  odd; if the system default is reading it, the Telugu will. Notice which.

**4. If a language has no voice pack**, open Chrome's console via
`chrome://inspect` from the Mac and look for the line `speech.js` already logs:
`[speech] this device has no te-IN voice installed`. That is the answer too, and
it is the case where the browser path costs nothing because it does nothing.

## 7.7 The recommendation

**Yes, Farhaan can skip paying for TTS — but he should still create the Google
credential, because the free tier is where the good voice lives.**

Concretely:

1. **Create the Google Cloud credential and enable billing.** It costs nothing.
   1,000,000 Chirp 3: HD characters per month, recurring, is **949 lessons per
   month at today's 1,054 characters each** — and the Standard/WaveNet SKU adds a
   separate 4M, and an Azure F0 account adds another 0.5M. Roughly **5,200 free
   lessons a month across the three**, before anyone is asked for a rupee. The
   only cost of the free tier is a card on file and a billing alert.
2. **Pre-render the 452 target-language clips** on Chirp 3: HD and ship them as
   static audio. $0.17, once, inside the free tier. After that the target-language
   audio of the course is free for ever, at any number of learners, and it is on
   the best voice in the table rather than the cheapest.
3. **Let the device speak the English 94%.** `speech.js` already does this well.
4. **Do not self-host.** It never pays below ~300 daily learners, and with (2) it
   never pays at all.
5. **Do not ship edge-tts.** Evaluation only. It is impersonating a browser.
6. **Fix the Kannada romanisation before buying any voice.** §7.5. No vendor
   fixes `Hege`.

### When does "free" stop being true?

- **The moment the conversation path stops being English.** Free stays true
  because the LLM-generated 94% is English and the target-language 6% is fixed.
  If the tutor starts improvising Telugu sentences outside the 452, that audio
  is novel, cannot be pre-rendered, and goes back on the meter at $0.036 per
  lesson.
- **Above ~950 lessons/month, if pre-rendering is not done.** That is about 32
  daily learners. The free tier is generous but it is not infinite, and step 2 is
  what makes it irrelevant.
- **If the course grows a lot.** 5,711 characters is two languages and 40
  lessons. All ten languages at Telugu's density would be perhaps 45,000
  characters — still $1.35, still nothing. Pre-rendering scales.
- **If Google changes the free tier.** It is a published, recurring monthly
  allowance today (checked 2026-08-30) and it has been stable for years, but it
  is a vendor's gift and not a contract. Pre-rendered files, once made, do not
  care.

The uncomfortable summary: this round went looking for a free vendor and found
that the app's TTS bill is almost entirely self-inflicted, and that its worst
audio problem — `Hege` read as "heh-jay" — costs nothing to fix and no amount of
money would have fixed.

