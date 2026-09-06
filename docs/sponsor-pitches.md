# Partner pitches: Exa and Firecrawl

Drafted 2026-09-05 from `docs/devrel-sponsor-research.md` and live probes run
the same evening. Both companies run open MCP endpoints that answer a
handshake, and both run programs that already pay or co-market with developer
content. Zero of the seven researched companies publish a rate card, so the
ask in both emails is a call, not a price. Salem closes on the call.

Percentages below were generated from `data/mcp-verified-v1.json` on
2026-09-05 (9,109 remote servers probed): 44.8% answer, 30.3% gated,
24.9% fail. Re-probe both endpoints the morning of sending.

## The registry numbers, stated two ways

Both are true. They answer different questions, and a hostile reader will
check whether we picked the flattering one, so show both.

| | Listings (n=9,109) | Unique hosts (n=7,377) |
|---|---|---|
| Answer an MCP handshake | 44.8% | 49.5% |
| Gated behind 401 or 403 | 30.3% | 32.9% |
| Fail outright | 24.9% | 17.6% |

The gap on the failing row is three hosts: `api.m2mcent.com` with 276 dead
listings, a `trycloudflare.com` tunnel with 90, and `server.smithery.ai`
proxies with 189. Registered once each, the failure rate is 17.6%.

**Four of the six target companies with live MCP servers are not in the
official registry.** Firecrawl, Tavily, Browserbase and Nansen all answer a
handshake and none of them appear there. Only Exa and Apify are listed. That
is a stronger opener than "you are listed": their server is live, the registry
does not know, and we found it anyway.

Live results, 2026-09-05:

| Company | Endpoint | Result | Tools | Server name |
|---|---|---|---|---|
| Exa | `mcp.exa.ai/mcp` | answers an MCP handshake | 2 | `exa-search-server` |
| Firecrawl | `mcp.firecrawl.dev/mcp` | answers an MCP handshake | 3 | `firecrawl-fastmcp` |
| Firecrawl | `mcp.firecrawl.dev` (bare host) | answers, but not MCP | | |

That last row is a small, useful thing to tell Firecrawl: a client pointed at
the bare hostname gets a non-MCP response. The `/mcp` path is fine.

---

## Exa

To: partnerships@exa.ai
Subject: mcp.exa.ai answers with 2 tools, and it is in a registry measurement we are publishing

Hi,

I run the402.dev, a directory that calls every endpoint it lists and records
what came back, rather than trusting the listing.

This week I pointed it at the MCP registry. Of the roughly 37,000 servers
listed, 9,109 expose a remote endpoint. I sent each one a real `initialize`
handshake.

Yours answered. `mcp.exa.ai/mcp` identifies as `exa-search-server` and
returns 2 tools on `tools/list`. No auth wall, clean handshake. I mention it
because 45% of the registry does not, and 30% sits behind
a 401 or 403, which a naive checker calls dead.

I am publishing the full measurement next week, and the directory of results
with it. Your partner page names newsletters and communities as things you
co-market with, which is what this is: a community of people building agents,
looking up which servers actually respond.

I would like 20 minutes to talk about what featuring a verified partner looks
like on the directory and in the post. If there is a better person than the
partnerships inbox, I am happy to be pointed at them.

You can check any of the above yourself; the validator is free and prints
every request it makes:

curl -s "https://api.the402.dev/validate?url=https://mcp.exa.ai/mcp"

Salem
the402.dev

---

## Firecrawl

To: help@firecrawl.com
Subject: mcp.firecrawl.dev/mcp answers with 3 tools, and it is not in the official MCP registry

Hi,

I run the402.dev, a directory that calls every endpoint it lists and records
what came back. This week I ran it across the official MCP registry: 9,109
remote servers, one real `initialize` handshake each.

Your server is not in it. `mcp.firecrawl.dev/mcp` answers cleanly, identifies
as `firecrawl-fastmcp`, and returns 3 tools, but the official registry has no
entry for it. I only found it because I went looking. You may have chosen
that, and if so ignore this paragraph, but a lot of agent tooling now
discovers servers through that registry first.

One small thing you may already know: the bare host,
`mcp.firecrawl.dev` without `/mcp`, answers 200 but not with MCP. A client
that takes the hostname from a listing and does not append the path gets
something it cannot parse. Not broken, just worth a redirect if you see
clients doing that.

I am publishing the full measurement next week: 45% of listed
remote servers answer, 30% are gated, 25% fail outright, and by unique host
the failure rate is 18%.
The directory of results goes live with it.

You already pay creators through the Ambassadors program and the affiliate
program, so you have a working process for this. I would like 20 minutes with
whoever runs that, Eric if the about page is current, to talk about featuring
Firecrawl as a verified server in the directory and the post.

Check it yourself, the validator is free:

curl -s "https://api.the402.dev/validate?url=https://mcp.firecrawl.dev/mcp"

Salem
the402.dev

---

## A revenue line that needs no pitch, and the catch

Two of the seven already run self-serve programs that pay:

| Company | Program | Pays |
|---|---|---|
| Firecrawl | affiliate | 25% recurring on referred customers |
| Nansen | affiliate | up to 47.5% commission |

Signing up and adding a referral link to those two listings is a revenue line
that starts the same day and needs nobody's approval.

**The catch, and it is a real one.** This is a directory whose entire value is
that its verdicts are mechanical and nobody paid for them. An affiliate link
on a listing invites a reader to wonder whether the verdict was bought. Two
conditions if this is done at all:

1. The link is labelled as an affiliate link, on the listing, in plain words.
2. It changes nothing about the verdict, the ranking, or the placement. The
   verdict comes from the probe and the probe does not know the link exists.

If either condition is uncomfortable, do not do it. The honesty position is
worth more than 25% of a referral.

---

## Sequence

1. Harvest finishes. Fill the three placeholders from
   `data/mcp-verified-v1.json` with a command, not from memory.
2. Re-probe both endpoints the morning of sending, so the tool counts in the
   email are true that day.
3. Send Exa first. It is the better structural fit.
4. Send Firecrawl the same day.
5. No follow-up for seven days. One follow-up after that, then stop.
