const ALLOWED_ORIGINS = new Set([
  "https://moviemaster.vip",
  "https://www.moviemaster.vip",
  "https://isasto.github.io",
]);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VALID_SECTIONS = new Set(["site", "game"]);
const VALID_GAME_SOURCES = new Set(["site", "direct", "unknown"]);
const VALID_MODES = new Set(["NORMAL", "HARDCORE"]);
const CHICAGO_TIME_ZONE = "America/Chicago";

function corsHeaders(origin) {
  const headers = {
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

function originIsAllowed(request) {
  const origin = request.headers.get("Origin");
  return !origin || ALLOWED_ORIGINS.has(origin);
}

function chicagoParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CHICAGO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    hour: Number(values.hour),
  };
}

function sqliteTimestampToIso(value) {
  if (!value) return null;
  const parsed = new Date(`${String(value).replace(" ", "T")}Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function boundedInteger(value, min = 0, max = 1_000_000_000) {
  const number = Math.floor(finiteNumber(value, 0));
  return Math.max(min, Math.min(max, number));
}

function roundedCoordinate(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.round(number * 10) / 10;
}

function cleanLocationText(value, maxLength = 120) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().replace(/\s+/g, " ").slice(0, maxLength);
  return cleaned || null;
}

function playerTag(visitorId) {
  let hash = 2166136261;
  for (let index = 0; index < visitorId.length; index += 1) {
    hash ^= visitorId.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `PLAYER ${(hash >>> 0).toString(16).toUpperCase().padStart(8, "0").slice(-6)}`;
}

async function recordVisitContext(env, request, visitorId, section) {
  if (typeof visitorId !== "string" || !UUID_PATTERN.test(visitorId) || !VALID_SECTIONS.has(section)) {
    return;
  }

  const visitor = visitorId.toLowerCase();
  const { date, hour } = chicagoParts();
  const cf = request.cf ?? {};
  const countryCode = cleanLocationText(cf.country, 2);
  const region = cleanLocationText(cf.region);
  const city = cleanLocationText(cf.city);
  const latitude = roundedCoordinate(cf.latitude);
  const longitude = roundedCoordinate(cf.longitude);

  const statements = [
    env.DB
      .prepare(
        `INSERT OR IGNORE INTO visitor_hourly
          (visitor_id, section, visit_date, visit_hour)
         VALUES (?, ?, ?, ?)`,
      )
      .bind(visitor, section, date, hour),
  ];

  if (countryCode || region || city) {
    statements.push(
      env.DB
        .prepare(
          `INSERT OR IGNORE INTO visitor_locations
            (visitor_id, section, country_code, region, city, latitude, longitude)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(visitor, section, countryCode, region, city, latitude, longitude),
    );
  }

  await env.DB.batch(statements);
}

async function recordGameSource(env, visitorId, requestedSource) {
  if (typeof visitorId !== "string" || !UUID_PATTERN.test(visitorId)) return;

  const visitor = visitorId.toLowerCase();
  const source = VALID_GAME_SOURCES.has(requestedSource) ? requestedSource : "unknown";
  const { date } = chicagoParts();

  await env.DB.batch([
    env.DB
      .prepare(
        `INSERT OR IGNORE INTO game_source_first (visitor_id, source)
         SELECT ?,
           CASE
             WHEN game.first_seen < (
               SELECT value FROM tracking_meta WHERE key = 'game_source_started_at'
             ) THEN 'unknown'
             ELSE ?
           END
         FROM visitor_sections AS game
         WHERE game.visitor_id = ? AND game.section = 'game'`,
      )
      .bind(visitor, source, visitor),
    env.DB
      .prepare(
        `INSERT OR IGNORE INTO game_source_daily (visitor_id, visit_date, source)
         SELECT ?, ?, ?
         FROM visitor_daily AS game_day
         WHERE game_day.visitor_id = ?
           AND game_day.section = 'game'
           AND game_day.visit_date = ?
           AND game_day.first_seen >= (
             SELECT value FROM tracking_meta WHERE key = 'game_source_started_at'
           )`,
      )
      .bind(visitor, date, source, visitor, date),
  ]);
}

