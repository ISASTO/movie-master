const ALLOWED_ORIGINS = new Set([
  "https://moviemaster.vip",
  "https://www.moviemaster.vip",
  "https://isasto.github.io",
]);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CHICAGO_TIME_ZONE = "America/Chicago";
const PUBLIC_TOP_LIMIT = 5;
const LEGACY_IMPORT_CUTOFF = "2026-09-02 16:53:41";
const LEGACY_SCORE_MAX = 100_000_000;
export const LEADERBOARD_NAME_MAX_LENGTH = 24;

const readyDatabases = new WeakSet();

const BLOCKED_NAME_WORDS = new Set([
  "asshole", "bastard", "bitch", "bullshit", "cocksucker", "cunt", "dickhead",
  "faggot", "fuck", "fucker", "fuckers", "fucking", "fuckyou", "motherfucker",
  "nigga", "nigger", "retard", "shit", "shitty", "slut", "whore",
]);

function corsHeaders(origin, methods = "GET, POST, OPTIONS") {
  const headers = {
    "Access-Control-Allow-Headers": "Content-Type, X-Visitor-ID",
    "Access-Control-Allow-Methods": methods,
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

function originIsAllowed(origin) {
  return !origin || ALLOWED_ORIGINS.has(origin);
}

function chicagoDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CHICAGO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function sqliteTimestampToIso(value) {
  if (!value) return null;
  const parsed = new Date(`${String(value).replace(" ", "T")}Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function playerTag(visitorId) {
  let hash = 2166136261;
  for (let index = 0; index < visitorId.length; index += 1) {
    hash ^= visitorId.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `PLAYER ${(hash >>> 0).toString(16).toUpperCase().padStart(8, "0").slice(-6)}`;
}

async function ensureLeaderboardInfrastructure(db) {
  if (readyDatabases.has(db)) return;

  await db.prepare(
    `CREATE TABLE IF NOT EXISTS legacy_leaderboard_scores (
      visitor_id TEXT NOT NULL,
      mode TEXT NOT NULL CHECK (mode IN ('NORMAL', 'HARDCORE')),
      score INTEGER NOT NULL CHECK (score >= 0),
      imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (visitor_id, mode)
    )`,
  ).run();

  await db.prepare(
    `CREATE TABLE IF NOT EXISTS leaderboard_name_claims (
      normalized_name TEXT PRIMARY KEY,
      visitor_id TEXT NOT NULL,
      claimed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  ).run();

  await db.prepare(
    `INSERT OR IGNORE INTO leaderboard_name_claims (normalized_name, visitor_id)
     SELECT UPPER(TRIM(display_name)), visitor_id
     FROM leaderboard_profiles
     WHERE UPPER(TRIM(display_name)) <> 'ANONYMOUS'`,
  ).run();

  readyDatabases.add(db);
}

function analyticsPlayerName(row) {
  const displayName = String(row.display_name ?? "").trim().toUpperCase();
  return displayName && displayName !== "ANONYMOUS"
    ? displayName
    : playerTag(row.visitor_id);
}

function normalizeAnalyticsRows(rows, includeRank = true) {
  return (rows ?? []).map((row, index) => {
    const legacy = Number(row.is_legacy ?? 0) === 1;
    return {
      ...(includeRank ? { rank: index + 1 } : {}),
      runId: legacy ? null : row.run_id,
      legacy,
      player: analyticsPlayerName(row),
      mode: row.mode,
      score: Number(row.score ?? 0),
      longestStreak: row.longest_streak == null ? null : Number(row.longest_streak),
      gameTimeSeconds: row.game_time_seconds == null ? null : Number(row.game_time_seconds),
      finishedAt: sqliteTimestampToIso(row.finished_at),
    };
  });
}

function bestRunsForMode(mode) {
  return `
    WITH source_runs AS (
      SELECT
        run_id,
        visitor_id,
        mode,
        score,
        longest_streak,
        game_time_seconds,
        finished_at,
        0 AS is_legacy
      FROM game_runs
      WHERE mode = '${mode}'

      UNION ALL

      SELECT
        'legacy:' || visitor_id || ':' || mode AS run_id,
        visitor_id,
        mode,
        score,
        NULL AS longest_streak,
        NULL AS game_time_seconds,
        imported_at AS finished_at,
        1 AS is_legacy
      FROM legacy_leaderboard_scores
      WHERE mode = '${mode}'
    ),
    ranked_runs AS (
      SELECT
        source_runs.*,
        ROW_NUMBER() OVER (
          PARTITION BY visitor_id
          ORDER BY score DESC,
                   CASE WHEN longest_streak IS NULL THEN 1 ELSE 0 END ASC,
                   longest_streak DESC,
                   CASE WHEN game_time_seconds IS NULL THEN 1 ELSE 0 END ASC,
                   game_time_seconds DESC,
                   is_legacy ASC,
                   finished_at ASC,
                   run_id ASC
        ) AS player_rank
      FROM source_runs
    )
    SELECT
      ranked_runs.run_id,
      ranked_runs.visitor_id,
      ranked_runs.mode,
      ranked_runs.score,
      ranked_runs.longest_streak,
      ranked_runs.game_time_seconds,
      ranked_runs.finished_at,
      ranked_runs.is_legacy,
      leaderboard_profiles.display_name
    FROM ranked_runs
    LEFT JOIN leaderboard_profiles
      ON leaderboard_profiles.visitor_id = ranked_runs.visitor_id
    WHERE ranked_runs.player_rank = 1
    ORDER BY ranked_runs.score DESC,
             CASE WHEN ranked_runs.longest_streak IS NULL THEN 1 ELSE 0 END ASC,
             ranked_runs.longest_streak DESC,
             CASE WHEN ranked_runs.game_time_seconds IS NULL THEN 1 ELSE 0 END ASC,
             ranked_runs.game_time_seconds DESC,
             ranked_runs.is_legacy ASC,
             ranked_runs.finished_at ASC,
             ranked_runs.run_id ASC
    LIMIT 10
  `;
}

function recentRunsSql() {
  return `
    SELECT
      game_runs.run_id,
      game_runs.visitor_id,
      game_runs.mode,
      game_runs.score,
      game_runs.longest_streak,
      game_runs.game_time_seconds,
      game_runs.finished_at,
      leaderboard_profiles.display_name
    FROM game_runs
    LEFT JOIN leaderboard_profiles
      ON leaderboard_profiles.visitor_id = game_runs.visitor_id
    ORDER BY game_runs.finished_at DESC, game_runs.run_id DESC
    LIMIT 15
  `;
}

function foldLeetspeak(value) {
  const substitutions = {
    "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t",
    "8": "b", "@": "a", "$": "s", "!": "i",
  };
  return [...value].map((character) => substitutions[character] ?? character).join("");
}

function collapseStretchedLetters(value) {
  return value.replace(/([a-z])\1{2,}/g, "$1");
}

function nameFilterForms(value) {
  const folded = foldLeetspeak(
    value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase(),
  );
  const tokens = folded.split(/[^a-z0-9]+/).filter(Boolean);
  const compact = tokens.join("");
  const forms = new Set([compact, collapseStretchedLetters(compact)]);
  for (const token of tokens) {
    forms.add(token);
    forms.add(collapseStretchedLetters(token));
  }
  return forms;
}

export function validateLeaderboardName(value) {
  if (typeof value !== "string") {
    return { ok: false, code: "INVALID_NAME", message: "ENTER A VALID NAME" };
  }

  const name = value
    .normalize("NFKC")
    .replace(/[\p{Cc}\p{Cf}]/gu, "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();

  if (!name) return { ok: true, name: "ANONYMOUS" };
  if ([...name].length > LEADERBOARD_NAME_MAX_LENGTH) {
    return {
      ok: false,
      code: "NAME_TOO_LONG",
      message: `USE ${LEADERBOARD_NAME_MAX_LENGTH} CHARACTERS OR FEWER`,
    };
  }
  if (!/^[\p{L}\p{N} ._'&-]+$/u.test(name)) {
    return {
      ok: false,
      code: "INVALID_CHARACTERS",
      message: "USE LETTERS, NUMBERS, SPACES, OR SIMPLE PUNCTUATION",
    };
  }

  const forms = nameFilterForms(name);
  if (forms.has("moviemaster")) {
    return { ok: false, code: "RESERVED_NAME", message: "THAT NAME IS RESERVED" };
  }
  for (const form of forms) {
    if (BLOCKED_NAME_WORDS.has(form)) {
      return { ok: false, code: "NAME_NOT_ALLOWED", message: "TRY ANOTHER NAME" };
    }
  }
  return { ok: true, name };
}

function publicBoardSql(daily) {
  const dateFilter = daily ? "AND visit_date = ?" : "";
  const legacyUnion = daily
    ? ""
    : `
      UNION ALL
      SELECT
        'legacy:' || visitor_id || ':' || mode AS run_id,
        visitor_id,
        score,
        imported_at AS finished_at
      FROM legacy_leaderboard_scores
      WHERE mode = ?`;

  return `
    WITH parameters(viewer_id) AS (VALUES (?)),
    source_runs AS (
      SELECT run_id, visitor_id, score, finished_at
      FROM game_runs
      WHERE mode = ? ${dateFilter}
      ${legacyUnion}
    ),
    personal_runs AS (
      SELECT
        run_id,
        visitor_id,
        score,
        finished_at,
        ROW_NUMBER() OVER (
          PARTITION BY visitor_id
          ORDER BY score DESC, finished_at ASC, run_id ASC
        ) AS personal_order
      FROM source_runs
    ),
    best_runs AS (
      SELECT run_id, visitor_id, score, finished_at
      FROM personal_runs
      WHERE personal_order = 1
    ),
    ranked_runs AS (
      SELECT
        run_id,
        visitor_id,
        score,
        finished_at,
        RANK() OVER (ORDER BY score DESC) AS display_rank,
        ROW_NUMBER() OVER (
          ORDER BY score DESC, finished_at ASC, visitor_id ASC
        ) AS order_index
      FROM best_runs
    ),
    viewer_position AS (
      SELECT order_index
      FROM ranked_runs, parameters
      WHERE ranked_runs.visitor_id = parameters.viewer_id
    )
    SELECT
      ranked_runs.visitor_id,
      ranked_runs.score,
      ranked_runs.display_rank,
      ranked_runs.order_index,
      ranked_runs.finished_at,
      COALESCE(leaderboard_profiles.display_name, 'ANONYMOUS') AS display_name,
      CASE WHEN ranked_runs.visitor_id = parameters.viewer_id THEN 1 ELSE 0 END AS is_viewer
    FROM ranked_runs
    CROSS JOIN parameters
    LEFT JOIN leaderboard_profiles
      ON leaderboard_profiles.visitor_id = ranked_runs.visitor_id
    WHERE ranked_runs.order_index <= ${PUBLIC_TOP_LIMIT}
       OR ranked_runs.order_index BETWEEN
          COALESCE((SELECT order_index FROM viewer_position), -100) - 1
          AND COALESCE((SELECT order_index FROM viewer_position), -100) + 1
    ORDER BY ranked_runs.order_index
  `;
}

function publicBoardStatement(db, mode, period, dateKey, visitorId) {
  const daily = period === "daily";
  const statement = db.prepare(publicBoardSql(daily));
  return daily
    ? statement.bind(visitorId, mode, dateKey)
    : statement.bind(visitorId, mode, mode);
}

function normalizePublicEntry(row) {
  return {
    rank: Number(row.display_rank ?? 0),
    order: Number(row.order_index ?? 0),
    name: String(row.display_name || "ANONYMOUS").toUpperCase(),
    score: Number(row.score ?? 0),
    isViewer: Boolean(row.is_viewer),
  };
}

function normalizePublicBoard(rows) {
  const entries = (rows ?? []).map(normalizePublicEntry);
  const top = entries.filter((entry) => entry.order <= PUBLIC_TOP_LIMIT);
  const viewer = entries.find((entry) => entry.isViewer) ?? null;
  const nearby = viewer && viewer.order > PUBLIC_TOP_LIMIT
    ? entries.filter((entry) => entry.order > PUBLIC_TOP_LIMIT)
    : [];
  return {
    top,
    nearby,
    viewer: viewer ? { rank: viewer.rank, score: viewer.score } : null,
  };
}

export async function buildPublicLeaderboardPayload(db, visitorId, now = new Date()) {
  await ensureLeaderboardInfrastructure(db);
  const viewerId = typeof visitorId === "string" && UUID_PATTERN.test(visitorId)
    ? visitorId.toLowerCase()
    : "";
  const dateKey = chicagoDateKey(now);
  const results = await db.batch([
    publicBoardStatement(db, "NORMAL", "allTime", dateKey, viewerId),
    publicBoardStatement(db, "NORMAL", "daily", dateKey, viewerId),
    publicBoardStatement(db, "HARDCORE", "allTime", dateKey, viewerId),
    publicBoardStatement(db, "HARDCORE", "daily", dateKey, viewerId),
    db.prepare("SELECT display_name FROM leaderboard_profiles WHERE visitor_id = ?").bind(viewerId),
  ]);

  const profileName = results[4]?.results?.[0]?.display_name;
  return {
    generatedAt: new Date().toISOString(),
    dailyDate: dateKey,
    timeZone: CHICAGO_TIME_ZONE,
    profile: { name: String(profileName || "ANONYMOUS").toUpperCase() },
    boards: {
      NORMAL: {
        allTime: normalizePublicBoard(results[0]?.results),
        daily: normalizePublicBoard(results[1]?.results),
      },
      HARDCORE: {
        allTime: normalizePublicBoard(results[2]?.results),
        daily: normalizePublicBoard(results[3]?.results),
      },
    },
  };
}

async function readJsonBody(request) {
  if (!request.headers.get("Content-Type")?.toLowerCase().includes("application/json")) {
    return null;
  }
  try {
    return await request.json();
  } catch {
    return null;
  }
}

async function handleAnalyticsLeaderboard(request, env, origin) {
  if (request.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405, origin);
  }
  await ensureLeaderboardInfrastructure(env.DB);
  const [standardResult, hardcoreResult, recentResult] = await env.DB.batch([
    env.DB.prepare(bestRunsForMode("NORMAL")),
    env.DB.prepare(bestRunsForMode("HARDCORE")),
    env.DB.prepare(recentRunsSql()),
  ]);
  return jsonResponse({
    generatedAt: new Date().toISOString(),
    standard: normalizeAnalyticsRows(standardResult.results),
    hardcore: normalizeAnalyticsRows(hardcoreResult.results),
    recent: normalizeAnalyticsRows(recentResult.results, false),
  }, 200, origin);
}

async function handlePublicLeaderboard(request, env, origin) {
  if (request.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405, origin);
  }
  const visitorId = request.headers.get("X-Visitor-ID") || "";
  if (visitorId && !UUID_PATTERN.test(visitorId)) {
    return jsonResponse({ error: "Invalid visitor ID" }, 400, origin);
  }
  return jsonResponse(await buildPublicLeaderboardPayload(env.DB, visitorId), 200, origin);
}

async function saveProfileName(db, visitorId, name) {
  await ensureLeaderboardInfrastructure(db);

  if (name === "ANONYMOUS") {
    await db.prepare(
      `INSERT INTO leaderboard_profiles (visitor_id, display_name, updated_at)
       VALUES (?, 'ANONYMOUS', CURRENT_TIMESTAMP)
       ON CONFLICT(visitor_id) DO UPDATE SET
         display_name = 'ANONYMOUS',
         updated_at = CURRENT_TIMESTAMP`,
    ).bind(visitorId).run();
    await db.prepare(
      "DELETE FROM leaderboard_name_claims WHERE visitor_id = ?",
    ).bind(visitorId).run();
    return { ok: true };
  }

  await db.prepare(
    `INSERT OR IGNORE INTO leaderboard_name_claims (normalized_name, visitor_id)
     VALUES (?, ?)`,
  ).bind(name, visitorId).run();

  const claim = await db.prepare(
    "SELECT visitor_id FROM leaderboard_name_claims WHERE normalized_name = ?",
  ).bind(name).first();
  if (!claim || claim.visitor_id !== visitorId) {
    return { ok: false, code: "NAME_ALREADY_TAKEN", message: "NAME ALREADY TAKEN" };
  }

  await db.prepare(
    `INSERT INTO leaderboard_profiles (visitor_id, display_name, updated_at)
     VALUES (?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(visitor_id) DO UPDATE SET
       display_name = excluded.display_name,
       updated_at = CURRENT_TIMESTAMP`,
  ).bind(visitorId, name).run();

  await db.prepare(
    `DELETE FROM leaderboard_name_claims
     WHERE visitor_id = ? AND normalized_name <> ?`,
  ).bind(visitorId, name).run();
  return { ok: true };
}

async function handleLeaderboardProfile(request, env, origin) {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, origin);
  }
  const body = await readJsonBody(request);
  if (!body) return jsonResponse({ error: "Invalid JSON" }, 400, origin);
  if (typeof body.visitorId !== "string" || !UUID_PATTERN.test(body.visitorId)) {
    return jsonResponse({ error: "Invalid visitor ID" }, 400, origin);
  }

  const validated = validateLeaderboardName(body.name);
  if (!validated.ok) {
    return jsonResponse({ error: validated.code, message: validated.message }, 422, origin);
  }

  const visitorId = body.visitorId.toLowerCase();
  const result = await saveProfileName(env.DB, visitorId, validated.name);
  if (!result.ok) {
    return jsonResponse({ error: result.code, message: result.message }, 409, origin);
  }

  return jsonResponse(await buildPublicLeaderboardPayload(env.DB, visitorId), 200, origin);
}

function legacyScore(value) {
  const score = Number(value);
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(LEGACY_SCORE_MAX, Math.floor(score)));
}

