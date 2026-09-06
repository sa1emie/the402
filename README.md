# the402

Two things live on Cloudflare Workers:

- **[the402.dev](https://the402.dev)** is a directory of x402 payment endpoints.
  Every listing we could call was called, and the rest are labelled as such.
- **[api.the402.dev](https://api.the402.dev)** is the validator that does the
  checking. Free, no key, takes any URL.

The directory is the artifact. The measurement is the product. Eight x402
directories already existed when this started, so listing endpoints was not
worth doing. Calling them and writing down what happened was.

## What it found

Measured 2026-09-05. Bazaar listed 15,583 endpoints across 1,876 hosts. We
called 14,906 of them; the other 677 have templated paths like `/tx/:hash` that
need a value we would have to invent, so they are labelled rather than guessed
at.

| | Count |
|---|---|
| Answer with a payment challenge | 14,367 |
| Of those, only answer to POST | 7,417 (52%) |
| Advertise a payment option a caller cannot use | 4 |
| Need parameters before quoting a price | 129 |
| Listed as payable, served content for free | 31 |
| No payment challenge at all | 371 |
| Not probeable without inventing a path value | 677 |
| Answered 402 but no derivable price | 205 |

### A number we got wrong, and what it was

An earlier version of this table said 713 endpoints advertised a payment option
a caller cannot use. That was our bug, not theirs.

Our validator required the `amount` field to be an integer string in atomic
units, which is right for the `exact` scheme on the EVM networks we know. It is
wrong for Amazon Bedrock AgentCore Payments, which uses the `agent-pay` scheme
with an ISO-4217 asset where `"0.016"` is correct, and wrong for XRPL, whose
IOU amounts are natively decimal. We were applying an EVM convention to rails
that do not use it.

The validator now only enforces that rule where it can actually judge the
scheme and the network, and warns everywhere else. The real count is 4.

Full writeup in [docs/measurement-post.md](docs/measurement-post.md).

## What "verified" means here

We send real HTTP requests and parse the payment challenge. **We never complete
a payment.** So the site says an endpoint "answers 402", not that it "works".

Anything we could not check is labelled rather than dropped: the 838
unprobeable endpoints have templated paths like `/tx/:hash`, and the 165
unpriced ones use assets whose decimals we could not establish.

## Try it

```bash
curl "https://api.the402.dev/validate?url=https%3A%2F%2Fapi.onesource.io%2Fapi%2Fchain%2Fchain-id"
```

Returns the verdict, spec dialect, price, network, payTo address, and every
HTTP attempt made, so any conclusion can be audited.

Verdicts: `payable`, `needs-params`, `free`, `malformed`, `not-x402`,
`unreachable`.

## Layout

```
api/          the validator Worker
  src/index.ts    routing, probe chain, SSRF guards
  src/x402.ts     spec parsing for both dialects
directory/    the directory Worker
  src/index.ts    routes, D1 queries, submissions
  src/render.ts   server-rendered HTML
  schema.sql      D1 schema
scripts/
  harvest.py         pull Bazaar, verify every endpoint
  import_to_d1.py    turn a harvest into SQL
  check_listings.py  validate a listings file
  check_curation.py  validate a curation file
data/         harvest output, canonical source of every number
docs/         measurement post, GTM plan, launch copy, audit
evidence/     saved transcripts proving deploys and verification runs
```

## Running it

Needs Node 22 (`.nvmrc` pins it) and a Cloudflare account with wrangler
authenticated.

```bash
nvm use
npm install
npx wrangler login
```

Deploy:

```bash
npx wrangler deploy --config api/wrangler.jsonc
npx wrangler deploy --config directory/wrangler.jsonc
```

Re-harvest and reload the directory:

```bash
python3 scripts/harvest.py --all --concurrency 8 --out data/verified-full-v2.json
python3 scripts/import_to_d1.py data/verified-full-v2.json > directory/seed-full.sql
split -l 300 directory/seed-full.sql /tmp/sc/c_
for f in /tmp/sc/c_*; do
  npx wrangler d1 execute the402 --config directory/wrangler.jsonc --remote --file "$f"
done
npx wrangler d1 execute the402 --config directory/wrangler.jsonc --remote \
  --command "SELECT COUNT(*) FROM listings"
```

**Always check the row count afterwards.** `wrangler d1 execute --file` has
reported success while applying only part of a file. Chunks of 300 have been
reliable; 1,500 silently lost about 100 rows per call.

## Configuration

No secrets are needed to run either Worker today. The directory binds a D1
database named `the402` (`directory/wrangler.jsonc`). The validator has no
bindings.

When the paid batch endpoint lands it will need `PAY_TO`, `NETWORK` and
`JWT_SECRET`, all set with `wrangler secret put`, never committed.

## Verifying a change

```bash
# validator responds and classifies correctly
curl -s "https://api.the402.dev/validate?url=https%3A%2F%2Fexample.com" | python3 -m json.tool

# numbers agree across raw file, D1, and the live site
python3 -c "import json,collections;print(collections.Counter(e['verdict'] for e in json.load(open('data/verified-full-v2.json'))))"
npx wrangler d1 execute the402 --config directory/wrangler.jsonc --remote \
  --command "SELECT verdict, COUNT(*) n FROM listings GROUP BY verdict"
curl -s https://the402.dev/api/stats | python3 -m json.tool
```

Worker deploys take roughly 70 seconds to propagate across edges. Poll until
responses are consistent before trusting a test, or you will chase phantoms.

The live count runs slightly ahead of the harvest file, because endpoints
submitted through `/submit` are verified and listed immediately rather than
waiting for the next harvest. As of 2026-08-15 that is one row: the harvest
holds 15,188 and the site serves 15,189. A gap of a few is expected. A gap of
hundreds means an import dropped rows.

## Known gaps

- The paid batch endpoint is not built, so there is no x402-gated product yet.
- `/validate` and `/submit` have no rate limiting.
- Listing names, descriptions and categories are machine-generated pending
  human curation.
- No deep verification. Completing a payment and confirming delivery is the
  next milestone, and it is what would let the site say "works".
