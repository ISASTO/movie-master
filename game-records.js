(() => {
  "use strict";

  const endpoint = "https://movie-master-visitor-counter.isasto.workers.dev/game-event";
  const visitorIdKey = "movie-master-visitor-id";
  const startButtons = ["start-button", "restart-button", "reset-confirm-button"];
  const GAMEPAD_DEAD_ZONE = 0.18;
  const GAMEPAD_BUTTON_THRESHOLD = 0.5;
  const GAMEPAD_SCAN_INTERVAL = 50;
  let activeRunId = null;
  let runActive = false;
  let finishing = false;
  let activeGamepadIndex = null;

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

  const post = (body) => {
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      keepalive: true,
    }).catch(() => {
      // Reporting must never interrupt the game.
    });
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
    if (!runActive || !pauseButton || pauseButton.disabled) return false;
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
    if (document.visibilityState !== "visible") return;
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

  const markNonGamepadInput = (event) => {
    if (!runActive) return;
    if (event.type === "keydown" && event.repeat) return;
    activeGamepadIndex = null;
  };

  const beginRun = () => {
    runActive = true;
    finishing = false;
    scanGamepads();

    const visitorId = getVisitorId();
    const runId = createUuid();
    if (!visitorId || !runId) {
      activeRunId = null;
      return;
    }
    activeRunId = runId;
    post({
      event: "start",
      visitorId,
      runId,
      mode: currentMode(),
    });
  };

  const finishRun = () => {
    runActive = false;
    activeGamepadIndex = null;
    if (!activeRunId || finishing) return;
    const visitorId = getVisitorId();
    if (!visitorId) {
      activeRunId = null;
      return;
    }
    finishing = true;

    const runId = activeRunId;
    const payload = {
      event: "finish",
      visitorId,
      runId,
      mode: (document.getElementById("stat-mode")?.textContent || currentMode()).trim().toUpperCase(),
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
    };

    post(payload);
    activeRunId = null;
    finishing = false;
  };

  for (const id of startButtons) {
    document.getElementById(id)?.addEventListener("click", beginRun);
  }

  window.addEventListener("gamepaddisconnected", (event) => {
    handleActiveGamepadDisconnect(event.gamepad.index);
  });
  window.addEventListener("keydown", markNonGamepadInput, { capture: true });
  window.addEventListener("pointerdown", markNonGamepadInput, { capture: true });
  window.setInterval(scanGamepads, GAMEPAD_SCAN_INTERVAL);

  const gameover = document.getElementById("gameover-overlay");
  if (gameover) {
    const observer = new MutationObserver(() => {
      if (!gameover.hidden) window.setTimeout(finishRun, 0);
    });
    observer.observe(gameover, { attributes: true, attributeFilter: ["hidden"] });
  }
})();
