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
<p class="tag"><a href="/tools">Search what these servers can do</a> &middot; <a href="/posts/mcp-registry-measurement">read the measurement</a></p>
${stats.checkedOn ? `<p class="tag">Last checked ${esc(stats.checkedOn)}. We send a handshake, we do not authenticate and we do not call a tool.</p>` : ""}
</div></header>
<div class="wrap">
<ul class="stats">
<li><b>${stats.answers.toLocaleString()}</b> answer a handshake <span class="muted">(${pct(stats.answers)}%)</span></li>
<li><b>${stats.gated.toLocaleString()}</b> gated, not broken <span class="muted">(${pct(stats.gated)}%)</span></li>
<li><b>${stats.failing.toLocaleString()}</b> failed outright <span class="muted">(${pct(stats.failing)}%)</span></li>
<li><b>${stats.toolsIndexed.toLocaleString()}</b> tools indexed</li>
</ul>

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
<td class="ep"><a href="/mcp/${esc(r.id)}">${esc(r.server_name || r.name || r.url)}</a>
<div>${esc(r.url)}</div></td>
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

/**
 * The tool index.
 *
 * Registries list servers. None of them lists what those servers can do,
 * because listing a server is not the same as calling it. We called 16,923 and
 * asked each one what it exposes, so this is the join nobody else holds.
 *
 * Only tools present on two or more servers get their own page. A page per
 * one-off name would be 27,000 pages of nothing.
 */
export interface ToolRow {
  slug: string;
  tool: string;
  servers: number;
  hosts: number;
}

export interface ToolServerRow {
  tool: string;
  url: string;
  id: string;
  server_name: string | null;
  verdict: string;
  tool_count: number | null;
}

export function toolsIndexPage(rows: ToolRow[], q: string, total: number, page: number, perPage: number): string {
  const body = `<header><div class="wrap">
<h1>What MCP servers can actually do</h1>
<p class="lede">${total.toLocaleString()} tool names, each one reported by a server that
answered our handshake. Registries tell you a server exists. This tells you
what it exposes.</p>
<p class="note">Ordered by how many separate <strong>hosts</strong> expose a
tool, not how many listings. One operator running a thousand servers that all
share a toolkit would otherwise fill this entire page, and did before we
changed it.</p>
<p class="tag"><a href="/mcp">Back to the server directory</a></p>
</div></header>
<div class="wrap">
<form class="filters" method="get" action="/tools">
<input type="search" name="q" value="${esc(q)}" placeholder="search tool names, for example: schema, invoice, screenshot">
<button type="submit">search</button>
</form>
<p class="muted">${total.toLocaleString()} matching.</p>
<div class="scroll"><table>
<thead><tr><th>tool</th><th>hosts</th><th>listings</th></tr></thead>
<tbody>
${rows.map((r) => `<tr>
<td class="ep"><a href="/tools/${esc(r.slug)}"><code>${esc(r.tool)}</code></a></td>
<td class="mono">${r.hosts}</td>
<td class="mono muted">${r.servers}</td>
</tr>`).join("\n")}
</tbody></table></div>
<div class="pager">
${page > 0 ? `<a href="/tools?q=${encodeURIComponent(q)}&page=${page - 1}">previous</a>` : ""}
<span class="muted">page ${page + 1}</span>
${(page + 1) * perPage < total ? `<a href="/tools?q=${encodeURIComponent(q)}&page=${page + 1}">next</a>` : ""}
</div>
</div>`;
  return layout(
    q ? `MCP tools matching "${q}" — the402` : "What MCP servers can actually do — the402",
    body,
    `${total.toLocaleString()} MCP tool names, each reported by a server we called directly.`,
  );
}

export function toolDetailPage(tool: string, rows: ToolServerRow[]): string {
  const answering = rows.filter((r) => r.verdict === "answers-mcp");
  const body = `<div class="wrap">
<a class="back" href="/tools">Back to the tool index</a>
<h1><code>${esc(tool)}</code></h1>
<p class="lede">${rows.length} server${rows.length === 1 ? "" : "s"} reported a tool by this
name when we called them. Names are chosen by whoever wrote the server, so two
tools sharing a name do not have to do the same thing. We record what was
reported, not what it does.</p>
<div class="scroll"><table>
<thead><tr><th>server</th><th>result when we called it</th><th>tools</th></tr></thead>
<tbody>
${rows.map((r) => `<tr>
<td class="ep"><a href="/mcp/${esc(r.id)}">${esc(r.server_name || r.url)}</a>
<div>${esc(r.url)}</div></td>
<td class="mono">${esc(r.verdict)}</td>
<td class="mono">${r.tool_count ?? ""}</td>
</tr>`).join("\n")}
</tbody></table></div>
<p class="note">${answering.length} of these answered an MCP handshake on the day we
checked. That is not a promise the tool works, only that the server was running
and told us the tool existed.</p>
</div>`;
  return layout(
    `${tool} — which MCP servers expose it — the402`,
    body,
    `${rows.length} MCP servers report a tool named ${tool}. Each was called directly and dated.`,
  );
}
