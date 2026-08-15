/**
 * the402 directory.
 *
 * Serves the listing index, per-endpoint detail pages, a JSON API for agents,
 * and a submission form that verifies before it lists.
 */

import { detailPage, indexPage, submitPage, type Listing, type Stats } from "./render";

interface Env {
  DB: D1Database;
}

const PER_PAGE = 50;
const VALIDATOR = "https://api.the402.dev/validate";

/**
 * Numbers from the query string get interpolated into SQL. They cannot carry
 * an injection because they are coerced, but Number("abc") is NaN, and a
 * LIMIT of NaN returned a 500 that leaked the raw SQLite error to the caller.
 */
function clampInt(raw: string | null, fallback: number, min: number, max: number): number {
  const value = Number(raw ?? fallback);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.trunc(value), min), max);
}

async function getStats(db: D1Database): Promise<Stats> {
  const [totals, networks] = await Promise.all([
    db
      .prepare(
        `SELECT
           COUNT(*)                                                        AS total,
           SUM(verdict = 'payable')                                        AS payable,
           SUM(verdict IN ('not-x402','malformed'))                        AS dead,
           SUM(verdict = 'skipped')                                        AS unprobeable,
           SUM(verdict = 'payable' AND method_used = 'POST')               AS needsPost,
           SUM(verdict = 'payable' AND total_options > usable_options)     AS partiallyBroken,
           SUM(verdict = 'needs-params')                                   AS needsParams,
           SUM(verdict = 'free')                                           AS free,
           MAX(verified_at)                                                AS verifiedOn
         FROM listings`,
      )
      .first<Record<string, number>>(),
    db
      .prepare(
        `SELECT network, COUNT(*) AS n FROM listings
         WHERE network IS NOT NULL GROUP BY network ORDER BY n DESC LIMIT 12`,
      )
      .all<{ network: string; n: number }>(),
  ]);

  const verifiedOn = (totals?.verifiedOn as unknown as string) ?? null;
  return {
    total: Number(totals?.total ?? 0),
    payable: Number(totals?.payable ?? 0),
    dead: Number(totals?.dead ?? 0),
    unprobeable: Number(totals?.unprobeable ?? 0),
    needsPost: Number(totals?.needsPost ?? 0),
    partiallyBroken: Number(totals?.partiallyBroken ?? 0),
    needsParams: Number(totals?.needsParams ?? 0),
    free: Number(totals?.free ?? 0),
    verifiedOn: verifiedOn ? verifiedOn.slice(0, 10) : null,
    networks: networks.results ?? [],
  };
}

function buildQuery(params: URLSearchParams) {
  const where: string[] = [];
  const binds: unknown[] = [];

  const q = (params.get("q") ?? "").trim();
  if (q) {
    where.push("(resource LIKE ?1 OR description LIKE ?1 OR host LIKE ?1 OR name LIKE ?1)");
    binds.push(`%${q}%`);
  }

  const verdict = params.get("verdict") ?? "";
  if (verdict) {
    where.push(`verdict = ?${binds.length + 1}`);
    binds.push(verdict);
  }

  const network = params.get("network") ?? "";
  if (network) {
    where.push(`network = ?${binds.length + 1}`);
    binds.push(network);
  }

  const sort = params.get("sort") ?? "price";
  const order =
    sort === "recent"
      ? "verified_at DESC"
      : sort === "host"
        ? "host ASC, resource ASC"
        : // Cheapest first, but keep unpriced entries at the end rather than
          // letting NULL sort to the top and look like free endpoints.
          "CASE WHEN price_usd IS NULL THEN 1 ELSE 0 END, price_usd ASC";

  return { clause: where.length ? `WHERE ${where.join(" AND ")}` : "", binds, order };
}

/**
 * Must produce byte-identical ids to slugify() in scripts/import_to_d1.py,
 * otherwise a submitted endpoint and the same endpoint arriving later via the
 * harvest would land as two rows for one service.
 */
