#!/usr/bin/env python3
"""Harvest and probe MCP servers, the same way we probe x402 endpoints.

Why this exists: roughly 100,000 MCP servers are listed across the public
registries and nobody publishes which ones actually answer. The interesting
part is not the dead ones. It is that 45% of listed remote servers return 401
or 403, so a checker that treats "did not answer" as "broken" is wrong about
nearly half the registry. Gated and broken are different verdicts here and they
stay different.

We never claim a server "works". It answers an MCP handshake, or it does not.

Usage:
    python3 scripts/harvest_mcp.py --limit 500
    python3 scripts/harvest_mcp.py --all --out data/mcp-verified-v1.json

Standard library only, Python 3.9 compatible.
"""

import argparse
import concurrent.futures as cf
import json
import ssl
import sys
import time
import urllib.error
import urllib.request

REGISTRY = "https://registry.modelcontextprotocol.io/v0/servers"
UA = "the402-mcp/0.1 (+https://the402.dev)"
PROTOCOL = "2025-06-18"
CTX = ssl.create_default_context()

INIT = {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
        "protocolVersion": PROTOCOL,
        "capabilities": {},
        "clientInfo": {"name": "the402-probe", "version": "0.1"},
    },
}
TOOLS = {"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}}


def rpc(url, payload, timeout, session=None):
    """One JSON-RPC call. Returns (status, parsed_or_None, raw_text, error)."""
    headers = {
        "User-Agent": UA,
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
        "MCP-Protocol-Version": PROTOCOL,
    }
    if session:
        headers["Mcp-Session-Id"] = session
    req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=CTX) as h:
            raw = h.read(60000).decode("utf-8", "replace")
            return h.status, parse_body(raw), raw, None, h.headers.get("Mcp-Session-Id")
    except urllib.error.HTTPError as e:
        try:
            raw = e.read(4000).decode("utf-8", "replace")
        except Exception:
            raw = ""
        return e.code, parse_body(raw), raw, None, None
    except Exception as e:
        return 0, None, "", "%s: %s" % (type(e).__name__, str(e)[:140]), None


def parse_body(raw):
    """Streamable HTTP may answer as plain JSON or as SSE. Handle both."""
    text = (raw or "").strip()
    if text.startswith("{"):
        try:
            return json.loads(text)
        except Exception:
            return None
    for line in text.splitlines():
        line = line.strip()
        if line.startswith("data:"):
            try:
                return json.loads(line[5:].strip())
            except Exception:
                continue
    return None


def classify(status, payload, err):
    if err:
        return "unreachable"
    if status in (401, 403):
        return "auth-required"
    if status == 404:
        return "not-found"
    if 500 <= status < 600:
        return "server-error"
    if payload is None:
        return "not-mcp"
    if "error" in payload:
        return "jsonrpc-error"
    result = payload.get("result") or {}
    if "protocolVersion" in result or "serverInfo" in result:
        return "answers-mcp"
    if 400 <= status < 500:
        return "bad-request"
    return "not-mcp"


def probe(item):
    name, url, transport = item
    started = time.time()
    status, payload, raw, err, session = rpc(url, INIT, 15)
    verdict = classify(status, payload, err)
    latency = int((time.time() - started) * 1000)

    row = {
        "name": name,
        "url": url,
        "transport": transport,
        "verdict": verdict,
        "httpStatus": status or None,
        "latencyMs": latency,
        "serverName": None,
        "serverVersion": None,
        "protocolVersion": None,
        "toolCount": None,
        "toolNames": None,
        "errors": [],
        "checkedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    if err:
        row["errors"].append({"severity": "error", "field": "transport", "message": err})
    elif verdict == "jsonrpc-error":
        e = (payload.get("error") or {})
        row["errors"].append({"severity": "error", "field": "jsonrpc",
                              "message": str(e.get("message"))[:200]})

    if verdict == "answers-mcp":
        result = payload.get("result") or {}
        info = result.get("serverInfo") or {}
        row["serverName"] = info.get("name")
        row["serverVersion"] = info.get("version")
        row["protocolVersion"] = result.get("protocolVersion")
        # A server that answers initialize may still refuse tools/list. That is
        # recorded, not treated as a failed handshake.
        s2, p2, _, e2, _ = rpc(url, TOOLS, 12, session)
        if p2 and isinstance(p2.get("result"), dict):
            tools = p2["result"].get("tools") or []
            row["toolCount"] = len(tools)
            row["toolNames"] = [t.get("name") for t in tools][:40]
        elif e2:
            row["errors"].append({"severity": "warning", "field": "tools/list",
                                  "message": "handshake succeeded, tools/list did not: %s" % e2})
    return row


def collect(limit_pages=400):
    seen, out, cursor = set(), [], None
    pages = 0
    while pages < limit_pages:
        u = REGISTRY + "?limit=100" + (("&cursor=" + cursor) if cursor else "")
        req = urllib.request.Request(u, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=60) as h:
            body = json.load(h)
        servers = body.get("servers") or []
        if not servers:
            break
        for s in servers:
            srv = s.get("server", s)
            nm = srv.get("name")
            for r in (srv.get("remotes") or []):
                url = r.get("url")
                if url and url not in seen:
                    seen.add(url)
                    out.append((nm, url, r.get("type") or "?"))
        meta = body.get("metadata") or {}
        cursor = meta.get("nextCursor") or meta.get("next_cursor")
        pages += 1
        if pages % 10 == 0:
            print("  registry pages: %d, remote urls: %d" % (pages, len(out)), file=sys.stderr)
        if not cursor:
            break
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=200, help="how many servers to probe")
    ap.add_argument("--all", action="store_true", help="probe every remote server found")
    ap.add_argument("--concurrency", type=int, default=8)
    ap.add_argument("--out", default="data/mcp-verified.json")
    args = ap.parse_args()

    print("collecting registry...", file=sys.stderr)
    servers = collect()
    print("remote endpoints found: %d" % len(servers), file=sys.stderr)
    todo = servers if args.all else servers[: args.limit]
    print("probing %d ..." % len(todo), file=sys.stderr)

    rows = []
    with cf.ThreadPoolExecutor(max_workers=args.concurrency) as pool:
        for i, row in enumerate(pool.map(probe, todo), 1):
            rows.append(row)
            if i % 100 == 0:
                print("  probed %d/%d" % (i, len(todo)), file=sys.stderr)

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(rows, f, indent=2, ensure_ascii=False)

    counts = {}
    for r in rows:
        counts[r["verdict"]] = counts.get(r["verdict"], 0) + 1
    print("\nprobed %d of %d listed remote endpoints" % (len(rows), len(servers)), file=sys.stderr)
    for k, v in sorted(counts.items(), key=lambda x: -x[1]):
        print("  %-16s %6d  %5.1f%%" % (k, v, 100.0 * v / len(rows)), file=sys.stderr)
    print("wrote %s" % args.out, file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
