# We called 14,352 x402 endpoints. Of the ones that answer, 46% only do so on POST.

*Measured 2026-08-15. Bazaar listed 15,189 endpoints that day. We could call
14,352 of them; the other 838 have templated paths like `/tx/:hash` that need a
value we would have to invent. Any single endpoint below can be re-checked with
one curl against our free validator. The aggregates cannot be, short of
re-running the whole harvest, and the script that does it is in the repo.*

x402 is a payment protocol built on HTTP 402. A client asks for something, the
server answers "that costs a fifth of a cent," the client pays, and the server
hands it over. No signup, no API key. It is the plumbing most of the agent
commerce announcements this year are pointing at.

There are directories listing which endpoints exist. Coinbase runs one called
Bazaar, and several independent ones exist alongside it. What none of them
publish is what the network looks like when you actually call every endpoint
and write down what happened.

So we did that. Here is what came back.

## The headline: 46% only answer to POST

Of 13,932 endpoints that returned a payment challenge, **6,435 of them, 46%,
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
they add up to 15,189. Four of the five required an actual HTTP request. The
fifth, the templated paths, is the 838 we could not call:

| Outcome | Count |
|---|---|
| Answered with a payment challenge | 13,932 |
| Live, but need parameters before quoting a price | 116 |
| Listed as payable, served us content for free | 31 |
| No payment challenge at all | 272 |
| Not probeable without inventing a path value | 838 |
| **Total listed on Bazaar** | **15,189** across 1,553 hosts |
| Of those, actually called | 14,352 |

These three are subsets of the 13,932 above, not separate buckets:

| Detail | Count |
|---|---|
| Only answer to POST | 6,435 (46% of the 13,932) |
| Advertise a payment option a caller cannot use | 713 |
| Answered 402 but we could not derive a price | 165 |

Two of those rows are worth pulling out.

**713 endpoints advertise a payment option a client cannot use.** The x402 spec
lets a server offer several ways to pay. Some offer a valid one alongside a
broken one. We found endpoints quoting a price as `"0.016"`, a decimal, where
the spec requires an integer in atomic units. A client that picks the wrong
option from the list cannot construct a valid payment. We did not pay to find
out what happens next, so we say the option violates the spec, not that it
fails.

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

The full result set, all 15,189 rows including the 838 we could not call, is at
[the402.dev](https://the402.dev), with a JSON API at `/api/listings`.

## Why we built it

We set out to build an x402 directory and found eight already existed. Building
a ninth list was not interesting. Measuring the network properly turned out to
be, because the measurement is where everyone, us included, was getting it
wrong.

Numbers are dated because they go stale fast, and not only upward. Bazaar
listed 14,405 resources when we started and about 15,200 five days later. As
of this writing it reports 15,062, so endpoints are being delisted as well as
added. Our 15,189 is what Bazaar listed on the day we measured, of which we called
14,352. It is not what Bazaar holds today.
