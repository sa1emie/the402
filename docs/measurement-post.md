# We measured the x402 network twice, three weeks apart. 45% of it was replaced.

*Measured 2026-08-15 and again 2026-09-05. On the second run Bazaar listed
15,583 endpoints; we could call 14,906 of them, and the other 677 have
templated paths like `/tx/:hash` that need a value we would have to invent. Any
single endpoint below can be re-checked with one curl against our free
validator. The aggregates cannot be, short of re-running the whole harvest, and
the script that does it is in the repo.*

x402 is a payment protocol built on HTTP 402. A client asks for something, the
server answers "that costs a fifth of a cent," the client pays, and the server
hands it over. No signup, no API key. It is the plumbing most of the agent
commerce announcements this year are pointing at.

There are directories listing which endpoints exist. Coinbase runs one called
Bazaar, and several independent ones exist alongside it. What none of them
publish is what the network looks like when you actually call every endpoint
and write down what happened.

So we did that. Then we did it again three weeks later, which turned out to be
the more interesting half.

## The headline: the list is stable and its contents are not

Between 15 August and 5 September the number of listed endpoints barely moved.
It went from 15,188 to 15,583, up about 2.6%. A directory checked once a month
would report a slow, healthy climb.

Underneath, the network had been largely replaced.

| | Count |
|---|---|
| Listed on 15 August | 15,188 |
| Listed on 5 September | 15,583 |
| **Still the same URL on both dates** | **8,377** |
| Gone by 5 September | 6,811 |
| New since 15 August | 7,206 |

**6,811 of the 15,188 endpoints we measured in August, 44.8% of them, were no
longer listed three weeks later.** Almost exactly as many new ones appeared, so
the total held steady and hid the turnover completely.

We are not claiming those 6,811 went offline. We are claiming something
narrower and checkable: they were on Bazaar's list on 15 August and they were
not on it on 5 September. Endpoints get delisted, rotated, renamed and
redeployed, and this measurement does not distinguish between those.

The practical consequence is the same either way. Any directory of this network
built from a single crawl is roughly half wrong within a month, including ours
if we stopped here. That is not a criticism of anyone else's list. It is a
property of the thing being listed, and the only way to know it is to measure
twice.

## 52% only answer to POST

Of 14,367 endpoints that returned a payment challenge, **7,417 of them, 52%,
answered only when we sent a POST.** A plain GET usually gets a 404 or a 405,
which looks exactly like a dead endpoint. Sometimes it returns a 200 carrying a
description of the real endpoint, which looks like a working free API. Neither
is a payment challenge.

That matters because probing with GET is the obvious thing to do, and it is
what we did first. Nearly half of all payable endpoints are invisible to a
GET-only check.

To be precise about what we are and are not saying: we have not audited how
any other directory probes. We do not know their methods and we are not
claiming they get this wrong. What we know is that our own probe got it wrong,
that the fix changed the answer for 421 endpoints, and that if a tool tells you
an endpoint is dead, the claim is worth exactly as much as the method behind
it. Ours is written down below so you can judge it.

## We got this wrong first, and it cost us 421 endpoints

Our first full run labelled 693 endpoints as not payable. That number was wrong.

Two mistakes:

**We sent an empty JSON body.** Plenty of endpoints validate their parameters
before they quote a price. Send `{}` and you get an HTTP 400, which reads as
broken. Send what the endpoint actually asks for and you get a clean 402. One
we hit returns this on a bad request:

```json
{"error":"Required field 'domain' is missing or empty",
 "correct_example":{"domain":"spotify.com"}}
```

It is telling you exactly how to call it. Our probe was throwing that away and
recording the endpoint as dead.

**We treated a directory's method hint as binding.** When the hint said GET and
the endpoint only spoke POST, we never tried POST.

After fixing both, the same network measured again: **272 endpoints are not
payable, down from 693.** We had been wrong about 421 working services, which
is 61% of everything we called dead.

The fixed probe now walks a chain. On one endpoint it goes GET, gets a 200 with
a self-describing document naming POST, tries POST, gets a 400 with a worked
example, retries with that example, and gets a 402. Three hops to establish a
price that a single GET reports as dead.

