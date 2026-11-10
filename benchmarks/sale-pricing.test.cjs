// Run with: npm run test:purchase (from benchmarks/)
// Black Friday Special Sale: shared pricing, the deadline, and the purchase
// journey on the main site and in /game. Uses a controllable page clock.
const assert = require("node:assert/strict");
const { test } = require("node:test");
const { harness, SALE_END, AFTER_SALE } = require("./purchase-harness.cjs");

const DURING_SALE = Date.parse("2026-11-20T18:30:15Z");
const PRICES = {
  five: { regular: 5, sale: 4, off: 20 },
  ten: { regular: 10, sale: 7, off: 30 },
  vip: { regular: 20, sale: 12, off: 40 },
};
const saleMessage = {
  five: "Hello Mr. Movie Master sir. I would like 5 Blockbuster Smash Hit Masterpiece recommendations for the Black Friday Special Sale price of $4. Please send my recommendations here. Thank you.",
  ten: "Hello Mr. Movie Master sir. I would like 10 Blockbuster Smash Hit Masterpiece recommendations for the Black Friday Special Sale price of $7. Please send my recommendations here. Thank you.",
  vip: "Hello Mr. Movie Master sir. I would like the VIP Package for the Black Friday Special Sale price of $12: 20 Blockbuster Smash Hit Masterpiece recommendations, 3 R&B music videos, and my VIP certificate. Please send my recommendations here. Thank you.",
};
// Unchanged from before the sale.
const regularMessage = {
  five: "Hello Mr. Movie Master sir. I would like 5 Blockbuster Smash Hit Masterpiece recommendations for $5. Please send my recommendations here. Thank you.",
  ten: "Hello Mr. Movie Master sir. I would like 10 Blockbuster Smash Hit Masterpiece recommendations for $10. Please send my recommendations here. Thank you.",
  vip: "Hello Mr. Movie Master sir. I would like the $20 VIP Package: 20 Blockbuster Smash Hit Masterpiece recommendations, 3 R&B music videos, and my VIP certificate. Please send my recommendations here. Thank you.",
};
const text = element => element.textContent.replace(/\s+/g, " ").trim();
const mailBody = h => decodeURIComponent(h.find("#purchase-email-link").href.split("&body=")[1]);
const input = (h, selector, value) => {
  h.find(selector).value = value;
  h.find(selector).dispatchEvent(new h.window.Event("input"));
};
const expire = (h, at = SALE_END) => {
  h.setNow(at);
  // Returning to a backgrounded or sleeping tab re-checks the deadline.
  h.document.dispatchEvent(new h.window.Event("visibilitychange"));
};

test("shared configuration: exact prices, discounts and deadline", () => {
  const h = harness({ page: "main", now: DURING_SALE });
  try {
    const pricing = h.window.MovieMasterPricing;
    assert.equal(pricing.promotion.name, "MOVIE MASTER BLACK FRIDAY SPECIAL SALE");
    assert.equal(pricing.promotion.endsAtIso, "2026-11-28T06:00:00Z");
    assert.equal(pricing.promotion.endsAt, SALE_END);
    for (const [key, price] of Object.entries(PRICES)) {
      assert.equal(pricing.regularPrice(key), price.regular);
      assert.equal(pricing.salePrice(key), price.sale);
      assert.equal(pricing.discountPercent(key), price.off);
      assert.equal(pricing.price(key, SALE_END - 1), price.sale);
      assert.equal(pricing.price(key, SALE_END), price.regular);
      assert.equal(pricing.price(key, SALE_END + 1), price.regular);
    }
    assert.equal(pricing.maxDiscountPercent(), 40);
    assert.equal(pricing.price("support"), undefined);
    assert.equal(pricing.price("lifetime"), undefined);
    assert.equal(pricing.isSaleActive(SALE_END - 1), true);
    assert.equal(pricing.isSaleActive(SALE_END), false);
    assert.equal(pricing.deadlineLabel(), "Friday, November 27, 2026, at 11:59 PM Central Time");
    const plain = value => JSON.parse(JSON.stringify(value));
    assert.deepEqual(plain(pricing.remaining(SALE_END - 1)), { totalSeconds: 1, days: 0, hours: 0, minutes: 0, seconds: 1 });
    assert.deepEqual(plain(pricing.remaining(SALE_END)), { totalSeconds: 0, days: 0, hours: 0, minutes: 0, seconds: 0 });
    assert.equal(pricing.remaining(SALE_END + 86400000).totalSeconds, 0, "never negative");
    // Time zones cannot move the deadline: it is one absolute instant.
    assert.equal(pricing.remaining(Date.parse("2026-11-27T23:59:59-06:00")).totalSeconds, 1);
    assert.equal(pricing.remaining(Date.parse("2026-11-28T05:59:59+00:00")).totalSeconds, 1);
  } finally { h.close(); }
});

