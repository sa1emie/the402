/**
 * the402 API: the x402 endpoint validator.
 *
 * Give it a URL. It tells you whether that URL is a real, working, payable
 * x402 endpoint, which dialect of the spec it speaks, and what it charges.
 */

import { parsePaymentRequired, type ParseResult, type Problem } from "./x402";

interface Env {}

const FETCH_TIMEOUT_MS = 10_000;
const USER_AGENT = "the402-validator/0.2 (+https://the402.dev)";
/** A GET against a POST-only endpoint yields these. Worth one retry. */
const METHOD_MISMATCH_CODES = [404, 405, 501];
/**
 * "You called me correctly but did not say what you wanted." These are NOT
 * dead endpoints. Treating them as dead mislabelled roughly 200 live services
 * in the first full run, which is what this whole path exists to prevent.
 */
const PARAM_ERROR_CODES = [400, 422];

/**
 * This endpoint fetches URLs supplied by strangers, so it must not become a
 * probe for private networks. Hostname checks first, then a literal-IP check.
 */
const BLOCKED_HOSTNAMES = new Set([
  "localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]",
  "metadata.google.internal", "169.254.169.254",
]);

const PRIVATE_IPV4 =
  /^(10\.|127\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;

function rejectReason(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return "not a valid URL";
  }
  if (url.protocol !== "https:") return "only https:// URLs are accepted";
  const host = url.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(host)) return "that host is not reachable from this service";
  if (PRIVATE_IPV4.test(host)) return "private and loopback addresses are not allowed";
  if (host.endsWith(".internal") || host.endsWith(".local")) return "internal hostnames are not allowed";
  return null;
}

type Verdict = "payable" | "malformed" | "not-x402" | "needs-params" | "free" | "unreachable";

interface Attempt {
  method: string;
  status: number | null;
  latencyMs: number;
  error: string | null;
  /** Set when this attempt used parameters recovered from an error body. */
  usedExample?: boolean;
}

interface ParamHint {
  /** The field the server said was missing, when we could pick it out. */
  field: string | null;
  /** A worked example some servers hand back, which we retry with. */
  example: Record<string, unknown> | null;
  message: string | null;
}

interface ValidateResponse {
  url: string;
  finalUrl: string | null;
  checkedAt: string;
  verdict: Verdict;
  summary: string;
  http: { status: number | null; latencyMs: number | null; redirected: boolean; methodUsed: string | null };
  /** Every method and body tried, so any verdict can be audited. */
  attempts: Attempt[];
  spec: {
    transport: ParseResult["transport"];
    declaredVersion: number | null;
    amountField: ParseResult["amountField"];
  } | null;
  accepts: ParseResult["accepts"];
  serverError: string | null;
  problems: Problem[];
  /** Present only when the endpoint wants parameters we did not supply. */
  needsParams: ParamHint | null;
  /** Probing is single-region for now. Stated so nobody infers more than we did. */
  placement: "single-region";
  probedFrom: string | null;
}

const REQUIRED_FIELD_RE =
  /\b(required|missing|must be (provided|supplied|set)|cannot be empty|is expected|invalid (request|body|param))/i;
/** Field names are usually quoted in the message: Required field 'domain' ... */
const QUOTED_FIELD_RE = /['"`]([A-Za-z_][A-Za-z0-9_.-]{0,40})['"`]/;

function fieldFrom(message: string): string | null {
  const match = QUOTED_FIELD_RE.exec(message);
  return match ? match[1] : null;
}

/**
 * Work out whether a 400/422 means "you forgot a parameter" rather than
 * "this is not an x402 endpoint". Many servers hand back a worked example,
 * which is good enough to retry with.
 */
function detectParamError(bodyText: string): ParamHint | null {
  if (!bodyText) return null;

  let parsed: unknown = null;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    /* not JSON, fall through to the text check */
  }

  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const record = parsed as Record<string, unknown>;
    const message =
      typeof record.error === "string" ? record.error
      : typeof record.message === "string" ? record.message
      : typeof record.detail === "string" ? record.detail
      : null;

    const raw = record.correct_example ?? record.example ?? record.expected ?? record.sample;
    const example =
      raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;

    if (example) {
      return { field: message ? fieldFrom(message) : null, example, message };
    }
    if (message && REQUIRED_FIELD_RE.test(message)) {
      return { field: fieldFrom(message), example: null, message };
    }
  }

  if (REQUIRED_FIELD_RE.test(bodyText) && bodyText.length <= 2000) {
    return { field: fieldFrom(bodyText), example: null, message: bodyText.slice(0, 200) };
  }
  return null;
}

