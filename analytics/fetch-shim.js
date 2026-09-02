(() => {
  "use strict";

  const originalFetch = window.fetch.bind(window);
  const workerHost = "movie-master-visitor-counter.isasto.workers.dev";
  const snapshotUrl = `https://${workerHost}/dashboard-snapshot`;
  const validViews = new Set(["daily", "weekly", "monthly"]);
  const maxCacheAge = 130 * 1000;
  const snapshotCache = new Map();
  const inFlight = new Map();
  let latestView = null;

  const knownPaths = new Set([
    "/analytics",
    "/traffic",
    "/details",
    "/mode-leaderboards",
    "/store-stats",
    "/store-traffic",
  ]);

  const normalizeView = (value) => (validViews.has(value) ? value : "daily");

  const freshEntry = (view) => {
    const entry = snapshotCache.get(view);
    if (!entry || Date.now() - entry.loadedAt > maxCacheAge) return null;
    return entry;
  };

  const freshestEntry = () => {
    if (latestView) {
      const latest = freshEntry(latestView);
      if (latest) return latest;
    }

    let newest = null;
    snapshotCache.forEach((entry) => {
      if (Date.now() - entry.loadedAt > maxCacheAge) return;
      if (!newest || entry.loadedAt > newest.loadedAt) newest = entry;
    });
    return newest;
  };

  const invalidate = () => {
    snapshotCache.clear();
    latestView = null;
  };

  window.__invalidateAnalyticsSnapshot = invalidate;

  const loadSnapshot = (view) => {
    const normalizedView = normalizeView(view);
    const cached = freshEntry(normalizedView);
    if (cached) return Promise.resolve(cached);
    if (inFlight.has(normalizedView)) return inFlight.get(normalizedView);

    const promise = (async () => {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 10000);

      try {
        const response = await originalFetch(
          `${snapshotUrl}?view=${encodeURIComponent(normalizedView)}`,
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          },
        );
        if (!response.ok) {
          throw new Error(`Dashboard snapshot failed: ${response.status}`);
        }

        const payload = await response.json();
        const entry = {
          payload,
          view: normalizedView,
          loadedAt: Date.now(),
        };
        snapshotCache.set(normalizedView, entry);
        latestView = normalizedView;
        return entry;
      } finally {
        window.clearTimeout(timeoutId);
        inFlight.delete(normalizedView);
      }
    })();

    inFlight.set(normalizedView, promise);
    return promise;
  };

  const responseFor = (data) =>
    new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/json; charset=utf-8",
      },
    });

  window.fetch = async (input, init = {}) => {
    const sourceUrl = typeof input === "string" ? input : input?.url;
    if (!sourceUrl) return originalFetch(input, init);

    let url;
    try {
      url = new URL(sourceUrl, window.location.href);
    } catch {
      return originalFetch(input, init);
    }

    if (url.host !== workerHost || !knownPaths.has(url.pathname)) {
      return originalFetch(input, init);
    }

    const requestedView = normalizeView(url.searchParams.get("view") ?? "daily");
    let entry;

    // The main graph and merch-series requests need the exact requested view.
    // The other widgets only need view-independent summary/detail data and can
    // reuse whichever fresh snapshot the graph already loaded.
    if (url.pathname === "/analytics" || url.pathname === "/store-traffic") {
      entry = await loadSnapshot(requestedView);
    } else {
      entry = freshestEntry() ?? (await loadSnapshot(requestedView));
    }

    const snapshot = entry.payload;
    switch (url.pathname) {
      case "/analytics":
      case "/traffic":
        return responseFor(snapshot.traffic ?? {});
      case "/details":
        return responseFor(snapshot.details ?? {});
      case "/mode-leaderboards":
        return responseFor(snapshot.leaderboards ?? {});
      case "/store-stats":
        return responseFor(snapshot.storeStats ?? {});
      case "/store-traffic":
        return responseFor(snapshot.storeTraffic ?? {});
      default:
        return originalFetch(input, init);
    }
  };

  // Refresh coordination lives in auto-refresh.js. It invalidates this shared
  // snapshot immediately before notifying every dashboard module.
})();
