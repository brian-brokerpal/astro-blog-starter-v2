CREATE TABLE IF NOT EXISTS rentcast_overage_requests (
  id TEXT PRIMARY KEY,
  cache_key TEXT NOT NULL,
  month_key TEXT NOT NULL,
  property_address TEXT NOT NULL,
  property_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','declined','consumed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  consumed_at TEXT,
  UNIQUE(cache_key, month_key)
);

CREATE INDEX IF NOT EXISTS idx_rentcast_overage_status_created
  ON rentcast_overage_requests(status, created_at DESC);
