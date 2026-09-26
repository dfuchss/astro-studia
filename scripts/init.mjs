/**
 * Prune this template down to the features you actually want.
 *
 *   npm run init                                 interactive
 *   node scripts/init.mjs --preset profile       non-interactive
 *   node scripts/init.mjs --features cv,imprint  an explicit set
 *   node scripts/init.mjs --preset project --dry-run
 *
 * ── What it does ───────────────────────────────────────────────────────────
 *
 * `scripts/features.mjs` says what every optional area of the site is made of:
 * its routes, its collections, its `Section` member and accent block, its nav
 * and footer rows, the fenced regions it owns on the home page, and the edits
 * that are genuinely prose and cannot be automated. This script reads that
 * manifest and, for everything you did NOT keep, performs the mechanical part
 * and prints the rest as a TODO list.
 *
 * ── Two rules it follows ───────────────────────────────────────────────────
 *
 * 1. NO SILENT NO-OPS. Every edit names a landmark in a file — `export const
 *    NAV`, `export type Section =`, a `▼ FEATURE:x ▼` fence. A missing
 *    landmark is a hard failure naming the file, because that means the file
 *    has been restructured and this script no longer understands it. A missing
 *    *item* inside a present landmark is only a warning: that is what a second
 *    run looks like, and a second run must be safe.
 *
 * 2. It reports rather than repairs. After pruning it runs check, build and
 *    verify; if one of them fails it says so and stops. A prune that left
 *    something dangling is a thing to read and fix, not to paper over.
 */
import { existsSync, readFileSync, writeFileSync, rmSync, readdirSync, statSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve as resolvePath, sep } from 'node:path';

import { FEATURES, PRESETS, PRESET_HERO, byId, featuresFor, resolve } from './features.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const CONSTS = 'src/consts.ts';
const CONTENT_CONFIG = 'src/content.config.ts';
const TOKENS = 'src/styles/tokens.css';
const INDEX = 'src/pages/index.astro';
const HERO_DIR = 'src/components/hero';
const SCAFFOLDING = ['scripts/init.mjs', 'scripts/features.mjs', 'scripts/gen-docs.mjs'];

// ---------------------------------------------------------------------------
// output
// ---------------------------------------------------------------------------

const warnings = [];
const done = [];

const say = (s = '') => console.log(s);
const step = (s) => {
  done.push(s);
  console.log(`  · ${s}`);
};
const warn = (s) => {
  warnings.push(s);
  console.log(`  ! ${s}`);
};

class Abort extends Error {}

/** A landmark is missing: the file is not what this script was written against. */
const hard = (msg) => {
  throw new Abort(msg);
};

const bold = (s) => (output.isTTY ? `[1m${s}[0m` : s);

// ---------------------------------------------------------------------------
// arguments
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const opts = { preset: null, features: null, dryRun: false, yes: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    const value = () => {
      const v = a.includes('=') ? a.slice(a.indexOf('=') + 1) : argv[++i];
      if (!v) hard(`${a} needs a value`);
      return v;
    };
    if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--yes' || a === '-y') opts.yes = true;
    else if (a === '--help' || a === '-h') opts.help = true;
    else if (a === '--preset' || a.startsWith('--preset=')) opts.preset = value();
    else if (a === '--features' || a.startsWith('--features=')) {
      opts.features = value()
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    } else hard(`unknown argument: ${a}`);
  }
  if (opts.preset && !PRESETS.includes(opts.preset)) {
    hard(`unknown preset "${opts.preset}" — known presets: ${PRESETS.join(', ')}`);
  }
  for (const id of opts.features ?? []) {
    if (!byId(id)) {
      hard(`unknown feature "${id}" — known: ${FEATURES.map((f) => f.id).join(', ')}`);
    }
  }
  return opts;
}

const HELP = `
Prune aca-theme to a feature set. See scripts/features.mjs for the manifest.

  node scripts/init.mjs                      pick interactively
  node scripts/init.mjs --preset <${PRESETS.join('|')}>
  node scripts/init.mjs --features a,b,c     keep exactly these
  node scripts/init.mjs --dry-run            print the plan, change nothing
  node scripts/init.mjs --yes                skip the confirmation

Features: ${FEATURES.map((f) => f.id).join(', ')}
`;

// ---------------------------------------------------------------------------
// a tiny write-through file cache, so --dry-run is the same code path
// ---------------------------------------------------------------------------

const cache = new Map();

function read(rel) {
  if (cache.has(rel)) return cache.get(rel);
  const abs = join(ROOT, rel);
  const text = existsSync(abs) ? readFileSync(abs, 'utf8') : null;
  cache.set(rel, text);
  return text;
}

const dirty = new Set();

function put(rel, text) {
  cache.set(rel, text);
  dirty.add(rel);
}

