/**
 * The feature manifest: what this template is made of, and what belongs to what.
 *
 * ── Why this file exists ───────────────────────────────────────────────────
 *
 * Every area of the site is optional, and removing one touches five or six
 * places: the routes, a collection block, a `Section` union member, a nav row,
 * some data, sometimes a script and a workflow. Written down once as prose,
 * that list drifts from the code the first time either changes. Written down
 * here, it has two consumers that cannot disagree:
 *
 * A feature's fenced code needs no declaration: init scans src/ for
 * `▼ FEATURE:<id> ▼ … ▲ FEATURE:<id> ▲` pairs named after the feature's own id
 * and removes them wherever they are. Put a fence around anything that exists
 * only because a feature does — an import, a const, a markup block.
 *
 *   scripts/init.mjs      prunes what you do not want
 *   scripts/gen-docs.mjs  regenerates the table in docs/removing-features.md
 *
 * If you add a feature to this template, add it here too and both follow.
 *
 * ── Presets ────────────────────────────────────────────────────────────────
 *
 * A preset is a STARTING SELECTION, not a mode. `npm run init` uses it to
 * pre-tick a sensible set of checkboxes; you tick and untick freely, and once
 * it has run there is no preset any more — only source files. Nothing in the
 * built site branches on which one you chose, and you can add any feature back
 * by hand afterwards.
 *
 * `profile`  one person: publications, a CV, a blog, software, a GitHub list.
 * `project`  a project or group: sub-projects, paper pages, a team.
 *
 * NOTE: `npm run verify` fails after ANY prune until `npm run baseline` is run.
 * verification/asset-sha256.txt pins the demo images, some belonging to a
 * feature you just removed — which is the baseline doing its job, since it
 * exists so a published asset cannot vanish unnoticed. init says so when it
 * happens.
 *
 * A real site is usually neither. That is the point of the checkboxes.
 */

/** @typedef {'profile' | 'project'} Preset */

/**
 * @typedef {object} Feature
 * @property {string}   id        stable key, used on the command line
 * @property {string}   label     human name, used in the prompt and the docs
 * @property {string}   blurb     one line: what you lose by removing it
 * @property {Preset[]} presets   which presets include it by default
 * @property {string[]} requires  feature ids this one needs to work
 * @property {string[]} paths     files and directories to delete, repo-relative
 * @property {string[]} collections  names to drop from src/content.config.ts
 * @property {string[]} sections  `Section` members and their [data-section] blocks
 * @property {string[]} nav       NAV rows to drop, matched on `label`
 * @property {string[]} footer    FOOTER_LINKS rows to drop, matched on `label`
 * @property {string[]} manual    edits a human still has to make, in prose
 */

