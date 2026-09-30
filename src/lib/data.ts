/**
 * Typed access to `src/data/`, imported with `?raw` rather than read with
 * `fs` (see images.ts). Each file's import, type and export are fenced under
 * its feature: an unused `?raw` import of a deleted file is a build error.
 */
import { parse } from 'yaml';

/* ▼ FEATURE:citations ▼ */
import citationsRaw from '../data/citations.yml?raw';
/* ▲ FEATURE:citations ▲ */

/* ▼ FEATURE:socials ▼ */
import socialsRaw from '../data/socials.yml?raw';
/* ▲ FEATURE:socials ▲ */

/* ▼ FEATURE:repositories ▼ */
import repositoriesRaw from '../data/repositories.yml?raw';
import languageColorsRaw from '../data/language_colors.yml?raw';
import githubMetadata from '../data/github-metadata.json';
/* ▲ FEATURE:repositories ▲ */

/* ▼ FEATURE:citations ▼ */
export type CitationsFile = {
  metadata: { last_updated: string };
  papers: Record<string, { citations?: number; title?: string; year?: number }>;
};
/* ▲ FEATURE:citations ▲ */

/* ▼ FEATURE:socials ▼ */
export type Socials = {
  orcid_id: string | null;
  scholar_userid: string | null;
  github_username: string | null;
  dblp_url: string | null;
  linkedin_username: string | null;
  semanticscholar_id: string | null;
  pgp_fingerprint: string | null;
  /**
   * Anything the fixed fields do not cover. `icon` names one of the marks in
   * SocialRow.astro; without one the entry renders as a text chip.
   */
  extra?: { label: string; url: string; icon?: string }[] | null;
};
/* ▲ FEATURE:socials ▲ */

/* ▼ FEATURE:repositories ▼ */
export type Repositories = {
  github_users?: string[];
  github_repos?: string[];
  zenodo_repos?: { name: string; doi: string }[];
};
/* ▲ FEATURE:repositories ▲ */

/* ▼ FEATURE:repositories ▼ */
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
/* ▲ FEATURE:repositories ▲ */

/* ▼ FEATURE:citations ▼ */
export const citations = parse(citationsRaw) as CitationsFile;
/* ▲ FEATURE:citations ▲ */
/* ▼ FEATURE:socials ▼ */
export const socials = parse(socialsRaw) as Socials;
/* ▲ FEATURE:socials ▲ */
/* ▼ FEATURE:repositories ▼ */
export const repositories = parse(repositoriesRaw) as Repositories;
export const languageColors = parse(languageColorsRaw) as Record<string, string>;
/* ▲ FEATURE:repositories ▲ */

/* ▼ FEATURE:repositories ▼ */
/** Written by scripts/fetch-github-metadata.mjs and committed; never fetched
    during the build. */
export const github = githubMetadata as GithubMetadata;
/* ▲ FEATURE:repositories ▲ */