function flush(dryRun) {
  if (dryRun) return [...dirty];
  for (const rel of dirty) writeFileSync(join(ROOT, rel), cache.get(rel));
  return [...dirty];
}

// ---------------------------------------------------------------------------
// path deletion
// ---------------------------------------------------------------------------

/** Nothing outside the repo, and never the git directory. */
function safeTarget(rel) {
  const abs = resolvePath(ROOT, rel);
  if (abs === ROOT || !abs.startsWith(ROOT + sep)) {
    hard(`refusing to delete outside the project: ${rel}`);
  }
  if (rel.split(/[\\/]/).includes('.git')) hard(`refusing to touch .git: ${rel}`);
  return abs;
}

function deletePath(rel, dryRun) {
  const abs = safeTarget(rel);
  if (!existsSync(abs)) {
    warn(`already gone: ${rel}`);
    return false;
  }
  const kind = statSync(abs).isDirectory() ? 'directory' : 'file';
  if (!dryRun) rmSync(abs, { recursive: true, force: true });
  step(`${dryRun ? 'would delete' : 'deleted'} ${kind} ${rel}`);
  return true;
}

// ---------------------------------------------------------------------------
// a JS/TS scanner that knows about strings, comments and regex literals
// ---------------------------------------------------------------------------

const OPEN = '([{';
const CLOSE = ')]}';

function skipQuoted(src, i) {
  const quote = src[i];
  i += 1;
  while (i < src.length) {
    if (src[i] === '\\') i += 2;
    else if (src[i] === quote) return i + 1;
    else i += 1;
  }
  return src.length;
}

/**
 * Is the `/` at `i` the start of a regex literal rather than a division?
 *
 * The usual heuristic — look at the previous significant character — and it is
 * enough here: `content.config.ts` writes regexes as arguments (`z.string()
 * .regex(/…/, '…')`), so the character before is always `(` or `,`.
 */
function looksLikeRegex(src, i) {
  let j = i - 1;
  while (j >= 0 && /\s/.test(src[j])) j -= 1;
  return j < 0 || '(,=:[!&|?{};+*-%^~<>'.includes(src[j]) || /\breturn$/.test(src.slice(0, j + 1));
}

function skipRegex(src, i) {
  i += 1;
  let inClass = false;
  while (i < src.length) {
    const c = src[i];
    if (c === '\\') i += 2;
    else if (c === '[') {
      inClass = true;
      i += 1;
    } else if (c === ']') {
      inClass = false;
      i += 1;
    } else if (c === '/' && !inClass) return i + 1;
    else if (c === '\n')
      return i; // unterminated: bail out rather than run away
    else i += 1;
  }
  return src.length;
}

/**
 * Walk `src` from `from`, calling `onChar(i, depth)` for every character that
 * is real code. Returns when `stop(i, depth)` says so, or at end of input.
 */
function walk(src, from, stop) {
  let i = from;
  let depth = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') {
      const nl = src.indexOf('\n', i);
      i = nl === -1 ? src.length : nl;
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      i = end === -1 ? src.length : end + 2;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      i = skipQuoted(src, i);
      continue;
    }
    if (c === '/' && looksLikeRegex(src, i)) {
      i = skipRegex(src, i);
      continue;
    }
    if (OPEN.includes(c)) {
      depth += 1;
      i += 1;
      continue;
    }
    if (CLOSE.includes(c)) {
      depth -= 1;
      i += 1;
      if (depth < 0) return { index: i - 1, depth };
      continue;
    }
    const verdict = stop(i, depth, c);
    if (verdict) return { index: i, depth };
    i += 1;
  }
  return { index: -1, depth };
}

/** Index just past the `;` that ends the statement starting at `from`. */
function statementEnd(src, from) {
  const { index } = walk(src, from, (i, depth, c) => c === ';' && depth === 0);
  return index === -1 ? -1 : index + 1;
}

/** Index of the `}`/`]`/`)` matching the bracket at `open`. */
function matchBracket(src, open) {
  const { index } = walk(src, open + 1, () => false);
  return index;
}

/** Split the inside of a `[…]`/`{…}` on its top-level commas. */
function splitTopLevel(src, from, to) {
  const parts = [];
  let start = from;
  let i = from;
  while (i < to) {
    const { index } = walk(src.slice(0, to), i, (k, depth, c) => c === ',' && depth === 0);
    if (index === -1) break;
    parts.push({ start, end: index, comma: index });
    i = index + 1;
    start = i;
  }
  if (src.slice(start, to).trim() !== '') parts.push({ start, end: to, comma: -1 });
  return parts;
}

/**
 * Extend a removal backwards over the doc comment that belongs to it, and
 * forwards over the newline it sat on — so a deletion leaves no orphaned
 * `/** … *␣/` above a const that is no longer there.
 */