test("main site during the sale: cards, buttons, selectors and countdown", () => {
  const h = harness({ page: "main", now: DURING_SALE });
  try {
    assert.equal(h.document.documentElement.dataset.sale, "active");
    assert.equal(h.find(".sale-header").hidden, false);
    assert.match(text(h.find(".sale-title")), /^MOVIE MASTER BLACK FRIDAY SPECIAL SALE$/);
    assert.match(text(h.find(".sale-kicker")), /LIMITED TIME OFFER/);
    assert.match(text(h.find(".sale-blurb")), /Save up to 40%/);
    assert.equal(h.find(".hero-sale-tag").hidden, false);
    assert.match(text(h.find(".hero-sale-tag")), /SAVE UP TO 40%/);
    // 2026-11-20T18:30:15Z → 7 days, 11:29:45 before the cutoff.
    const units = [...h.document.querySelectorAll(".sale-countdown-units [data-unit]")].map(text);
    assert.deepEqual(units, ["07", "11", "29", "45"]);
    assert.match(text(h.find(".sale-deadline")), /Ends Friday, November 27, 2026, at 11:59 PM Central Time/);
    for (const [key, price] of Object.entries(PRICES)) {
      for (const display of h.document.querySelectorAll(`[data-price-display="${key}"]`)) {
        assert.equal(display.classList.contains("has-sale-price"), true);
        assert.equal(text(display.querySelector(".price-was")), "$" + price.regular);
        assert.equal(text(display.querySelector(".price-now")), "$" + price.sale);
        assert.equal(text(display.querySelector(".visually-hidden")),
          `Sale price $${price.sale}, regularly $${price.regular}`);
      }
      for (const amount of h.document.querySelectorAll(`[data-price-text="${key}"]`)) {
        assert.equal(text(amount), "$" + price.sale);
      }
      const tag = h.find(`.sale-tag [data-discount="${key}"], .sale-tag[data-discount="${key}"]`);
      assert.equal(text(tag), price.off + "% OFF");
    }
    assert.match(text(h.find('[data-package="five"].package-purchase-button')), /^PURCHASE \$4 PACKAGE$/);
    assert.match(text(h.find('[data-package="ten"].package-purchase-button')), /^PURCHASE \$7 PACKAGE$/);
    assert.match(text(h.find(".sale-tag-best")), /BEST VALUE · 40% OFF/);
    assert.match(text(h.find(".process-film")), /Select the \$4, \$7, or VIP Package\./);
    // Package contents are unchanged.
    assert.deepEqual([...h.document.querySelectorAll(".vip-inclusions li")].map(text), [
      "20 Blockbuster Smash Hit Movie recommendations",
      "3 of the best R&B music videos ever made",
      "One VIP certificate to prove your VIP status",
    ]);
    // Historical testimonial quotes keep their original prices.
    assert.match(text(h.find("#testimonials")), /10 recommendations for \$10 is an absolute steal/);
    assert.match(text(h.find("#testimonials")), /20 movie recommendations for \$20/);
  } finally { h.close(); }
});

