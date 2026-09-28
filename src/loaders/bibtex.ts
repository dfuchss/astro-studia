import type { Loader } from 'astro/loaders';
import { parse } from '@retorquere/bibtex-parser';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * One BibTeX field that carries a link, checked at build time. Declaring it
 * validates the value against disk, exposes it on the entry under `as`, and
 * keeps it out of the BibTeX block a reader copies.
 */
export type BibLink = {
  /** The BibTeX field to read, e.g. 'pdf' or 'page'. */
  field: string;
  /**
   * The key this lands under on the collection entry. Declare it in
   * `src/content.config.ts` too, or Zod will strip it back out again.
   */
  as: string;
  /** Let an http(s) value through untouched, instead of looking for a file. */
  allowAbsolute?: boolean;
  /**
   * Turn the raw field value into the value the entry carries, plus — when
   * there is one — a repo-relative path that must exist on disk.
   *
   * Throw for a value you cannot parse. Put the entry key in the message: a
   * .bib file is one long list of near-identical records, and the key is the
   * only thing that says which one.
   */
  resolve: (raw: string, ctx: { key: string }) => { value: string; file?: string };
};

export type BibtexLoaderOptions = {
  /** Repo-relative path to the .bib file. */
  file: string;
  /**
   * Fields dropped from the copyable BibTeX block, because they are yours and
   * not the bibliography's. Every `links[].field` is added automatically — an
   * internal path has no business in a citation someone pastes into their own
   * .bib, and making you remember that separately is a trap.
   */
  privateFields?: string[];
  links?: BibLink[];
};

const DEFAULT_PRIVATE_FIELDS = ['abbr', 'google_scholar_id', 'selected'];

const str = (v: unknown): string | undefined => {
  if (v == null) return undefined;
  const s = Array.isArray(v) ? v.join(', ') : String(v);
  const t = s.trim();
  return t === '' ? undefined : t;
};

const num = (v: unknown): number | undefined => {
  const s = str(v);
  if (s === undefined) return undefined;
  const n = Number.parseInt(s, 10);
  return Number.isNaN(n) ? undefined : n;
};

/** A parsed BibTeX name. The parser hands these back even in `raw` mode. */
type BibName = { lastName?: string; firstName?: string; prefix?: string; suffix?: string };

const isNameList = (v: unknown): v is BibName[] =>
  Array.isArray(v) && v.length > 0 && typeof v[0] === 'object' && v[0] !== null;

/**
 * `author` and `editor` come back as name objects, never as a string — so
 * stringifying them naively yields "[object Object]". Rebuild the BibTeX form:
 * "Last, First" joined by " and ", with the LaTeX escapes left untouched.
 */
const names = (list: BibName[]): string =>
  list
    .map((n) => {
      const last = (n.lastName ?? '').trim();
      const first = (n.firstName ?? '').trim();
      if (last && first) return `${last}, ${first}`;
      return last || first;
    })
    .filter(Boolean)
    .join(' and ');

/**
 * Re-serialize one entry as public BibTeX, dropping the private fields.
 *
 * Built from the RAW parse so LaTeX escapes and brace protection survive
 * verbatim — a reader pasting this into their own .bib gets what the source
 * file says, not a Unicode-normalized approximation of it.
 */
function serialize(
  type: string,
  key: string,
  fields: Record<string, unknown>,
  privateFields: Set<string>,
): string {
  const rows = Object.entries(fields)
    .filter(([k]) => !privateFields.has(k.toLowerCase()))
    .map(([k, v]) => `  ${k.padEnd(12)} = {${(isNameList(v) ? names(v) : str(v)) ?? ''}}`);
  return `@${type}{${key},\n${rows.join(',\n')}\n}`;
}

