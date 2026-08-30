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
carry sixty of the eighty-four lessons — gives roughly **$0.033 per
learner-lesson**.

### Monthly

At one lesson per active learner per day:

| Daily active learners | Lessons/month | Recommended stack | Azure-everywhere | Today |
|---|---|---|---|---|
| 1,000 | 30,000 | **≈ $990** (₹94,000) | ≈ $690 (₹66,000) | ≈ $1,260 |
| 10,000 | 300,000 | **≈ $9,900** (₹944,000) | ≈ $6,900 (₹658,000) | ≈ $12,600 |

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

Not fixed — recorded. Ordered by how much damage they do.

1. **`resolveLanguageCode('Odiya')` returns `'en-IN'`.** `backend/routes/ai.js:38`;
   language name at `src/pages/LearnLanguageSelect.jsx:19`. Latent while Google
   is unconfigured; ships a wrong-language voice the moment it is configured.
2. **The corrector is instructed to snap the transcript to the target.**
   `backend/routes/ai.js:461`. Closes the loop between the grader's question and
   its answer.
3. **Odiya has no ASR anywhere in the stack.** Deepgram rejects `language=or` with
   a hard 400; Whisper has no Odia and the API rejects `or`/`ory`/`ori`; so do
   `gpt-transcribe` and both `gpt-4o-transcribe` variants. Every Odiya attempt is
   Whisper on auto-detect against a model that has never seen the language.
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
10. **`whisper-1` would 400 on `language=te`** if the hand-maintained
    `supportedByWhisper` set ever gained it. The comment above that set explains
    the exclusions as a quality judgement; for Telugu, Bengali, Malayalam,
    Punjabi and Odia the API simply refuses the code.
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