function withComment(src, start, end) {
  let s = start;
  for (;;) {
    const before = src.slice(0, s);
    const trimmed = before.replace(/[ \t]*$/, '');
    if (trimmed.endsWith('*/')) {
      const open = trimmed.lastIndexOf('/*');
      if (open === -1) break;
      s = open;
      continue;
    }
    const m = /(^|\n)[ \t]*\/\/[^\n]*\n[ \t]*$/.exec(trimmed);
    if (m) {
      s = trimmed.length - m[0].length + (m[1] ? 1 : 0);
      continue;
    }
    break;
  }
  // eat the indentation of the first removed line and the blank line above it
  const lineStart = src.lastIndexOf('\n', s - 1) + 1;
  if (src.slice(lineStart, s).trim() === '') s = lineStart;
  let e = end;
  while (src[e] === ' ' || src[e] === '\t') e += 1;
  if (src[e] === '\n') e += 1;
  return [s, e];
}

// ---------------------------------------------------------------------------
// TypeScript edits
// ---------------------------------------------------------------------------

/** Remove a top-level `const <name> = …;` (with its doc comment). */
function removeConst(src, name) {
  const re = new RegExp(`(^|\\n)(export\\s+)?const\\s+${name}\\b`);
  const m = re.exec(src);
  if (!m) return null;
  const declStart = m.index + (m[1] ? 1 : 0);
  const end = statementEnd(src, declStart);
  if (end === -1) return null;
  const [s, e] = withComment(src, declStart, end);
  return src.slice(0, s) + src.slice(e);
}

/** Remove `name` from the `export const collections = { … }` object. */
function removeCollectionExport(src, name, rel) {
  const landmark = 'export const collections';
  const at = src.indexOf(landmark);
  if (at === -1) hard(`${rel}: no \`${landmark}\` — this script cannot edit it safely.`);
  const open = src.indexOf('{', at);
  const close = matchBracket(src, open);
  if (open === -1 || close === -1) hard(`${rel}: the \`collections\` object is not balanced.`);

  const inner = src.slice(open + 1, close);
  const onePerLine = new RegExp(`^[ \\t]*${name},?[ \\t]*\\r?\\n`, 'm');
  const inline = new RegExp(`(,[ \\t]*)?\\b${name}\\b[ \\t]*(,[ \\t]*)?`);
  let next = null;
  if (onePerLine.test(inner)) next = inner.replace(onePerLine, '');
  else if (inline.test(inner)) next = inner.replace(inline, (mm, a, b) => (a && b ? ', ' : ''));
  if (next === null) return null;
  return src.slice(0, open + 1) + next + src.slice(close);
}

/** Drop members from the `Section` union. */
function removeSections(src, names, rel) {
  const m = /export type Section\s*=/.exec(src);
  if (!m) hard(`${rel}: no \`export type Section =\` — this script cannot edit it safely.`);
  const end = src.indexOf(';', m.index);
  if (end === -1) hard(`${rel}: the \`Section\` union has no terminating \`;\`.`);
  const body = src.slice(m.index + m[0].length, end);
  const members = [...body.matchAll(/'([^']+)'/g)].map((x) => x[1]);
  if (members.length === 0) hard(`${rel}: could not read any member out of the \`Section\` union.`);

  const missing = names.filter((n) => !members.includes(n));
  const kept = members.filter((n) => !names.includes(n));
  const union = kept.length === 0 ? 'never' : kept.map((n) => `'${n}'`).join(' | ');
  const next = `${src.slice(0, m.index)}export type Section = ${union}${src.slice(end)}`;
  return { next, missing, removed: members.length - kept.length, kept };
}

/**
 * Remove rows from an array of objects, matched on their `label`.
 *
 * Used for both NAV and FOOTER_LINKS. Entries are matched structurally rather
 * than by line, so a row prettier has wrapped over three lines still goes.
 */
function removeRowsByLabel(src, landmark, labels, rel) {
  const at = src.indexOf(landmark);
  if (at === -1) hard(`${rel}: no \`${landmark}\` — this script cannot edit it safely.`);
  const open = src.indexOf('[', at);
  const close = matchBracket(src, open);
  if (open === -1 || close === -1) hard(`${rel}: \`${landmark}\` is not a balanced array.`);

  const rows = splitTopLevel(src, open + 1, close);
  const cuts = [];
  const hit = new Set();
  for (const row of rows) {
    const text = src.slice(row.start, row.end);
    const lm = /label:\s*'([^']*)'/.exec(text);
    if (!lm || !labels.includes(lm[1])) continue;
    hit.add(lm[1]);
    const upto = row.comma === -1 ? row.end : row.comma + 1;
    // Start at the row itself, not at the previous comma, so the cut is whole
    // lines and the rows around it keep their own.
    const rowStart = row.start + /^\s*/.exec(text)[0].length;
    cuts.push(withComment(src, rowStart, upto));
  }
  let next = src;
  for (const [s, e] of cuts.reverse()) next = next.slice(0, s) + next.slice(e);
  return { next, missing: labels.filter((l) => !hit.has(l)), removed: hit.size };
}

