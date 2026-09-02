import { ensureRunDataSchema, runTelemetryFromRequest } from "./run-data.js";

const ALLOWED_ORIGINS = new Set([
  "https://moviemaster.vip",
  "https://www.moviemaster.vip",
  "https://isasto.github.io",
]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function corsHeaders(origin) {
  const headers = {
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers.Vary = "Origin";
  }
  return headers;
}

function jsonResponse(data, status = 200, origin = null) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders(origin) });
}

function playerTag(visitorId) {
  let hash = 2166136261;
  for (let index = 0; index < visitorId.length; index += 1) {
    hash ^= visitorId.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `PLAYER ${(hash >>> 0).toString(16).toUpperCase().padStart(8, "0").slice(-6)}`;
}

function displayPlayer(row) {
  const name = String(row.display_name ?? "").trim().toUpperCase();
  return name && name !== "ANONYMOUS" ? name : playerTag(row.visitor_id);
}

function sqliteTimestampToIso(value) {
  if (!value) return null;
  const parsed = new Date(`${String(value).replace(" ", "T")}Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function integer(row, key) {
  return Math.max(0, Number(row[key] ?? 0));
}

export async function captureRunTelemetry(request) {
  let body;
  try {
    body = await request.clone().json();
  } catch {
    return null;
  }
  if (body?.event !== "finish") return null;
  if (typeof body.runId !== "string" || !UUID_PATTERN.test(body.runId)) return null;
  if (typeof body.visitorId !== "string" || !UUID_PATTERN.test(body.visitorId)) return null;

  return {
    runId: body.runId.toLowerCase(),
    visitorId: body.visitorId.toLowerCase(),
    ...runTelemetryFromRequest(body, request),
  };
}

export async function persistRunTelemetry(db, telemetry) {
  if (!telemetry) return;
  await ensureRunDataSchema(db);
  await db.prepare(
    `UPDATE game_runs SET
       device_type = ?,
       browser_name = ?,
       control_method = ?,
       quality_level = ?,
       country_code = ?,
       region = ?,
       region_code = ?,
       city = ?,
       latitude = ?,
       longitude = ?
     WHERE run_id = ? AND visitor_id = ?`,
  ).bind(
    telemetry.deviceType,
    telemetry.browserName,
    telemetry.controlMethod,
    telemetry.qualityLevel,
    telemetry.countryCode,
    telemetry.region,
    telemetry.regionCode,
    telemetry.city,
    telemetry.latitude,
    telemetry.longitude,
    telemetry.runId,
    telemetry.visitorId,
  ).run();
}

export async function handleRunDetailsRequest(request, env) {
  const url = new URL(request.url);
  if (url.pathname !== "/run-details") return null;

  const origin = request.headers.get("Origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return jsonResponse({ error: "Origin not allowed" }, 403, null);
  }
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (request.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405, origin);
  }

  const runId = url.searchParams.get("runId") || "";
  if (!UUID_PATTERN.test(runId)) {
    return jsonResponse({ error: "Invalid run ID" }, 400, origin);
  }

  await ensureRunDataSchema(env.DB);
  const row = await env.DB.prepare(
    `SELECT
       game_runs.*,
       game_starts.started_at,
       leaderboard_profiles.display_name,
       game_source_first.source AS game_source
     FROM game_runs
     LEFT JOIN game_starts ON game_starts.run_id = game_runs.run_id
     LEFT JOIN leaderboard_profiles
       ON leaderboard_profiles.visitor_id = game_runs.visitor_id
     LEFT JOIN game_source_first
       ON game_source_first.visitor_id = game_runs.visitor_id
     WHERE game_runs.run_id = ?
     LIMIT 1`,
  ).bind(runId.toLowerCase()).first();

  if (!row) return jsonResponse({ error: "Run not found" }, 404, origin);

  const starsFired = integer(row, "stars_fired");
  const starsHit = integer(row, "stars_hit");
  return jsonResponse({
    runId: row.run_id,
    player: displayPlayer(row),
    publicName: String(row.display_name ?? "ANONYMOUS").toUpperCase(),
    mode: row.mode,
    source: row.game_source || "unknown",
    startedAt: sqliteTimestampToIso(row.started_at),
    finishedAt: sqliteTimestampToIso(row.finished_at),
    device: {
      type: row.device_type || "UNKNOWN",
      browser: row.browser_name || "UNKNOWN",
      controlMethod: row.control_method || "UNKNOWN",
      quality: row.quality_level || "UNKNOWN",
    },
    location: {
      city: row.city || null,
      region: row.region || null,
      regionCode: row.region_code || null,
      countryCode: row.country_code || null,
      latitude: row.latitude == null ? null : Number(row.latitude),
      longitude: row.longitude == null ? null : Number(row.longitude),
    },
    stats: {
      score: integer(row, "score"),
      longestStreak: integer(row, "longest_streak"),
      gameTimeSeconds: integer(row, "game_time_seconds"),
      popcornCollected: integer(row, "popcorn_collected"),
      popcornMissed: integer(row, "popcorn_missed"),
      garbageDestroyed: integer(row, "garbage_destroyed"),
      destroyedByStars: integer(row, "destroyed_by_stars"),
      destroyedByBlasts: integer(row, "destroyed_by_blasts"),
      starsFired,
      starsHit,
      starAccuracy: starsFired > 0 ? (starsHit / starsFired) * 100 : 0,
      hitsTaken: integer(row, "hits_taken"),
      shieldBlocks: integer(row, "shield_blocks"),
      blastsUsed: integer(row, "blasts_used"),
      powerups: {
        shield: integer(row, "powerup_shield"),
        speed: integer(row, "powerup_speed"),
        super: integer(row, "powerup_super"),
        magnet: integer(row, "powerup_magnet"),
      },
    },
  }, 200, origin);
}
