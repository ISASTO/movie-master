(() => {
  "use strict";

  const endpoint = "https://movie-master-visitor-counter.isasto.workers.dev/traffic?view=daily";
  const numberFormatter = new Intl.NumberFormat("en-US");

  const ensureDetail = (numberId, detailId) => {
    const number = document.querySelector(`#${numberId}`);
    const card = number?.closest(".summary-card");
    if (!card) return null;

    let detail = document.querySelector(`#${detailId}`);
    if (!detail) {
      detail = document.createElement("small");
      detail.id = detailId;
      card.append(detail);
    }
    return detail;
  };

  const allTimeDetail = ensureDetail("summary-game-total", "summary-game-total-source");
  const todayDetail = ensureDetail("summary-game-today", "summary-game-today-source");
  if (!allTimeDetail || !todayDetail) return;

  const formatBreakdown = (fromSite, direct, unclassified) => {
    const parts = [
      `${numberFormatter.format(fromSite)} from site`,
      `${numberFormatter.format(direct)} direct/shared`,
    ];
    if (unclassified > 0) {
      parts.push(`${numberFormatter.format(unclassified)} before source tracking`);
    }
    return parts.join(" • ");
  };

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
      if (!response.ok) return;
      const payload = await response.json();
      const summary = payload.summary ?? {};

      allTimeDetail.textContent = formatBreakdown(
        Number(summary.gameFromSiteTotal ?? 0),
        Number(summary.gameDirectTotal ?? 0),
        Number(summary.gameUnclassifiedTotal ?? 0),
      );
      todayDetail.textContent = formatBreakdown(
        Number(summary.gameFromSiteToday ?? 0),
        Number(summary.gameDirectToday ?? 0),
        Number(summary.gameUnclassifiedToday ?? 0),
      );
    } catch (error) {
      if (error?.name !== "AbortError") {
        console.error("Unable to load game source breakdown", error);
      }
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
