/*
 * Structural and accessibility audit of dist/.
 *
 * Offline and structural on purpose. It runs against the built bytes before
 * anything is published, rather than crawling the live site afterwards and
 * telling you about a problem your readers found first.
 *
 * Run it with `npm run audit`, or `npm run verify` to get the asset checks too.
 * The deploy workflow runs verify before it publishes, so a regression fails
 * the build instead of reaching the site.
 *
 * Each block below is one check and they are independent — delete one you do
 * not want, add one you do. Checks 1, 2, 2b and 3 are contracts this template
 * makes about itself; 4 through 8 are true of any site.
 *
 * A note on the shape of these checks: several work by regex over built
 * output, which is a technique with one characteristic failure — change the
 * thing being matched and the regex silently matches nothing and reports
 * success. Every check of that kind here therefore asserts a floor on how much
 * it found. A check that has stopped checking must fail, not pass.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const DIST = join(ROOT, 'dist');
const SRC = join(ROOT, 'src');

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

/* ---- configuration, read from src/consts.ts -------------------------------
 * Parsed rather than imported: this is a plain node script with no TypeScript
 * loader, and the two values it needs are unambiguous in the source.
 */
const consts = readFileSync(join(SRC, 'consts.ts'), 'utf8');
const astroConfig = readFileSync(join(ROOT, 'astro.config.ts'), 'utf8');

const siteUrl = consts.match(/url:\s*'([^']+)'/)?.[1];
if (!siteUrl) {
  console.error('✗ could not read SITE.url from src/consts.ts');
  process.exit(1);
}
const OWN_HOST = new URL(siteUrl).host;

/**
 * The base path, when the site is deployed into a subdirectory.
 *
 * Astro rewrites the URLs it generates itself, but not an href you wrote by
 * hand — so a site with a base is exactly where internal links silently point
 * at the domain root. Check 4 below asserts that every one of them carries
 * the base, which is the failure this whole file exists to make loud.
 */
const BASE = (astroConfig.match(/^\s*base:\s*'([^']+)'/m)?.[1] ?? '').replace(/\/$/, '');

const ALLOWED = new Set(
  [
    ...(consts.match(/ALLOWED_THIRD_PARTY:\s*string\[\]\s*=\s*\[([^\]]*)\]/s)?.[1] ?? '').matchAll(
      /'([^']+)'/g,
    ),
  ].map((m) => m[1]),
);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const files = walk(DIST);
const htmlFiles = files.filter((f) => f.endsWith('.html'));
const cssFiles = files.filter((f) => f.endsWith('.css'));
const jsFiles = files.filter((f) => f.endsWith('.js'));
const pages = htmlFiles.map((f) => ({
  file: f,
  url: '/' + relative(DIST, f).split('\\').join('/'),
  html: readFileSync(f, 'utf8'),
}));

// A redirect stub is intentionally minimal: no nav, no canonical, no h1.
const isStub = (p) => /<meta http-equiv="refresh"/i.test(p.html);
const real = pages.filter((p) => !isStub(p));

