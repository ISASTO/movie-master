-- Repair main-site analytics rows that could be omitted when the legacy
-- visitors insert succeeded before the section/daily batch failed.
INSERT OR IGNORE INTO visitor_sections (visitor_id, section, first_seen)
SELECT visitor_id, 'site', first_seen
FROM visitors;

-- The affected production records were collected during Central Daylight
-- Time, matching the original analytics backfill in schema.sql.
INSERT OR IGNORE INTO visitor_daily (visitor_id, section, visit_date, first_seen)
SELECT visitor_id, 'site', date(first_seen, '-5 hours'), first_seen
FROM visitors;

-- Treat the row tables as authoritative and reset both cached totals exactly.
UPDATE visitor_stats
SET visitor_count = (SELECT COUNT(*) FROM visitors)
WHERE id = 1;

UPDATE section_stats
SET visitor_count = (
  SELECT COUNT(*)
  FROM visitor_sections
  WHERE visitor_sections.section = section_stats.section
);
