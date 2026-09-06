# Where to point the engine, and what to do for 30 days

Written 2026-08-15. Every number below was regenerated from live sources on
that date. Commands are included so any of it can be rechecked.

## The short version

x402 is not a market. Our own data says so, and the number is not close.

The engine is worth keeping. It transfers to MCP servers almost unchanged,
where there are roughly 100,000 listings instead of 15,000 endpoints, and
where the buyers have raised money.

The plan below sells verification to MCP registries and gateway companies,
uses a public measurement as the door opener, and keeps the402 launch as a
cheap credibility asset rather than the business.

## What killed x402, with the arithmetic

The handoff says the network moves about $14,000 a day. Our own dataset does
not support that.

Advertised price times observed 30 day calls, across every listed endpoint:

| Filter | Implied 30d | Per day |
|---|---|---|
| No filter | $2,019,540 | $67,318 |
| Excluding endpoints priced over $1,000 per call | $19,540 | $651 |
| Excluding endpoints priced over $100 per call | $8,900 | $297 |
| Excluding endpoints priced over $1 per call | $5,339 | $178 |

The unfiltered number is one row: `claudelines.com/api/download`, priced at
$1,000,000 per call, with 2 calls in 30 days. Second is
`api.bitrefill.com/x402/invoice/pay` at $1,000 per call with 10 calls.

The largest genuinely commercial participant is Tavily. Its x402 search
endpoint took 27,116 calls at $0.01, which is $271 over 30 days. Nine dollars
a day.

```bash
python3 -c "
import json
d=json.load(open('data/verified-full-v2.json'))
rows=[((r.get('quality') or {}).get('l30DaysTotalCalls') or 0)*r['priceUsd']
      for r in d if r.get('priceUsd') is not None and r['priceUsd']<=100]
print(sum(rows)/30)"
```

Concentration makes it worse, not better. 24 hosts account for 80% of all
calls. The median endpoint received 1 call in 30 days. Only 287 endpoints of
15,188 took 100 calls or more.

**Honest caveat.** This is advertised price times observed calls on
Bazaar listed endpoints. A call is not proof of a completed payment, and
volume may exist that Bazaar does not list. The direction is still not in
doubt: the visible commercial participants are doing single digit dollars a
day.

### The outreach funnel was also thinner than we thought

The GTM plan counts 713 endpoints advertising a payment option a caller
cannot use, and treats that as a lead pool. 682 of those 713 belong to one
company, The Aslan Group LLC, across 721 endpoints, all failing the same way:
`accepts[].amount` sent as `"0.01"` instead of an integer string in atomic
units.

So the pool is one substantial operator plus a short tail. It is not 95
prospects. It is closer to 10.

But the short tail is the good part, and the first pass missed it. Among the
31 non-Aslan defects sits a funded company:

```
https://x402.tavily.com/search
  27,116 calls, 422 unique payers in 30 days
  usableOptions 1 of 2
  errors: accepts[1].amount must be an integer string in atomic units,
          got "0.016"
```

Tavily advertises two payment options on its x402 endpoint and one of them is
malformed. The endpoint still works through the other option, so the honest
statement is "one of your two advertised payment options cannot be used", not
"your endpoint is broken". Same defect appears on
`api.aidress.ai/pay/agent_x402_tavily_com`.

That is a provable, current, money-adjacent defect at a real company with a
public contact page, found in data we already hold. It is the single best
outreach lead in the project, and it costs one email.

## What transfers, tested rather than assumed

The probe engine speaks HTTP and classifies what comes back. That is not
specific to 402.

Sampling 1,200 servers from the official MCP registry:

| Shape | Count | Share |
|---|---|---|
| Exposes a remote HTTP endpoint | 1,049 | 87% |
| Package or stdio only, not probeable | 138 | 11.5% |

Transports are 1,050 `streamable-http` and 21 `sse`.

Then I probed 400 of those remote servers with a real MCP `initialize`
handshake, one request each:

| Verdict | Count | Share |
|---|---|---|
| Answered a valid MCP handshake | 166 | 41.5% |
| Requires auth, so not judgeable from outside | 183 | 45.8% |
| Unreachable | 17 | 4.2% |
| Server error | 12 | 3.0% |
| Answered, but not MCP | 7 | 1.8% |
| Not found | 5 | 1.2% |
| Redirects, 405, 400, JSON-RPC error | 10 | 2.5% |

**12.7% of listed remote MCP servers fail outright.** And 45.8% are auth
gated, which is the important part: a naive prober calls those dead and is
wrong about nearly half the registry. That is the same shape as the 46% POST
finding on x402, on a population roughly seven times larger, and it is a
claim anyone can recheck.

Script: `scripts/probe_mcp.py` (currently in the session scratchpad, moves
into the repo on day 1).

## Why MCP has buyers and x402 does not

Registries and gateways in this space have raised money and sell to
enterprises on a promise they cannot currently prove, which is that the
servers they list work and are safe.

