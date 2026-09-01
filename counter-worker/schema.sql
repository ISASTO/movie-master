CREATE TABLE IF NOT EXISTS visitors (
  visitor_id TEXT PRIMARY KEY,
  first_seen TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_visitors_first_seen ON visitors(first_seen);

CREATE TABLE IF NOT EXISTS visitor_stats (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  visitor_count INTEGER NOT NULL DEFAULT 0 CHECK (visitor_count >= 0)
);

-- Seed the original all-time main-site counter from visitors already recorded.
INSERT OR IGNORE INTO visitor_stats (id, visitor_count)
SELECT 1, COUNT(*) FROM visitors;

CREATE TRIGGER IF NOT EXISTS increment_visitor_count
AFTER INSERT ON visitors
BEGIN
  UPDATE visitor_stats
  SET visitor_count = visitor_count + 1
  WHERE id = 1;
END;

-- One row per browser per section for all-time main-site/game analytics.
CREATE TABLE IF NOT EXISTS visitor_sections (
  visitor_id TEXT NOT NULL,
  section TEXT NOT NULL CHECK (section IN ('site', 'game')),
  first_seen TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (visitor_id, section)
);

CREATE INDEX IF NOT EXISTS idx_visitor_sections_section_seen
ON visitor_sections(section, first_seen);

-- Backfill every browser that was already counted before section analytics existed.
INSERT OR IGNORE INTO visitor_sections (visitor_id, section, first_seen)
SELECT visitor_id, 'site', first_seen FROM visitors;

-- One row per browser, section, and Chicago calendar day. This lets the
-- analytics API calculate true unique visitors for daily/weekly/monthly buckets.
CREATE TABLE IF NOT EXISTS visitor_daily (
  visitor_id TEXT NOT NULL,
  section TEXT NOT NULL CHECK (section IN ('site', 'game')),
  visit_date TEXT NOT NULL,
  first_seen TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (visitor_id, section, visit_date)
);

CREATE INDEX IF NOT EXISTS idx_visitor_daily_date_section
ON visitor_daily(visit_date, section);

-- The pre-analytics data was collected during Central Daylight Time, so this
-- accurately backfills the small amount of existing history into Chicago dates.
INSERT OR IGNORE INTO visitor_daily (visitor_id, section, visit_date, first_seen)
SELECT visitor_id, 'site', date(first_seen, '-5 hours'), first_seen
FROM visitors;

-- Constant-time all-time counts for each section.
CREATE TABLE IF NOT EXISTS section_stats (
  section TEXT PRIMARY KEY CHECK (section IN ('site', 'game')),
  visitor_count INTEGER NOT NULL DEFAULT 0 CHECK (visitor_count >= 0)
);

INSERT OR IGNORE INTO section_stats (section, visitor_count)
SELECT 'site', COUNT(*) FROM visitor_sections WHERE section = 'site';

INSERT OR IGNORE INTO section_stats (section, visitor_count)
SELECT 'game', COUNT(*) FROM visitor_sections WHERE section = 'game';

CREATE TRIGGER IF NOT EXISTS increment_section_count
AFTER INSERT ON visitor_sections
BEGIN
  UPDATE section_stats
  SET visitor_count = visitor_count + 1
  WHERE section = NEW.section;
END;