async function handleLegacyLeaderboardImport(request, env, origin) {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, origin);
  }
  const body = await readJsonBody(request);
  if (!body) return jsonResponse({ error: "Invalid JSON" }, 400, origin);
  if (typeof body.visitorId !== "string" || !UUID_PATTERN.test(body.visitorId)) {
    return jsonResponse({ error: "Invalid visitor ID" }, 400, origin);
  }

  await ensureLeaderboardInfrastructure(env.DB);
  const visitorId = body.visitorId.toLowerCase();
  const priorGameVisitor = await env.DB.prepare(
    `SELECT first_seen
     FROM visitor_sections
     WHERE visitor_id = ? AND section = 'game' AND first_seen <= ?`,
  ).bind(visitorId, LEGACY_IMPORT_CUTOFF).first();

  if (!priorGameVisitor) {
    return jsonResponse({
      ok: true,
      eligible: false,
      imported: 0,
      leaderboards: await buildPublicLeaderboardPayload(env.DB, visitorId),
    }, 200, origin);
  }

  const scores = body.scores && typeof body.scores === "object" ? body.scores : {};
  const statements = [];
  for (const mode of ["NORMAL", "HARDCORE"]) {
    const score = legacyScore(scores[mode]);
    if (score <= 0) continue;
    statements.push(
      env.DB.prepare(
        `INSERT OR IGNORE INTO legacy_leaderboard_scores (visitor_id, mode, score)
         VALUES (?, ?, ?)`,
      ).bind(visitorId, mode, score),
    );
  }

  let imported = 0;
  if (statements.length) {
    const results = await env.DB.batch(statements);
    imported = results.reduce(
      (sum, result) => sum + Number(result?.meta?.changes ?? 0),
      0,
    );
  }

  return jsonResponse({
    ok: true,
    eligible: true,
    imported,
    leaderboards: await buildPublicLeaderboardPayload(env.DB, visitorId),
  }, 200, origin);
}

export async function handleLeaderboardRequest(request, env) {
  const url = new URL(request.url);
  if (![
    "/mode-leaderboards",
    "/public-leaderboards",
    "/leaderboard-profile",
    "/legacy-leaderboard-import",
  ].includes(url.pathname)) {
    return null;
  }

  const origin = request.headers.get("Origin");
  if (!originIsAllowed(origin)) {
    return jsonResponse({ error: "Origin not allowed" }, 403, null);
  }
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  try {
    if (url.pathname === "/mode-leaderboards") {
      return await handleAnalyticsLeaderboard(request, env, origin);
    }
    if (url.pathname === "/public-leaderboards") {
      return await handlePublicLeaderboard(request, env, origin);
    }
    if (url.pathname === "/legacy-leaderboard-import") {
      return await handleLegacyLeaderboardImport(request, env, origin);
    }
    return await handleLeaderboardProfile(request, env, origin);
  } catch (error) {
    console.error("Unable to handle leaderboard request", error);
    return jsonResponse({ error: "Internal server error" }, 500, origin);
  }
}