/**
 * Drop imports whose binding is no longer referenced.
 *
 * Only applied to src/content.config.ts, whose imports exist solely to build
 * the collections: removing the last `glob()` user leaves the import dangling,
 * and the reader — not just the type-checker — should not have to wonder.
 */
function pruneUnusedImports(src) {
  const dropped = [];
  let out = src;
  for (;;) {
    const re = /^import\s+(?:(\w+)\s*,\s*)?(?:\{([^}]*)\}\s+)?from\s+'[^']+';\r?\n/gm;
    let changed = false;
    for (const m of [...out.matchAll(re)]) {
      const rest = out.slice(0, m.index) + out.slice(m.index + m[0].length);
      const names = [];
      if (m[1]) names.push({ raw: m[1], id: m[1] });
      for (const part of (m[2] ?? '').split(',')) {
        const t = part.trim();
        if (!t) continue;
        names.push({
          raw: t,
          id: t
            .split(/\s+as\s+/)
            .pop()
            .trim(),
        });
      }
      if (names.length === 0) continue;
      const used = names.filter((n) => new RegExp(`\\b${n.id}\\b`).test(rest));
      if (used.length === names.length) continue;
      for (const n of names) if (!used.includes(n)) dropped.push(n.id);
      let replacement = '';
      if (used.length > 0) {
        const source = /from\s+('[^']+')/.exec(m[0])[1];
        const dflt = used.find((n) => n.raw === m[1]);
        const named = used.filter((n) => n !== dflt).map((n) => n.raw);
        const clause = [dflt?.raw, named.length ? `{ ${named.join(', ')} }` : null]
          .filter(Boolean)
          .join(', ');
        replacement = `import ${clause} from ${source};\n`;
      }
      out = out.slice(0, m.index) + replacement + out.slice(m.index + m[0].length);
      changed = true;
      break; // indices moved; rescan
    }
    if (!changed) return { next: out, dropped };
  }
}

// ---------------------------------------------------------------------------
// CSS edits
// ---------------------------------------------------------------------------

/**
 * Remove `[data-section='name']` from tokens.css.
 *
 * Some rules carry two selectors — `[data-section='people'], [data-section=
 * 'cv']` share the amber family — so the selector goes and the rule only goes
 * with it when nothing is left to select.
 */
function removeSectionBlock(src, name) {
  const needle = `[data-section='${name}']`;
  const at = src.indexOf(needle);
  if (at === -1) return null;

  const brace = src.indexOf('{', at);
  if (brace === -1) return null;
  const close = src.indexOf('}', brace);
  if (close === -1) return null;

  // The selector list starts after whatever ended the previous construct.
  let selStart = 0;
  for (const marker of ['}', '*/', ';']) {
    const k = src.lastIndexOf(marker, at);
    if (k !== -1) selStart = Math.max(selStart, k + marker.length);
  }
  while (/\s/.test(src[selStart] ?? '')) selStart += 1;

  const selectors = src
    .slice(selStart, brace)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const kept = selectors.filter((s) => s !== needle);

  if (kept.length === 0) {
    let end = close + 1;
    while (src[end] === '\n') end += 1;
    let start = selStart;
    const lineStart = src.lastIndexOf('\n', start - 1) + 1;
    if (src.slice(lineStart, start).trim() === '') start = lineStart;
    while (start > 0 && src[start - 1] === '\n' && src[start - 2] === '\n') start -= 1;
    return { next: src.slice(0, start) + src.slice(end), whole: true };
  }
  return {
    next: src.slice(0, selStart) + kept.join(',\n') + ' ' + src.slice(brace),
    whole: false,
  };
}

// ---------------------------------------------------------------------------
// the home page: fenced regions
// ---------------------------------------------------------------------------

const fence = (id, arrow) =>
  new RegExp(`[ \\t]*\\{?/\\*\\s*${arrow}\\s*FEATURE:${id}\\s*${arrow}\\s*\\*/\\}?[ \\t]*`, 'g');

/**
 * Remove every `▼ FEATURE:id ▼ … ▲ FEATURE:id ▲` region.
 *
 * Deliberately not a parser. Balanced-tag parsing of an .astro file is a
 * project of its own and fails on the interesting cases (a section wrapped in
 * `{cond && (…)}`), whereas a fence is unambiguous, survives reformatting, and
 * is visible to the person editing the file.
 */
