// Run with: node --test benchmarks/purchase-dialog.test.cjs
// Exercises the real viewport controller with simulated keyboard/viewport
// events. These checks complement, rather than replace, a mobile browser pass.
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const vm = require("node:vm");

const source = readFileSync(path.join(__dirname, "../purchase-flow.js"), "utf8");
const start = source.indexOf("  function createPurchaseDialogViewport(");
const end = source.indexOf("  function setUpPurchaseFlow(", start);
assert.ok(start >= 0 && end > start);

class Events {
  constructor() { this.listeners = new Map(); }
  addEventListener(type, callback) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(callback);
  }
  removeEventListener(type, callback) { this.listeners.get(type)?.delete(callback); }
  emit(type) { this.listeners.get(type)?.forEach(callback => callback({ type })); }
  count(type) { return this.listeners.get(type)?.size ?? 0; }
}

class Style {
  constructor() { this.values = new Map(); }
  setProperty(key, value, priority = "") { this.values.set(key, { value: String(value), priority }); }
  getPropertyValue(key) { return this.values.get(key)?.value ?? ""; }
  getPropertyPriority(key) { return this.values.get(key)?.priority ?? ""; }
  removeProperty(key) { this.values.delete(key); }
}

function harness({ visualViewport = true } = {}) {
  const classes = new Set();
  const page = {
    clientWidth: 390,
    style: new Style(),
    classList: { add: value => classes.add(value), remove: value => classes.delete(value) },
  };
  const body = { style: new Style() };
  const menu = { hidden: false };
  const menuButton = { expanded: "true", setAttribute(name, value) { this.expanded = value; } };
  const content = {
    scrollTop: 0,
    bounds: { top: 20, bottom: 820 },
    contains(field) { return field?.inCheckout === true; },
    getBoundingClientRect() { return this.bounds; },
  };
  const field = {
    inCheckout: true,
    top: 500,
    height: 44,
    matches: () => true,
    getBoundingClientRect() {
      return { top: this.top - content.scrollTop, bottom: this.top + this.height - content.scrollTop };
    },
  };
  const dialog = Object.assign(new Events(), {
    style: new Style(),
    querySelector: () => content,
  });
  const frames = new Map();
  let frameId = 0;
  const scrolls = [];
  const window = Object.assign(new Events(), {
    scrollX: 0, scrollY: 1700, innerWidth: 390, innerHeight: 844,
    requestAnimationFrame(callback) { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame(id) { frames.delete(id); },
    scrollTo(x, y) {
      scrolls.push({ x, y, behavior: page.style.getPropertyValue("scroll-behavior") });
      this.scrollX = x; this.scrollY = y;
    },
  });
  if (visualViewport) window.visualViewport = Object.assign(new Events(), {
    width: 390, height: 844, offsetTop: 0, offsetLeft: 0,
  });
  const document = {
    documentElement: page, body, activeElement: body,
    querySelector: selector => selector === "#mobile-nav-panel" ? menu : menuButton,
  };
  const controller = vm.runInNewContext(source.slice(start, end) + "\ncreatePurchaseDialogViewport(dialog);", {
    document, window, dialog,
  });
  const flush = () => {
    const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback());
  };
  return { controller, window, viewport: window.visualViewport, document, page, body, dialog,
    classes, content, field, menu, menuButton, frames, scrolls, flush };
}

test("opening holds the current page position and dismisses the mobile menu", () => {
  const h = harness();
  h.controller.lock();
  assert.ok(h.classes.has("purchase-open"));
  assert.equal(h.body.style.getPropertyValue("--purchase-page-top"), "-1700px");
  assert.equal(h.body.style.getPropertyValue("--purchase-page-width"), "390px");
  assert.equal(h.menu.hidden, true);
  assert.equal(h.menuButton.expanded, "false");
  assert.equal(h.content.scrollTop, 0);
  assert.equal(h.scrolls.length, 0);
});

test("keyboard resizing keeps a focused payment field visible by scrolling checkout only", () => {
  const h = harness(); h.controller.lock();
  h.document.activeElement = h.field;
  h.viewport.height = 360;
  h.viewport.offsetTop = 18;
  h.content.bounds = { top: 30, bottom: 356 };
  h.viewport.emit("resize"); h.viewport.emit("scroll");
  assert.equal(h.frames.size, 1);
  h.flush();
  assert.equal(h.dialog.style.getPropertyValue("--purchase-viewport-height"), "360px");
  assert.equal(h.dialog.style.getPropertyValue("--purchase-viewport-top"), "18px");
  assert.ok(h.field.getBoundingClientRect().bottom <= h.content.bounds.bottom - 12);
  assert.ok(h.field.getBoundingClientRect().top >= h.content.bounds.top + 12);
  assert.equal(h.scrolls.length, 0);
  assert.ok(h.classes.has("purchase-open"));
});