async function slugify(url: string): Promise<string> {
  const parsed = new URL(url);
  const raw = (parsed.host + parsed.pathname).toLowerCase();
  const slug = raw.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "endpoint";
  if (slug.length <= 80) return slug;
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(url));
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 8);
  return slug.slice(0, 71) + "-" + hex;
}

/** Verdicts that earn a place in the directory. */
const LISTABLE = new Set(["payable", "needs-params", "free", "malformed"]);

interface ValidatorResult {
  verdict?: string;
  summary?: string;
  http?: { status?: number; latencyMs?: number; methodUsed?: string };
  spec?: { transport?: string; declaredVersion?: number; amountField?: string };
  accepts?: Array<Record<string, unknown>>;
  checkedAt?: string;
  problems?: Array<{ severity?: string }>;
}

/**
 * Write a verified submission straight into the directory. The submit page
 * promises the endpoint will appear, so it has to actually appear.
 */
async function promote(db: D1Database, resource: string, result: ValidatorResult): Promise<string> {
  const id = await slugify(resource);
  const host = new URL(resource).host.toLowerCase();
  const accepts = result.accepts ?? [];
  const usable = accepts.filter((a) => a.usable);
  const first = (usable[0] ?? accepts[0] ?? {}) as Record<string, unknown>;
  const errors = (result.problems ?? []).filter((p) => p.severity === "error").length;
  const dialect =
    result.spec?.amountField === "maxAmountRequired" ? "v1" : result.spec?.amountField === "amount" ? "v2" : null;

  await db
    .prepare(
      `INSERT OR REPLACE INTO listings
       (id, resource, host, name, description, category, verdict, method_used, http_status,
        latency_ms, dialect, transport, declared_version, network, price_usd, price_atomic,
        pay_to, usable_options, total_options, error_count, source, on_cloudflare,
        verified_at, first_seen)
       VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21,?22,?23,?24)`,
    )
    .bind(
      id,
      resource,
      host,
      host,
      result.summary ?? null,
      "other",
      result.verdict ?? "check-failed",
      result.http?.methodUsed ?? null,
      result.http?.status ?? null,
      result.http?.latencyMs ?? null,
      dialect,
      result.spec?.transport ?? null,
      result.spec?.declaredVersion ?? null,
      (first.networkCanonical as string) ?? null,
      (first.priceUsd as number) ?? null,
      (first.amountAtomic as string) ?? null,
      (first.payTo as string) ?? null,
      usable.length,
      accepts.length,
      errors,
      "submission",
      host.endsWith(".workers.dev") ? 1 : 0,
      result.checkedAt ?? new Date().toISOString(),
      new Date().toISOString(),
    )
    .run();

  return id;
}

const json = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: { "access-control-allow-origin": "*", "cache-control": "public, max-age=60" },
  });

