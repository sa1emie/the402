-- the402 directory schema.
--
-- One row per endpoint. Everything in the verification_* columns is written by
-- the checker, never by hand, so a badge on the site always reflects a check
-- that actually ran.

DROP TABLE IF EXISTS listings;

CREATE TABLE listings (
  id                TEXT PRIMARY KEY,          -- slug derived from the URL
  resource          TEXT NOT NULL UNIQUE,      -- the payable endpoint
  host              TEXT NOT NULL,             -- for grouping by provider
  name              TEXT,                      -- human name, curated
  description       TEXT,                      -- curated, falls back to Bazaar's
  category          TEXT,

  -- What the endpoint told us, via our own validator.
  verdict           TEXT NOT NULL,             -- payable | not-x402 | malformed | skipped | check-failed
  method_used       TEXT,
  http_status       INTEGER,
  latency_ms        INTEGER,
  dialect           TEXT,                      -- v1 | v2
  transport         TEXT,
  declared_version  INTEGER,
  network           TEXT,
  price_usd         REAL,                      -- null when decimals are not established
  price_atomic      TEXT,
  pay_to            TEXT,
  usable_options    INTEGER,
  total_options     INTEGER,
  error_count       INTEGER DEFAULT 0,
  notes             TEXT,                      -- why it was skipped, etc

  source            TEXT NOT NULL,             -- bazaar | awesome-x402 | submission | manual
  on_cloudflare     INTEGER DEFAULT 0,
  bazaar_updated    TEXT,
  verified_at       TEXT,                      -- when OUR check ran
  first_seen        TEXT
);

CREATE INDEX idx_verdict  ON listings(verdict);
CREATE INDEX idx_network  ON listings(network);
CREATE INDEX idx_price    ON listings(price_usd);
CREATE INDEX idx_host     ON listings(host);
CREATE INDEX idx_category ON listings(category);

-- Submissions land here first and are only promoted into listings after a
-- verification run, so nobody can inject an unchecked entry into the directory.
CREATE TABLE IF NOT EXISTS submissions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  resource      TEXT NOT NULL,
  submitter     TEXT,
  note          TEXT,
  submitted_at  TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',  -- pending | verified | rejected
  verdict       TEXT
);

CREATE INDEX IF NOT EXISTS idx_sub_status ON submissions(status);
