CREATE TABLE IF NOT EXISTS visitors (
  visitor_id TEXT PRIMARY KEY,
  first_seen TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_visitors_first_seen ON visitors(first_seen);