async function getGameSourceBreakdown(env, today) {
  const [allTimeResult, todayResult] = await env.DB.batch([
    env.DB.prepare(
      `SELECT source, COUNT(*) AS count
       FROM game_source_first
       GROUP BY source`,
    ),
    env.DB
      .prepare(
        `SELECT source, COUNT(*) AS count
         FROM game_source_daily
         WHERE visit_date = ?
         GROUP BY source`,
      )
      .bind(today),
  ]);

  const allTime = { site: 0, direct: 0, unknown: 0 };
  const todayCounts = { site: 0, direct: 0, unknown: 0 };
  for (const row of allTimeResult.results ?? []) {
    if (VALID_GAME_SOURCES.has(row.source)) allTime[row.source] = Number(row.count ?? 0);
  }
  for (const row of todayResult.results ?? []) {
    if (VALID_GAME_SOURCES.has(row.source)) todayCounts[row.source] = Number(row.count ?? 0);
  }
  return { allTime, today: todayCounts };
}

async function augmentTrafficPayload(env, payload) {
  const { date: today } = chicagoParts();
  try {
    const sources = await getGameSourceBreakdown(env, today);
    const gameTotal = Number(payload.summary?.gameTotal ?? 0);
    const gameToday = Number(payload.summary?.todayGame ?? 0);
    const classifiedAllTime = sources.allTime.site + sources.allTime.direct;
    const classifiedToday = sources.today.site + sources.today.direct;

    payload.summary = {
      ...payload.summary,
      gameFromSiteTotal: sources.allTime.site,
      gameDirectTotal: sources.allTime.direct,
      gameUnclassifiedTotal: Math.max(0, gameTotal - classifiedAllTime),
      gameFromSiteToday: sources.today.site,
      gameDirectToday: sources.today.direct,
      gameUnclassifiedToday: Math.max(0, gameToday - classifiedToday),
    };
  } catch (error) {
    console.error("Unable to load game acquisition sources", error);
  }
  return payload;
}

function normalizeGroupedRows(rows, keyName, keyValues) {
  const output = Object.fromEntries(
    keyValues.map((key) => [key, { [keyName]: key, site: 0, game: 0 }]),
  );
  for (const row of rows ?? []) {
    const key = Number(row[keyName]);
    if (output[key] && VALID_SECTIONS.has(row.section)) {
      output[key][row.section] = Number(row.count ?? 0);
    }
  }
  return keyValues.map((key) => output[key]);
}

function normalizeLocationRows(rows) {
  return (rows ?? []).map((row) => ({
    countryCode: row.country_code || null,
    region: row.region || null,
    city: row.city || null,
    latitude: row.latitude == null ? null : Number(row.latitude),
    longitude: row.longitude == null ? null : Number(row.longitude),
    count: Number(row.count ?? 0),
  }));
}

