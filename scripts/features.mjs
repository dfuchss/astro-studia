/**
 * The feature manifest: what this template is made of, and what belongs to
 * what. Removing an area touches five or six places, and a prose copy of that
 * list drifts; written here it has two consumers that cannot disagree:
 *
 *   scripts/init.mjs      prunes what you do not want
 *   scripts/gen-docs.mjs  regenerates the table in docs/Removing-Features.md
 *
 * If you add a feature to this template, add it here too and both follow.
 *
 * A feature's fenced code needs no declaration: init scans src/ for
 * `▼ FEATURE:<id> ▼ … ▲ FEATURE:<id> ▲` pairs named after the feature's id and
 * removes them wherever they are. The same scanner reads `▼ PRESET:<name> ▼`
 * fences, which src/pages/index.astro uses to carry both entry-page shapes;
 * init keeps the chosen one and removes its markers. Neither family is
 * declared below — the fences are the declaration, and the preset names are
 * the ones in `PRESETS`. docs/Architecture.md, "Feature and preset fences".
 *
 * A preset is a STARTING SELECTION, not a mode: init pre-ticks its features,
 * you tick and untick freely, and afterwards there is no preset, only source.
 *
 * `profile`  one person: publications, a CV, a blog, software, a GitHub list.
 * `project`  a project or group: sub-projects, paper pages, a team.
 */

/** @typedef {'profile' | 'project'} Preset */

/**
 * @typedef {object} Feature
 * @property {string}   id        stable key, used on the command line
 * @property {string}   label     human name, used in the prompt and the docs
 * @property {string}   blurb     one line: what you lose by removing it
 * @property {Preset[]} presets   which presets include it by default
 * @property {string[]} requires  feature ids this one needs to work
 * @property {string[]} [requiresAny]  ids of which at least ONE must survive
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
    paths: [
      'src/pages/papers',
      'src/content/papers',
      'src/components/paper',
      'src/lib/papers.ts',
      // Front-matter figures, through the asset pipeline, and the two
      // full-size images the demo page links to from its prose, which stay
      // under public/ because a link needs a URL that does not move.
      'src/assets/papers',
      'public/assets/img/papers',
      // Mirrors blog owning fromPosts.ts: it reads the papers collection.
      'src/lib/feed/fromPapers.ts',
    ],
    collections: ['papers'],
    sections: ['papers'],
    nav: ['papers'],
    footer: [],
    manual: [],
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
      // Logos and page figures both. Its own directory rather than a shared
      // one, for the same reason papers and posts have theirs: an image
      // referenced by a project must not be deleted by pruning some other
      // feature.
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
    // Deliberately NOT owned by the blog: a project site has no blog and still
    // wants a feed, of its paper pages — but it needs one of the two.
    requiresAny: ['blog', 'papers'],
    manual: [],
  },

  {
    id: 'cv',
    label: 'CV',
    blurb: 'A curriculum vitae rendered from YAML, with a dated timeline rail.',
    presets: ['profile'],
    requires: [],
    paths: ['src/pages/cv', 'src/lib/cv.ts', 'src/data/cv.yml'],
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
      'src/pages/repositories',
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
      'src/assets/people',
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
    manual: [],
  },

  {
    id: 'citations',
    label: 'Citation counts',
    blurb: 'Google Scholar counts on each entry, plus h-index and i10 on the list.',
    presets: ['profile', 'project'],
    // `socials` for the refresh script, not the page: update_scholar_citations.py
    // reads `scholar_userid` from src/data/socials.yml. The `project` preset kept
    // the script and dropped the file.
    requires: ['publications', 'socials'],
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
    manual: [],
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
    manual: [],
  },

  {
    id: 'pgp',
    label: 'PGP key',
    blurb:
      'A page for your public key: fingerprint, key id, download, and the armored block inline.',
    presets: ['profile'],
    requires: ['socials'],
    paths: ['src/pages/pgp-key', 'src/lib/pgp.ts', 'public/assets/pgp-key'],
    collections: [],
    sections: [],
    nav: [],
    footer: ['PGP'],
    manual: [],
  },

  {
    id: 'demo',
    label: 'Demo switcher',
    blurb: 'The two-button switcher and the second entry page that show both styles.',
    /*
     * In NO preset, on purpose — the only feature like that. The switcher and
     * its second URL exist so someone evaluating the template can see both
     * entry-page shapes; picking a preset chooses one, and init resolves the
     * PRESET fences only when demo is gone (see applyShape in init.mjs).
     */
    presets: [],
    requires: [],
    paths: ['src/pages/demo', 'src/components/DemoSwitch.astro'],
    collections: [],
    sections: [],
    nav: [],
    footer: [],
    manual: [],
  },

  {
    id: 'imprint',
    label: 'Imprint',
    blurb: 'A site notice. Several jurisdictions require one; Germany certainly does.',
    presets: ['profile', 'project'],
    requires: [],
    paths: ['src/pages/imprint'],
    collections: [],
    sections: [],
    nav: [],
    footer: ['Imprint'],
    manual: [],
  },
];

/**
 * The feed source each preset starts from: one import line in
 * src/pages/feed.xml.ts, and the unused variant deleted. There is no
 * PRESET_HERO beside it: which hero a preset uses is decided by the PRESET
 * fences in the source, and a table would be a second copy of that answer.
 */
export const PRESET_FEED = {
  profile: 'fromPosts',
  project: 'fromPapers',
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
 *
 * `requiresAny` cannot be satisfied that way — picking one of `blog`/`papers`
 * for somebody would hand them a whole area they unticked — so it is reported
 * as `unmet` and init refuses the selection.
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
  const unmet = [...keep]
    .map((id) => ({ id, options: byId(id)?.requiresAny ?? [] }))
    .filter(({ options }) => options.length > 0 && !options.some((o) => keep.has(o)));

  return { keep: [...keep], added, unmet };
}
