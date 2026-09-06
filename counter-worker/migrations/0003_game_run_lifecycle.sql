-- Preserve the latest state we received for every game attempt. Finished rows
-- also live in game_runs and remain eligible for public leaderboards; checkpoint
-- rows let private analytics explain attempts whose final browser signal never
-- arrived.
CREATE TABLE IF NOT EXISTS game_run_lifecycle (
  run_id TEXT PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('NORMAL', 'HARDCORE')),
  state TEXT NOT NULL CHECK (state IN ('CHECKPOINT', 'FINISHED')),
  end_reason TEXT,
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
  ended_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_game_run_lifecycle_updated
ON game_run_lifecycle(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_game_run_lifecycle_visitor
ON game_run_lifecycle(visitor_id, updated_at DESC);

