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

export async function ensureRunDataSchema(db) {
  if (READY_DATABASES.has(db)) return;

  const info = await db.prepare("PRAGMA table_info(game_runs)").all();
  const present = new Set((info?.results ?? []).map((row) => String(row.name)));
  for (const [name, type] of RUN_COLUMNS) {
    if (present.has(name)) continue;
    await db.prepare(`ALTER TABLE game_runs ADD COLUMN ${name} ${type}`).run();
  }

  await db.prepare(
    "CREATE INDEX IF NOT EXISTS idx_game_runs_finished_at ON game_runs(finished_at DESC)",
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
