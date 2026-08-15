# the402 go-to-market plan

Written 2026-08-15, against verified data from the same day.

## The one-line position

We called all 15,189 x402 endpoints. Most tools guess. We checked, and we say
plainly what we could not check.

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
| Endpoints called | 15,189 across 1,553 hosts |
| Answer with a payment challenge | 13,932 |
| **Only answer to POST, invisible to a GET-only probe** | **6,435 (46%)** |
| Wrongly called dead by our own naive probe, before the fix | **421** |
| Listed as payable but never charge | 31 |
| Advertise a payment option a caller cannot use | 713 |
| Live but need parameters before quoting | 116 |
| Cannot be probed without inventing a path value | 838 |
| Answer 402 but we cannot derive a price | 165 |

The headline is the 46%. Every directory that probes with GET is blind to nearly half of all payable endpoints. That is a checkable claim about a public network, and
anyone can rerun it against our free validator.

## What we are careful not to claim

We parse the payment challenge. We do not complete a payment. So we never say
an endpoint "works", only that it "answers 402". The 838 unprobeable and 165
unpriced rows are stated on the site rather than hidden in a denominator.

This matters commercially, not just ethically. The fastest way to lose a
technical audience is one overstated number, and our whole pitch is that other
people's numbers are wrong.

## Audiences, in priority order

1. **Developers building x402 endpoints.** They want to know their endpoint is
   discoverable and correctly described. We have 421 of them currently
   mislabelled elsewhere.
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
| README | Not written | Required before anyone reads the repo |
| Tutorial: build an x402-paid API on Workers | Not written | The SEO centerpiece |
| The measurement post | Not written | The launch itself |

Launch is gated on the last three. The measurement post is the launch; the
tutorial is what keeps ranking after the spike.

## Sequencing

**Phase 1, publish the measurement.** One post: "We called all 15,189 x402
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

- 421 whose endpoints other probes call dead
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

## Metrics

Revenue is not the metric and will be near zero. Anyone promising otherwise is
misreading a network doing roughly $28k/day, about half of it wash.

What we actually track:

- Referring domains and inbound links, especially from the other directories
- Validator calls from clients that are not us
- Submissions through /submit, which now publish immediately
- Search position on "x402 directory", "x402 endpoints", "cloudflare x402"
- Replies from the outreach in phase 3

A realistic good outcome for week one: front page of HN for a few hours, 20 to
50 referring domains, a few hundred validator calls, and two or three operators
who fix something because we told them.

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
