# Acquisition experiment 01: defect-led outreach

Written 2026-08-16. Every target below was re-verified live through
`api.the402.dev/validate` on that date, not read from the August 15 dataset.

## What this experiment tests

**Hypothesis.** An email that opens with a specific, checkable defect in the
recipient's own service earns a reply at a rate cold outreach does not, and
some fraction of those replies convert to paid monitoring.

That is the only thing being tested. It is deliberately not a test of whether
x402 is a good market, because it is not. The cohort here is small and mostly
unfunded. What carries forward if the hypothesis holds is the **motion**,
which then points at MCP where there are roughly 100,000 listings and buyers
who have raised money.

**Read this before sending anything.** The 713 "unusable payment option"
defects are excluded from this experiment. Our validator flags a decimal
amount as an error without checking the payment scheme first
(`api/src/x402.ts:231`). For `agent-pay` on `aws:base` with asset
`iso4217:USD`, which is Amazon Bedrock AgentCore Payments, a decimal amount is
correct. Same for XRPL IOUs. Those errors are most likely ours. Tavily is not
a target and must not be emailed until that is fixed.

Only two defect classes are used here, because only these two are unambiguous:

| Class | Meaning | Why it is safe to claim |
|---|---|---|
| `free` | Listed as paid, returned content without payment | We received the content. No interpretation needed. |
| `not-x402` | Listed on Bazaar as x402, does not answer 402 | The listing and the endpoint disagree. Checkable in one curl. |

## The 20 targets

Re-verified 2026-08-16. "Bad eps" is the number of that host's endpoints
showing the defect.

| # | Host | Defect | 30d calls | Payers | Bad eps | Contact |
|---|---|---|---|---|---|---|
| 1 | `api.delx.ai` | serving paid content free | 984 | 792 | 2 | support@delx.ai |
| 2 | `agents.ai-rook.com` | serving paid content free | 287 | 23 | 5 | none found |
| 3 | `api.surplusintelligence.ai` | listed x402, no 402 | 210 | 5 | 1 | support@surplusintelligence.ai |
| 4 | `omniterminal.app` | listed x402, no 402 | 125 | 39 | 1 | none found |
| 5 | `ai.stable-jack.com` | listed x402, no 402 | 121 | 78 | 68 | none found |
| 6 | `brdata.thomenz.me` | listed x402, no 402 | 42 | 14 | 4 | github.com/thomenz |
| 7 | `sqlguard.io` | listed x402, no 402 | 38 | 23 | 1 | hello@sqlguard.io |
| 8 | `vietnam-holiday-api.kdlcfa.workers.dev` | listed x402, no 402 | 37 | 13 | 1 | none found |
| 9 | `soldefi.thomenz.me` | listed x402, no 402 | 28 | 14 | 5 | github.com/thomenz |
| 10 | `afriref.dev` | listed x402, no 402 | 25 | 11 | 1 | api@3l-groupconsulting.co.za |
| 11 | `diem-agent-workers.vercel.app` | listed x402, no 402 | 24 | 22 | 6 | none found |
| 12 | `api.clervo.dev` | listed x402, no 402 | 20 | 14 | 1 | none found |
| 13 | `deepai.pay.zeroclick.io` | listed x402, no 402 | 20 | 8 | 2 | team@deepai.com |
| 14 | `brmarket.thomenz.me` | listed x402, no 402 | 17 | 5 | 2 | github.com/thomenz |
| 15 | `api.lmxcloud.io` | listed x402, no 402 | 16 | 1 | 1 | support@lmxcloud.io |
| 16 | `hivemindos-paid-agent-gateway...workers.dev` | listed x402, no 402 | 13 | 8 | 5 | none usable |
| 17 | `srv1334799.hstgr.cloud` | listed x402, no 402 | 12 | 8 | 5 | x.com/ConorChepenik |
| 18 | `evidence.regulavita.com` | listed x402, no 402 | 12 | 11 | 1 | none found |
| 19 | `ba-x402-requirements-agent.onrender.com` | listed x402, no 402 | 9 | 1 | 1 | none found |
| 20 | `focxle.com` | serving paid content free | 8 | 5 | 4 | hello@focxle.com |

Targets 6, 9 and 14 are one operator (`thomenz`). Treat them as a single send
covering all three services.

**14 of 20 are reachable today. 6 have no contact.** For those, the fallback
is a GitHub code search for the endpoint domain, then an issue on the repo
that ships it. Do not spend more than five minutes each.

### Evidence, one URL per target

Each of these was confirmed failing on 2026-08-16 and is re-checkable by the
recipient in one command.

