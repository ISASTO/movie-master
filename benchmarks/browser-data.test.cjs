const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const visitorId = "10000000-0000-4000-8000-000000000001";
const runToken = "20000000-0000-4000-8000-000000000001";
const pendingKey = "movie-master-pending-game-events-v1";
const settle = async () => {
  for (let i = 0; i < 3; i += 1) await new Promise(setImmediate);
};

class Element {
  constructor() {
    this.textContent = "";
    this.hidden = true;
    this.children = [];
    this.style = {};
    this.dataset = {};
    this.attributes = {};
    this.classes = new Set();
    this.classList = {
      contains: (name) => this.classes.has(name),
      add: (name) => this.classes.add(name),
      toggle: (name, on) => on ? this.classes.add(name) : this.classes.delete(name),
    };
  }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  setAttribute(key, value) { this.attributes[key] = value; }
  addEventListener() {}
  querySelector() { return null; }
}

function harness(file, respond, pending = []) {
  const elements = new Map();
  const get = (id) => {
    if (!elements.has(id)) elements.set(id, new Element());
    return elements.get(id);
  };
  const listeners = new Map();
  const events = [];
  const requests = [];
  const beacons = [];
  const timers = new Map();
  let timerId = 0;
  const storage = new Map([
    ["movie-master-visitor-id", visitorId],
    [pendingKey, JSON.stringify(pending)],
  ]);
  const window = {
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
    },
    setTimeout: (callback, delay) => {
      timers.set(++timerId, { callback, delay });
      return timerId;
    },
    clearTimeout: (id) => timers.delete(id),
    setInterval: () => ++timerId,
    clearInterval: () => {},
    matchMedia: () => ({ matches: false }),
    addEventListener: (name, callback) => {
      if (!listeners.has(name)) listeners.set(name, []);
      listeners.get(name).push(callback);
    },
    dispatchEvent: (event) => {
      events.push(event);
      for (const callback of listeners.get(event.type) ?? []) callback(event);
    },
  };
  const document = {
    documentElement: new Element(),
    visibilityState: "visible",
    getElementById: get,
    querySelector: (selector) => selector.startsWith("#") ? get(selector.slice(1)) : null,
    querySelectorAll: () => [],
    createElement: () => new Element(),
    createElementNS: () => new Element(),
    addEventListener: () => {},
  };
  const context = {
    window,
    document,
    navigator: {
      getGamepads: () => [],
      sendBeacon: (url, body) => { beacons.push({ url, body }); return true; },
    },
    crypto: { randomUUID },
    console,
    Blob,
    AbortController,
    CustomEvent: class {
      constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
    },
    MutationObserver: class { observe() {} },
    fetch: async (url, options = {}) => {
      const body = options.body ? JSON.parse(options.body) : null;
      requests.push({ url, body, options });
      const response = await respond(body, requests.length);
      return {
        ok: (response.status ?? 200) < 400,
        status: response.status ?? 200,
        json: async () => response.payload ?? { ok: true, runToken },
      };
    },
  };
  get("stat-mode").textContent = "NORMAL";
  get("stat-game-time").textContent = "0:02";
  vm.runInNewContext(readFileSync(path.join(root, file), "utf8"), context, { filename: file });
  return {
    get, requests, beacons, events, timers,
    pending: () => JSON.parse(storage.get(pendingKey)),
    dispatch: (type, detail = {}) => window.dispatchEvent({ type, detail }),
  };
}

test("analytics displays existing games from the pre-rollout Worker", async () => {
  const page = harness("analytics/details.js", () => ({
    payload: { game: { completed: 57, completedToday: 4 } },
  }));
  await settle();
  assert.equal(page.get("game-stat-games-played").textContent, "57");
  assert.equal(page.get("game-games-played-detail").textContent, "4 today");
});

test("analytics prefers current counts, including real zeroes, over legacy aliases", async () => {
  const page = harness("analytics/details.js", () => ({
    payload: { game: { gamesPlayed: 0, gamesPlayedToday: 0, completed: 57, completedToday: 4 } },
  }));
  await settle();
  assert.equal(page.get("game-stat-games-played").textContent, "0");
  assert.equal(page.get("game-games-played-detail").textContent, "0 today");
});

test("recent-run styling and result labels work with both Worker versions", async () => {
  const page = harness("analytics/mode-leaderboards.js", () => ({ payload: { recent: [
    { finishedAt: "2026-09-06T12:00:00Z", score: 5 },
    { status: "CHECKPOINT", score: 6 },
    { status: "STARTED_ONLY" },
    { status: "FINISHED", endReason: "exit", score: 7 },
  ] } }));
  await settle();
  const rows = page.get("recent-runs-body").children;
  assert.deepEqual(rows.map((row) => row.children[3].textContent), [
    "FINISHED", "LAST SEEN PAUSED", "STARTED ONLY", "LEFT GAME",
  ]);
  assert.equal(rows[0].classes.has("run-status-finished"), true);
  assert.equal(rows[2].classes.has("run-status-started-only"), true);
});

