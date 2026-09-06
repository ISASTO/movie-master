const READY_DATABASES = new WeakSet();

const RUN_COLUMNS = [
  ["device_type", "TEXT"],
  ["browser_name", "TEXT"],
  ["control_method", "TEXT"],
  ["quality_level", "TEXT"],
  ["country_code", "TEXT"],
  ["region", "TEXT"],
  ["region_code", "TEXT"],
  ["city", "TEXT"],
  ["latitude", "REAL"],
  ["longitude", "REAL"],
];

const LIFECYCLE_SCHEMA = `CREATE TABLE IF NOT EXISTS game_run_lifecycle (
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
)`;

const DEVICE_TYPES = new Set([
  "WINDOWS PC",
  "MAC",
  "LINUX PC",
  "IPHONE",
  "IPAD",
  "ANDROID PHONE",
  "ANDROID TABLET",
  "OTHER",
]);
const BROWSERS = new Set(["CHROME", "EDGE", "FIREFOX", "SAFARI", "OPERA", "OTHER"]);
const CONTROL_METHODS = new Set(["CONTROLLER", "MOUSE", "KEYBOARD", "TOUCH", "UNKNOWN"]);
const QUALITY_LEVELS = new Set(["HIGH", "MEDIUM", "LOW", "UNKNOWN"]);

function cleanLocationText(value, maxLength = 120) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().replace(/\s+/g, " ").slice(0, maxLength);
  return cleaned || null;
}

function roundedCoordinate(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.round(number * 10) / 10;
}

function category(value, allowed, fallback) {
  const normalized = String(value ?? "").trim().toUpperCase();
  return allowed.has(normalized) ? normalized : fallback;
}

function isDuplicateColumnError(error) {
  return /duplicate column name|already exists/i.test(String(error?.message || error || ""));
}

export async function ensureRunDataSchema(db) {
  if (READY_DATABASES.has(db)) return;

  const info = await db.prepare("PRAGMA table_info(game_runs)").all();
  const present = new Set((info?.results ?? []).map((row) => String(row.name)));
  for (const [name, type] of RUN_COLUMNS) {
    if (present.has(name)) continue;
    try {
      await db.prepare(`ALTER TABLE game_runs ADD COLUMN ${name} ${type}`).run();
    } catch (error) {
      // Separate Worker isolates can receive finishes at the same instant. If
      // another isolate added the column after our PRAGMA read, the schema is
      // already in the desired state and there is nothing to recover from.
      if (!isDuplicateColumnError(error)) throw error;
    }
  }

  await db.prepare(
    "CREATE INDEX IF NOT EXISTS idx_game_runs_finished_at ON game_runs(finished_at DESC)",
  ).run();
  await db.prepare(LIFECYCLE_SCHEMA).run();
  await db.prepare(
    "CREATE INDEX IF NOT EXISTS idx_game_run_lifecycle_updated ON game_run_lifecycle(updated_at DESC)",
  ).run();
  await db.prepare(
    "CREATE INDEX IF NOT EXISTS idx_game_run_lifecycle_visitor ON game_run_lifecycle(visitor_id, updated_at DESC)",
  ).run();
  await db.prepare(
    `INSERT OR IGNORE INTO tracking_meta (key, value)
     VALUES ('run_telemetry_started_at', CURRENT_TIMESTAMP)`,
  ).run();

  READY_DATABASES.add(db);
}

export function runTelemetryFromRequest(body, request) {
  const cf = request.cf ?? {};
  return {
    deviceType: category(body.deviceType, DEVICE_TYPES, "OTHER"),
    browserName: category(body.browserName, BROWSERS, "OTHER"),
    controlMethod: category(body.controlMethod, CONTROL_METHODS, "UNKNOWN"),
    qualityLevel: category(body.qualityLevel, QUALITY_LEVELS, "UNKNOWN"),
    countryCode: cleanLocationText(cf.country, 2),
    region: cleanLocationText(cf.region),
    regionCode: cleanLocationText(cf.regionCode, 12),
    city: cleanLocationText(cf.city),
    latitude: roundedCoordinate(cf.latitude),
    longitude: roundedCoordinate(cf.longitude),
  };
}