```
 1 https://api.delx.ai/api/v1/premium/controller-brief
 2 https://agents.ai-rook.com/api/ip-lookup
 3 https://api.surplusintelligence.ai/v1/chat/completions
 4 https://omniterminal.app/api/x402/v1/symbols/resolve
 5 https://ai.stable-jack.com/x402/tools/fundamental_pair_research_packet
 6 https://brdata.thomenz.me/boleto/decode
 7 https://sqlguard.io/v1/probe
 8 https://vietnam-holiday-api.kdlcfa.workers.dev/
 9 https://soldefi.thomenz.me/v1/solana/swap/build
10 https://afriref.dev/v1/vat/determine
11 https://diem-agent-workers.vercel.app/v1/jobs/transcribe-audio
12 https://api.clervo.dev/v1/ai/execute
13 https://deepai.pay.zeroclick.io/api/text2img
14 https://brmarket.thomenz.me/v1/search/image
15 https://api.lmxcloud.io/v1/chat/completions
16 https://hivemindos-paid-agent-gateway.hivemindos.workers.dev/api/x402/wallet-risk/runs
17 https://srv1334799.hstgr.cloud/v1/compare
18 https://evidence.regulavita.com/v1/sec/filing-trigger-delta
19 https://ba-x402-requirements-agent.onrender.com/api/v1/requirements/check
20 https://focxle.com/api/v1/x402/resource/agent-trust-check
```

The single best target is number 1. `api.delx.ai` runs 770 endpoints, took 984
calls from 792 unique payers in 30 days, and two of its endpoints are handing
over paid content for nothing. That is a real amount of money walking out of a
real service.

## The offer

Two tiers, one Stripe payment link each, no call required to buy.

| Tier | Endpoints watched | Price |
|---|---|---|
| Watch | up to 25 | $29 a month |
| Watch+ | up to 250 | $99 a month |

What the money buys: we call every one of your endpoints daily, and email you
the day a verdict changes. Paid endpoint starts serving free, endpoint stops
answering 402, price changes, endpoint disappears.

Why it is not covered by what they already run: an uptime monitor sees a 402
and reports the service as up. It cannot tell that a paid endpoint has quietly
started giving its product away, because that returns a 200.

Do not build the cron until somebody pays. The daily probe already runs. The
only new work is a diff and an email, and it is a day.

## The sequence

Two emails. There is no third, ever.

### Email 1, day 0. No ask.

Subject for the `free` class: `your x402 endpoint is serving without charging`
Subject for the `not-x402` class: `your Bazaar listing points at an endpoint that does not answer 402`

> Hi,
>
> I run the402.dev, a directory that calls every x402 endpoint listed on
> Bazaar and records what came back. Yours came back in a way I think you
> would want to know about.
>
> On 16 August, `https://api.delx.ai/api/v1/premium/controller-brief` returned
> content without asking for payment. It is listed as paid. Two of your
> endpoints do this.
>
> You can check it yourself:
>
>     curl -s "https://api.the402.dev/validate?url=https://api.delx.ai/api/v1/premium/controller-brief"
>
> That is a free endpoint, no key, and it prints every request it made so you
> can see how I got there.
>
> I am not selling you anything in this email. Your paywall looks like it is
> off and 792 people called you last month.
>
> Salem

Rules for email 1: state the date, name one endpoint, give the recheck
command, and ask for nothing. If it reads like a pitch it fails. Say "answers
402", never "works".

### Email 2, day 4. Only to people who did not reply.

> Hi,
>
> Following up once on the endpoint I mentioned on the 16th. As of today it
> still returns content without charging.
>
> If you want this watched, I check every endpoint daily and email you the day
> a verdict changes. $29 a month for up to 25 endpoints, $99 for up to 250.
> Link below, cancel any time.
>
> If not, no problem at all, this is my last email.
>
> Salem
>
> [Stripe link]
> the402.dev, [postal address]
> Reply STOP or click here to never hear from me again.

**Email 2 is commercial, so it needs a postal address and an opt-out to
satisfy CAN-SPAM.** Email 1 is a defect report with no offer and does not.
Missing this is what has blocked the Clinic Receptions sequence, so do not
repeat it here.

Sending: from a real address on the402.dev with SPF, DKIM and DMARC set up
first. 20 emails by hand over two days. Do not use a sequencer for twenty
people.

## Success and failure criteria

Decision date: **6 September 2026**, 21 days after first send.

| Signal | Target | What it means |
|---|---|---|
| **Revenue** | 1 payment | The hypothesis holds. Build the cron, then run the same motion at MCP with 100x the targets. |
| Replies | 5 of 20 | The defect opener works even if the offer does not. Keep the opener, change the offer. |
| Fixes within 7 days | 3 of 20 | They care about the problem. Qualifies the market even with zero revenue. |
| Replies under 2 | kill | The opener does not work on this cohort. Stop x402 outreach entirely. |

The fix rate matters more than the reply rate. Somebody who will not act on
free news that is costing them money will never pay to hear it sooner.

**What failure does not mean.** If this returns zero revenue, that is evidence
about a cohort of unfunded hobby operators, not about the motion. The MCP
version of this experiment aims at companies that have raised money. Run it
either way, and run it with whatever the reply data teaches.

## Tracking

One row per target: sent date, email 1 opened, replied, fixed within 7 days,
trial, paid. Nothing more elaborate than a spreadsheet.

## Before the first send

1. Stripe payment links created for $29 and $99. The account exists already.
   Update the statement descriptor so the charge does not read as a PC build.
2. SPF, DKIM, DMARC on the402.dev sending domain.
3. A postal address for the email 2 footer.
4. Rate limit `/validate`, because every one of these emails points 20
   operators straight at it.
5. Fix or scope `api/src/x402.ts:231` so the scheme is checked before the
   atomic-units rule is applied. Not required to send, required before the 713
   number appears in any public post.
