#!/usr/bin/env node
/**
 * Applies reviewer-approved curriculum corrections to src/services/curriculum.js.
 *
 *   node content-qa/apply-corrections.mjs                 # dry run, shows every row
 *   node content-qa/apply-corrections.mjs --apply         # writes approved rows only
 *   node content-qa/apply-corrections.mjs --approve-all   # flip pending -> approved
 *   node content-qa/apply-corrections.mjs --only=A,B,C    # restrict to classes
 *   node content-qa/apply-corrections.mjs --only=P1       # restrict to a priority
 *
 * Every edit is scoped to the target language's block so a string that also
 * exists in another language can never be hit by accident. A row whose search
 * string does not occur exactly `expect` times is reported and skipped — the
 * script never guesses which occurrence was meant.
 */

import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const valOf = (f) => argv.find(a => a.startsWith(`${f}=`))?.split('=')[1];

const APPLY = has('--apply');
const APPROVE_ALL = has('--approve-all');
const ONLY = valOf('--only')?.split(',').map(s => s.trim().toUpperCase()) ?? null;
const SPEC_PATH = resolve(HERE, valOf('--spec') ?? 'telugu-corrections.json');

// ── ansi ────────────────────────────────────────────────────────────
const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const c = (code) => (s) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : String(s));
const dim = c('2'), bold = c('1'), red = c('31'), green = c('32'),
      yellow = c('33'), cyan = c('36'), grey = c('90');

// ── load spec ───────────────────────────────────────────────────────
const spec = JSON.parse(readFileSync(SPEC_PATH, 'utf8'));
const TARGET = resolve(ROOT, spec.target);
const LANG = spec.language;

if (APPROVE_ALL) {
  let n = 0;
  for (const row of spec.corrections) {
    if (row.status === 'pending') { row.status = 'approved'; n++; }
  }
  writeFileSync(SPEC_PATH, JSON.stringify(spec, null, 2) + '\n');
  console.log(`${green('✓')} Flipped ${bold(n)} pending row(s) to "approved" in ${dim(SPEC_PATH)}`);
  console.log(dim('  Re-run with --apply to write them into the curriculum.'));
  process.exit(0);
}

