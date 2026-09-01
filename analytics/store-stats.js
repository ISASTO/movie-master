(() => {
  "use strict";

  const endpoint = "https://movie-master-visitor-counter.isasto.workers.dev/store-stats";
  const numberFormatter = new Intl.NumberFormat("en-US");
  const percentFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
  const elements = {
    allTime: document.querySelector("#store-clickers-total"),
    allTimeDetail: document.querySelector("#store-clickers-total-detail"),
    today: document.querySelector("#store-clickers-today"),
    todayDetail: document.querySelector("#store-clickers-today-detail"),
    rate: document.querySelector("#store-click-rate"),
    rateDetail: document.querySelector("#store-click-rate-detail"),
  };

  let loading = false;

  const plural = (count, singular, pluralForm = `${singular}s`) =>
    Number(count) === 1 ? singular : pluralForm;

  const refresh = async () => {
    if (loading) return;
    loading = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(endpoint, { cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error(`Store stats request failed: ${response.status}`);
      const payload = await response.json();

      const allUnique = Number(payload.allTime?.uniqueClickers ?? 0);
      const allClicks = Number(payload.allTime?.clicks ?? 0);
      const todayUnique = Number(payload.today?.uniqueClickers ?? 0);
      const todayClicks = Number(payload.today?.clicks ?? 0);
      const siteVisitors = Number(payload.siteVisitors ?? 0);

      elements.allTime.textContent = numberFormatter.format(allUnique);
      elements.allTimeDetail.textContent =
        `${numberFormatter.format(allClicks)} total ${plural(allClicks, "click")}`;
      elements.today.textContent = numberFormatter.format(todayUnique);
      elements.todayDetail.textContent =
        `${numberFormatter.format(todayClicks)} ${plural(todayClicks, "click")} today`;
      elements.rate.textContent = `${percentFormatter.format(Number(payload.clickThroughRate ?? 0))}%`;
      elements.rateDetail.textContent =
        `${numberFormatter.format(allUnique)} of ${numberFormatter.format(siteVisitors)} main-site visitors`;
    } catch (error) {
      if (error?.name !== "AbortError") {
        console.error("Unable to load store statistics", error);
      }
      [elements.allTimeDetail, elements.todayDetail, elements.rateDetail].forEach((element) => {
        if (element) element.textContent = "Store statistics unavailable";
      });
    } finally {
      window.clearTimeout(timeout);
      loading = false;
    }
  };

  window.addEventListener("analytics:refresh", refresh);
  refresh();
})();
