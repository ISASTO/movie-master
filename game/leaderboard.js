(() => {
  "use strict";

  const apiBase = "https://movie-master-visitor-counter.isasto.workers.dev";
  const visitorIdKey = "movie-master-visitor-id";
  const nameCookie = "movie-master-leaderboard-name";
  const numberFormatter = new Intl.NumberFormat("en-US");
  const template = document.getElementById("leaderboard-card-template");
  const mounts = [...document.querySelectorAll("[data-leaderboard-mount]")];
  const forms = [...document.querySelectorAll("[data-leaderboard-name-form]")];
  const nameInputs = [...document.querySelectorAll("[data-leaderboard-name-input]")];
  const nameStatuses = [...document.querySelectorAll("[data-leaderboard-name-status]")];
  const placementStatus = document.getElementById("leaderboard-placement-status");
  const modeTabs = [...document.querySelectorAll("[data-leaderboard-mode-tab]")];

  if (!template || !mounts.length) return;

  const periodByMode = { NORMAL: "allTime", HARDCORE: "allTime" };
  let activeMobileMode = "NORMAL";
  let activeRunMode = "NORMAL";
  let payload = null;
  let loadingPromise = null;

  const getVisitorId = () => {
    try {
      return window.localStorage.getItem(visitorIdKey) || "";
    } catch {
      return "";
    }
  };

  const readNameCookie = () => {
    const prefix = `${nameCookie}=`;
    for (const part of document.cookie.split(";")) {
      const cookie = part.trim();
      if (!cookie.startsWith(prefix)) continue;
      try {
        return decodeURIComponent(cookie.slice(prefix.length));
      } catch {
        return "ANONYMOUS";
      }
    }
    return "ANONYMOUS";
  };

  const writeNameCookie = (name) => {
    document.cookie = `${nameCookie}=${encodeURIComponent(name)}; Max-Age=31536000; Path=/; SameSite=Lax; Secure`;
  };

  const syncNameInputs = (name) => {
    const value = name || "ANONYMOUS";
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
    name.textContent = entry.name || "ANONYMOUS";

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

  const renderPlacement = () => {
    if (!placementStatus) return;
    if (!payload) {
      placementStatus.textContent = loadingPromise
        ? "CHECKING LEADERBOARD POSITION…"
        : "LEADERBOARD POSITION UNAVAILABLE";
      return;
    }
    const boards = payload.boards?.[activeRunMode];
    const daily = boards?.daily?.viewer?.rank;
    const allTime = boards?.allTime?.viewer?.rank;
    if (!daily && !allTime) {
      placementStatus.textContent = "YOUR FIRST QUALIFYING SCORE WILL SET YOUR RANK";
      return;
    }
    const dailyCopy = daily ? `DAILY #${numberFormatter.format(daily)}` : "DAILY —";
    const allTimeCopy = allTime ? `ALL-TIME #${numberFormatter.format(allTime)}` : "ALL-TIME —";
    placementStatus.textContent = `YOUR ${modeLabel(activeRunMode)} BEST · ${dailyCopy} · ${allTimeCopy}`;
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
    renderPlacement();
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

  const loadLeaderboards = async (force = false) => {
    if (loadingPromise) return loadingPromise;
    if (payload && !force) return payload;
    const visitorId = getVisitorId();
    loadingPromise = request("/public-leaderboards", {
      headers: visitorId ? { "X-Visitor-ID": visitorId } : {},
    });
    render();
    try {
      payload = await loadingPromise;
      const profileName = payload?.profile?.name || readNameCookie();
      syncNameInputs(profileName);
      writeNameCookie(profileName);
      render();
      return payload;
    } catch (error) {
      payload = null;
      throw error;
    } finally {
      loadingPromise = null;
      render();
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
    submit.disabled = true;
    setNameStatus("SAVING…");
    try {
      payload = await request("/leaderboard-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId, name: input.value }),
      });
      const name = payload?.profile?.name || "ANONYMOUS";
      syncNameInputs(name);
      writeNameCookie(name);
      setNameStatus("NAME SAVED");
      render();
    } catch (error) {
      setNameStatus(String(error.message || "UNABLE TO SAVE NAME").toUpperCase(), true);
    } finally {
      submit.disabled = false;
    }
  };

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
    if (placementStatus) placementStatus.textContent = "CHECKING LEADERBOARD POSITION…";
  });

  window.addEventListener("movie-master:run-recorded", (event) => {
    if (event.detail?.leaderboards) {
      payload = event.detail.leaderboards;
      const name = payload?.profile?.name || readNameCookie();
      syncNameInputs(name);
      writeNameCookie(name);
      render();
      return;
    }
    void loadLeaderboards(true).catch(() => {});
  });

  window.addEventListener("movie-master:run-record-failed", () => {
    if (placementStatus) placementStatus.textContent = "LEADERBOARD POSITION UNAVAILABLE";
    void loadLeaderboards(true).catch(() => {});
  });

  window.addEventListener("movie-master:leaderboards-opened", (event) => {
    selectMobileMode(event.detail?.mode);
    void loadLeaderboards(true).catch(() => {});
  });

  syncNameInputs(readNameCookie());
  selectMobileMode(activeMobileMode);
  render();
})();
