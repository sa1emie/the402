# the402 go-to-market plan

Written 2026-08-15, against verified data from the same day.

## The one-line position

We called 14,352 of the 15,189 x402 endpoints Bazaar lists, and we say plainly
which ones we could not call and why. Not a claim about anyone else's method, a
statement about ours.

Not "another x402 directory". The directory is the artifact. The product is the
measurement.

## Why this works now

Eight directories already exist, including Coinbase's own Bazaar. Competing on
"we list x402 endpoints" is a lost race. But nobody publishes what the network
actually looks like when you probe it properly, and our own first attempt shows
why: a naive probe gets it badly wrong.

We have the receipts for that, because we made the mistake first and fixed it.

| Finding | Number |
|---|---|
| Listed on Bazaar | 15,189 across 1,553 hosts |
| Actually called | 14,352. The other 838 have templated paths |
| Answer with a payment challenge | 13,932 |
| **Only answer to POST, so a GET-only probe cannot see them** | **6,435 (46%)** |
| Wrongly called dead by our own naive probe, before the fix | **421** |
| Listed as payable but never charge | 31 |
| Advertise a payment option a caller cannot use | 713 |
| Live but need parameters before quoting | 116 |
| Cannot be probed without inventing a path value | 838 |
| Answer 402 but we cannot derive a price | 165 |

The headline is the 46%. A GET-only probe cannot see nearly half of all
payable endpoints. That is a checkable claim about a public network and anyone
can rerun it against our free validator.

What we must never say, in the post or anywhere else, is that a named
competitor probes with GET. We have not audited a single one of them. If one
already probes POST and we implied otherwise, the positioning dies in public
on the one post whose entire value is being careful.

## What we are careful not to claim

We parse the payment challenge. We do not complete a payment. So we never say
an endpoint "works", only that it "answers 402". The 838 unprobeable and 165
unpriced rows are stated on the site rather than hidden in a denominator.

This matters commercially, not just ethically. The fastest way to lose a
technical audience is one overstated number, and our whole pitch is that other
people's numbers are wrong.

## Audiences, in priority order

1. **Developers building x402 endpoints.** They want to know their endpoint is
   discoverable and correctly described. We know 421 have a shape that a naive
   GET-only probe misses, because our own probe missed them. We have not
   audited what any other directory currently reports about them, so we do not
   claim they are mislabelled elsewhere.
2. **Developers building agents that spend.** They want a machine-readable list
   of what is payable, at what price, on which network, callable with which
   method.
3. **The x402 and Base ecosystem accounts.** They amplify credible measurement
   of their own network.
4. **The other directories.** Competitors on the surface, but our verification
   data is something they lack. Feeding them is cheaper than fighting them.

## Assets to ship before launch

| Asset | Status | Why it matters |
|---|---|---|
| Directory with corrected data | Live | The artifact |
| Free validator anyone can curl | Live | The proof, and the shareable toy |
| Paid batch endpoint (x402-gated) | Not built | Makes the tutorial real, delivers Product A |
| README | Written | Required before anyone reads the repo |
| The measurement post | Written | The launch itself |
| Launch copy for five channels plus outreach | Written | What actually gets posted |
| Tutorial: build an x402-paid API on Workers | Not written | The SEO centerpiece |

**Launch is gated on nothing that is still unwritten.** The tutorial was
previously gated on the paid batch endpoint, which is gated on nothing being
built, which meant launch floated on an unbuilt milestone while the data decayed
roughly 5% a week. That was a circular dependency and it is now cut: the
measurement post ships on its own, and the tutorial follows whenever the paid
endpoint lands. A dated post describing a network that has moved on is a worse
outcome than a launch without a tutorial.

## Sequencing

**Phase 1, publish the measurement.** One post: "We called 14,352 x402
endpoints." Lead with the 46% POST finding, show the method, link the free
validator so readers can check any endpoint themselves, link the directory as
the full result. Include the part where our first probe was wrong and what it
cost. Admitting the error is what makes the rest believable.

**Phase 2, seed the channels.** In this order, spaced over about 48 hours so
each has time to breathe:

