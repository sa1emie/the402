# Outreach batch 01, send-ready

Drafted 2026-08-16. Every defect below was re-verified live through the
validator on 2026-08-16 before this file was written.

Send from your normal Gmail. These are bug reports with no offer in them, so
there is no CAN-SPAM footer and no sending-domain work required. Send by hand,
one at a time, not through a sequencer.

Do not send email 2 until the Stripe links exist and you have a postal address
for the footer. Email 2 carries an offer and the rules change.

Language rule that holds in every one of these: an endpoint "answers 402". It
never "works" and it is never "verified".

---

## 1. api.delx.ai, the best one on the list

To: support@delx.ai
Subject: two of your paid endpoints are serving without charging

Hi,

I run the402.dev, a directory that calls every x402 endpoint listed on Bazaar
and records what came back. Yours came back in a way I think you would want to
know about.

On 16 August, this returned content without asking for payment:

https://api.delx.ai/api/v1/premium/controller-brief

It is listed as paid. Two of your endpoints do this. You can check it yourself
in one command:

curl -s "https://api.the402.dev/validate?url=https://api.delx.ai/api/v1/premium/controller-brief"

That is free, no key needed, and it prints every request it made so you can see
how I got there rather than taking my word for it.

Bazaar's telemetry shows 792 unique payers hitting your service in the last 30
days, so this is probably worth a look. Not selling you anything, just thought
you would want to know your paywall looks like it is off.

Salem

---

## 2. agents.ai-rook.com

No contact found on the site. Try a GitHub code search for `ai-rook.com`
before spending more than five minutes on it. Five endpoints serving free.

Evidence: https://agents.ai-rook.com/api/ip-lookup

---

## 3. api.surplusintelligence.ai

To: support@surplusintelligence.ai
Subject: your Bazaar listing points at an endpoint that does not answer 402

Hi,

I run the402.dev, a directory that calls every x402 endpoint listed on Bazaar
and records the result.

On 16 August, this one did not answer with a 402 payment challenge:

https://api.surplusintelligence.ai/v1/chat/completions

It is listed on Bazaar as an x402 endpoint, so anything discovering you through
that listing will not be able to pay you. You can check it yourself:

curl -s "https://api.the402.dev/validate?url=https://api.surplusintelligence.ai/v1/chat/completions"

Free, no key, and it shows every request it made.

Not selling anything. Your listing and your endpoint disagree and I figured you
would rather hear it from me than not hear it.

Salem

---

## 4. sqlguard.io

To: hello@sqlguard.io
Subject: your Bazaar listing points at an endpoint that does not answer 402

Same body as number 3, with:
- endpoint: https://sqlguard.io/v1/probe
- note: 23 unique payers in the last 30 days

---

## 5. afriref.dev

To: api@3l-groupconsulting.co.za
Subject: your Bazaar listing points at an endpoint that does not answer 402

Same body as number 3, with:
- endpoint: https://afriref.dev/v1/vat/determine

---

## 6. deepai.pay.zeroclick.io

To: team@deepai.com
Subject: your Bazaar listing points at an endpoint that does not answer 402

Same body as number 3, with:
- endpoint: https://deepai.pay.zeroclick.io/api/text2img
- note: two endpoints affected

Check this address is right before sending. It was scraped from the site and
deepai.com may be a different company from the zeroclick.io gateway.

---

## 7. api.lmxcloud.io

To: support@lmxcloud.io
Subject: your Bazaar listing points at an endpoint that does not answer 402

Same body as number 3, with:
- endpoint: https://api.lmxcloud.io/v1/chat/completions

---

## 8. focxle.com

To: hello@focxle.com
Subject: your x402 endpoint is serving without charging

Same body as number 1, with:
- endpoint: https://focxle.com/api/v1/x402/resource/agent-trust-check
- note: four endpoints affected

---

## 9. intel.twzrd.xyz

To: security@twzrd.xyz
Subject: your x402 endpoint is serving without charging

Same body as number 1, with:
- endpoint: https://intel.twzrd.xyz (see verified_targets.json for the exact path)
- note: two endpoints affected

That address is from security.txt, so keep the tone matter of fact.

---

## 10. thomenz, three services in one message

GitHub: github.com/thomenz. Open one issue on the relevant repo, or find an
email on the profile first.

Three of your services are listed on Bazaar as x402 but do not answer 402 as of
16 August:

- https://brdata.thomenz.me/boleto/decode
- https://soldefi.thomenz.me/v1/solana/swap/build
- https://brmarket.thomenz.me/v1/search/image

Eleven endpoints across the three. Same recheck command applies.

---

## 11. srv1334799.hstgr.cloud

X: x.com/ConorChepenik. Short DM, not an email.

> Hi, I run the402.dev. Your endpoint at srv1334799.hstgr.cloud/v1/compare is
> listed on Bazaar as x402 but did not answer 402 when I called it on 16 Aug.
> Five endpoints affected. You can check with
> api.the402.dev/validate?url=... Not selling anything.

---

## No contact found, skip unless a GitHub search turns something up fast

omniterminal.app, ai.stable-jack.com,
vietnam-holiday-api.kdlcfa.workers.dev, diem-agent-workers.vercel.app,
api.clervo.dev, evidence.regulavita.com,
ba-x402-requirements-agent.onrender.com, hivemindos gateway

`ai.stable-jack.com` is worth five minutes on its own: 68 endpoints affected
and 78 unique payers.

---

## Before you hit send

- Re-run the validator on that specific endpoint the morning you send. If they
  fixed it overnight, the email is wrong and it costs you the reputation the
  whole project is built on.
- Send from your own name, not a noreply address.
- Do not attach anything.
- Do not mention pricing. Email 1 sells nothing on purpose.

## Tracking

One row per target: sent date, replied, fixed within 7 days, trial, paid.
Decision date is 6 September. Under 2 replies from this batch means the opener
does not work on this cohort and x402 outreach stops.
