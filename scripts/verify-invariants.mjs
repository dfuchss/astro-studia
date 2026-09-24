/**
 * The things that must not break, asserted against the built output.
 *
 *   npm run verify   (this, then the audit)
 *
 * Run by the deploy workflow before it publishes, so a regression fails the
 * workflow rather than reaching the site.
 *
 * Two checks ship. Add your own here — this file is meant to grow into the
 * list of promises your particular site has made to the outside world.
 */
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const DIST = join(ROOT, 'dist');

let failed = 0;
const fail = (msg) => {
  console.error(`✗ ${msg}`);
  failed += 1;
};
const ok = (msg) => console.log(`✓ ${msg}`);

if (!existsSync(DIST)) {
  console.error('✗ dist/ not found — run `npm run build` first.');
  process.exit(1);
}

// ---- 1. published assets are byte-identical to the baseline ----------------
{
  const baselineFile = join(ROOT, 'verification/asset-sha256.txt');
  const rows = existsSync(baselineFile)
    ? readFileSync(baselineFile, 'utf8')
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#'))
        .map((l) => {
          const [hash, ...rest] = l.split(/\s+/);
          return { hash, rel: rest.join(' ') };
        })
    : [];

  if (rows.length === 0) {
    // Not a failure: a fresh clone has nothing published yet, and pinning the
    // demo's placeholder assets would only be something to undo.
    console.log('· asset baseline is empty — run `npm run baseline` once your assets are final');
  } else {
    let bad = 0;
    for (const { hash, rel } of rows) {
      const built = join(DIST, rel);
      if (!existsSync(built)) {
        fail(
          `published asset missing from dist/: ${rel} — if you removed it on purpose, run \`npm run baseline\``,
        );
        bad += 1;
        continue;
      }
      const actual = createHash('sha256').update(readFileSync(built)).digest('hex');
      if (actual !== hash) {
        fail(`published asset changed: ${rel} — if that was on purpose, run \`npm run baseline\``);
        bad += 1;
      }
    }
    if (!bad) ok(`assets: ${rows.length} published file(s) byte-identical to the baseline`);
  }
}

// ---- 2. the files that make the host serve the site correctly --------------
{
  // GitHub Pages runs Jekyll over the output unless this exists, and Jekyll
  // ignores directories beginning with an underscore — which is where Astro
  // puts every hashed asset. The failure is a live site with no CSS.
  if (existsSync(join(DIST, '.nojekyll'))) ok('dist/.nojekyll present');
  else fail('dist/.nojekyll is missing — GitHub Pages would skip /_astro/');

  // Only checked when you have one. The deploy replaces the gh-pages branch
  // wholesale, so a CNAME that stops being emitted is a domain that stops
  // resolving, and nothing in the build would otherwise notice.
  if (existsSync(join(ROOT, 'public/CNAME'))) {
    if (existsSync(join(DIST, 'CNAME'))) ok('dist/CNAME present');
    else fail('public/CNAME exists but dist/CNAME does not');
  }
}

process.exit(failed > 0 ? 1 : 0);
