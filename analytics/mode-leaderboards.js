(() => {
  "use strict";

  const endpoint = "https://movie-master-visitor-counter.isasto.workers.dev/mode-leaderboards";
  const numberFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
  const standardBody = document.querySelector("#leaderboard-standard-body");
  const hardcoreBody = document.querySelector("#leaderboard-hardcore-body");

  const formatDuration = (seconds) => {
    const total = Math.max(0, Math.round(Number(seconds) || 0));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const remainder = total % 60;
    return hours > 0
      ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
      : `${minutes}:${String(remainder).padStart(2, "0")}`;
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
      tbody.append(row);
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
    } finally {
      window.clearTimeout(timeout);
      loading = false;
    }
  };

  window.addEventListener("analytics:refresh", refresh);
  refresh();
})();
