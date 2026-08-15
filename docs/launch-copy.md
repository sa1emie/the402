# Launch copy, ready to post

All numbers verified against live data on 2026-08-15. If you post more than a
few days later, re-run the harvest first or change the date line, because
Bazaar grows by roughly 150 endpoints a day.

Order and timing are in `gtm-plan.md`. Short version: Show HN first, midweek,
around 8am US Eastern. Everything else follows over the next 48 hours.

---

## 1. Show HN

**Title** (80 char limit, this is 69):

```
Show HN: We called all 15,189 x402 endpoints. 46% only answer to POST
```

**URL:** https://the402.dev

**First comment**, post this yourself immediately after submitting:

```
I spent the last week building an x402 directory, found eight already existed,
and pivoted to measuring the network instead.

x402 is the HTTP 402 payment protocol. Client asks, server says "that costs
$0.002", client pays, server delivers. No API key, no signup.

We called every endpoint Coinbase's Bazaar advertises and recorded what
happened. Two findings worth the post:

1. Of 13,932 endpoints that return a payment challenge, 6,435 (46%) only
answer to POST. A plain GET gets a 404 or 405 and looks identical to a dead
endpoint. Probing with GET is the obvious thing to do, so a lot of "this
endpoint is dead" claims are really "I asked the wrong way".

2. Our first run was wrong. We labelled 693 endpoints not payable. The real
number is 272. We were sending an empty JSON body to endpoints that validate
parameters before quoting a price, and treating the directory's method hint as
binding. Fixing both recovered 421 working services we had publicly called
dead.

We parse the payment challenge. We never complete a payment. So we say
"answers 402", not "works". 838 endpoints have templated paths like /tx/:hash
that we cannot probe without inventing a value, and 165 answer 402 with an
asset whose decimals we could not establish. Both are counted and labelled
rather than dropped from the denominator.

The validator is free and takes any URL:

curl "https://api.the402.dev/validate?url=<your-endpoint>"

It returns the verdict, spec dialect, price, network, payTo, and every HTTP
attempt it made, so you can audit how it got there. If you run an x402
endpoint I would genuinely like to know whether it reports yours correctly.

Full writeup with the method: [link to the measurement post]
```

**Notes:** do not editorialise about competitors in the thread. If someone
names another directory, describe our method and let them compare. If someone
finds a bug, thank them and fix it in the thread, that is the best possible
outcome on HN.

---

## 2. X thread

Post as a thread, one beat per post.

