/**
 * The MCP half of the directory.
 *
 * Same discipline as the x402 side. The one rule that shapes every function
 * here: `auth-required` is not a failure. Those servers are running and want a
 * credential we do not have. 30% of the registry lands there, so any UI that
 * lumps them in with the dead ones is wrong about a third of the data.
 *
 * A server "answers an MCP handshake". It never "works" and it is never
 * "verified".
 */
import { esc, layout } from "./render";

export interface McpServer {
  id: string;
  name: string | null;
  url: string;
  host: string | null;
  transport: string | null;
  verdict: string;
  http_status: number | null;
  latency_ms: number | null;
  server_name: string | null;
  server_version: string | null;
  protocol_version: string | null;
  tool_count: number | null;
  tool_names: string | null;
  errors: string | null;
  checked_at: string | null;
}

export interface McpStats {
  total: number;
  answers: number;
  gated: number;
  failing: number;
  hosts: number;
  toolsIndexed: number;
  checkedOn: string | null;
}

/** Verdicts that mean the server did not answer and is not merely gated. */
export const FAILING = [
  "not-found", "unreachable", "server-error",
  "not-mcp", "bad-request", "jsonrpc-error", "probe-error",
];

const LABEL: Record<string, string> = {
  "answers-mcp": "answers a handshake",
  "auth-required": "gated, needs a credential",
  "not-found": "404",
  "unreachable": "unreachable",
  "server-error": "server error",
  "not-mcp": "answered, not MCP",
  "bad-request": "bad request",
  "jsonrpc-error": "JSON-RPC error",
  "probe-error": "we could not determine",
};

/** Gated servers get their own colour. They are not failures. */
function badge(verdict: string): string {
  const cls =
    verdict === "answers-mcp" ? "b b-ok"
    : verdict === "auth-required" ? "b b-warn"
    : verdict === "probe-error" ? "b b-mute"
    : "b b-bad";
  return `<span class="${cls}">${esc(LABEL[verdict] ?? verdict)}</span>`;
}

export function buildMcpQuery(params: URLSearchParams) {
  const where: string[] = [];
  const binds: unknown[] = [];

  const q = (params.get("q") ?? "").trim();
  if (q) {
    where.push("(url LIKE ?1 OR name LIKE ?1 OR server_name LIKE ?1 OR host LIKE ?1)");
    binds.push(`%${q}%`);
  }

  const verdict = params.get("verdict") ?? "";
  if (verdict === "failing") {
    // One filter for "did not answer and is not gated", so a reader can look
    // at the broken set without us pretending gated belongs in it.
    where.push(`verdict IN (${FAILING.map((_, i) => `?${binds.length + i + 1}`).join(",")})`);
    binds.push(...FAILING);
  } else if (verdict) {
    where.push(`verdict = ?${binds.length + 1}`);
    binds.push(verdict);
  }

  const host = params.get("host") ?? "";
  if (host) {
    where.push(`host = ?${binds.length + 1}`);
    binds.push(host);
  }

  const minTools = Number(params.get("minTools"));
  if (Number.isFinite(minTools) && minTools > 0) {
    where.push(`tool_count >= ?${binds.length + 1}`);
    binds.push(Math.trunc(minTools));
  }

  const sort = params.get("sort") ?? "tools";
  const order =
    sort === "recent" ? "checked_at DESC"
    : sort === "host" ? "host ASC, url ASC"
    // Most tools first, and servers with no tool count sort last rather than
    // sitting at the top looking like zero.
    : "CASE WHEN tool_count IS NULL THEN 1 ELSE 0 END, tool_count DESC";

  return { clause: where.length ? `WHERE ${where.join(" AND ")}` : "", binds, order };
}

function toolList(row: McpServer): string[] {
  if (!row.tool_names) return [];
  try {
    const parsed = JSON.parse(row.tool_names);
    return Array.isArray(parsed) ? parsed.filter((t) => typeof t === "string") : [];
  } catch {
    return [];
  }
}

