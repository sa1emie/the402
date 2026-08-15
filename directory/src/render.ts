/**
 * HTML rendering for the directory.
 *
 * Server-rendered, no client framework, no external requests. The page is a
 * data table first and a marketing site never.
 */

export interface Listing {
  id: string;
  resource: string;
  host: string;
  name: string | null;
  description: string | null;
  category: string | null;
  verdict: string;
  method_used: string | null;
  http_status: number | null;
  latency_ms: number | null;
  dialect: string | null;
  transport: string | null;
  declared_version: number | null;
  network: string | null;
  price_usd: number | null;
  price_atomic: string | null;
  pay_to: string | null;
  usable_options: number | null;
  total_options: number | null;
  error_count: number | null;
  notes: string | null;
  verified_at: string | null;
}

export interface Stats {
  total: number;
  payable: number;
  dead: number;
  unprobeable: number;
  needsPost: number;
  partiallyBroken: number;
  needsParams: number;
  free: number;
  /** Date of the most recent verification run, so every number is dated. */
  verifiedOn: string | null;
  networks: { network: string; n: number }[];
}

export const esc = (s: unknown): string =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function ago(iso: string | null): string {
  if (!iso) return "never";
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "unknown";
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/**
 * Sub-cent prices are the norm here, so a fixed 2 or 4 decimal places renders
 * the cheapest endpoints as "$0.0000" and makes them look free. Keep two
 * significant figures instead and drop trailing zeros.
 */
function fmtUsd(v: number): string {
  // Deliberately not the word "free" here. "free" is a verdict meaning the
  // endpoint never asked for payment. An endpoint that answers 402 quoting a
  // zero amount is a different thing, and showing both as "free" reads as a
  // contradiction next to the badge.
  if (v === 0) return "$0";
  if (v >= 0.01) return `$${v.toFixed(2)}`;
  return `$${Number(v.toPrecision(2))}`;
}

function price(l: Listing): string {
  if (l.price_usd !== null && l.price_usd !== undefined) {
    return fmtUsd(l.price_usd);
  }
  if (l.price_atomic) return `<span class="muted" title="decimals for this asset are not established, so we do not convert">${esc(l.price_atomic)} atomic</span>`;
  return `<span class="muted">unknown</span>`;
}

/**
 * Wording matters here. We parse a payment challenge, we do not complete a
 * payment, so nothing may claim an endpoint "works" end to end. "answers 402"
 * is exactly what we observed and nothing more.
 */
function badge(l: Listing): string {
  if (l.verdict === "payable") {
    const partial = (l.total_options ?? 0) > (l.usable_options ?? 0);
    return partial
      ? `<span class="b b-warn" title="${l.usable_options} of ${l.total_options} payment options are usable">answers 402, partial</span>`
      : `<span class="b b-ok" title="returned a payment challenge we could parse">answers 402</span>`;
  }
  if (l.verdict === "needs-params")
    return `<span class="b b-warn" title="live, but it wants request parameters before it quotes a price">needs params</span>`;
  if (l.verdict === "free")
    return `<span class="b b-ok" title="served content without asking for payment">no charge</span>`;
  if (l.verdict === "not-x402")
    return `<span class="b b-bad" title="HTTP ${l.http_status}">no payment challenge</span>`;
  if (l.verdict === "malformed")
    return `<span class="b b-bad" title="402 returned, but the requirements did not parse">402, unparseable</span>`;
  if (l.verdict === "skipped")
    return `<span class="b b-mute" title="${esc(l.notes)}">not probed</span>`;
  if (l.verdict === "unreachable" || l.verdict === "check-failed")
    return `<span class="b b-mute" title="we could not complete a check">check failed</span>`;
  return `<span class="b b-mute">${esc(l.verdict)}</span>`;
}

const CSS = `
:root{--bg:#fff;--fg:#14161a;--mute:#6b7280;--line:#e5e7eb;--card:#fafafa;
--ok:#0f7b3f;--okbg:#e7f6ec;--bad:#a4262c;--badbg:#fdeaea;--warn:#8a5a00;--warnbg:#fdf3e0;--accent:#1a4fd6}
@media(prefers-color-scheme:dark){:root{--bg:#0d0f12;--fg:#e8eaed;--mute:#9099a8;--line:#232830;--card:#14171c;
--ok:#5fd08a;--okbg:#10331f;--bad:#ff8a8a;--badbg:#3a1618;--warn:#ffc46b;--warnbg:#3a2a10;--accent:#7aa2ff}}
:root[data-theme=dark]{--bg:#0d0f12;--fg:#e8eaed;--mute:#9099a8;--line:#232830;--card:#14171c;
--ok:#5fd08a;--okbg:#10331f;--bad:#ff8a8a;--badbg:#3a1618;--warn:#ffc46b;--warnbg:#3a2a10;--accent:#7aa2ff}
:root[data-theme=light]{--bg:#fff;--fg:#14161a;--mute:#6b7280;--line:#e5e7eb;--card:#fafafa;
--ok:#0f7b3f;--okbg:#e7f6ec;--bad:#a4262c;--badbg:#fdeaea;--warn:#8a5a00;--warnbg:#fdf3e0;--accent:#1a4fd6}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);
font:15px/1.55 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.wrap{max-width:1120px;margin:0 auto;padding:0 20px}
header{border-bottom:1px solid var(--line);padding:26px 0 20px}
h1{margin:0;font-size:20px;letter-spacing:-.01em}
h1 a{color:inherit;text-decoration:none}
.tag{font:12px ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--mute)}
.lede{margin:10px 0 0;max-width:62ch;color:var(--mute)}
.stats{display:flex;flex-wrap:wrap;gap:8px;margin:18px 0 0;padding:0;list-style:none}
.stats li{background:var(--card);border:1px solid var(--line);border-radius:7px;padding:8px 12px;font-size:13px}
.stats b{font:15px ui-monospace,SFMono-Regular,Menlo,monospace}
form.filters{display:flex;flex-wrap:wrap;gap:8px;margin:22px 0 14px}
input,select{background:var(--bg);color:var(--fg);border:1px solid var(--line);
border-radius:7px;padding:8px 10px;font:14px inherit}
input[type=search]{flex:1;min-width:220px}
button{background:var(--accent);color:#fff;border:0;border-radius:7px;padding:8px 15px;font:14px inherit;cursor:pointer}
.scroll{overflow-x:auto;border:1px solid var(--line);border-radius:9px}
table{border-collapse:collapse;width:100%;min-width:760px;font-size:14px}
th,td{text-align:left;padding:10px 12px;border-bottom:1px solid var(--line);vertical-align:top}
th{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--mute);font-weight:600;
background:var(--card);position:sticky;top:0}
tr:last-child td{border-bottom:0}
td.ep{max-width:420px}
td.ep a{color:var(--fg);text-decoration:none;font-weight:600}
td.ep a:hover{color:var(--accent)}
td.ep div{color:var(--mute);font-size:12.5px;margin-top:2px;overflow-wrap:anywhere}
.mono{font:13px ui-monospace,SFMono-Regular,Menlo,monospace}
.muted{color:var(--mute)}
.b{display:inline-block;font-size:11.5px;font-weight:600;padding:2px 7px;border-radius:20px;white-space:nowrap}
.b-ok{background:var(--okbg);color:var(--ok)}
.b-bad{background:var(--badbg);color:var(--bad)}
.b-warn{background:var(--warnbg);color:var(--warn)}
.b-mute{background:var(--card);color:var(--mute);border:1px solid var(--line)}
.pager{display:flex;gap:10px;align-items:center;margin:16px 0 40px}
.pager a{color:var(--accent);text-decoration:none;border:1px solid var(--line);padding:7px 13px;border-radius:7px}
footer{border-top:1px solid var(--line);padding:20px 0 40px;color:var(--mute);font-size:13px}
footer a{color:var(--accent)}
.detail{margin:24px 0}
.kv{display:grid;grid-template-columns:190px 1fr;gap:8px 18px;margin:16px 0;font-size:14px}
.kv dt{color:var(--mute)}
.kv dd{margin:0;overflow-wrap:anywhere}
.note{background:var(--card);border:1px solid var(--line);border-left:3px solid var(--accent);
padding:12px 14px;border-radius:7px;margin:16px 0;font-size:13.5px}
a.back{color:var(--accent);text-decoration:none;font-size:14px}
`;

export function layout(title: string, body: string, desc: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<style>${CSS}</style></head><body>${body}
<footer><div class="wrap">
<p><strong>What "checked" means here.</strong> We send a real HTTP request from
<a href="https://api.the402.dev">the402 validator</a> and read what comes back. Where an
endpoint returns a payment challenge we parse it and report the price it quotes.
We do <em>not</em> complete a payment, so nothing on this page proves that paying
returns a resource. Endpoints with a templated path such as
<code>/tx/:hash</code> cannot be probed without inventing a value, so they are
listed as not probed rather than guessed at.</p>
<p>Endpoint list sourced from Coinbase's public
<a href="https://docs.cdp.coinbase.com/x402/bazaar">Bazaar</a> discovery API. Descriptions are
the providers' own words unless marked otherwise.
<a href="/api/listings">JSON API</a> &middot; <a href="/submit">Submit an endpoint</a></p>
</div></footer></body></html>`;
}

export function indexPage(
  rows: Listing[],
  stats: Stats,
  q: Record<string, string>,
  page: number,
  totalMatched: number,
  perPage: number,
): string {
  const sel = (name: string, v: string) => (q[name] === v ? " selected" : "");
  const deadPct = stats.total ? ((stats.dead / stats.total) * 100).toFixed(1) : "0";

  const body = `<header><div class="wrap">
<h1><a href="/">the402</a> <span class="tag">x402 endpoint directory</span></h1>
<p class="lede">Every x402 endpoint we can find, each one called to see what it actually
answers and what it quotes. Other directories list what providers claim. This one reports what
the endpoint did when we asked it, and says plainly where we could not tell.</p>
<ul class="stats">
<li><b>${stats.total}</b> endpoints</li>
<li><b>${stats.payable}</b> answer 402</li>
<li><b>${stats.needsParams}</b> need parameters first</li>
<li><b>${stats.free}</b> serve without charging</li>
<li><b>${stats.dead}</b> no payment challenge <span class="muted">(${deadPct}%)</span></li>
<li><b>${stats.needsPost}</b> only answer to POST</li>
</ul>
${stats.verifiedOn ? `<p class="tag">Last verified ${esc(stats.verifiedOn)}. We parse the payment challenge, we do not complete a payment.</p>` : ""}
</div></header>
<main class="wrap">
<form class="filters" method="get" action="/">
<input type="search" name="q" placeholder="Search endpoint, host or description" value="${esc(q.q ?? "")}">
<select name="verdict">
<option value=""${sel("verdict", "")}>Any status</option>
<option value="payable"${sel("verdict", "payable")}>Payable</option>
<option value="not-x402"${sel("verdict", "not-x402")}>Not payable</option>
<option value="skipped"${sel("verdict", "skipped")}>Not probeable</option>
</select>
<select name="network">
<option value="">Any network</option>
${stats.networks
  .map((n) => `<option value="${esc(n.network)}"${sel("network", n.network)}>${esc(n.network)} (${n.n})</option>`)
  .join("")}
</select>
<select name="sort">
<option value="price"${sel("sort", "price")}>Cheapest first</option>
<option value="recent"${sel("sort", "recent")}>Recently checked</option>
<option value="host"${sel("sort", "host")}>By host</option>
</select>
<button type="submit">Filter</button>
</form>

<div class="scroll"><table>
<thead><tr><th>Endpoint</th><th>Status</th><th>Price</th><th>Network</th><th>Spec</th><th>Checked</th></tr></thead>
<tbody>
${
    rows.length === 0
      ? `<tr><td colspan="6" class="muted" style="padding:26px">No endpoints match that filter.</td></tr>`
      : rows
          .map(
            (l) => `<tr>
<td class="ep"><a href="/e/${esc(l.id)}">${esc(l.name || l.host)}</a>
<div>${esc((l.description || l.resource).slice(0, 118))}</div></td>
<td>${badge(l)}</td>
<td class="mono">${price(l)}</td>
<td class="mono">${esc(l.network ?? "-")}</td>
<td class="mono">${l.dialect ? esc(l.dialect) : "-"}${l.method_used ? ` <span class="muted">${esc(l.method_used)}</span>` : ""}</td>
<td class="muted mono">${ago(l.verified_at)}</td>
</tr>`,
          )
          .join("")
  }
</tbody></table></div>

<div class="pager">
<span class="muted">${totalMatched} matching, page ${page + 1} of ${Math.max(1, Math.ceil(totalMatched / perPage))}</span>
${page > 0 ? `<a href="?${new URLSearchParams({ ...q, page: String(page - 1) })}">Previous</a>` : ""}
${(page + 1) * perPage < totalMatched ? `<a href="?${new URLSearchParams({ ...q, page: String(page + 1) })}">Next</a>` : ""}
</div>
</main>`;

  return layout(
    "the402, x402 endpoint directory",
    body,
    `${stats.payable} x402 endpoints that answer with a payment challenge, each called directly, with the price they quote, network and spec dialect.`,
  );
}

export function detailPage(l: Listing): string {
  const partial = (l.total_options ?? 0) > (l.usable_options ?? 0);
  const body = `<header><div class="wrap">
<h1><a href="/">the402</a> <span class="tag">endpoint detail</span></h1>
</div></header>
<main class="wrap"><div class="detail">
<a class="back" href="/">&larr; All endpoints</a>
<h2 style="margin:14px 0 4px">${esc(l.name || l.host)}</h2>
<p class="mono muted" style="margin:0;overflow-wrap:anywhere">${esc(l.resource)}</p>
<p style="margin:14px 0 0">${badge(l)}</p>
${l.description ? `<p class="lede" style="color:var(--fg)">${esc(l.description)}</p>` : ""}

${
    l.verdict === "payable"
      ? `<div class="note">We sent a real <code>${esc(l.method_used)}</code> request to this endpoint and it
answered <code>402</code> with payment requirements we could parse.
${partial ? `It advertises ${l.total_options} ways to pay and only ${l.usable_options} of them are usable.` : ""}</div>`
      : l.verdict === "skipped"
        ? `<div class="note">We did not probe this one. ${esc(l.notes ?? "")}</div>`
        : `<div class="note">Bazaar lists this endpoint, but when we called it we got
<code>HTTP ${esc(l.http_status)}</code> instead of a payment challenge.</div>`
  }

<dl class="kv">
<dt>Price</dt><dd class="mono">${price(l)}</dd>
<dt>Network</dt><dd class="mono">${esc(l.network ?? "not established")}</dd>
<dt>Pay to</dt><dd class="mono">${esc(l.pay_to ?? "-")}</dd>
<dt>Spec dialect</dt><dd class="mono">${esc(l.dialect ?? "-")}${l.declared_version ? ` <span class="muted">(declares x402Version ${l.declared_version})</span>` : ""}</dd>
<dt>Transport</dt><dd class="mono">${esc(l.transport ?? "-")}</dd>
<dt>HTTP method</dt><dd class="mono">${esc(l.method_used ?? "-")}</dd>
<dt>Response latency</dt><dd class="mono">${l.latency_ms !== null ? `${l.latency_ms} ms` : "-"}</dd>
<dt>Payment options</dt><dd class="mono">${l.usable_options ?? 0} usable of ${l.total_options ?? 0}</dd>
<dt>Last checked</dt><dd class="mono">${esc(l.verified_at ?? "never")} <span class="muted">(${ago(l.verified_at)})</span></dd>
<dt>Category</dt><dd class="mono">${esc(l.category ?? "-")}</dd>
</dl>

<p class="muted" style="font-size:13px">Re-check it yourself:<br>
<code class="mono">curl "https://api.the402.dev/validate?url=${esc(encodeURIComponent(l.resource))}"</code></p>
</div></main>`;

  return layout(
    `${l.name || l.host} — the402`,
    body,
    `${l.resource}: ${l.verdict}. ${l.price_usd !== null ? `$${l.price_usd} on ${l.network}.` : ""} Verified by real request.`,
  );
}

export function submitPage(message: string | null, ok: boolean, listingId: string | null = null): string {
  const body = `<header><div class="wrap">
<h1><a href="/">the402</a> <span class="tag">submit an endpoint</span></h1>
</div></header>
<main class="wrap"><div class="detail">
<a class="back" href="/">&larr; All endpoints</a>
<h2 style="margin:14px 0 8px">Submit an x402 endpoint</h2>
<p class="lede">Paste the payable URL. We run it through the validator before it appears, so if it
does not answer with a parseable 402 it will not be listed. Nothing gets a badge it did not earn.</p>
${
    message
      ? `<div class="note" style="border-left-color:${ok ? "var(--ok)" : "var(--bad)"}">${esc(message)}${
          listingId ? ` <a href="/e/${esc(listingId)}">See the listing</a>.` : ""
        }</div>`
      : ""
  }
<form method="post" action="/submit" class="filters" style="flex-direction:column;align-items:stretch;max-width:560px">
<input type="url" name="resource" required placeholder="https://api.example.com/endpoint" style="width:100%">
<input type="text" name="note" placeholder="Anything we should know (optional)" style="width:100%">
<button type="submit" style="align-self:flex-start">Submit for verification</button>
</form>
</div></main>`;
  return layout("Submit an endpoint — the402", body, "Submit an x402 endpoint to the402 directory. Verified before listing.");
}
