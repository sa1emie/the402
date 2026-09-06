# Context for agents working in this repo

Read this before you touch anything. It is short on purpose.

## What this is

A verification engine and a directory built on it. The engine calls arbitrary
HTTP endpoints, works out how to talk to them, classifies what came back, and
refuses to guess when it cannot tell. The x402 directory at the402.dev is the
first thing it was pointed at, not the point of it.

Two Cloudflare Workers, both live:

| Worker | Config | What it is |
|---|---|---|
| `the402-api` | `api/wrangler.jsonc` | The validator at api.the402.dev. Probe logic in `api/src/x402.ts` |
| `the402-directory` | `directory/wrangler.jsonc` | the402.dev, backed by D1. Code in `directory/src/index.ts` |

Canonical data is `data/verified-full-v3.json`, harvested 2026-09-05. D1 derives
from it. It is the source of truth, not the docs and not the site.

## Rules you do not get to break

**Say "answers 402", never "works" or "verified".** We parse the payment
challenge and never complete a payment, so we cannot know that paying delivers
anything. The same applies to MCP: a server "answers an MCP handshake".

**An auth-gated endpoint is not broken.** 45.8% of listed MCP servers return
401 or 403. Calling those dead makes a checker wrong about nearly half the
registry. Gated and broken are different verdicts and must stay different.

**Never claim anything about how another directory or scanner probes.** We have
not audited one of them. Describe what we did and stop.

**Never type a number into a document. Regenerate it.** Every figure in
`README.md` and `docs/measurement-post.md` is derived from the canonical file.
If you change a number, show the command that produced it.

**If you cannot determine something, record that you could not.** Do not guess,
do not fill gaps, do not round a missing value to zero.

## Two mistakes we already made. Do not remake them.

**The naive probe, August.** Our first probe only sent GET. 421 endpoints
answer only on POST, so we called them dead. They were fine. This is why the
engine now discovers the method instead of assuming it.

**The scheme rule, September.** The validator required `amount` to be an
integer string in atomic units on every payment option. That is correct for the
`exact` scheme on EVM networks. It is wrong for `agent-pay`, which is Amazon
Bedrock AgentCore Payments carrying an ISO-4217 asset where `"0.016"` is
correct, and wrong for XRPL, whose IOU amounts are natively decimal. We
published that 713 endpoints advertised an unusable payment option. The real
number was 4. We were about to email 709 people about a bug they did not have.

The lesson in both: **a rule that holds on the systems you know is not a rule
about the systems you have not looked at.** When a check fires on a large
fraction of a population, suspect the check first.

## Current verified numbers, 2026-09-05

Regenerate rather than quote these if you need them in output.

| | Count |
|---|---|
| Listed on Bazaar | 15,583 across 1,876 hosts |
| Actually called | 14,906 |
| Not callable, templated paths | 677 |
| Answer with a payment challenge | 14,367 |
| Of those, POST only | 7,417 (52%) |
| Advertise an unusable payment option | 4 |
| Listed as paid, served for free | 31 |
| Listed as x402, do not answer 402 | 371 |

The finding that matters most: of the 15,188 URLs listed on 15 August, only
8,377 were still listed on 5 September. The total barely moved while 45% of the
contents were replaced.

## Environment traps that cost real time

- **System python is 3.9.6.** No match statements, no `X | Y` type syntax, no
  f-string `=`. Standard library only in `scripts/`.
- **Wrangler needs node 22.** `source ~/.nvm/nvm.sh && nvm use 22` first, or it
  refuses to start.
- **zsh is the shell and it is not bash.** Quote globs: `grep --include="*.ts"`
  fails unquoted. Quote URLs containing `?` and `&`.
- **No `nohup`, no trailing `&`** for background jobs. They die with the shell.
- **D1 `execute --file` reports success while applying only part of a file.**
  Use 300-statement chunks and verify `COUNT(*)` after. 1,500 silently lost
  about 100 rows each.
- **Worker deploys take up to 70 seconds to propagate.** Poll until consistent
  or you will chase phantoms.
- **The edge cache survives deploys.** `directory/src/index.ts` has a
  `CACHE_VERSION` string. Change it to purge, otherwise corrected data keeps
  serving the old answer for hours.
- **Slug collisions.** Truncation once merged 36 endpoints into 9 ids. Check id
  uniqueness after any id change.

## What you must not do

- Do not deploy. No `wrangler deploy`. Salem or the lead agent does that.
- Do not write to production D1. No `--remote` writes.
- Do not `git push`. Do not commit to `main`.
- Do not send email, post publicly, or contact anyone.
- Do not commit `target_contacts.json`. It holds scraped personal addresses and
  this repo is public.

If your task seems to require one of these, stop and say so instead.

## How to verify instead of assert

The validator is free and public. Any claim about a single endpoint is one
command away:

```bash
curl -s "https://api.the402.dev/validate?url=<endpoint>"
```

It returns every HTTP attempt it made, so a verdict can be audited rather than
trusted. Use it. If you claim a market has buyers, name a company that pays for
the adjacent thing today and cite where you learned it.

## Writing

Plain and direct. Zero em dashes. No marketing words. Short sentences. Before
claiming a prose file is done:

```bash
/Users/salemyakoob/Desktop/projects/skills/.claude/skills/salem-house-rules/scripts/predelivery-check.sh <files>
```
