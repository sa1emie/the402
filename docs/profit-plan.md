# Profit plan

Written 2026-09-05, the day the directory was found returning 500 to every
visitor. Supersedes the revenue ranking in `docs/30-day-revenue-plan.md`,
because the asset changed.

## What changed since August

In August the plan was to sell monitoring into the x402 operator market. That
market is worth roughly $650 a day in total and the plan was correctly ranked
as low probability.

The thing that changed is not the market. It is that the site accumulated real
traffic while nobody was looking, and traffic is a better asset than the probe
engine ever was.

**The audience is the product now.** People reading a directory of paid API
endpoints are people building agents that spend money. That audience is worth
considerably more to somebody else than $29 a month subscriptions are worth to
us.

## What we actually know, and what we do not

| Fact | Status |
|---|---|
| Site returned 500 on every route | Verified 2026-09-05 |
| 29.5M D1 rows read in 24h against a 5M limit | Verified via `wrangler d1 info` |
| 3,837 successful read queries in 24h | Verified |
| ~80,000 visits | **Unverified.** Cloudflare counts requests, including bots, crawlers and failed 500s |
| How many are humans | **Unknown. No analytics installed.** |

That last row gates everything below. A sponsor's first question is how many
real people, from where, on what pages. We cannot answer it today.

## Play 1: Sponsor slots, sold to companies already on the site

**The buyer.** Companies that are already listed in our own directory, are
funded, and sell to exactly this audience. From our dataset: Tavily, Exa,
Browserbase, Apify, Nansen, Firecrawl, Chainlink. Every one of them already
pays for developer marketing somewhere.

**The pitch.** They are already on the site. A sponsor slot puts them at the
top of a directory their customers browse, plus a field in the JSON API that
agent builders read directly.

**Price.** $250 a month to start, going to $500 once the analytics back it up.
Deliberately cheap enough to be a card swipe rather than a procurement cycle.

**Why it works.** The pitch is not "buy ads". It is "your endpoint is the
second most called thing on this network and people are finding it here".
That is a specific, checkable claim we can make from our own data.

**Why it fails.** If the 80k is mostly crawlers, there is no audience and the
pitch dies on the first honest question. This is why analytics comes first.

**Probability of first revenue in 30 days: 35%,** conditional on the traffic
being real. Zero if it is not.

## Play 2: Extend the directory to MCP servers

Traffic is the asset, so the job is more traffic, and MCP is where it is.

Measured 2026-08-16: the official registry alone lists ~37,000 servers, the
wider ecosystem about 100,000. 87% expose a remote HTTP endpoint our engine
can already probe. 12.7% fail outright and 45.8% are auth gated, which means a
naive checker is wrong about nearly half of them.

Nobody publishes a working directory of which MCP servers actually respond.
The searches people type, "is X MCP server working", "best MCP server for Y",
have no good answer today.

This is the growth engine that makes Play 1 worth five times more. It is also
the same code, pointed at a bigger list.

**Probability of meaningful traffic in 30 days: high. Of revenue by itself:
low.** It feeds Play 1 rather than earning directly.

## Play 3: Monitoring subscriptions

The August plan. Keep it, demote it. `docs/acquisition-experiment-01.md` has
20 verified targets and send-ready emails that were never sent. The cohort is
small and mostly unfunded. It costs two days and it is still worth running as
a cheap test of the opener, but it is no longer the main line.

**Probability of first revenue in 30 days: 20%.**

## The order of work

### This week: stop the bleeding, learn what we have

1. **Bring the site up.** Fix is deployed. Either enable Workers Paid at $5 a
   month or wait for the UTC reset. Site down is the only thing that makes
   every play below worth zero.
2. **Install Cloudflare Web Analytics.** Free, one script tag in `render.ts`.
   Without it there is no sponsorship pitch and no way to tell a bot from a
   buyer.
3. **Watch the D1 numbers for 48 hours.** Confirm rows read per day drops from
   29.5M to under 250k. If it does not, the caching did not do what I claim.
4. **Re-harvest.** The data is dated 2026-08-15 and decays about 5% a week, so
   it is roughly three weeks stale. A directory whose whole pitch is careful
   measurement cannot serve month-old verdicts.

### Next week: make the audience bigger and legible

5. **Point the probe at the MCP registry** and publish those listings
   alongside the x402 ones. The probe script exists.
6. **Publish the MCP measurement post.** Lead with the 45.8% auth-gated
   finding, because it is the number that makes a naive checker wrong.
7. **Read the analytics.** Real humans, top pages, referrers, countries.

### Week three: sell

8. **Email the seven named companies** with their own numbers: how many people
   viewed their listing, what the directory is, what a sponsor slot costs.
   That email cannot be written until step 7 produces real figures.
9. **Run the batch-01 emails** in parallel. They are already written and
   verified, and they cost two days.

## What decides this

**The analytics number, within seven days.** If real human sessions are in the
thousands per month, Play 1 is a genuine business and worth pushing hard. If
it turns out to be a few hundred humans and a lot of crawlers, then the traffic
was never the asset, and the honest move is back to Play 3 and MCP for reach.

Do not write a sponsorship email before that number exists. The whole position
of this project is not overstating, and "80,000 visits" to a sponsor when it is
really 4,000 humans is the exact kind of claim that ends it.

## Costs

| Item | Cost |
|---|---|
| Workers Paid | $5/month |
| Cloudflare Web Analytics | $0 |
| Domain, already paid | $12.20/year |

Total to run all of this: about $5 a month.
