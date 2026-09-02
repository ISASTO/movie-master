(() => {
  "use strict";

  const apiBase = "https://movie-master-visitor-counter.isasto.workers.dev";
  const endpoint = `${apiBase}/mode-leaderboards`;
  const numberFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
  const standardBody = document.querySelector("#leaderboard-standard-body");
  const hardcoreBody = document.querySelector("#leaderboard-hardcore-body");
  const chicagoTime = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const formatDuration = (seconds) => {
    const total = Math.max(0, Math.round(Number(seconds) || 0));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const remainder = total % 60;
    return hours > 0
      ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
      : `${minutes}:${String(remainder).padStart(2, "0")}`;
  };

  const formatTimestamp = (value) => {
    if (!value) return "NOT RECORDED";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "NOT RECORDED" : chicagoTime.format(date).toUpperCase();
  };

  const formatPercent = (value) => `${(Number(value) || 0).toFixed(1)}%`;

  const locationLabel = (location) => {
    if (!location || (!location.city && !location.region && !location.countryCode)) return "NOT RECORDED";
    const country = location.countryCode === "US" ? "USA" : (location.countryCode || "");
    const region = location.regionCode || location.region || "";
    return [location.city, region, country].filter(Boolean).join(", ");
  };

  const sourceLabel = (source) => {
    if (source === "site") return "FROM MAIN SITE";
    if (source === "direct") return "DIRECT / SHARED";
    return "UNKNOWN / BEFORE TRACKING";
  };

  const ensureRecentRunsPanel = () => {
    let body = document.getElementById("recent-runs-body");
    if (body) return body;
    const totals = document.getElementById("gameplay-totals");
    if (!totals) return null;

    const panel = document.createElement("details");
    panel.className = "disclosure-panel detail-panel recent-runs-panel";
    panel.id = "recent-runs";
    panel.innerHTML = `
      <summary>
        <span><span class="eyebrow">LATEST COMPLETED GAMES</span><span class="disclosure-title">RECENT RUNS</span></span>
        <span class="disclosure-action" aria-hidden="true">SHOW RUNS</span>
      </summary>
      <div class="table-scroll recent-runs-scroll">
        <table class="leaderboard-table recent-runs-table">
          <thead><tr><th scope="col">COMPLETED</th><th scope="col">PLAYER</th><th scope="col">MODE</th><th scope="col">SCORE</th><th scope="col">STREAK</th><th scope="col">GAME TIME</th></tr></thead>
          <tbody id="recent-runs-body"><tr><td colspan="6">Loading…</td></tr></tbody>
        </table>
      </div>`;
    totals.insertAdjacentElement("afterend", panel);
    return panel.querySelector("#recent-runs-body");
  };

  const ensureRunDialog = () => {
    let dialog = document.getElementById("run-detail-dialog");
    if (dialog) return dialog;
    dialog = document.createElement("dialog");
    dialog.id = "run-detail-dialog";
    dialog.className = "run-detail-dialog";
    dialog.innerHTML = `
      <div class="run-detail-shell">
        <div class="run-detail-topbar">
          <div><p class="eyebrow">COMPLETED RUN</p><h2 id="run-detail-title">RUN DETAILS</h2></div>
          <button type="button" class="run-detail-close" aria-label="Close run details">CLOSE</button>
        </div>
        <div id="run-detail-content" class="run-detail-content"><p>Loading…</p></div>
      </div>`;
    document.body.append(dialog);
    dialog.querySelector(".run-detail-close")?.addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
    return dialog;
  };

  const recentBody = ensureRecentRunsPanel();
  const runDialog = ensureRunDialog();
  const runDetailContent = runDialog?.querySelector("#run-detail-content");
  const runDetailTitle = runDialog?.querySelector("#run-detail-title");

  const renderRunDetails = (run) => {
    if (!runDetailContent || !runDetailTitle) return;
    const stats = run.stats || {};
    const powerups = stats.powerups || {};
    runDetailTitle.textContent = `${run.player || "RUN DETAILS"} • ${run.mode === "HARDCORE" ? "HARDCORE" : "STANDARD"}`;
    runDetailContent.innerHTML = `
      <section class="run-detail-hero">
        <div><span>SCORE</span><strong>${numberFormatter.format(stats.score || 0)}</strong></div>
        <div><span>LONGEST STREAK</span><strong>${numberFormatter.format(stats.longestStreak || 0)}</strong></div>
        <div><span>GAME TIME</span><strong>${formatDuration(stats.gameTimeSeconds)}</strong></div>
      </section>
      <section class="run-detail-meta" aria-label="Run metadata">
        <div><span>RECORDED</span><strong>${formatTimestamp(run.finishedAt)}</strong></div>
        <div><span>STARTED</span><strong>${formatTimestamp(run.startedAt)}</strong></div>
        <div><span>LOCATION</span><strong>${locationLabel(run.location)}</strong></div>
        <div><span>ARRIVAL SOURCE</span><strong>${sourceLabel(run.source)}</strong></div>
        <div><span>DEVICE</span><strong>${run.device?.type || "NOT RECORDED"}</strong></div>
        <div><span>BROWSER</span><strong>${run.device?.browser || "NOT RECORDED"}</strong></div>
        <div><span>CONTROL METHOD</span><strong>${run.device?.controlMethod || "NOT RECORDED"}</strong></div>
        <div><span>QUALITY</span><strong>${run.device?.quality || "NOT RECORDED"}</strong></div>
      </section>
      <section class="run-detail-stats" aria-label="Full run statistics">
        <div><span>POPCORN COLLECTED</span><strong>${numberFormatter.format(stats.popcornCollected || 0)}</strong></div>
        <div><span>POPCORN MISSED</span><strong>${numberFormatter.format(stats.popcornMissed || 0)}</strong></div>
        <div><span>GARBAGE DESTROYED</span><strong>${numberFormatter.format(stats.garbageDestroyed || 0)}</strong></div>
        <div><span>DESTROYED BY STARS</span><strong>${numberFormatter.format(stats.destroyedByStars || 0)}</strong></div>
        <div><span>DESTROYED BY BLASTS</span><strong>${numberFormatter.format(stats.destroyedByBlasts || 0)}</strong></div>
        <div><span>STARS FIRED</span><strong>${numberFormatter.format(stats.starsFired || 0)}</strong></div>
        <div><span>STARS HIT</span><strong>${numberFormatter.format(stats.starsHit || 0)}</strong></div>
        <div><span>STAR ACCURACY</span><strong>${formatPercent(stats.starAccuracy)}</strong></div>
        <div><span>HITS TAKEN</span><strong>${numberFormatter.format(stats.hitsTaken || 0)}</strong></div>
        <div><span>SHIELD BLOCKS</span><strong>${numberFormatter.format(stats.shieldBlocks || 0)}</strong></div>
        <div><span>BLASTS USED</span><strong>${numberFormatter.format(stats.blastsUsed || 0)}</strong></div>
      </section>
      <h3 class="run-detail-subtitle">POWER-UPS USED</h3>
      <section class="run-detail-powerups">
        <div><span>SHIELD</span><strong>${numberFormatter.format(powerups.shield || 0)}</strong></div>
        <div><span>SUPER SPEED</span><strong>${numberFormatter.format(powerups.speed || 0)}</strong></div>
        <div><span>SUPER STARS</span><strong>${numberFormatter.format(powerups.super || 0)}</strong></div>
        <div><span>MAGNET</span><strong>${numberFormatter.format(powerups.magnet || 0)}</strong></div>
      </section>`;
  };

  const openRunDetails = async (runId) => {
    if (!runId || !runDialog || !runDetailContent) return;
    runDetailContent.innerHTML = "<p>Loading run details…</p>";
    runDetailTitle.textContent = "RUN DETAILS";
    if (typeof runDialog.showModal === "function") runDialog.showModal();
    else runDialog.setAttribute("open", "");

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(`${apiBase}/run-details?runId=${encodeURIComponent(runId)}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Run detail request failed: ${response.status}`);
      renderRunDetails(await response.json());
    } catch (error) {
      console.error("Unable to load run details", error);
      runDetailContent.innerHTML = "<p>Run details are temporarily unavailable.</p>";
    } finally {
      window.clearTimeout(timeout);
    }
  };

  const makeInteractive = (row, runId) => {
    if (!runId) return;
    row.classList.add("run-row");
    row.tabIndex = 0;
    row.setAttribute("role", "button");
    row.setAttribute("aria-label", "Open full run details");
    row.addEventListener("click", () => void openRunDetails(runId));
    row.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      void openRunDetails(runId);
    });
  };

  const renderRows = (tbody, rows) => {
    if (!tbody) return;
    tbody.replaceChildren();

    if (!rows.length) {
      const row = document.createElement("tr");
      row.className = "leaderboard-empty";
      const cell = document.createElement("td");
      cell.colSpan = 5;
      cell.textContent = "No completed runs recorded yet.";
      row.append(cell);
      tbody.append(row);
      return;
    }

    rows.forEach((entry) => {
      const row = document.createElement("tr");
      const values = [
        [`#${entry.rank}`, "leaderboard-rank", "RANK"],
        [entry.player, "leaderboard-player", "PLAYER"],
        [numberFormatter.format(entry.score ?? 0), "leaderboard-score", "SCORE"],
        [numberFormatter.format(entry.longestStreak ?? 0), "leaderboard-streak", "STREAK"],
        [formatDuration(entry.gameTimeSeconds), "leaderboard-time", "TIME"],
      ];

      values.forEach(([value, className, label], index) => {
        const cell = document.createElement(index === 0 ? "th" : "td");
        if (index === 0) cell.scope = "row";
        cell.className = className;
        cell.dataset.label = label;
        cell.textContent = value;
        row.append(cell);
      });
      makeInteractive(row, entry.runId);
      tbody.append(row);
    });
  };

  const renderRecentRows = (rows) => {
    if (!recentBody) return;
    recentBody.replaceChildren();
    if (!rows.length) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 6;
      cell.textContent = "No completed runs recorded yet.";
      row.append(cell);
      recentBody.append(row);
      return;
    }

    rows.forEach((entry) => {
      const row = document.createElement("tr");
      const values = [
        [formatTimestamp(entry.finishedAt), "recent-completed", "COMPLETED"],
        [entry.player, "leaderboard-player", "PLAYER"],
        [entry.mode === "HARDCORE" ? "HARDCORE" : "STANDARD", "recent-mode", "MODE"],
        [numberFormatter.format(entry.score ?? 0), "leaderboard-score", "SCORE"],
        [numberFormatter.format(entry.longestStreak ?? 0), "leaderboard-streak", "STREAK"],
        [formatDuration(entry.gameTimeSeconds), "leaderboard-time", "GAME TIME"],
      ];
      values.forEach(([value, className, label]) => {
        const cell = document.createElement("td");
        cell.className = className;
        cell.dataset.label = label;
        cell.textContent = value;
        row.append(cell);
      });
      makeInteractive(row, entry.runId);
      recentBody.append(row);
    });
  };

  let loading = false;

  const refresh = async () => {
    if (loading) return;
    loading = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(endpoint, { cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error(`Leaderboard request failed: ${response.status}`);
      const payload = await response.json();
      renderRows(standardBody, payload.standard ?? []);
      renderRows(hardcoreBody, payload.hardcore ?? []);
      renderRecentRows(payload.recent ?? []);
    } catch (error) {
      if (error?.name !== "AbortError") {
        console.error("Unable to load mode leaderboards", error);
      }
      [standardBody, hardcoreBody].forEach((tbody) => {
        if (!tbody) return;
        tbody.replaceChildren();
        const row = document.createElement("tr");
        row.className = "leaderboard-empty";
        const cell = document.createElement("td");
        cell.colSpan = 5;
        cell.textContent = "Leaderboard temporarily unavailable.";
        row.append(cell);
        tbody.append(row);
      });
      if (recentBody) {
        recentBody.innerHTML = '<tr><td colspan="6">Recent runs temporarily unavailable.</td></tr>';
      }
    } finally {
      window.clearTimeout(timeout);
      loading = false;
    }
  };

  window.addEventListener("analytics:refresh", refresh);
  refresh();
})();