// ---- 1. every CSS custom property is defined --------------------------------
{
  const defined = new Set();
  const used = new Map();
  const collect = (text, where) => {
    for (const m of text.matchAll(/(--[a-z0-9-]+)\s*:/gi)) defined.add(m[1]);
    for (const m of text.matchAll(/var\(\s*(--[a-z0-9-]+)/gi)) {
      if (!used.has(m[1])) used.set(m[1], where);
    }
  };
  for (const f of cssFiles) collect(readFileSync(f, 'utf8'), relative(DIST, f));
  // Inline styles count too: the venue badges pass their brand colour that way.
  for (const p of pages) {
    for (const m of p.html.matchAll(/style="([^"]*)"/g)) collect(m[1], p.url);
    for (const m of p.html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) collect(m[1], p.url);
  }
  const undef = [...used].filter(([name]) => !defined.has(name));
  if (undef.length) for (const [n, w] of undef) fail(`undefined custom property ${n} (${w})`);
  else ok(`css: ${used.size} custom properties, all defined`);
}

// ---- 2. dark-only: no theme switching crept back in -------------------------
{
  const offenders = [
    ...cssFiles.filter((f) => /\[data-theme/.test(readFileSync(f, 'utf8'))),
    ...pages.filter((p) => /data-theme|light-toggle/.test(p.html)).map((p) => p.file),
  ];
  if (offenders.length) fail(`dark-only violated in ${offenders.length} file(s)`);
  else ok('css: dark-only, no theme toggle');
}

// ---- 2b. every section has an accent block ----------------------------------
{
  /*
   * The `Section` union in consts.ts and the [data-section] blocks in
   * tokens.css have to agree, or a page renders with the wrong accent — or
   * with the default one, which looks deliberate and is the harder bug.
   *
   * Comparing the built HTML against the built CSS catches it from the outside
   * without this script needing to parse TypeScript.
   */
  const inHtml = new Set();
  for (const p of pages) {
    for (const m of p.html.matchAll(/\bdata-section="([a-z0-9-]+)"/gi)) inHtml.add(m[1]);
  }
  const inCss = new Set();
  for (const f of cssFiles) {
    for (const m of readFileSync(f, 'utf8').matchAll(/\[data-section=['"]?([a-z0-9-]+)/gi)) {
      inCss.add(m[1]);
    }
  }

  if (inHtml.size < 2) {
    fail(`section contract: only ${inHtml.size} data-section values found — is this check stale?`);
  } else {
    const missing = [...inHtml].filter((s) => !inCss.has(s));
    if (missing.length) {
      for (const s of missing) {
        fail(
          `section '${s}' is used in the HTML but has no [data-section='${s}'] block in the CSS`,
        );
      }
    } else {
      ok(`css: all ${inHtml.size} sections have an accent block`);
    }
  }
}

// ---- 3. contrast ------------------------------------------------------------
{
  /*
   * Derived, not listed. Every token whose value is a bare 6-digit hex is
   * checked; the role tokens (-strong, -line, -dim, -glow) are color-mix()
   * expressions and so are skipped automatically, which is right — they are
   * borders and tints, not text.
   *
   * Change the palette and this follows it. Add a sixth accent family and it
   * is checked without anyone remembering to add it here.
   */
  const tokens = {};
  for (const f of cssFiles) {
    for (const m of readFileSync(f, 'utf8').matchAll(
      /(--[a-z0-9-]+)\s*:\s*(#[0-9a-f]{6})\s*[;}]/gi,
    )) {
      tokens[m[1].toLowerCase()] = m[2];
    }
  }

  const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lum = (hex) => {
    const [r, g, b] = rgb(hex).map((c) =>
      c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
    );
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a, b) => {
    const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (l1 + 0.05) / (l2 + 0.05);
  };

  const bg = tokens['--bg'];
  if (!bg) {
    fail('contrast: --bg is not defined');
  } else {
    // Surfaces are what things sit ON, and borders are not text.
    const skip = /^--(bg|border|sec)/;
    const checks = Object.keys(tokens)
      .filter((t) => t !== '--bg' && !skip.test(t))
      // 4.5:1 is the WCAG AA threshold for body text; 3:1 for large text and
      // for non-text elements such as an icon or a rule that carries meaning.
      .map((t) => [t, t.startsWith('--text') ? 4.5 : 3]);

    if (checks.length < 3) {
      fail(`contrast: only ${checks.length} colour tokens parsed — is this check stale?`);
    } else {
      let bad = 0;
      for (const [token, min] of checks) {
        const r = ratio(tokens[token], bg);
        if (r < min) {
          fail(`contrast: ${token} is ${r.toFixed(2)}:1 on --bg, needs ${min}:1`);
          bad += 1;
        }
      }
      if (!bad) ok(`a11y: ${checks.length} colour tokens all clear WCAG on --bg`);
    }
  }
}

// ---- 4. internal links and fragments resolve --------------------------------
{
  const idsOf = new Map();
  for (const p of pages) {
    const ids = new Set();
    for (const m of p.html.matchAll(/\sid="([^"]+)"/g)) ids.add(m[1]);
    for (const m of p.html.matchAll(/\sname="([^"]+)"/g)) ids.add(m[1]);
    idsOf.set(p.url, ids);
  }

  // A published URL maps to a file two ways: /a/b -> a/b.html, /a/b/ -> a/b/index.html
  //
  // With a base configured, dist/ is still the root of what gets deployed --
  // the subdirectory comes from where it is deployed TO -- so the base is
  // stripped before looking anything up on disk.
  const resolve = (raw) => {
    const path = BASE && raw.startsWith(`${BASE}/`) ? raw.slice(BASE.length) : raw;
    const clean = path.replace(/\/+$/, '');
    for (const candidate of [
      join(DIST, path),
      join(DIST, `${clean}.html`),
      join(DIST, clean, 'index.html'),
      join(DIST, path, 'index.html'),
    ]) {
      if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
    }
    return undefined;
  };

  let links = 0;
  let frags = 0;
  for (const p of pages) {
    for (const m of p.html.matchAll(/\bhref="([^"]+)"/g)) {
      const raw = m[1];
      if (/^(https?:|mailto:|#|data:)/.test(raw)) {
        if (raw.startsWith('#')) {
          frags += 1;
          const id = decodeURIComponent(raw.slice(1));
          if (id && !idsOf.get(p.url)?.has(id)) fail(`${p.url}: fragment ${raw} has no target`);
        }
        continue;
      }
      if (!raw.startsWith('/')) continue;
      links += 1;

      // The base check. src/integrations/base-paths.ts should have prefixed
      // every internal URL during the build; one that slipped through points
      // at the domain root and 404s wherever the site actually lives.
      if (BASE && raw !== BASE && !raw.startsWith(`${BASE}/`)) {
        fail(
          `${p.url}: link ${raw} is missing the base ${BASE} — ` +
            'the base-paths integration did not reach it',
        );
        continue;
      }

      const [path, hash] = raw.split('#');
      const target = resolve(decodeURIComponent(path));
      if (!target) {
        fail(`${p.url}: link ${raw} does not resolve`);
        continue;
      }
      if (hash && target.endsWith('.html')) {
        frags += 1;
        const url = '/' + relative(DIST, target).split('\\').join('/');
        const ids = idsOf.get(url);
        if (ids && !ids.has(decodeURIComponent(hash))) {
          fail(`${p.url}: link ${raw} — #${hash} not found on ${url}`);
        }
      }
    }
  }
  // Subresources are not links, but they carry the same base problem, and an
  // <img> pointing at the domain root is a broken image rather than a broken
  // link -- quieter, and so easier to ship.
  let assets = 0;
  if (BASE) {
    for (const p of pages) {
      for (const m of p.html.matchAll(/\ssrc="(\/[^"]*)"/g)) {
        assets += 1;
        if (!m[1].startsWith(`${BASE}/`)) {
          fail(
            `${p.url}: src ${m[1]} is missing the base ${BASE} — ` +
              'the base-paths integration did not reach it',
          );
        }
      }
    }
  }

  if (links < 1) fail('links: no internal links found at all — is this check stale?');
  else {
    ok(
      `links: ${links} internal links and ${frags} fragments resolve` +
        (BASE ? `, ${assets} subresources carry the base ${BASE}/` : ''),
    );
  }
}

// ---- 5. per-page document basics -------------------------------------------
{
  let bad = 0;
  for (const p of real) {
    const h1 = (p.html.match(/<h1[\s>]/g) ?? []).length;
    if (h1 !== 1) {
      fail(`${p.url}: ${h1} <h1> elements, expected exactly 1`);
      bad += 1;
    }
    if (!/<title>[^<]+<\/title>/.test(p.html)) {
      fail(`${p.url}: no <title>`);
      bad += 1;
    }
    if (!/<meta name="description" content="[^"]+"/.test(p.html)) {
      fail(`${p.url}: no meta description`);
      bad += 1;
    }
    if (!/<link rel="canonical"/.test(p.html)) {
      fail(`${p.url}: no canonical link`);
      bad += 1;
    }
  }
  if (!bad) {
    ok(`html: ${real.length} pages each have one h1, a title, a description and a canonical`);
  }
}

// ---- 6. images carry intrinsic dimensions -----------------------------------
{
  /*
   * Without width and height the page reflows as each image loads, which is
   * both the worst of the layout-shift metrics and genuinely unpleasant to
   * read. Images from src/assets/ get them from Astro; images in public/ get
   * them from intrinsic() in src/lib/images.ts; an <img> written by hand in
   * markdown gets them from you.
   */
  let imgs = 0;
  let bad = 0;
  for (const p of pages) {
    for (const m of p.html.matchAll(/<img\b[^>]*>/g)) {
      imgs += 1;
      if (!/\bwidth=/.test(m[0]) || !/\bheight=/.test(m[0])) {
        fail(`${p.url}: <img> without width/height — ${m[0].slice(0, 90).replace(/\s+/g, ' ')}`);
        bad += 1;
      }
    }
  }
  if (!bad) ok(`html: all ${imgs} images have intrinsic dimensions`);
}

// ---- 6b. text does not run into a link ---------------------------------------
{
  /*
   * Astro strips the newline between a trailing word and a following <a>, so
   *
   *     written at the
   *     <a href="...">institute</a>, <a href="...">somewhere</a>
   *
   * renders as "written at theinstitute, somewhere". It reads fine in the
   * source and is easy to miss in review, so check the rendered bytes: a word
   * character or a comma immediately against a link boundary, with no space.
   */
  // Chips, badges and icon links are spaced by CSS margin or flex gap rather
  // than by a text node, so a word sitting flush against their markup is
  // correct. Only prose links are checked.
  //
  // `orcid` is here because an ORCID icon immediately after an author's name
  // is the standard academic pattern — `Jan Keim<a class="orcid">` is exactly
  // what you want, and without this entry every author on every paper page is
  // reported.
  const STYLED = /class="[^"]*\b(?:chip|venue|who|title-link|brand|orcid|icon)\b/;
  const OPEN = /([A-Za-z0-9,.;:])(<a\s[^>]*>)/g;
  const CLOSE = /<\/a>([A-Za-z0-9])/g;

  let joins = 0;
  for (const p of real) {
    const body = p.html.replace(/<(pre|code|script|style)[\s\S]*?<\/\1>/g, '');

    OPEN.lastIndex = 0;
    let m;
    while ((m = OPEN.exec(body)) !== null) {
      if (STYLED.test(m[2])) continue;
      const near = body.slice(Math.max(0, m.index - 45), m.index + 45).replace(/\s+/g, ' ');
      fail(`${p.url}: text runs into the start of a link — …${near}…`);
      joins += 1;
    }

    CLOSE.lastIndex = 0;
    while ((m = CLOSE.exec(body)) !== null) {
      // Find the opening tag of the link that just closed.
      const open = body.lastIndexOf('<a ', m.index);
      if (open !== -1 && STYLED.test(body.slice(open, body.indexOf('>', open) + 1))) continue;
      const near = body.slice(Math.max(0, m.index - 45), m.index + 45).replace(/\s+/g, ' ');
      fail(`${p.url}: text runs on from the end of a link — …${near}…`);
      joins += 1;
    }
  }
  if (!joins) ok(`html: no text runs into a link on ${real.length} pages`);
}

// ---- 7. third-party subresources are only the ones you chose ----------------
{
  /*
   * Links to other sites are the whole point of an academic page, so only
   * *subresources* count here — the things a browser fetches without being
   * asked, which are also the things that see your readers' IP addresses.
   *
   * The allowlist is ALLOWED_THIRD_PARTY in src/consts.ts, and it ships empty.
   * A site embedding a talk would put 'www.youtube.com' there and nothing
   * else; naming it means a second origin cannot appear unnoticed.
   */
  const SUBRESOURCE = /<(?:img|script|iframe|source|video|audio)\b[^>]*\bsrc="https?:\/\/([^"/]+)/g;
  /*
   * <link> is separate, because most of them fetch nothing. rel="canonical"
   * and rel="alternate" are metadata and routinely point at another origin on
   * purpose; only these rel values cause a request.
   */
  const FETCHING_LINK =
    /<link\b[^>]*\brel="(?:stylesheet|preload|prefetch|preconnect|icon|apple-touch-icon|manifest|modulepreload)"[^>]*\bhref="https?:\/\/([^"/]+)/g;

  const found = new Map();
  for (const p of pages) {
    /*
     * Blank the BODY of an inline script, but keep its opening tag. Stripping
     * whole <script> elements — the obvious way to write this — also removes
     * every <script src="https://…">, which is the single highest-risk
     * subresource there is. The bodies still have to go, because a URL in a
     * string literal is not a subresource.
     */
    const stripped = p.html.replace(/(<script\b[^>]*>)[\s\S]*?<\/script>/g, '$1</script>');
    for (const re of [SUBRESOURCE, FETCHING_LINK]) {
      for (const m of stripped.matchAll(re)) {
        const host = m[1];
        if (host === OWN_HOST || ALLOWED.has(host)) continue;
        if (!found.has(host)) found.set(host, p.url);
      }
    }
  }
  if (found.size) for (const [h, u] of found) fail(`third-party subresource origin ${h} on ${u}`);
  else
    ok(
      `privacy: no third-party subresources${ALLOWED.size ? ` beyond ${[...ALLOWED].join(', ')}` : ''}`,
    );
}