- **Show HN.** Best fit by far. HN rewards "I measured a thing and here is the
  method". Post midweek, early morning US time. Title states the finding, not
  the product.
- **X.** Thread of the findings, one number per post, ending with the tool.
  Tag nothing initially; let the x402 and Base accounts find it.
- **awesome-x402 PR.** Add the validator as a tool entry. Small, permanent,
  and it is the list our own harvest reads from.
- **Coinbase Developer Platform and Base Discords.** Share the measurement in
  whatever the dev channel is. Not a pitch, a finding.
- **Reddit.** r/ethdev and similar. Read each subreddit's self-promotion rule
  first. Skip any where it would be borderline. This channel is optional and
  the least valuable of the five.

**Phase 3, direct outreach.** The most underrated channel we have. We can
identify the specific operators whose endpoints are mislabelled elsewhere or
broken in a way we detected:

- 421 whose endpoints a naive GET-only probe misses, ours included until we
  fixed it. We know our own probe was wrong about them. We do not know what
  other directories say, and the outreach must not assert it
- 713 advertising a payment option that cannot be used
- 31 listed as paid that are serving for free, which may well be a bug costing
  them money

That last group is a genuinely useful email. It is not marketing, it is telling
someone their paywall is off. Every one of these is a warm introduction, and
several will link back or tell their own audience.

**Phase 4, the tutorial.** Publish once the paid batch endpoint is live so it
documents code we actually run and charge for. This is the asset that still
brings traffic in three months.

## Product Hunt

Worth a listing, not worth building around. Developer tools with no consumer
surface do modestly there. Schedule it for the week after the HN post so the
two do not compete, and use the same measurement framing.

## How this makes money

An external red team read an earlier draft and concluded there was no business
model, only a free tier. Correct at the time. A second pass found the fix was
still broken, because the free `/api/listings` gave away the paid product. Both
are addressed below, and the second one is the important part.

### The rule that makes any of this possible

**Free is a weekly public snapshot. Paid is daily.**

Without that line there is no business. Anything a paying customer would buy,
a directory can pull from `/api/listings` on a nightly cron for nothing. The
carve-out is not the dataset, which stays free and complete, it is the
**cadence, the history, and the alerting**. A one-off check tells you the state
today. Watching tells you the day it broke.

This also answers the hardest question about the outreach: why would a host who
already got a free email and a free validator ever pay? Because we handed them
today's answer, not tomorrow's.

### 1. The verified feed, licensed to directories

Eight directories exist and none completes a payment check. Our dated verdicts
are the thing they lack. Two or three named, reachable counterparties with
budget beats hundreds of cold hosts, for far less support burden.

$99 to $299 a month for daily diffs, verdict history, and coverage of endpoints
Bazaar does not list. The free weekly snapshot stays public.

This is also the red team's single condition for the project being worth doing:
a counterparty treating the measurement as infrastructure rather than content.
One signed customer here changes what this is, so it is line one, not line two.

### 2. Endpoint monitoring, sold to operators

We already call every endpoint on a schedule, so selling it is near zero
marginal cost, and the pain is demonstrable rather than hypothetical.

The pitch is one sentence: **your x402 endpoint can break in ways that return a
200 and look fine, and you will not notice.** We know, because 9 hosts are
giving their product away right now and 86 advertise an option no client can
use.

Priced by endpoint count, because that is the value gradient we actually
measured and a flat fee ignores it:

| Tier | Endpoints | Price |
|---|---|---|
| Small | up to 25 | $29/month |
| Standard | up to 100 | $99/month |
| Large | above 100 | quoted |

No annual discount until there is a second renewal. Discounting an unproven
product in week one is noise.

Anchor the price to the leak, not to comparable SaaS: an endpoint advertising
$0.02 a call that collected nothing last week lost more than a year of the
Small tier.

### 3. Settlement attestation

The one product the free tier can never cannibalize, because our own honesty
rule forbids it: we parse the challenge and never complete a payment, so free
can never confirm money actually lands.

