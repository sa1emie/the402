#!/usr/bin/env python3
"""Check a listings file before it gets handed over.

Usage:
    python3 scripts/check_listings.py data/listings.json

Exit codes: 0 = clean, 1 = problems found, 2 = wrong usage.

Standard library only, and written to run on Apple's built-in Python 3.9,
so there is nothing to install. It never edits the file. It only reports.
"""

import json
import re
import sys

# The only values these fields are allowed to hold.
CATEGORIES = [
    "data",
    "ai-inference",
    "web-scraping",
    "finance-crypto",
    "search",
    "media",
    "identity",
    "infrastructure",
    "mcp-server",
    "other",
]

NETWORKS = [
    "base",
    "base-sepolia",
    "ethereum",
    "polygon",
    "optimism",
    "arbitrum",
    "avalanche",
    "solana",
    "aptos",
    "stellar",
    "sui",
]

SOURCES = ["bazaar", "awesome-x402", "submission", "manual"]

REQUIRED_TEXT = ["id", "name", "url", "description", "category", "network", "source"]
OPTIONAL_TEXT = ["homepage", "asset", "facilitator", "pay_to", "source_url", "notes"]
REQUIRED_NUMBER = ["price_usd"]
REQUIRED_BOOL = ["on_cloudflare", "mcp"]

# Written by the validator, never by hand. Catching these keeps a badge honest.
MACHINE_ONLY = ["verification", "verified_at", "payload_verified", "payment_verified", "status"]

ALL_KNOWN = (
    REQUIRED_TEXT + OPTIONAL_TEXT + REQUIRED_NUMBER + REQUIRED_BOOL + ["added_at"]
)

ID_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def plain_json_error(err, raw):
    """Turn a json module error into something worth reading."""
    msg = err.msg
    line = err.lineno
    hints = [
        ("Expecting ',' delimiter",
         "looks like a missing comma at the end of the line above"),
        ("Expecting property name enclosed in double quotes",
         "looks like an extra comma after the last entry, or a field name "
         "without double quotes"),
        ("Expecting value",
         "looks like a field with nothing after the colon, or a stray comma"),
        ("Unterminated string",
         "a quote was opened and never closed"),
        ("Expecting ':' delimiter",
         "a field name is missing the colon after it"),
    ]
    hint = "check this line and the one above it"
    for needle, friendly in hints:
        if needle in msg:
            hint = friendly
            break

    lines = raw.splitlines()
    context = ""
    if 0 < line <= len(lines):
        context = lines[line - 1].strip()

    print("This file is not valid JSON yet, so nothing else could be checked.")
    print("")
    print("  line %d  %s" % (line, hint))
    if context:
        print("           the line reads: %s" % context)
    print("")
    print("A common cause is a smart quote pasted in from a browser or a doc.")
    print("Straight quotes only: \" and not “ or ”.")


def line_of_entry(raw, entry_id, index):
    """Best guess at which line an entry starts on, for a readable report.

    Position comes first and the id is only a fallback. Two entries can share
    an id (that is one of the things we report), and searching by id would then
    point at the original instead of the duplicate.
    """
    count = 0
    for n, text in enumerate(raw.splitlines(), start=1):
        if text.strip().startswith("{"):
            if count == index:
                return n
            count += 1
    if entry_id:
        for n, text in enumerate(raw.splitlines(), start=1):
            if '"id"' in text and ('"%s"' % entry_id) in text:
                return n
    return 0


class Report:
    def __init__(self):
        self.problems = []

    def add(self, line, entry_label, message, fix=None):
        self.problems.append((line, entry_label, message, fix))

    def show(self, path):
        if not self.problems:
            return
        print(path)
        print("")
        for line, label, message, fix in self.problems:
            where = "line %d" % line if line else "entry"
            print("  %-9s %s" % (where, label))
            print("            %s" % message)
            if fix:
                print("            fix: %s" % fix)
            print("")


