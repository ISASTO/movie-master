from pathlib import Path
import re


def load(path):
    return Path(path).read_text()


def save(path, text):
    Path(path).write_text(text)


def replace_once(text, old, new, label):
    if old not in text:
        raise RuntimeError(f"Missing expected text for {label}")
    return text.replace(old, new, 1)


# ---------------------------------------------------------------------------
# Main-site visitor counter: keep it live, but stop turning a visible novelty
# counter into a 12-requests-per-minute Cloudflare poller.
# ---------------------------------------------------------------------------
path = "site-core.js"
text = load(path)
text = replace_once(text, "    const pollInterval = 5000;", "    const pollInterval = 60 * 1000;", "counter poll interval")
text = replace_once(
    text,
    "    let pollTimer = null;\n    let pollInFlight = false;",
    "    let pollTimer = null;\n    let pollInFlight = false;\n    let lastSuccessfulFetchAt = 0;",
    "counter freshness state",
)
text = replace_once(
    text,
    "      if (!visitorId) {\n        render(await fetchCount());\n        return;\n      }",
    "      if (!visitorId) {\n        const count = await fetchCount();\n        lastSuccessfulFetchAt = Date.now();\n        render(count);\n        return;\n      }",
    "counter anonymous fallback",
)
text = replace_once(
    text,
    "      render(data.count);\n    };\n\n    const shouldPoll",
    "      lastSuccessfulFetchAt = Date.now();\n      render(data.count);\n    };\n\n    const shouldPoll",
    "counter visit freshness",
)
text = replace_once(
    text,
    "      try {\n        render(await fetchCount());\n      } catch (error) {\n        console.error(\"Unable to refresh Movie Master visitor count\", error);",
    "      try {\n        const count = await fetchCount();\n        lastSuccessfulFetchAt = Date.now();\n        render(count);\n      } catch (error) {\n        console.error(\"Unable to refresh Movie Master visitor count\", error);",
    "counter poll freshness",
)
text = replace_once(
    text,
    "    const syncPolling = () => {\n      stopPolling();\n      if (shouldPoll()) runPoll();\n    };",
    "    const syncPolling = () => {\n      stopPolling();\n      if (!shouldPoll()) return;\n      if (lastSuccessfulFetchAt && Date.now() - lastSuccessfulFetchAt >= pollInterval) {\n        runPoll();\n        return;\n      }\n      scheduleNextPoll();\n    };",
    "counter focus/visibility dedupe",
)
text = replace_once(
    text,
    "          render(await fetchCount());\n        } catch (fallbackError) {",
    "          const count = await fetchCount();\n          lastSuccessfulFetchAt = Date.now();\n          render(count);\n        } catch (fallbackError) {",
    "counter final fallback freshness",
)
if "const pollInterval = 5000" in text:
    raise RuntimeError("5-second counter polling survived")
save(path, text)


# Cache-bust the main bootstrap and the updated site-core payload.
path = "script.js"
text = load(path)
text = replace_once(text, "./site-core.js?v=20260901-2", "./site-core.js?v=20260902-perf-1", "site-core cache bust")
save(path, text)

path = "index.html"
text = load(path)
text = replace_once(text, "./script.js?v=20260831-real-visitors-copy", "./script.js?v=20260902-perf-1", "main bootstrap cache bust")
save(path, text)