// ---- 8. no email address is in the served bytes -----------------------------
{
  /*
   * Email.astro splits an address across two rot13'd attributes and assembles
   * it on load, so none of this should ever match. The check exists because
   * the way that protection is lost is not by breaking the component — it is
   * by somebody writing a plain mailto: into a page, which looks completely
   * normal in review.
   */
  const ADDRESS = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}\b/g;
  const found = new Map();
  for (const f of [...htmlFiles, ...files.filter((x) => x.endsWith('.xml'))]) {
    for (const m of readFileSync(f, 'utf8').matchAll(ADDRESS)) {
      if (!found.has(m[0])) found.set(m[0], relative(DIST, f));
    }
  }
  if (found.size) for (const [a, w] of found) fail(`email address ${a} in the served bytes (${w})`);
  else ok('privacy: no email address appears in the built output');
}

// ---- 9. the feed and the sitemap are well-formed and not empty --------------
{
  /*
   * Both are generated, both are easy to break without noticing, and both are
   * consumed by machines that will not tell you they stopped working.
   */
  const checkXml = (name, itemTag) => {
    const f = join(DIST, name);
    if (!existsSync(f)) {
      fail(`${name} was not generated`);
      return;
    }
    const xml = readFileSync(f, 'utf8');
    if (!xml.trimStart().startsWith('<?xml')) {
      fail(`${name} does not start with an XML declaration`);
      return;
    }
    const n = (xml.match(new RegExp(`<${itemTag}[\\s>]`, 'g')) ?? []).length;
    if (n === 0) fail(`${name} contains no <${itemTag}> entries`);
    else ok(`${name}: ${n} <${itemTag}> entries, well-formed`);
  };

  // Only expected when the blog is still here. Removing the blog removes the
  // feed, and an audit that then demanded one would be telling you off for
  // following the documented removal recipe. A feed that *should* exist and
  // does not is still a failure.
  if (existsSync(join(SRC, 'pages/feed.xml.ts'))) checkXml('feed.xml', 'item');
  /*
   * Whichever shape the sitemap takes. @astrojs/sitemap emits an index plus one
   * or more numbered files; a hand-rolled endpoint is usually a single
   * sitemap.xml. Either is fine and nothing here should prefer one — but having
   * neither means nothing is telling a crawler what exists.
   */
  if (existsSync(join(DIST, 'sitemap-index.xml'))) {
    checkXml('sitemap-index.xml', 'sitemap');
    checkXml('sitemap-0.xml', 'url');
  } else if (existsSync(join(DIST, 'sitemap.xml'))) {
    checkXml('sitemap.xml', 'url');
  } else {
    fail('no sitemap was generated (expected sitemap-index.xml or sitemap.xml)');
  }
}

// ---- 10. weight --------------------------------------------------------------
{
  const sum = (list) => list.reduce((n, f) => n + statSync(f).size, 0);
  const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

  // Astro inlines scripts this small, so counting .js files alone reports zero
  // while the pages do ship behaviour. Measure the inline bytes instead, and
  // report the heaviest page rather than a total nobody downloads.
  let heaviest = { url: '-', bytes: 0 };
  for (const p of pages) {
    let bytes = 0;
    for (const m of p.html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) {
      if (/application\/ld\+json/.test(m[0])) continue;
      bytes += Buffer.byteLength(m[1]);
    }
    if (bytes > heaviest.bytes) heaviest = { url: p.url, bytes };
  }

  console.log(
    `  bundle: ${kb(sum(cssFiles))} CSS across ${cssFiles.length} file(s), ` +
      `${kb(sum(jsFiles))} external JS; most inline JS on one page: ` +
      `${kb(heaviest.bytes)} (${heaviest.url})`,
  );
}

process.exit(failed > 0 ? 1 : 0);
