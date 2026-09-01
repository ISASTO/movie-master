const ALLOWED_ORIGINS = new Set([
  "https://moviemaster.vip",
  "https://www.moviemaster.vip",
  "https://isasto.github.io",
]);

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

function normalizeRows(rows) {
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
          ORDER BY
            score DESC,
            longest_streak DESC,
            game_time_seconds DESC,
            finished_at ASC
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

export async function handleLeaderboardRequest(request, env) {
  const url = new URL(request.url);
  if (url.pathname !== "/mode-leaderboards") return null;

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

  try {
    const [standardResult, hardcoreResult] = await env.DB.batch([
      env.DB.prepare(bestRunsForMode("NORMAL")),
      env.DB.prepare(bestRunsForMode("HARDCORE")),
    ]);

    return jsonResponse(
      {
        generatedAt: new Date().toISOString(),
        standard: normalizeRows(standardResult.results),
        hardcore: normalizeRows(hardcoreResult.results),
      },
      200,
      origin,
    );
  } catch (error) {
    console.error("Unable to load mode leaderboards", error);
    return jsonResponse({ error: "Internal server error" }, 500, origin);
  }
}
