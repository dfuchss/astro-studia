/**
 * Set this template up: pick the features you want, and say who it is about.
 *
 *   npm run init                                 interactive
 *   node scripts/init.mjs --preset profile       non-interactive
 *   node scripts/init.mjs --features cv,imprint  exactly these, nothing else
 *   node scripts/init.mjs --preset project --dry-run
 *
 * IT DELETES NOTHING: it writes booleans into src/features.ts and six strings
 * into src/consts.ts, and nothing else. Run it twice and the second run is a
 * no-op.
 *
 * It refuses a combination that cannot build rather than fixing one, because
 * `papers` without `authors` is a choice between two features and not this
 * script's to guess. src/features.ts asserts the same rules at build time.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { FEATURES, PRESETS, PRESET_FEED, byId, check, featuresFor } from './features.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const FLAGS = 'src/features.ts';
const CONSTS = 'src/consts.ts';

// ---------------------------------------------------------------------------
// output
// ---------------------------------------------------------------------------

const say = (s = '') => console.log(s);
const step = (s) => console.log(`  · ${s}`);
const warn = (s) => console.log(`  ! ${s}`);

class Abort extends Error {}

const stop = (msg) => {
  throw new Abort(msg);
};

const ESC = String.fromCharCode(27);
const bold = (s) => (output.isTTY ? `${ESC}[1m${s}${ESC}[0m` : s);

// ---------------------------------------------------------------------------
// arguments
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const opts = { preset: null, features: null, dryRun: false, yes: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    const value = () => {
      const v = a.includes('=') ? a.slice(a.indexOf('=') + 1) : argv[++i];
      if (!v) stop(`${a} needs a value`);
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
    } else stop(`unknown argument: ${a}`);
  }
  if (opts.preset && !PRESETS.includes(opts.preset)) {
    stop(`unknown preset "${opts.preset}" — known presets: ${PRESETS.join(', ')}`);
  }
  for (const id of opts.features ?? []) {
    if (!byId(id)) {
      stop(`unknown feature "${id}" — known: ${FEATURES.map((f) => f.id).join(', ')}`);
    }
  }
  return opts;
}

const HELP = `
Set up Studia Theme. Writes src/features.ts and src/consts.ts; deletes nothing.

  node scripts/init.mjs                      pick interactively
  node scripts/init.mjs --preset <${PRESETS.join('|')}>
  node scripts/init.mjs --features a,b,c     turn on exactly these
  node scripts/init.mjs --dry-run            print the changes, write nothing
  node scripts/init.mjs --yes                keep every current string, no prompts

Features: ${FEATURES.map((f) => f.id).join(', ')}
`;

// ---------------------------------------------------------------------------
// reading and writing the two files
// ---------------------------------------------------------------------------

const abs = (rel) => join(ROOT, rel);
const slurp = (rel) => readFileSync(abs(rel), 'utf8');

/** The bounds of one `export const <NAME> = { … } as const;` block. */
function constBlock(src, name) {
  const open = src.indexOf(`export const ${name} = {`);
  if (open === -1) stop(`${CONSTS}: no \`export const ${name} = {\` — edit it by hand`);
  const close = src.indexOf('\n} as const;', open);
  if (close === -1) {
    stop(`${CONSTS}: \`${name}\` does not end in \`} as const;\` — edit it by hand`);
  }
  return [open, close];
}

const STRING_VALUE = String.raw`'(?:[^'\\]|\\.)*'`;

/**
 * Replace `key: '<old>'` inside one `export const <NAME>` block. Scoped to the
 * block because `title` and `url` occur in half a dozen other objects here. A
 * missing key is a hard stop, not a skip: writing half the answers and
 * reporting success is worse.
 */
function setString(src, name, key, value) {
  const [open, close] = constBlock(src, name);
  const block = src.slice(open, close);
  const re = new RegExp(`^(\\s*${key}: )${STRING_VALUE}(,?)$`, 'm');
  if (!re.test(block)) {
    stop(`${CONSTS}: \`${name}.${key}\` is not a one-line single-quoted string — edit by hand`);
  }
  const quoted = `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  // A function replacer, because a literal `$` in a URL or a name would
  // otherwise be read as a backreference.
  const next = block.replace(re, (_m, head, tail) => head + quoted + tail);
  return src.slice(0, open) + next + src.slice(close);
}

function readString(src, name, key) {
  const [open, close] = constBlock(src, name);
  const m = new RegExp(`^\\s*${key}: '((?:[^'\\\\]|\\\\.)*)',?$`, 'm').exec(src.slice(open, close));
  if (!m) stop(`${CONSTS}: cannot read \`${name}.${key}\` — edit it by hand`);
  return m[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\');
}

/** The booleans currently in src/features.ts. */
function readFlags(src) {
  const flags = new Map();
  for (const [, id, v] of src.matchAll(/^\s*(\w+): (true|false),$/gm)) flags.set(id, v === 'true');
  return flags;
}