export function mcpIndexPage(
  rows: McpServer[], stats: McpStats, q: Record<string, string>,
  page: number, total: number, perPage: number,
): string {
  const pct = (n: number) => (stats.total ? ((100 * n) / stats.total).toFixed(1) : "0.0");
  const qs = (over: Record<string, string>) => {
    const p = new URLSearchParams({ ...q, ...over });
    for (const [k, v] of [...p]) if (!v) p.delete(k);
    const s = p.toString();
    return s ? `/mcp?${s}` : "/mcp";
  };

  const body = `<header><div class="wrap">
<h1>MCP servers, called rather than listed</h1>
<p class="lede">Every remote server in the official MCP registry, sent one real
<code>initialize</code> handshake. ${stats.total.toLocaleString()} servers across
${stats.hosts.toLocaleString()} hosts.</p>
${stats.checkedOn ? `<p class="tag">Last checked ${esc(stats.checkedOn)}. We send a handshake, we do not authenticate and we do not call a tool.</p>` : ""}
</div></header>
<div class="wrap">
<div class="stats">
<div class="kv"><strong>${stats.answers.toLocaleString()}</strong><span>answer a handshake (${pct(stats.answers)}%)</span></div>
<div class="kv"><strong>${stats.gated.toLocaleString()}</strong><span>gated, not broken (${pct(stats.gated)}%)</span></div>
<div class="kv"><strong>${stats.failing.toLocaleString()}</strong><span>failed outright (${pct(stats.failing)}%)</span></div>
<div class="kv"><strong>${stats.toolsIndexed.toLocaleString()}</strong><span>tools indexed</span></div>
</div>

<p class="note"><strong>Gated is not broken.</strong> ${stats.gated.toLocaleString()} of these
servers answer with a 401 or 403. They are running and want a credential we do
not have. A checker that treats them as dead is wrong about
${pct(stats.gated)}% of the registry before it starts, so we count them
separately and always will.</p>

<form class="filters" method="get" action="/mcp">
<input type="search" name="q" value="${esc(q.q ?? "")}" placeholder="search url, name or server">
<select name="verdict">
<option value="">any result</option>
<option value="answers-mcp"${q.verdict === "answers-mcp" ? " selected" : ""}>answers a handshake</option>
<option value="auth-required"${q.verdict === "auth-required" ? " selected" : ""}>gated</option>
<option value="failing"${q.verdict === "failing" ? " selected" : ""}>failed outright</option>
</select>
<select name="sort">
<option value="tools"${q.sort === "tools" ? " selected" : ""}>most tools</option>
<option value="host"${q.sort === "host" ? " selected" : ""}>by host</option>
<option value="recent"${q.sort === "recent" ? " selected" : ""}>most recently checked</option>
</select>
<button type="submit">filter</button>
</form>

<p class="muted">${total.toLocaleString()} matching.</p>

<div class="scroll"><table>
<thead><tr><th>server</th><th>result</th><th>tools</th><th>host</th></tr></thead>
<tbody>
${rows.map((r) => `<tr>
<td><a href="/mcp/${esc(r.id)}">${esc(r.server_name || r.name || r.url)}</a><div class="mono muted">${esc(r.url)}</div></td>
<td>${badge(r.verdict)}</td>
<td class="mono">${r.tool_count === null ? "<span class=\"muted\">not listed</span>" : r.tool_count}</td>
<td class="mono muted">${esc(r.host ?? "")}</td>
</tr>`).join("\n")}
</tbody></table></div>

<div class="pager">
${page > 0 ? `<a href="${qs({ page: String(page - 1) })}">previous</a>` : ""}
<span class="muted">page ${page + 1}</span>
${(page + 1) * perPage < total ? `<a href="${qs({ page: String(page + 1) })}">next</a>` : ""}
</div>
</div>`;

  return layout(
    "MCP servers, called rather than listed — the402",
    body,
    `${stats.answers.toLocaleString()} of ${stats.total.toLocaleString()} listed MCP servers answer a handshake. ${stats.gated.toLocaleString()} are gated, which is not the same as broken.`,
  );
}

export function mcpDetailPage(r: McpServer): string {
  const tools = toolList(r);
  let errors: { severity?: string; field?: string; message?: string }[] = [];
  try {
    const parsed = r.errors ? JSON.parse(r.errors) : [];
    if (Array.isArray(parsed)) errors = parsed;
  } catch {
    errors = [];
  }

  const body = `<div class="wrap">
<a class="back" href="/mcp">Back to MCP servers</a>
<h1>${esc(r.server_name || r.name || r.url)}</h1>
<p class="mono">${esc(r.url)}</p>
<p>${badge(r.verdict)}</p>

<dl class="detail">
<dt>Registry name</dt><dd class="mono">${esc(r.name ?? "not given")}</dd>
<dt>Reports itself as</dt><dd class="mono">${esc(r.server_name ?? "not given")}${r.server_version ? ` ${esc(r.server_version)}` : ""}</dd>
<dt>Protocol version</dt><dd class="mono">${esc(r.protocol_version ?? "not given")}</dd>
<dt>Transport</dt><dd class="mono">${esc(r.transport ?? "not given")}</dd>
<dt>HTTP status</dt><dd class="mono">${r.http_status ?? "no response"}</dd>
<dt>Latency</dt><dd class="mono">${r.latency_ms !== null ? `${r.latency_ms} ms` : "not measured"}</dd>
<dt>Tools</dt><dd class="mono">${r.tool_count === null ? "not listed" : r.tool_count}</dd>
<dt>Checked</dt><dd class="mono">${esc(r.checked_at ?? "")}</dd>
</dl>

${r.verdict === "auth-required" ? `<p class="note"><strong>This server is gated, not broken.</strong> It
answered our handshake with a ${r.http_status} and wants a credential we do not
have. We do not authenticate against anyone's server, so we cannot say what it
exposes. We can only say it is running.</p>` : ""}

${tools.length ? `<h2>Tools it reports</h2>
<div class="scroll"><ul class="ep">${tools.map((t) => `<li class="mono">${esc(t)}</li>`).join("")}</ul></div>
${r.tool_count !== null && r.tool_count > tools.length ? `<p class="muted">Showing ${tools.length} of ${r.tool_count}.</p>` : ""}` : ""}

${errors.length ? `<h2>What we observed</h2>
<ul class="ep">${errors.map((e) => `<li><span class="mono muted">${esc(e.severity ?? "note")}</span> ${esc(e.field ?? "")}: ${esc(e.message ?? "")}</li>`).join("")}</ul>` : ""}

<h2>Check it yourself</h2>
<div class="scroll"><pre class="mono">curl -s -X POST ${esc(r.url)} \\
  -H 'Content-Type: application/json' \\
  -H 'Accept: application/json, text/event-stream' \\
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"you","version":"0"}}}'</pre></div>
</div>`;

  return layout(
    `${r.server_name || r.name || r.url} — MCP server — the402`,
    body,
    `${r.url} ${r.verdict === "answers-mcp" ? "answers an MCP handshake" : r.verdict === "auth-required" ? "is gated behind a credential" : "did not answer an MCP handshake"}. Checked ${r.checked_at ?? ""}.`,
  );
}
