/**
 * x402 payment-requirements parsing and validation.
 *
 * Handles BOTH wire formats, because both are live on the network:
 *
 *   v1  payment requirements live in the JSON response body,
 *       and the amount field is called `maxAmountRequired`.
 *   v2  payment requirements live in a base64 `PAYMENT-REQUIRED` header,
 *       and the amount field is called `amount`.
 *
 * A parser that assumes one shape silently mislabels the other half of the
 * network, which is the whole reason this endpoint exists.
 *
 * Spec: github.com/x402-foundation/x402/tree/main/specs
 */

export type SpecVersion = "v1" | "v2";

export type Severity = "error" | "warning";

export interface Problem {
  severity: Severity;
  field: string;
  message: string;
}

export interface NormalizedRequirement {
  scheme: string | null;
  network: string | null;
  networkCanonical: string | null;
  chainId: number | null;
  amountAtomic: string | null;
  asset: string | null;
  /** Only set when the asset's decimals are known for certain. Null otherwise. */
  priceUsd: number | null;
  /** Why priceUsd is or is not populated. Never guess a price. */
  priceBasis: string;
  payTo: string | null;
  payToLooksValid: boolean | null;
  maxTimeoutSeconds: number | null;
  /**
   * True when this specific option has no blocking errors. An endpoint can
   * advertise several ways to pay and only some of them work, so the verdict
   * hangs on whether ANY option is usable, not on all of them being perfect.
   */
  usable: boolean;
}

export interface ParseResult {
  /**
   * Transport tells you WHERE the payload was found. It is not the same thing
   * as the version the endpoint declares: real endpoints exist that announce
   * x402Version 2 while still delivering the payload in the body.
   */
  transport: "PAYMENT-REQUIRED header" | "JSON response body" | null;
  /** The x402Version the payload itself declares, whatever the transport. */
  declaredVersion: number | null;
  /**
   * Which amount field the requirements actually use. v1 spells it
   * maxAmountRequired, v2 spells it amount. Detected, never assumed.
   */
  amountField: "amount" | "maxAmountRequired" | null;
  accepts: NormalizedRequirement[];
  /** Server-supplied error string from the payload, if any. */
  serverError: string | null;
  problems: Problem[];
}

/**
 * Assets whose decimals we can state with confidence. Anything not in here
 * yields priceUsd: null with a stated reason, rather than a guessed number.
 * Addresses verified against Circle's published contract list.
 */
const KNOWN_ASSETS: Record<string, { symbol: string; decimals: number }> = {
  // Keyed by "canonicalNetwork:asset" so a numeric asset id on one chain can
  // never be mistaken for a different chain's asset.
  "base:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913": { symbol: "USDC", decimals: 6 },
  "base-sepolia:0x036cbd53842c5426634e7929541ec2318f3dcf7e": { symbol: "USDC", decimals: 6 },
  "algorand:31566704": { symbol: "USDC", decimals: 6 },
};

/**
 * v1 uses friendly names, v2 uses CAIP-2 identifiers. Map both to one canonical
 * name so callers do not have to care which spec the endpoint speaks.
 */
const NETWORKS: Record<string, { canonical: string; chainId: number | null }> = {
  base: { canonical: "base", chainId: 8453 },
  "eip155:8453": { canonical: "base", chainId: 8453 },
  "base-sepolia": { canonical: "base-sepolia", chainId: 84532 },
  "eip155:84532": { canonical: "base-sepolia", chainId: 84532 },
  ethereum: { canonical: "ethereum", chainId: 1 },
  "eip155:1": { canonical: "ethereum", chainId: 1 },
  polygon: { canonical: "polygon", chainId: 137 },
  "eip155:137": { canonical: "polygon", chainId: 137 },
  optimism: { canonical: "optimism", chainId: 10 },
  "eip155:10": { canonical: "optimism", chainId: 10 },
  arbitrum: { canonical: "arbitrum", chainId: 42161 },
  "eip155:42161": { canonical: "arbitrum", chainId: 42161 },
  avalanche: { canonical: "avalanche", chainId: 43114 },
  "eip155:43114": { canonical: "avalanche", chainId: 43114 },
  solana: { canonical: "solana", chainId: null },
  // Solana's CAIP-2 id embeds a truncated mainnet genesis hash.
  "solana:5eykt4usfv8p8njdtrepy1vzqkqzkvdp": { canonical: "solana", chainId: null },
  aptos: { canonical: "aptos", chainId: null },
  stellar: { canonical: "stellar", chainId: null },
  sui: { canonical: "sui", chainId: null },
  algorand: { canonical: "algorand", chainId: null },
  // Algorand's CAIP-2 id embeds the mainnet genesis hash.
  "algorand:wghe2pwdvd7s12bl5faop20egyesn73ktic1qzkkit8=": { canonical: "algorand", chainId: null },
};

