#!/usr/bin/env python3
"""Pull the x402 network from Coinbase's Bazaar and verify every endpoint.

Bazaar tells us what exists. It does not tell us what still works. This script
joins the two: it reads the public discovery API, then puts each endpoint
through our own validator and records what actually happened.

Usage:
    python3 scripts/harvest.py --limit 200
    python3 scripts/harvest.py --all --out data/verified.json

Standard library only, Python 3.9 compatible.
"""

import argparse
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

BAZAAR = "https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources"
VALIDATOR = "https://api.the402.dev/validate"
UA = "the402-harvest/0.1 (+https://the402.dev)"
PAGE = 100


def get_json(url, timeout=30, attempts=4):
    """Fetch JSON, retrying transient failures.

    Two real failures made this necessary. A single hiccup while paging Bazaar
    used to abort the whole harvest, and running many probes at once exhausts
    the local DNS resolver, which surfaces as "nodename nor servname provided"
    and looks exactly like a dead endpoint if you do not retry.
    """
    last = None
    for i in range(attempts):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return json.load(r)
        except Exception as err:  # noqa: BLE001 - deliberately broad, we retry everything
            last = err
            if i < attempts - 1:
                time.sleep(1.5 * (i + 1))
    raise last


def fetch_bazaar(limit=None, sleep=0.2):
    """Page through Bazaar. Returns raw items."""
    items, offset, total = [], 0, None
    while True:
        want = PAGE if limit is None else min(PAGE, limit - len(items))
        if want <= 0:
            break
        try:
            page = get_json("%s?limit=%d&offset=%d" % (BAZAAR, want, offset))
        except Exception as e:
            # Skip this page rather than abandoning the run. Aborting here once
            # silently cut a 15,000 endpoint harvest down to 2,598.
            print("  bazaar page at offset %d failed after retries, skipping: %s" % (offset, e), file=sys.stderr)
            offset += want
            if total is not None and offset >= total:
                break
            continue
        batch = page.get("items") or []
        if not batch:
            break
        items.extend(batch)
        pag = page.get("pagination") or {}
        total = pag.get("total", total)
        offset += len(batch)
        print("  fetched %d/%s" % (len(items), total if total else "?"), file=sys.stderr)
        if total is not None and offset >= total:
            break
        time.sleep(sleep)
    return items, total


def shape(item):
    """Flatten one Bazaar item into the fields we care about."""
    bazaar = (item.get("extensions") or {}).get("bazaar") or {}
    info = (bazaar.get("info") or {}).get("input") or {}
    accepts = item.get("accepts") or []
    first = accepts[0] if accepts else {}
    return {
        "resource": item.get("resource"),
        "bazaarDescription": (item.get("description") or "").strip(),
        "methodHint": (info.get("method") or "").upper() or None,
        "lastUpdated": item.get("lastUpdated"),
        "quality": item.get("quality"),
        "declaredNetwork": first.get("network"),
        "declaredAmount": first.get("amount") or first.get("maxAmountRequired"),
        "declaredScheme": first.get("scheme"),
        "optionCount": len(accepts),
    }


def verify(entry, timeout=60):
    """Run one endpoint through our validator, pinning Bazaar's method hint."""
    url = entry["resource"]
    if not url or not url.startswith("https://"):
        entry["verdict"] = "skipped"
        entry["verifyNote"] = "no https resource url"
        return entry

    # A templated path like /tx/:hash cannot be probed without a real value.
    if "/:" in url:
        entry["verdict"] = "skipped"
        entry["verifyNote"] = "templated path, needs a real parameter to probe"
        return entry

    q = "url=" + urllib.parse.quote(url, safe="")
    if entry.get("methodHint") in ("GET", "POST", "HEAD"):
        q += "&method=" + entry["methodHint"]

    try:
        d = get_json("%s?%s" % (VALIDATOR, q), timeout=timeout)
    except Exception as e:
        entry["verdict"] = "check-failed"
        entry["verifyNote"] = str(e)[:120]
        return entry

    accepts = d.get("accepts") or []
    usable = [a for a in accepts if a.get("usable")]
    spec = d.get("spec") or {}
    entry.update({
        "verdict": d.get("verdict"),
        "summary": d.get("summary"),
        "methodUsed": (d.get("http") or {}).get("methodUsed"),
        "status": (d.get("http") or {}).get("status"),
        "latencyMs": (d.get("http") or {}).get("latencyMs"),
        "transport": spec.get("transport"),
        "dialect": "v1" if spec.get("amountField") == "maxAmountRequired" else (
            "v2" if spec.get("amountField") == "amount" else None),
        "declaredVersion": spec.get("declaredVersion"),
        "usableOptions": len(usable),
        "totalOptions": len(accepts),
        "priceUsd": (usable[0].get("priceUsd") if usable else None),
        "network": (usable[0].get("networkCanonical") if usable else None),
        "payTo": (usable[0].get("payTo") if usable else None),
        "errors": [p for p in (d.get("problems") or []) if p.get("severity") == "error"],
        "checkedAt": d.get("checkedAt"),
    })
    return entry


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=100, help="how many Bazaar items to pull")
    ap.add_argument("--all", action="store_true", help="pull every item Bazaar has")
    ap.add_argument("--concurrency", type=int, default=6, help="parallel verifications")
    ap.add_argument("--out", default="data/verified.json")
    ap.add_argument("--no-verify", action="store_true", help="harvest only, skip verification")
    args = ap.parse_args()

    print("fetching from Bazaar...", file=sys.stderr)
    raw, total = fetch_bazaar(None if args.all else args.limit)
    print("bazaar reports %s total resources; pulled %d" % (total, len(raw)), file=sys.stderr)

    # One entry per resource URL. Bazaar lists the same URL more than once.
    seen, entries = set(), []
    for item in raw:
        e = shape(item)
        key = (e["resource"] or "").rstrip("/").lower()
        if not key or key in seen:
            continue
        seen.add(key)
        entries.append(e)
    print("deduped to %d unique resources" % len(entries), file=sys.stderr)

    if not args.no_verify:
        print("verifying through %s ..." % VALIDATOR, file=sys.stderr)
        done = 0
        with ThreadPoolExecutor(max_workers=args.concurrency) as ex:
            for _ in ex.map(verify, entries):
                done += 1
                if done % 25 == 0:
                    print("  verified %d/%d" % (done, len(entries)), file=sys.stderr)

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(entries, f, indent=2, ensure_ascii=False)

    counts = {}
    for e in entries:
        counts[e.get("verdict") or "not-checked"] = counts.get(e.get("verdict") or "not-checked", 0) + 1
    print("\nwrote %d entries to %s" % (len(entries), args.out), file=sys.stderr)
    for k in sorted(counts, key=lambda x: -counts[x]):
        print("  %-14s %d" % (k, counts[k]), file=sys.stderr)


if __name__ == "__main__":
    main()