/** @type {Feature[]} */
export const FEATURES = [
  {
    id: 'publications',
    label: 'Publications',
    blurb: 'A bibliography parsed from BibTeX, with venue badges and copyable citations.',
    presets: ['profile', 'project'],
    requires: [],
    paths: [
      'src/pages/publications',
      'src/components/pub',
      'src/lib/publications.ts',
      'src/loaders/bibtex.ts',
      'src/data/papers.bib',
      'src/data/venues.yml',
      'scripts/update_bib.py',
    ],
    collections: ['publications', 'venues'],
    sections: ['publications'],
    nav: ['publications'],
    footer: [],
    manual: [],
  },

  {
    id: 'papers',
    label: 'Paper pages',
    blurb: 'A page per work: the abstract, a figure, the links, the citation.',
    presets: ['profile', 'project'],
    requires: ['publications', 'authors'],
    paths: ['src/pages/papers', 'src/content/papers', 'public/assets/img/papers'],
    collections: ['papers'],
    sections: ['papers'],
    nav: ['papers'],
    footer: [],
    manual: [
      'drop the `page = {…}` fields from src/data/papers.bib',
      'drop the second links[] entry from the bibtexLoader options in src/content.config.ts',
    ],
  },

  {
    id: 'projects',
    label: 'Projects',
    blurb: 'A grid of things you have made, grouped, each with a page of its own.',
    presets: ['profile', 'project'],
    requires: [],
    paths: [
      'src/pages/projects',
      'src/components/project',
      'src/content/projects',
      'src/assets/projects',
    ],
    collections: ['projects'],
    sections: ['projects'],
    nav: ['projects'],
    footer: [],
    manual: [
      'a group site usually calls these `approaches` — rename the collection in src/content.config.ts, the directory under src/pages/, and the NAV label',
    ],
  },

  {
    id: 'blog',
    label: 'Blog',
    blurb: 'Dated posts with tags, per-tag pages, drafts, and an RSS feed.',
    presets: ['profile'],
    requires: [],
    paths: [
      'src/pages/blog',
      'src/lib/blog.ts',
      // Imports lib/blog.ts, so it cannot outlive it. If you keep the feed,
      // init repoints it at fromPapers.ts — see PRESET_FEED below.
      'src/lib/feed/fromPosts.ts',
      'src/content/posts',
      'public/assets/img/posts',
    ],
    collections: ['posts'],
    sections: ['blog'],
    nav: ['blog'],
    footer: [],
    manual: [],
  },

  {
    id: 'feed',
    label: 'RSS feed',
    blurb: 'An Atom/RSS feed at /feed.xml, so people can follow the site.',
    presets: ['profile', 'project'],
    requires: [],
    paths: ['src/pages/feed.xml.ts', 'src/lib/feed'],
    collections: [],
    sections: [],
    nav: [],
    footer: ['Feed'],
    /*
     * Deliberately NOT owned by the blog. ardoco.de has no blog at all and
     * still publishes a feed, built from its paper pages — which is the right
     * thing for a project site, where a new paper is the news. Tying the feed
     * to the blog would have deleted it from exactly the site that needs it
     * most obviously.
     */
    manual: [
      'drop the feed <link rel="alternate"> from src/components/BaseHead.astro — without it you advertise a 404',
    ],
  },

  {
    id: 'cv',
    label: 'CV',
    blurb: 'A curriculum vitae rendered from YAML, with a dated timeline rail.',
    presets: ['profile'],
    requires: [],
    paths: ['src/pages/cv.astro', 'src/lib/cv.ts', 'src/data/cv.yml'],
    collections: [],
    sections: ['cv'],
    nav: ['cv'],
    footer: [],
    manual: [],
  },

  {
    id: 'repositories',
    label: 'Repositories',
    blurb: 'Your code and archived datasets, from a committed metadata file.',
    presets: ['profile'],
    requires: [],
    paths: [
      'src/pages/repositories.astro',
      'src/data/repositories.yml',
      'src/data/github-metadata.json',
      'src/data/language_colors.yml',
      'scripts/fetch-github-metadata.mjs',
      '.github/workflows/update-github-metadata.yml',
    ],
    collections: [],
    sections: ['repositories'],
    nav: ['repositories'],
    footer: [],
    manual: ['drop the `data:github` script from package.json'],
  },

  {
    id: 'people',
    label: 'People',
    blurb: 'A team roster whose entry keys are the anchors author names link to.',
    presets: ['project'],
    requires: ['authors'],
    paths: [
      'src/pages/people',
      'src/components/people',
      'src/lib/people.ts',
      'src/data/people.yml',
      'public/assets/img/people',
    ],
    collections: ['people'],
    sections: ['people'],
    nav: ['people'],
    footer: [],
    manual: [],
  },

  {
    id: 'authors',
    label: 'Authors',
    blurb: 'Named co-authors with ORCIDs, referenced by paper pages and the roster.',
    presets: ['profile', 'project'],
    requires: [],
    paths: ['src/data/authors.yml'],
    collections: ['authors'],
    sections: [],
    nav: [],
    footer: [],
    manual: ['drop the `authors` field from the papers schema in src/content.config.ts'],
  },

  {
    id: 'citations',
    label: 'Citation counts',
    blurb: 'Google Scholar counts on each entry, plus h-index and i10 on the list.',
    presets: ['profile', 'project'],
    requires: ['publications'],
    paths: [
      'src/lib/citations.ts',
      'src/data/citations.yml',
      'scripts/update_scholar_citations.py',
      'requirements.txt',
      '.github/workflows/update-citations.yml',
    ],
    collections: [],
    sections: [],
    nav: [],
    footer: [],
    manual: [
      'drop the citation chip from src/components/pub/PubEntry.astro and the metrics block from src/pages/publications/index.astro',
      'replace formatCount() usages — it lives in lib/citations.ts',
    ],
  },

  {
    id: 'socials',
    label: 'Profile links',
    blurb: 'ORCID, Scholar, DBLP, GitHub and LinkedIn chips, driven by one YAML file.',
    presets: ['profile'],
    requires: [],
    paths: ['src/components/SocialRow.astro', 'src/data/socials.yml'],
    collections: [],
    sections: [],
    nav: [],
    footer: [],
    manual: ['remove <SocialRow /> from src/components/hero/ and src/pages/cv.astro'],
  },

  {
    id: 'pgp',
    label: 'PGP key',
    blurb: 'A page for your public key, derived from one fingerprint in socials.yml.',
    presets: ['profile'],
    requires: ['socials'],
    paths: ['src/pages/pgp-key.astro', 'src/lib/pgp.ts'],
    collections: [],
    sections: [],
    nav: [],
    footer: ['PGP'],
    manual: [],
  },

  {
    id: 'imprint',
    label: 'Imprint',
    blurb: 'A site notice. Several jurisdictions require one; Germany certainly does.',
    presets: ['profile', 'project'],
    requires: [],
    paths: ['src/pages/imprint.astro'],
    collections: [],
    sections: [],
    nav: [],
    footer: ['Imprint'],
    manual: [],
  },
];

/** The hero each preset starts from. See src/components/hero/. */
/**
 * The feed source each preset starts from, swapped the same way as the hero:
 * one import line in src/pages/feed.xml.ts, and the unused variant deleted.
 */
export const PRESET_FEED = {
  profile: 'fromPosts',
  project: 'fromPapers',
};

export const PRESET_HERO = {
  profile: 'PersonHero',
  project: 'ProjectHero',
};

export const PRESETS = /** @type {Preset[]} */ (['profile', 'project']);

export const byId = (id) => FEATURES.find((f) => f.id === id);

/** Feature ids a preset selects. */
export const featuresFor = (preset) =>
  FEATURES.filter((f) => f.presets.includes(preset)).map((f) => f.id);

/**
 * Expand a selection so its dependencies are included.
 *
 * `requires` is a real dependency, not a suggestion: papers reference authors
 * through Astro's reference(), so keeping papers while dropping authors fails
 * the build. Pulling the dependency in silently is friendlier than letting the
 * build explain it afterwards, so the caller is told what was added.
 */
export function resolve(selected) {
  const keep = new Set(selected);
  const added = [];
  let changed = true;
  while (changed) {
    changed = false;
    for (const id of [...keep]) {
      for (const dep of byId(id)?.requires ?? []) {
        if (!keep.has(dep)) {
          keep.add(dep);
          added.push({ dep, because: id });
          changed = true;
        }
      }
    }
  }
  return { keep: [...keep], added };
}