test("checkout amounts, summaries and generated messages for every package and payment method", () => {
  for (const page of ["main", "game"]) {
    const h = harness({ page, now: DURING_SALE });
    try {
      if (page === "game") { h.finish("manual"); h.click("#gameover-packages-button"); }
      else h.click(".action-bar-purchase");
      assert.equal(h.find(".purchase-sale").hidden, false);
      assert.match(text(h.find(".purchase-sale-title")), /BLACK FRIDAY SPECIAL SALE · SAVE UP TO 40%/);
      for (const [key, price] of Object.entries(PRICES)) {
        if (h.find("#purchase-package-selector").hidden) h.click("#purchase-change-package");
        h.click(`[data-package-select="${key}"]`);
        assert.equal(h.find("#purchase-payment-title").textContent, "1. PAY $" + price.sale);
        assert.match(text(h.find("#purchase-package-name")), new RegExp(`Sale price \\$${price.sale}, regularly \\$${price.regular}`));
        assert.equal(h.find("#purchase-message").value, saleMessage[key]);
        assert.equal(mailBody(h), saleMessage[key]);
        for (const [method, name, recipient] of [
          ["paypal", "PayPal", "refreshingspring148@gmail.com"],
          ["venmo", "Venmo", "@Robert-Cravens-15"],
          ["cashapp", "Cash App", "$Livinglife5444"],
        ]) {
          h.click(`[name='purchase-payment-method'][value='${method}']`);
          assert.equal(h.find("#purchase-payment-recipient").textContent, recipient);
          assert.match(h.find("#purchase-payment-help").textContent, new RegExp(`enter \\$${price.sale}\\b`));
          assert.match(h.find("#purchase-payment-help").textContent, new RegExp(name === "PayPal" ? "PayPal" : name));
        }
        h.click("[name='purchase-payment-method'][value='paypal']");
        // Message before paying stays available; delivery remains personal.
        assert.equal(h.find("#purchase-message-first").hidden, false);
        assert.match(text(h.find("#purchase-delivery")), /24 hours.*your payment and message/);
        assert.match(h.find("#purchase-instruction-detail").textContent, /message him after paying/);
      }
      // SMS content (non-Apple user agent in jsdom carries the body).
      h.click("#purchase-dialog [data-reveal-phone]");
      assert.equal(decodeURIComponent(h.find("#purchase-dialog [data-sms-link]").href.split("?body=")[1]), saleMessage.vip);
      // Payment name details are still added to the generated message.
      input(h, "#purchase-payment-name", "Pat Buyer");
      assert.equal(mailBody(h), saleMessage.vip + "\n\nName on payment: Pat Buyer\nPayment method: PayPal");
    } finally { h.close(); }
  }
});

test("the game's offer and chooser match the main site's prices and accessible names", () => {
  const main = harness({ page: "main", now: DURING_SALE });
  const game = harness({ page: "game", now: DURING_SALE });
  try {
    const shown = h => Object.fromEntries(Object.keys(PRICES).map(key => [key,
      [...h.document.querySelectorAll(`[data-price-display="${key}"] .price-now`)].map(text)]));
    const mainPrices = shown(main);
    const gamePrices = shown(game);
    for (const [key, price] of Object.entries(PRICES)) {
      assert.ok(mainPrices[key].length >= 2 && gamePrices[key].length >= 1);
      assert.deepEqual([...new Set([...mainPrices[key], ...gamePrices[key]])], ["$" + price.sale]);
    }
    const card = key => game.find(`.game-package-card[data-package-select="${key}"]`);
    assert.equal(card("five").getAttribute("aria-label"),
      "Choose $4 Black Friday sale price, regularly $5 package: 5 Blockbuster Smash Hit Movie recommendations");
    assert.match(card("vip").getAttribute("aria-label"), /^Choose \$12 Black Friday sale price, regularly \$20 VIP package: 20 /);
    assert.match(text(card("ten").querySelector(".game-package-action")), /CHOOSE \$7 PACKAGE/);
    assert.match(text(game.find(".game-package-note")), /Recommendations only\. Films and streaming access aren’t included\./);
    const offer = [...game.document.querySelectorAll(".gameover-offer p")].filter(p => !p.hidden).map(text);
    assert.deepEqual(offer, ["BLACK FRIDAY SPECIAL SALE: recommendations from $4. Save up to 40%."]);
  } finally { main.close(); game.close(); }
});

test("before, exactly at, and after the deadline", () => {
  for (const [now, active] of [[SALE_END - 1, true], [SALE_END, false], [SALE_END + 1, false]]) {
    for (const page of ["main", "game"]) {
      const h = harness({ page, now });
      try {
        assert.equal(h.document.documentElement.dataset.sale, active ? "active" : "ended");
        assert.equal(h.find(".purchase-sale").hidden, !active);
        if (page === "main") {
          assert.equal(h.find(".sale-header").hidden, !active);
          assert.equal(h.find(".hero-sale-tag").hidden, !active);
          assert.equal(text(h.find('[data-package="ten"].package-purchase-button')), active ? "PURCHASE $7 PACKAGE" : "PURCHASE $10 PACKAGE");
          // Regular prices reproduce the original markup exactly.
          if (!active) assert.equal(h.find('.package-ticket-vip [data-price-display="vip"]').innerHTML, "<sup>$</sup>20");
          h.click('[data-package="ten"].package-purchase-button');
        } else {
          assert.equal(game_offer(h), active
            ? "BLACK FRIDAY SPECIAL SALE: recommendations from $4. Save up to 40%."
            : "Personal movie recommendations from $5.");
          assert.equal(h.find('.game-package-card[data-package-select="vip"]').getAttribute("aria-label"),
            active ? "Choose $12 Black Friday sale price, regularly $20 VIP package: 20 Blockbuster Smash Hit Movie recommendations, 3 R and B videos, and a VIP certificate"
              : "Choose $20 VIP package: 20 Blockbuster Smash Hit Movie recommendations, 3 R and B videos, and a VIP certificate");
          h.finish("manual"); h.click("#gameover-packages-button"); h.click('[data-package-select="ten"]');
        }
        assert.equal(h.find("#purchase-payment-title").textContent, active ? "1. PAY $7" : "1. PAY $10");
        assert.equal(mailBody(h), active ? saleMessage.ten : regularMessage.ten);
        const units = [...h.document.querySelectorAll("[data-sale-countdown] [data-unit]")].map(text);
        assert.ok(units.every(value => /^\d\d$/.test(value)), "no negative or malformed time");
        if (!active) assert.ok(units.every(value => value === "00"));
      } finally { h.close(); }
    }
  }
});

