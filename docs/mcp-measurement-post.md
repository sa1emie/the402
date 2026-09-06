# We sent one handshake to every remote server in the MCP registry. 45% answer. 30% are locked, which is not the same as broken.

*Measured 2026-09-05 against the official registry at
registry.modelcontextprotocol.io. It listed roughly 37,000 servers that day;
9,109 of them expose a remote HTTP endpoint, and we sent each one a real
MCP `initialize` request. Servers that ship only as a local package were not
probed, because there is nothing to call. Any single server below can be
re-checked with one curl. The aggregates cannot be, short of re-running the
harvest, and the script that does it is in the repo.*

MCP is the protocol agents use to discover and call tools. There are several
registries listing servers, and the official one is the largest. What none of
them publish is what happens when you actually call every server on the list.

We did that for x402 endpoints last month and learned two things: the network
turns over faster than any directory can track, and our own first attempt was
wrong in a way we had to retract. So we ran the same method here, and we are
stating the numbers two ways, because the first way we stated them was
flattering and we did not notice until we checked.

## The numbers, two ways

| | By listing (9,109) | By unique host (7,377) |
|---|---|---|
| Answered an MCP handshake | 44.8% | 49.5% |
| Locked behind a 401 or 403 | 30.3% | 32.9% |
| Failed outright | 24.9% | 17.6% |

Both columns are true. The left one counts registry entries, which is how the
registry presents itself. The right one counts hosts, because three of them
account for most of the gap on the failing row: `api.m2mcent.com` has
276 entries and every one is a 404, one `trycloudflare.com` tunnel has
90 entries and none resolve, and `server.smithery.ai` proxies 213
entries of which most are 404. Counted once each, the failure rate is
17.6%, not 24.9%.

We show both so nobody has to wonder which one we would have picked.

## The headline: locked is not broken

2,762 listed servers, 30%, answer our handshake with a 401 or a
403. They are running. They want a credential we do not have. A checker that
sends one request and treats "did not get a result" as "dead" calls every one
of them broken, and is wrong about a third of the registry before it starts.

This is the same shape as the finding on the x402 side, where a GET-only probe
could not see the 52% of endpoints that only answer POST. In both cases the
error is not in the servers. It is in assuming the probe's failure is the
server's failure.

We record those 2,762 as `auth-required`. Not as answering, because
they did not, and not as failing, because they did not do that either.

## What actually failed

| Outcome | Count |
|---|---|
| Not found (404) | 874 |
| Unreachable: DNS, timeout, refused | 833 |
| Answered, but the JSON-RPC body was an error | 223 |
| Answered with something that is not MCP | 211 |
| Server error (5xx) | 98 |
| Bad request (other 4xx) | 26 |

Three hosts are most of this table, and they are listed above. Strip them out
and the registry looks considerably healthier than the raw count suggests.

## What the servers that answered are serving

Of the 4,082 that answered, we followed up with `tools/list`.
3,967 returned a tool list; 115 answered the handshake but
returned nothing usable when asked for tools, and we record that rather than
guess at it.

Across those 3,967 servers: **52,538 tools**, a median of
6 per server, and one server exposing 627.

## Live servers the registry does not list

We also called the MCP servers of six companies whose names come up when
people talk about agent tooling. Four of the six answer a handshake and are
not in the official registry at all: Firecrawl, Tavily, Browserbase and
Nansen. Only Exa and Apify are listed, and Apify is listed 100 times, once
per query-string variant, all of them locked.

We are not saying the registry is incomplete as a criticism. We are saying a
directory built from it alone misses live servers from well-known operators,
which is a property worth knowing before you build on it.

## We got a number wrong before we published it

Three weeks ago we probed a sample of 400 servers and found 45.8% locked and
12.7% failing. We nearly used those figures. The full run says 30.3% and
24.9%. The sample was the first 400 entries in the registry's default
order, and the registry's default order is not random.

We are leaving this in for the same reason we left the x402 retraction in. A
measurement project that hides its corrections is worth nothing, and a sample
that happens to be the top of a list is not a sample.

## What we did not do

We sent one `initialize` and, on success, one `tools/list`. We did not call a
tool. We did not authenticate. We did not retry a server that timed out, so
some of the 833 unreachable may have been briefly unlucky. We did
not probe servers that ship only as a package, which is roughly one in eight
of the registry. A server that "answers a handshake" here is one that
returned a valid `initialize` result. That is all it means.

## Check any of this yourself

Any single server:

```bash
curl -s -X POST https://<server>/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"you","version":"0"}}}'
```

The whole thing: `scripts/harvest_mcp.py` in the repo, and the dated result
set is `data/mcp-verified-v1.json`.