def check_entry(entry, index, raw, report):
    if not isinstance(entry, dict):
        report.add(0, "entry %d" % (index + 1),
                   "this entry is not a block of fields",
                   "each entry must be wrapped in { and }")
        return None

    entry_id = entry.get("id") if isinstance(entry.get("id"), str) else None
    line = line_of_entry(raw, entry_id, index)
    label = '"%s"' % entry_id if entry_id else "entry %d (no id yet)" % (index + 1)

    for field in MACHINE_ONLY:
        if field in entry:
            report.add(line, label,
                       'the "%s" field is filled in by the checker, not by hand' % field,
                       "delete that line, the validator writes it after it runs")

    for field in REQUIRED_TEXT:
        value = entry.get(field)
        if field not in entry:
            report.add(line, label, 'missing the "%s" field' % field,
                       'add "%s": "..." to this entry' % field)
        elif not isinstance(value, str):
            report.add(line, label,
                       '"%s" must be text in double quotes, got %s'
                       % (field, describe(value)),
                       'write it as "%s": "your text here"' % field)
        elif not value.strip():
            report.add(line, label, '"%s" is empty' % field, "fill it in or remove the entry")

    for field in OPTIONAL_TEXT:
        if field in entry and not isinstance(entry[field], str):
            report.add(line, label,
                       '"%s" must be text in double quotes, got %s'
                       % (field, describe(entry[field])),
                       'write it as "%s": "your text here"' % field)

    for field in REQUIRED_NUMBER:
        value = entry.get(field)
        if field not in entry:
            report.add(line, label, 'missing the "%s" field' % field,
                       'add "%s": 0.002 to this entry (no quotes)' % field)
        elif isinstance(value, bool) or not isinstance(value, (int, float)):
            report.add(line, label,
                       '"%s" must be a number, got %s' % (field, describe(value)),
                       'remove the quotes, so "%s": 0.002 and not "0.002"' % field)
        elif value < 0:
            report.add(line, label, '"%s" cannot be negative' % field, None)

    for field in REQUIRED_BOOL:
        value = entry.get(field)
        if field not in entry:
            report.add(line, label, 'missing the "%s" field' % field,
                       'add "%s": true or "%s": false (no quotes)' % (field, field))
        elif not isinstance(value, bool):
            report.add(line, label,
                       '"%s" must be true or false, got %s' % (field, describe(value)),
                       'write true or false with no quotes around it')

    if entry_id and not ID_RE.match(entry_id):
        report.add(line, label,
                   '"id" must be lowercase letters, numbers and hyphens only',
                   'for example "scrape-402" and not "Scrape 402"')

    category = entry.get("category")
    if isinstance(category, str) and category not in CATEGORIES:
        report.add(line, label,
                   '"category" is not one of the allowed values (got "%s")' % category,
                   "pick one of: " + ", ".join(CATEGORIES))

    network = entry.get("network")
    if isinstance(network, str) and network not in NETWORKS:
        report.add(line, label,
                   '"network" is not one of the allowed values (got "%s")' % network,
                   "pick one of: " + ", ".join(NETWORKS))

    source = entry.get("source")
    if isinstance(source, str) and source not in SOURCES:
        report.add(line, label,
                   '"source" is not one of the allowed values (got "%s")' % source,
                   "pick one of: " + ", ".join(SOURCES))

    url = entry.get("url")
    if isinstance(url, str) and url and not url.startswith("https://"):
        report.add(line, label,
                   '"url" must start with https://',
                   "if the endpoint is http only, leave it out and tell Salem")

    added = entry.get("added_at")
    if added is not None and (not isinstance(added, str) or not DATE_RE.match(added)):
        report.add(line, label,
                   '"added_at" must look like 2026-08-05',
                   'four digit year, two digit month, two digit day')

    description = entry.get("description")
    if isinstance(description, str) and len(description) > 300:
        report.add(line, label,
                   '"description" is %d characters, the limit is 300' % len(description),
                   "trim it to one or two sentences")

    if isinstance(description, str) and "—" in description:
        report.add(line, label,
                   '"description" contains an em dash',
                   "house rule is zero em dashes, use a comma or a full stop")

    for field in entry:
        if field not in ALL_KNOWN and field not in MACHINE_ONLY:
            report.add(line, label,
                       'unknown field "%s"' % field,
                       "check the spelling against the schema, or delete the line")

    return entry_id


def describe(value):
    if value is None:
        return "nothing"
    if isinstance(value, bool):
        return "true/false"
    if isinstance(value, str):
        return 'the text "%s"' % (value if len(value) <= 30 else value[:27] + "...")
    if isinstance(value, (int, float)):
        return "the number %s" % value
    if isinstance(value, list):
        return "a list"
    if isinstance(value, dict):
        return "a block of fields"
    return "something unexpected"


def main(argv):
    if len(argv) != 2:
        print("Usage: python3 scripts/check_listings.py data/listings.json")
        return 2

    path = argv[1]
    try:
        with open(path, "r", encoding="utf-8") as handle:
            raw = handle.read()
    except IOError as err:
        print("Could not open %s" % path)
        print("  %s" % err)
        return 2

    try:
        data = json.loads(raw)
    except ValueError as err:
        if isinstance(err, json.JSONDecodeError):
            plain_json_error(err, raw)
        else:
            print("This file is not valid JSON yet: %s" % err)
        return 1

    if not isinstance(data, list):
        print("The file must be a list of entries, starting with [ and ending with ].")
        return 1

    report = Report()
    seen_ids = {}
    seen_urls = {}

    for index, entry in enumerate(data):
        entry_id = check_entry(entry, index, raw, report)
        line = line_of_entry(raw, entry_id, index)
        label = '"%s"' % entry_id if entry_id else "entry %d" % (index + 1)

        if entry_id:
            if entry_id in seen_ids:
                report.add(line, label,
                           'this id is already used by entry %d' % (seen_ids[entry_id] + 1),
                           "every id must be unique, add a suffix like -v2")
            else:
                seen_ids[entry_id] = index

        if isinstance(entry, dict):
            url = entry.get("url")
            if isinstance(url, str) and url:
                key = url.rstrip("/").lower()
                if key in seen_urls:
                    report.add(line, label,
                               'this url is already listed by entry %d' % (seen_urls[key] + 1),
                               "drop the duplicate, or list the other endpoint path")
                else:
                    seen_urls[key] = index

    report.show(path)

    count = len(report.problems)
    if count == 0:
        print("OK: %d entries, no problems found." % len(data))
        return 0

    print("%d problem%s found in %d entries. Nothing was changed."
          % (count, "" if count == 1 else "s", len(data)))
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