async function getDetails(env) {
  const { date: today } = chicagoParts();
  const [
    hourlyResult,
    weekdayResult,
    siteLocationsResult,
    gameLocationsResult,
    metaResult,
    startsResult,
    runAggregateResult,
    medianResult,
    returningResult,
    gameVisitorsResult,
    modeResult,
    leaderboardResult,
  ] = await env.DB.batch([
    env.DB.prepare(
      `SELECT section, visit_hour AS hour, COUNT(*) AS count
       FROM visitor_hourly
       GROUP BY section, visit_hour
       ORDER BY visit_hour`,
    ),
    env.DB.prepare(
      `SELECT section, CAST(strftime('%w', visit_date) AS INTEGER) AS weekday,
              COUNT(*) AS count
       FROM visitor_daily
       GROUP BY section, weekday
       ORDER BY weekday`,
    ),
    env.DB.prepare(
      `SELECT country_code, region, city,
              ROUND(AVG(latitude), 1) AS latitude,
              ROUND(AVG(longitude), 1) AS longitude,
              COUNT(*) AS count
       FROM visitor_locations
       WHERE section = 'site'
       GROUP BY country_code, region, city
       ORDER BY count DESC, city ASC
       LIMIT 75`,
    ),
    env.DB.prepare(
      `SELECT country_code, region, city,
              ROUND(AVG(latitude), 1) AS latitude,
              ROUND(AVG(longitude), 1) AS longitude,
              COUNT(*) AS count
       FROM visitor_locations
       WHERE section = 'game'
       GROUP BY country_code, region, city
       ORDER BY count DESC, city ASC
       LIMIT 75`,
    ),
    env.DB.prepare(
      `SELECT key, value
       FROM tracking_meta
       WHERE key IN ('visit_context_started_at', 'game_stats_started_at')`,
    ),
    env.DB.prepare(
      `SELECT COUNT(*) AS starts,
              COUNT(DISTINCT visitor_id) AS unique_players,
              SUM(CASE WHEN visit_date = ? THEN 1 ELSE 0 END) AS starts_today
       FROM game_starts`,
    ).bind(today),
    env.DB.prepare(
      `SELECT COUNT(*) AS completed,
              AVG(score) AS avg_score,
              MAX(score) AS high_score,
              AVG(game_time_seconds) AS avg_time,
              AVG(longest_streak) AS avg_streak,
              MAX(longest_streak) AS high_streak,
              SUM(game_time_seconds) AS total_time,
              SUM(popcorn_collected) AS popcorn_collected,
              SUM(popcorn_missed) AS popcorn_missed,
              SUM(garbage_destroyed) AS garbage_destroyed,
              SUM(destroyed_by_stars) AS destroyed_by_stars,
              SUM(destroyed_by_blasts) AS destroyed_by_blasts,
              SUM(stars_fired) AS stars_fired,
              SUM(stars_hit) AS stars_hit,
              SUM(hits_taken) AS hits_taken,
              SUM(shield_blocks) AS shield_blocks,
              SUM(blasts_used) AS blasts_used,
              SUM(powerup_shield) AS powerup_shield,
              SUM(powerup_speed) AS powerup_speed,
              SUM(powerup_super) AS powerup_super,
              SUM(powerup_magnet) AS powerup_magnet,
              SUM(CASE WHEN visit_date = ? THEN 1 ELSE 0 END) AS completed_today
       FROM game_runs`,
    ).bind(today),
    env.DB.prepare(
      `SELECT AVG(score) AS median_score
       FROM (
         SELECT score
         FROM game_runs
         ORDER BY score
         LIMIT (2 - (SELECT COUNT(*) FROM game_runs) % 2)
         OFFSET (SELECT MAX(0, (COUNT(*) - 1) / 2) FROM game_runs)
       )`,
    ),
    env.DB.prepare(
      `SELECT COUNT(*) AS count
       FROM (
         SELECT visitor_id
         FROM visitor_daily
         WHERE section = 'game'
         GROUP BY visitor_id
         HAVING COUNT(DISTINCT visit_date) >= 2
       )`,
    ),
    env.DB.prepare(
      `SELECT COUNT(*) AS count
       FROM visitor_sections
       WHERE section = 'game'`,
    ),
    env.DB.prepare(
      `SELECT mode, COUNT(*) AS count
       FROM game_starts
       GROUP BY mode`,
    ),
    env.DB.prepare(
      `SELECT visitor_id, mode, score, longest_streak, game_time_seconds, finished_at
       FROM game_runs
       ORDER BY score DESC, longest_streak DESC, game_time_seconds DESC, finished_at ASC
       LIMIT 10`,
    ),
  ]);

  const tracking = {};
  for (const row of metaResult.results ?? []) tracking[row.key] = sqliteTimestampToIso(row.value);

  const starts = Number(startsResult.results?.[0]?.starts ?? 0);
  const uniquePlayers = Number(startsResult.results?.[0]?.unique_players ?? 0);
  const startsToday = Number(startsResult.results?.[0]?.starts_today ?? 0);
  const aggregate = runAggregateResult.results?.[0] ?? {};
  const completed = Number(aggregate.completed ?? 0);
  const gameVisitors = Number(gameVisitorsResult.results?.[0]?.count ?? 0);
  const returningPlayers = Number(returningResult.results?.[0]?.count ?? 0);
  const starsFired = Number(aggregate.stars_fired ?? 0);
  const starsHit = Number(aggregate.stars_hit ?? 0);

  const modeStarts = { NORMAL: 0, HARDCORE: 0 };
  for (const row of modeResult.results ?? []) {
    if (VALID_MODES.has(row.mode)) modeStarts[row.mode] = Number(row.count ?? 0);
  }

  return {
    generatedAt: new Date().toISOString(),
    timeZone: CHICAGO_TIME_ZONE,
    tracking: {
      trafficContextStartedAt: tracking.visit_context_started_at ?? null,
      gameStatsStartedAt: tracking.game_stats_started_at ?? null,
    },
    hourly: normalizeGroupedRows(hourlyResult.results, "hour", Array.from({ length: 24 }, (_, i) => i)),
    weekdays: normalizeGroupedRows(weekdayResult.results, "weekday", [0, 1, 2, 3, 4, 5, 6]),
    locations: {
      site: normalizeLocationRows(siteLocationsResult.results),
      game: normalizeLocationRows(gameLocationsResult.results),
    },
    game: {
      gameVisitors,
      starts,
      startsToday,
      completed,
      completedToday: Number(aggregate.completed_today ?? 0),
      uniquePlayers,
      returningPlayers,
      returningRate: gameVisitors > 0 ? (returningPlayers / gameVisitors) * 100 : 0,
      completionRate: starts > 0 ? (completed / starts) * 100 : 0,
      averageRunsPerPlayer: uniquePlayers > 0 ? completed / uniquePlayers : 0,
      averageScore: Number(aggregate.avg_score ?? 0),
      medianScore: Number(medianResult.results?.[0]?.median_score ?? 0),
      highScore: Number(aggregate.high_score ?? 0),
      averageTimeSeconds: Number(aggregate.avg_time ?? 0),
      totalTimeSeconds: Number(aggregate.total_time ?? 0),
      averageLongestStreak: Number(aggregate.avg_streak ?? 0),
      highStreak: Number(aggregate.high_streak ?? 0),
      starAccuracy: starsFired > 0 ? (starsHit / starsFired) * 100 : 0,
      totals: {
        popcornCollected: Number(aggregate.popcorn_collected ?? 0),
        popcornMissed: Number(aggregate.popcorn_missed ?? 0),
        garbageDestroyed: Number(aggregate.garbage_destroyed ?? 0),
        destroyedByStars: Number(aggregate.destroyed_by_stars ?? 0),
        destroyedByBlasts: Number(aggregate.destroyed_by_blasts ?? 0),
        starsFired,
        starsHit,
        hitsTaken: Number(aggregate.hits_taken ?? 0),
        shieldBlocks: Number(aggregate.shield_blocks ?? 0),
        blastsUsed: Number(aggregate.blasts_used ?? 0),
        powerups: {
          shield: Number(aggregate.powerup_shield ?? 0),
          speed: Number(aggregate.powerup_speed ?? 0),
          super: Number(aggregate.powerup_super ?? 0),
          magnet: Number(aggregate.powerup_magnet ?? 0),
        },
      },
      modeStarts,
      leaderboard: (leaderboardResult.results ?? []).map((row, index) => ({
        rank: index + 1,
        player: playerTag(row.visitor_id),
        mode: row.mode,
        score: Number(row.score ?? 0),
        longestStreak: Number(row.longest_streak ?? 0),
        gameTimeSeconds: Number(row.game_time_seconds ?? 0),
        finishedAt: sqliteTimestampToIso(row.finished_at),
      })),
    },
  };
}