const html = (body: string, status = 200) =>
  new Response(body, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=60" },
  });

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === "/robots.txt") {
        return new Response(`User-agent: *\nAllow: /\nSitemap: https://the402.dev/sitemap.xml\n`, {
          headers: { "content-type": "text/plain" },
        });
      }

      if (path === "/sitemap.xml") {
        const { results } = await env.DB.prepare(
          `SELECT id FROM listings WHERE verdict = 'payable' ORDER BY id LIMIT 5000`,
        ).all<{ id: string }>();
        const urls = [
          "https://the402.dev/",
          "https://the402.dev/submit",
          ...(results ?? []).map((r) => `https://the402.dev/e/${r.id}`),
        ];
        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
            urls.map((u) => `<url><loc>${u}</loc></url>`).join("\n") +
            `\n</urlset>`,
          { headers: { "content-type": "application/xml" } },
        );
      }

      // Agent-readable view of the same data the HTML pages show.
      if (path === "/api/listings") {
        const { clause, binds, order } = buildQuery(url.searchParams);
        const limit = clampInt(url.searchParams.get("limit"), 100, 1, 500);
        const offset = clampInt(url.searchParams.get("offset"), 0, 0, 1_000_000);
        const { results } = await env.DB.prepare(
          `SELECT * FROM listings ${clause} ORDER BY ${order} LIMIT ${limit} OFFSET ${offset}`,
        )
          .bind(...binds)
          .all<Listing>();
        const total = await env.DB.prepare(`SELECT COUNT(*) AS n FROM listings ${clause}`)
          .bind(...binds)
          .first<{ n: number }>();
        return json({
          note: "Every entry was verified by a real HTTP request from api.the402.dev.",
          total: total?.n ?? 0,
          limit,
          offset,
          items: results ?? [],
        });
      }

      if (path === "/api/stats") {
        return json(await getStats(env.DB));
      }

      if (path === "/submit") {
        if (request.method === "POST") {
          const form = await request.formData();
          const resource = String(form.get("resource") ?? "").trim();
          const note = String(form.get("note") ?? "").slice(0, 300);

          if (!resource.startsWith("https://")) {
            return html(submitPage("That needs to be an https:// URL.", false), 400);
          }

          // Verify before recording anything, so an unchecked entry can never
          // reach the directory.
          let result: ValidatorResult = {};
          try {
            const res = await fetch(`${VALIDATOR}?url=${encodeURIComponent(resource)}`, {
              signal: AbortSignal.timeout(25_000),
            });
            result = (await res.json()) as ValidatorResult;
          } catch {
            /* leave empty, treated as check-failed below */
          }
          const verdict = result.verdict ?? "check-failed";
          const listable = LISTABLE.has(verdict);

          // Publish it now. The old code only ever wrote to a submissions
          // table that nothing read, so the page promised a listing that
          // could never arrive.
          let listingId: string | null = null;
          if (listable) {
            try {
              listingId = await promote(env.DB, resource, result);
            } catch {
              listingId = null;
            }
          }

          await env.DB.prepare(
            `INSERT INTO submissions (resource, note, submitted_at, status, verdict)
             VALUES (?1, ?2, ?3, ?4, ?5)`,
          )
            .bind(resource, note, new Date().toISOString(), listingId ? "listed" : "rejected", verdict)
            .run();

          const message = listingId
            ? `Verified and listed. We called it and it ${
                verdict === "payable" ? "answered with a payment challenge we could parse" :
                verdict === "needs-params" ? "is live but wants request parameters before it quotes a price" :
                verdict === "free" ? "is live but served content without asking for payment" :
                "answered 402, though the payment requirements did not parse cleanly"
              }.`
            : `Recorded, but not listed. Our check returned "${verdict}", so there is nothing to show yet. Fix the endpoint and submit it again.`;
          return html(submitPage(message, Boolean(listingId), listingId));
        }
        return html(submitPage(null, false));
      }

      if (path.startsWith("/e/")) {
        const id = decodeURIComponent(path.slice(3));
        const row = await env.DB.prepare(`SELECT * FROM listings WHERE id = ?1`).bind(id).first<Listing>();
        if (!row) return html(`<p style="font:16px system-ui;padding:40px">Not found. <a href="/">Back to the directory</a>.</p>`, 404);
        return html(detailPage(row));
      }

      if (path === "/") {
        const { clause, binds, order } = buildQuery(url.searchParams);
        const page = clampInt(url.searchParams.get("page"), 0, 0, 100_000);
        const [rowsRes, countRes, stats] = await Promise.all([
          env.DB.prepare(`SELECT * FROM listings ${clause} ORDER BY ${order} LIMIT ${PER_PAGE} OFFSET ${page * PER_PAGE}`)
            .bind(...binds)
            .all<Listing>(),
          env.DB.prepare(`SELECT COUNT(*) AS n FROM listings ${clause}`)
            .bind(...binds)
            .first<{ n: number }>(),
          getStats(env.DB),
        ]);

        const q: Record<string, string> = {};
        for (const k of ["q", "verdict", "network", "sort"]) {
          const v = url.searchParams.get(k);
          if (v) q[k] = v;
        }
        return html(indexPage(rowsRes.results ?? [], stats, q, page, countRes?.n ?? 0, PER_PAGE));
      }

      return html(`<p style="font:16px system-ui;padding:40px">Not found. <a href="/">Back to the directory</a>.</p>`, 404);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return json({ error: "directory error", message }, 500);
    }
  },
} satisfies ExportedHandler<Env>;