// ── isolate the language block ──────────────────────────────────────
/** Returns [start, end) offsets of `<Lang>: [ ... ]` inside CURRICULUM. */
function languageSlice(src, lang) {
  const heads = [...src.matchAll(/^ {4}(\w+): \[/gm)];
  const i = heads.findIndex(m => m[1] === lang);
  if (i === -1) throw new Error(`Language block "${lang}" not found in ${spec.target}`);
  return [heads[i].index, i + 1 < heads.length ? heads[i + 1].index : src.length];
}

/** Builds the literal search string for a row. */
function needle(row) {
  switch (row.kind) {
    case 'answer':      return `correct: "${row.find}"`;
    case 'meaning':     return `meaning: "${row.find}"`;
    case 'prompt':      return `prompt: "${row.find}"`;
    case 'vocab':       return `word: "${row.find}"`;
    case 'raw':
    case 'delete-line': return row.find;
    default: throw new Error(`Unknown kind "${row.kind}" on row ${row.id}`);
  }
}

/** The replacement for a row, in the same wrapper as its needle. */
function replacement(row) {
  switch (row.kind) {
    case 'answer':  return `correct: "${row.replace}"`;
    case 'meaning': return `meaning: "${row.replace}"`;
    case 'prompt':  return `prompt: "${row.replace}"`;
    case 'vocab':   return `word: "${row.replace}"`;
    case 'raw':     return row.replace;
    default: throw new Error(`kind "${row.kind}" has no replacement form`);
  }
}

const countOf = (hay, find) => hay.split(find).length - 1;

// ── select rows ─────────────────────────────────────────────────────
const inScope = (row) => {
  if (!ONLY) return true;
  return ONLY.includes(row.cls.toUpperCase()) || ONLY.includes(row.pri.toUpperCase());
};

const rows = spec.corrections.filter(inScope);

// ── run ─────────────────────────────────────────────────────────────
const original = readFileSync(TARGET, 'utf8');
let [sliceStart, sliceEnd] = languageSlice(original, LANG);
let block = original.slice(sliceStart, sliceEnd);

const results = [];

for (const row of rows) {
  const find = needle(row);
  const found = countOf(block, find);
  const expected = row.expect ?? 1;

  // A row already applied in a previous run is not an error.
  if (found === 0 && row.kind === 'delete-line') {
    // Nothing left to delete: the line went in an earlier run. There is no
    // replacement string to look for, so absence is the only evidence we get.
    results.push({ row, state: 'already', found, expected });
    continue;
  }
  if (found === 0 && row.replace != null) {
    const already = countOf(block, replacement(row));
    if (already > 0) {
      results.push({ row, state: 'already', found, expected });
      continue;
    }
  }

  if (found !== expected) {
    results.push({ row, state: 'mismatch', found, expected });
    continue;
  }

  if (row.status !== 'approved') {
    results.push({ row, state: 'unapproved', found, expected });
    continue;
  }

  if (!APPLY) {
    results.push({ row, state: 'ready', found, expected });
    continue;
  }

  if (row.kind === 'delete-line') {
    const lines = block.split('\n');
    const kept = lines.filter(l => !l.includes(find));
    if (lines.length - kept.length !== expected) {
      results.push({ row, state: 'mismatch', found: lines.length - kept.length, expected });
      continue;
    }
    block = kept.join('\n');
  } else {
    block = block.split(find).join(replacement(row));
  }
  results.push({ row, state: 'applied', found, expected });
}

// ── report ──────────────────────────────────────────────────────────
const BADGE = {
  applied:    green('APPLIED'),
  ready:      cyan('READY'),
  unapproved: grey('pending'),
  already:    dim('already'),
  mismatch:   red('MISMATCH'),
};

console.log();
console.log(bold(`${LANG} curriculum corrections`) + dim(`  ·  ${spec.target}`));
console.log(dim(`spec: ${SPEC_PATH.replace(ROOT + '/', '')}`)
  + (ONLY ? dim(`  ·  filter: ${ONLY.join(',')}`) : '')
  + (APPLY ? '  ' + yellow('WRITE MODE') : '  ' + dim('dry run')));
console.log(dim('─'.repeat(78)));

let lastCls = null;
for (const { row, state, found, expected } of results) {
  if (row.cls !== lastCls) {
    console.log();
    console.log(bold(`Class ${row.cls}`));
    lastCls = row.cls;
  }
  console.log(`  ${BADGE[state].padEnd(useColor ? 18 : 9)} ${row.id.padEnd(10)} ${dim(`S${row.scen}`.padEnd(4))} ${row.pri}  ${row.find}`);
  if (state === 'mismatch') {
    console.log(`    ${red('→')} expected ${expected} occurrence(s), found ${found}. Skipped.`);
  } else if (row.replace != null) {
    console.log(`    ${dim('→')} ${row.replace}`);
  } else {
    console.log(`    ${dim('→')} ${dim('(line deleted)')}`);
  }
}

const tally = results.reduce((a, r) => (a[r.state] = (a[r.state] ?? 0) + 1, a), {});
console.log();
console.log(dim('─'.repeat(78)));
console.log(
  `${bold(results.length)} row(s)  ·  ` +
  Object.entries(tally).map(([k, v]) => `${BADGE[k]} ${v}`).join('  ·  ')
);

// ── write ───────────────────────────────────────────────────────────
const mismatches = results.filter(r => r.state === 'mismatch');

if (APPLY && tally.applied) {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '');
  const backup = `${TARGET}.bak.${stamp}`;
  copyFileSync(TARGET, backup);
  const updated = original.slice(0, sliceStart) + block + original.slice(sliceEnd);
  writeFileSync(TARGET, updated);
  console.log();
  console.log(`${green('✓')} Wrote ${bold(tally.applied)} correction(s) to ${dim(spec.target)}`);
  console.log(`  backup: ${dim(backup.replace(ROOT + '/', ''))}`);
  console.log(dim('  Verify with:  git diff -- ' + spec.target));
} else if (APPLY) {
  console.log();
  console.log(`${yellow('!')} Nothing applied — no rows are marked "approved".`);
  console.log(dim('  Mark rows approved in the spec, or run --approve-all to accept every pending row.'));
} else if (tally.ready) {
  console.log();
  console.log(dim(`Re-run with --apply to write the ${tally.ready} READY row(s).`));
} else if (tally.unapproved) {
  console.log();
  console.log(dim(`${tally.unapproved} row(s) still pending review. Approve them in the spec, then --apply.`));
}

if (mismatches.length) {
  console.log();
  console.log(`${red('✗')} ${mismatches.length} row(s) could not be located — the curriculum may have`);
  console.log(red('  ') + `already been edited by hand. Reconcile these before trusting the rest:`);
  for (const m of mismatches) console.log(`    ${m.row.id}  ${m.row.find}`);
  process.exit(1);
}
