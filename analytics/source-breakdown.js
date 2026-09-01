(() => {
  "use strict";

  const endpoint = "https://movie-master-visitor-counter.isasto.workers.dev/traffic?view=daily";
  const numberFormatter = new Intl.NumberFormat("en-US");
  const fields = {
    siteTotal: document.querySelector("#source-site-total"),
    siteToday: document.querySelector("#source-site-today"),
    directTotal: document.querySelector("#source-direct-total"),
    directToday: document.querySelector("#source-direct-today"),
    unclassifiedTotal: document.querySelector("#source-unclassified-total"),
    unclassifiedToday: document.querySelector("#source-unclassified-today"),
  };

  let loading = false;

  const set = (element, value) => {
    if (element) element.textContent = numberFormatter.format(Number(value ?? 0));
  };

  const refresh = async () => {
    if (loading) return;
    loading = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(endpoint, { cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error(`Traffic source request failed: ${response.status}`);
      const summary = (await response.json()).summary ?? {};
      set(fields.siteTotal, summary.gameFromSiteTotal);
      set(fields.siteToday, summary.gameFromSiteToday);
      set(fields.directTotal, summary.gameDirectTotal);
      set(fields.directToday, summary.gameDirectToday);
      set(fields.unclassifiedTotal, summary.gameUnclassifiedTotal);
      set(fields.unclassifiedToday, summary.gameUnclassifiedToday);
    } catch (error) {
      if (error?.name !== "AbortError") {
        console.error("Unable to load game traffic sources", error);
      }
      Object.values(fields).forEach((field) => {
        if (field) field.textContent = "—";
      });
    } finally {
      window.clearTimeout(timeout);
      loading = false;
    }
  };

  window.addEventListener("analytics:refresh", refresh);
  refresh();
})();
