# listings.json schema

One entry per x402 endpoint. The file is a list, so it starts with `[` and ends
with `]`, and every entry sits inside `{ }` separated by commas.

Run this before handing the file over. It changes nothing, it only reports:

```bash
python3 scripts/check_listings.py data/listings.json
```

`data/listings.example.json` is a working file that passes the check. Copy its
shape. Entries 2 and 3 in it are labelled as illustrations and must not ship.

## Fields you fill in

| Field | Type | Required | What goes in it |
|---|---|---|---|
| `id` | text | yes | Short slug, lowercase letters, numbers and hyphens. `scrape-402`, not `Scrape 402`. Must be unique |
| `name` | text | yes | The name the service calls itself |
| `url` | text | yes | The payable endpoint itself, not the marketing site. Must start with `https://` |
| `homepage` | text | no | Docs or landing page, if there is one |
| `description` | text | yes | One or two sentences, 300 characters max. What it does and who would buy it |
| `category` | text | yes | Exactly one value from the category list below |
| `price_usd` | number | yes | Price per call in dollars, no quotes. `0.002`, not `"0.002"` |
| `asset` | text | no | Usually `USDC` |
| `network` | text | yes | One value from the network list below |
| `facilitator` | text | no | Facilitator URL if the endpoint names one |
| `pay_to` | text | no | The receiving address from the 402 response |
| `on_cloudflare` | true/false | yes | Is it hosted on Cloudflare. No quotes around true or false |
| `mcp` | true/false | yes | Is it also exposed as an MCP tool. No quotes |
| `source` | text | yes | Where you found it: `bazaar`, `awesome-x402`, `submission`, or `manual` |
| `source_url` | text | no | Link to where you found it, so the site can cite it |
| `added_at` | text | no | Date you added it, like `2026-08-05` |
| `notes` | text | no | Anything Salem should know. Free text |

## Fields you never fill in

`verification`, `verified_at`, `payload_verified`, `payment_verified`, `status`.

The validator writes these after it actually runs. If they were typed by hand
the badge on the site would be claiming a check that never happened, so the
checker rejects the file if it finds them.

## Category, one of

`data`, `ai-inference`, `web-scraping`, `finance-crypto`, `search`, `media`,
`identity`, `infrastructure`, `mcp-server`, `other`

## Network, one of

`base`, `base-sepolia`, `ethereum`, `polygon`, `optimism`, `arbitrum`,
`avalanche`, `solana`, `aptos`, `stellar`, `sui`

## The price rule

`price_usd` comes from the endpoint's own 402 response, never from its marketing
page. Marketing pages go stale and quote the cheapest tier. If you cannot see a
real 402 response for it, leave the entry out and note the URL for Salem rather
than guessing.

## Writing rules for `description`

- One or two sentences. Say what it does and who would pay for it.
- No em dashes. The checker fails the file if it finds one.
- No marketing words: leverage, synergy, revolutionize, elevate, transform,
  unlock, ensure, facilitate, comprehensive, seamless, robust.
- No numbers or claims you did not see with your own eyes.
- Plain and neighborly. Lowercase is fine. No emojis.
