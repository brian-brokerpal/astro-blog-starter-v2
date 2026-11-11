-- Monthly hard cap and 30-day valuation cache for RentCast AVM requests.
CREATE TABLE IF NOT EXISTS rentcast_monthly_usage (
  month_key TEXT PRIMARY KEY,
  request_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rentcast_valuation_cache (
  cache_key TEXT PRIMARY KEY,
  response_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rentcast_cache_created
ON rentcast_valuation_cache(created_at);
