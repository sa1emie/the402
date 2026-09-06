#!/usr/bin/env python3
"""Flatten the tool lists into a searchable (tool, server) table.

Only servers that answered a handshake have tools, so this reads straight from
the harvest. Statements are single-line for the same reason as every other
importer here: D1 chunking is line based.
"""
import hashlib
import json
import re
import sys
import urllib.parse


def slugify_url(url):
    p = urllib.parse.urlparse(url)
    raw = (p.netloc + p.path + ("-" + p.query if p.query else "")).lower()
    slug = re.sub(r"[^a-z0-9]+", "-", raw).strip("-") or "server"
    if len(slug) <= 80:
        return slug
    return slug[:71] + "-" + hashlib.sha1(url.encode("utf-8")).hexdigest()[:8]


def slugify_tool(name):
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug[:80] or "tool"


def q(v):
    t = re.sub(r"\s+", " ", str(v)).strip()
    t = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", t).strip()
    return "'" + t.replace("'", "''") + "'" if t else "NULL"


def main():
    if len(sys.argv) != 2:
        print("usage: import_mcp_tools.py <mcp-verified.json>", file=sys.stderr)
        return 2
    rows = json.load(open(sys.argv[1], encoding="utf-8"))
    seen, out = set(), []
    for r in rows:
        names = r.get("toolNames") or []
        if not names:
            continue
        sid = slugify_url(r["url"])
        for n in names:
            if not isinstance(n, str) or not n.strip():
                continue
            slug = slugify_tool(n.strip())
            if (slug, sid) in seen:
                continue
            seen.add((slug, sid))
            out.append("INSERT OR REPLACE INTO mcp_tools (slug,tool,server_id) VALUES (%s,%s,%s);"
                       % (q(slug), q(n.strip()), q(sid)))
    print("\n".join(out))
    print("-- %d tool/server pairs" % len(out), file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
