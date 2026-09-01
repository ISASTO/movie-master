const ALLOWED_ORIGINS = new Set([
  "https://moviemaster.vip",
  "https://www.moviemaster.vip",
  "https://isasto.github.io",
]);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
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

export async function handleStoreRequest(request, env) {
  const url = new URL(request.url);
  if (url.pathname !== "/store-event" && url.pathname !== "/store-stats") return null;

  const origin = request.headers.get("Origin");
  if (!originAllowed(origin)) return jsonResponse({ error: "Origin not allowed" }, 403, null);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  try {
    if (url.pathname === "/store-event" && request.method === "POST") {
      return await recordStoreClick(request, env, origin);
    }

    if (url.pathname === "/store-stats" && request.method === "GET") {
      return await getStoreStats(env, origin);
    }

    return jsonResponse({ error: "Method not allowed" }, 405, origin);
  } catch (error) {
    console.error("Unable to handle merch store analytics", error);
    return jsonResponse({ error: "Internal server error" }, 500, origin);
  }
}