function game_offer(h) {
  return [...h.document.querySelectorAll(".gameover-offer p")].filter(p => !p.hidden).map(text).join(" ");
}

test("expiring while checkout is open updates prices in place and keeps customer details", () => {
  for (const page of ["main", "game"]) {
    const h = harness({ page, now: SALE_END - 5000 });
    try {
      if (page === "game") { h.finish("manual"); h.click("#gameover-packages-button"); h.click('[data-package-select="vip"]'); }
      else h.click('[data-package="vip"].package-purchase-button');
      h.click("[name='purchase-payment-method'][value='venmo']");
      input(h, "#purchase-payment-name", "Pat Buyer");
      h.click("#purchase-edit-message");
      input(h, "#purchase-message", saleMessage.vip + "\n\nI love heist movies.");
      assert.equal(h.find("#purchase-payment-title").textContent, "1. PAY $12");
      assert.equal(h.find("#purchase-price-notice").textContent, "");

      expire(h, SALE_END);

      assert.equal(h.document.documentElement.dataset.sale, "ended");
      assert.equal(h.find(".purchase-sale").hidden, true);
      assert.equal(h.find("#purchase-payment-title").textContent, "1. PAY $20");
      assert.match(h.find("#purchase-payment-help").textContent, /enter \$20 in Venmo/);
      assert.equal(text(h.find("#purchase-package-name")), "VIP package · $20");
      assert.equal(h.find("#purchase-message").value, regularMessage.vip + "\n\nI love heist movies.");
      assert.equal(h.find("#purchase-payment-name").value, "Pat Buyer");
      assert.equal(mailBody(h), regularMessage.vip + "\n\nI love heist movies.\n\nName on payment: Pat Buyer\nPayment method: Venmo");
      assert.equal(h.find("#purchase-price-notice").textContent,
        "The Black Friday Special Sale has ended, so this package is now $20. If you already sent a payment, include the amount in your message.");
      assert.equal(h.find("#purchase-price-notice").getAttribute("role"), "status");
      // Checkout explains the change; the page does not announce it twice.
      assert.equal(h.find("[data-sale-status]").textContent, "");
      // Other prices behind and inside checkout are regular too.
      assert.ok([...h.document.querySelectorAll("[data-price-display]")].every(element => !element.classList.contains("has-sale-price")));
      // A repeated check does not repeat the notice or change anything further.
      const before = h.find("#purchase-message").value;
      h.window.MovieMasterPricing.refresh();
      assert.equal(h.find("#purchase-message").value, before);
      h.click("#purchase-dialog-close");
      assert.equal(h.find("#purchase-price-notice").textContent, "");
    } finally { h.close(); }
  }
});

test("a customer-rewritten message is never altered; they are asked to check its price", () => {
  const h = harness({ page: "main", now: SALE_END - 1000 });
  try {
    h.click('[data-package="five"].package-purchase-button');
    h.click("#purchase-edit-message");
    input(h, "#purchase-message", "Hi! Five comedies for my mailman please. I sent $4.");
    expire(h);
    assert.equal(h.find("#purchase-message").value, "Hi! Five comedies for my mailman please. I sent $4.");
    assert.equal(h.find("#purchase-price-notice").textContent,
      "The Black Friday Special Sale has ended, so this package is now $5. Please check the price in your message. If you already sent a payment, include the amount in your message.");
  } finally { h.close(); }
});

