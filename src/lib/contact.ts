import { parse } from 'yaml';
import contactRaw from '../data/contact.yml?raw';
import { SITE } from '../consts.ts';

/**
 * The free-form contact rows, from `src/data/contact.yml`.
 *
 * See that file's header for the shape and for why it is its own file rather
 * than a section of cv.yml. This module is only the parse, the validation and
 * the one derivation (`email: true` -> SITE.email); the markup is
 * `src/components/Contact.astro`, which both entry pages and /cv/ render.
 */
export type ContactRow = {
  label: string;
  /** The row's text. Exactly one of `value` and `email` is set. */
  value?: string;
  /** An address, or `true` for SITE.email. Always obfuscated when rendered. */
  email?: boolean | string;
  href?: string;
  mono?: boolean;
  note?: string;
};

/** What Contact.astro actually renders: the union above, resolved. */
export type ResolvedRow = {
  label: string;
  /** Set when the row is an address; Contact.astro sends it through Email. */
  address?: string;
  /** Set when it is not. */
  text?: string;
  href?: string;
  mono: boolean;
  note?: string;
};

/*
 * Anchored, and the domain allows dots — `[A-Za-z0-9-]+` before the last one
 * only matches a single-label domain, so `me@mail.uni-example.de` would have
 * been neither caught as a raw address in `value:` nor accepted in `email:`.
 * The audit's own version of this pattern is unanchored because it hunts for
 * an address inside a page; this one asks whether a whole field IS one.
 */
const ADDRESS_SHAPED = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

const raw = parse(contactRaw) as unknown;

/**
 * Validated here rather than left to render time.
 *
 * `src/data/` is read with `?raw` and `yaml.parse`, which — unlike the content
 * collections — comes with no schema and no build failure for a typo. A
 * mis-keyed row would otherwise render as a label with an empty value, on the
 * two pages a visitor is most likely to land on, and nothing would say so.
 *
 * The address check is the one that earns its keep: `npm run verify` fails the
 * deploy if any address-shaped string reaches the built HTML, so a row written
 * as `value: me@example.org` is already fatal — just fatal later, from a script
 * that can only say "an address is in the bytes" and not which file put it
 * there. This says it at the source, with the row's label.
 */
function validate(input: unknown): ResolvedRow[] {
  if (input === null || input === undefined) return [];
  if (!Array.isArray(input)) {
    throw new Error('contact.yml: expected a list of rows at the top level');
  }
  return input.map((row: ContactRow, i) => {
    const where = `contact.yml row ${i + 1}${row?.label ? ` (${row.label})` : ''}`;
    if (!row || typeof row !== 'object') throw new Error(`${where}: not a mapping`);
    if (typeof row.label !== 'string' || row.label.trim() === '') {
      throw new Error(`${where}: needs a \`label\``);
    }

    const hasEmail = row.email !== undefined && row.email !== false;
    const hasValue = typeof row.value === 'string' && row.value.trim() !== '';
    if (hasEmail === hasValue) {
      throw new Error(`${where}: set exactly one of \`value\` and \`email\``);
    }
    if (row.href !== undefined && !/^(https?:\/\/|\/|mailto:|matrix:|xmpp:)/.test(row.href)) {
      throw new Error(`${where}: \`href\` must be an absolute URL or a site-relative path`);
    }

    if (hasValue && ADDRESS_SHAPED.test(row.value!.trim())) {
      throw new Error(
        `${where}: \`value: ${row.value}\` is an email address. Write it as ` +
          '`email:` instead — a raw address in the markup is shipped in the ' +
          'served bytes and fails `npm run verify`.',
      );
    }

    const address = hasEmail ? (row.email === true ? SITE.email : String(row.email)) : undefined;
    if (address !== undefined && !ADDRESS_SHAPED.test(address)) {
      throw new Error(`${where}: \`email: ${address}\` does not look like an address`);
    }

    return {
      label: row.label,
      address,
      text: hasValue ? row.value!.trim() : undefined,
      href: row.href,
      mono: row.mono === true,
      note: row.note,
    };
  });
}

export const contactRows: ResolvedRow[] = validate(raw);
