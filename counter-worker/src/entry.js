import worker from "./index.js";
import { handleEnhancedRequest, handleGameEvent } from "./insights.js";
import { handleLeaderboardRequest } from "./leaderboards.js";
import { handleStoreRequest } from "./store.js";
import {
  captureRunTelemetry,
  handleRunDetailsRequest,
  persistRunTelemetry,
} from "./run-telemetry.js";

const VALID_VIEWS = new Set(["daily", "weekly", "monthly"]);

function internalGet(request, pathname, search = "") {
  const url = new URL(request.url);
  url.pathname = pathname;
  url.search = search;
  return new Request(url.toString(), {
    method: "GET",
    headers: request.headers,
  });
}

async function readJsonResponse(response, label) {
  if (!response || !response.ok) {
    throw new Error(`${label} failed with ${response?.status ?? "no response"}`);
  }
  return response.json();
}

async function dashboardSnapshot(request, env, ctx) {
  const url = new URL(request.url);
  const requestedView = url.searchParams.get("view") ?? "daily";
  const view = VALID_VIEWS.has(requestedView) ? requestedView : "daily";
  const query = `?view=${encodeURIComponent(view)}`;

  // These execute concurrently inside one Worker invocation. This keeps the
  // browser at one Cloudflare request while preserving the existing, tested
  // data handlers and their batched D1 queries.
  const [trafficResponse, detailsResponse, leaderboardResponse, storeStatsResponse, storeTrafficResponse] =
    await Promise.all([
      handleEnhancedRequest(internalGet(request, "/traffic", query), env, ctx, worker),
      handleEnhancedRequest(internalGet(request, "/details"), env, ctx, worker),
      handleLeaderboardRequest(internalGet(request, "/mode-leaderboards"), env),
      handleStoreRequest(internalGet(request, "/store-stats"), env),
      handleStoreRequest(internalGet(request, "/store-traffic", query), env),
    ]);

  const [traffic, details, leaderboards, storeStats, storeTraffic] = await Promise.all([
    readJsonResponse(trafficResponse, "traffic"),
    readJsonResponse(detailsResponse, "details"),
    readJsonResponse(leaderboardResponse, "leaderboards"),
    readJsonResponse(storeStatsResponse, "store stats"),
    readJsonResponse(storeTrafficResponse, "store traffic"),
  ]);

  const headers = new Headers(trafficResponse.headers);
  headers.set("Cache-Control", "no-store");
  headers.set("Content-Type", "application/json; charset=utf-8");

  return new Response(
    JSON.stringify({
      generatedAt: new Date().toISOString(),
      view,
      traffic,
      details,
      leaderboards,
      storeStats,
      storeTraffic,
    }),
    { status: 200, headers },
  );
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/dashboard-snapshot") {
      try {
        return await dashboardSnapshot(request, env, ctx);
      } catch (error) {
        console.error("Unable to build analytics dashboard snapshot", error);
        const origin = request.headers.get("Origin");
        const headers = new Headers({
          "Cache-Control": "no-store",
          "Content-Type": "application/json; charset=utf-8",
        });
        if (
          origin === "https://moviemaster.vip" ||
          origin === "https://www.moviemaster.vip" ||
          origin === "https://isasto.github.io"
        ) {
          headers.set("Access-Control-Allow-Origin", origin);
          headers.set("Vary", "Origin");
        }
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers,
        });
      }
    }

    // Capture the tiny categorical run metadata once, at completion. The game
    // event itself is handled immediately; metadata persistence is deferred so
    // it cannot add latency to the game-over transition.
    if (request.method === "POST" && url.pathname === "/game-event") {
      const telemetry = await captureRunTelemetry(request);
      const response = await handleGameEvent(request, env);
      if (response.ok && telemetry) {
        const task = persistRunTelemetry(env.DB, telemetry).catch((error) => {
          console.error("Unable to persist run telemetry", error);
        });
        if (ctx?.waitUntil) ctx.waitUntil(task);
        else await task;
      }
      return response;
    }

    const runDetailsResponse = await handleRunDetailsRequest(request, env);
    if (runDetailsResponse) return runDetailsResponse;

    const storeResponse = await handleStoreRequest(request, env);
    if (storeResponse) return storeResponse;

    const leaderboardResponse = await handleLeaderboardRequest(request, env);
    if (leaderboardResponse) return leaderboardResponse;

    return handleEnhancedRequest(request, env, ctx, worker);
  },
};
