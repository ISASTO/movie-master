(() => {
  "use strict";

  const endpoint = "https://movie-master-visitor-counter.isasto.workers.dev/game-event";
  const visitorIdKey = "movie-master-visitor-id";
  const pendingEventsKey = "movie-master-pending-game-events-v1";
  const MAX_PENDING_EVENTS = 60;
  const MAX_PENDING_AGE_MS = 14 * 24 * 60 * 60 * 1000;
  const GAMEPAD_DEAD_ZONE = 0.18;
  const GAMEPAD_BUTTON_THRESHOLD = 0.5;
  // The browser's disconnect event is immediate. This scan only identifies the
  // pad actually in use and provides a fallback for unusual browser behavior.
  const GAMEPAD_SCAN_INTERVAL = 500;
  let activeRun = null;
  let runActive = false;
  let activeGamepadIndex = null;
  let gamepadScanTimer = null;
  let pendingEventsMemory = [];
  let pendingFlush = null;
  let pendingRetryTimer = null;

  const shareRunStatus = document.getElementById("share-run-status");
  if (shareRunStatus) shareRunStatus.style.marginTop = "28px";

  const createUuid = () => {
    if (typeof crypto?.randomUUID === "function") return crypto.randomUUID();
    if (typeof crypto?.getRandomValues !== "function") return null;
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0"));
    return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
  };

  const getVisitorId = () => {
    try {
      return window.localStorage.getItem(visitorIdKey);
    } catch {
      return null;
    }
  };

  const request = async (body) => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
        keepalive: true,
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(payload?.error || `Request failed: ${response.status}`);
        error.status = response.status;
        throw error;
      }
      return payload;
    } finally {
      window.clearTimeout(timeout);
    }
  };

  const wait = (milliseconds) => new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });

  const requestWithRetry = async (body, attempts = 2) => {
    let lastError = null;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        return await request(body);
      } catch (error) {
        lastError = error;
        const retryable = error?.name === "AbortError"
          || error instanceof TypeError
          || Number(error?.status) >= 500;
        if (!retryable || attempt >= attempts - 1) throw error;
        await wait(250 * (attempt + 1));
      }
    }
    throw lastError;
  };

  const dispatchRunEvent = (name, detail = {}) => {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  };

  const pendingId = (body) => `${body.runId}:${body.event}`;

  const sanitizePendingEvents = (value) => {
    if (!Array.isArray(value)) return [];
    const cutoff = Date.now() - MAX_PENDING_AGE_MS;
    return value.filter((item) =>
      item
      && typeof item.createdAt === "number"
      && item.createdAt >= cutoff
      && item.body
      && typeof item.body.runId === "string"
      && ["start", "checkpoint", "finish"].includes(item.body.event));
  };

  const readPendingEvents = () => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(pendingEventsKey) || "[]");
      pendingEventsMemory = sanitizePendingEvents(stored);
    } catch {
      pendingEventsMemory = sanitizePendingEvents(pendingEventsMemory);
    }
    return pendingEventsMemory.map((item) => ({
      ...item,
      body: { ...item.body },
    }));
  };

  const writePendingEvents = (items) => {
    pendingEventsMemory = sanitizePendingEvents(items);
    try {
      window.localStorage.setItem(pendingEventsKey, JSON.stringify(pendingEventsMemory));
    } catch {
      // The in-memory queue still protects events for the lifetime of this page.
    }
  };

  const trimPendingEvents = (items) => {
    const trimmed = [...items];
    while (trimmed.length > MAX_PENDING_EVENTS) {
      const oldestRunId = trimmed[0]?.body?.runId;
      if (!oldestRunId) {
        trimmed.shift();
        continue;
      }
      for (let index = trimmed.length - 1; index >= 0; index -= 1) {
        if (trimmed[index]?.body?.runId === oldestRunId) trimmed.splice(index, 1);
      }
    }
    return trimmed;
  };

  const enqueuePendingEvent = (body) => {
    let items = readPendingEvents();
    const id = pendingId(body);

    if (body.event === "checkpoint") {
      if (items.some((item) => item.body.runId === body.runId && item.body.event === "finish")) {
        return;
      }
    } else if (body.event === "finish") {
      items = items.filter((item) =>
        !(item.body.runId === body.runId && item.body.event === "checkpoint"));
    }

    const next = { id, createdAt: Date.now(), body: { ...body } };
    const currentIndex = items.findIndex((item) => item.id === id);
    if (currentIndex >= 0) items[currentIndex] = next;
    else items.push(next);
    writePendingEvents(trimPendingEvents(items));
  };

  const removePendingEvent = (sent) => {
    // A second pause may replace a checkpoint while its earlier request is in
    // flight. Only acknowledge the snapshot that was actually sent.
    const sentBody = JSON.stringify(sent.body);
    writePendingEvents(readPendingEvents().filter((item) =>
      item.id !== sent.id
      || item.createdAt !== sent.createdAt
      || JSON.stringify(item.body) !== sentBody));
  };

  const attachRunToken = (runId, runToken) => {
    if (!runToken) return;
    const items = readPendingEvents().map((item) => {
      if (item.body.runId === runId && item.body.event !== "start") {
        return { ...item, body: { ...item.body, runToken } };
      }
      return item;
    });
    writePendingEvents(items);
    if (activeRun?.runId === runId) activeRun.runToken = runToken;
  };

  const schedulePendingRetry = () => {
    if (pendingRetryTimer !== null) return;
    pendingRetryTimer = window.setTimeout(() => {
      pendingRetryTimer = null;
      void flushPendingEvents();
    }, 5000);
  };

  const flushPendingEvents = () => {
    if (pendingFlush) return pendingFlush;
    if (!readPendingEvents().length) return Promise.resolve();
    pendingFlush = (async () => {
      const deferredRuns = new Set();
      while (true) {
        // Preserve each game's start-before-finish ordering, without letting
        // one temporarily unrecordable game hold up every subsequent game.
        const item = readPendingEvents().find((entry) => !deferredRuns.has(entry.body.runId));
        if (!item) return;
        try {
          const result = await requestWithRetry(item.body, item.body.event === "finish" ? 3 : 2);
          if (item.body.event === "start") attachRunToken(item.body.runId, result?.runToken);
          removePendingEvent(item);
          if (item.body.event === "finish") {
            dispatchRunEvent("movie-master:run-recorded", result);
          }
        } catch (error) {
          const status = Number(error?.status ?? 0);
          const missingReceipt = status === 409
            && item.body.event !== "start"
            && !item.body.runToken;
          const permanent = status >= 400 && status < 500 && status !== 429 && !missingReceipt;
          if (permanent) {
            removePendingEvent(item);
            if (item.body.event === "finish") {
              dispatchRunEvent("movie-master:run-record-failed", {
                message: error?.message || "Leaderboard submission failed",
              });
            }
            continue;
          }
          deferredRuns.add(item.body.runId);
          schedulePendingRetry();
        }
      }
    })().finally(() => {
      pendingFlush = null;
      if (readPendingEvents().length) schedulePendingRetry();
    });
    return pendingFlush;
  };

  const sendBeacon = (body) => {
    if (!body?.runToken || typeof navigator.sendBeacon !== "function") return false;
    try {
      return navigator.sendBeacon(
        endpoint,
        new Blob([JSON.stringify(body)], { type: "text/plain;charset=UTF-8" }),
      );
    } catch {
      return false;
    }
  };

  const currentMode = () =>
    document.documentElement.classList.contains("hardcore-mode") ? "HARDCORE" : "NORMAL";

  const readInteger = (id) => {
    const text = document.getElementById(id)?.textContent ?? "0";
    const value = Number.parseInt(text.replace(/[^0-9-]/g, ""), 10);
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  };

  const readDuration = (id) => {
    const text = (document.getElementById(id)?.textContent ?? "0:00").trim();
    const parts = text.split(":").map((part) => Number.parseInt(part, 10));
    if (parts.some((part) => !Number.isFinite(part))) return 0;
    if (parts.length === 3) return Math.max(0, parts[0] * 3600 + parts[1] * 60 + parts[2]);
    if (parts.length === 2) return Math.max(0, parts[0] * 60 + parts[1]);
    return Math.max(0, parts[0] ?? 0);
  };

  const readConnectedGamepads = () => {
    const getGamepads = navigator.getGamepads || navigator.webkitGetGamepads;
    if (typeof getGamepads !== "function") return [];
    try {
      return [...(getGamepads.call(navigator) || [])].filter(
        (gamepad) => gamepad && gamepad.connected !== false,
      );
    } catch {
      return [];
    }
  };

  const gamepadHasRelevantInput = (gamepad) => {
    const axisX = Number(gamepad?.axes?.[0]) || 0;
    const axisY = Number(gamepad?.axes?.[1]) || 0;
    if (axisX * axisX + axisY * axisY > GAMEPAD_DEAD_ZONE * GAMEPAD_DEAD_ZONE) return true;
    for (const button of gamepad?.buttons || []) {
      if (typeof button === "number") {
        if (button >= GAMEPAD_BUTTON_THRESHOLD) return true;
      } else if (button?.pressed || Number(button?.value) >= GAMEPAD_BUTTON_THRESHOLD) {
        return true;
      }
    }
    return false;
  };

  const gameIsActivelyUnpaused = () => {
    const pauseButton = document.getElementById("pause-button");
    if (!pauseButton || pauseButton.disabled) return false;
    if (document.documentElement.classList.contains("game-paused")) return false;
    if (document.getElementById("start-overlay")?.hidden === false) return false;
    if (document.getElementById("gameover-overlay")?.hidden === false) return false;
    if (document.getElementById("reset-confirm-overlay")?.hidden === false) return false;
    if (document.getElementById("end-confirm-overlay")?.hidden === false) return false;
    if (document.getElementById("exit-confirm-overlay")?.hidden === false) return false;
    return true;
  };

  const pauseForControllerDisconnect = () => {
    if (!gameIsActivelyUnpaused()) return;
    document.getElementById("pause-button")?.click();
    const announcement = document.getElementById("status-announcement");
    if (announcement) announcement.textContent = "Controller disconnected. Game paused.";
  };

  const handleActiveGamepadDisconnect = (index) => {
    if (index !== activeGamepadIndex) return;
    activeGamepadIndex = null;
    pauseForControllerDisconnect();
  };

  const scanGamepads = () => {
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

  const stopGamepadScanner = () => {
    if (gamepadScanTimer !== null) window.clearInterval(gamepadScanTimer);
    gamepadScanTimer = null;
  };

  const startGamepadScanner = () => {
    stopGamepadScanner();
    if (!runActive || !readConnectedGamepads().length) return;
    scanGamepads();
    if (runActive && readConnectedGamepads().length) {
      gamepadScanTimer = window.setInterval(scanGamepads, GAMEPAD_SCAN_INTERVAL);
    }
  };

  const markNonGamepadInput = (event) => {
    if (!runActive) return;
    if (event.type === "keydown" && event.repeat) return;
    activeGamepadIndex = null;
  };

  const detectDeviceType = () => {
    const ua = navigator.userAgent || "";
    const platform = navigator.userAgentData?.platform || navigator.platform || "";
    if (/iPad/i.test(ua) || (/Mac/i.test(platform) && navigator.maxTouchPoints > 1)) return "IPAD";
    if (/iPhone|iPod/i.test(ua)) return "IPHONE";
    if (/Android/i.test(ua)) return /Mobile/i.test(ua) ? "ANDROID PHONE" : "ANDROID TABLET";
    if (/Win/i.test(platform) || /Windows/i.test(ua)) return "WINDOWS PC";
    if (/Mac/i.test(platform) || /Macintosh/i.test(ua)) return "MAC";
    if (/Linux/i.test(platform) || /Linux/i.test(ua)) return "LINUX PC";
    return "OTHER";
  };

  const detectBrowserName = () => {
    const ua = navigator.userAgent || "";
    if (/Edg\//i.test(ua)) return "EDGE";
    if (/OPR\//i.test(ua)) return "OPERA";
    if (/Firefox\//i.test(ua)) return "FIREFOX";
    if (/Chrome\//i.test(ua) || /CriOS\//i.test(ua)) return "CHROME";
    if (/Safari\//i.test(ua)) return "SAFARI";
    return "OTHER";
  };

  const detectControlMethod = () => {
    if (activeGamepadIndex !== null || document.documentElement.classList.contains("controller-input")) {
      return "CONTROLLER";
    }
    const label = (document.getElementById("movement-button")?.textContent || "").toUpperCase();
    if (label.includes("TOUCH")) return "TOUCH";
    if (label.includes("KEYS")) return "KEYBOARD";
    if (label.includes("MOUSE")) return "MOUSE";
    return window.matchMedia?.("(hover: none), (pointer: coarse)")?.matches ? "TOUCH" : "UNKNOWN";
  };

  const detectQualityLevel = () => {
    const quality = String(document.documentElement.dataset.gameQuality || "UNKNOWN").toUpperCase();
    return ["HIGH", "MEDIUM", "LOW"].includes(quality) ? quality : "UNKNOWN";
  };

  const beginRun = () => {
    runActive = true;
    activeGamepadIndex = null;
    startGamepadScanner();
    const visitorId = getVisitorId();
    const runId = createUuid();
    if (!visitorId || !runId) {
      activeRun = null;
      return;
    }
    const mode = currentMode();
    activeRun = {
      visitorId,
      runId,
      mode,
      runToken: null,
    };
    enqueuePendingEvent({
      event: "start",
      visitorId,
      runId,
      mode,
      receiptVersion: 2,
    });
    void flushPendingEvents();
    dispatchRunEvent("movie-master:run-started", { mode });
  };

  const buildRunPayload = (runRecord, event, endReason) => ({
    event,
    visitorId: runRecord.visitorId,
    runId: runRecord.runId,
    mode: (document.getElementById("stat-mode")?.textContent || currentMode()).trim().toUpperCase(),
    endReason,
    score: readInteger("stat-score"),
    longestStreak: readInteger("stat-longest-streak"),
    gameTimeSeconds: readDuration("stat-game-time"),
    popcornCollected: readInteger("stat-popcorn-collected"),
    popcornMissed: readInteger("stat-popcorn-missed"),
    garbageDestroyed: readInteger("stat-garbage-destroyed"),
    destroyedByStars: readInteger("stat-destroyed-by-stars"),
    destroyedByBlasts: readInteger("stat-destroyed-by-blasts"),
    starsFired: readInteger("stat-stars-fired"),
    starsHit: readInteger("stat-stars-hit"),
    hitsTaken: readInteger("stat-hits-taken"),
    shieldBlocks: readInteger("stat-shield-blocks"),
    blastsUsed: readInteger("stat-blasts-used"),
    powerupShield: readInteger("stat-powerup-shield"),
    powerupSpeed: readInteger("stat-powerup-speed"),
    powerupSuper: readInteger("stat-powerup-super"),
    powerupMagnet: readInteger("stat-powerup-magnet"),
    deviceType: detectDeviceType(),
    browserName: detectBrowserName(),
    controlMethod: detectControlMethod(),
    qualityLevel: detectQualityLevel(),
    ...(runRecord.runToken ? { runToken: runRecord.runToken } : {}),
  });

  const checkpointRun = (reason = "pause") => {
    if (!runActive || !activeRun) return null;
    enqueuePendingEvent(buildRunPayload(activeRun, "checkpoint", reason));
    return flushPendingEvents();
  };

  const finishRun = (reason = "unknown") => {
    const runRecord = activeRun;
    runActive = false;
    stopGamepadScanner();
    activeGamepadIndex = null;
    activeRun = null;
    if (!runRecord) {
      dispatchRunEvent("movie-master:run-record-failed", {
        message: "Leaderboard identity is unavailable",
      });
      return null;
    }

    const payload = buildRunPayload(runRecord, "finish", reason);
    enqueuePendingEvent(payload);
    if (reason === "pagehide" || reason === "exit") sendBeacon(payload);
    return flushPendingEvents();
  };

  window.addEventListener("movie-master:game-run-started", () => {
    beginRun();
  });
  window.addEventListener("movie-master:game-run-finalized", (event) => {
    if (!runActive) return;
    const pending = finishRun(event.detail?.reason || "unknown");
    if (Array.isArray(event.detail?.pending)) event.detail.pending.push(pending);
  });
  window.addEventListener("movie-master:game-run-checkpoint", (event) => {
    void checkpointRun(event.detail?.reason || "pause");
  });
  window.addEventListener("gamepadconnected", () => {
    if (runActive) startGamepadScanner();
  });
  window.addEventListener("gamepaddisconnected", (event) => {
    handleActiveGamepadDisconnect(event.gamepad.index);
    if (runActive && !readConnectedGamepads().length) stopGamepadScanner();
  });
  window.addEventListener("keydown", markNonGamepadInput, { capture: true });
  window.addEventListener("pointerdown", markNonGamepadInput, { capture: true });
  window.addEventListener("online", () => void flushPendingEvents());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void flushPendingEvents();
  });

  const gameover = document.getElementById("gameover-overlay");
  if (gameover) {
    const observer = new MutationObserver(() => {
      if (!gameover.hidden && runActive) window.setTimeout(() => void finishRun("unknown"), 0);
    });
    observer.observe(gameover, { attributes: true, attributeFilter: ["hidden"] });
  }

  void flushPendingEvents();
})();
