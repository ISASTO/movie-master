(() => {
  "use strict";

  const API_BASE = "https://movie-master-visitor-counter.isasto.workers.dev";
  const SVG_NS = "http://www.w3.org/2000/svg";

  const state = {
    view: "daily",
    payload: null,
    showSite: true,
    showGame: true,
    showMerch: true,
    loading: false,
  };

  const viewDescriptions = {
    daily: "Last 7 days",
    weekly: "Four consecutive 7-day periods ending today",
    monthly: "Last 12 calendar months",
  };

  const seriesLabels = {
    site: "Main site",
    game: "Game",
    merch: "Merch store",
  };

  const elements = {
    chart: document.querySelector("#traffic-chart"),
    chartMessage: document.querySelector("#chart-message"),
    dataBody: document.querySelector("#data-body"),
    viewDescription: document.querySelector("#view-description"),
    trackingNote: document.querySelector("#tracking-note"),
    updatedStatus: document.querySelector("#updated-status"),
    refreshButton: document.querySelector("#refresh-button"),
    toggleSite: document.querySelector("#toggle-site"),
    toggleGame: document.querySelector("#toggle-game"),
    toggleMerch: document.querySelector("#toggle-merch"),
    siteTotal: document.querySelector("#summary-site-total"),
    gameTotal: document.querySelector("#summary-game-total"),
    siteToday: document.querySelector("#summary-site-today"),
    gameToday: document.querySelector("#summary-game-today"),
    discovered: document.querySelector("#summary-discovered"),
    rate: document.querySelector("#summary-rate"),
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
  });

  function parseDateKey(key) {
    return new Date(`${key}T12:00:00Z`);
  }

  function formatTrackingDate(key) {
    return key ? dateFormatter.format(parseDateKey(key)) : "not yet";
  }

  function formatPeriod(row, view) {
    const start = parseDateKey(row.start);
    const end = parseDateKey(row.end);

    if (view === "daily") return shortDateFormatter.format(start);
    if (view === "monthly") return monthFormatter.format(start);

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

  function renderSummary() {
    if (!state.payload) return;
    const summary = state.payload.summary;
    const siteTotal = Number(summary.siteTotal ?? 0);
    const discovered = Number(summary.discovered ?? 0);

    elements.siteTotal.textContent = numberFormatter.format(siteTotal);
    elements.gameTotal.textContent = numberFormatter.format(summary.gameTotal ?? 0);
    elements.siteToday.textContent = numberFormatter.format(summary.todaySite ?? 0);
    elements.gameToday.textContent = numberFormatter.format(summary.todayGame ?? 0);
    elements.discovered.textContent = numberFormatter.format(discovered);
    elements.rate.textContent = `${Number(summary.discoveryRate ?? 0).toFixed(1)}%`;
    elements.rateDetail.textContent = `${numberFormatter.format(discovered)} of ${numberFormatter.format(siteTotal)} main-site visitors have visited the game`;
  }

  function renderTrackingNote() {
    if (!state.payload) return;
    const siteStart = formatTrackingDate(state.payload.trackingStarted.site);
    const gameStart = formatTrackingDate(state.payload.trackingStarted.game);
    const merchStart = formatTrackingDate(state.payload.trackingStarted.merch);
    elements.trackingNote.textContent =
      `Main-site tracking began ${siteStart}. Game tracking began ${gameStart}. Merch click tracking began ${merchStart}. ` +
      "Earlier periods are unavailable; a period containing a tracking start date is partial.";
  }

  function renderTable() {
    if (!state.payload) return;
    elements.dataBody.replaceChildren();

    state.payload.data.forEach((row) => {
      const tr = document.createElement("tr");
      const period = document.createElement("td");
      const site = document.createElement("td");
      const game = document.createElement("td");
      const merch = document.createElement("td");
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
    if (!state.payload || !elements.chart) return;
    elements.chart.replaceChildren();
    elements.chartMessage.hidden = true;

    const svgTitle = svgElement("title", { id: "chart-title" });
    svgTitle.textContent = "Movie Master visitor traffic";
    const svgDescription = svgElement("desc", { id: "chart-description" });
    elements.chart.append(svgTitle, svgDescription);

    const data = state.payload.data;
    const visibleSeries = [];
    if (state.showSite) visibleSeries.push("site");
    if (state.showGame) visibleSeries.push("game");
    if (state.showMerch) visibleSeries.push("merch");

    const visibleNames = visibleSeries.map((series) => seriesLabels[series].toLowerCase());
    const descriptionNames =
      visibleNames.length <= 1
        ? visibleNames.join("")
        : `${visibleNames.slice(0, -1).join(", ")} and ${visibleNames.at(-1)}`;
    svgDescription.textContent =
      `Unique ${descriptionNames} visitors for ${viewDescriptions[state.view].toLowerCase()}.`;

    if (!visibleSeries.length) {
      elements.chartMessage.textContent = "Turn on at least one series to display the graph.";
      elements.chartMessage.hidden = false;
      return;
    }

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

    const width = 960;
    const height = 430;
    const margin = { top: 32, right: 30, bottom: 72, left: 68 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const yMax = niceMax(Math.max(...availableValues, 0));
    const tickCount = 5;

    const xFor = (index) =>
      data.length === 1
        ? margin.left + plotWidth / 2
        : margin.left + (index / (data.length - 1)) * plotWidth;
    const yFor = (value) => margin.top + plotHeight - (value / yMax) * plotHeight;

    for (let tick = 0; tick <= tickCount; tick += 1) {
      const value = (yMax / tickCount) * tick;
      const y = yFor(value);
      elements.chart.append(
        svgElement("line", {
          x1: margin.left,
          y1: y,
          x2: width - margin.right,
          y2: y,
          class: "chart-grid",
        }),
      );
      const label = svgElement("text", {
        x: margin.left - 12,
        y: y + 5,
        "text-anchor": "end",
        class: "chart-axis-text",
      });
      label.textContent = numberFormatter.format(Math.round(value));
      elements.chart.append(label);
    }

    data.forEach((row, index) => {
      const label = svgElement("text", {
        x: xFor(index),
        y: height - 33,
        "text-anchor": "middle",
        class: "chart-axis-text",
      });
      label.textContent = formatPeriod(row, state.view);
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
          r: 6,
          class: `chart-point-${section}`,
          tabindex: 0,
        });
        const title = svgElement("title");
        title.textContent = `${seriesLabels[section]}: ${numberFormatter.format(point.value)} unique ${section === "merch" ? "clickers" : "visitors"} • ${point.label}`;
        circle.append(title);
        elements.chart.append(circle);

        if (data.length <= 7) {
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
    elements.viewDescription.textContent = viewDescriptions[state.view];
    renderSummary();
    renderTrackingNote();
    renderTable();
    renderChart();
  }

  async function loadView(view, { quiet = false } = {}) {
    if (state.loading) return;
    state.loading = true;
    if (!quiet) elements.updatedStatus.textContent = "LOADING…";
    elements.refreshButton.disabled = true;

    try {
      const primaryResponse = await fetch(`${API_BASE}/analytics?view=${encodeURIComponent(view)}`, {
        cache: "no-store",
      });
      if (!primaryResponse.ok) throw new Error(`Analytics request failed: ${primaryResponse.status}`);
      const payload = await primaryResponse.json();

      payload.trackingStarted = { ...(payload.trackingStarted ?? {}), merch: null };
      payload.data = (payload.data ?? []).map((row) => ({ ...row, merch: 0 }));

      try {
        const merchResponse = await fetch(`${API_BASE}/store-traffic?view=${encodeURIComponent(view)}`, {
          cache: "no-store",
        });
        if (!merchResponse.ok) throw new Error(`Merch traffic request failed: ${merchResponse.status}`);
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
        console.error("Unable to load merch traffic series", merchError);
      }

      state.view = payload.view;
      state.payload = payload;
      render();
      elements.updatedStatus.textContent = `UPDATED ${timeFormatter.format(new Date())}`;
    } catch (error) {
      console.error("Unable to load Movie Master analytics", error);
      elements.updatedStatus.textContent = "ANALYTICS UNAVAILABLE";
      elements.chartMessage.textContent = "The analytics service could not be reached. Try refreshing in a moment.";
      elements.chartMessage.hidden = false;
    } finally {
      state.loading = false;
      elements.refreshButton.disabled = false;
    }
  }

  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextView = button.dataset.view;
      if (!nextView || nextView === state.view) return;
      document.querySelectorAll("[data-view]").forEach((entry) => {
        const active = entry === button;
        entry.classList.toggle("is-active", active);
        entry.setAttribute("aria-pressed", String(active));
      });
      loadView(nextView);
    });
  });

  elements.refreshButton.addEventListener("click", () => loadView(state.view));

  elements.toggleSite.addEventListener("change", () => {
    state.showSite = elements.toggleSite.checked;
    renderChart();
  });

  elements.toggleGame.addEventListener("change", () => {
    state.showGame = elements.toggleGame.checked;
    renderChart();
  });

  elements.toggleMerch.addEventListener("change", () => {
    state.showMerch = elements.toggleMerch.checked;
    renderChart();
  });

  window.setInterval(() => {
    if (!document.hidden && document.hasFocus()) loadView(state.view, { quiet: true });
  }, 5 * 60 * 1000);

  loadView("daily");
})();
