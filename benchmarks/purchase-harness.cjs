// Shared jsdom harness for the purchase tests: real page markup and scripts,
// with browser-only drawing/native-dialog behavior stubbed and a controllable
// clock for the sale deadline.
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { JSDOM, VirtualConsole } = require("jsdom");
const root = path.join(__dirname, "..");
const read = file => readFileSync(path.join(root, file), "utf8");
const sessionKey = "movie-master-purchase-draft-v1";
// The sale's exclusive cutoff (pricing.js). Existing tests run after it so they
// exercise regular prices regardless of the real date; sale tests set "now".
const SALE_END = Date.parse("2026-11-28T06:00:00Z");
const AFTER_SALE = SALE_END + 24 * 60 * 60 * 1000;

function harness({ page = "game", saved = null, now = AFTER_SALE } = {}) {
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
  // Saved drafts are written relative to the real clock; keep their age the
  // same on the page's controllable clock.
  if (saved) {
    const rebased = Number.isFinite(saved.updatedAt)
      ? { ...saved, updatedAt: saved.updatedAt - Date.now() + now }
      : saved;
    window.sessionStorage.setItem(sessionKey, JSON.stringify(rebased));
  }
  // Controllable clock for the page's scripts (jsdom runs them in its own realm).
  let clock = now;
  window.Date.now = () => clock;
  window.addEventListener("movie-master:game-run-finalized", event => finalized.push(event.detail.reason));
  window.eval(read("pricing.js"));
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
    setNow: value => { clock = value; },
    close: () => window.close(),
  };
}

module.exports = { harness, read, sessionKey, SALE_END, AFTER_SALE };
