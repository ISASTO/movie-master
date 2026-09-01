(() => {
  "use strict";

  const endpoint = "https://movie-master-visitor-counter.isasto.workers.dev/mode-leaderboards";
  const numberFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
  const panel = document.querySelector(".leaderboard-panel");
  if (!panel) return;

  const formatDuration = (seconds) => {
    const total = Math.max(0, Math.round(Number(seconds) || 0));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const remainder = total % 60;
    return hours > 0
      ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
      : `${minutes}:${String(remainder).padStart(2, "0")}`;
  };

  const createBoard = (title, id) => {
    const section = document.createElement("section");
    section.className = "mode-leaderboard-board";

    const heading = document.createElement("div");
    heading.className = "mode-leaderboard-heading";
    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "TOP 10 • ALL TIME";
    const h3 = document.createElement("h3");
    h3.textContent = title;
    heading.append(eyebrow, h3);

    const scroll = document.createElement("div");
    scroll.className = "table-scroll";
    const table = document.createElement("table");
    table.className = "leaderboard-table";
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    ["RANK", "PLAYER", "SCORE", "STREAK", "TIME"].forEach((label) => {
      const th = document.createElement("th");
      th.scope = "col";
      th.textContent = label;
      headerRow.append(th);
    });
    thead.append(headerRow);
    const tbody = document.createElement("tbody");
    tbody.id = id;
    const loadingRow = document.createElement("tr");
    const loadingCell = document.createElement("td");
    loadingCell.colSpan = 5;
    loadingCell.textContent = "Loading…";
    loadingRow.append(loadingCell);
    tbody.append(loadingRow);
    table.append(thead, tbody);
    scroll.append(table);
    section.append(heading, scroll);
    return section;
  };

  panel.replaceChildren();
  const heading = document.createElement("div");
  heading.className = "detail-panel-heading";
  const headingCopy = document.createElement("div");
  const eyebrow = document.createElement("p");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = "HIGH SCORES BY DIFFICULTY";
  const title = document.createElement("h2");
  title.id = "leaderboard-title";
  title.textContent = "LEADERBOARDS";
  headingCopy.append(eyebrow, title);
  heading.append(headingCopy);

  const grid = document.createElement("div");
  grid.className = "mode-leaderboard-grid";
  grid.append(
    createBoard("STANDARD MODE", "standard-leaderboard-body"),
    createBoard("HARDCORE MODE", "hardcore-leaderboard-body"),
  );
  panel.append(heading, grid);

  const renderRows = (tbody, rows) => {
    if (!tbody) return;
    tbody.replaceChildren();
    if (!rows.length) {
      const row = document.createElement("tr");
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
        `#${entry.rank}`,
        entry.player,
        numberFormatter.format(entry.score ?? 0),
        numberFormatter.format(entry.longestStreak ?? 0),
        formatDuration(entry.gameTimeSeconds),
      ];
      values.forEach((value, index) => {
        const cell = document.createElement(index === 0 ? "th" : "td");
        if (index === 0) cell.scope = "row";
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
      renderRows(document.querySelector("#standard-leaderboard-body"), payload.standard ?? []);
      renderRows(document.querySelector("#hardcore-leaderboard-body"), payload.hardcore ?? []);
    } catch (error) {
      if (error?.name !== "AbortError") console.error("Unable to load mode leaderboards", error);
    } finally {
      window.clearTimeout(timeout);
      loading = false;
    }
  };

  document.querySelector("#refresh-button")?.addEventListener("click", refresh);
  window.setInterval(() => {
    if (!document.hidden && document.hasFocus()) refresh();
  }, 60 * 1000);
  window.addEventListener("focus", refresh);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refresh();
  });

  refresh();
})();
