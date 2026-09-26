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
import socialsRaw from '../data/socials.yml?raw';
import repositoriesRaw from '../data/repositories.yml?raw';
import languageColorsRaw from '../data/language_colors.yml?raw';
import githubMetadata from '../data/github-metadata.json';

export type CitationsFile = {
  metadata: { last_updated: string };
  papers: Record<string, { citations?: number; title?: string; year?: number }>;
};

export type Socials = {
  orcid_id: string | null;
  scholar_userid: string | null;
  github_username: string | null;
  dblp_url: string | null;
  linkedin_username: string | null;
  semanticscholar_id: string | null;
  pgp_fingerprint: string | null;
  /**
   * Anything the fixed fields above do not cover — Mastodon, ResearchGate,
   * Codeberg, an institutional page. `icon` names one of the marks in
   * SocialRow.astro; leave it out and the entry renders as a text chip.
   *
   * The fixed list is a convenience, not a whitelist. Where an academic keeps
   * a profile is not something a template gets to decide.
   */
  extra?: { label: string; url: string; icon?: string }[] | null;
};

export type Repositories = {
  github_users?: string[];
  github_repos?: string[];
  zenodo_repos?: { name: string; doi: string }[];
};

export type GithubMetadata = {
  fetched: string;
  users: Record<
    string,
    {
      login: string;
      name: string | null;
      bio: string | null;
      followers: number;
      publicRepos: number;
      htmlUrl: string;
      avatarUrl: string;
    }
  >;
  repos: Record<
    string,
    {
      fullName: string;
      description: string | null;
      stars: number;
      forks: number;
      language: string | null;
      license: string | null;
      archived: boolean;
      htmlUrl: string;
      pushedAt: string | null;
    }
  >;
};

export const citations = parse(citationsRaw) as CitationsFile;
export const socials = parse(socialsRaw) as Socials;
export const repositories = parse(repositoriesRaw) as Repositories;
export const languageColors = parse(languageColorsRaw) as Record<string, string>;

/**
 * Written by scripts/fetch-github-metadata.mjs and committed, rather than
 * fetched during the build. See that script's header for why.
 */
export const github = githubMetadata as GithubMetadata;
