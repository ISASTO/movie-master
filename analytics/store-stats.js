(() => {
  "use strict";

  const endpoint = "https://movie-master-visitor-counter.isasto.workers.dev/store-stats";
  const numberFormatter = new Intl.NumberFormat("en-US");
  const percentFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
  const grid = document.querySelector(".summary-grid");
  if (!grid) return;

  const makeCard = (label, id, detailId) => {
    const card = document.createElement("article");
    card.className = "summary-card";

    const name = document.createElement("span");
    name.textContent = label;
    const value = document.createElement("strong");
    value.id = id;
    value.textContent = "—";
    const detail = document.createElement("small");
    detail.id = detailId;
    detail.textContent = "—";

    card.append(name, value, detail);
    grid.append(card);
    return { value, detail };
  };

  const allTime = makeCard(
    "MERCH CLICKERS • ALL TIME",
    "store-clickers-total",
    "store-clickers-total-detail",
  );
  const today = makeCard(
    "MERCH CLICKERS • TODAY",
    "store-clickers-today",
    "store-clickers-today-detail",
  );
  const rate = makeCard(
    "MERCH CLICK-THROUGH RATE",
    "store-click-rate",
    "store-click-rate-detail",
  );

  let inFlight = false;

  const refresh = async () => {
    if (inFlight) return;
    inFlight = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(endpoint, {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Store stats request failed: ${response.status}`);
      const payload = await response.json();

      const allUnique = Number(payload.allTime?.uniqueClickers ?? 0);
      const allClicks = Number(payload.allTime?.clicks ?? 0);
      const todayUnique = Number(payload.today?.uniqueClickers ?? 0);
      const todayClicks = Number(payload.today?.clicks ?? 0);
      const siteVisitors = Number(payload.siteVisitors ?? 0);

      allTime.value.textContent = numberFormatter.format(allUnique);
      allTime.detail.textContent = `${numberFormatter.format(allClicks)} total store click${allClicks === 1 ? "" : "s"}`;
      today.value.textContent = numberFormatter.format(todayUnique);
      today.detail.textContent = `${numberFormatter.format(todayClicks)} store click${todayClicks === 1 ? "" : "s"} today`;
      rate.value.textContent = `${percentFormatter.format(Number(payload.clickThroughRate ?? 0))}%`;
      rate.detail.textContent = `${numberFormatter.format(allUnique)} of ${numberFormatter.format(siteVisitors)} main-site visitors clicked the store`;
    } catch (error) {
      if (error?.name !== "AbortError") {
        console.error("Unable to load merch store statistics", error);
      }
      allTime.detail.textContent = "Unable to load store statistics";
      today.detail.textContent = "Unable to load store statistics";
      rate.detail.textContent = "Unable to load store statistics";
    } finally {
      window.clearTimeout(timeout);
      inFlight = false;
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
