# We sent one handshake to every remote server in the MCP registry. Half answer. A quarter are locked, which is not the same as broken.

*Measured 2026-09-06 against the official registry at
registry.modelcontextprotocol.io. We walked all 930 pages of it: 92,908
entries, which resolve to 27,422 unique server names and 16,923 unique
remote HTTP endpoints. We sent each of those endpoints one real MCP
`initialize` request. Servers shipped only as a local package were not probed,
because there is nothing to call. Any single server below can be re-checked
with one curl. The aggregates cannot be, short of re-running the harvest, and
the script that does it is in the repo.*

MCP is the protocol agents use to discover and call tools. Several registries
list servers, and the official one is the largest. What none of them publishes
is what happens when you call every server on the list.

## The numbers, two ways

| | By listing (16,923) | By unique host (11,823) |
|---|---|---|
| Answered an MCP handshake | 51.1% | 50.0% |
| Locked behind a 401 or 403 | 24.0% | 30.0% |
| Failed outright | 24.9% | 20.0% |

Both are true and they answer different questions. The left counts registry
entries, which is how the registry presents itself. The right counts hosts,
because a handful of them carry enormous numbers of listings: `gateway.pipeworx.io` with 1,314 listings (answers-mcp); `api.mcp.ai` with 1,115 listings (answers-mcp); `api.m2mcent.com` with 276 listings (not-mcp); `server.smithery.ai` with 216 listings (not-found).

We publish both so nobody has to wonder which one we would have picked.

## Locked is not broken

4,068 listed endpoints, 24%, answer with a 401 or a
403. They are running. They want a credential we do not have.

A checker that sends one request and treats "no result" as "dead" calls every
one of them broken. That is 4,068 endpoints it is wrong
about, and it is the single most common way to get this measurement wrong.

We record those as `auth-required`. Not as answering, because they did not, and
not as failing, because they did not do that either.

## What actually failed

| Outcome | Count |
|---|---|
| Unreachable: DNS, timeout, refused | 1,802 |
| Not found (404) | 1,041 |
| Answered with something that is not MCP | 680 |
| Answered, but the JSON-RPC body was an error | 340 |
| Server error (5xx) | 218 |
| Bad request (other 4xx) | 132 |

## What the answering servers expose

Of the 8,642 that answered, we followed with `tools/list`.
8,404 returned a usable list. 238 answered the
handshake and then returned nothing we could parse as a tool list, and we
record that rather than guess.

Across those 8,404 servers: **130,518 tools**, a median of
7 per server, and one server exposing 1,082.

## Three things we got wrong, in order

**The sample.** We first probed 400 servers and found 45.8% locked and 12.7%
failing. That was the first 400 entries in the registry's default order, which
is not a sample, it is the top of a list.

**The crawl.** So we ran it properly, or thought we did. Our harvester had a
page limit set to 400 pages. The registry is 930 pages. It stopped at
9,109 of 16,923 endpoints with the cursor still live, returned no error,
and we described the result as complete. It was 54% of the registry, and it
carried the same bias as the sample we had just retracted, three orders of
magnitude larger.

**The published figures.** On the strength of that we said 45% answer and 30%
are locked. The real numbers are 51% and 24%. We had also emailed
three companies those figures and had to write to all three.

Each of these is in here rather than quietly edited out. The failure rate is
the one number that barely moved between the truncated run and the complete
one, 24.9% both times, which is the only reason we noticed how little the
truncation had cost us on that particular row.

## What we did not do

We sent one `initialize` and, on success, one `tools/list`. We did not call a
tool. We did not authenticate. We did not retry a server that timed out, so
some of the 1,802 unreachable were probably briefly unlucky. We
did not probe package-only servers. A server that "answers a handshake" here
returned a valid `initialize` result. That is all it means.

## Check any of this yourself

```bash
curl -s -X POST https://<server>/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"you","version":"0"}}}'
```

The whole thing: `scripts/harvest_mcp.py` in the repo, and the dated result set
is `data/mcp-verified-v2.json`.
