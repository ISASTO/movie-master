(() => {
  "use strict";

  const endpoint = "https://movie-master-visitor-counter.isasto.workers.dev/details";
  const numberFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
  const oneDecimalFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
  const countryNames = typeof Intl.DisplayNames === "function"
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;

  const state = {
    payload: null,
    trafficSection: "site",
    locationsExpanded: false,
    loading: false,
  };

  const elements = {
    hourBars: document.querySelector("#hour-bars"),
    weekdayBars: document.querySelector("#weekday-bars"),
    hourDescription: document.querySelector("#hour-chart-description"),
    weekdayDescription: document.querySelector("#weekday-chart-description"),
    timeNote: document.querySelector("#time-pattern-note"),
    map: document.querySelector("#visitor-map"),
    mapPoints: document.querySelector("#visitor-map-points"),
    locationList: document.querySelector("#location-list"),
    locationToggle: document.querySelector("#location-list-toggle"),
    locationNote: document.querySelector("#location-note"),
    gameTrackingNote: document.querySelector("#game-tracking-note"),
    gameOverview: document.querySelector("#game-overview"),
    modeNormal: document.querySelector("#mode-normal-fill"),
    modeHardcore: document.querySelector("#mode-hardcore-fill"),
    modeNormalLabel: document.querySelector("#mode-normal-label"),
    modeHardcoreLabel: document.querySelector("#mode-hardcore-label"),
    totalsGroups: document.querySelector("#game-totals-groups"),
  };

  const summaryIds = {
    starts: "game-stat-starts",
    completed: "game-stat-completed",
    visitors: "game-stat-visitors",
    players: "game-stat-players",
    returning: "game-stat-returning",
    returnRate: "game-stat-return-rate",
    completion: "game-stat-completion",
    averageScore: "game-stat-avg-score",
    medianScore: "game-stat-median-score",
    highScore: "game-stat-high-score",
    averageTime: "game-stat-avg-time",
    averageStreak: "game-stat-avg-streak",
    highStreak: "game-stat-high-streak",
  };

  const setText = (id, text) => {
    const element = document.getElementById(id);
    if (element) element.textContent = text;
  };

  const formatDuration = (seconds) => {
    const total = Math.max(0, Math.round(Number(seconds) || 0));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const remainder = total % 60;
    return hours > 0
      ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
      : `${minutes}:${String(remainder).padStart(2, "0")}`;
  };

  const formatPercent = (value) => `${oneDecimalFormatter.format(Number(value) || 0)}%`;

  const formatTrackingDate = (iso) => {
    if (!iso) return "not yet";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "not yet";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "America/Chicago",
    });
  };

  const hourLabel = (hour) => {
    if (hour === 0) return "12a";
    if (hour === 12) return "12p";
    return hour < 12 ? `${hour}a` : `${hour - 12}p`;
  };

  const fullHourLabel = (hour) => {
    if (hour === 0) return "12–1 AM";
    if (hour === 11) return "11 AM–12 PM";
    if (hour === 12) return "12–1 PM";
    if (hour === 23) return "11 PM–12 AM";
    return hour < 12 ? `${hour}–${hour + 1} AM` : `${hour - 12}–${hour - 11} PM`;
  };

  function renderBarChart(container, rows, key, labelFor) {
    if (!container) return 0;
    container.replaceChildren();
    const total = rows.reduce((sum, row) => sum + Number(row[state.trafficSection] ?? 0), 0);
    const maxCount = Math.max(1, ...rows.map((row) => Number(row[state.trafficSection] ?? 0)));

    rows.forEach((row) => {
      const count = Number(row[state.trafficSection] ?? 0);
      const percent = total > 0 ? (count / total) * 100 : 0;
      const fullLabel = labelFor(row[key], true);
      const item = document.createElement("div");
      item.className = "mini-bar-item";
      item.title =
        `${fullLabel}: ${numberFormatter.format(count)} unique browser-${key === "hour" ? "hour" : "day"} visits (${formatPercent(percent)})`;
      item.setAttribute("aria-label", item.title);

      const value = document.createElement("span");
      value.className = "mini-bar-value";
      value.textContent = count > 0 ? numberFormatter.format(count) : "";

      const track = document.createElement("span");
      track.className = "mini-bar-track";
      const fill = document.createElement("span");
      fill.className = "mini-bar-fill";
      fill.style.height = `${count > 0 ? Math.max(4, (count / maxCount) * 100) : 0}%`;
      track.append(fill);

      const label = document.createElement("span");
      label.className = "mini-bar-label";
      label.textContent = labelFor(row[key], false);

      item.append(value, track, label);
      container.append(item);
    });

    return total;
  }

  function renderTimePatterns() {
    if (!state.payload) return;
    const hourlyTotal = renderBarChart(
      elements.hourBars,
      state.payload.hourly ?? [],
      "hour",
      (hour, full) => full ? fullHourLabel(Number(hour)) : hourLabel(Number(hour)),
    );

    const weekdayOrder = [1, 2, 3, 4, 5, 6, 0];
    const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const weekdayFull = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const byDay = new Map((state.payload.weekdays ?? []).map((row) => [Number(row.weekday), row]));
    const ordered = weekdayOrder.map((weekday) => byDay.get(weekday) ?? { weekday, site: 0, game: 0 });
    const weekdayTotal = renderBarChart(
      elements.weekdayBars,
      ordered,
      "weekday",
      (weekday, full) => (full ? weekdayFull : weekdayNames)[Number(weekday)],
    );

    const sectionLabel = state.trafficSection === "site" ? "main-site" : "game";
    if (elements.hourDescription) {
      elements.hourDescription.textContent =
        `${numberFormatter.format(hourlyTotal)} tracked ${sectionLabel} browser-hour visits`;
    }
    if (elements.weekdayDescription) {
      elements.weekdayDescription.textContent =
        `${numberFormatter.format(weekdayTotal)} tracked ${sectionLabel} browser-day visits`;
    }
    if (elements.timeNote) {
      elements.timeNote.textContent =
        "Labels show counts; bar height shows each bucket's share of tracked visits in America/Chicago. " +
        "A browser counts at most once per hour, so refreshes do not inflate a bucket.";
    }
  }

  const countryLabel = (code) => {
    if (!code) return null;
    try {
      return countryNames?.of(code) || code;
    } catch {
      return code;
    }
  };

  const locationLabel = (location) => {
    const country = countryLabel(location.countryCode);
    return [location.city, location.region, country].filter(Boolean).join(", ") || "Unknown location";
  };

  function renderGeography() {
    if (!state.payload) return;
    const locations = state.payload.locations?.[state.trafficSection] ?? [];
    const sectionLabel = state.trafficSection === "site" ? "main-site" : "game";

    if (elements.mapPoints) {
      elements.mapPoints.replaceChildren();
      const maxCount = Math.max(1, ...locations.map((location) => Number(location.count ?? 0)));
      locations.forEach((location) => {
        const latitude = Number(location.latitude);
        const longitude = Number(location.longitude);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
        const x = ((longitude + 180) / 360) * 1000;
        const y = ((90 - latitude) / 180) * 500;
        const count = Number(location.count ?? 0);
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", String(x));
        circle.setAttribute("cy", String(y));
        circle.setAttribute("r", String(5 + 12 * Math.sqrt(count / maxCount)));
        circle.setAttribute("class", "map-visitor-point");
        const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
        title.textContent =
          `${locationLabel(location)} • ${numberFormatter.format(count)} unique ${sectionLabel} browser${count === 1 ? "" : "s"}`;
        circle.append(title);
        elements.mapPoints.append(circle);
      });
    }

    if (elements.map) {
      const total = locations.reduce((sum, location) => sum + Number(location.count ?? 0), 0);
      elements.map.setAttribute(
        "aria-label",
        `Approximate map of ${numberFormatter.format(total)} ${sectionLabel} browser locations. Exact ranked locations follow.`,
      );
    }

    if (elements.locationList) {
      elements.locationList.replaceChildren();
      if (!locations.length) {
        const empty = document.createElement("li");
        empty.className = "location-empty";
        empty.textContent = "No geography has been recorded for this section yet.";
        elements.locationList.append(empty);
      } else {
        const limit = state.locationsExpanded ? 20 : 5;
        locations.slice(0, limit).forEach((location, index) => {
          const item = document.createElement("li");
          const rank = document.createElement("span");
          rank.className = "location-rank";
          rank.textContent = String(index + 1).padStart(2, "0");
          const name = document.createElement("span");
          name.className = "location-name";
          name.textContent = locationLabel(location);
          const count = document.createElement("strong");
          count.textContent = numberFormatter.format(location.count ?? 0);
          item.append(rank, name, count);
          elements.locationList.append(item);
        });
      }
    }

    if (elements.locationToggle) {
      elements.locationToggle.hidden = locations.length <= 5;
      elements.locationToggle.setAttribute("aria-expanded", String(state.locationsExpanded));
      elements.locationToggle.textContent = state.locationsExpanded
        ? "SHOW TOP 5"
        : `VIEW ALL ${Math.min(locations.length, 20)} LOCATIONS`;
    }

    if (elements.locationNote) {
      elements.locationNote.textContent =
        `Location tracking began ${formatTrackingDate(state.payload.tracking?.trafficContextStartedAt)}. ` +
        "Locations use approximate Cloudflare IP-geolocation; no IP addresses are stored.";
    }
  }

  function renderModeSplit(game) {
    const normal = Number(game.modeStarts?.NORMAL ?? 0);
    const hardcore = Number(game.modeStarts?.HARDCORE ?? 0);
    const total = normal + hardcore;
    const normalPercent = total > 0 ? (normal / total) * 100 : 0;
    const hardcorePercent = total > 0 ? (hardcore / total) * 100 : 0;
    if (elements.modeNormal) elements.modeNormal.style.width = `${normalPercent}%`;
    if (elements.modeHardcore) elements.modeHardcore.style.width = `${hardcorePercent}%`;
    if (elements.modeNormalLabel) {
      elements.modeNormalLabel.textContent =
        `${numberFormatter.format(normal)} • ${formatPercent(normalPercent)}`;
    }
    if (elements.modeHardcoreLabel) {
      elements.modeHardcoreLabel.textContent =
        `${numberFormatter.format(hardcore)} • ${formatPercent(hardcorePercent)}`;
    }
  }

  function metricRow(label, value) {
    const row = document.createElement("div");
    const term = document.createElement("dt");
    const description = document.createElement("dd");
    term.textContent = label;
    description.textContent = value;
    row.append(term, description);
    return row;
  }

  function totalsGroup(title, rows) {
    const section = document.createElement("section");
    section.className = "totals-group";
    const heading = document.createElement("h3");
    heading.textContent = title;
    const list = document.createElement("dl");
    list.className = "metric-list";
    rows.forEach(([label, value]) => list.append(metricRow(label, value)));
    section.append(heading, list);
    return section;
  }

  function renderGameTotals(game) {
    if (!elements.totalsGroups) return;
    const totals = game.totals ?? {};
    elements.totalsGroups.replaceChildren(
      totalsGroup("RUNS & POPCORN", [
        ["TOTAL PLAY TIME", formatDuration(game.totalTimeSeconds)],
        ["POPCORN COLLECTED", numberFormatter.format(totals.popcornCollected ?? 0)],
        ["POPCORN MISSED", numberFormatter.format(totals.popcornMissed ?? 0)],
      ]),
      totalsGroup("COMBAT", [
        ["GARBAGE DESTROYED", numberFormatter.format(totals.garbageDestroyed ?? 0)],
        ["DESTROYED BY STARS", numberFormatter.format(totals.destroyedByStars ?? 0)],
        ["DESTROYED BY BLASTS", numberFormatter.format(totals.destroyedByBlasts ?? 0)],
        ["STARS FIRED", numberFormatter.format(totals.starsFired ?? 0)],
        ["STARS HIT", numberFormatter.format(totals.starsHit ?? 0)],
        ["STAR ACCURACY", formatPercent(game.starAccuracy)],
        ["HITS TAKEN", numberFormatter.format(totals.hitsTaken ?? 0)],
        ["SHIELD BLOCKS", numberFormatter.format(totals.shieldBlocks ?? 0)],
        ["BLASTS USED", numberFormatter.format(totals.blastsUsed ?? 0)],
      ]),
      totalsGroup("POWER-UPS", [
        ["SHIELD", numberFormatter.format(totals.powerups?.shield ?? 0)],
        ["SUPER SPEED", numberFormatter.format(totals.powerups?.speed ?? 0)],
        ["SUPER STARS", numberFormatter.format(totals.powerups?.super ?? 0)],
        ["MAGNET", numberFormatter.format(totals.powerups?.magnet ?? 0)],
      ]),
    );
  }

  function renderGame() {
    if (!state.payload) return;
    const game = state.payload.game ?? {};
    const starts = Number(game.starts ?? 0);
    const completed = Number(game.completed ?? 0);
    const gameVisitors = Number(game.gameVisitors ?? 0);
    const returning = Number(game.returningPlayers ?? 0);
    const averageRunsPerPlayer = Number(game.averageRunsPerPlayer ?? 0);

    setText(summaryIds.starts, numberFormatter.format(starts));
    setText(summaryIds.completed, numberFormatter.format(completed));
    setText(summaryIds.visitors, numberFormatter.format(gameVisitors));
    setText(summaryIds.players, numberFormatter.format(game.uniquePlayers ?? 0));
    setText(summaryIds.returning, numberFormatter.format(returning));
    setText(summaryIds.returnRate, formatPercent(game.returningRate));
    setText(summaryIds.completion, formatPercent(game.completionRate));
    setText(summaryIds.averageScore, numberFormatter.format(Math.round(game.averageScore ?? 0)));
    setText(summaryIds.medianScore, numberFormatter.format(Math.round(game.medianScore ?? 0)));
    setText(summaryIds.highScore, numberFormatter.format(game.highScore ?? 0));
    setText(summaryIds.averageTime, formatDuration(game.averageTimeSeconds));
    setText(summaryIds.averageStreak, oneDecimalFormatter.format(game.averageLongestStreak ?? 0));
    setText(summaryIds.highStreak, numberFormatter.format(game.highStreak ?? 0));

    setText("game-starts-detail", `${numberFormatter.format(game.startsToday ?? 0)} today`);
    setText("game-completed-detail", `${numberFormatter.format(game.completedToday ?? 0)} today`);
    setText(
      "game-completion-detail",
      `${numberFormatter.format(completed)} of ${numberFormatter.format(starts)} started runs completed`,
    );
    setText(
      "game-players-detail",
      `${oneDecimalFormatter.format(averageRunsPerPlayer)} completed ${averageRunsPerPlayer === 1 ? "run" : "runs"} per finishing player`,
    );
    setText(
      "game-returning-detail",
      `${numberFormatter.format(returning)} of ${numberFormatter.format(gameVisitors)} game-page visitors`,
    );

    renderModeSplit(game);
    renderGameTotals(game);
    elements.gameOverview?.setAttribute("aria-busy", "false");

    if (elements.gameTrackingNote) {
      elements.gameTrackingNote.textContent =
        `Game-run tracking began ${formatTrackingDate(state.payload.tracking?.gameStatsStartedAt)}. ` +
        "Earlier scores and locally stored personal records are not retroactively uploaded.";
    }
  }

  function render() {
    renderTimePatterns();
    renderGeography();
    renderGame();
  }

  async function refresh() {
    if (state.loading) return;
    state.loading = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(endpoint, { cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error(`Detail request failed: ${response.status}`);
      state.payload = await response.json();
      render();
    } catch (error) {
      if (error?.name !== "AbortError") {
        console.error("Unable to load Movie Master details", error);
      }
      if (elements.timeNote) elements.timeNote.textContent = "Traffic patterns are temporarily unavailable.";
      if (elements.gameTrackingNote) elements.gameTrackingNote.textContent = "Game statistics are temporarily unavailable.";
      if (elements.locationNote) elements.locationNote.textContent = "Geography is temporarily unavailable.";
    } finally {
      window.clearTimeout(timeout);
      state.loading = false;
    }
  }

  const VALID_SECTIONS = new Set(["site", "game"]);
  document.querySelectorAll("[data-traffic-section]").forEach((button) => {
    button.addEventListener("click", () => {
      const section = button.dataset.trafficSection;
      if (!VALID_SECTIONS.has(section)) return;
      state.trafficSection = section;
      state.locationsExpanded = false;
      document.querySelectorAll("[data-traffic-section]").forEach((entry) => {
        const active = entry === button;
        entry.classList.toggle("is-active", active);
        entry.setAttribute("aria-pressed", String(active));
      });
      renderTimePatterns();
      renderGeography();
    });
  });

  elements.locationToggle?.addEventListener("click", () => {
    state.locationsExpanded = !state.locationsExpanded;
    renderGeography();
  });

  window.addEventListener("analytics:refresh", refresh);
  refresh();
})();