Sell completed-payment attestation per endpoint as a one-off fee, and as a
"settles correctly" badge layer on the feed. This is precisely what the 9 hosts
still cannot know after they fix the bug we emailed them about, and it is what
agent builders actually want. It also gives the unspent $20 verification float
a job.

### 4. Paid batch validation

The x402-gated `POST /batch`, priced per URL in USDC. Smallest of the four. Its
real job is proof: it makes us a paying participant in the network we index and
gives the tutorial production code to document. Build it, do not count on it.

### The funnel, not a TAM table

An earlier draft multiplied a 269-host market by a guessed conversion rate.
That was decoration: the outreach only touches hosts where we can prove a
problem, and there are 95 of those, not 269. Real numbers we hold:

| Stage | Count | Source |
|---|---|---|
| Hosts with provable pain, emailable today | **95** | serving free, or advertising an unusable option |
| Hosts advertising over $1/day across their endpoints | **172** | sum of advertised prices, our own data |
| Hosts running 10 or more endpoints | 269 | surface area, not willingness to pay |

Track the funnel, not the ceiling: 95 emailed, how many reply, how many **fix
the issue within 7 days**, how many trial, how many pay. The fix rate is the
real qualifier. A host who will not act on free news that is costing them money
will never pay to hear it sooner.

### The honest risk

Every number above is a ceiling. Some of the 95 are hobby projects that will
never pay for anything. The plan is to find out cheaply, since the outreach
costs nothing.

## Metrics

Revenue is near zero at launch and that is expected. It is not acceptable
permanently, which is what the monetization section above addresses. Anyone
promising launch-week revenue is misreading a network doing roughly $28k/day
with about half of that wash.

What we actually track:

- Referring domains and inbound links, especially from the other directories
- Validator calls from clients that are not us
- Submissions through /submit, which now publish immediately
- Search position on "x402 directory", "x402 endpoints", "cloudflare x402"
- **Directory or ecosystem counterparties in active conversation about the feed.**
  This is the best revenue shot and it needs its own number
- **Hosts who fix the issue we reported within 7 days.** Not replies. Replies
  measure politeness, and an email that asks for nothing optimises for reply
  rate and against qualification. Acting on free news is the real signal

A realistic good outcome for week one: front page of HN for a few hours, 20 to
50 referring domains, a few hundred validator calls, and two or three operators
who fix something because we told them.

One criterion decides whether this is a business rather than a good post:
**one paying customer within thirty days**, from any of the four revenue lines.
Stated once, here, deliberately. An earlier draft also floated "if nobody
converts after thirty conversations", which is a second and different bar. That
one is withdrawn.

## Budget

Zero recommended. Search volume on x402 terms is tiny, so paid ads would buy
clicks that mostly do not exist. Current spend is a $12.20 domain. The $20
verification float stays unspent until the paid deep-verify milestone.

If traffic data later justifies an ad test, it gets its own proposal with
numbers. Not before.

## Risks

| Risk | Mitigation |
|---|---|
| One wrong number and the whole measurement pitch collapses | Every figure regenerated from the canonical file, dated on the site, and independently checkable via the free validator |
| Read as attacking the other directories | Frame as network measurement, not a competitor teardown. Never name a competitor as wrong; state our method and let readers compare |
| Cloudflare ships its own directory | Unchanged. We optimise for being the linked-to measurement, which survives them shipping a list |
| Providers annoyed at being called broken | Outreach is written as "here is what we observed, here is how to check it yourself", never as a verdict on their competence |
| Numbers stale within days | Bazaar grew 14,405 to 15,189 in five days. Ship a re-harvest cadence and put the date on every page before the post goes out |
| The tunnel on the same Cloudflare account | Resolved 2026-08-15. The worker was deleted and tun.the402.dev no longer resolves |

## The one thing that decides this

Whether the measurement post is honest enough to survive a hostile reader. It
should include our own error, the exact method, the numbers we could not
establish, and a link that lets anyone re-run a check in one command. If it
reads like marketing, it fails. If it reads like a lab notebook, it works.
