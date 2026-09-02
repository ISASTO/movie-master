ALTER TABLE game_starts ADD COLUMN run_token TEXT;
ALTER TABLE game_starts ADD COLUMN completed_at TEXT;

CREATE INDEX IF NOT EXISTS idx_game_starts_visitor_started
ON game_starts(visitor_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_game_runs_public_all_time
ON game_runs(mode, visitor_id, score DESC, finished_at ASC);

CREATE INDEX IF NOT EXISTS idx_game_runs_public_daily
ON game_runs(mode, visit_date, visitor_id, score DESC, finished_at ASC);

CREATE TABLE IF NOT EXISTS leaderboard_profiles (
  visitor_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL DEFAULT 'ANONYMOUS',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