/** Schemes defined in the spec repo. Unknown schemes warn rather than fail. */
const KNOWN_SCHEMES = ["exact", "upto", "auth-capture", "batch-settlement"];

const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
/** Algorand addresses are 58 characters of base32 (A-Z and 2-7). */
const ALGORAND_ADDRESS = /^[A-Z2-7]{58}$/;
const DIGITS_ONLY = /^\d+$/;

export function decodeBase64Json(value: string): unknown {
  const binary = atob(value.trim());
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function looksLikeValidPayTo(payTo: string, network: string | null): boolean | null {
  if (network === "algorand") {
    return ALGORAND_ADDRESS.test(payTo);
  }
  if (EVM_ADDRESS.test(payTo)) return true;
  // Non-EVM chains use different address formats; only judge what we can.
  if (network === "solana" || network === "sui" || network === "aptos") {
    return BASE58.test(payTo) || EVM_ADDRESS.test(payTo) ? true : null;
  }
  if (network === null) return null;
  return false;
}

function toUsd(
  amountAtomic: string,
  asset: string | null,
  network: string | null,
): { priceUsd: number | null; basis: string } {
  if (!asset) return { priceUsd: null, basis: "no asset given, cannot convert" };
  if (!network) {
    return { priceUsd: null, basis: "network unrecognised, cannot identify the asset safely" };
  }
  const known = KNOWN_ASSETS[`${network}:${asset.toLowerCase()}`];
  if (!known) {
    return { priceUsd: null, basis: `decimals unknown for asset ${asset} on ${network}, amount left in atomic units` };
  }
  if (!DIGITS_ONLY.test(amountAtomic)) {
    return { priceUsd: null, basis: "amount is not an integer string, cannot convert" };
  }
  const value = Number(amountAtomic) / 10 ** known.decimals;
  return { priceUsd: value, basis: `${known.symbol} with ${known.decimals} decimals` };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function normalizeRequirement(
  raw: unknown,
  index: number,
  problems: Problem[],
  amountFieldSeen: Set<"amount" | "maxAmountRequired">,
): NormalizedRequirement {
  const path = `accepts[${index}]`;
  const req = asRecord(raw);
  // Anything this entry adds beyond this mark belongs to this entry alone.
  const problemMark = problems.length;
  const usableSoFar = () => !problems.slice(problemMark).some((p) => p.severity === "error");

  if (!req) {
    problems.push({ severity: "error", field: path, message: "entry is not an object" });
    return {
      scheme: null, network: null, networkCanonical: null, chainId: null,
      amountAtomic: null, asset: null, priceUsd: null,
      priceBasis: "entry unreadable", payTo: null, payToLooksValid: null,
      maxTimeoutSeconds: null, usable: false,
    };
  }

  const str = (key: string): string | null =>
    typeof req[key] === "string" && (req[key] as string).length > 0 ? (req[key] as string) : null;

  const scheme = str("scheme");
  if (!scheme) {
    problems.push({ severity: "error", field: `${path}.scheme`, message: "missing or empty" });
  } else if (!KNOWN_SCHEMES.includes(scheme)) {
    problems.push({
      severity: "warning",
      field: `${path}.scheme`,
      message: `"${scheme}" is not one of the schemes in the spec (${KNOWN_SCHEMES.join(", ")})`,
    });
  }

  const network = str("network");
  if (!network) {
    problems.push({ severity: "error", field: `${path}.network`, message: "missing or empty" });
  }
  const netInfo = network ? NETWORKS[network.toLowerCase()] ?? null : null;
  if (network && !netInfo) {
    problems.push({
      severity: "warning",
      field: `${path}.network`,
      message: `"${network}" is not a network we recognise`,
    });
  }

  // The single most important difference between the two dialects. Detect it
  // rather than assuming, because transport and declared version disagree in
  // the wild.
  const amountKey: "amount" | "maxAmountRequired" | null =
    str("amount") !== null ? "amount" : str("maxAmountRequired") !== null ? "maxAmountRequired" : null;
  const amountAtomic = amountKey ? str(amountKey) : null;
  if (!amountAtomic) {
    problems.push({
      severity: "error",
      field: `${path}.amount`,
      message: 'no price found: neither "amount" (v2) nor "maxAmountRequired" (v1) is present',
    });
  } else if (!DIGITS_ONLY.test(amountAtomic)) {
    problems.push({
      severity: "error",
      field: `${path}.${amountKey}`,
      message: `must be an integer string in atomic units, got "${amountAtomic}"`,
    });
  }
  if (amountKey) amountFieldSeen.add(amountKey);

  const asset = str("asset");
  if (!asset) {
    problems.push({ severity: "error", field: `${path}.asset`, message: "missing or empty" });
  }

  const payTo = str("payTo");
  let payToLooksValid: boolean | null = null;
  if (!payTo) {
    problems.push({ severity: "error", field: `${path}.payTo`, message: "missing or empty" });
  } else {
    payToLooksValid = looksLikeValidPayTo(payTo, netInfo?.canonical ?? null);
    if (payToLooksValid === false) {
      problems.push({
        severity: "error",
        field: `${path}.payTo`,
        message: `"${payTo}" is not a valid address for ${netInfo?.canonical ?? network}`,
      });
    }
  }

  const timeoutRaw = req["maxTimeoutSeconds"];
  const maxTimeoutSeconds = typeof timeoutRaw === "number" ? timeoutRaw : null;
  if (timeoutRaw !== undefined && maxTimeoutSeconds === null) {
    problems.push({
      severity: "warning",
      field: `${path}.maxTimeoutSeconds`,
      message: "present but not a number",
    });
  }

  const { priceUsd, basis } = amountAtomic
    ? toUsd(amountAtomic, asset, netInfo?.canonical ?? null)
    : { priceUsd: null, basis: "no amount given" };

  return {
    scheme,
    network,
    networkCanonical: netInfo?.canonical ?? null,
    chainId: netInfo?.chainId ?? null,
    amountAtomic,
    asset,
    priceUsd,
    priceBasis: basis,
    payTo,
    payToLooksValid,
    maxTimeoutSeconds,
    usable: usableSoFar(),
  };
}

/**
 * Pull payment requirements out of a 402 response, trying v2 (header) first
 * and falling back to v1 (body).
 */
export function parsePaymentRequired(headers: Headers, bodyText: string): ParseResult {
  const problems: Problem[] = [];

  const header = headers.get("PAYMENT-REQUIRED");
  if (header) {
    let payload: unknown;
    try {
      payload = decodeBase64Json(header);
    } catch {
      problems.push({
        severity: "error",
        field: "PAYMENT-REQUIRED",
        message: "header is present but is not base64-encoded JSON",
      });
      return empty("PAYMENT-REQUIRED header", problems);
    }
    return buildResult(payload, "PAYMENT-REQUIRED header", problems);
  }

  let body: unknown;
  try {
    body = JSON.parse(bodyText);
  } catch {
    problems.push({
      severity: "error",
      field: "body",
      message: "no PAYMENT-REQUIRED header, and the body is not JSON either",
    });
    return empty(null, problems);
  }

  return buildResult(body, "JSON response body", problems);
}

function empty(transport: ParseResult["transport"], problems: Problem[]): ParseResult {
  return { transport, declaredVersion: null, amountField: null, accepts: [], serverError: null, problems };
}

function buildResult(
  payload: unknown,
  transport: NonNullable<ParseResult["transport"]>,
  problems: Problem[],
): ParseResult {
  const root = asRecord(payload);
  if (!root) {
    problems.push({ severity: "error", field: "payload", message: "payload is not a JSON object" });
    return empty(transport, problems);
  }

  const declaredVersion = typeof root["x402Version"] === "number" ? (root["x402Version"] as number) : null;
  if (declaredVersion === null) {
    problems.push({ severity: "warning", field: "x402Version", message: "missing or not a number" });
  }

  // Endpoints exist that declare version 2 while still using the v1 body
  // transport. Report the mismatch rather than silently picking one.
  if (declaredVersion === 2 && transport === "JSON response body") {
    problems.push({
      severity: "warning",
      field: "x402Version",
      message: "declares x402Version 2 but delivers the payload in the body, which is the v1 transport",
    });
  }

  const serverError = typeof root["error"] === "string" && root["error"].length > 0 ? root["error"] : null;

  const acceptsRaw = root["accepts"];
  if (!Array.isArray(acceptsRaw)) {
    problems.push({
      severity: "error",
      field: "accepts",
      message: "missing, so the response gives a caller no way to pay",
    });
    return { transport, declaredVersion, amountField: null, accepts: [], serverError, problems };
  }
  if (acceptsRaw.length === 0) {
    problems.push({ severity: "error", field: "accepts", message: "empty, so there is no way to pay" });
  }

  const amountFieldSeen = new Set<"amount" | "maxAmountRequired">();
  const accepts = acceptsRaw.map((entry, i) => normalizeRequirement(entry, i, problems, amountFieldSeen));

  if (amountFieldSeen.size > 1) {
    problems.push({
      severity: "warning",
      field: "accepts",
      message: "mixes v1 and v2 amount field names across entries",
    });
  }

  return {
    transport,
    declaredVersion,
    amountField: amountFieldSeen.values().next().value ?? null,
    accepts,
    serverError,
    problems,
  };
}