## The full picture

Every endpoint Bazaar listed landed in exactly one of these five outcomes, and
they add up to 15,583. Four of the five required an actual HTTP request. The
fifth, the templated paths, is the 677 we could not call:

| Outcome | Count |
|---|---|
| Answered with a payment challenge | 14,367 |
| Live, but need parameters before quoting a price | 129 |
| Listed as payable, served us content for free | 31 |
| No payment challenge at all | 371 |
| Not probeable without inventing a path value | 677 |
| Unreachable when we called | 8 |
| **Total listed on Bazaar** | **15,583** across 1,876 hosts |
| Of those, actually called | 14,906 |

These three are subsets of the 14,367 above, not separate buckets:

| Detail | Count |
|---|---|
| Only answer to POST | 7,417 (52% of the 14,367) |
| Advertise a payment option a caller cannot use | 4 |
| Answered 402 but we could not derive a price | 205 |

Two of those rows are worth pulling out.

**We reported 713 here, and 713 was wrong.** An earlier run of our own
validator required `amount` to be an integer string in atomic units on every
payment option it saw. That rule is correct for the `exact` scheme on the EVM
networks we recognise. It is wrong for `agent-pay`, the scheme Amazon Bedrock
AgentCore Payments uses, where the asset is ISO-4217 USD and `"0.016"` is a
correctly formed amount. It is also wrong for XRPL, whose IOU amounts are
natively decimal.

So the very example we were about to publish, `"0.016"`, was a working payment
option at a real company that we were calling broken. The validator now applies
the atomic-units rule only where it can identify both the scheme and the
network, and warns everywhere else. After the fix the count is 4.

We are leaving this in rather than quietly restating the number, because a
measurement project that hides its own corrections is worth nothing.

**31 endpoints are listed as paid and hand over data for free.** They return
real content on an unpaid request. For anyone running one of those, that is
probably a bug, and it is probably costing money.

## Two dialects, and they are not compatible

The spec has moved, and both versions are live at once:

- **v1** puts payment requirements in the JSON response body and calls the
  price `maxAmountRequired`
- **v2** puts them in a base64 `PAYMENT-REQUIRED` header and calls it `amount`

13,610 endpoints speak v2, 322 still speak v1. A parser that assumes one shape
silently misreads the other. We also found endpoints declaring `x402Version: 2`
while using the v1 body transport, so you cannot infer the format from the
version number. You have to check both.

## What we did not do

We parse the payment challenge. **We never complete a payment.** So we do not
claim an endpoint "works," only that it "answers 402" with requirements we
could read. Whether paying actually returns the resource is a different and
more expensive question, and we have not answered it.

The 838 unprobeable endpoints have templated paths like `/tx/:hash`. Calling
them needs a real value we would have to invent, so we left them out rather
than guess. They are counted and labelled, not hidden in a denominator.

165 endpoints answered 402 with an asset whose decimals we could not establish,
mostly on Solana. We show the atomic amount and refuse to convert it to dollars
rather than publish a number we are not sure of.

## Check any of this yourself

The validator is free and takes a URL:

```bash
curl "https://api.the402.dev/validate?url=https%3A%2F%2Fapi.onesource.io%2Fapi%2Fchain%2Fchain-id"
```

It returns the verdict, the dialect, the price, the network, the payTo address,
and every HTTP attempt it made so you can audit how it reached its conclusion.
If you run an x402 endpoint, it will tell you what a client actually sees.

The full result set, all 15,583 rows including the 677 we could not call, is at
[the402.dev](https://the402.dev), with a JSON API at `/api/listings`.

## Why we built it

We set out to build an x402 directory and found eight already existed. Building
a ninth list was not interesting. Measuring the network properly turned out to
be, because the measurement is where everyone, us included, was getting it
wrong.

Numbers are dated because they go stale fast, and not only upward. Bazaar
listed 14,405 resources when we first looked, 15,189 on 15 August, and 15,583
on 5 September. That climb hides the churn described at the top: only 8,377 of
the August URLs were still listed in September. Our figures are what Bazaar
listed on the days we measured. They are not what Bazaar holds today, and the
only honest fix for that is to keep measuring.