/**
 * Some endpoints answer a plain GET with a self-describing document rather
 * than a payment challenge, e.g. {"endpoint":..., "method":"POST", "price":...}.
 * That is a hint, not a dead end: follow the method it names.
 */
function detectDiscoveryDoc(bodyText: string): string | null {
  if (!bodyText || bodyText.length > 8000) return null;
  try {
    const parsed = JSON.parse(bodyText);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const raw = (parsed as Record<string, unknown>).method;
    const method = typeof raw === "string" ? raw.toUpperCase() : null;
    return method && ["GET", "POST", "HEAD"].includes(method) ? method : null;
  } catch {
    return null;
  }
}

/** Apply a worked example as a body on POST, or as query params on GET. */
function withExample(
  target: string,
  method: string,
  example: Record<string, unknown>,
): { url: string; body: string | undefined } {
  if (method === "GET" || method === "HEAD") {
    const url = new URL(target);
    for (const [key, value] of Object.entries(example)) {
      if (value === null || typeof value === "object") continue;
      url.searchParams.set(key, String(value));
    }
    return { url: url.toString(), body: undefined };
  }
  return { url: target, body: JSON.stringify(example) };
}

function summarise(
  verdict: Verdict,
  parsed: ParseResult | null,
  status: number | null,
  method: string | null,
  hint: ParamHint | null,
): string {
  switch (verdict) {
    case "payable": {
      const all = parsed?.accepts ?? [];
      const first = all.find((a) => a.usable) ?? all[0];
      const broken = all.length - all.filter((a) => a.usable).length;
      const price =
        first?.priceUsd !== null && first?.priceUsd !== undefined
          ? `$${first.priceUsd}`
          : `${first?.amountAtomic ?? "an unknown amount"} in atomic units (decimals not established)`;
      const dialect = parsed?.amountField === "maxAmountRequired" ? "v1" : "v2";
      const tail =
        broken > 0
          ? ` It also advertises ${broken} other payment option(s) that a caller cannot use.`
          : "";
      return `Answers 402 via ${method}. Speaks the ${dialect} dialect over the ${parsed?.transport}, charges ${price} on ${
        first?.networkCanonical ?? "an unrecognised network"
      }.${tail}`;
    }
    case "malformed": {
      const errors = parsed?.problems.filter((p) => p.severity === "error").length ?? 0;
      return `Returns 402 but none of the ${
        parsed?.accepts.length ?? 0
      } advertised payment option(s) are usable: ${errors} error(s) in the payment requirements.`;
    }
    case "needs-params": {
      const which = hint?.field ? ` It asked for "${hint.field}".` : "";
      return `Live, but it needs request parameters before it will quote a price.${which} Not a dead endpoint, and not one we can price without knowing what to send.`;
    }
    case "free":
      return `Live and serving content, but it never asked for payment. Listed as payable, answers ${status} without a payment challenge, so a caller gets it for nothing.`;
    case "not-x402":
      return `Reachable but returned HTTP ${status}, not 402, so it is not a payable x402 endpoint.`;
    case "unreachable":
      return "Could not be reached.";
  }
}

