(() => {
  "use strict";

  const button = document.querySelector(".merch-store-button");
  if (!button) return;

  const endpoint = "https://movie-master-visitor-counter.isasto.workers.dev/store-event";
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

  const getVisitorId = () => {
    try {
      let visitorId = window.localStorage.getItem(visitorIdKey);
      if (!visitorId) {
        visitorId = createVisitorId();
        if (!visitorId) return null;
        window.localStorage.setItem(visitorIdKey, visitorId);
      }
      return visitorId;
    } catch {
      return null;
    }
  };

  button.addEventListener("click", () => {
    const visitorId = getVisitorId();
    if (!visitorId) return;

    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId }),
      cache: "no-store",
      keepalive: true,
    }).catch(() => {
      // Store analytics must never interfere with opening the merch store.
    });
  });
})();
