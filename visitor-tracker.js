(() => {
  "use strict";

  const script = document.currentScript;
  const section = script?.dataset.visitorSection;
  if (!section || !["site", "game"].includes(section)) return;

  const apiUrl = "https://movie-master-visitor-counter.isasto.workers.dev/section-visit";
  const visitorIdKey = "movie-master-visitor-id";
  const visitBucketKey = `movie-master-${section}-visit-hour-v1`;

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

  const getGameSource = () => {
    if (section !== "game") return null;

    try {
      if (!document.referrer) return "direct";
      const referrer = new URL(document.referrer);
      const referrerPath = referrer.pathname.replace(/\/+$/, "") || "/";
      return referrer.origin === window.location.origin && referrerPath === "/"
        ? "site"
        : "direct";
    } catch {
      return "direct";
    }
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

  const chicagoHourBucket = () => {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Chicago",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        hourCycle: "h23",
      }).formatToParts(new Date());
      const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
      return `${values.year}-${values.month}-${values.day}T${values.hour}`;
    } catch {
      return new Date().toISOString().slice(0, 13);
    }
  };

  const visitBucket = chicagoHourBucket();
  try {
    const prior = JSON.parse(window.localStorage.getItem(visitBucketKey) || "null");
    if (prior?.visitorId === visitorId && prior?.bucket === visitBucket) return;
  } catch {
    // A malformed/missing throttle marker should never block analytics.
  }

  const body = { visitorId, section };
  if (section === "game") body.source = getGameSource();

  fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    keepalive: true,
  }).then((response) => {
    if (!response.ok) return;
    try {
      window.localStorage.setItem(
        visitBucketKey,
        JSON.stringify({ visitorId, bucket: visitBucket }),
      );
    } catch {
      // The visit was still recorded; the throttle marker is optional.
    }
  }).catch(() => {
    // Analytics must never interfere with the page or game.
  });

})();
