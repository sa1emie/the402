#!/usr/bin/env python3
"""Check a finished curation file before it gets handed back.

Usage:
    python3 scripts/check_curation.py for-amon-curation.json

Exit codes: 0 = clean, 1 = problems found, 2 = wrong usage.

Standard library only, and written to run on Apple's built-in Python 3.9, so
there is nothing to install. It never edits the file. It only reports.
"""

import json
import os
import re
import sys

def find_baseline(target):
    """Locate the original file so we can tell if measured columns changed.

    These three files travel together as loose attachments, so look next to the
    script and next to the file being checked, not just in the repo layout.
    """
    here = os.path.dirname(os.path.abspath(__file__))
    beside = os.path.dirname(os.path.abspath(target))
    for path in (
        os.path.join(here, "..", "data", "for-amon-curation.json"),
        os.path.join(here, "for-amon-curation.json"),
        os.path.join(beside, "for-amon-curation.json"),
        os.path.join(beside, "for-amon-curation.original.json"),
    ):
        if os.path.exists(path) and os.path.abspath(path) != os.path.abspath(target):
            return path
    return None

CATEGORIES = [
    "data", "ai-inference", "web-scraping", "finance-crypto", "search",
    "media", "identity", "infrastructure", "mcp-server", "other",
]

# Columns that came from real HTTP requests. If these changed, something went
# wrong in editing and the file should not be merged.
FROZEN = ["resource", "price_usd", "network", "method"]

BANNED = [
    "leverage", "synergy", "revolutionize", "elevate", "transform", "unlock",
    "ensure", "facilitate", "comprehensive", "seamless", "robust",
]

UNCLEAR = "unclear from available information"

NAME_MAX = 60
DESC_MAX = 300


class Report:
    def __init__(self):
        self.items = []

    def add(self, row, label, message, fix=None):
        self.items.append((row, label, message, fix))

    def show(self):
        for row, label, message, fix in self.items:
            print("  row %-4s %s" % (row, label))
            print("           %s" % message)
            if fix:
                print("           fix: %s" % fix)
            print("")


def load(path):
    try:
        with open(path, "r", encoding="utf-8") as handle:
            raw = handle.read()
    except IOError as err:
        print("Could not open %s" % path)
        print("  %s" % err)
        return None, None
    try:
        return json.loads(raw), raw
    except ValueError as err:
        print("This file is not valid JSON yet, so nothing else could be checked.")
        if isinstance(err, json.JSONDecodeError):
            lines = raw.splitlines()
            context = lines[err.lineno - 1].strip() if 0 < err.lineno <= len(lines) else ""
            print("")
            print("  line %d  %s" % (err.lineno, err.msg))
            if context:
                print("           the line reads: %s" % context[:120])
        print("")
        print("A common cause is a smart quote pasted in from a browser or a doc.")
        print('Straight quotes only: " and not “ or ”.')
        return None, None


def main(argv):
    if len(argv) != 2:
        print("Usage: python3 scripts/check_curation.py <their-file.json>")
        return 2

    rows, _ = load(argv[1])
    if rows is None:
        return 1
    if not isinstance(rows, list):
        print("The file must be a list of rows, starting with [ and ending with ].")
        return 1

    baseline = None
    baseline_path = find_baseline(argv[1])
    if baseline_path:
        baseline, _ = load(baseline_path)
        baseline = {r.get("resource"): r for r in baseline} if isinstance(baseline, list) else None

    report = Report()
    done = 0
    unclear = 0

    for i, row in enumerate(rows, start=1):
        if not isinstance(row, dict):
            report.add(i, "(unreadable)", "this row is not a block of fields")
            continue

        label = str(row.get("resource", "(no resource)"))[:56]

        # Frozen columns must match what we measured.
        if baseline is not None:
            base = baseline.get(row.get("resource"))
            if base is None:
                report.add(i, label, "this resource is not in the original file",
                           "do not add rows, only fill in the three empty fields")
            else:
                for field in FROZEN:
                    if row.get(field) != base.get(field):
                        report.add(i, label,
                                   '"%s" was changed (was %r, now %r)' % (field, base.get(field), row.get(field)),
                                   "put the original value back, these came from real requests")

        category = (row.get("your_category") or "").strip()
        name = (row.get("your_name") or "").strip()
        desc = (row.get("your_description") or "").strip()

        if not category and not name and not desc:
            continue  # not started yet, counted below
        done += 1

        if not category:
            report.add(i, label, "your_category is empty", "pick one of: " + ", ".join(CATEGORIES))
        elif category not in CATEGORIES:
            report.add(i, label, 'your_category "%s" is not one of the allowed values' % category,
                       "pick one of: " + ", ".join(CATEGORIES))

        if not name:
            report.add(i, label, "your_name is empty")
        elif len(name) > NAME_MAX:
            report.add(i, label, "your_name is %d characters, the limit is %d" % (len(name), NAME_MAX),
                       "shorten it")

        if not desc:
            report.add(i, label, "your_description is empty")
        else:
            if desc.lower().startswith(UNCLEAR):
                unclear += 1
            elif len(desc) > DESC_MAX:
                report.add(i, label, "your_description is %d characters, the limit is %d" % (len(desc), DESC_MAX),
                           "trim it to one or two sentences")
            current = (row.get("current_description") or "").strip()
            if current and desc == current:
                report.add(i, label, "your_description is identical to the provider's own copy",
                           "rewrite it in your own words, or mark it unclear")

        for field, value in (("your_name", name), ("your_description", desc)):
            if "—" in value:
                report.add(i, label, '%s contains an em dash' % field,
                           "house rule is zero em dashes, use a comma or a full stop")
            low = value.lower()
            hits = [w for w in BANNED if re.search(r"\b%s" % w, low)]
            if hits:
                report.add(i, label, "%s uses banned words: %s" % (field, ", ".join(hits)),
                           "say it plainly instead")

    report.show()

    total = len(rows)
    print("%d of %d rows filled in (%d marked unclear)." % (done, total, unclear))
    if report.items:
        n = len(report.items)
        print("%d problem%s found. Nothing was changed." % (n, "" if n == 1 else "s"))
        return 1
    if done < total:
        print("No problems in what is filled in so far. %d rows still empty." % (total - done))
        return 0
    print("OK: all rows filled in, no problems found.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
