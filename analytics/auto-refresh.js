(() => {
  "use strict";

  const refresh = () => {
    if (document.hidden || !document.hasFocus()) return;
    document.querySelector("#refresh-button")?.click();
  };

  window.setInterval(refresh, 60 * 1000);
  window.addEventListener("focus", refresh);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refresh();
  });

  const sourceBreakdown = document.createElement("script");
  sourceBreakdown.src = "./source-breakdown.js?v=20260901-1";
  sourceBreakdown.defer = true;
  document.head.append(sourceBreakdown);
})();