function setFlags(src, on) {
  let out = src;
  for (const f of FEATURES) {
    const re = new RegExp(`^(\\s*${f.id}: )(?:true|false)(,)$`, 'm');
    if (!re.test(out)) stop(`${FLAGS}: no flag line for \`${f.id}\` — run \`npm run docs\` first`);
    out = out.replace(re, (_m, head, tail) => `${head}${on.has(f.id)}${tail}`);
  }
  return out;
}

const CHOICE = /^export const (HOME_SHAPE|FEED_SOURCE): [^=]+= '([^']*)';$/gm;

function readChoice(src, name) {
  for (const [, found, value] of src.matchAll(CHOICE)) if (found === name) return value;
  return stop(`${FLAGS}: no \`export const ${name}\` line — edit it by hand`);
}

function setChoice(src, name, value) {
  let seen = false;
  const out = src.replace(CHOICE, (whole, found, old) => {
    if (found !== name) return whole;
    seen = true;
    return whole.replace(`'${old}';`, `'${value}';`);
  });
  if (!seen) stop(`${FLAGS}: no \`export const ${name}\` line — edit it by hand`);
  return out;
}

// ---------------------------------------------------------------------------
// interaction
// ---------------------------------------------------------------------------

/** Ask, when there is somebody there to answer. null when stdin is not a
    terminal, which every caller reads as "leave it as it is" — so a piped
    invocation changes only what its flags named. */
async function ask(rl, question) {
  if (!rl) return null;
  try {
    return (await rl.question(question)).trim();
  } catch (err) {
    // Ctrl+D (or a closed stdin) arrives here as AbortError. That is somebody
    // leaving, not a crash, so it must not print a stack trace.
    if (err?.name === 'AbortError') throw new Abort('cancelled — nothing was written');
    throw err;
  }
}

const yes = (s) => /^(y|yes)$/i.test(s ?? '');

/** One string, offering the current value as the default. */
async function askString(rl, label, current) {
  const a = await ask(rl, `  ${label.padEnd(12)} [${current}]: `);
  return a ? a : current;
}

async function askChoice(rl, label, options, current) {
  for (;;) {
    const a = await ask(rl, `  ${label.padEnd(12)} [${options.join('/')}, default ${current}]: `);
    if (!a) return current;
    if (options.includes(a)) return a;
    say(`  ? not one of ${options.join(', ')}`);
  }
}

