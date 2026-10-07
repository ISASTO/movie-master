// Real page markup and scripts; browser-only drawing/native-dialog behavior is
// stubbed. Responsive geometry and native focus trapping are checked visually.
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const { JSDOM, VirtualConsole } = require("jsdom");
const root = path.join(__dirname, "..");
const read = file => readFileSync(path.join(root, file), "utf8");
const sessionKey = "movie-master-purchase-draft-v1";

function harness({ page = "game", saved = null } = {}) {
  const errors = [];
  const console = new VirtualConsole();
  console.on("jsdomError", error => errors.push(error));
  const dom = new JSDOM(read(page === "game" ? "game/index.html" : "index.html"), {
    url: "https://moviemaster.vip/" + (page === "game" ? "game/" : ""),
    runScripts: "outside-only", pretendToBeVisual: true, virtualConsole: console,
  });
  const { window } = dom;
  const { document } = window;
  const copies = [];
  const finalized = [];
  let controllers = [];
  window.scrollTo = () => {};
  window.requestAnimationFrame = () => 1;
  window.cancelAnimationFrame = () => {};
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  window.ResizeObserver = class { observe() {} };
  window.Path2D = class { moveTo() {} lineTo() {} arc() {} closePath() {} rect() {} };
  const drawing = new Proxy({
    measureText: text => ({ width: String(text).length * 8, actualBoundingBoxAscent: 10, actualBoundingBoxDescent: 3 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
  }, { get: (object, key) => object[key] ?? (() => {}) });
  window.HTMLCanvasElement.prototype.getContext = () => drawing;
  window.Element.prototype.getBoundingClientRect = function () {
    return { x: 0, y: 0, left: 0, top: 0, right: 960, bottom: 640, width: 960, height: 640 };
  };
  window.Element.prototype.getClientRects = function () {
    return this.closest("[hidden], dialog:not([open])") ? [] : [this.getBoundingClientRect()];
  };
  window.Element.prototype.scrollIntoView = function () { this.scrolledIntoView = true; };
  window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  window.HTMLDialogElement.prototype.close = function () {
    this.open = false;
    this.dispatchEvent(new window.Event("close"));
  };
  Object.defineProperty(window.navigator, "clipboard", { value: { writeText: async text => copies.push(text) } });
  Object.defineProperty(window.navigator, "getGamepads", { value: () => controllers });
  if (saved) window.sessionStorage.setItem(sessionKey, JSON.stringify(saved));
  window.addEventListener("movie-master:game-run-finalized", event => finalized.push(event.detail.reason));
  window.eval(read("purchase-flow.js"));
  if (page === "game") {
    // Test-only access to the actual lifecycle/menu code, never shipped in game.js.
    const hook = `window.__purchaseTest = {
      finish: endGame, state: () => gameState, menus: visibleMenuButtons,
      controller: pollGamepad, select: setControllerSelection,
      active: setControllerInputActive
    };`;
    window.eval(read("game/game.js").replace(/\}\)\(\);\s*$/, hook + "\n})();"));
  } else {
    window.MovieMasterPurchaseFlow.setUpTextContacts();
    window.MovieMasterPurchaseFlow.init();
  }
  const find = selector => document.querySelector(selector);
  const click = selector => { assert.ok(find(selector), selector); find(selector).click(); assert.equal(errors.length, 0, errors.map(error => error.message).join("\n")); };
  const finish = reason => { click("#start-button"); window.__purchaseTest.finish(reason); };
  const key = (element, code) => element.dispatchEvent(new window.KeyboardEvent("keydown", { code, key: code, bubbles: true, cancelable: true }));
  return { window, document, errors, copies, finalized, find, click, finish, key,
    setControllers: value => { controllers = value; },
    close: () => window.close(),
  };
}