test("closing restores the exact scroll position immediately and preserves unrelated styles", () => {
  const h = harness();
  h.window.scrollX = 4.5; h.window.scrollY = 2012.5;
  h.page.style.setProperty("scroll-behavior", "smooth", "important");
  h.body.style.setProperty("color", "red");
  h.controller.lock(); h.window.scrollX = 0; h.window.scrollY = 0;
  assert.equal(h.controller.unlock(), true);
  assert.deepEqual(h.scrolls, [{ x: 4.5, y: 2012.5, behavior: "auto" }]);
  assert.equal(h.page.style.getPropertyValue("scroll-behavior"), "smooth");
  assert.equal(h.page.style.getPropertyPriority("scroll-behavior"), "important");
  assert.equal(h.body.style.getPropertyValue("color"), "red");
  assert.equal(h.body.style.getPropertyValue("--purchase-page-top"), "");
  assert.equal(h.dialog.style.getPropertyValue("--purchase-viewport-height"), "");
  assert.equal(h.classes.has("purchase-open"), false);
});

test("repeated opens do not replace the saved position or accumulate resize listeners", () => {
  const h = harness(); h.controller.lock(); h.window.scrollY = 0; h.controller.lock();
  assert.equal(h.viewport.count("resize"), 1);
  assert.equal(h.controller.unlock(), true);
  assert.equal(h.controller.unlock(), false);
  assert.equal(h.window.scrollY, 1700);
  assert.equal(h.scrolls.length, 1);
  h.window.scrollY = 2600; h.controller.lock(); h.controller.unlock();
  assert.equal(h.window.scrollY, 2600);
  assert.equal(h.viewport.count("resize"), 0);
  assert.equal(h.viewport.count("scroll"), 0);
  assert.equal(h.window.count("resize"), 0);
  assert.equal(h.window.count("pageshow"), 0);
  assert.equal(h.window.count("focus"), 0);
  assert.equal(h.dialog.count("focusin"), 0);
});

test("closing cancels pending viewport work and does not relock the page", () => {
  const h = harness(); h.controller.lock(); h.viewport.emit("resize");
  assert.equal(h.frames.size, 1);
  h.controller.unlock(); h.flush(); h.viewport.emit("resize"); h.window.emit("resize");
  assert.equal(h.frames.size, 0);
  assert.equal(h.classes.size, 0);
  assert.equal(h.dialog.style.values.size, 0);
});

test("browser-bar movement updates the visible bounds without fighting user scrolling", () => {
  const h = harness(); h.controller.lock(); h.document.activeElement = h.field;
  h.viewport.offsetTop = 60; h.viewport.offsetLeft = 24;
  h.content.bounds.bottom = 400;
  h.viewport.emit("scroll"); h.flush();
  assert.equal(h.dialog.style.getPropertyValue("--purchase-viewport-top"), "60px");
  assert.equal(h.dialog.style.getPropertyValue("--purchase-viewport-left"), "24px");
  assert.equal(h.content.scrollTop, 0);
  assert.equal(h.scrolls.length, 0);
});

test("rotation and browsers without VisualViewport use the resized window bounds", () => {
  const h = harness({ visualViewport: false }); h.controller.lock();
  assert.equal(h.dialog.style.getPropertyValue("--purchase-viewport-height"), "844px");
  h.window.innerWidth = 844; h.window.innerHeight = 390;
  h.window.emit("resize"); h.flush();
  assert.equal(h.dialog.style.getPropertyValue("--purchase-viewport-height"), "390px");
  assert.equal(h.dialog.style.getPropertyValue("--purchase-viewport-width"), "844px");
  h.controller.unlock(); assert.equal(h.window.scrollY, 1700);
});

test("a tall message editor stays reachable in a short keyboard viewport", () => {
  const h = harness(); h.controller.lock();
  h.document.activeElement = h.field;
  h.field.height = 256;
  h.content.bounds = { top: 20, bottom: 210 };
  h.viewport.height = 230;
  h.viewport.emit("resize"); h.flush();
  assert.equal(h.field.getBoundingClientRect().top, 32);
  assert.equal(h.scrolls.length, 0);
});

test("a focused field above the visible area can be brought back without moving the page", () => {
  const h = harness(); h.controller.lock();
  h.document.activeElement = h.field; h.content.scrollTop = 490;
  h.dialog.emit("focusin"); h.flush();
  assert.equal(h.field.getBoundingClientRect().top, 32);
  assert.equal(h.scrolls.length, 0);
});

test("temporary zero viewport dimensions fall back to usable window dimensions", () => {
  const h = harness(); h.controller.lock();
  h.viewport.height = 0; h.viewport.width = 0; h.viewport.offsetTop = -20;
  h.viewport.emit("resize"); h.flush();
  assert.equal(h.dialog.style.getPropertyValue("--purchase-viewport-height"), "844px");
  assert.equal(h.dialog.style.getPropertyValue("--purchase-viewport-width"), "390px");
  assert.equal(h.dialog.style.getPropertyValue("--purchase-viewport-top"), "0px");
});

test("returning from a payment tab refreshes the visible screen bounds", () => {
  const h = harness(); h.controller.lock();
  h.viewport.height = 700; h.window.emit("focus"); h.flush();
  assert.equal(h.dialog.style.getPropertyValue("--purchase-viewport-height"), "700px");
  h.viewport.height = 740; h.window.emit("pageshow"); h.flush();
  assert.equal(h.dialog.style.getPropertyValue("--purchase-viewport-height"), "740px");
  assert.ok(h.classes.has("purchase-open"));
  assert.equal(h.scrolls.length, 0);
});