# ---------------------------------------------------------------------------
# Page-view telemetry: analytics are unique-browser/hour based, so repeated
# reloads inside the same Chicago hour add no information. Only mark the bucket
# after a successful Worker response so network failures can retry.
# ---------------------------------------------------------------------------
path = "visitor-tracker.js"
text = load(path)
text = replace_once(
    text,
    '  const visitorIdKey = "movie-master-visitor-id";',
    '  const visitorIdKey = "movie-master-visitor-id";\n  const visitBucketKey = `movie-master-${section}-visit-hour-v1`;',
    "section visit bucket key",
)
insert_anchor = "  const body = { visitorId, section };\n"
bucket_code = r'''  const chicagoHourBucket = () => {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Chicago",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        hourCycle: "h23",
      }).formatToParts(new Date());
      const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
      return `${values.year}-${values.month}-${values.day}T${values.hour}`;
    } catch {
      return new Date().toISOString().slice(0, 13);
    }
  };

  const visitBucket = chicagoHourBucket();
  try {
    const prior = JSON.parse(window.localStorage.getItem(visitBucketKey) || "null");
    if (prior?.visitorId === visitorId && prior?.bucket === visitBucket) return;
  } catch {
    // A malformed/missing throttle marker should never block analytics.
  }

'''
text = replace_once(text, insert_anchor, bucket_code + insert_anchor, "section visit hourly throttle")
old_fetch_tail = '''  fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    keepalive: true,
  }).catch(() => {
    // Analytics must never interfere with the page or game.
  });
'''
new_fetch_tail = '''  fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    keepalive: true,
  }).then((response) => {
    if (!response.ok) return;
    try {
      window.localStorage.setItem(
        visitBucketKey,
        JSON.stringify({ visitorId, bucket: visitBucket }),
      );
    } catch {
      // The visit was still recorded; the throttle marker is optional.
    }
  }).catch(() => {
    // Analytics must never interfere with the page or game.
  });
'''
text = replace_once(text, old_fetch_tail, new_fetch_tail, "section visit successful throttle marker")
save(path, text)


# ---------------------------------------------------------------------------
# Game telemetry/performance: native gamepad disconnect events are immediate.
# The fallback scan now runs at only 2 Hz and only when a gamepad is connected.
# Mouse/keyboard/touch runs pay zero recurring gamepad-telemetry cost.
# ---------------------------------------------------------------------------
path = "game-records.js"
text = load(path)
text = replace_once(text, "  const GAMEPAD_SCAN_INTERVAL = 250;", "  const GAMEPAD_SCAN_INTERVAL = 500;", "gamepad fallback interval")
text = replace_once(
    text,
    '''  const scanGamepads = () => {
    if (!runActive || document.visibilityState !== "visible") return;
    const gamepads = readConnectedGamepads();
    if (
      activeGamepadIndex !== null
      && !gamepads.some((gamepad) => gamepad.index === activeGamepadIndex)
    ) {
      handleActiveGamepadDisconnect(activeGamepadIndex);
    }
    for (const gamepad of gamepads) {
      if (gamepadHasRelevantInput(gamepad)) activeGamepadIndex = gamepad.index;
    }
  };
''',
    '''  const scanGamepads = () => {
    if (!runActive || document.visibilityState !== "visible") return;
    const gamepads = readConnectedGamepads();
    if (!gamepads.length) {
      if (activeGamepadIndex !== null) handleActiveGamepadDisconnect(activeGamepadIndex);
      stopGamepadScanner();
      return;
    }
    if (
      activeGamepadIndex !== null
      && !gamepads.some((gamepad) => gamepad.index === activeGamepadIndex)
    ) {
      handleActiveGamepadDisconnect(activeGamepadIndex);
    }
    for (const gamepad of gamepads) {
      if (gamepadHasRelevantInput(gamepad)) activeGamepadIndex = gamepad.index;
    }
  };
''',
    "gamepad scanner empty-pad shutdown",
)
text = replace_once(
    text,
    '''  const startGamepadScanner = () => {
    stopGamepadScanner();
    scanGamepads();
    gamepadScanTimer = window.setInterval(scanGamepads, GAMEPAD_SCAN_INTERVAL);
  };
''',
    '''  const startGamepadScanner = () => {
    stopGamepadScanner();
    if (!runActive || !readConnectedGamepads().length) return;
    scanGamepads();
    if (runActive && readConnectedGamepads().length) {
      gamepadScanTimer = window.setInterval(scanGamepads, GAMEPAD_SCAN_INTERVAL);
    }
  };
''',
    "gamepad scanner connected-only lifecycle",
)
text = replace_once(
    text,
    '''  window.addEventListener("gamepaddisconnected", (event) => {
    handleActiveGamepadDisconnect(event.gamepad.index);
  });
''',
    '''  window.addEventListener("gamepadconnected", () => {
    if (runActive) startGamepadScanner();
  });
  window.addEventListener("gamepaddisconnected", (event) => {
    handleActiveGamepadDisconnect(event.gamepad.index);
    if (runActive && !readConnectedGamepads().length) stopGamepadScanner();
  });
''',
    "gamepad connection lifecycle events",
)
save(path, text)