function removeFences(src, id) {
  let out = src;
  let count = 0;
  for (;;) {
    const open = fence(id, '▼').exec(out);
    if (!open) break;
    const closeRe = fence(id, '▲');
    closeRe.lastIndex = open.index + open[0].length;
    const close = closeRe.exec(out);
    if (!close) return { next: out, count, unbalanced: true };
    const from = out.lastIndexOf('\n', open.index) + 1;
    let to = close.index + close[0].length;
    if (out[to] === '\r') to += 1;
    if (out[to] === '\n') to += 1;
    out = out.slice(0, from) + out.slice(to);
    count += 1;
  }
  return { next: out, count, unbalanced: false };
}

// ---------------------------------------------------------------------------
// the hero
// ---------------------------------------------------------------------------

function heroComponents() {
  const abs = join(ROOT, HERO_DIR);
  if (!existsSync(abs)) return [];
  return readdirSync(abs)
    .filter((f) => f.endsWith('.astro'))
    .map((f) => f.replace(/\.astro$/, ''));
}

function applyHero(target, dryRun) {
  const available = heroComponents();
  if (available.length === 0) {
    warn(`no components in ${HERO_DIR}/ — nothing to choose between, skipping the hero`);
    return;
  }
  if (!available.includes(target)) {
    warn(
      `${HERO_DIR}/${target}.astro does not exist (have: ${available.join(', ')}) — hero left alone`,
    );
    return;
  }

  const src = read(INDEX);
  if (src === null) hard(`${INDEX} is missing — cannot set the hero.`);
  const re = /(import\s+Hero\s+from\s+')([^']*\/hero\/)([A-Za-z0-9_]+)(\.astro';)/;
  const m = re.exec(src);
  if (!m) {
    warn(`${INDEX}: no \`import Hero from '…/hero/…astro'\` line — hero import left alone`);
  } else if (m[3] === target) {
    step(`hero already ${target}`);
  } else {
    put(INDEX, src.replace(re, `$1$2${target}$4`));
    step(`hero set to ${target} in ${INDEX} (was ${m[3]})`);
  }
  for (const name of available) {
    if (name !== target) deletePath(`${HERO_DIR}/${name}.astro`, dryRun);
  }
}

// ---------------------------------------------------------------------------
// the plan
// ---------------------------------------------------------------------------

/**
 * Everything the manifest can do mechanically.
 *
 * The textual edits run FIRST and deletion last, so a landmark this script no
 * longer recognises aborts before anything on disk is destroyed: the failure
 * mode is "nothing happened", not "half a site".
 */