| Company | Signal |
|---|---|
| Composio | Raised $25M |
| Manufact | $6.3M seed, Peak XV, YC |
| Klavis AI | ~$500k raised |
| Glama, Smithery, PulseMCP, mcp.so | Large registries, index without verifying |

Counted listings: MCP Toplist covers 100,958 servers across the official
registry, Glama, Smithery, mcp.so and PulseMCP as of 2026-08-10. Glama alone
tracks about 37,000, PulseMCP 11,840.

One negative result worth having before anyone builds: **MCP security
scanning is already crowded and free.** mcp-audit is Apache-2.0 with no paid
tier. MCP Security Scanner is free with no signup and 35+ checks. Do not sell
security scanning. Sell reliability measurement over time, which nobody
publishes.

## The correction that changed this plan

I wrote a first version of this that sold a monitoring feed to MCP registries
via calls and a pitch. Kimi, running independently in the repo, argued for a
different motion and it is better on friction:

**Do not sell a feed. Send a defect and a payment link.**

The email leads with a bug in the recipient's own system, states it plainly,
asks for nothing, and includes a $99 a month Stripe link at the bottom for
continuous watching. No call required to buy. At $99 a funded company does
not convene anyone to approve it.

That motion is right, and it is market independent. So the plan below runs it
twice: at x402 in week one, because the defect data already exists today, and
at MCP from week two, because that is where the volume and the funded buyers
are and the probe needs a few days.

Kimi also caught that the published numbers have drifted from the canonical
file. It says 6,436 POST-only, 271 not-x402, 166 unpriced. The docs say 6,435,
272, 165. Small, but the launch post is built on those figures and the whole
position is being careful, so they get regenerated before anything ships.

One more thing worth stating: `l30DaysTotalCalls` and `l30DaysUniquePayers`
are Coinbase's public telemetry, passed straight through by
`scripts/harvest.py`. The demand data is not ours. What is ours is the join
of that demand against our own verdicts, which is what makes a defect email
land.

## The plays, ranked by probability of first revenue

### 0. The defect email to funded operators, week one

**Buyer.** Engineering or developer relations at the funded companies already
in our dataset, starting with Tavily. Then Exa, Nansen, Browserbase, Apify,
Arkham, Bitrefill, Chainlink. All have public contact pages.

**What they already pay for.** Uptime and API monitoring, Datadog, Checkly,
BetterStack, at $50 to $500 a month. That spend is proven. The wedge is that
none of those tools parse a payment challenge. A standard monitor sees a 402
and reports "up". It cannot see that an advertised payment option is
unpayable, or that a paid endpoint is serving for free.

**Price.** $99 a month, one Stripe link, no tiers, no call needed.

**Reused.** The probe engine and the fact that we already call their
endpoints daily. **Built after the first yes, not before:** a cron that
re-probes a customer's endpoints and emails on verdict change.

**Strongest reason it fails.** The economics are the same ones that killed
the market. Tavily loses a trivial amount of theoretical revenue to that
broken option. They fix it in an hour, thank us, and decline. The counter is
that their entire x402 experiment reports bad numbers until it is fixed, and
$99 is below the threshold where anyone thinks hard.

**Probability of first revenue in 30 days: 20%.** Basis: roughly 28 highly
targeted sends whose first line is a provable defect in the recipient's own
system. Cold outbound converts 1 to 5% to a paid pilot and a defect email is
warmer than cold.

### 1. Verification feed sold to MCP registries and gateways

**Buyer.** The founder of a registry or gateway company. Named targets:
Composio, Manufact, Klavis, Smithery, Glama, PulseMCP, MintMCP, TrueFoundry.
Small teams, founders reachable, decisions made in one call.

**What they pay for.** A daily verified status feed across their catalogue:
which servers answer, which are auth gated, which broke today, with dated
history. They ship "verified" badges and enterprise trust claims off it.

**Price.** $500 to $2,000 a month. Anchor to the fact that a dead listing in
an enterprise pitch is worse than no listing.

**Reused.** Probe engine, harvest pipeline, D1 storage, directory, the
honesty position, and the whole "we say what we cannot determine" discipline
which is exactly what an enterprise buyer needs.

**Built.** An MCP probe worker, the auth-gated classification, and a diff
feed. Days, not weeks.

**Strongest reason it fails.** They build it themselves. It is a sprint of
work for a funded team, and the measurement post teaches them how.

**Probability of first revenue in 30 days: 25%.** Based on a reachable named
list of about 10 founders, a concrete artifact to lead with, and a price low
enough to not need procurement.

### 2. Paid reliability audit, one off

**Buyer.** The same list, plus any company whose official MCP server is in
the broken 12.7%.

**What they pay for.** A one time report: we probed your catalogue or your
server, here is what fails, here is the method, here is the raw log.

**Price.** $500 to $1,500.

**Strongest reason it fails.** A one off report does not recur, and free
scanners set the price expectation at zero. Mitigated by selling measurement
over time rather than a scan.

**Probability of first revenue in 30 days: 30%.** Higher than the feed
because the ask is smaller and it needs no procurement, lower in value.

