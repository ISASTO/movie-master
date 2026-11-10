// Shared package pricing and the Black Friday sale for the main site and /game.
// This file is the single source for package prices, sale prices, discounts and
// the sale deadline. Load it before purchase-flow.js.
(() => {
  "use strict";

  // Regular prices. Package contents are described in the page markup and in
  // purchase-flow.js; only the amounts live here.
  const packages = Object.freeze({
    five: Object.freeze({ count: 5, regular: 5 }),
    ten: Object.freeze({ count: 10, regular: 10 }),
    vip: Object.freeze({ count: 20, regular: 20 }),
  });

  // The sale starts when this file is published and ends at the exclusive cutoff
  // below: midnight Central Time at the start of Saturday, November 28, 2026
  // (the end of Black Friday in America/Chicago). Do not extend or reuse it.
  const promotion = Object.freeze({
    id: "black-friday-2026",
    name: "MOVIE MASTER BLACK FRIDAY SPECIAL SALE",
    endsAtIso: "2026-11-28T06:00:00Z",
    endsAt: Date.parse("2026-11-28T06:00:00Z"),
    timeZone: "America/Chicago",
    // Used if Intl time-zone formatting is unavailable.
    deadlineFallback: "Friday, November 27, 2026, at 11:59 PM Central Time",
    sale: Object.freeze({ five: 4, ten: 7, vip: 12 }),
  });

  const hasPackage = (key) => Object.hasOwn(packages, key);
  const isSaleActive = (now = Date.now()) => now < promotion.endsAt;
  const regularPrice = (key) => packages[key]?.regular;
  const salePrice = (key) => promotion.sale[key];
  const price = (key, now = Date.now()) =>
    hasPackage(key) ? (isSaleActive(now) ? salePrice(key) : regularPrice(key)) : undefined;
  const discountPercent = (key) =>
    hasPackage(key) ? Math.round((1 - salePrice(key) / regularPrice(key)) * 100) : 0;
  const maxDiscountPercent = () => Math.max(...Object.keys(packages).map(discountPercent));
  const formatAmount = (amount) => "$" + amount;

  // Remaining time, never negative. Seconds round up so the countdown reaches
  // 00:00:00 exactly when the sale ends rather than a second early.
  const remaining = (now = Date.now()) => {
    const totalSeconds = Math.max(0, Math.ceil((promotion.endsAt - now) / 1000));
    return {
      totalSeconds,
      days: Math.floor(totalSeconds / 86400),
      hours: Math.floor((totalSeconds % 86400) / 3600),
      minutes: Math.floor((totalSeconds % 3600) / 60),
      seconds: totalSeconds % 60,
    };
  };

  let deadlineText = null;
  const deadlineLabel = () => {
    if (deadlineText) return deadlineText;
    try {
      // One minute before the exclusive cutoff reads naturally as 11:59 PM.
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: promotion.timeZone,
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).formatToParts(new Date(promotion.endsAt - 60000));
      const part = (type) => parts.find((entry) => entry.type === type)?.value ?? "";
      deadlineText = `${part("weekday")}, ${part("month")} ${part("day")}, ${part("year")}, at ` +
        `${part("hour")}:${part("minute")} ${part("dayPeriod")} Central Time`;
    } catch {
      deadlineText = promotion.deadlineFallback;
    }
    return deadlineText;
  };

  // ---- Rendering -----------------------------------------------------------

  const pad = (value) => String(value).padStart(2, "0");

  // Fills an element with the current price. Regular prices reproduce the
  // original markup exactly; sale prices show the struck regular price and the
  // sale price, with a text equivalent that does not rely on color or strikes.
  const renderPrice = (element, now = Date.now()) => {
    const key = element.dataset.priceDisplay;
    if (!hasPackage(key)) return;
    const withSup = element.dataset.priceFormat !== "plain";
    const amount = (value) => {
      if (!withSup) return [document.createTextNode(formatAmount(value))];
      const sup = document.createElement("sup");
      sup.textContent = "$";
      return [sup, document.createTextNode(String(value))];
    };
    const active = isSaleActive(now);
    const state = active ? "sale" : "regular";
    if (element.dataset.priceState === state) return;
    element.dataset.priceState = state;
    element.classList.toggle("has-sale-price", active);
    if (!active) {
      element.replaceChildren(...amount(regularPrice(key)));
      return;
    }
    const spoken = document.createElement("span");
    spoken.className = "visually-hidden";
    spoken.textContent = `Sale price ${formatAmount(salePrice(key))}, regularly ${formatAmount(regularPrice(key))}`;
    // Only the number is struck through; a line through the "$" (especially a
    // raised one) reads as a stray dash.
    const was = document.createElement("span");
    was.className = "price-was";
    was.setAttribute("aria-hidden", "true");
    const [symbol, number] = withSup
      ? amount(regularPrice(key))
      : [document.createTextNode("$"), document.createTextNode(String(regularPrice(key)))];
    const struck = document.createElement("s");
    struck.append(number);
    was.append(symbol, struck);
    const now_ = document.createElement("b");
    now_.className = "price-now";
    now_.setAttribute("aria-hidden", "true");
    now_.append(...amount(salePrice(key)));
    element.replaceChildren(spoken, was, now_);
  };

  const render = (root = document, now = Date.now()) => {
    const active = isSaleActive(now);
    document.documentElement.dataset.sale = active ? "active" : "ended";
    root.querySelectorAll("[data-price-display]").forEach((element) => renderPrice(element, now));
    root.querySelectorAll("[data-price-text]").forEach((element) => {
      const value = price(element.dataset.priceText, now);
      if (value !== undefined) element.textContent = formatAmount(value);
    });
    root.querySelectorAll("[data-discount]").forEach((element) => {
      element.textContent = discountPercent(element.dataset.discount) + "% OFF";
    });
    root.querySelectorAll("[data-max-discount]").forEach((element) => {
      element.textContent = maxDiscountPercent() + "%";
    });
    // Accessible names that mention a price, e.g. "Choose {price} package: …".
    root.querySelectorAll("[data-price-label]").forEach((element) => {
      const key = element.dataset.priceKey;
      if (!hasPackage(key)) return;
      const priceText = active
        ? `${formatAmount(salePrice(key))} Black Friday sale price, regularly ${formatAmount(regularPrice(key))}`
        : formatAmount(regularPrice(key));
      element.setAttribute("aria-label", element.dataset.priceLabel.replace("{price}", priceText));
    });
    root.querySelectorAll("[data-sale-only]").forEach((element) => { element.hidden = !active; });
    root.querySelectorAll("[data-regular-only]").forEach((element) => { element.hidden = active; });
    root.querySelectorAll("[data-sale-deadline]").forEach((element) => {
      element.textContent = (element.dataset.saleDeadline || "") + deadlineLabel();
    });
    renderCountdowns(now);
  };

  const renderCountdowns = (now = Date.now()) => {
    const time = remaining(now);
    document.querySelectorAll("[data-sale-countdown]").forEach((countdown) => {
      countdown.querySelectorAll("[data-unit]").forEach((unit) => {
        const value = pad(time[unit.dataset.unit] ?? 0);
        // Only touch text that changed to keep layout work minimal.
        if (unit.textContent !== value) unit.textContent = value;
      });
    });
  };

  // ---- Timing --------------------------------------------------------------
  // A single lightweight timer for the whole page. Time is always derived from
  // the absolute deadline, so refreshes, background tabs and sleep cannot
  // restart or drift the countdown.

  const listeners = new Set();
  let lastActive = null;
  let timer = 0;
  let started = false;

  const schedule = () => {
    window.clearTimeout(timer);
    timer = 0;
    if (document.visibilityState === "hidden") return;
    // Decide from the state this page has applied, not a fresh clock reading:
    // the deadline can pass between that check and this one, and the page must
    // still get one more tick to switch to regular prices.
    if (lastActive === false) return;
    const now = Date.now();
    const untilEnd = Math.max(0, promotion.endsAt - now);
    const hasCountdown = Boolean(document.querySelector("[data-sale-countdown]"));
    // Tick just after each whole second when a countdown is shown; otherwise
    // only wake for the deadline (setTimeout caps at about 24.8 days).
    const delay = hasCountdown
      ? Math.min(untilEnd, 1000 - (now % 1000) + 15)
      : Math.min(untilEnd, 2 ** 31 - 1);
    timer = window.setTimeout(refresh, Math.max(0, delay));
  };

  const announceEnd = () => {
    // One restrained announcement. Checkout explains its own price change.
    if (document.querySelector("dialog[open]")) return;
    const status = document.querySelector("[data-sale-status]");
    if (status) status.textContent = "The Black Friday Special Sale has ended. Regular prices now apply.";
  };

  function refresh() {
    // Callers (such as checkout) may run before DOMContentLoaded.
    if (!started) {
      start();
      return isSaleActive();
    }
    const now = Date.now();
    const active = isSaleActive(now);
    const changed = lastActive !== null && active !== lastActive;
    if (lastActive !== active) {
      lastActive = active;
      render(document, now);
    } else {
      renderCountdowns(now);
    }
    if (changed) {
      if (!active) announceEnd();
      listeners.forEach((listener) => {
        try {
          listener({ active, now });
        } catch (error) {
          window.setTimeout(() => { throw error; });
        }
      });
    }
    schedule();
    return active;
  }

  const start = () => {
    if (started) return;
    started = true;
    lastActive = isSaleActive();
    render();
    const wake = () => { if (document.visibilityState !== "hidden") refresh(); else schedule(); };
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("pageshow", wake);
    window.addEventListener("focus", wake);
    schedule();
  };

  // Called with { active, now } when the sale state changes on this page.
  const onChange = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  window.MovieMasterPricing = Object.freeze({
    packages,
    promotion,
    hasPackage,
    isSaleActive,
    regularPrice,
    salePrice,
    price,
    discountPercent,
    maxDiscountPercent,
    formatAmount,
    remaining,
    deadlineLabel,
    render,
    refresh,
    onChange,
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