async function chooseInteractively(rl) {
  say(bold('\nPresets'));
  PRESETS.forEach((p, i) => {
    const ids = featuresFor(p);
    say(`  ${i + 1}) ${p.padEnd(8)} ${ids.length} features: ${ids.join(', ')}`);
  });
  say(`  ${PRESETS.length + 1}) custom   start from everything and untick`);

  let preset = null;
  for (;;) {
    const a = (await ask(rl, `\nStart from [1-${PRESETS.length + 1}, default 1]: `)) || '1';
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
    const answer = (await ask(rl, '\n> ')) ?? 'd';
    if (answer === '' || /^(d|done)$/i.test(answer)) break;
    if (/^(a|all)$/i.test(answer)) {
      FEATURES.forEach((f) => selected.add(f.id));
      continue;
    }
    if (/^(n|none)$/i.test(answer)) {
      selected.clear();
      continue;
    }
    if (/^(q|quit)$/i.test(answer)) throw new Abort('cancelled — nothing was written');
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
// after the write
// ---------------------------------------------------------------------------

function formatFiles(rels) {
  const r = spawnSync('npx', ['prettier', '--write', ...rels], { cwd: ROOT, stdio: 'pipe' });
  if (r.status === 0) step(`prettier formatted ${rels.join(' and ')}`);
  else warn(`prettier failed — run \`npm run format\` by hand`);
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
// main
// ---------------------------------------------------------------------------

/** The feed source for a selection, preferring what is already set. */
function feedFor(on, current, preset) {
  const possible = ['posts', 'papers'].filter((s) =>
    s === 'posts' ? on.has('blog') : on.has('papers'),
  );
  if (possible.length === 0) return current;
  const wanted = preset ? PRESET_FEED[preset] : current;
  return possible.includes(wanted) ? wanted : possible[0];
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    say(HELP.trim());
    return 0;
  }

  const interactive = Boolean(input.isTTY) && !opts.yes;
  const rl = interactive ? createInterface({ input, output }) : null;

  try {
    let flagsSrc = slurp(FLAGS);
    let constsSrc = slurp(CONSTS);
    const before = readFlags(flagsSrc);

    // ---- which features ----
    let preset = opts.preset;
    let selected;
    if (opts.features) {
      selected = opts.features;
    } else if (opts.preset) {
      selected = featuresFor(opts.preset);
    } else if (interactive) {
      ({ preset, selected } = await chooseInteractively(rl));
    } else {
      say(HELP.trim());
      say('\nNothing to do: stdin is not a terminal and no --preset or --features was given.');
      return 1;
    }
    const on = new Set(selected);

    const { missing, unmet } = check(selected);
    if (missing.length > 0 || unmet.length > 0) {
      const lines = [
        ...missing.map(({ id, dep }) => `${id} is on, and ${dep}, which it needs, is off`),
        ...unmet.map(({ id, options }) => `${id} is on, and all of ${options.join(', ')} are off`),
      ];
      stop(
        `that selection cannot build:\n${lines.map((l) => `    · ${l}`).join('\n')}\n` +
          '  Turn the dependency on, or turn the dependent feature off.',
      );
    }

    // ---- the two shape choices ----
    let home = preset ?? readChoice(flagsSrc, 'HOME_SHAPE');
    let feed = feedFor(on, readChoice(flagsSrc, 'FEED_SOURCE'), preset);

    if (interactive) {
      say(bold('\nShape') + ' — press Enter to keep the value in brackets.');
      home = await askChoice(rl, 'home page', ['profile', 'project'], home);
      const sources = ['posts', 'papers'].filter((s) =>
        s === 'posts' ? on.has('blog') : on.has('papers'),
      );
      if (on.has('feed') && sources.length > 1) {
        feed = await askChoice(rl, 'feed of', sources, feed);
      }
    }

    // ---- who the site is about ----
    const SITE_KEYS = ['url', 'title', 'brand', 'email'];
    const identity = {
      url: readString(constsSrc, 'SITE', 'url'),
      title: readString(constsSrc, 'SITE', 'title'),
      brand: readString(constsSrc, 'SITE', 'brand'),
      email: readString(constsSrc, 'SITE', 'email'),
      first: readString(constsSrc, 'SELF', 'first'),
      last: readString(constsSrc, 'SELF', 'last'),
    };
    if (interactive) {
      say(bold('\nWho the site is about') + ' — press Enter to keep the value in brackets.');
      identity.url = await askString(rl, 'site url', identity.url);
      identity.title = await askString(rl, 'title', identity.title);
      identity.brand = await askString(rl, 'nav brand', identity.brand);
      identity.email = await askString(rl, 'email', identity.email);
      identity.first = await askString(rl, 'first name', identity.first);
      identity.last = await askString(rl, 'last name', identity.last);
    }

    // ---- compose ----
    flagsSrc = setFlags(flagsSrc, on);
    flagsSrc = setChoice(flagsSrc, 'HOME_SHAPE', home);
    flagsSrc = setChoice(flagsSrc, 'FEED_SOURCE', feed);
    for (const [key, value] of Object.entries(identity)) {
      constsSrc = setString(constsSrc, SITE_KEYS.includes(key) ? 'SITE' : 'SELF', key, value);
    }

    // ---- report ----
    say(bold('\nFeatures'));
    for (const f of FEATURES) {
      const now = on.has(f.id);
      const was = before.get(f.id);
      const note = was === undefined || was === now ? '' : `   <- was ${was ? 'on' : 'off'}`;
      say(`  ${now ? 'on ' : 'off'}  ${f.id.padEnd(14)}${note}`);
    }
    say(bold('\nShape'));
    say(`  home page    ${home}`);
    say(`  feed of      ${on.has('feed') ? feed : '— (feed is off)'}`);
    say(bold('\nWho the site is about'));
    for (const [key, value] of Object.entries(identity)) say(`  ${key.padEnd(12)} ${value}`);

    if (opts.dryRun) {
      say(bold('\n--dry-run: nothing was written.'));
      return 0;
    }

    writeFileSync(abs(FLAGS), flagsSrc);
    writeFileSync(abs(CONSTS), constsSrc);
    say(bold('\nWritten'));
    step(`${FLAGS} — ${on.size} of ${FEATURES.length} features on`);
    step(`${CONSTS} — the six strings above`);
    formatFiles([FLAGS, CONSTS]);

    // ---- what is left for a human ----
    say(bold('\nStill yours to do'));
    [
      'SELF.surnames is how an author in papers.bib is recognised as you — list every spelling you publish under',
      'src/consts.ts still holds the demo tagline, description, copyright and brand logo',
      'SITE.demoNotice prints a banner on the entry page; set it to null once the content is yours',
      "src/data/ and src/content/ are still Cicero's",
      ...FEATURES.filter((f) => !on.has(f.id)).flatMap((f) => f.manual.map((m) => `${f.id}: ${m}`)),
    ].forEach((n) => say(`  · ${n}`));

    // ---- verify ----
    if (!interactive || !yes(await ask(rl, '\nRun check, build and audit now? [y/N] '))) {
      say('\nRun `npm run check && npm run build && npm run audit` when you are ready.');
      return 0;
    }

    const failed = runCommands(['check', 'build', 'audit'])
      .filter((r) => !r.ok)
      .map((r) => r.name);
    if (failed.length === 0) {
      say(bold('\nPassed: check, build and audit.'));
      return 0;
    }
    say(bold(`\nFailed: ${failed.join(' and ')}.`));
    say('Nothing was deleted, so `git diff src/features.ts src/consts.ts` is the whole change.');
    return 1;
  } finally {
    rl?.close();
  }
}

try {
  process.exitCode = await main();
} catch (err) {
  if (err instanceof Abort) {
    console.error(`\n✗ ${err.message}`);
    process.exitCode = 1;
  } else {
    throw err;
  }
}
