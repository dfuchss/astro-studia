/**
 * Regenerate the removal table in docs/Removing-Features.md from the manifest,
 * so the docs cannot drift from what init.mjs actually does.
 *
 *   npm run docs         rewrite the table
 *   npm run docs:check   fail if the table is out of date (prints a diff)
 *
 * Only the region between `<!-- BEGIN GENERATED: features -->` and
 * `<!-- END GENERATED: features -->` is touched; the prose around it is not.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { FEATURES } from './features.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOC = join(ROOT, 'docs/Removing-Features.md');
const DOC_REL = 'docs/Removing-Features.md';

const BEGIN = '<!-- BEGIN GENERATED: features -->';
const END = '<!-- END GENERATED: features -->';

const NOTE = '<!-- Generated from scripts/features.mjs by `npm run docs`. Do not edit by hand. -->';

const check = process.argv.includes('--check');

// ---- the table -------------------------------------------------------------

/** `|` ends a Markdown cell, and a `<…>` is parsed as HTML and vanishes from the
    page. The manifest is prose written for humans and contains both. */
const cell = (s) =>
  String(s).replace(/\|/g, '\\|').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, ' ');

const code = (items) => (items.length === 0 ? '—' : items.map((i) => `\`${cell(i)}\``).join(', '));

const prose = (items) => (items.length === 0 ? '—' : items.map(cell).join('; '));

const COLUMNS = [
  'Feature',
  'What you lose',
  'Presets',
  'Routes & files',
  'Collections',
  'Also by hand',
];

const row = (f) => [
  cell(f.label),
  cell(f.blurb),
  f.presets.length === 0 ? '—' : f.presets.map((p) => `\`${p}\``).join(', '),
  code(f.paths),
  code(f.collections),
  prose(f.manual),
];

function table() {
  const lines = [
    `| ${COLUMNS.join(' | ')} |`,
    `| ${COLUMNS.map(() => '---').join(' | ')} |`,
    ...FEATURES.map((f) => `| ${row(f).join(' | ')} |`),
  ];
  return lines.join('\n');
}

function block() {
  return [BEGIN, NOTE, '', table(), '', END].join('\n');
}

// ---- splice it into the document -------------------------------------------

/** First run, no markers yet: the region replaces the table under the heading. */
function insertMarkers(src) {
  const heading = src.indexOf('## What goes with what');
  if (heading === -1) {
    fail(
      `${DOC_REL} has neither the generated markers nor a "## What goes with what" heading — ` +
        'add the markers by hand where the table belongs.',
    );
  }
  const after = src.indexOf('\n', heading) + 1;
  const rest = src.slice(after);

  // The existing table is the first run of lines starting with `|`. Take it,
  // and the blank lines around it, and nothing further.
  const lines = rest.split('\n');
  let i = 0;
  while (i < lines.length && lines[i].trim() === '') i += 1;
  const start = i;
  while (i < lines.length && lines[i].trimStart().startsWith('|')) i += 1;
  if (i === start) {
    fail(`${DOC_REL}: found "## What goes with what" but no table under it.`);
  }
  return src.slice(0, after) + '\n' + '@@BLOCK@@' + '\n' + lines.slice(i).join('\n');
}

function render(src) {
  let out;
  const b = src.indexOf(BEGIN);
  const e = src.indexOf(END);
  if ((b === -1) !== (e === -1)) {
    fail(`${DOC_REL}: found one generated marker but not the other. Fix it by hand.`);
  }
  if (b === -1) {
    out = insertMarkers(src).replace('@@BLOCK@@', () => block());
  } else {
    if (e < b) fail(`${DOC_REL}: the END marker comes before the BEGIN marker.`);
    out = src.slice(0, b) + block() + src.slice(e + END.length);
  }
  return out;
}

// ---- diff (line based, no dependency) --------------------------------------

function diff(a, b) {
  const A = a.split('\n');
  const B = b.split('\n');
  // Longest common subsequence over lines. These files are a few hundred lines;
  // the quadratic table is free and the output is easy to read.
  const n = A.length;
  const m = B.length;
  const lcs = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      lcs[i][j] = A[i] === B[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const out = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) {
      out.push(`  ${A[i]}`);
      i += 1;
      j += 1;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      out.push(`- ${A[i]}`);
      i += 1;
    } else {
      out.push(`+ ${B[j]}`);
      j += 1;
    }
  }
  for (; i < n; i += 1) out.push(`- ${A[i]}`);
  for (; j < m; j += 1) out.push(`+ ${B[j]}`);

  // Only the changed neighbourhoods are interesting.
  const keep = new Set();
  out.forEach((l, k) => {
    if (l.startsWith('- ') || l.startsWith('+ ')) {
      for (let d = -2; d <= 2; d += 1) keep.add(k + d);
    }
  });
  const shown = [];
  let gap = false;
  out.forEach((l, k) => {
    if (keep.has(k)) {
      shown.push(l);
      gap = false;
    } else if (!gap) {
      shown.push('  …');
      gap = true;
    }
  });
  return shown.join('\n');
}

// ---- prettier --------------------------------------------------------------

/** Formatted through prettier because `npm run check` runs `prettier --check`
    over the repo: an unformatted table would fail that check forever. */
async function format(text) {
  try {
    const prettier = await import('prettier');
    const config = (await prettier.resolveConfig(DOC)) ?? {};
    return await prettier.format(text, { ...config, filepath: DOC });
  } catch (err) {
    console.error(`! prettier could not format the docs (${err.message}); writing unformatted.`);
    return text;
  }
}

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

// ---- main ------------------------------------------------------------------

const current = readFileSync(DOC, 'utf8');
const next = await format(render(current));

if (check) {
  if (current === next) {
    console.log(`✓ ${DOC_REL} is up to date with scripts/features.mjs`);
  } else {
    console.error(`✗ ${DOC_REL} is out of date. Run \`npm run docs\`.\n`);
    console.error(diff(current, next));
    process.exit(1);
  }
} else if (current === next) {
  console.log(`· ${DOC_REL} already up to date (${FEATURES.length} features)`);
} else {
  writeFileSync(DOC, next);
  console.log(`✓ wrote the feature table in ${DOC_REL} (${FEATURES.length} features)`);
}
