(() => {
  "use strict";

  const originalFetch = window.fetch.bind(window);
  const workerHost = "movie-master-visitor-counter.isasto.workers.dev";

  window.fetch = (input, init = {}) => {
    const sourceUrl = typeof input === "string" ? input : input?.url;

    if (!sourceUrl || !sourceUrl.includes(workerHost) || !sourceUrl.includes("/analytics")) {
      return originalFetch(input, init);
    }

    const safeUrl = sourceUrl.replace("/analytics", "/traffic");
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 8000);

    if (init.signal) {
      if (init.signal.aborted) controller.abort();
      else init.signal.addEventListener("abort", () => controller.abort(), { once: true });
    }

    return originalFetch(safeUrl, { ...init, signal: controller.signal }).finally(() => {
      window.clearTimeout(timeoutId);
    });
  };
})();
