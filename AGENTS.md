# The agent fleet

Five agents in `~/.claude/agents/`, which is a **user-level** directory — they
are available from any tab, in any project, not only when a session is open in
this repo. Each one `cd`s here itself.

The sources live in `agents/` and are installed with `./agents/install.sh`.
**Edit them there, not in `~/.claude/agents/`** — the next install silently
reverts anything changed in place.

| Agent | For |
|---|---|
| `linguapaws-dev` | code — the engine, the SRS, both lesson surfaces, the backend, the tools |
| `linguapaws-design` | screens, motion, the reward layer, UI copy |
| `linguapaws-voice` | TTS, ASR, pronunciation scoring, mic capture, speech-vendor choice |
| `linguapaws-tester-telugu` | playing the Telugu course as someone who does not speak it |
| `linguapaws-tester-kannada` | the same, in Kannada |

Dev, design and voice are **one agent each, not one per language**, because the React
code and the visual design are language-agnostic — only content differs. Pass
the language when it matters: *"fix the Kannada review step"*.

The testers are per-language because their whole value is a persona that has
learned exactly one language from exactly this course, and that state cannot be
shared.

## The testers, and why they work

A model playing a beginner knows Telugu perfectly well. Its ignorance is
therefore something to **verify, not trust** — which is what
`tools/leak-check.mjs` does: it flags any word this course teaches that appears
in a learner's turn before the course had shown it to them.

So the tester agents are built on three things, in order of how much they
actually do:

1. **A rule** — the only permitted knowledge is the `--notes` notebook and this
   transcript. No repo, no web, no outside knowledge of the language.
2. **A tool set that makes the rule legible** — testers have `Bash` and `Write`,
   and no `Read`, `Grep` or `Glob`.
3. **A checker they must run on themselves and publish** — the raw `leak-check`
   output goes into the report, with the tester's own reading of each flag.
   Reasoning to a form from taught parts is what learners do and is a finding
   about the course; knowing a word from outside is a leak. Both get said out
   loud.

That third one is the load-bearing part. `Bash` can still open any file, and the
prohibition is a rule rather than a wall — but the outcome is checked
mechanically and the evidence is published, which is the standard the human
rounds in `playtests/` already held themselves to.

## Adding a language

Both tester files are generated from `agents/tester-template.md` so they cannot
drift apart — there is no stored copy of either to fall out of date. To add one,
uncomment its line in `agents/install.sh` and re-run:

```sh
tester Odiya odiya 30 "5 to 7"
```

Worth doing only where there is a course to learn. Today that is Telugu (30
lessons), Odiya (30), Kannada (10) and Hindi (5). Tamil, Bengali, Marathi,
Malayalam, Urdu and Punjabi carry one lesson and five words each — a tester
there has nothing to report except that the course ends.

Edit the template, not the installed files, and re-run the installer.

## What each agent must not do

The boundaries are in the agent files and they matter more than the
capabilities:

- The **testers** do not fix anything, and do not open a source file to check
  whether they were right. `src/services/curriculum.js` holds every answer.
- **Dev** does not re-implement grading. Every accept/reject goes through
  `lessonEngine.scoreAnswer`; the app once carried its own copy of the matcher
  and engine fixes were not reaching learners at all.
- **Design** does not design from the source. It runs the preview harness and
  looks at the screen, because a judgement made by reading JSX is a guess.
- **Voice** applies the same rule to sound: it plays the lesson and listens
  before it says a voice is right. It also never answers a vendor question from
  memory — speech model lineups change monthly, so every claim carries a URL and
  the date it was checked.
- Nobody patches mid-round. Freeze the tree, run the round, then fix.