test("expiry with checkout closed or on the package list", () => {
  const closed = harness({ page: "main", now: SALE_END - 1000 });
  const choosing = harness({ page: "main", now: SALE_END - 1000 });
  try {
    expire(closed);
    assert.equal(closed.find("[data-sale-status]").textContent,
      "The Black Friday Special Sale has ended. Regular prices now apply.");
    assert.equal(closed.find(".sale-header").hidden, true);
    assert.equal(text(closed.find('[data-package="five"].package-purchase-button')), "PURCHASE $5 PACKAGE");

    choosing.click(".action-bar-purchase");
    expire(choosing);
    assert.equal(choosing.find("#purchase-price-notice").textContent,
      "The Black Friday Special Sale has ended. Regular prices now apply.");
    const tenOption = choosing.find('#purchase-package-selector [data-package-select="ten"]');
    assert.equal(text(tenOption.querySelector("[data-price-display]")), "$10");
    assert.equal(tenOption.querySelector(".price-now"), null);
    choosing.click('[data-package-select="ten"]');
    assert.equal(choosing.find("#purchase-payment-title").textContent, "1. PAY $10");
    assert.equal(choosing.find("#purchase-message").value, regularMessage.ten);
  } finally { closed.close(); choosing.close(); }
});

test("drafts restore with the current price across the deadline, keeping edits and payment names", () => {
  const draft = (message, paymentName = "Pat Buyer") => ({ message, paymentName });
  const saved = (packageKey, drafts) => ({
    version: 1, updatedAt: Date.now() - 60 * 1000, packageKey, method: "venmo",
    paymentOpened: true, open: true, drafts,
  });
  // Saved during the sale, restored after it.
  for (const page of ["main", "game"]) {
    const h = harness({ page, now: SALE_END + 30 * 1000, saved: saved("ten", {
      ten: draft(saleMessage.ten + "\nNo horror please."),
      vip: draft("Totally my own words."),
    }) });
    try {
      if (page === "game") { h.finish("manual"); h.click("#gameover-packages-button"); h.click('[data-package-select="ten"]'); }
      assert.equal(h.find("#purchase-message").value, regularMessage.ten + "\nNo horror please.");
      assert.equal(h.find("#purchase-payment-name").value, "Pat Buyer");
      assert.equal(h.find("#purchase-payment-title").textContent, "1. PAY $10");
      h.find("#purchase-package-selector").hidden || null;
      if (h.find("#purchase-change-package").hidden === false) {
        h.click("#purchase-change-package"); h.click('[data-package-select="vip"]');
        assert.equal(h.find("#purchase-message").value, "Totally my own words.");
      }
    } finally { h.close(); }
  }
  // A pre-sale draft (regular wording) restored during the sale gets the sale price.
  const h = harness({ page: "main", now: DURING_SALE, saved: saved("five", { five: draft(regularMessage.five, "") }) });
  try {
    assert.equal(h.find("#purchase-message").value, saleMessage.five);
    assert.equal(h.find("#purchase-payment-title").textContent, "1. PAY $4");
  } finally { h.close(); }
});

test("one countdown timer, however often checkout opens or the page wakes", () => {
  const h = harness({ page: "main", now: DURING_SALE });
  try {
    // pricing.js keeps at most one pending timer of its own.
    const pending = new Set();
    const { setTimeout: set, clearTimeout: clear } = h.window;
    h.window.setTimeout = (callback, delay, ...rest) => {
      const id = set.call(h.window, (...args) => { pending.delete(id); callback(...args); }, delay, ...rest);
      pending.add(id);
      return id;
    };
    h.window.clearTimeout = id => { pending.delete(id); clear.call(h.window, id); };
    for (let index = 0; index < 12; index += 1) {
      h.click(".action-bar-purchase");
      h.click("#purchase-dialog-close");
      h.document.dispatchEvent(new h.window.Event("visibilitychange"));
      h.window.dispatchEvent(new h.window.Event("focus"));
      h.window.dispatchEvent(new h.window.Event("pageshow"));
      h.window.MovieMasterPricing.refresh();
    }
    assert.equal(pending.size, 1);
    // Once the sale is over, nothing keeps ticking.
    expire(h);
    assert.equal(pending.size, 0);
  } finally { h.close(); }
});

test("the deadline passing between two clock readings still ends the sale", async () => {
  const h = harness({ page: "main", now: SALE_END - 1 });
  try {
    // The first reading is just before the cutoff; every later one is after it.
    let readings = 0;
    h.window.Date.now = () => (readings++ === 0 ? SALE_END - 1 : SALE_END + 1);
    h.window.MovieMasterPricing.refresh();
    assert.equal(h.document.documentElement.dataset.sale, "active");
    await new Promise(resolve => setTimeout(resolve, 60));
    assert.equal(h.document.documentElement.dataset.sale, "ended");
    assert.equal(text(h.find('[data-package="five"].package-purchase-button')), "PURCHASE $5 PACKAGE");
  } finally { h.close(); }
});
