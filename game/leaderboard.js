(() => {
  "use strict";

  const apiBase = "https://movie-master-visitor-counter.isasto.workers.dev";
  const visitorIdKey = "movie-master-visitor-id";
  const nameCookie = "movie-master-leaderboard-name";
  const legacyImportMarker = "movie-master-public-leaderboard-import-v1";
  const legacyScoreKey = "movie-master-vs-garbage-high-score-v1";
  const standardScoreKey = "movie-master-vs-garbage-high-score-easy-v1";
  const hardcoreScoreKey = "movie-master-vs-garbage-high-score-hardcore-v1";
  const numberFormatter = new Intl.NumberFormat("en-US");
  const leaderboardFreshMs = 60 * 1000;
  const template = document.getElementById("leaderboard-card-template");
  const mounts = [...document.querySelectorAll("[data-leaderboard-mount]")];
  const forms = [...document.querySelectorAll("[data-leaderboard-name-form]")];
  const nameInputs = [...document.querySelectorAll("[data-leaderboard-name-input]")];
  const nameStatuses = [...document.querySelectorAll("[data-leaderboard-name-status]")];
  const modeTabs = [...document.querySelectorAll("[data-leaderboard-mode-tab]")];

  // Remove build-time explanatory copy that no longer helps players.
  document.getElementById("leaderboard-placement-status")?.remove();
  document.querySelector(".leaderboards-panel > .poster-kicker")?.remove();
  document.querySelector(".leaderboard-reset-copy")?.remove();


  if (!template || !mounts.length) return;

  const periodByMode = { NORMAL: "allTime", HARDCORE: "allTime" };
  let activeMobileMode = "NORMAL";
  let activeRunMode = "NORMAL";
  let payload = null;
  let payloadLoadedAt = 0;
  let loadingPromise = null;

  const getVisitorId = () => {
    try {
      return window.localStorage.getItem(visitorIdKey) || "";
    } catch {
      return "";
    }
  };

  const readCookieScore = (key) => {
    const prefix = `${key}=`;
    for (const part of document.cookie.split(";")) {
      const cookie = part.trim();
      if (!cookie.startsWith(prefix)) continue;
      const value = Number.parseInt(decodeURIComponent(cookie.slice(prefix.length)), 10);
      return Number.isFinite(value) ? Math.max(0, value) : 0;
    }
    return 0;
  };

  const readStoredScore = (key) => {
    let localValue = 0;
    try {
      const value = Number.parseInt(window.localStorage.getItem(key) ?? "", 10);
      localValue = Number.isFinite(value) ? Math.max(0, value) : 0;
    } catch {
      localValue = 0;
    }
    return Math.max(localValue, readCookieScore(key));
  };

  const readNameCookie = () => {
    const prefix = `${nameCookie}=`;
    for (const part of document.cookie.split(";")) {
      const cookie = part.trim();
      if (!cookie.startsWith(prefix)) continue;
      try {
        return (decodeURIComponent(cookie.slice(prefix.length)) || "ANONYMOUS").toUpperCase();
      } catch {
        return "ANONYMOUS";
      }
    }
    return "ANONYMOUS";
  };

  const writeNameCookie = (name) => {
    const value = String(name || "ANONYMOUS").toUpperCase();
    document.cookie = `${nameCookie}=${encodeURIComponent(value)}; Max-Age=31536000; Path=/; SameSite=Lax; Secure`;
  };

  const syncNameInputs = (name) => {
    const value = String(name || "ANONYMOUS").toUpperCase();
    for (const input of nameInputs) input.value = value;
  };

  const setNameStatus = (message, isError = false) => {
    for (const status of nameStatuses) {
      status.textContent = message;
      status.classList.toggle("is-error", isError);
    }
  };

  const modeLabel = (mode) => mode === "HARDCORE" ? "HARDCORE" : "STANDARD";

  const createCard = (mount) => {
    const mode = mount.dataset.leaderboardMount === "HARDCORE" ? "HARDCORE" : "NORMAL";
    const fragment = template.content.cloneNode(true);
    const card = fragment.querySelector(".leaderboard-card");
    card.dataset.leaderboardMode = mode;
    card.querySelector("[data-leaderboard-title]").textContent = modeLabel(mode);
    for (const button of card.querySelectorAll("[data-leaderboard-period]")) {
      button.addEventListener("click", () => {
        periodByMode[mode] = button.dataset.leaderboardPeriod;
        render();
      });
    }
    mount.replaceChildren(fragment);
  };

  for (const mount of mounts) createCard(mount);

  const addMessageRow = (tbody, message) => {
    const row = document.createElement("tr");
    row.className = "leaderboard-message";
    const cell = document.createElement("td");
    cell.colSpan = 3;
    cell.textContent = message;
    row.append(cell);
    tbody.append(row);
  };

  const addEntryRow = (tbody, entry) => {
    const row = document.createElement("tr");
    if (entry.isViewer) row.classList.add("is-viewer");

    const rank = document.createElement("th");
    rank.scope = "row";
    rank.textContent = numberFormatter.format(entry.rank);

    const name = document.createElement("td");
    name.className = "leaderboard-player-name";
    name.textContent = String(entry.name || "ANONYMOUS").toUpperCase();

    const score = document.createElement("td");
    score.className = "leaderboard-score";
    score.textContent = numberFormatter.format(entry.score || 0);

    row.append(rank, name, score);
    tbody.append(row);
  };

  const addEllipsisRow = (tbody) => {
    const row = document.createElement("tr");
    row.className = "leaderboard-ellipsis";
    const cell = document.createElement("td");
    cell.colSpan = 3;
    cell.setAttribute("aria-label", "Additional leaderboard positions omitted");
    cell.textContent = "⋯";
    row.append(cell);
    tbody.append(row);
  };

  const renderCard = (card) => {
    const mode = card.dataset.leaderboardMode;
    const period = periodByMode[mode];
    for (const button of card.querySelectorAll("[data-leaderboard-period]")) {
      const selected = button.dataset.leaderboardPeriod === period;
      button.setAttribute("aria-pressed", String(selected));
    }

    const tbody = card.querySelector("[data-leaderboard-rows]");
    tbody.replaceChildren();
    const board = payload?.boards?.[mode]?.[period];
    if (!board) {
      addMessageRow(tbody, loadingPromise ? "LOADING…" : "UNAVAILABLE");
      return;
    }
    if (!board.top?.length) {
      addMessageRow(tbody, "NO SCORES YET");
      return;
    }
    for (const entry of board.top) addEntryRow(tbody, entry);
    if (board.nearby?.length) {
      addEllipsisRow(tbody);
      for (const entry of board.nearby) addEntryRow(tbody, entry);
    }
  };

  const selectMobileMode = (mode) => {
    activeMobileMode = mode === "HARDCORE" ? "HARDCORE" : "NORMAL";
    for (const tab of modeTabs) {
      const selected = tab.dataset.leaderboardModeTab === activeMobileMode;
      tab.setAttribute("aria-selected", String(selected));
    }
    document.getElementById("leaderboard-overlay")?.setAttribute(
      "data-active-leaderboard-mode",
      activeMobileMode,
    );
  };

  const render = () => {
    for (const card of document.querySelectorAll(".leaderboard-card")) renderCard(card);
  };

  const request = async (path, options = {}) => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(`${apiBase}${path}`, {
        cache: "no-store",
        ...options,
        signal: controller.signal,
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(body.message || body.error || "LEADERBOARD UNAVAILABLE");
        error.status = response.status;
        throw error;
      }
      return body;
    } finally {
      window.clearTimeout(timeout);
    }
  };

  const applyPayload = (nextPayload) => {
    if (!nextPayload) return;
    payload = nextPayload;
    payloadLoadedAt = Date.now();
    const profileName = payload?.profile?.name || readNameCookie();
    syncNameInputs(profileName);
    writeNameCookie(profileName);
    render();
  };

  const loadLeaderboards = async (force = false) => {
    if (loadingPromise) return loadingPromise;
    if (payload && !force && Date.now() - payloadLoadedAt < leaderboardFreshMs) return payload;
    const visitorId = getVisitorId();
    loadingPromise = request("/public-leaderboards", {
      headers: visitorId ? { "X-Visitor-ID": visitorId } : {},
    });
    render();
    try {
      const result = await loadingPromise;
      applyPayload(result);
      return result;
    } catch (error) {
      payload = null;
      throw error;
    } finally {
      loadingPromise = null;
      render();
    }
  };

  const importLegacyBests = async () => {
    const visitorId = getVisitorId();
    if (!visitorId) return;
    try {
      if (window.localStorage.getItem(legacyImportMarker) === "1") return;
    } catch {
      return;
    }

    const normal = Math.max(readStoredScore(legacyScoreKey), readStoredScore(standardScoreKey));
    const hardcore = readStoredScore(hardcoreScoreKey);
    const result = await request("/legacy-leaderboard-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId,
        scores: { NORMAL: normal, HARDCORE: hardcore },
      }),
    });
    applyPayload(result.leaderboards);
    try {
      window.localStorage.setItem(legacyImportMarker, "1");
    } catch {
      // A failed marker only means the harmless one-time import may be retried.
    }
  };

  const saveName = async (form) => {
    const input = form.querySelector("[data-leaderboard-name-input]");
    const submit = form.querySelector("button[type='submit']");
    const visitorId = getVisitorId();
    if (!visitorId) {
      setNameStatus("LEADERBOARD IDENTITY IS UNAVAILABLE", true);
      return;
    }
    input.value = input.value.toUpperCase();
    submit.disabled = true;
    setNameStatus("SAVING…");
    try {
      const result = await request("/leaderboard-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId, name: input.value }),
      });
      applyPayload(result);
      setNameStatus("NAME SAVED");
    } catch (error) {
      setNameStatus(String(error.message || "UNABLE TO SAVE NAME").toUpperCase(), true);
    } finally {
      submit.disabled = false;
    }
  };

  for (const input of nameInputs) {
    input.addEventListener("input", () => {
      const start = input.selectionStart;
      const end = input.selectionEnd;
      input.value = input.value.toUpperCase();
      if (start !== null && end !== null) input.setSelectionRange(start, end);
    });
  }

  for (const form of forms) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      void saveName(form);
    });
  }

  for (const tab of modeTabs) {
    tab.addEventListener("click", () => selectMobileMode(tab.dataset.leaderboardModeTab));
  }

  window.addEventListener("movie-master:run-started", (event) => {
    activeRunMode = event.detail?.mode === "HARDCORE" ? "HARDCORE" : "NORMAL";
  });

  window.addEventListener("movie-master:run-recorded", (event) => {
    if (event.detail?.leaderboards) {
      applyPayload(event.detail.leaderboards);
      return;
    }
    void loadLeaderboards(true).catch(() => {});
  });

  window.addEventListener("movie-master:run-record-failed", () => {
    void loadLeaderboards(true).catch(() => {});
  });

  window.addEventListener("movie-master:leaderboards-opened", (event) => {
    selectMobileMode(event.detail?.mode || activeRunMode);
    void loadLeaderboards(false).catch(() => {});
  });

  syncNameInputs(readNameCookie());
  selectMobileMode(activeMobileMode);
  render();
  void importLegacyBests().catch(() => {});
})();
