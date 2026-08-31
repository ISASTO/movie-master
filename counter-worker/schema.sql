CREATE TABLE IF NOT EXISTS visitors (
  visitor_id TEXT PRIMARY KEY,
  first_seen TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_visitors_first_seen ON visitors(first_seen);

CREATE TABLE IF NOT EXISTS visitor_stats (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  visitor_count INTEGER NOT NULL DEFAULT 0 CHECK (visitor_count >= 0)
);

-- On the first migration, seed the aggregate from every visitor already recorded.
-- INSERT OR IGNORE makes this safe to run again later without resetting the count.
INSERT OR IGNORE INTO visitor_stats (id, visitor_count)
SELECT 1, COUNT(*) FROM visitors;

-- This fires only for a real INSERT. INSERT OR IGNORE on an existing visitor ID
-- does not trigger it, so returning browsers never increase the total.
CREATE TRIGGER IF NOT EXISTS increment_visitor_count
AFTER INSERT ON visitors
BEGIN
  UPDATE visitor_stats
  SET visitor_count = visitor_count + 1
  WHERE id = 1;
END;
