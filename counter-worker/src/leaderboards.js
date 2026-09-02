const ALLOWED_ORIGINS = new Set([
  "https://moviemaster.vip",
  "https://www.moviemaster.vip",
  "https://isasto.github.io",
]);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CHICAGO_TIME_ZONE = "America/Chicago";
const PUBLIC_TOP_LIMIT = 5;
export const LEADERBOARD_NAME_MAX_LENGTH = 24;

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

function playerTag(visitorId) {
  let hash = 2166136261;
  for (let index = 0; index < visitorId.length; index += 1) {
    hash ^= visitorId.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `PLAYER ${(hash >>> 0).toString(16).toUpperCase().padStart(8, "0").slice(-6)}`;
}

function normalizeAnalyticsRows(rows) {
  return (rows ?? []).map((row, index) => ({
    rank: index + 1,
    player: playerTag(row.visitor_id),
    score: Number(row.score ?? 0),
    longestStreak: Number(row.longest_streak ?? 0),
    gameTimeSeconds: Number(row.game_time_seconds ?? 0),
  }));
}

function bestRunsForMode(mode) {
  return `
    WITH ranked_runs AS (
      SELECT
        visitor_id,
        score,
        longest_streak,
        game_time_seconds,
        finished_at,
        ROW_NUMBER() OVER (
          PARTITION BY visitor_id
          ORDER BY score DESC, longest_streak DESC, game_time_seconds DESC, finished_at ASC
        ) AS player_rank
      FROM game_runs
      WHERE mode = '${mode}'
    )
    SELECT visitor_id, score, longest_streak, game_time_seconds, finished_at
    FROM ranked_runs
    WHERE player_rank = 1
    ORDER BY score DESC, longest_streak DESC, game_time_seconds DESC, finished_at ASC
    LIMIT 10
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
    .replace(/\s+/g, " ");

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
  return `
    WITH parameters(viewer_id) AS (VALUES (?)),
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
      FROM game_runs
      WHERE mode = ? ${dateFilter}
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
    : statement.bind(visitorId, mode);
}

function normalizePublicEntry(row) {
  return {
    rank: Number(row.display_rank ?? 0),
    order: Number(row.order_index ?? 0),
    name: String(row.display_name || "ANONYMOUS"),
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
    profile: { name: String(profileName || "ANONYMOUS") },
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
  const [standardResult, hardcoreResult] = await env.DB.batch([
    env.DB.prepare(bestRunsForMode("NORMAL")),
    env.DB.prepare(bestRunsForMode("HARDCORE")),
  ]);
  return jsonResponse({
    generatedAt: new Date().toISOString(),
    standard: normalizeAnalyticsRows(standardResult.results),
    hardcore: normalizeAnalyticsRows(hardcoreResult.results),
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
  await env.DB
    .prepare(
      `INSERT INTO leaderboard_profiles (visitor_id, display_name, updated_at)
       VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(visitor_id) DO UPDATE SET
         display_name = excluded.display_name,
         updated_at = CURRENT_TIMESTAMP`,
    )
    .bind(visitorId, validated.name)
    .run();

  return jsonResponse(await buildPublicLeaderboardPayload(env.DB, visitorId), 200, origin);
}

export async function handleLeaderboardRequest(request, env) {
  const url = new URL(request.url);
  if (!["/mode-leaderboards", "/public-leaderboards", "/leaderboard-profile"].includes(url.pathname)) {
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
    return await handleLeaderboardProfile(request, env, origin);
  } catch (error) {
    console.error("Unable to handle leaderboard request", error);
    return jsonResponse({ error: "Internal server error" }, 500, origin);
  }
}