async function attempt(
  target: string,
  method: string,
  body?: string,
  usedExample = false,
): Promise<{ response: Response | null; attempt: Attempt }> {
  const started = Date.now();
  const sendBody = method === "POST" ? (body ?? "{}") : undefined;
  try {
    const response = await fetch(target, {
      method,
      headers: { "user-agent": USER_AGENT, accept: "*/*", "content-type": "application/json" },
      body: sendBody,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    return {
      response,
      attempt: { method, status: response.status, latencyMs: Date.now() - started, error: null, usedExample },
    };
  } catch (err) {
    return {
      response: null,
      attempt: {
        method,
        status: null,
        latencyMs: Date.now() - started,
        error: err instanceof Error ? err.message : String(err),
        usedExample,
      },
    };
  }
}

async function validate(
  target: string,
  requestedMethod: string | null,
  colo: string | null,
): Promise<ValidateResponse> {
  const base = {
    url: target,
    finalUrl: null as string | null,
    checkedAt: new Date().toISOString(),
    spec: null,
    accepts: [] as ParseResult["accepts"],
    serverError: null as string | null,
    needsParams: null as ParamHint | null,
    placement: "single-region" as const,
    probedFrom: colo,
  };

  const attempts: Attempt[] = [];
  const firstMethod = requestedMethod ?? "GET";
  let { response, attempt: first } = await attempt(target, firstMethod);
  attempts.push(first);

  // A GET against a POST-only endpoint looks identical to "not an x402
  // endpoint" unless we actually try POST. The method hint from a directory is
  // a first guess, not a lock, so retry even when a method was requested.
  if (response && METHOD_MISMATCH_CODES.includes(response.status) && firstMethod !== "POST") {
    const retry = await attempt(target, "POST");
    attempts.push(retry.attempt);
    // Keep the retry when it is a better signal: a payment challenge, or a
    // parameter complaint (which means the endpoint is alive and listening).
    if (retry.response && (retry.response.status === 402 || PARAM_ERROR_CODES.includes(retry.response.status))) {
      response = retry.response;
    }
  }

  // A 200 can be a self-describing document telling us which method to use.
  // Following it turns an apparent "not x402" into a real payment challenge.
  if (response && response.status === 200) {
    const doc = await response.clone().text().catch(() => "");
    const named = detectDiscoveryDoc(doc);
    if (named && named !== attempts[attempts.length - 1].method) {
      const retry = await attempt(target, named);
      attempts.push(retry.attempt);
      if (
        retry.response &&
        (retry.response.status === 402 || PARAM_ERROR_CODES.includes(retry.response.status))
      ) {
        response = retry.response;
      }
    }
  }

  // "You forgot a parameter" is not "you are dead". Some servers hand back a
  // worked example; when they do, retry with it and often get a real 402.
  let hint: ParamHint | null = null;
  if (response && PARAM_ERROR_CODES.includes(response.status)) {
    const errorBody = await response.text().catch(() => "");
    hint = detectParamError(errorBody);
    if (hint?.example) {
      const method = attempts[attempts.length - 1].method;
      const { url: retryUrl, body } = withExample(target, method, hint.example);
      const retry = await attempt(retryUrl, method, body, true);
      attempts.push(retry.attempt);
      if (retry.response) response = retry.response;
    }
  }

  const used = attempts[attempts.length - 1];

  if (!response) {
    return {
      ...base,
      verdict: "unreachable",
      summary: "Could not be reached.",
      http: { status: null, latencyMs: used.latencyMs, redirected: false, methodUsed: used.method },
      attempts,
      problems: [{ severity: "error", field: "fetch", message: used.error ?? "request failed" }],
    };
  }

  const http = {
    status: response.status,
    latencyMs: used.latencyMs,
    redirected: response.redirected,
    methodUsed: used.method,
  };

  if (response.status !== 402) {
    const stillNeedsParams = PARAM_ERROR_CODES.includes(response.status) && hint !== null;
    // A 200 that returns DATA means the endpoint works and simply does not
    // charge, which is worth saying plainly rather than filing under "dead".
    // A 200 that returns HTML is just a web page, not a free API, so it stays
    // not-x402. Without this split, example.com gets labelled "free".
    const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
    const servesData =
      response.status === 200 &&
      contentType !== "" &&
      !contentType.includes("text/html") &&
      !contentType.includes("application/xhtml");
    const verdict: Verdict = stillNeedsParams ? "needs-params" : servesData ? "free" : "not-x402";
    return {
      ...base,
      finalUrl: response.url || target,
      verdict,
      summary: summarise(verdict, null, response.status, used.method, hint),
      http,
      attempts,
      needsParams: stillNeedsParams ? hint : null,
      problems: [
        {
          severity: stillNeedsParams ? "warning" : "error",
          field: "status",
          message: stillNeedsParams
            ? `HTTP ${response.status}: the endpoint wants parameters we did not supply${
                hint?.field ? ` (it named "${hint.field}")` : ""
              }`
            : `expected HTTP 402, got ${response.status} (tried ${attempts.map((x) => x.method).join(", ")})`,
        },
      ],
    };
  }

  const bodyText = await response.text().catch(() => "");
  const parsed = parsePaymentRequired(response.headers, bodyText);
  // An endpoint can advertise several ways to pay. It is payable as long as at
  // least one of them is usable, even if the others are broken.
  const usableCount = parsed.accepts.filter((a) => a.usable).length;
  const verdict: Verdict = usableCount > 0 ? "payable" : "malformed";

  return {
    ...base,
    finalUrl: response.url || target,
    verdict,
    summary: summarise(verdict, parsed, response.status, used.method, null),
    http,
    attempts,
    spec: {
      transport: parsed.transport,
      declaredVersion: parsed.declaredVersion,
      amountField: parsed.amountField,
    },
    accepts: parsed.accepts,
    serverError: parsed.serverError,
    problems: parsed.problems,
  };
}

const json = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: { "cache-control": "no-store", "access-control-allow-origin": "*" },
  });

