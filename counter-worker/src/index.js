const ALLOWED_ORIGINS = new Set([
  "https://moviemaster.vip",
  "https://www.moviemaster.vip",
  "https://isasto.github.io",
]);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VALID_SECTIONS = new Set(["site", "game"]);
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
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders(origin),
  });
}

function originIsAllowed(request) {
  const origin = request.headers.get("Origin");
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

function parseDateKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function utcDateKey(date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function addDays(key, amount) {
  const date = parseDateKey(key);
  date.setUTCDate(date.getUTCDate() + amount);
  return utcDateKey(date);
}

function buildBuckets(view, todayKey) {
  if (view === "daily") {
    return Array.from({ length: 7 }, (_, index) => {
      const day = addDays(todayKey, index - 6);
      return { start: day, end: day };
    });
  }

  if (view === "weekly") {
    return Array.from({ length: 4 }, (_, index) => {
      const start = addDays(todayKey, -27 + index * 7);
      return { start, end: addDays(start, 6) };
    });
  }

  const today = parseDateKey(todayKey);
  const currentMonthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));

  return Array.from({ length: 12 }, (_, index) => {
    const startDate = new Date(
      Date.UTC(
        currentMonthStart.getUTCFullYear(),
        currentMonthStart.getUTCMonth() + index - 11,
        1,
      ),
    );
    const endDate = new Date(
      Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + 1, 0),
    );
    const start = utcDateKey(startDate);
    const naturalEnd = utcDateKey(endDate);
    return {
      start,
      end: naturalEnd > todayKey ? todayKey : naturalEnd,
    };
  });
}

function sqliteTimestampToChicagoDate(value) {
  if (!value) return null;
  const parsed = new Date(`${value.replace(" ", "T")}Z`);
  return Number.isNaN(parsed.getTime()) ? null : chicagoDateKey(parsed);
}

async function getCount(db) {
  const row = await db
    .prepare("SELECT visitor_count AS count FROM visitor_stats WHERE id = 1")
    .first();

  return Number(row?.count ?? 0);
}

