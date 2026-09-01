import worker from "./index.js";

const VALID_GAME_SOURCES = new Set(["site", "direct", "unknown"]);
const CHICAGO_TIME_ZONE = "America/Chicago";

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

async function recordGameSource(env, visitorId, requestedSource) {
  if (typeof visitorId !== "string") return;

  const visitor = visitorId.toLowerCase();
  const source = VALID_GAME_SOURCES.has(requestedSource) ? requestedSource : "unknown";
  const visitDate = chicagoDateKey();

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
      .bind(visitor, visitDate, source, visitor, visitDate),
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
    if (VALID_GAME_SOURCES.has(row.source)) {
      allTime[row.source] = Number(row.count ?? 0);
    }
  }

  for (const row of todayResult.results ?? []) {
    if (VALID_GAME_SOURCES.has(row.source)) {
      todayCounts[row.source] = Number(row.count ?? 0);
    }
  }

  return { allTime, today: todayCounts };
}

export default {
  async fetch(request, env, ctx) {
    const originalUrl = new URL(request.url);

    if (request.method === "POST" && originalUrl.pathname === "/section-visit") {
      let visitBody = null;
      try {
        visitBody = await request.clone().json();
      } catch {
        // The base worker will return the appropriate bad-request response.
      }

      const response = await worker.fetch(request, env, ctx);

      if (response.ok && visitBody?.section === "game") {
        try {
          await recordGameSource(env, visitBody.visitorId, visitBody.source);
        } catch (error) {
          console.error("Unable to record game acquisition source", error);
        }
      }

      return response;
    }

    if (request.method === "GET" && originalUrl.pathname === "/traffic") {
      const workerUrl = new URL(originalUrl);
      workerUrl.pathname = "/analytics";
      const workerRequest = new Request(workerUrl.toString(), request);
      const response = await worker.fetch(workerRequest, env, ctx);

      if (!response.ok) return response;

      const payload = await response.json();
      const today = chicagoDateKey();

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
        const gameTotal = Number(payload.summary?.gameTotal ?? 0);
        const gameToday = Number(payload.summary?.todayGame ?? 0);
        payload.summary = {
          ...payload.summary,
          gameFromSiteTotal: 0,
          gameDirectTotal: 0,
          gameUnclassifiedTotal: gameTotal,
          gameFromSiteToday: 0,
          gameDirectToday: 0,
          gameUnclassifiedToday: gameToday,
        };
      }

      return new Response(JSON.stringify(payload), {
        status: response.status,
        headers: response.headers,
      });
    }

    return worker.fetch(request, env, ctx);
  },
};
