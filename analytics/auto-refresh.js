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
})();
