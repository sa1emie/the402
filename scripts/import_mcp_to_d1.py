#!/usr/bin/env python3
"""Turn an MCP harvest into SQL for D1.

Prints INSERT OR REPLACE statements to stdout, one per line. Single-line
statements are not a style choice: D1's `execute --file` chunking is line
based, and a statement spanning several lines gets silently split and dropped
while the import still reports success.

Usage:
    python3 scripts/import_mcp_to_d1.py data/mcp-verified-v1.json > out.sql
"""

import hashlib
import json
import re
import sys
import urllib.parse

COLUMNS = ("id,name,url,host,transport,verdict,http_status,latency_ms,"
           "server_name,server_version,protocol_version,tool_count,tool_names,"
           "errors,checked_at")


def slugify(url):
    """Stable, unique id for a server URL.

    Same rule as the x402 importer. Plain truncation collides, and Apify alone
    lists one host a hundred times with only the query string differing, so the
    query string is part of the slug and the digest suffix does the rest.
    """
    p = urllib.parse.urlparse(url)
    raw = (p.netloc + p.path + ("-" + p.query if p.query else "")).lower()
    slug = re.sub(r"[^a-z0-9]+", "-", raw).strip("-") or "server"
    if len(slug) <= 80:
        return slug
    digest = hashlib.sha1(url.encode("utf-8")).hexdigest()[:8]
    return slug[:71] + "-" + digest


def q(value):
    """Quote a value for SQLite, collapsing anything that breaks chunking."""
    if value is None or value == "":
        return "NULL"
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, (list, dict)):
        value = json.dumps(value, ensure_ascii=False)
    text = re.sub(r"\s+", " ", str(value)).strip()
    # A NUL byte in one description once caused D1 to drop the statement while
    # still reporting success. Strip control characters before they get there.
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text).strip()
    if not text:
        return "NULL"
    return "'" + text.replace("'", "''") + "'"


def main():
    if len(sys.argv) != 2:
        print("usage: import_mcp_to_d1.py <mcp-verified.json>", file=sys.stderr)
        return 2
    with open(sys.argv[1], encoding="utf-8") as f:
        rows = json.load(f)

    seen = {}
    out = []
    dropped = 0
    for r in rows:
        url = r.get("url")
        if not url:
            continue
        slug = slugify(url)
        if slug in seen and seen[slug] != url:
            slug = slug[:63] + "-" + hashlib.sha1(url.encode("utf-8")).hexdigest()[:8]
        if slug in seen:
            dropped += 1
            continue
        seen[slug] = url
        host = urllib.parse.urlparse(url).netloc
        values = ",".join([
            q(slug), q(r.get("name")), q(url), q(host), q(r.get("transport")),
            q(r.get("verdict")), q(r.get("httpStatus")), q(r.get("latencyMs")),
            q(r.get("serverName")), q(r.get("serverVersion")),
            q(r.get("protocolVersion")), q(r.get("toolCount")),
            q(r.get("toolNames")), q(r.get("errors")), q(r.get("checkedAt")),
        ])
        out.append("INSERT OR REPLACE INTO mcp_servers (%s) VALUES (%s);" % (COLUMNS, values))

    print("\n".join(out))
    print("-- %d rows from %d input (%d dropped by dedupe)"
          % (len(out), len(rows), dropped), file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
