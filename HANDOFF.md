# the402 handoff

Written 2026-08-15. Read this first, then verify the state rather than trusting
it. Everything below was true when written and some of it decays fast.

## Read this part first

**x402 is one idea. The machine we built is not specific to it.**

What actually exists is a verification engine and a publishing pipeline. It
calls arbitrary HTTP endpoints, works out how to talk to them, classifies what
came back, and refuses to guess when it cannot tell. x402 was just the first
thing pointed at.

The x402 network moves roughly $14k a day of real volume. That is small, and
Salem knows it. He has decided to launch what is built, and that decision is
**not** up for relitigating. But he is explicitly open to pointing these assets
somewhere with more money in it, and that is the most valuable open question in
the project.

**Your job includes evaluating that.** See "The open question" at the bottom.

## What is transferable

None of this is x402-specific:

- **A probe engine** (`api/src/index.ts`) that discovers the right HTTP method,
  recovers parameters from error bodies, follows self-describing responses, and
  reports every attempt so a verdict can be audited. The chain it walks is
  genuinely non-obvious: GET, read a 200 that names POST, POST, read a 400 that
  carries a worked example, retry with it, get the answer.
- **A harvest pipeline** (`scripts/harvest.py`, `import_to_d1.py`) that pulls a
  source of record, verifies every entry, and loads results with count checks.
- **A directory** (`directory/`) on Workers and D1: search, filters, detail
  pages, submissions that verify before publishing, a JSON API, sitemap.
- **A dated dataset**: 15,189 endpoints, 1,553 hosts, with prices, networks,
  methods and failure modes.
- **A reputation position** built on refusing to overclaim, which is the part
  that took the most work and transfers to any measurement product.
- **Warm contact with 95 operators** whose services have a defect we can prove.

## Current state

| Thing | State |
|---|---|
| [the402.dev](https://the402.dev) | Live, ~15,190 listings, D1-backed |
| [api.the402.dev](https://api.the402.dev) | Live validator, free, no key |
| Measurement post | Written, `docs/measurement-post.md` |
| Launch copy, five channels plus outreach emails | Written, `docs/launch-copy.md` |
| GTM with four revenue lines | Written, `docs/gtm-plan.md` |
| README, budget log | Written |
| Tutorial | Not written, deliberately decoupled from launch |
| Paid `/batch` endpoint | Not built, needs a wallet address from Salem |
| Rate limiting | **Not built. Highest priority. See below** |
| Amon's curation of 402 listings | Not started, blocked on his side |

Repo: `github.com/sa1emie/the402`, public, single clean commit history.
Spend to date: $12.20. Revenue: $0.

## Do this before anything is promoted

**Rate limit `/submit` and `/validate`.** Two independent external reviews
flagged it. `/validate` is unauthenticated and makes outbound requests on
demand. `/submit` publishes immediately with no Turnstile. One harvest already
burns roughly 28k of a 100k daily subrequest quota. The launch plan points
Hacker News straight at it, so as it stands **the launch is the abuse
scenario.** Roughly an hour of work.

## Rules that protect the position

**Say "answers 402", never "works" or "verified".** We parse the payment
challenge and never complete a payment. Every doc holds this line.

**Never claim anything about how other directories probe.** We have not audited
one of them. Two reviews independently called this the fastest way to lose the
argument in public, because the eight directory authors will read the post and
know their own methods.

**Numbers: 15,189 listed, 14,352 called, 838 not callable.** Do not write "we
called all 15,189". A review caught that and it would have been the first thing
a hostile reader checked.

Canonical source is `data/verified-full-v2.json`. D1 derives from it. Never type
a number into a doc, regenerate it.

## Traps that cost real time here

- **Worker deploys take ~70 seconds to propagate.** Poll until consistent or you
  will chase phantoms.
- **D1 `execute --file` reports success while applying part of a file.** 1,500
  statement chunks silently lost ~100 rows each. Use 300 and verify the count.
- **`kimi-k3` accepts only `temperature: 1`** and needs a long timeout. The
  failure looks like a rate limit unless you read the error body.
- **No `nohup`, no trailing `&`** for background jobs. Both die when the shell
  exits. Use the built-in backgrounding.
- **Zsh here is non-interactive**, so `~/.zshrc` is skipped. Keys live in
  `~/.zshenv`.
- **Slug truncation collided** and silently merged 36 endpoints into 9 ids.
  Fixed with a hash suffix, but check id uniqueness after any id change.

## The external review loop

The working pattern: do the work, have DeepSeek and Kimi attack it, verify their
claims, fix what survives, then present.

```bash
python3 scripts/external_review.py --list-models
python3 scripts/external_review.py --panel
```

DeepSeek (`deepseek-v4-pro`) gets questions with a right answer. Kimi
(`kimi-k3`) gets questions with an argument. Output lands in `docs/` and is
gitignored.

**Verify every claim before acting.** They have been confidently wrong. The
first audit's headline finding was false, and it propagated into a later review
until `docs/audit-report.md` was annotated. They have also caught things worth
the whole exercise: a headline counting endpoints we never called, a percentage
against the wrong denominator, and a free API tier that gave away the paid
product.

## Two cloud routines, running

- `the402 number integrity check`, `trig_01EThxN2vPXPDq1uivuhvvJA`, every 6h,
  verifies published numbers against live data.
- `the402 launch polish`, `trig_015ueBPiQ3HKnsRVHLrBUZ6T`, every 6h, clones the
  repo, re-verifies, improves the weakest asset, opens a PR.

https://claude.ai/code/routines

## The open question, and how to work it

Salem's framing: *"x402 is only an idea at the end of the day. We've built a
lot. Let's capitalise, even if we have to pivot."*

So the question is not whether to launch, it is what else this machine should be
pointed at. Work it with the same loop, using the external models for ideas
rather than only for critique. A prompt that works:

> Do not critique the project. The team has built and can redeploy in days: a
> probe engine that calls arbitrary HTTP endpoints, discovers the right method,
> recovers parameters from error bodies, and refuses to guess; a harvest and
> verification pipeline; a live directory on Workers and D1; a dated dataset of
> 15,189 endpoints across 1,553 hosts; and warm contact with 95 operators whose
> services have a provable defect. The market it currently serves moves about
> $14k a day, which is small. Name three concrete places to point these assets
> where the money is larger. For each: what gets reused, who pays and how much,
> the wedge, and the strongest reason it fails. Rank them, pick one, and
> describe the first week.

Obvious adjacencies worth testing, none of them researched yet, all of them
guesses to be checked rather than recommendations:

- **MCP servers.** Far more numerous than x402 endpoints, growing faster, and
  the same "does this actually work" question applies. agent-tools.cloud already
  indexes MCP, x402 and A2A together, which suggests the adjacency is real.
- **General agent-facing API health.** The engine does not care what protocol it
  probes.
- **Selling the verification layer** to whoever owns a registry, rather than
  running a competing one.

Two constraints to carry into any pivot: keep the honesty position, since it is
the hardest-won asset, and prefer markets where somebody already pays for
something adjacent, because the x402 lesson is that a technically interesting
network with no money in it stays that way.

## Salem's standards

Load `salem-house-rules` before writing prose. Zero em dashes, no marketing
words, plain and neighborly, and run the check before claiming anything is done:

```bash
/Users/salemyakoob/Desktop/projects/skills/.claude/skills/salem-house-rules/scripts/predelivery-check.sh <files>
```

Do the direct thing first, flag concerns after rather than instead. If a fix
misses twice, stop and state the hypothesis before touching more code. He works
fast and will tell you when to slow down.