# ---------------------------------------------------------------------------
# Public leaderboard: external CSS already owns readability rules; don't inject
# duplicate runtime CSS. Reopening a board can reuse a payload for one minute.
# ---------------------------------------------------------------------------
path = "game/leaderboard.js"
text = load(path)
text, removed = re.subn(
    r'''\n  // Keep the leaderboard readable.*?\n  document\.head\.append\(readabilityStyle\);\n''',
    "\n",
    text,
    count=1,
    flags=re.S,
)
if removed != 1:
    raise RuntimeError("Unable to remove duplicate runtime leaderboard CSS")
text = replace_once(
    text,
    '  const numberFormatter = new Intl.NumberFormat("en-US");',
    '  const numberFormatter = new Intl.NumberFormat("en-US");\n  const leaderboardFreshMs = 60 * 1000;',
    "leaderboard payload TTL",
)
text = replace_once(
    text,
    "  let payload = null;\n  let loadingPromise = null;",
    "  let payload = null;\n  let payloadLoadedAt = 0;\n  let loadingPromise = null;",
    "leaderboard freshness state",
)
text = replace_once(
    text,
    "    payload = nextPayload;\n    const profileName",
    "    payload = nextPayload;\n    payloadLoadedAt = Date.now();\n    const profileName",
    "leaderboard apply freshness",
)
text = replace_once(
    text,
    "    if (payload && !force) return payload;",
    "    if (payload && !force && Date.now() - payloadLoadedAt < leaderboardFreshMs) return payload;",
    "leaderboard fresh reuse",
)
text = replace_once(
    text,
    "    void loadLeaderboards(true).catch(() => {});\n  });\n\n  syncNameInputs",
    "    void loadLeaderboards(false).catch(() => {});\n  });\n\n  syncNameInputs",
    "leaderboard reopen reuse",
)
if "readabilityStyle" in text:
    raise RuntimeError("Duplicate runtime leaderboard style survived")
save(path, text)


# Game cache-busters for the changed tracking/leaderboard scripts.
path = "game/index.html"
text = load(path)
text = replace_once(text, "../visitor-tracker.js?v=20260901-section-visit", "../visitor-tracker.js?v=20260902-perf-1", "visitor tracker cache bust")
text = replace_once(text, "../game-records.js?v=20260902-run-analytics-2", "../game-records.js?v=20260902-perf-1", "game records cache bust")
text = replace_once(text, "./leaderboard.js?v=20260902-run-analytics-2", "./leaderboard.js?v=20260902-perf-1", "leaderboard cache bust")
save(path, text)


# ---------------------------------------------------------------------------
# Analytics dashboard: halve the recurring snapshot cadence and prevent focus
# bouncing from triggering refreshes when the current snapshot is still young.
# Increase the client snapshot TTL to match the new cadence.
# ---------------------------------------------------------------------------
path = "analytics/auto-refresh.js"
text = load(path)
text = replace_once(
    text,
    '''  let lastQuietRefresh = 0;

  const requestRefresh = ({ quiet = false } = {}) => {
    if (quiet && (document.hidden || !document.hasFocus())) return;
    if (quiet && Date.now() - lastQuietRefresh < 15000) return;
    if (quiet) lastQuietRefresh = Date.now();
    window.__invalidateAnalyticsSnapshot?.();
''',
    '''  const AUTO_REFRESH_MS = 2 * 60 * 1000;
  const QUIET_MIN_AGE_MS = 60 * 1000;
  let lastRefreshRequest = Date.now();

  const requestRefresh = ({ quiet = false } = {}) => {
    if (quiet && (document.hidden || !document.hasFocus())) return;
    if (quiet && Date.now() - lastRefreshRequest < QUIET_MIN_AGE_MS) return;
    lastRefreshRequest = Date.now();
    window.__invalidateAnalyticsSnapshot?.();
''',
    "analytics focus refresh dedupe",
)
text = replace_once(
    text,
    "  window.setInterval(() => requestRefresh({ quiet: true }), 60 * 1000);",
    "  window.setInterval(() => requestRefresh({ quiet: true }), AUTO_REFRESH_MS);",
    "analytics two-minute cadence",
)
save(path, text)

