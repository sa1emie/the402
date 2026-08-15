#!/usr/bin/env python3
"""Turn a verified harvest into SQL for the directory database.

Reads the JSON produced by harvest.py and writes an idempotent .sql file.
Verification columns come straight from the checker's output, never from
Bazaar's own claims, so what the site shows is what we actually observed.

Usage:
    python3 scripts/import_to_d1.py data/verified-600.json > directory/seed.sql
"""

import hashlib
import json
import re
import sys
import urllib.parse
from datetime import datetime, timezone

# Rough first-pass categories. Amon refines these by hand; the point is that
# the site is browsable on day one rather than one long undifferentiated list.
CATEGORY_RULES = [
    ("finance-crypto", r"chain|block|token|erc20|erc721|nft|wallet|balance|defi|swap|price|yield|tx|gas|solana|onchain"),
    ("web-scraping",   r"scrape|crawl|extract|markdown|readability|browse|fetch|render"),
    ("search",         r"search|query|serp|index|lookup|discovery"),
    ("ai-inference",   r"\bai\b|llm|gpt|infer|embed|generate|completion|prompt|model"),
    ("media",          r"image|video|audio|speech|tts|transcri|render|thumbnail|seedance"),
    ("identity",       r"identity|kyc|verify|auth|reputation|credential|whois|dns"),
    ("mcp-server",     r"/mcp|mcp\.|tools/"),
    ("data",           r"data|weather|news|stats|feed|api/v\d|records|dataset"),
]


def slugify(url):
    """Stable, unique id for an endpoint URL.

    Plain truncation collides: several CoinGecko paths share their first 80
    characters, which silently merged 36 real endpoints into 9 ids. When the
    slug has to be cut, keep a digest of the full URL so it stays unique.
    """
    p = urllib.parse.urlparse(url)
    raw = (p.netloc + p.path).lower()
    slug = re.sub(r"[^a-z0-9]+", "-", raw).strip("-") or "endpoint"
    if len(slug) <= 80:
        return slug
    digest = hashlib.sha1(url.encode("utf-8")).hexdigest()[:8]
    return slug[:71] + "-" + digest


def categorise(url, description):
    hay = ("%s %s" % (url, description or "")).lower()
    for name, pattern in CATEGORY_RULES:
        if re.search(pattern, hay):
            return name
    return "other"


def display_name(url):
    p = urllib.parse.urlparse(url)
    host = p.netloc.replace("www.", "")
    tail = [s for s in p.path.split("/") if s and not s.startswith(":")]
    return "%s %s" % (host, " ".join(tail[-2:])) if tail else host


def q(value):
    """Quote a value for SQLite.

    Whitespace is collapsed to single spaces. Descriptions coming out of Bazaar
    sometimes contain literal newlines, and a statement spanning several lines
    breaks any line-based chunking of the output file.
    """
    if value is None or value == "":
        return "NULL"
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, (int, float)):
        return str(value)
    text = re.sub(r"\s+", " ", str(value)).strip()
    # Control characters (NUL, ETX, and friends) must never reach the SQL file.
    # One Bazaar description carried a NUL byte and the whole statement was
    # dropped by D1 while the import still reported success (the402, 2026-08-10).
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text).strip()
    if not text:
        return "NULL"
    return "'" + text.replace("'", "''") + "'"


def main():
    if len(sys.argv) != 2:
        print("usage: import_to_d1.py <verified.json>", file=sys.stderr)
        return 2

    with open(sys.argv[1], encoding="utf-8") as f:
        rows = json.load(f)

    now = datetime.now(timezone.utc).isoformat()
    seen = {}  # slug -> url, to catch different URLs that slugify the same
    out = []
    dropped = 0

    for r in rows:
        url = r.get("resource")
        if not url:
            continue
        slug = slugify(url)
        if slug in seen and seen[slug] != url:
            # Same slug, different URL: a plain "/" in a templated path and a
            # "-" in a real one can slugify identically (block/:number vs
            # block-number). The shorter-slug hash fix never fired for these.
            slug = slug[:63] + "-" + hashlib.sha1(url.encode("utf-8")).hexdigest()[:8]
        if slug in seen:
            dropped += 1
            print("  duplicate slug %s, dropped %s" % (slug, url), file=sys.stderr)
            continue
        seen[slug] = url

        host = urllib.parse.urlparse(url).netloc.lower()
        desc = (r.get("bazaarDescription") or "").strip()
        errors = r.get("errors") or []

        out.append(
            "INSERT OR REPLACE INTO listings (id,resource,host,name,description,category,"
            "verdict,method_used,http_status,latency_ms,dialect,transport,declared_version,"
            "network,price_usd,price_atomic,pay_to,usable_options,total_options,error_count,"
            "notes,source,on_cloudflare,bazaar_updated,verified_at,first_seen) VALUES ("
            + ",".join([
                q(slug), q(url), q(host), q(display_name(url)), q(desc[:400]),
                q(categorise(url, desc)),
                q(r.get("verdict")), q(r.get("methodUsed")), q(r.get("status")),
                q(r.get("latencyMs")), q(r.get("dialect")), q(r.get("transport")),
                q(r.get("declaredVersion")), q(r.get("network")), q(r.get("priceUsd")),
                q(r.get("declaredAmount")), q(r.get("payTo")),
                q(r.get("usableOptions")), q(r.get("totalOptions")), q(len(errors)),
                q(r.get("verifyNote")), q("bazaar"),
                q(1 if ".workers.dev" in host else 0),
                q(r.get("lastUpdated")), q(r.get("checkedAt")), q(now),
            ])
            + ");"
        )

    print("\n".join(out))
    print("-- %d rows from %d input (%d dropped by dedupe)" % (len(out), len(rows), dropped), file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
