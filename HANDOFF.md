# the402 session handoff

Written 2026-08-15. This is the doc of record for picking up the402. Read it
before touching anything, then verify the state described here rather than
trusting it.

## What this is

Two live products on Cloudflare Workers, plus the measurement that justifies
them.

- **[the402.dev](https://the402.dev)**, a directory of x402 payment endpoints
  where every listing we could call was called.
- **[api.the402.dev](https://api.the402.dev)**, the free validator that does the
  calling. No key, no signup.

The positioning is the important part: **the product is the measurement, not the
directory.** Eight x402 directories already existed when this started, including
Coinbase's own Bazaar. Building a ninth list was not worth doing. Calling every
endpoint and reporting honestly was.

## Current state

| Thing | State |
|---|---|
| Directory | Live, 15,190 listings, D1-backed |
| Validator | Live, handles both spec dialects, POST-only endpoints, param-required endpoints |
| Measurement post | Written, `docs/measurement-post.md` |
| Launch copy, five channels plus outreach | Written, `docs/launch-copy.md` |
| GTM plan with monetization | Written, `docs/gtm-plan.md` |
| README, budget log | Written |
| Tutorial | Not written. Decoupled from launch deliberately |
| Paid `/batch` endpoint | Not built. Needs a receiving wallet address from Salem |
| Amon's curation of 402 listings | Not started, blocked on his side |

**Launch decision: made. Salem is launching.** Do not reopen that unless a
genuinely new blocker appears.

## Repo

`github.com/sa1emie/the402`, **public**. It was briefly public with an API key
in it, which is why history was rewritten to a single clean commit. Verify
before adding anything:

```bash
git grep -nIE 'sk-[A-Za-z0-9]{16,}|AKIA[0-9A-Z]{16}' $(git rev-list --all)
```

Deliberately **not** in the repo, and gitignored: `AMON-*.md` and
`for-amon-curation.json` (they name a real collaborator and describe how he
works), `X402_SPRINT_HANDOFF.md`, `AUDIT-PROMPT.md`, `docs/audit-report.md`,
`tunnel/` (holds a live VLESS UUID), and `docs/external-review-*.md`.

## The numbers, and where they come from

Canonical source is `data/verified-full-v2.json`. D1 is derived from it. Never
type a number into a doc; regenerate it.

As measured 2026-08-15: Bazaar listed 15,189, we called 14,352, and 838 have
templated paths like `/tx/:hash` that we cannot call without inventing a value.
Of those called, 13,932 answered with a payment challenge, and **6,435 of those,
46%, answer only to POST.** That 46% is the headline.

The live site total drifts above 15,189 because `/submit` publishes immediately.
A gap of a few is expected. A gap of hundreds means an import dropped rows.

## Things that will bite you

**Say "answers 402", never "works" or "verified".** We parse the payment
challenge and never complete a payment. Every doc holds this line and it is the
whole credibility position.

**Never claim anything about how other directories probe.** We have not audited
one of them. Two separate external reviews flagged this as the single fastest
way to lose the argument in public, since the eight directory authors will read
the post and know their own methods.

**Worker deploys take about 70 seconds to propagate.** Poll until responses are
consistent before believing a test, or you will chase phantoms.

**D1 `execute --file` reports success while applying part of a file.** 1,500
statement chunks silently lost about 100 rows each. Use 300 and always verify
the row count afterwards.

**`kimi-k3` only accepts `temperature: 1`** and needs a long timeout. Both are
handled in `scripts/external_review.py`, but the failure looks like a rate limit
if you do not read the error body.

**Background jobs: do not use `nohup` or a trailing `&`.** Both get killed when
the tool's shell exits. Use the built-in backgrounding instead.

**Zsh here is non-interactive**, so `~/.zshrc` is not read. API keys live in
`~/.zshenv`.

## The external review loop

This is the working pattern Salem wants: do work, get DeepSeek and Kimi to
review it, incorporate, present.

```bash
python3 scripts/external_review.py --list-models   # confirm model ids
python3 scripts/external_review.py --panel         # all five reviews
```

DeepSeek gets questions with a right answer (`numbers`, `code`). Kimi gets
questions with an argument (`strategy`, `copy`, `redteam`). Reviews land in
`docs/` and are gitignored.

**Verify every claim a review makes.** They have been wrong. The first external
audit's headline finding, that statepulse is our own endpoint, was false, and
that error propagated into a later Kimi review five days on until it was
annotated. `docs/audit-report.md` now carries a correction block at the top.

Reviews have caught real things: a headline claiming we called 838 endpoints we
never called, a percentage against the wrong denominator, "re-checkable with one
curl" being false for aggregates, and unverified claims about competitors.

## Two cloud routines, running

- `the402 number integrity check`, `trig_01EThxN2vPXPDq1uivuhvvJA`, every 6h.
  Verifies published numbers against live data, no repo needed.
- `the402 launch polish`, `trig_015ueBPiQ3HKnsRVHLrBUZ6T`, every 6h. Clones the
  repo, re-verifies numbers, improves the weakest asset, opens a PR.

Manage at https://claude.ai/code/routines

## What to do next, in order

1. **Rate limit `/submit` and `/validate`.** Two independent reviews flagged
   this. `/validate` is unauthenticated and makes outbound requests, `/submit`
   publishes immediately with no Turnstile, and a harvest already burns roughly
   28k of a 100k daily subrequest quota. Pointing HN at this as-is is the abuse
   scenario. **This is the highest priority and it is not done.**
2. **Ship the launch.** Copy is ready in `docs/launch-copy.md`. Show HN first,
   midweek, early US morning. Everything else over the following 48 hours.
3. **Run the phase 3 outreach.** Nine hosts are giving paid content away right
   now and do not know. That email asks for nothing and is the warmest possible
   introduction. It is also the top of the monetization funnel.
4. **Build `/batch`** once Salem provides a receiving wallet address. Delivers
   the paid product and gives the tutorial real code to document.
5. **Merge Amon's curation** when it arrives. Regenerate his file from the
   current harvest first, do not send the stale one.

## Monetization, the open question

The GTM now has three revenue lines: endpoint monitoring at $29/host/month,
the verified feed licensed to other directories at $99 to $299, and paid batch
validation. Success metric is **one paying customer within thirty days.**

An external red team's verdict was that without a paying counterparty this is a
hobby with a launch date. Salem has read that and chosen to launch anyway, which
is a legitimate call given the option value is real and the holding cost is
close to zero. Do not relitigate it. Do work on making the monetization land.

## Salem's standards

Load `salem-house-rules` before writing anything. The short version: zero em
dashes, no marketing words, plain and neighborly, and run the pre-delivery check
on every prose file before claiming it is done.

```bash
/Users/salemyakoob/Desktop/projects/skills/.claude/skills/salem-house-rules/scripts/predelivery-check.sh <files>
```

Do the direct thing first. Flag concerns after, not instead. If a fix misses
twice, stop and state the hypothesis before touching more code.
