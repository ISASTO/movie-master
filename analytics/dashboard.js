(() => {
  "use strict";

  const API_BASE = "https://movie-master-visitor-counter.isasto.workers.dev";
  const SVG_NS = "http://www.w3.org/2000/svg";
  const VALID_VIEWS = new Set(["daily", "weekly", "monthly"]);
  const SERIES = ["site", "game", "merch"];

  const readPreference = (key, fallback) => {
    try {
      const value = window.localStorage.getItem(key);
      return value === null ? fallback : value;
    } catch {
      return fallback;
    }
  };

  const writePreference = (key, value) => {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Preferences are optional.
    }
  };

  const requestedView = new URLSearchParams(window.location.search).get("view");
  const storedView = readPreference("movie-master-analytics-view", "daily");
  const initialView = VALID_VIEWS.has(requestedView)
    ? requestedView
    : VALID_VIEWS.has(storedView)
      ? storedView
      : "daily";

  const state = {
    view: initialView,
    payload: null,
    dailyComparison: null,
    showSite: readPreference("movie-master-series-site", "true") !== "false",
    showGame: readPreference("movie-master-series-game", "true") !== "false",
    showMerch: readPreference("movie-master-series-merch", "true") !== "false",
    loading: false,
    lastChartWidth: 0,
  };

  const viewDescriptions = {
    daily: "Last 7 days",
    weekly: "Four consecutive 7-day periods",
    monthly: "Last 12 calendar months",
  };

  const seriesLabels = {
    site: "Main site",
    game: "Game",
    merch: "Store",
  };

  const elements = {
    chart: document.querySelector("#traffic-chart"),
    chartWrap: document.querySelector("#chart-wrap"),
    chartMessage: document.querySelector("#chart-message"),
    dataBody: document.querySelector("#data-body"),
    viewDescription: document.querySelector("#view-description"),
    trackingNote: document.querySelector("#tracking-note"),
    updatedStatus: document.querySelector("#updated-status"),
    refreshButton: document.querySelector("#refresh-button"),
    refreshLabel: document.querySelector(".refresh-label"),
    toggleSite: document.querySelector("#toggle-site"),
    toggleGame: document.querySelector("#toggle-game"),
    toggleMerch: document.querySelector("#toggle-merch"),
    trafficOverview: document.querySelector("#traffic-overview"),
    siteTotal: document.querySelector("#summary-site-total"),
    gameTotal: document.querySelector("#summary-game-total"),
    siteToday: document.querySelector("#summary-site-today"),
    gameToday: document.querySelector("#summary-game-today"),
    siteTodayDetail: document.querySelector("#summary-site-today-detail"),
    gameTodayDetail: document.querySelector("#summary-game-today-detail"),
    discovered: document.querySelector("#summary-discovered"),
    rateDetail: document.querySelector("#summary-rate-detail"),
  };

  const numberFormatter = new Intl.NumberFormat("en-US");
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const monthFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago",
  });

  function parseDateKey(key) {
    return new Date(`${key}T12:00:00Z`);
  }

  function formatTrackingDate(key) {
    return key ? dateFormatter.format(parseDateKey(key)) : "not yet";
  }

  function formatPeriod(row, view, compact = false) {
    const start = parseDateKey(row.start);
    const end = parseDateKey(row.end);

    if (view === "daily") return shortDateFormatter.format(start);
    if (view === "monthly") {
      return compact
        ? start.toLocaleString("en-US", { month: "short", timeZone: "UTC" })
        : monthFormatter.format(start);
    }

    const startMonth = start.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
    const endMonth = end.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
    const startDay = start.getUTCDate();
    const endDay = end.getUTCDate();
    const sameMonth = start.getUTCMonth() === end.getUTCMonth();
    const sameYear = start.getUTCFullYear() === end.getUTCFullYear();

    if (sameMonth && sameYear) return `${startMonth} ${startDay}–${endDay}`;
    if (sameYear) return `${startMonth} ${startDay}–${endMonth} ${endDay}`;
    return `${startMonth} ${startDay}, ${start.getUTCFullYear()}–${endMonth} ${endDay}, ${end.getUTCFullYear()}`;
  }

  function isAvailable(row, section) {
    const trackingStart = state.payload?.trackingStarted?.[section];
    return Boolean(trackingStart && row.end >= trackingStart);
  }

  function valueFor(row, section) {
    return isAvailable(row, section) ? Number(row[section] ?? 0) : null;
  }

  function availableRows(sections = SERIES) {
    return (state.payload?.data ?? []).filter((row) =>
      sections.some((section) => isAvailable(row, section)),
    );
  }

  function svgElement(name, attributes = {}) {
    const element = document.createElementNS(SVG_NS, name);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
    return element;
  }

  function niceMax(value) {
    if (value <= 5) return 5;
    if (value <= 10) return 10;
    const magnitude = 10 ** Math.floor(Math.log10(value));
    const normalized = value / magnitude;
    const factor = normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
    return factor * magnitude;
  }

  function comparisonForPayload(payload, section) {
    const trackingStart = payload?.trackingStarted?.[section];
    const rows = (payload?.data ?? []).filter((row) => trackingStart && row.end >= trackingStart);
    if (!rows.length) return null;
    const latest = rows.at(-1);
    const previous = rows.length > 1 ? rows.at(-2) : null;
    return {
      current: Number(latest[section] ?? 0),
      previous: previous ? Number(previous[section] ?? 0) : null,
    };
  }

  function captureDailyComparison(payload) {
    state.dailyComparison = {
      site: comparisonForPayload(payload, "site"),
      game: comparisonForPayload(payload, "game"),
    };
  }

  function comparisonText(comparison) {
    if (!comparison || comparison.previous === null) return "First tracked day";
    const delta = Number(comparison.current) - Number(comparison.previous);
    if (delta === 0) return "Same as the previous tracked day";
    return `${delta > 0 ? "↑" : "↓"} ${numberFormatter.format(Math.abs(delta))} ${delta > 0 ? "more" : "fewer"} than the previous tracked day`;
  }

  function renderSummary() {
    if (!state.payload) return;
    const summary = state.payload.summary ?? {};
    const siteTotal = Number(summary.siteTotal ?? 0);
    const discovered = Number(summary.discovered ?? 0);

    elements.siteTotal.textContent = numberFormatter.format(siteTotal);
    elements.gameTotal.textContent = numberFormatter.format(summary.gameTotal ?? 0);
    elements.siteToday.textContent = numberFormatter.format(summary.todaySite ?? 0);
    elements.gameToday.textContent = numberFormatter.format(summary.todayGame ?? 0);
    elements.discovered.textContent = numberFormatter.format(discovered);
    elements.rateDetail.textContent =
      `${Number(summary.discoveryRate ?? 0).toFixed(1)}% of ${numberFormatter.format(siteTotal)} main-site visitors`;

    if (state.view === "daily") {
      captureDailyComparison(state.payload);
    }
    elements.siteTodayDetail.textContent = state.dailyComparison
      ? comparisonText(state.dailyComparison.site)
      : "Daily comparison unavailable";
    elements.gameTodayDetail.textContent = state.dailyComparison
      ? comparisonText(state.dailyComparison.game)
      : "Daily comparison unavailable";
    elements.trafficOverview?.setAttribute("aria-busy", "false");
  }

  function renderTrackingNote() {
    if (!state.payload || !elements.trackingNote) return;
    const siteStart = formatTrackingDate(state.payload.trackingStarted.site);
    const gameStart = formatTrackingDate(state.payload.trackingStarted.game);
    const merchStart = formatTrackingDate(state.payload.trackingStarted.merch);
    elements.trackingNote.textContent =
      `Traffic tracking began ${siteStart} for the main site, ${gameStart} for the game, and ${merchStart} for store clicks. ` +
      "Periods containing a tracking start date are partial.";
  }

  function renderTable() {
    if (!state.payload) return;
    const rows = availableRows();
    elements.dataBody.replaceChildren();

    if (!rows.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 4;
      td.textContent = "No tracked visitor data is available for this period.";
      tr.append(td);
      elements.dataBody.append(tr);
      return;
    }

    rows.forEach((row) => {
      const tr = document.createElement("tr");
      const period = document.createElement("th");
      const site = document.createElement("td");
      const game = document.createElement("td");
      const merch = document.createElement("td");
      period.scope = "row";
      period.textContent = formatPeriod(row, state.view);

      const siteValue = valueFor(row, "site");
      const gameValue = valueFor(row, "game");
      const merchValue = valueFor(row, "merch");
      site.textContent = siteValue === null ? "—" : numberFormatter.format(siteValue);
      game.textContent = gameValue === null ? "—" : numberFormatter.format(gameValue);
      merch.textContent = merchValue === null ? "—" : numberFormatter.format(merchValue);
      if (siteValue === null) site.className = "data-unavailable";
      if (gameValue === null) game.className = "data-unavailable";
      if (merchValue === null) merch.className = "data-unavailable";

      tr.append(period, site, game, merch);
      elements.dataBody.append(tr);
    });
  }

  function renderChart() {
    if (!state.payload || !elements.chart || !elements.chartWrap) return;
    elements.chart.replaceChildren();
    elements.chartMessage.hidden = true;

    const visibleSeries = [];
    if (state.showSite) visibleSeries.push("site");
    if (state.showGame) visibleSeries.push("game");
    if (state.showMerch) visibleSeries.push("merch");

    const svgTitle = svgElement("title", { id: "chart-title" });
    svgTitle.textContent = "Movie Master visitor traffic";
    const svgDescription = svgElement("desc", { id: "chart-description" });
    elements.chart.append(svgTitle, svgDescription);

    if (!visibleSeries.length) {
      svgDescription.textContent = "No chart series are currently selected.";
      elements.chartMessage.textContent = "Turn on at least one series to display the graph.";
      elements.chartMessage.hidden = false;
      return;
    }

    const data = availableRows(visibleSeries);
    const visibleNames = visibleSeries.map((series) => seriesLabels[series].toLowerCase());
    const descriptionNames =
      visibleNames.length <= 1
        ? visibleNames.join("")
        : `${visibleNames.slice(0, -1).join(", ")} and ${visibleNames.at(-1)}`;
    svgDescription.textContent =
      `Unique ${descriptionNames} visitors for ${viewDescriptions[state.view].toLowerCase()}. Exact values follow in the visitor data table.`;

    const availableValues = data.flatMap((row) =>
      visibleSeries
        .map((section) => valueFor(row, section))
        .filter((value) => value !== null),
    );

    if (!availableValues.length) {
      elements.chartMessage.textContent = "No tracked data is available for this view yet.";
      elements.chartMessage.hidden = false;
      return;
    }

    const measuredWidth = Math.floor(elements.chartWrap.getBoundingClientRect().width);
    const compact = measuredWidth > 0 && measuredWidth < 640;
    const width = compact ? Math.max(280, measuredWidth) : 960;
    const height = compact ? 320 : 430;
    const margin = compact
      ? { top: 30, right: 14, bottom: 58, left: 44 }
      : { top: 32, right: 30, bottom: 72, left: 68 };
    elements.chart.setAttribute("viewBox", `0 0 ${width} ${height}`);

    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const yMax = niceMax(Math.max(...availableValues, 0));
    const tickCount = compact ? 4 : 5;
    const labelStep = compact && data.length > 6 ? Math.ceil(data.length / 6) : 1;

    const xFor = (index) =>
      data.length === 1
        ? margin.left + plotWidth / 2
        : margin.left + (index / (data.length - 1)) * plotWidth;
    const yFor = (value) => margin.top + plotHeight - (value / yMax) * plotHeight;

    for (let tick = 0; tick <= tickCount; tick += 1) {
      const value = (yMax / tickCount) * tick;
      const y = yFor(value);
      elements.chart.append(svgElement("line", {
        x1: margin.left,
        y1: y,
        x2: width - margin.right,
        y2: y,
        class: "chart-grid",
      }));
      const label = svgElement("text", {
        x: margin.left - 9,
        y: y + 5,
        "text-anchor": "end",
        class: "chart-axis-text",
      });
      label.textContent = numberFormatter.format(Math.round(value));
      elements.chart.append(label);
    }

    data.forEach((row, index) => {
      const shouldLabel = index % labelStep === 0 || index === data.length - 1;
      if (!shouldLabel) return;
      const label = svgElement("text", {
        x: xFor(index),
        y: height - (compact ? 23 : 33),
        "text-anchor": "middle",
        class: "chart-axis-text",
      });
      label.textContent = formatPeriod(row, state.view, compact);
      elements.chart.append(label);
    });

    visibleSeries.forEach((section) => {
      const points = data.map((row, index) => ({
        x: xFor(index),
        value: valueFor(row, section),
        label: formatPeriod(row, state.view),
      }));

      let segment = [];
      const flushSegment = () => {
        if (segment.length >= 2) {
          const path = svgElement("path", {
            d: segment
              .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${yFor(point.value)}`)
              .join(" "),
            class: `chart-line-${section}`,
          });
          elements.chart.append(path);
        }
        segment = [];
      };

      points.forEach((point) => {
        if (point.value === null) {
          flushSegment();
          return;
        }
        segment.push(point);
      });
      flushSegment();

      points.forEach((point) => {
        if (point.value === null) return;
        const circle = svgElement("circle", {
          cx: point.x,
          cy: yFor(point.value),
          r: compact ? 5 : 6,
          class: `chart-point-${section}`,
        });
        const title = svgElement("title");
        title.textContent =
          `${seriesLabels[section]}: ${numberFormatter.format(point.value)} unique visitors • ${point.label}`;
        circle.append(title);
        elements.chart.append(circle);

        if (data.length <= 7 && (!compact || visibleSeries.length <= 2)) {
          const valueLabel = svgElement("text", {
            x: point.x,
            y: yFor(point.value) - 13,
            "text-anchor": "middle",
            class: "chart-value-text",
          });
          valueLabel.textContent = numberFormatter.format(point.value);
          elements.chart.append(valueLabel);
        }
      });
    });
  }

  function render() {
    const rows = availableRows();
    const omitted = Math.max(0, (state.payload?.data?.length ?? 0) - rows.length);
    elements.viewDescription.textContent =
      `${viewDescriptions[state.view]}${omitted > 0 ? " • unavailable periods hidden" : ""}`;
    renderSummary();
    renderTrackingNote();
    renderTable();
    renderChart();
  }

  function setViewControls(view) {
    document.querySelectorAll("[data-view]").forEach((button) => {
      const active = button.dataset.view === view;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function setManualBusy(busy) {
    if (!elements.refreshButton || !elements.refreshLabel) return;
    elements.refreshButton.disabled = busy;
    elements.refreshButton.setAttribute("aria-busy", String(busy));
    elements.refreshLabel.textContent = busy ? "REFRESHING…" : "REFRESH";
  }

  async function loadView(view, { quiet = false } = {}) {
    if (state.loading || !VALID_VIEWS.has(view)) return;
    state.loading = true;
    if (!quiet) {
      elements.updatedStatus.textContent = "REFRESHING…";
      setManualBusy(true);
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);

    try {
      const primaryResponse = await fetch(`${API_BASE}/analytics?view=${encodeURIComponent(view)}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!primaryResponse.ok) throw new Error(`Analytics request failed: ${primaryResponse.status}`);
      const payload = await primaryResponse.json();

      payload.trackingStarted = { ...(payload.trackingStarted ?? {}), merch: null };
      payload.data = (payload.data ?? []).map((row) => ({ ...row, merch: 0 }));

      try {
        const merchResponse = await fetch(`${API_BASE}/store-traffic?view=${encodeURIComponent(view)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!merchResponse.ok) throw new Error(`Store traffic request failed: ${merchResponse.status}`);
        const merchPayload = await merchResponse.json();
        const merchByPeriod = new Map(
          (merchPayload.data ?? []).map((row) => [`${row.start}|${row.end}`, Number(row.merch ?? 0)]),
        );
        payload.trackingStarted.merch = merchPayload.trackingStarted ?? null;
        payload.data = payload.data.map((row) => ({
          ...row,
          merch: merchByPeriod.get(`${row.start}|${row.end}`) ?? 0,
        }));
      } catch (merchError) {
        if (merchError?.name !== "AbortError") {
          console.error("Unable to load store traffic series", merchError);
        }
      }

      state.view = payload.view;
      state.payload = payload;
      if (state.view !== "daily" && !state.dailyComparison) {
        try {
          const dailyResponse = await fetch(`${API_BASE}/analytics?view=daily`, {
            cache: "no-store",
            signal: controller.signal,
          });
          if (dailyResponse.ok) captureDailyComparison(await dailyResponse.json());
        } catch {
          // The overview remains useful without a day-over-day comparison.
        }
      }
      setViewControls(state.view);
      writePreference("movie-master-analytics-view", state.view);
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set("view", state.view);
      window.history.replaceState(null, "", nextUrl);
      render();
      elements.updatedStatus.textContent = `UPDATED ${timeFormatter.format(new Date())}`;
    } catch (error) {
      if (error?.name !== "AbortError") {
        console.error("Unable to load Movie Master analytics", error);
      }
      setViewControls(state.view);
      elements.updatedStatus.textContent = "ANALYTICS UNAVAILABLE";
      elements.chartMessage.textContent = "The analytics service could not be reached. Try refreshing in a moment.";
      elements.chartMessage.hidden = false;
    } finally {
      window.clearTimeout(timeout);
      state.loading = false;
      if (!quiet) setManualBusy(false);
    }
  }

  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextView = button.dataset.view;
      if (state.loading || !VALID_VIEWS.has(nextView) || nextView === state.view) return;
      setViewControls(nextView);
      loadView(nextView);
    });
  });

  const seriesBindings = [
    ["site", elements.toggleSite, "showSite"],
    ["game", elements.toggleGame, "showGame"],
    ["merch", elements.toggleMerch, "showMerch"],
  ];
  seriesBindings.forEach(([name, checkbox, stateKey]) => {
    if (!checkbox) return;
    checkbox.checked = state[stateKey];
    checkbox.addEventListener("change", () => {
      state[stateKey] = checkbox.checked;
      writePreference(`movie-master-series-${name}`, String(checkbox.checked));
      renderChart();
    });
  });

  window.addEventListener("analytics:refresh", (event) => {
    loadView(state.view, { quiet: Boolean(event.detail?.quiet) });
  });

  if ("ResizeObserver" in window && elements.chartWrap) {
    const chartResizeObserver = new ResizeObserver((entries) => {
      const width = Math.round(entries[0]?.contentRect?.width ?? 0);
      if (!state.payload || Math.abs(width - state.lastChartWidth) < 2) return;
      state.lastChartWidth = width;
      window.requestAnimationFrame(renderChart);
    });
    chartResizeObserver.observe(elements.chartWrap);
  }

  setViewControls(initialView);
  loadView(initialView);
})();
