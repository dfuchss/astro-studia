/**
 * Typed access to the YAML and JSON in `src/data/`.
 *
 * Everything is imported with Vite's `?raw` and parsed here, rather than read
 * with `fs` at render time. Reading them with `fs` + `import.meta.url` resolves
 * against the *bundled* chunk rather than the source tree, which works in
 * `astro dev` and fails during `astro build` — the worst shape of bug, because
 * it only appears in CI. Inlining sidesteps path resolution entirely, and gives
 * hot reload on a data file for free.
 *
 * Delete the import and the export together when you remove a feature; an
 * unused `?raw` import still inlines the file into the bundle.
 */
import { parse } from 'yaml';

import citationsRaw from '../data/citations.yml?raw';

export type CitationsFile = {
  metadata: { last_updated: string };
  papers: Record<string, { citations?: number; title?: string; year?: number }>;
};

export const citations = parse(citationsRaw) as CitationsFile;