async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

async function handleGameEvent(request, env) {
  const origin = request.headers.get("Origin");
  if (!originIsAllowed(request)) return jsonResponse({ error: "Origin not allowed" }, 403, null);
  const body = await readJsonBody(request);
  if (!body) return jsonResponse({ error: "Invalid JSON" }, 400, origin);

  const visitorId = body.visitorId;
  const runId = body.runId;
  const event = body.event;
  const mode = String(body.mode ?? "NORMAL").toUpperCase();

  if (typeof visitorId !== "string" || !UUID_PATTERN.test(visitorId)) {
    return jsonResponse({ error: "Invalid visitor ID" }, 400, origin);
  }
  if (typeof runId !== "string" || !UUID_PATTERN.test(runId)) {
    return jsonResponse({ error: "Invalid run ID" }, 400, origin);
  }
  if (!VALID_MODES.has(mode)) return jsonResponse({ error: "Invalid mode" }, 400, origin);
  if (event !== "start" && event !== "finish") {
    return jsonResponse({ error: "Invalid event" }, 400, origin);
  }

  const visitor = visitorId.toLowerCase();
  const run = runId.toLowerCase();
  const { date } = chicagoParts();

  await env.DB
    .prepare(
      `INSERT OR IGNORE INTO game_starts (run_id, visitor_id, mode, visit_date)
       VALUES (?, ?, ?, ?)`,
    )
    .bind(run, visitor, mode, date)
    .run();

  if (event === "finish") {
    await env.DB
      .prepare(
        `INSERT OR IGNORE INTO game_runs (
          run_id, visitor_id, mode, visit_date, score, longest_streak,
          game_time_seconds, popcorn_collected, popcorn_missed,
          garbage_destroyed, destroyed_by_stars, destroyed_by_blasts,
          stars_fired, stars_hit, hits_taken, shield_blocks, blasts_used,
          powerup_shield, powerup_speed, powerup_super, powerup_magnet
        )
        SELECT ?, visitor_id, mode, visit_date, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        FROM game_starts
        WHERE run_id = ? AND visitor_id = ?`,
      )
      .bind(
        run,
        boundedInteger(body.score),
        boundedInteger(body.longestStreak),
        boundedInteger(body.gameTimeSeconds, 0, 604800),
        boundedInteger(body.popcornCollected),
        boundedInteger(body.popcornMissed),
        boundedInteger(body.garbageDestroyed),
        boundedInteger(body.destroyedByStars),
        boundedInteger(body.destroyedByBlasts),
        boundedInteger(body.starsFired),
        boundedInteger(body.starsHit),
        boundedInteger(body.hitsTaken),
        boundedInteger(body.shieldBlocks),
        boundedInteger(body.blastsUsed),
        boundedInteger(body.powerupShield),
        boundedInteger(body.powerupSpeed),
        boundedInteger(body.powerupSuper),
        boundedInteger(body.powerupMagnet),
        run,
        visitor,
      )
      .run();
  }

  return jsonResponse({ ok: true }, 200, origin);
}