for (const reason of ["garbage", "missed-popcorn", "manual", "reset", "exit", "pagehide"]) {
  test(`client records ${reason} exactly once and keeps unload delivery alive`, async () => {
    const page = harness("game-records.js", () => ({}));
    page.dispatch("movie-master:game-run-started");
    await settle();
    assert.equal(page.requests[0]?.body.event, "start");
    page.get("stat-score").textContent = "123";
    page.dispatch("movie-master:game-run-finalized", { reason });
    page.dispatch("movie-master:game-run-finalized", { reason });
    await settle();
    assert.deepEqual(page.requests.map((request) => request.body.event), ["start", "finish"]);
    const final = page.requests[1];
    assert.equal(final.body.endReason, reason);
    assert.equal(final.body.runToken, runToken);
    assert.equal(final.body.score, 123);
    assert.equal(final.options.keepalive, true);
    assert.equal(page.beacons.length, ["exit", "pagehide"].includes(reason) ? 1 : 0);
    if (page.beacons.length) {
      assert.equal(page.beacons[0].body.type, "text/plain;charset=utf-8");
      assert.deepEqual(JSON.parse(await page.beacons[0].body.text()), final.body);
    }
    assert.deepEqual(page.pending(), []);
  });
}

test("a quick exit before the start response preserves and attaches its receipt", async () => {
  let releaseStart;
  const page = harness("game-records.js", (body) => body.event === "start"
    ? new Promise((resolve) => { releaseStart = resolve; }) : {});
  page.dispatch("movie-master:game-run-started");
  await settle();
  page.dispatch("movie-master:game-run-finalized", { reason: "exit" });
  assert.deepEqual(page.pending().map((entry) => entry.body.event), ["start", "finish"]);
  releaseStart({});
  await settle();
  assert.equal(page.requests[1].body.runToken, runToken);
  assert.deepEqual(page.pending(), []);
});

test("a missing receipt does not block another game's start or finish", async () => {
  const oldRunId = randomUUID();
  const page = harness("game-records.js", (body) => body.runId === oldRunId
    ? { status: 409, payload: { error: "Invalid run receipt" } } : {}, [{
    id: `${oldRunId}:finish`, createdAt: Date.now(),
    body: { event: "finish", runId: oldRunId, visitorId },
  }]);
  page.dispatch("movie-master:game-run-started");
  await settle();
  page.dispatch("movie-master:game-run-finalized", { reason: "manual" });
  await settle();
  const newRequests = page.requests.filter((request) => request.body.runId !== oldRunId);
  assert.deepEqual(newRequests.map((request) => request.body.event), ["start", "finish"]);
  assert.equal(newRequests[1].body.runToken, runToken);
  assert.equal(page.pending().length, 1);
  assert.equal(page.pending()[0].body.runId, oldRunId);
});

test("an earlier checkpoint response cannot erase a newer snapshot", async () => {
  let releaseCheckpoint;
  const page = harness("game-records.js", (body) => {
    if (body.event === "checkpoint" && body.score === 100) {
      return new Promise((resolve) => { releaseCheckpoint = resolve; });
    }
    return {};
  });
  page.dispatch("movie-master:game-run-started");
  await settle();
  page.get("stat-score").textContent = "100";
  page.dispatch("movie-master:game-run-checkpoint");
  await settle();
  page.get("stat-score").textContent = "200";
  page.dispatch("movie-master:game-run-checkpoint");
  releaseCheckpoint({});
  await settle();
  assert.deepEqual(page.requests.filter((request) => request.body.event === "checkpoint")
    .map((request) => request.body.score), [100, 200]);
  assert.equal(page.requests.some((request) => request.body.event === "finish"), false);
  assert.deepEqual(page.pending(), []);
});

test("a persisted early exit is replayed in start-before-finish order on reload", async () => {
  const runId = randomUUID();
  const pending = ["start", "finish"].map((event) => ({
    id: `${runId}:${event}`, createdAt: Date.now(),
    body: { event, runId, visitorId, mode: "NORMAL", endReason: "pagehide", score: 250 },
  }));
  const page = harness("game-records.js", () => ({}), pending);
  await settle();
  assert.deepEqual(page.requests.map((request) => request.body.event), ["start", "finish"]);
  assert.equal(page.requests[1].body.runToken, runToken);
  assert.equal(page.requests[1].body.score, 250);
  assert.deepEqual(page.pending(), []);
});