function prune(drop, dryRun) {
  // 1. collections
  const collections = drop.flatMap((f) => f.collections);
  if (collections.length > 0) {
    say(bold('\ncollections'));
    const src = read(CONTENT_CONFIG);
    if (src === null) warn(`${CONTENT_CONFIG} is missing — skipped ${collections.join(', ')}`);
    else {
      let out = src;
      for (const name of collections) {
        const withoutBlock = removeConst(out, name);
        if (withoutBlock === null)
          warn(`${CONTENT_CONFIG}: no \`const ${name} = …\` block (already gone?)`);
        else {
          out = withoutBlock;
          step(`removed the \`${name}\` collection block`);
        }
        const withoutExport = removeCollectionExport(out, name, CONTENT_CONFIG);
        if (withoutExport === null)
          warn(`${CONTENT_CONFIG}: \`${name}\` was not in the \`collections\` export`);
        else {
          out = withoutExport;
          step(`removed \`${name}\` from the \`collections\` export`);
        }
      }
      // Helpers and imports that existed only for what just went.
      for (const name of [...out.matchAll(/^const\s+(\w+)\s*=/gm)].map((m) => m[1])) {
        const uses = [...out.matchAll(new RegExp(`\\b${name}\\b`, 'g'))].length;
        if (uses > 1) continue;
        const next = removeConst(out, name);
        if (next !== null) {
          out = next;
          step(`removed \`${name}\`, now unused, from ${CONTENT_CONFIG}`);
        }
      }
      const { next, dropped } = pruneUnusedImports(out);
      out = next;
      for (const id of dropped)
        step(`removed the now-unused \`${id}\` import from ${CONTENT_CONFIG}`);
      if (out !== src) put(CONTENT_CONFIG, out);
    }
  }

  // 2a. Section union
  const sections = drop.flatMap((f) => f.sections);
  if (sections.length > 0) {
    say(bold('\nsections'));
    const src = read(CONSTS);
    if (src === null) hard(`${CONSTS} is missing — cannot edit the \`Section\` union.`);
    const { next, missing, removed } = removeSections(src, sections, CONSTS);
    if (removed > 0) {
      put(CONSTS, next);
      step(`dropped ${removed} member${removed === 1 ? '' : 's'} from the \`Section\` union`);
    }
    for (const n of missing) warn(`${CONSTS}: \`Section\` had no member '${n}' (already gone?)`);

    // 2b. the matching accent blocks
    const css = read(TOKENS);
    if (css === null) warn(`${TOKENS} is missing — skipped the [data-section] blocks`);
    else {
      let out = css;
      for (const name of sections) {
        const result = removeSectionBlock(out, name);
        if (result === null)
          warn(`${TOKENS}: no \`[data-section='${name}']\` block (already gone?)`);
        else {
          out = result.next;
          step(
            result.whole
              ? `removed the \`[data-section='${name}']\` block from ${TOKENS}`
              : `removed the \`[data-section='${name}']\` selector from a shared block in ${TOKENS}`,
          );
        }
      }
      if (out !== css) put(TOKENS, out);
    }
  }

  // 3. nav and footer rows
  const nav = drop.flatMap((f) => f.nav);
  const footer = drop.flatMap((f) => f.footer);
  if (nav.length > 0 || footer.length > 0) {
    say(bold('\nnav and footer'));
    const src = read(CONSTS);
    if (src === null) hard(`${CONSTS} is missing — cannot edit NAV/FOOTER_LINKS.`);
    let out = src;
    if (nav.length > 0) {
      const r = removeRowsByLabel(out, 'export const NAV', nav, CONSTS);
      out = r.next;
      if (r.removed > 0) step(`removed ${r.removed} NAV row${r.removed === 1 ? '' : 's'}`);
      for (const l of r.missing) warn(`${CONSTS}: NAV had no row labelled '${l}' (already gone?)`);
    }
    if (footer.length > 0) {
      const r = removeRowsByLabel(out, 'export const FOOTER_LINKS', footer, CONSTS);
      out = r.next;
      if (r.removed > 0) step(`removed ${r.removed} FOOTER_LINKS row${r.removed === 1 ? '' : 's'}`);
      for (const l of r.missing)
        warn(`${CONSTS}: FOOTER_LINKS had no row labelled '${l}' (already gone?)`);
    }
    if (out !== src) put(CONSTS, out);
  }

  // 4. fenced regions on the home page
  const blocks = drop.flatMap((f) => f.homeBlocks);
  if (blocks.length > 0) {
    say(bold('\nhome page'));
    const src = read(INDEX);
    if (src === null) warn(`${INDEX} is missing — skipped ${blocks.join(', ')}`);
    else {
      let out = src;
      for (const id of blocks) {
        const { next, count, unbalanced } = removeFences(out, id);
        out = next;
        if (unbalanced)
          warn(`${INDEX}: \`▼ FEATURE:${id} ▼\` has no matching \`▲ FEATURE:${id} ▲\``);
        if (count > 0)
          step(`removed ${count} fenced \`${id}\` region${count === 1 ? '' : 's'} from ${INDEX}`);
        else if (!unbalanced) warn(`${INDEX}: no \`FEATURE:${id}\` fence found (already gone?)`);
      }
      if (out !== src) put(INDEX, out);
    }
  }

  // 5. files and directories, once every edit above has been verified
  const paths = drop.flatMap((f) => f.paths);
  if (paths.length > 0) say(bold('\nfiles'));
  for (const p of paths) deletePath(p, dryRun);
}

// ---------------------------------------------------------------------------
// formatting and the checks
// ---------------------------------------------------------------------------

async function formatFiles(rels) {
  const targets = rels.filter((r) => read(r) !== null);
  if (targets.length === 0) return;
  try {
    const prettier = await import('prettier');
    for (const rel of targets) {
      const abs = join(ROOT, rel);
      const config = (await prettier.resolveConfig(abs)) ?? {};
      const formatted = await prettier.format(readFileSync(abs, 'utf8'), {
        ...config,
        filepath: abs,
      });
      writeFileSync(abs, formatted);
    }
    step(`formatted ${targets.length} edited file${targets.length === 1 ? '' : 's'} with prettier`);
  } catch (err) {
    warn(`prettier could not format the edited files (${err.message}) — run \`npm run format\``);
  }
}

function runCommands(names) {
  const results = [];
  for (const name of names) {
    say(bold(`\n$ npm run ${name}`));
    const r = spawnSync('npm', ['run', '--silent', name], { cwd: ROOT, stdio: 'inherit' });
    results.push({ name, ok: r.status === 0 });
  }
  return results;
}

// ---------------------------------------------------------------------------
// interaction
// ---------------------------------------------------------------------------

/**
 * Ask, when there is somebody there to answer.
 *
 * Returns null when stdin is not a terminal. Every caller treats that as "no
 * answer", and takes the conservative branch: a piped or CI invocation cannot
 * be talked into a deletion it did not ask for on the command line.
 */
