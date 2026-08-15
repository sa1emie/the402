# Budget log

Approved ceiling: $100 to launch, with growth spend up to $10,000 available
subject to a separate itemised proposal. Nothing in the second tier has been
proposed or spent.

## Actual spend

| Date | Item | Approved | Actual | Notes |
|---|---|---|---|---|
| 2026-08-10 | Domain `the402.dev`, 1 year, Cloudflare Registrar | ~$12 | **$12.20** | At cost, auto-renew on, expires 2027-08-10 |
| 2026-08-10 | Workers, D1, KV | $0 | **$0.00** | Free tier throughout |
| 2026-08-10 | Facilitator and settlement | $0 | **$0.00** | Nothing settled, no payments made |
| | **Total spent** | | **$12.20** | Against a $100 ceiling |

## Approved but unspent

| Item | Approved | Spent | Status |
|---|---|---|---|
| Verification wallet float | $20.00 | $0.00 | Not funded. Only needed for deep verification, which is not built |
| Mainnet dry run | <$0.10 | $0.00 | Not run. Blocked on the paid endpoint |

Remaining headroom under the $100 ceiling: **$87.80**.

## Recurring costs

| Item | Cost | When |
|---|---|---|
| Domain renewal | $12.20/yr | 2027-07-11, auto-renew |
| Workers, D1 | $0 | Free tier covers current traffic |

Free tier limits worth watching: Workers is 100,000 requests a day and
subrequests count against it. A full 15,189 endpoint harvest consumes roughly
30,000 to 45,000 subrequests now that the probe retries, so a harvest is
between a third and a half of a day's quota. Two harvests in a day would be
tight. Daily re-harvesting will need either the $5/month paid plan or a
narrower refresh that only rechecks changed rows.

## Growth spend, not proposed

The GTM plan recommends spending zero on ads. Search volume on x402 terms is
small enough that paid acquisition would buy clicks that mostly do not exist,
and the network itself does roughly $28,000 a day with about half of that
wash trading. The highest-return work available is writing and distribution,
both free.

Any ad test gets its own proposal with numbers first.

## Notes

- No spend has happened without prior approval.
- The Cloudflare account also briefly hosted an unrelated personal proxy
  worker, removed on 2026-08-15. It cost nothing and is no longer on the
  account.
- Revenue to date: $0.00. This is expected and is not a launch metric. See
  `gtm-plan.md`.
