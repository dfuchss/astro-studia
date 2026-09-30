#!/usr/bin/env python3
"""Refresh src/data/citations.yml from a Google Scholar profile.

    python3 scripts/update_scholar_citations.py

OPT-IN. Unlike the rest of this template's tooling this one needs pip, a
network, and patience: Scholar rate-limits hard and there is no API. It is
wired to .github/workflows/update-citations.yml, which runs on demand only —
enable the schedule there if you want it nightly.

Nothing depends on ever running it. src/data/citations.yml is committed, so
the citation chips and the h-index on /publications/ render offline from
whatever was last written. Set `scholar_userid` in src/data/socials.yml to
point it at your profile; with that unset the script exits and says so.
"""

import os
import signal
import sys
from datetime import datetime

try:
    import yaml
    from scholarly import scholarly
except ImportError as exc:  # pragma: no cover - first-run guidance
    # A bare traceback would not name the one thing the reader has to do.
    sys.exit(
        f"{exc.name} is not installed.\n\n"
        "This script is the one opt-in piece of tooling in this template and "
        "needs its own dependencies:\n"
        "    python3 -m pip install -r requirements.txt\n\n"
        "Nothing else needs them: the site builds, checks and verifies "
        "without Python, and src/data/citations.yml is committed."
    )


class ScholarUnavailable(Exception):
    """Google Scholar did not answer in time. Expected, not a failure."""


# Keep this below the workflow's own `timeout` so the script, not SIGKILL, ends
# the run: Scholar rate-limits hard, and a run that cannot finish is routine.
TIME_BUDGET_SECONDS: int = int(os.environ.get("SCHOLAR_TIME_BUDGET", "270"))


def load_scholar_user_id() -> str:
    """Load the Google Scholar user ID from the configuration file."""
    config_file = "src/data/socials.yml"
    if not os.path.exists(config_file):
        print(
            f"Configuration file {config_file} not found. Please ensure the file exists and contains your Google Scholar user ID."
        )
        sys.exit(1)
    try:
        with open(config_file, "r") as f:
            config = yaml.safe_load(f)
        scholar_user_id = config.get("scholar_userid")
        if not scholar_user_id:
            print(
                "No 'scholar_userid' found in the configuration file. Please add 'scholar_userid' to src/data/socials.yml."
            )
            sys.exit(1)
        return scholar_user_id
    except yaml.YAMLError as e:
        print(
            f"Error parsing YAML file {config_file}: {e}. Please check the file for correct YAML syntax."
        )
        sys.exit(1)


SCHOLAR_USER_ID: str = load_scholar_user_id()
OUTPUT_FILE: str = "src/data/citations.yml"


def get_scholar_citations() -> None:
    """Fetch and update Google Scholar citation data."""
    print(f"Fetching citations for Google Scholar ID: {SCHOLAR_USER_ID}")
    today = datetime.now().strftime("%Y-%m-%d")

    # Bound here because the comparison at the end of this function reads it
    # even when the file is missing or unreadable.
    existing_data = None

    if os.path.exists(OUTPUT_FILE):
        try:
            with open(OUTPUT_FILE, "r") as f:
                existing_data = yaml.safe_load(f)
                if (
                    existing_data
                    and "metadata" in existing_data
                    and "last_updated" in existing_data["metadata"]
                ):
                    print(
                        f"Last updated on: {existing_data['metadata']['last_updated']}"
                    )
                    if existing_data["metadata"]["last_updated"] == today:
                        print("Citations data is already up-to-date. Skipping fetch.")
                        return
        except Exception as e:
            print(
                f"Warning: Could not read existing citation data from {OUTPUT_FILE}: {e}. The file may be missing or corrupted."
            )

    citation_data = {"metadata": {"last_updated": today}, "papers": {}}

    scholarly.set_timeout(15)
    scholarly.set_retries(3)
    try:
        author = scholarly.search_author_id(SCHOLAR_USER_ID)
        author_data = scholarly.fill(author)
    except ScholarUnavailable:
        raise
    except Exception as e:
        # Rate limiting surfaces here as MaxTriesExceededException. Nothing is
        # wrong with the repo, so leave the committed counts alone and exit clean.
        print(
            f"Could not reach Google Scholar for user ID '{SCHOLAR_USER_ID}': {e}. Leaving {OUTPUT_FILE} unchanged; the next scheduled run will retry."
        )
        sys.exit(0)

    if not author_data:
        print(
            f"Could not fetch author data for user ID '{SCHOLAR_USER_ID}'. Please verify the Scholar user ID and try again."
        )
        sys.exit(1)

    if "publications" not in author_data:
        print(f"No publications found in author data for user ID '{SCHOLAR_USER_ID}'.")
        sys.exit(1)

    for pub in author_data["publications"]:
        try:
            pub_id = pub.get("pub_id") or pub.get("author_pub_id")
            if not pub_id:
                print(
                    f"Warning: No ID found for publication: {pub.get('bib', {}).get('title', 'Unknown')}. This publication will be skipped."
                )
                continue

            title = pub.get("bib", {}).get("title", "Unknown Title")
            year = pub.get("bib", {}).get("pub_year", "Unknown Year")
            citations = pub.get("num_citations", 0)

            print(f"Found: {title} ({year}) - Citations: {citations}")

            citation_data["papers"][pub_id] = {
                "title": title,
                "year": year,
                "citations": citations,
            }
        except ScholarUnavailable:
            raise
        except Exception as e:
            print(
                f"Error processing publication '{pub.get('bib', {}).get('title', 'Unknown')}': {e}. This publication will be skipped."
            )

    if existing_data and existing_data.get("papers") == citation_data["papers"]:
        print("No changes in citation data. Skipping file update.")
        return

    # Past the network work: no alarm may interrupt a half-written file.
    signal.alarm(0)

    try:
        with open(OUTPUT_FILE, "w") as f:
            yaml.dump(citation_data, f, width=1000, sort_keys=True)
        print(f"Citation data saved to {OUTPUT_FILE}")
    except Exception as e:
        print(
            f"Error writing citation data to {OUTPUT_FILE}: {e}. Please check file permissions and disk space."
        )
        sys.exit(1)


def _budget_exceeded(signum, frame) -> None:
    raise ScholarUnavailable()


if __name__ == "__main__":
    # SIGALRM is our own deadline; SIGTERM is the one `timeout` sends. Both mean
    # "stop talking to Scholar and finish cleanly".
    signal.signal(signal.SIGALRM, _budget_exceeded)
    signal.signal(signal.SIGTERM, _budget_exceeded)
    signal.alarm(TIME_BUDGET_SECONDS)

    try:
        get_scholar_citations()
    except ScholarUnavailable:
        print(
            f"Google Scholar did not answer within {TIME_BUDGET_SECONDS}s (it rate-limits hard). "
            f"Leaving {OUTPUT_FILE} unchanged; the next scheduled run will retry."
        )
        sys.exit(0)
    except Exception as e:
        print(f"Unexpected error: {e}")
        sys.exit(1)
