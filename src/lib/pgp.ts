import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { socials } from './data.ts';

/**
 * Everything /pgp-key/ needs, derived from the one value in socials.yml so
 * nothing can disagree. Every function returns null when it is unset.
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
 * The ASCII-armored key, inlined at build time. An absent file is a supported
 * state, not an error. Working directory, not import.meta.url — see images.ts.
 */
export const armoredKey = (): string | null => {
  const path = keyPath();
  if (!path) return null;
  const file = join(process.cwd(), 'public', path);
  return existsSync(file) ? readFileSync(file, 'utf8').trim() : null;
};
