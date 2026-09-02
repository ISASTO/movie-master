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

-- One row per browser, section, and Chicago calendar day.
CREATE TABLE IF NOT EXISTS visitor_daily (
  visitor_id TEXT NOT NULL,
  section TEXT NOT NULL CHECK (section IN ('site', 'game')),
  visit_date TEXT NOT NULL,
  first_seen TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (visitor_id, section, visit_date)
);

CREATE INDEX IF NOT EXISTS idx_visitor_daily_date_section
ON visitor_daily(visit_date, section);

-- The original pre-analytics data was collected during Central Daylight Time.
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

-- Small timestamps marking when richer analytics started. Existing records are
-- never retroactively guessed for data that was not collected at the time.
CREATE TABLE IF NOT EXISTS tracking_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT OR IGNORE INTO tracking_meta (key, value)
VALUES ('game_source_started_at', CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO tracking_meta (key, value)
VALUES ('visit_context_started_at', CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO tracking_meta (key, value)
VALUES ('game_stats_started_at', CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO tracking_meta (key, value)
VALUES ('store_click_started_at', CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO tracking_meta (key, value)
VALUES ('run_telemetry_started_at', CURRENT_TIMESTAMP);

-- First known acquisition source for each game browser. Browsers that first
-- visited before source tracking began remain unclassified.
CREATE TABLE IF NOT EXISTS game_source_first (
  visitor_id TEXT PRIMARY KEY,
  source TEXT NOT NULL CHECK (source IN ('site', 'direct', 'unknown')),
  first_seen TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_game_source_first_source
ON game_source_first(source);

-- First acquisition source seen for a browser on each Chicago calendar day.
CREATE TABLE IF NOT EXISTS game_source_daily (
  visitor_id TEXT NOT NULL,
  visit_date TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('site', 'direct', 'unknown')),
  first_seen TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (visitor_id, visit_date)
);

CREATE INDEX IF NOT EXISTS idx_game_source_daily_date_source
ON game_source_daily(visit_date, source);

-- Unique browser-hour visits. A browser can count at most once per section in
-- an hour, so refreshing cannot manufacture an hourly traffic spike.
CREATE TABLE IF NOT EXISTS visitor_hourly (
  visitor_id TEXT NOT NULL,
  section TEXT NOT NULL CHECK (section IN ('site', 'game')),
  visit_date TEXT NOT NULL,
  visit_hour INTEGER NOT NULL CHECK (visit_hour BETWEEN 0 AND 23),
  first_seen TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (visitor_id, section, visit_date, visit_hour)
);

CREATE INDEX IF NOT EXISTS idx_visitor_hourly_section_hour
ON visitor_hourly(section, visit_hour);

-- Coarse first-observed geography for each anonymous browser/section. No IP
-- addresses are stored. Coordinates are rounded before insertion by the Worker.
CREATE TABLE IF NOT EXISTS visitor_locations (
  visitor_id TEXT NOT NULL,
  section TEXT NOT NULL CHECK (section IN ('site', 'game')),
  country_code TEXT,
  region TEXT,
  city TEXT,
  latitude REAL,
  longitude REAL,
  first_seen TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (visitor_id, section)
);

CREATE INDEX IF NOT EXISTS idx_visitor_locations_section_country
ON visitor_locations(section, country_code);

-- Every distinct game start gets a UUID. Abandoned/reset runs remain starts but
-- do not become completed runs, which makes completion-rate reporting honest.
CREATE TABLE IF NOT EXISTS game_starts (
  run_id TEXT PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('NORMAL', 'HARDCORE')),
  visit_date TEXT NOT NULL,
  run_token TEXT,
  completed_at TEXT,
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_game_starts_visitor
ON game_starts(visitor_id, started_at);

CREATE INDEX IF NOT EXISTS idx_game_starts_date_mode
ON game_starts(visit_date, mode);

CREATE INDEX IF NOT EXISTS idx_game_starts_visitor_started
ON game_starts(visitor_id, started_at DESC);

-- Completed run summaries. Run metadata is intentionally coarse: no IP address,
-- full user agent, hardware fingerprint, or exact screen characteristics are stored.
CREATE TABLE IF NOT EXISTS game_runs (
  run_id TEXT PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('NORMAL', 'HARDCORE')),
  visit_date TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0),
  longest_streak INTEGER NOT NULL DEFAULT 0 CHECK (longest_streak >= 0),
  game_time_seconds INTEGER NOT NULL DEFAULT 0 CHECK (game_time_seconds >= 0),
  popcorn_collected INTEGER NOT NULL DEFAULT 0 CHECK (popcorn_collected >= 0),
  popcorn_missed INTEGER NOT NULL DEFAULT 0 CHECK (popcorn_missed >= 0),
  garbage_destroyed INTEGER NOT NULL DEFAULT 0 CHECK (garbage_destroyed >= 0),
  destroyed_by_stars INTEGER NOT NULL DEFAULT 0 CHECK (destroyed_by_stars >= 0),
  destroyed_by_blasts INTEGER NOT NULL DEFAULT 0 CHECK (destroyed_by_blasts >= 0),
  stars_fired INTEGER NOT NULL DEFAULT 0 CHECK (stars_fired >= 0),
  stars_hit INTEGER NOT NULL DEFAULT 0 CHECK (stars_hit >= 0),
  hits_taken INTEGER NOT NULL DEFAULT 0 CHECK (hits_taken >= 0),
  shield_blocks INTEGER NOT NULL DEFAULT 0 CHECK (shield_blocks >= 0),
  blasts_used INTEGER NOT NULL DEFAULT 0 CHECK (blasts_used >= 0),
  powerup_shield INTEGER NOT NULL DEFAULT 0 CHECK (powerup_shield >= 0),
  powerup_speed INTEGER NOT NULL DEFAULT 0 CHECK (powerup_speed >= 0),
  powerup_super INTEGER NOT NULL DEFAULT 0 CHECK (powerup_super >= 0),
  powerup_magnet INTEGER NOT NULL DEFAULT 0 CHECK (powerup_magnet >= 0),
  device_type TEXT,
  browser_name TEXT,
  control_method TEXT,
  quality_level TEXT,
  country_code TEXT,
  region TEXT,
  region_code TEXT,
  city TEXT,
  latitude REAL,
  longitude REAL,
  finished_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_game_runs_score
ON game_runs(score DESC, longest_streak DESC);

CREATE INDEX IF NOT EXISTS idx_game_runs_visitor
ON game_runs(visitor_id, finished_at);

CREATE INDEX IF NOT EXISTS idx_game_runs_finished_at
ON game_runs(finished_at DESC);

CREATE INDEX IF NOT EXISTS idx_game_runs_public_all_time
ON game_runs(mode, visitor_id, score DESC, finished_at ASC);

CREATE INDEX IF NOT EXISTS idx_game_runs_public_daily
ON game_runs(mode, visit_date, visitor_id, score DESC, finished_at ASC);

-- Public leaderboard names are profiles rather than run fields. Renaming a
-- browser therefore updates all of its historical and future best-score rows.
CREATE TABLE IF NOT EXISTS leaderboard_profiles (
  visitor_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL DEFAULT 'ANONYMOUS',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Non-anonymous names are exclusive. ANONYMOUS is deliberately not claimed so
-- any number of players can leave the default public name unchanged.
CREATE TABLE IF NOT EXISTS leaderboard_name_claims (
  normalized_name TEXT PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  claimed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO leaderboard_name_claims (normalized_name, visitor_id)
SELECT UPPER(TRIM(display_name)), visitor_id
FROM leaderboard_profiles
WHERE UPPER(TRIM(display_name)) <> 'ANONYMOUS';

-- One-time compatibility bridge for browser high scores saved before the public
-- leaderboard existed. These affect only all-time public rankings and never
-- masquerade as completed runs in analytics.
CREATE TABLE IF NOT EXISTS legacy_leaderboard_scores (
  visitor_id TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('NORMAL', 'HARDCORE')),
  score INTEGER NOT NULL CHECK (score >= 0),
  imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (visitor_id, mode)
);

CREATE INDEX IF NOT EXISTS idx_legacy_leaderboard_scores_mode_score
ON legacy_leaderboard_scores(mode, score DESC);

-- Every click on the outbound official merch-store button. The anonymous browser
-- ID lets the dashboard show both raw click events and unique clickers.
CREATE TABLE IF NOT EXISTS store_clicks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visitor_id TEXT NOT NULL,
  click_date TEXT NOT NULL,
  clicked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_store_clicks_visitor
ON store_clicks(visitor_id, clicked_at);

CREATE INDEX IF NOT EXISTS idx_store_clicks_date
ON store_clicks(click_date);
