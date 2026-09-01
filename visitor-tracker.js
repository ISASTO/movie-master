(() => {
  "use strict";

  const script = document.currentScript;
  const section = script?.dataset.visitorSection;
  if (!section || !["site", "game"].includes(section)) return;

  const apiUrl = "https://movie-master-visitor-counter.isasto.workers.dev/section-visit";
  const visitorIdKey = "movie-master-visitor-id";

  const createVisitorId = () => {
    if (typeof crypto?.randomUUID === "function") return crypto.randomUUID();
    if (typeof crypto?.getRandomValues !== "function") return null;

    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0"));
    return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
  };

  let visitorId;
  try {
    visitorId = window.localStorage.getItem(visitorIdKey);
    if (!visitorId) {
      visitorId = createVisitorId();
      if (!visitorId) return;
      window.localStorage.setItem(visitorIdKey, visitorId);
    }
  } catch {
    return;
  }

  fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ visitorId, section }),
    cache: "no-store",
    keepalive: true,
  }).catch(() => {
    // Analytics must never interfere with the page or game.
  });
})();