path = "analytics/fetch-shim.js"
text = load(path)
text = replace_once(text, "  const maxCacheAge = 70 * 1000;", "  const maxCacheAge = 130 * 1000;", "analytics snapshot client TTL")
save(path, text)

path = "analytics/index.html"
text = load(path)
text = replace_once(text, "Refreshes automatically every minute", "Refreshes automatically every 2 minutes", "analytics refresh copy")
text = replace_once(text, "./fetch-shim.js?v=20260901-3", "./fetch-shim.js?v=20260902-perf-1", "fetch shim cache bust")
text = replace_once(text, "./auto-refresh.js?v=20260901-5", "./auto-refresh.js?v=20260902-perf-1", "auto refresh cache bust")
save(path, text)


# ---------------------------------------------------------------------------
# Worker D1 efficiency: a newly generated run ID does not need to be selected
# back out immediately after a successful INSERT. The insert result already
# proves ownership/availability and we know the token we just generated.
# ---------------------------------------------------------------------------
path = "counter-worker/src/insights.js"
text = load(path)
old_start = '''    const usesReceipt = Number(body.receiptVersion ?? 0) >= 2;
    const runToken = usesReceipt ? createRunToken() : null;
    await env.DB
      .prepare(
        `INSERT OR IGNORE INTO game_starts
          (run_id, visitor_id, mode, visit_date, run_token)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(run, visitor, mode, date, runToken)
      .run();

    const startRow = await env.DB
      .prepare(
        `SELECT visitor_id, mode, run_token, completed_at
         FROM game_starts WHERE run_id = ?`,
      )
      .bind(run)
      .first();
    if (
      !startRow
      || startRow.visitor_id !== visitor
      || startRow.mode !== mode
      || startRow.completed_at
    ) {
      return jsonResponse({ error: "Run ID is unavailable" }, 409, origin);
    }
    return jsonResponse({
      ok: true,
      receiptVersion: startRow.run_token ? 2 : 1,
      runToken: startRow.run_token || null,
    }, 200, origin);
'''
new_start = '''    const usesReceipt = Number(body.receiptVersion ?? 0) >= 2;
    const runToken = usesReceipt ? createRunToken() : null;
    const inserted = await env.DB
      .prepare(
        `INSERT OR IGNORE INTO game_starts
          (run_id, visitor_id, mode, visit_date, run_token)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(run, visitor, mode, date, runToken)
      .run();

    if (Number(inserted?.meta?.changes ?? 0) < 1) {
      return jsonResponse({ error: "Run ID is unavailable" }, 409, origin);
    }
    return jsonResponse({
      ok: true,
      receiptVersion: runToken ? 2 : 1,
      runToken,
    }, 200, origin);
'''
text = replace_once(text, old_start, new_start, "run-start D1 read elimination")
save(path, text)


# Final assertions: these are intentionally opinionated so a future source drift
# makes the CI job fail rather than silently shipping only half the optimization.
checks = {
    "site-core.js": ["const pollInterval = 60 * 1000", "lastSuccessfulFetchAt"],
    "visitor-tracker.js": ["visitBucketKey", "chicagoHourBucket"],
    "game-records.js": ["GAMEPAD_SCAN_INTERVAL = 500", 'window.addEventListener("gamepadconnected"'],
    "game/leaderboard.js": ["leaderboardFreshMs = 60 * 1000", "payloadLoadedAt"],
    "analytics/auto-refresh.js": ["AUTO_REFRESH_MS = 2 * 60 * 1000", "QUIET_MIN_AGE_MS = 60 * 1000"],
    "analytics/fetch-shim.js": ["maxCacheAge = 130 * 1000"],
    "analytics/index.html": ["Refreshes automatically every 2 minutes", "fetch-shim.js?v=20260902-perf-1", "auto-refresh.js?v=20260902-perf-1"],
    "game/index.html": ["visitor-tracker.js?v=20260902-perf-1", "game-records.js?v=20260902-perf-1", "leaderboard.js?v=20260902-perf-1"],
    "index.html": ["script.js?v=20260902-perf-1"],
    "script.js": ["site-core.js?v=20260902-perf-1"],
}
for file, needles in checks.items():
    data = load(file)
    for needle in needles:
        if needle not in data:
            raise RuntimeError(f"Final optimization assertion failed: {file}: {needle}")