**1/**
```
We called all 15,189 x402 endpoints and wrote down what happened.

The headline: 46% of payable endpoints only answer to POST.

Send a GET and you get a 404. Looks exactly like a dead endpoint.
```

**2/**
```
x402 is the HTTP 402 payment protocol.

Client asks for something. Server answers "that costs $0.002". Client pays,
server delivers.

No API key. No signup. It's what most of the agent commerce announcements this
year are pointing at.
```

**3/**
```
What we found across 1,553 hosts:

13,932 answer with a payment challenge
6,435 of those only via POST
713 advertise a payment option that cannot be used
116 need parameters before they'll quote
31 are listed as paid and serve for free
272 don't answer 402 at all
```

**4/**
```
Our first run was wrong.

We labelled 693 endpoints "not payable". The real number is 272.

We were POSTing an empty {} to endpoints that validate parameters first, and
trusting the directory's method hint. Fixing both recovered 421 working
services we had publicly called dead.
```

**5/**
```
One endpoint's 400 response literally hands you the answer:

{"error":"Required field 'domain' is missing or empty",
 "correct_example":{"domain":"spotify.com"}}

Our probe was throwing that away and recording it as dead. Now it retries with
the example and gets a clean 402.
```

**6/**
```
Also: the spec has two live dialects that are not compatible.

v1 puts requirements in the JSON body, calls the price maxAmountRequired
v2 puts them in a base64 PAYMENT-REQUIRED header, calls it amount

13,610 speak v2, 322 speak v1. Some declare v2 and use the v1 transport.
```

**7/**
```
What we did NOT do: complete a payment.

We parse the challenge. We never pay. So we say "answers 402", not "works".

838 endpoints have templated paths we can't probe without inventing values.
165 answer 402 with decimals we couldn't establish. Both labelled, not hidden.
```

**8/**
```
Check any endpoint yourself, free:

curl "https://api.the402.dev/validate?url=<your-endpoint>"

Returns verdict, dialect, price, network, payTo, and every HTTP attempt so you
can audit the conclusion.

All 15,189 rows: https://the402.dev
```

**Notes:** do not tag anyone in the thread itself. If it travels, the x402 and
Base accounts will find it. Tagging reads as begging and it caps the ceiling.

---

## 3. Discord (Coinbase Developer Platform, Base)

Post in whichever channel is for dev show-and-tell, not general chat.

```
Built something that might be useful to people here.

I called every endpoint in the Bazaar discovery API (15,189 of them) and
recorded what each one actually does when you request it.

Main finding: 46% of payable endpoints only answer to POST. A GET-only probe
sees a 404 and reads it as dead. That's 6,435 endpoints invisible to the
obvious way of checking.

Also found 713 endpoints advertising a payment option that can't be used
(a few quote the price as a decimal where the spec wants atomic units), and 31
listed as paid that hand data over for free.

The validator is free if you want to check your own endpoint:
curl "https://api.the402.dev/validate?url=<your-endpoint>"

Full results: https://the402.dev

If it reports your endpoint wrong I'd like to know, that's the most useful
feedback I can get right now.
```

---

## 4. Reddit

Only if the subreddit's self-promotion rules clearly allow it. Read them
first. Skip anywhere it's borderline. Candidates: r/ethdev, r/ethereum.

**Title:**
```
I called all 15,189 x402 endpoints. 46% only answer to POST, and my first
measurement was wrong.
```

**Body:** use the Show HN comment text above, minus the last line.

---

## 5. Product Hunt

Schedule for the week after HN so they don't compete.

**Name:** the402

**Tagline** (60 char limit, this is 52):
```
Every x402 endpoint, actually called and checked
```

**Description:**
```
the402 is a directory of x402 payment endpoints where every listing was
verified by a real HTTP request, not copied from a list.

We called all 15,189 endpoints Coinbase's Bazaar advertises and recorded what
each one does: which HTTP method it needs, which spec dialect it speaks, what
it charges, and on which network.

46% of payable endpoints only answer to POST, which makes them invisible to
the usual way of checking. We also found 713 endpoints advertising a payment
option that cannot be used, and 31 listed as paid that serve for free.

The validator is free and works on any URL, including yours.

We parse the payment challenge but never complete a payment, so we say
"answers 402" rather than "works". Everything we could not check is labelled
as such.
```

**First comment:** the "why we built it" section from the measurement post.

---

## 6. Direct outreach

The highest-value channel and the least like marketing. Three lists, all
derivable from the data.

### 6a. The 31 serving for free

These are the best emails to send. Someone's paywall is probably off.

**Subject:** `your x402 endpoint is serving without charging`

```
Hi,

I run the402.dev, a directory where every x402 endpoint gets called rather
than just listed.

When we called <endpoint> it returned content on an unpaid request, with no
402 challenge. It's listed on Bazaar as payable, so I suspect the paywall is
off rather than intentional.

You can check what a client sees:
curl "https://api.the402.dev/validate?url=<endpoint>"

No action needed on your side, and nothing to buy from me. Thought you'd want
to know.
```

### 6b. The 713 with a broken payment option

**Subject:** `one of your x402 payment options can't be used`

```
Hi,

I run the402.dev. We call every x402 endpoint and parse what comes back.

<endpoint> advertises <N> ways to pay and <M> of them can't be used by a
client. <specific reason, e.g. the amount is quoted as "0.016", a decimal,
where the spec requires an integer in atomic units>.

The working option is fine, so most clients will be OK. But a client that
picks the broken one from your accepts array will fail.

Check it yourself:
curl "https://api.the402.dev/validate?url=<endpoint>"
```

### 6c. The 421 mislabelled elsewhere

**Subject:** `your endpoint shows as dead on some x402 directories`

```
Hi,

I run the402.dev. Your endpoint <endpoint> only answers to POST, and several
directories probe with GET, so it can show up as dead or missing.

Nothing wrong on your end. Just worth knowing that discovery tools may be
misreporting you.

We list it correctly here: https://the402.dev/e/<id>
And you can see what a client sees:
curl "https://api.the402.dev/validate?url=<endpoint>"
```

**Rules for all outreach:** one email per operator, never a follow-up chase,
never a pitch. State what we observed, give them the command to check it
themselves, and stop. If they reply, answer the technical question and do not
upsell.

---

## Things not to say

- Do not say "verified" without qualifying it. We verify a challenge parses,
  not that payment works.
- Do not name a competing directory as wrong. State our method and let readers
  compare.
- Do not claim to be first, comprehensive, or the only one. Eight directories
  exist and several are good.
- Do not quote revenue or network volume as if it is large. It is not.
- Do not use em dashes.