async function ask(rl, question) {
  if (!rl) return null;
  const answer = await rl.question(question);
  return answer.trim();
}

const yes = (s) => /^(y|yes)$/i.test(s ?? '');

async function chooseInteractively(rl) {
  say(bold('\nPresets'));
  PRESETS.forEach((p, i) => {
    const ids = featuresFor(p);
    say(`  ${i + 1}) ${p.padEnd(8)} ${ids.length} features: ${ids.join(', ')}`);
  });
  say(`  ${PRESETS.length + 1}) custom   start from everything and untick`);

  let preset = null;
  for (;;) {
    const a = (await ask(rl, `\nStart from [1-${PRESETS.length + 1}, default 1]: `, '1')) || '1';
    const n = Number(a);
    if (Number.isInteger(n) && n >= 1 && n <= PRESETS.length) {
      preset = PRESETS[n - 1];
      break;
    }
    if (Number.isInteger(n) && n === PRESETS.length + 1) break;
    if (PRESETS.includes(a)) {
      preset = a;
      break;
    }
    say('  ? not one of those');
  }

  const selected = new Set(preset ? featuresFor(preset) : FEATURES.map((f) => f.id));

  say(
    bold('\nFeatures') +
      ' — type numbers to toggle (space or comma separated), `a` all, `n` none, `d` done.',
  );
  for (;;) {
    say('');
    FEATURES.forEach((f, i) => {
      const mark = selected.has(f.id) ? 'x' : ' ';
      say(`  ${String(i + 1).padStart(2)}) [${mark}] ${f.label.padEnd(16)} ${f.blurb}`);
    });
    const answer = await ask(rl, '\n> ', 'd');
    if (answer === '' || /^(d|done)$/i.test(answer)) break;
    if (/^(a|all)$/i.test(answer)) {
      FEATURES.forEach((f) => selected.add(f.id));
      continue;
    }
    if (/^(n|none)$/i.test(answer)) {
      selected.clear();
      continue;
    }
    if (/^(q|quit)$/i.test(answer)) throw new Abort('cancelled — nothing was changed');
    let understood = false;
    for (const token of answer.split(/[\s,]+/).filter(Boolean)) {
      const n = Number(token);
      const f = Number.isInteger(n) ? FEATURES[n - 1] : byId(token);
      if (!f) {
        say(`  ? "${token}" is not a number on the list or a feature id`);
        continue;
      }
      understood = true;
      if (selected.has(f.id)) selected.delete(f.id);
      else selected.add(f.id);
    }
    if (!understood) say('  ? nothing toggled');
  }

  return { preset, selected: [...selected] };
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    say(HELP.trim());
    return 0;
  }

  const interactive = !opts.preset && !opts.features && input.isTTY;
  const rl = input.isTTY ? createInterface({ input, output }) : null;
  let preset = opts.preset;
  let selected;

  try {
    if (opts.features) {
      selected = opts.features;
    } else if (opts.preset) {
      selected = featuresFor(opts.preset);
    } else if (interactive) {
      const picked = await chooseInteractively(rl);
      preset = picked.preset;
      selected = picked.selected;
    } else {
      say(HELP.trim());
      say('\n✗ not a terminal: pass --preset or --features.');
      return 1;
    }

    const { keep, added } = resolve(selected);
    const drop = FEATURES.filter((f) => !keep.includes(f.id));

    say(bold('\nPlan'));
    say(`  preset: ${preset ?? '(none — custom selection)'}`);
    say(`  keep:   ${keep.length === 0 ? '(nothing)' : keep.join(', ')}`);
    say(`  remove: ${drop.length === 0 ? '(nothing)' : drop.map((f) => f.id).join(', ')}`);
    for (const { dep, because } of added) {
      say(`  + kept \`${dep}\` as well: \`${because}\` needs it`);
    }
    if (opts.dryRun) say('  (dry run — nothing will be written)');

    if (drop.length === 0) {
      say('\nNothing to remove. Done.');
      return 0;
    }

    if (!opts.yes && !opts.dryRun) {
      const a = await ask(
        rl,
        `\nThis deletes files in ${ROOT}. It is not undoable outside git. Proceed? [y/N] `,
        'n',
      );
      if (!yes(a)) {
        say('Cancelled — nothing was changed.');
        return 0;
      }
    }

    prune(drop, opts.dryRun);

    if (preset) {
      say(bold('\nhero'));
      const target = PRESET_HERO[preset];
      if (!target) warn(`PRESET_HERO has no entry for \`${preset}\` — hero left alone`);
      else applyHero(target, opts.dryRun);
    } else {
      const available = heroComponents();
      if (available.length > 1 && interactive) {
        say(bold('\nhero'));
        say(`  ${available.map((h, i) => `${i + 1}) ${h}`).join('   ')}`);
        const a = await ask(rl, `  Which hero? [1-${available.length}, default 1] `, '1');
        const n = Number(a) || 1;
        applyHero(available[n - 1] ?? available[0], opts.dryRun);
      } else if (available.length > 1) {
        warn(
          `no preset given, so the hero was left as it is — pick one of ${available.join(
            ', ',
          )} in ${INDEX} and delete the other`,
        );
      }
    }

    const written = flush(opts.dryRun);
    if (opts.dryRun) {
      say(bold('\nWould edit'));
      for (const rel of written) say(`  · ${rel}`);
    } else if (written.length > 0) {
      await formatFiles(written);
    }

    // ---- what a human still has to do ----
    const todos = drop.flatMap((f) => f.manual.map((m) => ({ id: f.id, m })));

    say('');
    say(bold(`${opts.dryRun ? 'Dry run' : 'Prune'} summary`));
    say(
      `  ${done.length} action${done.length === 1 ? '' : 's'}, ${warnings.length} warning${warnings.length === 1 ? '' : 's'}`,
    );
    if (warnings.length > 0) {
      say('\n  Warnings — check each one is something you expected:');
      for (const w of warnings) say(`    ! ${w}`);
    }

    if (todos.length > 0) {
      say('');
      say(bold('TODO — these need a human'));
      say('  Nobody can do these mechanically; the build will point at them too.');
      for (const { id, m } of todos) say(`  [ ] (${id}) ${m}`);
    }

    if (opts.dryRun) {
      say('\nDry run finished. Nothing on disk was changed.');
      return 0;
    }

    // ---- check, build, verify ----
    const results = runCommands(['check', 'build', 'verify']);
    say('');
    say(bold('Results'));
    for (const r of results) say(`  ${r.ok ? '✓' : '✗'} npm run ${r.name}`);
    const failed = results.filter((r) => !r.ok);

    if (failed.length > 0) {
      say('');
      say(bold('✗ THE PRUNE LEFT SOMETHING DANGLING.'));
      say(`  ${failed.map((r) => `npm run ${r.name}`).join(' and ')} failed.`);
      say('  Read the output above: something still refers to a feature that is gone,');
      say('  or one of the TODO items above is now load-bearing. This script will not');
      say('  guess at a repair — fix it by hand (git diff shows everything it did).');
      return 1;
    }

    say('\n✓ check, build and verify all pass.');

    // ---- the scaffolding ----
    say('');
    say(bold('One last thing'));
    say('  These exist only to set the template up, and a site owner does not need them:');
    for (const s of SCAFFOLDING) say(`    ${s}`);
    say('    the `init`, `docs` and `docs:check` scripts in package.json');
    if (!input.isTTY) {
      say('  Not a terminal, so they were kept. Delete them by hand when you are happy.');
    } else {
      const a = await ask(rl, '  Delete them now? [y/N] ', 'n');
      if (yes(a)) removeScaffolding();
      else say('  Kept. Delete them by hand whenever you like.');
    }
    return 0;
  } finally {
    rl.close();
  }
}

