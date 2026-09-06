-- MCP servers, probed the same way x402 endpoints are: one real handshake,
-- and a verdict that never guesses.
--
-- The important column is `verdict`. `auth-required` means the server is
-- running and wants a credential we do not have. It is NOT a failure, and
-- 30% of the registry lands there. Anything that merges it with the failing
-- verdicts is wrong about a third of the data.

CREATE TABLE IF NOT EXISTS mcp_servers (
  id               TEXT PRIMARY KEY,          -- slug derived from the url
  name             TEXT,                      -- registry name
  url              TEXT NOT NULL UNIQUE,
  host             TEXT,
  transport        TEXT,                      -- streamable-http, sse
  verdict          TEXT NOT NULL,
  http_status      INTEGER,
  latency_ms       INTEGER,
  server_name      TEXT,                      -- from serverInfo
  server_version   TEXT,
  protocol_version TEXT,
  tool_count       INTEGER,
  tool_names       TEXT,                      -- JSON array
  errors           TEXT,                      -- JSON array
  checked_at       TEXT
);

CREATE INDEX IF NOT EXISTS idx_mcp_verdict ON mcp_servers(verdict);
CREATE INDEX IF NOT EXISTS idx_mcp_host    ON mcp_servers(host);
CREATE INDEX IF NOT EXISTS idx_mcp_tools   ON mcp_servers(tool_count);

-- Same trick as stats_cache on the x402 side: the summary queries scan the
-- whole table, so they run hourly rather than per request.
CREATE TABLE IF NOT EXISTS mcp_stats_cache (
  id          INTEGER PRIMARY KEY CHECK (id = 1),
  payload     TEXT    NOT NULL,
  computed_at INTEGER NOT NULL
);
