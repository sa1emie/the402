# How this makes money

Written 2026-09-06, the night the MCP directory went live. Supersedes the
ranking in `docs/profit-plan.md`, which was written before the MCP dataset
existed.

## What is actually in hand now

| Asset | State |
|---|---|
| x402 directory, 15,598 endpoints | Live, fresh as of 2026-09-05 |
| MCP directory, 9,109 servers | Live |
| **30,985 unique tool names across 3,965 servers** | In the database, not yet exposed |
| The measurement post | Live at `/posts/mcp-registry-measurement` |
| Three sponsor emails | Sent 2026-09-06 to Exa, Firecrawl, Nansen |
| Real visitor analytics | Collecting since 2026-09-06, not yet readable |

The last row gates most of what follows, and there is no way around waiting
for it.

## The honest problem

There is more inventory than distribution. Two datasets nobody else has, a
working directory, a novel measurement, and close to zero people who know it
exists. A search for the site returns nothing; the known directories are
x402scan, x402-list, Agentic.Market and Pay.sh, and we are not among them.

So the ranking below puts traffic first, not because traffic is the goal but
because every revenue line here is priced on it.

## Line 1: the tool index. Traffic, then sponsorship.

**This is the thing we have that nobody else does.** We hold 30,985 unique
tool names across 3,965 servers, with the server, its verdict, and the date we
checked. The registries list servers. None of them lists what those servers
can actually do, because none of them called the servers to find out.

The searches this answers are real and specific: which MCP server has a tool
for reading a Postgres schema, for posting to Slack, for pulling SEC filings.
Today those questions have no good answer anywhere.

**Build:** a `/tools` index and a page per tool concept, generated from the
data we already have. Every page is a real answer to a real query and links to
the servers that expose it.

**Why it earns:** 30,985 tool names is 30,985 long-tail search targets, and
they compound. This is the only line here that makes the site findable rather
than merely correct.

**Cost:** a day, and it reuses the MCP render module.

**Reason it fails:** the pages could read as thin generated filler and get
ignored by search. The fix is that each one carries a checked verdict and a
date, which is content nobody else can generate.

## Line 2: sponsor slots

Three emails are out. The pitch is that their server is listed and verified on
a directory their customers browse.

**Price:** $250 a month, rising to $500 once the analytics support it.

**Blocked on:** the visitor number. Do not send another sponsor email until it
exists. Pitching 80,000 visits when it turns out to be 4,000 humans and a lot
of Googlebot ends the only advantage this project has.

**Reason it fails:** if the traffic is mostly crawlers there is nothing to
sell, and the answer is Line 1 for six weeks before trying again.

## Line 3: the dataset and the diff feed

Two datasets, dated, with a method anyone can rerun. The point is not the
snapshot, which is copyable, it is the history and the cadence, which is not.

**Buyers:** registries and gateways that sell enterprise trust they cannot
currently prove. Composio raised $25M, Manufact $6.3M.

**Price:** $99 to $299 a month for a daily diff, or a one-off for the current
set.

**Reason it fails:** they build it themselves. It is a sprint of work for a
funded team, and the post explains the method.

## Line 4: affiliate links, with a condition

Firecrawl pays 25% recurring. Nansen pays up to 47.5%. Both are already
listed. Signing up is same-day revenue that needs nobody's approval.

**The condition, and it is not negotiable.** This is a directory whose whole
value is that its verdicts are mechanical and unbought. So: the link is
labelled an affiliate link in plain words on the listing, and it changes
nothing about the verdict, the ranking, or the placement. The probe does not
know the link exists.

If either condition feels uncomfortable, skip the line. The honesty position
is worth more than a referral fee.

## Line 5: monitoring, still last

The August plan. `docs/acquisition-experiment-01.md` holds 20 targets. Half
turned out to be fixed or delisted when re-probed on 2026-09-06, which is the
argument for the product and against this particular cohort at the same time.

Keep it as a cheap test of the opener. It is not the business.

## Order

1. Post the measurement on Hacker News, Tuesday morning US eastern. Details in
   `docs/hn-submission.md`.
2. Build the tool index while that runs.
3. Read the analytics after 48 hours.
4. If the traffic is real, price sponsorship against it and send the rest of
   the emails. If it is not, Line 1 for six weeks and try again.
5. Reply to whatever Exa, Firecrawl or Nansen send back.

## The number that decides everything

Real human sessions per week, from Cloudflare Web Analytics.

Under 500: there is no audience yet and only Line 1 matters.
500 to 5,000: sponsorship is real at $250, and the tool index is the growth.
Over 5,000: sponsorship is worth $500 to $1,000 and this is a business.

Nobody knows which of those is true today, including me.