test("natural and manually ended runs show the offer; opening it preserves the run", () => {
  for (const reason of ["garbage", "missed-popcorn", "manual"]) {
    const h = harness();
    try {
      assert.equal(h.find("#gameover-overlay").hidden, true);
      h.finish(reason);
      const score = h.find("#final-score").textContent;
      h.click("#gameover-packages-button");
      assert.equal(h.find("#purchase-dialog").open, true);
      assert.equal(h.find("#purchase-package-selector").hidden, false);
      assert.equal(h.find("#purchase-request").hidden, true);
      assert.equal(h.document.activeElement.id, "purchase-dialog-title");
      assert.equal(h.window.location.pathname, "/game/");
      assert.deepEqual(h.finalized, [reason]);
      h.click("#purchase-dialog-close");
      assert.equal(h.window.__purchaseTest.state(), "gameover");
      assert.equal(h.find("#final-score").textContent, score);
      assert.equal(h.document.activeElement.id, "gameover-packages-button");
      assert.equal(h.document.documentElement.classList.contains("purchase-open"), false);
    } finally { h.close(); }
  }
});

test("all three offers lead to the correct existing payment and messaging flow", () => {
  const h = harness();
  try {
    h.finish("manual");
    h.click("#gameover-packages-button");
    for (const [key, amount] of [["five", 5], ["ten", 10], ["vip", 20]]) {
      h.click(`[data-package-select='${key}']`);
      assert.equal(h.find("#purchase-request").hidden, false);
      assert.equal(h.find("#purchase-package-selector").hidden, true);
      assert.equal(h.find("#purchase-payment-title").textContent, "1. PAY $" + amount);
      assert.match(h.find("#purchase-email-link").href, /^mailto:rcravens60@gmail\.com\?/);
      assert.match(decodeURIComponent(h.find("#purchase-email-link").href), new RegExp("\\$" + amount));
      if (key === "vip") assert.match(h.find("#purchase-package-detail").textContent, /3 R&B videos/);
      assert.match(h.find("#purchase-instruction-detail").textContent, /message him after paying/);
      h.click("#purchase-change-package");
      assert.equal(h.find("#purchase-request").hidden, true);
      assert.equal(h.find("#purchase-package-selector").hidden, false);
    }
    h.click("#purchase-dialog-close");
    assert.equal(JSON.parse(h.window.sessionStorage.getItem(sessionKey)).open, false);
  } finally { h.close(); }
});

test("changing offers keeps drafts, providers and gated text contact accurate", async () => {
  const h = harness();
  try {
    h.finish("manual"); h.click("#gameover-packages-button"); h.click("[data-package-select='five']");
    h.click("#purchase-edit-message");
    h.find("#purchase-message").value = "Please recommend an action movie.";
    h.find("#purchase-message").dispatchEvent(new h.window.Event("input"));
    h.find("#purchase-payment-name").value = "Test Customer";
    h.find("#purchase-payment-name").dispatchEvent(new h.window.Event("input"));
    h.click("#purchase-change-package"); h.click("[data-package-select='vip']");
    h.click("#purchase-change-package"); h.click("[data-package-select='five']");
    assert.equal(h.find("#purchase-message").value, "Please recommend an action movie.");
    assert.equal(h.find("#purchase-payment-name").value, "Test Customer");
    for (const [method, recipient] of [["paypal", "refreshingspring148@gmail.com"], ["venmo", "@Freshwater55"], ["cashapp", "$Livinglife5444"]]) {
      h.click(`[name='purchase-payment-method'][value='${method}']`);
      assert.equal(h.find("#purchase-payment-recipient").textContent, recipient);
      h.click("#purchase-copy-recipient");
      await Promise.resolve(); await Promise.resolve();
      assert.equal(h.copies.at(-1), recipient);
    }
    assert.equal(h.find("[data-sms-link]").hasAttribute("href"), false);
    h.click("[data-reveal-phone]");
    assert.match(h.find("[data-sms-link]").href, /^sms:\+16124436846/);
    assert.match(decodeURIComponent(h.find("[data-sms-link]").href), /Name on payment: Test Customer/);
    assert.match(decodeURIComponent(h.find("#purchase-email-link").href), /Payment method: Cash App/);
    h.click("#purchase-message-first");
    assert.ok(h.document.activeElement.matches(".purchase-contact-button"));
    assert.equal(h.document.activeElement.closest("[hidden]"), null);
    assert.match(h.find("#purchase-instruction-detail").textContent, /before paying/);
  } finally { h.close(); }
});