### 3. The Aslan Group, this week

**Buyer.** The Aslan Group LLC. A US registered entity, trading since 2001,
70+ platforms, contact `info@theaslangroupllc.com` and a contact form.

**Why now.** 721 endpoints, 682 with the same defect, and they almost
certainly do not know. That is a genuinely useful email that asks for
nothing.

**What they might pay for.** Monitoring across 721 endpoints. This is the
"Large tier, quoted" customer the GTM plan imagined, and they are the only
real instance of it.

**Strongest reason it fails.** They fix it in an hour for free and never
reply again. Their whole catalogue may also be a low value content play, in
which case there is no budget.

**Probability of first revenue in 30 days: 10%.** One prospect is one
prospect. Send it anyway, it costs one email.

### 4. the402 launch as it stands

Keep it, but demote it. It costs about a day to rate limit and ship, and it
buys a public artifact and a reason to be in people's inboxes. As a business
it is capped by a $650 a day network.

**Probability of first revenue in 30 days: 5%.**

## The comparison you should make consciously

You have an unlaunched services business at `~/Desktop/work/Claude`:
Clinic Receptions, a $1,497 setup plus $297 a month, aimed at DFW
chiropractors, with a live site at clinicreceptions.com and cold email
written but not sent. Blockers are SPF, DKIM, DMARC and a CAN-SPAM address.

For first paying customer inside 30 days, a local services offer with a known
buyer, a set price, and a written sequence is a higher probability play than
any developer tools sale here. Probably 40% to 50% against the 25% to 30%
above.

It reuses none of this engine. That is the trade. I am flagging it because
you said you were open to a full pivot and it would be dishonest to rank
these plays without naming the one already sitting at 80% built. Your call,
not mine.

## The 30 days

### Days 1 to 3, unblock and prove

1. **Set up payment rails.** Stripe account with a $99 a month product and a
   shareable payment link, plus a USDC receiving address. Nothing on this
   list converts without it. Half a day, and it is the real bottleneck.
2. **Rate limit `/submit` and `/validate`.** Two external reviews flagged it,
   and the launch points Hacker News at an unauthenticated endpoint that
   makes outbound requests. About an hour. Do not promote anything first.
3. **Re-probe the defect cohort live**, today's data, not August 15's. A
   defect email is worthless if they fixed it last week. Verify Tavily,
   aidress, the nine free-serving hosts and the Aslan sample all still fail
   before writing a word.
4. **Send the first defect emails.** Tavily first, then any of the funded
   operators still failing. One email each, the defect stated plainly, the
   method shown, a link to recheck it themselves, and the $99 link at the
   bottom. This can happen on day 2. It is the earliest possible revenue
   event in the whole plan.
5. **Move `probe_mcp.py` into the repo** and extend it: `tools/list` after
   handshake, auth detection, retry, and a verdict schema matching the x402
   one.

### Days 4 to 7, run the full measurement

4. **Probe the full official registry**, then Glama and Smithery catalogues.
   Target 10,000 servers minimum. Record dated verdicts in D1 alongside the
   x402 rows.
5. **Rerun after 72 hours** to produce the first diff. The diff is the
   product. A one time scan is a blog post, a diff is a subscription.

### Days 8 to 11, publish and open doors

6. **Write the MCP measurement post.** Same discipline as the x402 one: state
   the method, publish the auth gated share prominently so nobody can accuse
   us of calling gated servers dead, include what we could not determine, and
   link a free single server checker.
7. **Ship the402 launch in the same window.** Show HN, the x402 measurement,
   the awesome-x402 PR. It is a day of work and it is credibility.
8. **Send the Aslan email.** One email, no ask.

### Days 12 to 20, sell

9. **Ten named founders, personally.** For each, run their own catalogue
   through the prober first and lead with their numbers, not ours. The email
   is "here is what we found in your listings" and nothing else.
10. **Get on calls.** You said you would. This is the step that decides the
    month.
11. **Price on the call.** $500 to $2,000 a month for the feed, $500 to
    $1,500 for a one off audit. Do not build a pricing page yet.

### Days 21 to 30, convert

12. **Run a paid pilot for anyone who says maybe.** One month, real invoice,
    real number, even if it is $250. First revenue is a fact, not a size.
13. **Ship the diff feed** as an authenticated endpoint for whoever signs.
14. **Decide on 30 September** whether any of this converted. If nothing did,
    the honest read is that developer tools selling is slower than a local
    services offer, and Clinic Receptions gets the next 30 days.

## What would change this plan

- If probing the full registry shows the broken share is well under 10%, the
  finding is not interesting enough to open doors and play 1 weakens badly.
- If two or more registries reply saying they already verify, stop. The
  moment they are already doing it, this is a feature, not a product.
- If Stripe or USDC setup takes more than a day, that is the real bottleneck
  and everything else waits.

## Rules that carry over

Nothing changes about how we talk. An MCP server "answered a handshake", it
does not "work". An auth gated server is not broken and must never be counted
as such. We never claim anything about how another registry verifies, because
we have not audited one.
