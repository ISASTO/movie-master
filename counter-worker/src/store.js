const ALLOWED_ORIGINS = new Set([
  "https://moviemaster.vip",
  "https://www.moviemaster.vip",
  "https://isasto.github.io",
]);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CHICAGO_TIME_ZONE = "America/Chicago";
let storeSchemaReadyPromise = null;

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

function originAllowed(origin) {
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

function ensureStoreSchema(env) {
  if (storeSchemaReadyPromise) return storeSchemaReadyPromise;

  storeSchemaReadyPromise = (async () => {
    await env.DB
      .prepare(
        `CREATE TABLE IF NOT EXISTS tracking_meta (
           key TEXT PRIMARY KEY,
           value TEXT NOT NULL
         )`,
      )
      .run();

    await env.DB
      .prepare(
        `CREATE TABLE IF NOT EXISTS store_clicks (
           id INTEGER PRIMARY KEY AUTOINCREMENT,
           visitor_id TEXT NOT NULL,
           click_date TEXT NOT NULL,
           clicked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
         )`,
      )
      .run();

    await env.DB
      .prepare(
        `CREATE INDEX IF NOT EXISTS idx_store_clicks_visitor
         ON store_clicks(visitor_id, clicked_at)`,
      )
      .run();

    await env.DB
      .prepare(
        `CREATE INDEX IF NOT EXISTS idx_store_clicks_date
         ON store_clicks(click_date)`,
      )
      .run();

    await env.DB
      .prepare(
        `INSERT OR IGNORE INTO tracking_meta (key, value)
         VALUES ('store_click_started_at', CURRENT_TIMESTAMP)`,
      )
      .run();
  })().catch((error) => {
    storeSchemaReadyPromise = null;
    throw error;
  });

  return storeSchemaReadyPromise;
}

async function recordStoreClick(request, env, origin) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400, origin);
  }

  const visitorId = body?.visitorId;
  if (typeof visitorId !== "string" || !UUID_PATTERN.test(visitorId)) {
    return jsonResponse({ error: "Invalid visitor ID" }, 400, origin);
  }

  await env.DB
    .prepare(
      `INSERT INTO store_clicks (visitor_id, click_date)
       VALUES (?, ?)`,
    )
    .bind(visitorId.toLowerCase(), chicagoDateKey())
    .run();

  return jsonResponse({ ok: true }, 200, origin);
}

async function getStoreStats(env, origin) {
  const today = chicagoDateKey();
  const [allResult, todayResult, siteResult, trackingResult] = await env.DB.batch([
    env.DB.prepare(
      `SELECT COUNT(*) AS clicks,
              COUNT(DISTINCT visitor_id) AS unique_clickers
       FROM store_clicks`,
    ),
    env.DB.prepare(
      `SELECT COUNT(*) AS clicks,
              COUNT(DISTINCT visitor_id) AS unique_clickers
       FROM store_clicks
       WHERE click_date = ?`,
    ).bind(today),
    env.DB.prepare(
      `SELECT visitor_count AS count
       FROM visitor_stats
       WHERE id = 1`,
    ),
    env.DB.prepare(
      `SELECT value
       FROM tracking_meta
       WHERE key = 'store_click_started_at'`,
    ),
  ]);

  const all = allResult.results?.[0] ?? {};
  const todayRow = todayResult.results?.[0] ?? {};
  const siteVisitors = Number(siteResult.results?.[0]?.count ?? 0);
  const uniqueClickers = Number(all.unique_clickers ?? 0);

  return jsonResponse(
    {
      generatedAt: new Date().toISOString(),
      timeZone: CHICAGO_TIME_ZONE,
      trackingStartedAt: trackingResult.results?.[0]?.value ?? null,
      allTime: {
        clicks: Number(all.clicks ?? 0),
        uniqueClickers,
      },
      today: {
        clicks: Number(todayRow.clicks ?? 0),
        uniqueClickers: Number(todayRow.unique_clickers ?? 0),
      },
      siteVisitors,
      clickThroughRate: siteVisitors > 0 ? (uniqueClickers / siteVisitors) * 100 : 0,
    },
    200,
    origin,
  );
}

async function getStoreTraffic(env, view, origin) {
  const today = chicagoDateKey();
  const buckets = buildBuckets(view, today);
  const bucketValues = buckets.map(() => "(?, ?, ?)").join(", ");
  const bucketBindings = buckets.flatMap((bucket, index) => [index, bucket.start, bucket.end]);

  const [trafficResult, trackingResult] = await env.DB.batch([
    env.DB
      .prepare(
        `WITH buckets(bucket_index, start_date, end_date) AS (
           VALUES ${bucketValues}
         )
         SELECT
           buckets.bucket_index AS bucket_index,
           COUNT(DISTINCT store_clicks.visitor_id) AS count
         FROM buckets
         LEFT JOIN store_clicks
           ON store_clicks.click_date >= buckets.start_date
          AND store_clicks.click_date <= buckets.end_date
         GROUP BY buckets.bucket_index
         ORDER BY buckets.bucket_index`,
      )
      .bind(...bucketBindings),
    env.DB.prepare(
      `SELECT value
       FROM tracking_meta
       WHERE key = 'store_click_started_at'`,
    ),
  ]);

  const data = buckets.map((bucket) => ({ ...bucket, merch: 0 }));
  for (const row of trafficResult.results ?? []) {
    const index = Number(row.bucket_index);
    if (Number.isInteger(index) && index >= 0 && index < data.length) {
      data[index].merch = Number(row.count ?? 0);
    }
  }

  return jsonResponse(
    {
      view,
      timeZone: CHICAGO_TIME_ZONE,
      generatedAt: new Date().toISOString(),
      trackingStarted: sqliteTimestampToChicagoDate(trackingResult.results?.[0]?.value ?? null),
      data,
    },
    200,
    origin,
  );
}

export async function handleStoreRequest(request, env) {
  const url = new URL(request.url);
  const validPaths = new Set(["/store-event", "/store-stats", "/store-traffic"]);
  if (!validPaths.has(url.pathname)) return null;

  const origin = request.headers.get("Origin");
  if (!originAllowed(origin)) return jsonResponse({ error: "Origin not allowed" }, 403, null);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  try {
    await ensureStoreSchema(env);

    if (url.pathname === "/store-event" && request.method === "POST") {
      return await recordStoreClick(request, env, origin);
    }

    if (url.pathname === "/store-stats" && request.method === "GET") {
      return await getStoreStats(env, origin);
    }

    if (url.pathname === "/store-traffic" && request.method === "GET") {
      const requestedView = url.searchParams.get("view") ?? "daily";
      const view = ["daily", "weekly", "monthly"].includes(requestedView)
        ? requestedView
        : "daily";
      return await getStoreTraffic(env, view, origin);
    }

    return jsonResponse({ error: "Method not allowed" }, 405, origin);
  } catch (error) {
    console.error("Unable to handle merch store analytics", error);
    return jsonResponse({ error: "Internal server error" }, 500, origin);
  }
}
