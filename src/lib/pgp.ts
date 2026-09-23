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