function removeScaffolding() {
  const pkgRel = 'package.json';
  const pkgSrc = read(pkgRel);
  if (pkgSrc === null) warn('package.json is missing — could not remove the npm scripts');
  else {
    let out = pkgSrc;
    for (const name of ['init', 'docs', 'docs:check']) {
      const re = new RegExp(`^[ \\t]*"${name}":\\s*"[^"]*",?[ \\t]*\\r?\\n`, 'm');
      if (re.test(out)) {
        out = out.replace(re, '');
        step(`removed the \`${name}\` script from package.json`);
      } else warn(`package.json had no \`${name}\` script (already gone?)`);
    }
    // A removed last entry would leave a trailing comma behind.
    out = out.replace(/,(\s*})/g, '$1');
    if (out !== pkgSrc) writeFileSync(join(ROOT, pkgRel), out);
  }
  // init.mjs deletes itself last: it is already loaded, so this is safe.
  for (const rel of SCAFFOLDING.filter((s) => s !== 'scripts/init.mjs')) deletePath(rel, false);
  deletePath('scripts/init.mjs', false);
  say('  Gone. `git diff` still has the whole story.');
}

try {
  process.exitCode = await main();
} catch (err) {
  console.error('');
  console.error(`✗ ${err instanceof Abort ? err.message : (err?.stack ?? err)}`);
  if (!(err instanceof Abort)) {
    console.error('\nThis is a bug in scripts/init.mjs, or the file it was editing has been');
    console.error('restructured. Nothing further was written; `git status` shows where it got to.');
  }
  process.exitCode = 1;
}
