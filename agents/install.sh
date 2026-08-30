#!/bin/zsh
# Install the LinguaPaws agent fleet into ~/.claude/agents, where Claude Code
# looks for user-level agents — the reason they are callable from any tab.
#
# The sources live here, in the repo, so they are versioned with the protocol
# they encode. Edit them HERE and re-run this; editing ~/.claude/agents/
# directly means the next run of this script silently reverts you.
#
#   ./agents/install.sh
#
# Adding a language: one line, and only where there is a course to learn.
set -e
HERE=${0:a:h}
DEST=~/.claude/agents
mkdir -p $DEST

cp "$HERE/linguapaws-dev.md" "$HERE/linguapaws-design.md" $DEST/

tester() {  # tester <Language> <slug> <lesson-count> <example range>
    sed -e "s/__LANG__/$1/g" -e "s/__SLUG__/$2/g" -e "s/__COUNT__/$3/g" -e "s/__EG__/$4/g" \
        "$HERE/tester-template.md" > "$DEST/linguapaws-tester-$2.md"
    echo "  linguapaws-tester-$2"
}

echo "installed to $DEST:"
echo "  linguapaws-dev"
echo "  linguapaws-design"
tester Telugu  telugu  30 "7 to 9"
tester Kannada kannada 10 "4 to 6"
# Odiya has 30 lessons and Hindi 5 — uncomment when you want them playtested.
# tester Odiya odiya 30 "5 to 7"
# tester Hindi hindi  5 "2 to 4"
