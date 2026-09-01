(() => {
  "use strict";

  const refresh = () => {
    if (document.hidden || !document.hasFocus()) return;
    document.querySelector("#refresh-button")?.click();
  };

  const trafficTitle = document.querySelector("#traffic-dashboard-title");
  if (trafficTitle && !trafficTitle.parentElement?.querySelector(".traffic-refresh-note")) {
    const note = document.createElement("p");
    note.className = "traffic-refresh-note";
    note.textContent = "Refreshes automatically every minute";
    trafficTitle.insertAdjacentElement("afterend", note);
  }

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
    const originalCountry = parts[countryIndex];
    const country = countryAbbreviation(originalCountry);
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

  const geographyRoot = document.querySelector("#traffic-dashboard");
  if (geographyRoot) {
    const locationObserver = new MutationObserver(compactRenderedLocations);
    locationObserver.observe(geographyRoot, { childList: true, subtree: true });
    compactRenderedLocations();
  }

  window.setInterval(refresh, 60 * 1000);
  window.addEventListener("focus", refresh);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refresh();
  });

  const sourceBreakdown = document.createElement("script");
  sourceBreakdown.src = "./source-breakdown.js?v=20260901-1";
  sourceBreakdown.defer = true;
  document.head.append(sourceBreakdown);

  const leaderboardStyles = document.createElement("link");
  leaderboardStyles.rel = "stylesheet";
  leaderboardStyles.href = "./mode-leaderboards.css?v=20260901-2";
  document.head.append(leaderboardStyles);

  const modeLeaderboards = document.createElement("script");
  modeLeaderboards.src = "./mode-leaderboards.js?v=20260901-1";
  modeLeaderboards.defer = true;
  document.head.append(modeLeaderboards);

  const storeStats = document.createElement("script");
  storeStats.src = "./store-stats.js?v=20260901-2";
  storeStats.defer = true;
  document.head.append(storeStats);
})();
