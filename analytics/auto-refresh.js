(() => {
  "use strict";

  const AUTO_REFRESH_MS = 2 * 60 * 1000;
  const QUIET_MIN_AGE_MS = AUTO_REFRESH_MS;
  let lastRefreshRequest = Date.now();

  const requestRefresh = ({ quiet = false } = {}) => {
    if (quiet && (document.hidden || !document.hasFocus())) return;
    if (quiet && Date.now() - lastRefreshRequest < QUIET_MIN_AGE_MS) return;
    lastRefreshRequest = Date.now();
    window.__invalidateAnalyticsSnapshot?.();
    window.dispatchEvent(new CustomEvent("analytics:refresh", { detail: { quiet } }));
  };

  const US_STATE_ABBREVIATIONS = {
    Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA",
    Colorado: "CO", Connecticut: "CT", Delaware: "DE", Florida: "FL", Georgia: "GA",
    Hawaii: "HI", Idaho: "ID", Illinois: "IL", Indiana: "IN", Iowa: "IA", Kansas: "KS",
    Kentucky: "KY", Louisiana: "LA", Maine: "ME", Maryland: "MD", Massachusetts: "MA",
    Michigan: "MI", Minnesota: "MN", Mississippi: "MS", Missouri: "MO", Montana: "MT",
    Nebraska: "NE", Nevada: "NV", "New Hampshire": "NH", "New Jersey": "NJ",
    "New Mexico": "NM", "New York": "NY", "North Carolina": "NC", "North Dakota": "ND",
    Ohio: "OH", Oklahoma: "OK", Oregon: "OR", Pennsylvania: "PA", "Rhode Island": "RI",
    "South Carolina": "SC", "South Dakota": "SD", Tennessee: "TN", Texas: "TX", Utah: "UT",
    Vermont: "VT", Virginia: "VA", Washington: "WA", "West Virginia": "WV", Wisconsin: "WI",
    Wyoming: "WY", "District of Columbia": "DC",
  };

  const countryCodeByName = new Map();
  if (typeof Intl.DisplayNames === "function") {
    const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
    for (let first = 65; first <= 90; first += 1) {
      for (let second = 65; second <= 90; second += 1) {
        const code = String.fromCharCode(first, second);
        try {
          const name = regionNames.of(code);
          if (name && name !== code) countryCodeByName.set(name, code);
        } catch {
          // Ignore invalid region codes.
        }
      }
    }
  }

  const countryAbbreviation = (name) => {
    const code = countryCodeByName.get(name);
    if (!code) return name;
    if (code === "US") return "USA";
    if (code === "GB") return "UK";
    return code;
  };

  const compactLocationText = (text) => {
    if (!text) return text;
    const separatorIndex = text.indexOf(" • ");
    const locationPart = separatorIndex >= 0 ? text.slice(0, separatorIndex) : text;
    const suffix = separatorIndex >= 0 ? text.slice(separatorIndex) : "";
    const parts = locationPart.split(", ").filter(Boolean);
    if (!parts.length) return text;

    const countryIndex = parts.length - 1;
    const country = countryAbbreviation(parts[countryIndex]);
    parts[countryIndex] = country;
    if (country === "USA" && parts.length >= 2) {
      const regionIndex = parts.length - 2;
      parts[regionIndex] = US_STATE_ABBREVIATIONS[parts[regionIndex]] ?? parts[regionIndex];
    }
    return `${parts.join(", ")}${suffix}`;
  };

  const compactRenderedLocations = () => {
    document.querySelectorAll(".location-name, #visitor-map-points title").forEach((element) => {
      const compacted = compactLocationText(element.textContent ?? "");
      if (compacted !== element.textContent) element.textContent = compacted;
    });
  };

  const geographyRoot = document.querySelector("#traffic-geography");
  if (geographyRoot) {
    const locationObserver = new MutationObserver(compactRenderedLocations);
    locationObserver.observe(geographyRoot, { childList: true, subtree: true });
    compactRenderedLocations();
  }

  document.querySelector("#refresh-button")?.addEventListener("click", () => {
    requestRefresh({ quiet: false });
  });

  window.setInterval(() => requestRefresh({ quiet: true }), AUTO_REFRESH_MS);
  window.addEventListener("focus", () => requestRefresh({ quiet: true }));
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) requestRefresh({ quiet: true });
  });
})();