export async function handleEnhancedRequest(request, env, ctx, baseWorker) {
  const url = new URL(request.url);
  const origin = request.headers.get("Origin");

  if (request.method === "GET" && url.pathname === "/details") {
    if (!originIsAllowed(request)) return jsonResponse({ error: "Origin not allowed" }, 403, null);
    try {
      return jsonResponse(await getDetails(env), 200, origin);
    } catch (error) {
      console.error("Unable to load dashboard details", error);
      return jsonResponse({ error: "Internal server error" }, 500, origin);
    }
  }

  if (request.method === "POST" && url.pathname === "/game-event") {
    try {
      return await handleGameEvent(request, env);
    } catch (error) {
      console.error("Unable to record game event", error);
      return jsonResponse({ error: "Internal server error" }, 500, origin);
    }
  }

  if (request.method === "POST" && (url.pathname === "/visit" || url.pathname === "/section-visit")) {
    let body = null;
    try {
      body = await request.clone().json();
    } catch {
      // The base worker handles malformed bodies.
    }

    const response = await baseWorker.fetch(request, env, ctx);
    if (response.ok && body?.visitorId) {
      const section = url.pathname === "/visit" ? "site" : body.section;
      try {
        await recordVisitContext(env, request, body.visitorId, section);
        if (section === "game") await recordGameSource(env, body.visitorId, body.source);
      } catch (error) {
        console.error("Unable to record extended visitor details", error);
      }
    }
    return response;
  }

  if (request.method === "GET" && url.pathname === "/traffic") {
    const workerUrl = new URL(url);
    workerUrl.pathname = "/analytics";
    const workerRequest = new Request(workerUrl.toString(), request);
    const response = await baseWorker.fetch(workerRequest, env, ctx);
    if (!response.ok) return response;

    const payload = await augmentTrafficPayload(env, await response.json());
    return new Response(JSON.stringify(payload), {
      status: response.status,
      headers: response.headers,
    });
  }

  return baseWorker.fetch(request, env, ctx);
}
