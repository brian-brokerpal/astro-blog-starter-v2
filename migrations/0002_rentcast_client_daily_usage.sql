CREATE TABLE IF NOT EXISTS rentcast_client_daily_usage (
  day_key TEXT NOT NULL,
  client_key TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (day_key, client_key)
);

CREATE INDEX IF NOT EXISTS idx_rentcast_client_daily_usage_day
ON rentcast_client_daily_usage(day_key);