export function bibtexLoader(opts: BibtexLoaderOptions): Loader {
  const links = opts.links ?? [];
  const privateFields = new Set(
    [...(opts.privateFields ?? DEFAULT_PRIVATE_FIELDS), ...links.map((l) => l.field)].map((f) =>
      f.toLowerCase(),
    ),
  );

  return {
    name: 'bibtex',
    load: async ({ store, parseData, generateDigest, logger, watcher }) => {
      // Against the working directory, so every path in the options is
      // repo-relative in both `astro dev` and `astro build`.
      const bibPath = resolve(process.cwd(), opts.file);
      watcher?.add(bibPath);
      // Watch this loader too. Entries are cached in `.astro/` keyed off the
      // source file, so editing the parsing logic alone leaves the dev server
      // serving the previous parse indefinitely — a fix looks like it did
      // nothing at all.
      watcher?.add(fileURLToPath(import.meta.url));

      const source = await readFile(bibPath, 'utf8');

      // Two passes: `cooked` decodes LaTeX to Unicode for display, `raw` keeps
      // the original escapes for the copyable block. sentenceCase:false
      // preserves brace-protected casing — {LiSSA} stays LiSSA rather than
      // becoming Lissa.
      const cooked = parse(source, { sentenceCase: false });
      const raw = parse(source, { sentenceCase: false, raw: true });

      if (cooked.errors.length > 0) {
        for (const e of cooked.errors) logger.error(`${opts.file}: ${JSON.stringify(e)}`);
        throw new Error(`${cooked.errors.length} BibTeX parse error(s) in ${opts.file}`);
      }

      const rawByKey = new Map(raw.entries.map((e) => [e.key, e]));
      store.clear();

      for (const entry of cooked.entries) {
        const f = entry.fields as Record<string, unknown>;

        const authors = (f.author as BibName[] | undefined) ?? [];
        if (authors.length === 0) throw new Error(`${entry.key}: no authors parsed`);

        // Resolve and verify every declared link field. A dangling one fails
        // the build here rather than rendering a live-looking link that 404s.
        const linkValues: Record<string, string> = {};
        for (const link of links) {
          const value = str(f[link.field]);
          if (value === undefined) continue;

          if (link.allowAbsolute && /^https?:\/\//i.test(value)) {
            linkValues[link.as] = value;
            continue;
          }

          const resolved = link.resolve(value, { key: entry.key });
          if (resolved.file && !existsSync(resolve(process.cwd(), resolved.file))) {
            throw new Error(
              `${entry.key}: ${link.field} = {${value}} points at ${resolved.file}, which does not exist`,
            );
          }
          linkValues[link.as] = resolved.value;
        }

        const rawEntry = rawByKey.get(entry.key);
        const bibtex = serialize(
          entry.type,
          entry.key,
          (rawEntry?.fields as Record<string, unknown>) ?? f,
          privateFields,
        );

        // The normalizing parse splits a nobiliary particle off into `prefix`
        // and a "Jr."-style tail into `suffix`. Reading `lastName` alone turns
        // "von Geisau, Johannes" into "Johannes Geisau".
        const people = authors.map((a) => ({
          first: str(a.firstName) ?? '',
          last: [str(a.prefix), str(a.lastName), str(a.suffix)].filter(Boolean).join(' '),
        }));

        const data = {
          key: entry.key,
          type: entry.type,
          title: str(f.title) ?? entry.key,
          authors: people,
          year: num(f.year) ?? 0,
          month: num(f.month),
          // Optional on purpose. An entry with no `abbr` renders without a
          // venue badge, which is what you want for a preprint or a report —
          // the alternative is inventing a "misc" row in venues.yml so that a
          // required reference() has something to point at.
          abbr: str(f.abbr),
          booktitle: str(f.booktitle),
          journal: str(f.journal),
          school: str(f.school),
          institution: str(f.institution),
          publisher: str(f.publisher),
          series: str(f.series),
          volume: str(f.volume),
          number: str(f.number),
          pages: str(f.pages),
          // biblatex entries sometimes carry `venue` or `address` where the
          // rest use `location`; fall back so those still render a place.
          location: str(f.location) ?? str(f.venue) ?? str(f.address),
          doi: str(f.doi),
          url: str(f.url),
          keywords: (str(f.keywords) ?? '')
            .split(',')
            .map((k) => k.trim())
            .filter(Boolean),
          googleScholarId: str(f.google_scholar_id),
          ...linkValues,
          bibtex,
          // Everything the client-side filter on /publications/ matches
          // against, lowercased once here rather than on every keystroke.
          searchText: [
            str(f.title),
            people.map((p) => `${p.first} ${p.last}`).join(' '),
            str(f.booktitle),
            str(f.journal),
            str(f.abbr),
            str(f.year),
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase(),
        };

        const parsed = await parseData({ id: entry.key, data });
        store.set({ id: entry.key, data: parsed, digest: generateDigest(parsed) });
      }

      logger.info(`parsed ${cooked.entries.length} publications`);
    },
  };
}