async function getAnalytics(db, view) {
  const today = chicagoDateKey();
  const buckets = buildBuckets(view, today);
  const data = [];

  for (const bucket of buckets) {
    const result = await db
      .prepare(
        `SELECT section, COUNT(DISTINCT visitor_id) AS count
         FROM visitor_daily
         WHERE visit_date >= ? AND visit_date <= ?
         GROUP BY section`,
      )
      .bind(bucket.start, bucket.end)
      .all();

    const counts = { site: 0, game: 0 };
    for (const row of result.results ?? []) {
      if (VALID_SECTIONS.has(row.section)) {
        counts[row.section] = Number(row.count ?? 0);
      }
    }

    data.push({ ...bucket, ...counts });
  }

  const statsResult = await db
    .prepare("SELECT section, visitor_count FROM section_stats")
    .all();
  const totals = { site: 0, game: 0 };
  for (const row of statsResult.results ?? []) {
    if (VALID_SECTIONS.has(row.section)) {
      totals[row.section] = Number(row.visitor_count ?? 0);
    }
  }

  const discoveredRow = await db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM visitor_sections AS site
       WHERE site.section = 'site'
         AND EXISTS (
           SELECT 1 FROM visitor_sections AS game
           WHERE game.visitor_id = site.visitor_id
             AND game.section = 'game'
         )`,
    )
    .first();
  const discovered = Number(discoveredRow?.count ?? 0);

  const trackingResult = await db
    .prepare(
      `SELECT section, MIN(first_seen) AS first_seen
       FROM visitor_sections
       GROUP BY section`,
    )
    .all();
  const trackingStarted = { site: null, game: null };
  for (const row of trackingResult.results ?? []) {
    if (VALID_SECTIONS.has(row.section)) {
      trackingStarted[row.section] = sqliteTimestampToChicagoDate(row.first_seen);
    }
  }

  const todayResult = await db
    .prepare(
      `SELECT section, COUNT(*) AS count
       FROM visitor_daily
       WHERE visit_date = ?
       GROUP BY section`,
    )
    .bind(today)
    .all();
  const todayCounts = { site: 0, game: 0 };
  for (const row of todayResult.results ?? []) {
    if (VALID_SECTIONS.has(row.section)) {
      todayCounts[row.section] = Number(row.count ?? 0);
    }
  }

  return {
    view,
    timeZone: CHICAGO_TIME_ZONE,
    generatedAt: new Date().toISOString(),
    trackingStarted,
    summary: {
      siteTotal: totals.site,
      gameTotal: totals.game,
      discovered,
      discoveryRate: totals.site > 0 ? (discovered / totals.site) * 100 : 0,
      todaySite: todayCounts.site,
      todayGame: todayCounts.game,
    },
    data,
  };
}

async function readVisitBody(request, origin) {
  if (!request.headers.get("Content-Type")?.toLowerCase().includes("application/json")) {
    return { error: jsonResponse({ error: "Expected application/json" }, 415, origin) };
  }

  try {
    return { body: await request.json() };
  } catch {
    return { error: jsonResponse({ error: "Invalid JSON" }, 400, origin) };
  }
}

async function recordVisit(env, visitorId, section) {
  const normalizedId = visitorId.toLowerCase();
  const visitDate = chicagoDateKey();

  if (section === "site") {
    await env.DB
      .prepare("INSERT OR IGNORE INTO visitors (visitor_id) VALUES (?)")
      .bind(normalizedId)
      .run();
  }

  await env.DB
    .prepare(
      "INSERT OR IGNORE INTO visitor_sections (visitor_id, section) VALUES (?, ?)",
    )
    .bind(normalizedId, section)
    .run();

  await env.DB
    .prepare(
      `INSERT OR IGNORE INTO visitor_daily (visitor_id, section, visit_date)
       VALUES (?, ?, ?)`,
    )
    .bind(normalizedId, section, visitDate)
    .run();
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");

    if (!originIsAllowed(request)) {
      return jsonResponse({ error: "Origin not allowed" }, 403, null);
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin),
      });
    }

    try {
      if (request.method === "GET" && url.pathname === "/health") {
        return jsonResponse({ ok: true }, 200, origin);
      }

      if (request.method === "GET" && url.pathname === "/count") {
        const count = await getCount(env.DB);
        return jsonResponse({ count }, 200, origin);
      }

      if (request.method === "GET" && url.pathname === "/analytics") {
        const requestedView = url.searchParams.get("view") ?? "daily";
        const view = ["daily", "weekly", "monthly"].includes(requestedView)
          ? requestedView
          : "daily";
        return jsonResponse(await getAnalytics(env.DB, view), 200, origin);
      }

      if (request.method === "POST" && url.pathname === "/visit") {
        const parsed = await readVisitBody(request, origin);
        if (parsed.error) return parsed.error;
        const visitorId = parsed.body?.visitorId;
        if (typeof visitorId !== "string" || !UUID_PATTERN.test(visitorId)) {
          return jsonResponse({ error: "Invalid visitor ID" }, 400, origin);
        }

        await recordVisit(env, visitorId, "site");
        return jsonResponse({ count: await getCount(env.DB), section: "site" }, 200, origin);
      }

      if (request.method === "POST" && url.pathname === "/section-visit") {
        const parsed = await readVisitBody(request, origin);
        if (parsed.error) return parsed.error;
        const visitorId = parsed.body?.visitorId;
        const section = parsed.body?.section;
        if (typeof visitorId !== "string" || !UUID_PATTERN.test(visitorId)) {
          return jsonResponse({ error: "Invalid visitor ID" }, 400, origin);
        }
        if (!VALID_SECTIONS.has(section)) {
          return jsonResponse({ error: "Invalid section" }, 400, origin);
        }

        await recordVisit(env, visitorId, section);
        return jsonResponse({ section }, 200, origin);
      }

      return jsonResponse({ error: "Not found" }, 404, origin);
    } catch (error) {
      console.error("Visitor counter error", error);
      return jsonResponse({ error: "Internal server error" }, 500, origin);
    }
  },
};
