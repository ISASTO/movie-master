const ALLOWED_ORIGINS = new Set([
  "https://moviemaster.vip",
  "https://www.moviemaster.vip",
  "https://isasto.github.io",
]);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

async function getCount(db) {
  const row = await db
    .prepare("SELECT visitor_count AS count FROM visitor_stats WHERE id = 1")
    .first();

  return Number(row?.count ?? 0);
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

      if (request.method === "POST" && url.pathname === "/visit") {
        if (!request.headers.get("Content-Type")?.toLowerCase().includes("application/json")) {
          return jsonResponse({ error: "Expected application/json" }, 415, origin);
        }

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
          .prepare("INSERT OR IGNORE INTO visitors (visitor_id) VALUES (?)")
          .bind(visitorId.toLowerCase())
          .run();

        const count = await getCount(env.DB);
        return jsonResponse({ count }, 200, origin);
      }

      return jsonResponse({ error: "Not found" }, 404, origin);
    } catch (error) {
      console.error("Visitor counter error", error);
      return jsonResponse({ error: "Internal server error" }, 500, origin);
    }
  },
};
