import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { socials } from './data.ts';

/**
 * Everything /pgp-key/ needs, derived from the one value in socials.yml.
 *
 * A fingerprint is 40 hex characters. Storing only that — rather than a
 * fingerprint, a key id, a formatted version and a filename — means the four
 * cannot disagree, which is the failure this replaces.
 *
 * Every function returns null when no fingerprint is set, and the page and
 * SocialRow both stand down quietly in that case.
 */
const raw = socials.pgp_fingerprint?.replace(/\s+/g, '').toUpperCase() ?? null;
const valid = raw && /^[0-9A-F]{40}$/.test(raw) ? raw : null;

/** The long key id: the last 16 characters, which is what people paste. */
export const keyId = () => (valid ? valid.slice(-16) : null);

/** The fingerprint in the usual groups of four, for reading aloud. */
export const grouped = () => (valid ? (valid.match(/.{4}/g)?.join(' ') ?? valid) : null);

export const fingerprint = () => valid;

/** Where the exported public key lives. Put the .asc file there yourself. */
export const keyPath = () => (valid ? `/assets/pgp-key/${valid}.asc` : null);

/**
 * The ASCII-armored public key itself, if the .asc file is actually there.
 *
 * Read at build time so /pgp-key/ can print the block in a `<pre>` rather than
 * only linking to it: a key that is part of the document works without JS, is
 * indexable, and can be copied in one click. Fetching it on load — which is how
 * fuchss.org did this before — gives up all three.
 *
 * NOTHING NEW TO CONFIGURE. The path is derived from the same fingerprint as
 * everything else in this file, and the file being absent is a supported state,
 * not an error: the page falls back to the fingerprint, the key id and the
 * download link, which is what it has always shown.
 *
 * Resolved from the working directory rather than import.meta.url, for the
 * reason spelled out in src/lib/images.ts: during `astro build` this module is
 * bundled into dist/, so a URL relative to the module points at the output.
 */
export const armoredKey = (): string | null => {
  const path = keyPath();
  if (!path) return null;
  const file = join(process.cwd(), 'public', path);
  return existsSync(file) ? readFileSync(file, 'utf8').trim() : null;
};