test("an open main-site draft never opens over gameplay; the main site still restores it", () => {
  const saved = { version: 1, updatedAt: Date.now(), packageKey: "vip", method: "venmo", paymentOpened: false, open: true,
    drafts: { vip: { message: "Action movies, please.", paymentName: "Test Customer" } } };
  const game = harness({ saved });
  const main = harness({ page: "main", saved });
  try {
    assert.equal(game.find("#purchase-dialog").open, false);
    assert.equal(main.find("#purchase-dialog").open, true);
    assert.equal(main.find("#purchase-message").value, saved.drafts.vip.message);
    assert.equal(main.find("#purchase-payment-recipient").textContent, "@Freshwater55");
    game.finish("manual"); game.click("#gameover-packages-button");
    assert.equal(game.find("#purchase-request").hidden, true);
    game.click("[data-package-select='vip']");
    assert.equal(game.find("#purchase-message").value, saved.drafts.vip.message);
  } finally { game.close(); main.close(); }
});

test("Enter inside checkout or on a results control cannot restart the game", () => {
  const h = harness();
  try {
    h.finish("manual");
    h.key(h.find("#gameover-packages-button"), "Enter");
    assert.equal(h.window.__purchaseTest.state(), "gameover");
    h.click("#gameover-packages-button"); h.click("[data-package-select='five']");
    h.key(h.find("#purchase-payment-name"), "Enter");
    h.key(h.find("#purchase-message"), "Space");
    assert.equal(h.window.__purchaseTest.state(), "gameover");
    assert.equal(h.find("#purchase-dialog").open, true);
    assert.deepEqual(h.finalized, ["manual"]);
    h.click("#purchase-dialog-close");
    h.click("#stats-button");
    h.key(h.find("#stats-close-button"), "Escape");
    assert.equal(h.find("#stats-overlay").hidden, true);
    h.click("#restart-button");
    assert.equal(h.window.__purchaseTest.state(), "running");
  } finally { h.close(); }
});

test("controller candidates stay inside the dialog and cancel returns to results", () => {
  const h = harness();
  try {
    h.finish("manual"); h.click("#gameover-packages-button");
    const game = h.window.__purchaseTest;
    const candidates = Array.from(game.menus());
    assert.equal(candidates.filter(control => control.matches("[data-package-select]")).length, 3);
    assert.ok(candidates.every(control => h.find("#purchase-dialog").contains(control)));
    assert.ok(candidates.every(control => !control.closest("[hidden]")));
    game.active(true); game.select(h.find("[data-package-select='vip']"));
    assert.equal(h.document.activeElement.dataset.packageSelect, "vip");
    assert.equal(h.document.activeElement.scrolledIntoView, true);
    const pad = { index: 0, id: "Xbox 360 Controller", mapping: "standard", connected: true, axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
    h.setControllers([pad]); game.controller(100);
    game.select(h.find("[data-package-select='vip']"));
    pad.buttons[0] = { pressed: true, value: 1 }; game.controller(200);
    assert.equal(h.find("#purchase-payment-title").textContent, "1. PAY $20");
    pad.buttons[0] = { pressed: false, value: 0 }; game.controller(300);
    pad.buttons[1] = { pressed: true, value: 1 }; game.controller(400);
    assert.equal(h.find("#purchase-dialog").open, false);
    assert.equal(game.state(), "gameover");
    assert.equal(h.document.activeElement.id, "gameover-packages-button");
  } finally { h.close(); }
});
