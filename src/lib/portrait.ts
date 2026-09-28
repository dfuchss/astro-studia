import type { ImageMetadata } from 'astro';

/**
 * Your portrait, whatever you happened to name it.
 *
 * ── How to set it ──────────────────────────────────────────────────────────
 *
 * Put ONE file at `src/assets/portrait.<ext>` and delete the one that shipped.
 * `portrait.jpg`, `portrait.png`, `portrait.webp`, `portrait.avif` and
 * `portrait.svg` all work, and nothing else has to change — which is the whole
 * point of this file. Both consumers, `src/components/hero/PersonHero.astro`
 * and `src/pages/cv/index.astro`, read the export below, so the extension is decided
 * once, by the filename on disk, rather than twice, in two `import` lines.
 *
 * ── Why a glob rather than a path in src/consts.ts ─────────────────────────
 *
 * Astro's `<Image>` optimises and sizes an asset it can see statically, and
 * `scripts/audit-site.mjs` fails any `<img>` that ships without intrinsic
 * width and height. A configured string — `portrait: '/assets/portrait.jpg'` —
 * gives it neither: it would arrive as a runtime value pointing into public/,
 * so there would be no optimisation, no hashed filename, and no dimensions
 * without reading the file again through `src/lib/images.ts`.
 *
 * `import.meta.glob(..., { eager: true })` is resolved by Vite at build time,
 * so each match is a real static import and `<Image>` gets the same
 * `ImageMetadata` it would from a literal import line. The convention IS the
 * configuration.
 */
const found = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/portrait.{avif,gif,jpeg,jpg,png,svg,webp}',
  { eager: true },
);

const matches = Object.keys(found).sort();

/*
 * Both failures are build errors naming the path, not a broken <img> that only
 * a reader notices. Two portraits is as wrong as none: picking one of them by
 * sort order would work, and would then silently keep showing the old photo
 * after somebody added a new one in a different format.
 */
if (matches.length === 0) {
  throw new Error(
    'portrait: no src/assets/portrait.<ext> found — add one ' +
      '(portrait.jpg, .png, .webp, .avif or .svg). It is rendered by ' +
      'src/components/hero/PersonHero.astro and src/pages/cv/index.astro.',
  );
}
if (matches.length > 1) {
  throw new Error(
    `portrait: ${matches.length} portraits in src/assets/ (${matches
      .map((m) => m.replace('../assets/', ''))
      .join(', ')}) — keep exactly one.`,
  );
}

export const portrait: ImageMetadata = found[matches[0]].default;

/**
 * The side of the square both consumers render it at, before CSS scales it
 * down. One number, because the home page's hero portrait and the CV's are
 * deliberately the same object and a reader should not be able to tell them
 * apart.
 */
export const PORTRAIT_SIZE = 320;
