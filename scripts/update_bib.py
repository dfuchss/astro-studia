#!/usr/bin/env python3
"""Check (and optionally update) BibTeX entries against Crossref via their DOI.

Usage:
    python3 scripts/update_bib.py                 # dry-run: report differences
    python3 scripts/update_bib.py --write         # apply updates to safe fields
    python3 scripts/update_bib.py --all-fields    # also report title/author
    python3 scripts/update_bib.py -f path.bib     # use a different .bib file

Only a whitelist of standard bibliographic fields is ever compared. This
template's own fields (abbr, pdf, page, google_scholar_id, keywords) and the
file's formatting are left untouched. Title and author are report-only:
Crossref returns plain Unicode, so re-inserting them would drop the LaTeX
escaping and brace protection the .bib relies on -- change those by hand.

Standard library only: no pip install, no virtualenv, nothing to keep working.

Exit code is non-zero when any difference is found, so it is usable as a
periodic check.

Note for the demo bibliography that ships with this template: its DOIs use the
10.5555 prefix, which the DOI registry reserves for examples. Crossref will
correctly report them as not found. That is the demo data being honest, not a
bug in this script.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.request

DEFAULT_BIB = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "src",
    "data",
    "papers.bib",
)
# Crossref asks for a contact address so they can reach you if a script
# misbehaves; requests that supply one are also routed to a faster pool.
MAILTO = os.environ.get("CROSSREF_MAILTO", "you@example.com")
USER_AGENT = f"aca-theme-bib-check/1.0 (mailto:{MAILTO})"

# Purely factual fields, safe to auto-write (plain values, no LaTeX needed).
SAFE_FIELDS = ["pages", "volume", "number", "year", "month", "isbn", "issn"]
# Curated fields: the site deliberately uses cleaner names than Crossref's
# verbose official titles, so these are reported but never auto-written.
CURATED_FIELDS = ["journal", "booktitle", "publisher"]
# Verbose fields, report-only and only with --all-fields (need LaTeX escaping).
VERBOSE_FIELDS = ["title", "author"]

MONTHS = {m: i for i, m in enumerate(
    ["jan", "feb", "mar", "apr", "may", "jun",
     "jul", "aug", "sep", "oct", "nov", "dec"], start=1)}


# --------------------------------------------------------------------------- #
# BibTeX block parsing (keeps raw text so we can edit in place)
# --------------------------------------------------------------------------- #
class Entry:
    def __init__(self, etype, key, start, end, block):
        self.etype = etype
        self.key = key
        self.start = start  # offset of '@' in the file
        self.end = end      # offset just past the closing '}'
        self.block = block

    def fields(self):
        """Return {name: raw_value} for fields in this entry (values undecoded)."""
        out = {}
        for m in re.finditer(
            r"(?m)^\s*([A-Za-z][\w-]*)\s*=\s*(.+?)\s*,?\s*(?=\n\s*[A-Za-z][\w-]*\s*=|\n\s*\})",
            self.block,
            re.DOTALL,
        ):
            name = m.group(1).lower()
            val = m.group(2).strip()
            if val and val[0] == "{" and val[-1] == "}":
                val = val[1:-1]
            elif val and val[0] == '"' and val[-1] == '"':
                val = val[1:-1]
            out[name] = val
        return out


def parse_entries(text):
    entries = []
    for m in re.finditer(r"@(\w+)\s*\{\s*([^,\s]+)\s*,", text):
        etype = m.group(1).lower()
        key = m.group(2)
        # brace-match from the entry-body opening '{'
        brace_pos = text.index("{", m.start())
        depth = 0
        i = brace_pos
        while i < len(text):
            c = text[i]
            if c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0:
                    break
            i += 1
        end = i + 1
        entries.append(Entry(etype, key, m.start(), end, text[m.start():end]))
    return entries


# --------------------------------------------------------------------------- #
# Normalisation for loose comparison (avoids LaTeX-vs-Unicode false positives)
# --------------------------------------------------------------------------- #
def normalize(value, field=None):
    if field == "month":
        m = value.strip().lower()[:3]
        if m in MONTHS:
            return str(MONTHS[m])
        digits = re.sub(r"[^0-9]", "", value)
        return digits or normalize(value)
    s = value
    s = s.replace(r"\ss", "ss").replace(r"\&", "&").replace(r"\_", "_")
    s = s.replace(r"\%", "%").replace(r"\#", "#").replace("~", " ")
    s = re.sub(r"\\[a-zA-Z]+", "", s)   # drop remaining latex commands/accents
    s = re.sub(r"\\.", "", s)            # drop escaped punctuation
    s = s.replace("{", "").replace("}", "")
    s = s.replace("ß", "ss")
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"[^0-9a-zA-Z]", "", s).lower()
    return s


# --------------------------------------------------------------------------- #
# Crossref
# --------------------------------------------------------------------------- #
def unescape_doi(doi):
    return doi.replace("\\_", "_").replace("\\&", "&").replace("\\%", "%")


def fetch_crossref(doi, retries=3):
    url = "https://api.crossref.org/works/" + urllib.request.quote(doi, safe="")
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.load(resp)["message"]
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            if attempt == retries - 1:
                raise
            time.sleep(2 * (attempt + 1))
        except (urllib.error.URLError, TimeoutError):
            if attempt == retries - 1:
                raise
            time.sleep(2 * (attempt + 1))
    return None


def crossref_fields(msg, etype, has_journal):
    """Map a Crossref message to bibtex-style {field: value} (only present ones)."""
    out = {}

    def first(key):
        v = msg.get(key)
        if isinstance(v, list):
            return v[0] if v else None
        return v

    title = first("title")
    if title:
        out["title"] = title.strip()

    authors = msg.get("author")
    if authors:
        names = []
        for a in authors:
            fam = a.get("family", "").strip()
            given = a.get("given", "").strip()
            if fam and given:
                names.append(f"{fam}, {given}")
            elif fam:
                names.append(fam)
        if names:
            out["author"] = " and ".join(names)

    container = first("container-title")
    if container:
        # journal for articles, booktitle otherwise
        target = "journal" if (etype == "article" or has_journal) else "booktitle"
        out[target] = container.strip()

    if msg.get("page"):
        out["pages"] = msg["page"].replace("-", "--")
    if msg.get("volume"):
        out["volume"] = str(msg["volume"]).strip()
    if msg.get("issue"):
        out["number"] = str(msg["issue"]).strip()
    if msg.get("publisher"):
        out["publisher"] = msg["publisher"].strip()

    isbn = first("ISBN")
    if isbn:
        out["isbn"] = isbn.replace("-", "").strip()
    # Crossref lists both print and electronic ISSNs; prefer the electronic
    # (online) one since the DOI resolves to the online version.
    issn = None
    for t in msg.get("issn-type") or []:
        if t.get("type") == "electronic" and t.get("value"):
            issn = t["value"]
            break
    if not issn:
        issn = first("ISSN")
    if issn:
        out["issn"] = issn.strip()

    dp = (msg.get("issued") or {}).get("date-parts") or \
         (msg.get("published") or {}).get("date-parts")
    if dp and dp[0]:
        parts = dp[0]
        if parts and parts[0]:
            out["year"] = str(parts[0])
        if len(parts) > 1 and parts[1]:
            out["month"] = str(parts[1])
    return out


# --------------------------------------------------------------------------- #
# In-place editing of an entry block
# --------------------------------------------------------------------------- #
def apply_updates(block, updates):
    """Return block with the given {field: newvalue} replaced/inserted."""
    # detect '=' alignment column from existing fields
    cols = [len(m.group(1)) for m in
            re.finditer(r"(?m)^(\s*[A-Za-z][\w-]*\s*)=", block)]
    indent_m = re.search(r"(?m)^(\s*)[A-Za-z][\w-]*\s*=", block)
    indent = indent_m.group(1) if indent_m else "  "
    eq_col = max(cols) if cols else len(indent) + 2

    for field, newval in updates.items():
        pat = re.compile(
            r"(?m)^(\s*" + re.escape(field) + r"\s*=\s*)(\{.*?\}|\".*?\"|[^,\n]+)(\s*,?)",
            re.DOTALL | re.IGNORECASE,
        )
        if pat.search(block):
            block = pat.sub(
                lambda m: m.group(1) + "{" + newval + "}" +
                (m.group(3) if m.group(3).strip() else ","),
                block,
                count=1,
            )
        else:
            # insert before closing brace, aligned like the rest
            pad = " " * max(1, eq_col - len(indent) - len(field))
            line = f"{indent}{field}{pad}= {{{newval}}},\n"
            close = block.rfind("}")
            block = block[:close] + line + block[close:]
    return block


# --------------------------------------------------------------------------- #
def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("-f", "--file", default=DEFAULT_BIB, help="path to .bib file")
    ap.add_argument("--write", action="store_true",
                    help="apply updates to safe fields (default: dry-run report)")
    ap.add_argument("--all-fields", action="store_true",
                    help="also compare title/author (always report-only)")
    ap.add_argument("--delay", type=float, default=0.5,
                    help="seconds to wait between Crossref requests")
    args = ap.parse_args()

    with open(args.file, encoding="utf-8") as fh:
        text = fh.read()

    entries = parse_entries(text)
    compare_fields = SAFE_FIELDS + CURATED_FIELDS + \
        (VERBOSE_FIELDS if args.all_fields else [])

    n_doi = 0
    n_changed = 0
    edits = []  # (entry, updates) to write

    for entry in entries:
        fields = entry.fields()
        doi = fields.get("doi")
        if not doi:
            continue
        n_doi += 1
        doi = unescape_doi(doi)
        try:
            msg = fetch_crossref(doi)
        except Exception as e:  # noqa: BLE001
            print(f"[{entry.key}] ERROR fetching {doi}: {e}", file=sys.stderr)
            continue
        if msg is None:
            print(f"[{entry.key}] DOI not found in Crossref: {doi}")
            continue

        cref = crossref_fields(msg, entry.etype, "journal" in fields)

        diffs = []      # (field, current, crossref) for reporting
        updates = {}    # writable diffs
        for field in compare_fields:
            if field not in cref:
                continue
            cur = fields.get(field, "")
            new = cref[field]
            if normalize(cur, field) != normalize(new, field):
                diffs.append((field, cur, new))
                if field in SAFE_FIELDS:
                    updates[field] = new

        if diffs:
            n_changed += 1
            print(f"\n[{entry.key}]  ({doi})")
            for field, cur, new in diffs:
                tag = "" if field in SAFE_FIELDS else "  (report-only, curated)"
                shown = cur if cur else "(missing)"
                print(f"  {field}{tag}")
                print(f"      bib:      {shown}")
                print(f"      crossref: {new}")
            if updates:
                edits.append((entry, updates))

        time.sleep(args.delay)

    print(f"\nChecked {n_doi} entries with a DOI; {n_changed} differ from Crossref.")

    if args.write and edits:
        # apply from the end of the file backwards so offsets stay valid
        for entry, updates in sorted(edits, key=lambda e: e[0].start, reverse=True):
            new_block = apply_updates(entry.block, updates)
            text = text[:entry.start] + new_block + text[entry.end:]
        with open(args.file, "w", encoding="utf-8") as fh:
            fh.write(text)
        print(f"Wrote updates to {len(edits)} entries in {args.file}.")
    elif edits:
        print("Run with --write to apply the safe-field updates above.")

    return 1 if n_changed else 0


if __name__ == "__main__":
    sys.exit(main())