export default {
  async fetch(request: Request, _env: Env): Promise<Response> {
    const url = new URL(request.url);
    const colo = (request as Request & { cf?: IncomingRequestCfProperties }).cf?.colo ?? null;

    if (url.pathname === "/health") {
      return json({ ok: true, service: "the402-api", colo, time: new Date().toISOString() });
    }

    if (url.pathname === "/validate") {
      let target: string | null = null;
      let method: string | null = null;

      if (request.method === "POST") {
        const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
        if (body && typeof body.url === "string") target = body.url;
        if (body && typeof body.method === "string") method = body.method.toUpperCase();
      } else {
        target = url.searchParams.get("url");
        const m = url.searchParams.get("method");
        method = m ? m.toUpperCase() : null;
      }

      if (!target) {
        return json(
          { error: "missing url", usage: 'GET /validate?url=https://... or POST {"url":"https://..."}' },
          400,
        );
      }

      const reason = rejectReason(target);
      if (reason) return json({ error: "url rejected", reason, url: target }, 400);

      if (method && !["GET", "POST", "HEAD"].includes(method)) {
        return json({ error: "method must be GET, POST or HEAD" }, 400);
      }

      return json(await validate(target, method, colo));
    }

    return json({
      service: "the402-api",
      description: "Checks whether a URL is a working x402 endpoint and what it costs.",
      endpoints: {
        "GET /validate?url=": "validate an endpoint (add &method= to pin the HTTP method)",
        "POST /validate": "validate an endpoint, body {url, method?}",
        "GET /health": "liveness",
      },
      handles: [
        "x402 v1 dialect (maxAmountRequired, payload in the JSON body)",
        "x402 v2 dialect (amount, payload in the PAYMENT-REQUIRED header)",
        "endpoints that only answer to POST",
        "endpoints that need request parameters before they quote a price",
      ],
    });
  },
} satisfies ExportedHandler<Env>;
