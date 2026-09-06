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
  if (body?.event !== "finish" && body?.event !== "checkpoint") return null;
  if (typeof body.runId !== "string" || !UUID_PATTERN.test(body.runId)) return null;
  if (typeof body.visitorId !== "string" || !UUID_PATTERN.test(body.visitorId)) return null;

  return {
    event: body.event,
    runId: body.runId.toLowerCase(),
    visitorId: body.visitorId.toLowerCase(),
    ...runTelemetryFromRequest(body, request),
  };
}

export async function persistRunTelemetry(db, telemetry) {
  if (!telemetry) return;
  await ensureRunDataSchema(db);
  const updateSql = (table) => `UPDATE ${table} SET
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
     WHERE run_id = ? AND visitor_id = ?`;
  const bindings = [
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
  ];
  await db.prepare(updateSql("game_run_lifecycle")).bind(...bindings).run();
  if (telemetry.event !== "checkpoint") {
    await db.prepare(updateSql("game_runs")).bind(...bindings).run();
  }
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
       game_starts.run_id,
       game_starts.visitor_id,
       game_starts.mode,
       game_starts.started_at,
       game_runs.finished_at,
       game_run_lifecycle.state AS lifecycle_state,
       game_run_lifecycle.end_reason,
       game_run_lifecycle.ended_at,
       game_run_lifecycle.updated_at,
       COALESCE(game_runs.score, game_run_lifecycle.score, 0) AS score,
       COALESCE(game_runs.longest_streak, game_run_lifecycle.longest_streak, 0) AS longest_streak,
       COALESCE(game_runs.game_time_seconds, game_run_lifecycle.game_time_seconds, 0) AS game_time_seconds,
       COALESCE(game_runs.popcorn_collected, game_run_lifecycle.popcorn_collected, 0) AS popcorn_collected,
       COALESCE(game_runs.popcorn_missed, game_run_lifecycle.popcorn_missed, 0) AS popcorn_missed,
       COALESCE(game_runs.garbage_destroyed, game_run_lifecycle.garbage_destroyed, 0) AS garbage_destroyed,
       COALESCE(game_runs.destroyed_by_stars, game_run_lifecycle.destroyed_by_stars, 0) AS destroyed_by_stars,
       COALESCE(game_runs.destroyed_by_blasts, game_run_lifecycle.destroyed_by_blasts, 0) AS destroyed_by_blasts,
       COALESCE(game_runs.stars_fired, game_run_lifecycle.stars_fired, 0) AS stars_fired,
       COALESCE(game_runs.stars_hit, game_run_lifecycle.stars_hit, 0) AS stars_hit,
       COALESCE(game_runs.hits_taken, game_run_lifecycle.hits_taken, 0) AS hits_taken,
       COALESCE(game_runs.shield_blocks, game_run_lifecycle.shield_blocks, 0) AS shield_blocks,
       COALESCE(game_runs.blasts_used, game_run_lifecycle.blasts_used, 0) AS blasts_used,
       COALESCE(game_runs.powerup_shield, game_run_lifecycle.powerup_shield, 0) AS powerup_shield,
       COALESCE(game_runs.powerup_speed, game_run_lifecycle.powerup_speed, 0) AS powerup_speed,
       COALESCE(game_runs.powerup_super, game_run_lifecycle.powerup_super, 0) AS powerup_super,
       COALESCE(game_runs.powerup_magnet, game_run_lifecycle.powerup_magnet, 0) AS powerup_magnet,
       COALESCE(game_runs.device_type, game_run_lifecycle.device_type) AS device_type,
       COALESCE(game_runs.browser_name, game_run_lifecycle.browser_name) AS browser_name,
       COALESCE(game_runs.control_method, game_run_lifecycle.control_method) AS control_method,
       COALESCE(game_runs.quality_level, game_run_lifecycle.quality_level) AS quality_level,
       leaderboard_profiles.display_name,
       game_source_first.source AS game_source,
       COALESCE(game_runs.country_code, game_run_lifecycle.country_code, visitor_locations.country_code) AS detail_country_code,
       COALESCE(game_runs.region, game_run_lifecycle.region, visitor_locations.region) AS detail_region,
       COALESCE(game_runs.region_code, game_run_lifecycle.region_code) AS detail_region_code,
       COALESCE(game_runs.city, game_run_lifecycle.city, visitor_locations.city) AS detail_city,
       COALESCE(game_runs.latitude, game_run_lifecycle.latitude, visitor_locations.latitude) AS detail_latitude,
       COALESCE(game_runs.longitude, game_run_lifecycle.longitude, visitor_locations.longitude) AS detail_longitude
     FROM game_starts
     LEFT JOIN game_runs ON game_runs.run_id = game_starts.run_id
     LEFT JOIN game_run_lifecycle ON game_run_lifecycle.run_id = game_starts.run_id
     LEFT JOIN leaderboard_profiles
       ON leaderboard_profiles.visitor_id = game_starts.visitor_id
     LEFT JOIN game_source_first
       ON game_source_first.visitor_id = game_starts.visitor_id
     LEFT JOIN visitor_locations
       ON visitor_locations.visitor_id = game_starts.visitor_id
      AND visitor_locations.section = 'game'
     WHERE game_starts.run_id = ?
     LIMIT 1`,
  ).bind(runId.toLowerCase()).first();

  if (!row) return jsonResponse({ error: "Run not found" }, 404, origin);

  const starsFired = integer(row, "stars_fired");
  const starsHit = integer(row, "stars_hit");
  const status = row.finished_at
    ? "FINISHED"
    : row.lifecycle_state === "CHECKPOINT"
      ? "CHECKPOINT"
      : "STARTED_ONLY";
  return jsonResponse({
    runId: row.run_id,
    player: displayPlayer(row),
    publicName: String(row.display_name ?? "ANONYMOUS").toUpperCase(),
    generatedPlayerId: playerTag(row.visitor_id),
    mode: row.mode,
    status,
    endReason: row.end_reason || null,
    source: row.game_source || "unknown",
    startedAt: sqliteTimestampToIso(row.started_at),
    finishedAt: sqliteTimestampToIso(row.finished_at),
    endedAt: sqliteTimestampToIso(row.ended_at),
    lastEventAt: sqliteTimestampToIso(row.finished_at || row.updated_at || row.started_at),
    device: {
      type: row.device_type || "UNKNOWN",
      browser: row.browser_name || "UNKNOWN",
      controlMethod: row.control_method || "UNKNOWN",
      quality: row.quality_level || "UNKNOWN",
    },
    location: {
      city: row.detail_city || null,
      region: row.detail_region || null,
      regionCode: row.detail_region_code || null,
      countryCode: row.detail_country_code || null,
      latitude: row.detail_latitude == null ? null : Number(row.detail_latitude),
      longitude: row.detail_longitude == null ? null : Number(row.detail_longitude),
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
