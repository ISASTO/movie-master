import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import visitorWorker from "../src/index.js";
import { alignSnapshotSiteVisitors } from "../src/entry.js";
import { handleEnhancedRequest, handleGameEvent } from "../src/insights.js";
import {
  buildPublicLeaderboardPayload,
  handleLeaderboardRequest,
  validateLeaderboardName,
} from "../src/leaderboards.js";
import { ensureRunDataSchema } from "../src/run-data.js";
import { handleRunDetailsRequest, persistRunTelemetry } from "../src/run-telemetry.js";
import { handleStoreRequest } from "../src/store.js";

const VISITORS = Array.from({ length: 7 }, (_, index) =>
  `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
);

class D1Statement {
  constructor(database, sql, bindings = []) {
    this.database = database;
    this.sql = sql;
    this.bindings = bindings;
  }

  bind(...bindings) {
    return new D1Statement(this.database, this.sql, bindings);
  }

  async first() {
    return this.database.prepare(this.sql).get(...this.bindings) ?? null;
  }

  async run() {
    const result = this.database.prepare(this.sql).run(...this.bindings);
    return { success: true, meta: { changes: Number(result.changes ?? 0) } };
  }

  async all() {
    return { success: true, results: this.database.prepare(this.sql).all(...this.bindings) };
  }
}

class TestD1 {
  constructor(database = null, loadSchema = true) {
    this.database = database ?? new DatabaseSync(":memory:");
    if (loadSchema) {
      this.database.exec(readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));
    }
  }

  prepare(sql) {
    return new D1Statement(this.database, sql);
  }

  async batch(statements) {
    // Match D1's documented rollback of the entire failed batch.
    // https://developers.cloudflare.com/d1/worker-api/d1-database/#batch
    this.database.exec("BEGIN");
    try {
      const results = [];
      for (const statement of statements) {
        if (this.batchFailurePattern?.test(statement.sql)) {
          throw new Error(`Injected batch failure for ${statement.sql}`);
        }
        results.push(await statement.all());
      }
      this.database.exec("COMMIT");
      return results;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  close() {
    this.database.close();
  }
}

function visitRequest(visitorId) {
  return new Request("https://worker.example/visit", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://moviemaster.vip" },
    body: JSON.stringify({ visitorId }),
  });
}

function insertRun(db, { runId, visitorId, mode = "NORMAL", date = "2026-09-02", score, finishedAt }) {
  db.database.prepare(
    `INSERT OR IGNORE INTO game_starts
      (run_id, visitor_id, mode, visit_date, completed_at, started_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(runId, visitorId, mode, date, finishedAt, finishedAt);
  db.database.prepare(
    `INSERT INTO game_runs
      (run_id, visitor_id, mode, visit_date, score, finished_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(runId, visitorId, mode, date, score, finishedAt);
}

function gameRequest(body) {
  return new Request("https://worker.example/game-event", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://moviemaster.vip" },
    body: JSON.stringify(body),
  });
}

function leaderboardPost(path, body) {
  return new Request(`https://worker.example${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://moviemaster.vip" },
    body: JSON.stringify(body),
  });
}

function validSummary(overrides = {}) {
  return {
    score: 334,
    longestStreak: 1,
    gameTimeSeconds: 0,
    popcornCollected: 1,
    popcornMissed: 0,
    garbageDestroyed: 0,
    destroyedByStars: 0,
    destroyedByBlasts: 0,
    starsFired: 1,
    starsHit: 0,
    hitsTaken: 0,
    shieldBlocks: 0,
    blastsUsed: 0,
    powerupShield: 0,
    powerupSpeed: 0,
    powerupSuper: 0,
    powerupMagnet: 0,
    ...overrides,
  };
}

test("leaderboard names are uppercased, cleaned, filtered, and bounded", () => {
  assert.deepEqual(validateLeaderboardName("   "), { ok: true, name: "ANONYMOUS" });
  assert.deepEqual(validateLeaderboardName("  Movie   Apprentice  "), {
    ok: true,
    name: "MOVIE APPRENTICE",
  });
  assert.equal(validateLeaderboardName("MOVIE MASTER").code, "RESERVED_NAME");
  assert.equal(validateLeaderboardName("f.u.c.k").code, "NAME_NOT_ALLOWED");
  assert.equal(validateLeaderboardName("Scunthorpe").ok, true);
  assert.equal(validateLeaderboardName("X".repeat(25)).code, "NAME_TOO_LONG");
});

test("the public leaderboard migration upgrades the deployed table shape", () => {
  const database = new DatabaseSync(":memory:");
  database.exec(`
    CREATE TABLE game_starts (
      run_id TEXT PRIMARY KEY,
      visitor_id TEXT NOT NULL,
      mode TEXT NOT NULL,
      visit_date TEXT NOT NULL,
      started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE game_runs (
      run_id TEXT PRIMARY KEY,
      visitor_id TEXT NOT NULL,
      mode TEXT NOT NULL,
      visit_date TEXT NOT NULL,
      score INTEGER NOT NULL DEFAULT 0,
      finished_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  database.exec(readFileSync(
    new URL("../migrations/0001_public_leaderboards.sql", import.meta.url),
    "utf8",
  ));
  const columns = database.prepare("PRAGMA table_info(game_starts)").all()
    .map((column) => column.name);
  assert.ok(columns.includes("run_token"));
  assert.ok(columns.includes("completed_at"));
  assert.ok(database.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'leaderboard_profiles'",
  ).get());
  database.close();
});

test("the run lifecycle migration adds durable attempt state", () => {
  const database = new DatabaseSync(":memory:");
  database.exec(readFileSync(
    new URL("../migrations/0003_game_run_lifecycle.sql", import.meta.url),
    "utf8",
  ));
  const columns = new Set(
    database.prepare("PRAGMA table_info(game_run_lifecycle)").all().map((row) => row.name),
  );
  for (const column of ["run_id", "state", "end_reason", "score", "ended_at", "updated_at"]) {
    assert.ok(columns.has(column), `missing ${column}`);
  }
  assert.ok(database.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_game_run_lifecycle_updated'",
  ).get());
  database.close();
});

test("visitor reconciliation repairs interrupted legacy writes and cached totals", () => {
  const database = new DatabaseSync(":memory:");
  database.exec(readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));
  database.prepare(
    "INSERT INTO visitors (visitor_id, first_seen) VALUES (?, '2026-09-05 12:00:00')",
  ).run(VISITORS[0]);
  database.prepare("UPDATE visitor_stats SET visitor_count = 99 WHERE id = 1").run();
  database.prepare("UPDATE section_stats SET visitor_count = 77 WHERE section = 'game'").run();

  database.exec(readFileSync(
    new URL("../migrations/0002_reconcile_visitor_counters.sql", import.meta.url),
    "utf8",
  ));

  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM visitors").get().count, 1);
  assert.equal(database.prepare(
    "SELECT COUNT(*) AS count FROM visitor_sections WHERE section = 'site'",
  ).get().count, 1);
  assert.equal(database.prepare(
    "SELECT COUNT(*) AS count FROM visitor_daily WHERE section = 'site' AND visit_date = '2026-09-05'",
  ).get().count, 1);
  assert.equal(database.prepare(
    "SELECT visitor_count FROM visitor_stats WHERE id = 1",
  ).get().visitor_count, 1);
  assert.deepEqual(database.prepare(
    "SELECT section, visitor_count FROM section_stats ORDER BY section",
  ).all().map((row) => ({ ...row })), [
    { section: "game", visitor_count: 0 },
    { section: "site", visitor_count: 1 },
  ]);
  database.close();
});

test("a failed site-visit batch rolls back and a retry counts exactly once", async (t) => {
  const db = new TestD1();
  t.after(() => db.close());
  db.batchFailurePattern = /INSERT OR IGNORE INTO visitor_sections/;
  const originalError = console.error;
  console.error = () => {};
  t.after(() => { console.error = originalError; });

  const response = await visitorWorker.fetch(visitRequest(VISITORS[0]), { DB: db });
  assert.equal(response.status, 500);
  assert.equal(db.database.prepare("SELECT COUNT(*) AS count FROM visitors").get().count, 0);
  assert.equal(db.database.prepare("SELECT COUNT(*) AS count FROM visitor_sections").get().count, 0);
  assert.equal(db.database.prepare("SELECT COUNT(*) AS count FROM visitor_daily").get().count, 0);
  assert.equal(db.database.prepare(
    "SELECT visitor_count FROM visitor_stats WHERE id = 1",
  ).get().visitor_count, 0);
  assert.equal(db.database.prepare(
    "SELECT visitor_count FROM section_stats WHERE section = 'site'",
  ).get().visitor_count, 0);

  db.batchFailurePattern = null;
  const retry = await visitorWorker.fetch(visitRequest(VISITORS[0]), { DB: db });
  assert.equal(retry.status, 200);
  assert.deepEqual(await retry.json(), { count: 1, section: "site" });
  assert.equal(db.database.prepare("SELECT COUNT(*) AS count FROM visitors").get().count, 1);
  assert.equal(db.database.prepare("SELECT COUNT(*) AS count FROM visitor_sections").get().count, 1);
  assert.equal(db.database.prepare("SELECT COUNT(*) AS count FROM visitor_daily").get().count, 1);
  assert.equal(db.database.prepare(
    "SELECT visitor_count FROM section_stats WHERE section = 'site'",
  ).get().visitor_count, 1);
});

test("site visits keep legacy, section, and daily totals idempotently aligned", async (t) => {
  const db = new TestD1();
  t.after(() => db.close());

  assert.equal(
    (await visitorWorker.fetch(visitRequest(VISITORS[0]), { DB: db })).status,
    200,
  );
  assert.equal(
    (await visitorWorker.fetch(visitRequest(VISITORS[0]), { DB: db })).status,
    200,
  );

  assert.equal(db.database.prepare("SELECT COUNT(*) AS count FROM visitors").get().count, 1);
  assert.equal(db.database.prepare(
    "SELECT COUNT(*) AS count FROM visitor_sections WHERE section = 'site'",
  ).get().count, 1);
  assert.equal(db.database.prepare(
    "SELECT COUNT(*) AS count FROM visitor_daily WHERE section = 'site'",
  ).get().count, 1);
  assert.equal(db.database.prepare(
    "SELECT visitor_count FROM visitor_stats WHERE id = 1",
  ).get().visitor_count, 1);
  assert.equal(db.database.prepare(
    "SELECT visitor_count FROM section_stats WHERE section = 'site'",
  ).get().visitor_count, 1);
});

test("store conversion reads the shared main-site analytics total", async (t) => {
  const db = new TestD1();
  t.after(() => db.close());
  db.database.prepare(
    "INSERT INTO visitor_sections (visitor_id, section) VALUES (?, 'site')",
  ).run(VISITORS[0]);
  db.database.prepare(
    "INSERT INTO visitor_sections (visitor_id, section) VALUES (?, 'site')",
  ).run(VISITORS[1]);
  db.database.prepare("UPDATE visitor_stats SET visitor_count = 99 WHERE id = 1").run();

  const response = await handleStoreRequest(
    new Request("https://worker.example/store-stats", {
      headers: { Origin: "https://moviemaster.vip" },
    }),
    { DB: db },
  );
  assert.equal(response.status, 200);
  assert.equal((await response.json()).siteVisitors, 2);
});

test("dashboard snapshot conversions reuse one exact site denominator", () => {
  const storeStats = alignSnapshotSiteVisitors(
    { summary: { siteTotal: 215 } },
    { allTime: { uniqueClickers: 15 }, siteVisitors: 216, clickThroughRate: 0 },
  );
  assert.equal(storeStats.siteVisitors, 215);
  assert.equal(storeStats.clickThroughRate, (15 / 215) * 100);
});

test("run telemetry schema self-upgrades an already deployed game_runs table", async (t) => {
  const database = new DatabaseSync(":memory:");
  database.exec(`
    CREATE TABLE tracking_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE game_runs (
      run_id TEXT PRIMARY KEY,
      visitor_id TEXT NOT NULL,
      mode TEXT NOT NULL,
      visit_date TEXT NOT NULL,
      score INTEGER NOT NULL DEFAULT 0,
      finished_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  const db = new TestD1(database, false);
  t.after(() => db.close());
  await ensureRunDataSchema(db);
  const columns = new Set(database.prepare("PRAGMA table_info(game_runs)").all().map((row) => row.name));
  for (const column of [
    "device_type", "browser_name", "control_method", "quality_level",
    "country_code", "region", "region_code", "city", "latitude", "longitude",
  ]) {
    assert.ok(columns.has(column), `missing ${column}`);
  }
  assert.ok(database.prepare(
    "SELECT value FROM tracking_meta WHERE key = 'run_telemetry_started_at'",
  ).get());
});

test("public boards keep one best run per browser and include the viewer neighborhood", async (t) => {
  const db = new TestD1();
  t.after(() => db.close());
  const scores = [300, 700, 600, 500, 400, 350, 200];
  scores.forEach((score, index) => insertRun(db, {
    runId: `20000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    visitorId: VISITORS[index],
    score,
    finishedAt: `2026-09-02 12:0${index}:00`,
  }));
  insertRun(db, {
    runId: "20000000-0000-4000-8000-000000000099",
    visitorId: VISITORS[0],
    score: 100,
    finishedAt: "2026-09-02 11:00:00",
  });
  db.database.prepare(
    "INSERT INTO leaderboard_profiles (visitor_id, display_name) VALUES (?, ?)",
  ).run(VISITORS[0], "MOVIE APPRENTICE");

  const payload = await buildPublicLeaderboardPayload(
    db,
    VISITORS[0],
    new Date("2026-09-02T18:00:00Z"),
  );
  const board = payload.boards.NORMAL.allTime;
  assert.equal(board.top.length, 5);
  assert.equal(board.viewer.rank, 6);
  assert.deepEqual(board.nearby.map((entry) => entry.order), [6, 7]);
  assert.equal(board.nearby[0].name, "MOVIE APPRENTICE");
  assert.equal(payload.boards.NORMAL.daily.viewer.rank, 6);
});

test("equal scores share a displayed rank", async (t) => {
  const db = new TestD1();
  t.after(() => db.close());
  insertRun(db, {
    runId: "30000000-0000-4000-8000-000000000001",
    visitorId: VISITORS[0], score: 500, finishedAt: "2026-09-02 12:00:00",
  });
  insertRun(db, {
    runId: "30000000-0000-4000-8000-000000000002",
    visitorId: VISITORS[1], score: 500, finishedAt: "2026-09-02 12:01:00",
  });
  const payload = await buildPublicLeaderboardPayload(db, VISITORS[1]);
  assert.deepEqual(payload.boards.NORMAL.allTime.top.map((entry) => entry.rank), [1, 1]);
});

test("profile updates rename historical leaderboard rows", async (t) => {
  const db = new TestD1();
  t.after(() => db.close());
  insertRun(db, {
    runId: "40000000-0000-4000-8000-000000000001",
    visitorId: VISITORS[0], score: 900, finishedAt: "2026-09-02 12:00:00",
  });
  const response = await handleLeaderboardRequest(
    leaderboardPost("/leaderboard-profile", { visitorId: VISITORS[0], name: "Movie Apprentice" }),
    { DB: db },
  );
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.profile.name, "MOVIE APPRENTICE");
  assert.equal(payload.boards.NORMAL.allTime.top[0].name, "MOVIE APPRENTICE");
});

test("non-anonymous leaderboard names are exclusive and released when renamed", async (t) => {
  const db = new TestD1();
  t.after(() => db.close());

  const first = await handleLeaderboardRequest(
    leaderboardPost("/leaderboard-profile", { visitorId: VISITORS[0], name: "Movie Apprentice" }),
    { DB: db },
  );
  assert.equal(first.status, 200);

  const collision = await handleLeaderboardRequest(
    leaderboardPost("/leaderboard-profile", { visitorId: VISITORS[1], name: "movie apprentice" }),
    { DB: db },
  );
  assert.equal(collision.status, 409);
  assert.equal((await collision.json()).message, "NAME ALREADY TAKEN");

  const rename = await handleLeaderboardRequest(
    leaderboardPost("/leaderboard-profile", { visitorId: VISITORS[0], name: "THE APPRENTICE" }),
    { DB: db },
  );
  assert.equal(rename.status, 200);

  const reclaimed = await handleLeaderboardRequest(
    leaderboardPost("/leaderboard-profile", { visitorId: VISITORS[1], name: "MOVIE APPRENTICE" }),
    { DB: db },
  );
  assert.equal(reclaimed.status, 200);
});

test("analytics uses public names but preserves generated IDs for anonymous players", async (t) => {
  const db = new TestD1();
  t.after(() => db.close());
  insertRun(db, {
    runId: "41000000-0000-4000-8000-000000000001",
    visitorId: VISITORS[0], score: 900, finishedAt: "2026-09-02 12:00:00",
  });
  insertRun(db, {
    runId: "41000000-0000-4000-8000-000000000002",
    visitorId: VISITORS[1], score: 800, finishedAt: "2026-09-02 12:01:00",
  });
  db.database.prepare(
    "INSERT INTO leaderboard_profiles (visitor_id, display_name) VALUES (?, ?)",
  ).run(VISITORS[0], "NAMED PLAYER");

  const response = await handleLeaderboardRequest(
    new Request("https://worker.example/mode-leaderboards", {
      headers: { Origin: "https://moviemaster.vip" },
    }),
    { DB: db },
  );
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.standard[0].player, "NAMED PLAYER");
  assert.match(payload.standard[1].player, /^PLAYER [0-9A-F]{6}$/);
});

test("legacy browser bests import once into all-time boards only", async (t) => {
  const db = new TestD1();
  t.after(() => db.close());
  db.database.prepare(
    `INSERT INTO visitor_sections (visitor_id, section, first_seen)
     VALUES (?, 'game', '2026-09-02 12:00:00')`,
  ).run(VISITORS[0]);

  const first = await handleLeaderboardRequest(
    leaderboardPost("/legacy-leaderboard-import", {
      visitorId: VISITORS[0],
      scores: { NORMAL: 12345, HARDCORE: 6789 },
    }),
    { DB: db },
  );
  assert.equal(first.status, 200);
  const firstPayload = await first.json();
  assert.equal(firstPayload.eligible, true);
  assert.equal(firstPayload.leaderboards.boards.NORMAL.allTime.viewer.score, 12345);
  assert.equal(firstPayload.leaderboards.boards.HARDCORE.allTime.viewer.score, 6789);
  assert.equal(firstPayload.leaderboards.boards.NORMAL.daily.viewer, null);

  const retry = await handleLeaderboardRequest(
    leaderboardPost("/legacy-leaderboard-import", {
      visitorId: VISITORS[0],
      scores: { NORMAL: 99999, HARDCORE: 99999 },
    }),
    { DB: db },
  );
  assert.equal(retry.status, 200);
  const stored = db.database.prepare(
    "SELECT score FROM legacy_leaderboard_scores WHERE visitor_id = ? AND mode = 'NORMAL'",
  ).get(VISITORS[0]);
  assert.equal(stored.score, 12345);
});

test("analytics returns the 15 most recent recorded games", async (t) => {
  const db = new TestD1();
  t.after(() => db.close());
  for (let index = 0; index < 17; index += 1) {
    insertRun(db, {
      runId: `42000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      visitorId: VISITORS[index % VISITORS.length],
      mode: index % 2 ? "HARDCORE" : "NORMAL",
      score: 1000 + index,
      finishedAt: `2026-09-02 12:${String(index).padStart(2, "0")}:00`,
    });
  }
  const response = await handleLeaderboardRequest(
    new Request("https://worker.example/mode-leaderboards", {
      headers: { Origin: "https://moviemaster.vip" },
    }),
    { DB: db },
  );
  const payload = await response.json();
  assert.equal(payload.recent.length, 15);
  assert.equal(payload.recent[0].score, 1016);
  assert.equal(payload.recent.at(-1).score, 1002);
  assert.ok(payload.recent.every((run) =>
    run.runId && run.finishedAt && run.status === "FINISHED"));
});

test("version-two runs require one-use receipts and return placements", async (t) => {
  const db = new TestD1();
  t.after(() => db.close());
  const runId = "50000000-0000-4000-8000-000000000001";
  const startResponse = await handleGameEvent(gameRequest({
    event: "start", visitorId: VISITORS[0], runId, mode: "NORMAL", receiptVersion: 2,
  }), { DB: db });
  assert.equal(startResponse.status, 200);
  const start = await startResponse.json();
  assert.match(start.runToken, /^[0-9a-f-]{36}$/);
  const repeatedStart = await handleGameEvent(gameRequest({
    event: "start", visitorId: VISITORS[0], runId, mode: "NORMAL", receiptVersion: 2,
  }), { DB: db });
  assert.equal(repeatedStart.status, 200);
  const repeated = await repeatedStart.json();
  assert.equal(repeated.duplicate, true);
  assert.equal(repeated.runToken, start.runToken);

  const finishBody = {
    event: "finish", visitorId: VISITORS[0], runId, runToken: start.runToken,
    mode: "NORMAL", ...validSummary(),
  };
  const finishResponse = await handleGameEvent(gameRequest(finishBody), { DB: db });
  assert.equal(finishResponse.status, 200);
  const finished = await finishResponse.json();
  assert.equal(finished.leaderboards.boards.NORMAL.allTime.viewer.rank, 1);
  const duplicate = await handleGameEvent(gameRequest(finishBody), { DB: db });
  assert.equal(duplicate.status, 200);
  assert.equal((await duplicate.json()).duplicate, true);
});

test("every recorded ending reason is leaderboard-eligible and anonymous by default", async (t) => {
  const db = new TestD1();
  t.after(() => db.close());
  const reasons = ["garbage", "missed-popcorn", "manual", "reset", "exit", "pagehide"];

  for (let index = 0; index < reasons.length; index += 1) {
    const runId = `51000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
    const start = await (await handleGameEvent(gameRequest({
      event: "start",
      visitorId: VISITORS[0],
      runId,
      mode: "NORMAL",
      receiptVersion: 2,
    }), { DB: db })).json();
    const finish = await handleGameEvent(gameRequest({
      event: "finish",
      visitorId: VISITORS[0],
      runId,
      runToken: start.runToken,
      mode: "NORMAL",
      endReason: reasons[index],
      ...validSummary({ score: 334 + index }),
    }), { DB: db });
    assert.equal(finish.status, 200, reasons[index]);
  }

  assert.equal(db.database.prepare("SELECT COUNT(*) AS count FROM game_runs").get().count, 6);
  assert.deepEqual(db.database.prepare(
    "SELECT end_reason FROM game_run_lifecycle ORDER BY run_id",
  ).all().map((row) => row.end_reason), reasons);
  const board = await buildPublicLeaderboardPayload(db, VISITORS[0]);
  assert.equal(board.boards.NORMAL.allTime.top[0].name, "ANONYMOUS");
  assert.equal(board.boards.NORMAL.allTime.top[0].score, 339);
});

test("checkpoints and start-only attempts appear privately, then a finish becomes public", async (t) => {
  const db = new TestD1();
  t.after(() => db.close());
  const checkpointRunId = "52000000-0000-4000-8000-000000000001";
  const startOnlyRunId = "52000000-0000-4000-8000-000000000002";
  const checkpointStart = await (await handleGameEvent(gameRequest({
    event: "start",
    visitorId: VISITORS[0],
    runId: checkpointRunId,
    mode: "HARDCORE",
    receiptVersion: 2,
  }), { DB: db })).json();
  await handleGameEvent(gameRequest({
    event: "start",
    visitorId: VISITORS[1],
    runId: startOnlyRunId,
    mode: "NORMAL",
    receiptVersion: 2,
  }), { DB: db });

  const checkpoint = await handleGameEvent(gameRequest({
    event: "checkpoint",
    visitorId: VISITORS[0],
    runId: checkpointRunId,
    runToken: checkpointStart.runToken,
    mode: "HARDCORE",
    endReason: "hidden",
    ...validSummary({ score: 500, hitsTaken: 1 }),
  }), { DB: db });
  assert.equal(checkpoint.status, 200);
  assert.equal(db.database.prepare("SELECT COUNT(*) AS count FROM game_runs").get().count, 0);

  const privateResponse = await handleLeaderboardRequest(
    new Request("https://worker.example/mode-leaderboards", {
      headers: { Origin: "https://moviemaster.vip" },
    }),
    { DB: db },
  );
  const privatePayload = await privateResponse.json();
  assert.deepEqual(new Set(privatePayload.recent.map((run) => run.status)),
    new Set(["CHECKPOINT", "STARTED_ONLY"]));
  const checkpointRow = privatePayload.recent.find((run) => run.runId === checkpointRunId);
  assert.equal(checkpointRow.score, 500);
  assert.equal(checkpointRow.endReason, "hidden");

  const checkpointDetails = await handleRunDetailsRequest(
    new Request(`https://worker.example/run-details?runId=${checkpointRunId}`, {
      headers: { Origin: "https://moviemaster.vip" },
    }),
    { DB: db },
  );
  assert.equal((await checkpointDetails.json()).status, "CHECKPOINT");
  const startOnlyDetails = await handleRunDetailsRequest(
    new Request(`https://worker.example/run-details?runId=${startOnlyRunId}`, {
      headers: { Origin: "https://moviemaster.vip" },
    }),
    { DB: db },
  );
  assert.equal((await startOnlyDetails.json()).status, "STARTED_ONLY");

  const finish = await handleGameEvent(gameRequest({
    event: "finish",
    visitorId: VISITORS[0],
    runId: checkpointRunId,
    runToken: checkpointStart.runToken,
    mode: "HARDCORE",
    endReason: "exit",
    ...validSummary({ score: 500, hitsTaken: 1 }),
  }), { DB: db });
  assert.equal(finish.status, 200);
  const finished = await finish.json();
  assert.equal(finished.leaderboards.boards.HARDCORE.allTime.top[0].score, 500);
  assert.deepEqual({ ...db.database.prepare(
    "SELECT state, end_reason FROM game_run_lifecycle WHERE run_id = ?",
  ).get(checkpointRunId) }, { state: "FINISHED", end_reason: "exit" });
});

test("game analytics reports games played without a completion-rate metric", async (t) => {
  const db = new TestD1();
  t.after(() => db.close());
  const runId = "53000000-0000-4000-8000-000000000001";
  const start = await (await handleGameEvent(gameRequest({
    event: "start",
    visitorId: VISITORS[0],
    runId,
    mode: "NORMAL",
    receiptVersion: 2,
  }), { DB: db })).json();
  await handleGameEvent(gameRequest({
    event: "finish",
    visitorId: VISITORS[0],
    runId,
    runToken: start.runToken,
    mode: "NORMAL",
    endReason: "reset",
    ...validSummary(),
  }), { DB: db });

  const response = await handleEnhancedRequest(
    new Request("https://worker.example/details", {
      headers: { Origin: "https://moviemaster.vip" },
    }),
    { DB: db },
    null,
    visitorWorker,
  );
  assert.equal(response.status, 200);
  const game = (await response.json()).game;
  assert.equal(game.starts, 1);
  assert.equal(game.gamesPlayed, 1);
  assert.equal(game.completed, game.gamesPlayed);
  assert.equal(game.completedToday, game.gamesPlayedToday);
  assert.equal(game.uniquePlayers, 1);
  assert.equal("completionRate" in game, false);
});

test("unstarted, incorrectly receipted, and inconsistent runs are rejected", async (t) => {
  const db = new TestD1();
  t.after(() => db.close());
  const absent = await handleGameEvent(gameRequest({
    event: "finish",
    visitorId: VISITORS[0],
    runId: "60000000-0000-4000-8000-000000000001",
    mode: "NORMAL",
    ...validSummary(),
  }), { DB: db });
  assert.equal(absent.status, 409);

  const runId = "60000000-0000-4000-8000-000000000002";
  const start = await (await handleGameEvent(gameRequest({
    event: "start", visitorId: VISITORS[0], runId, mode: "NORMAL", receiptVersion: 2,
  }), { DB: db })).json();
  const wrongReceipt = await handleGameEvent(gameRequest({
    event: "finish", visitorId: VISITORS[0], runId,
    runToken: "70000000-0000-4000-8000-000000000001", mode: "NORMAL", ...validSummary(),
  }), { DB: db });
  assert.equal(wrongReceipt.status, 409);
  const inconsistent = await handleGameEvent(gameRequest({
    event: "finish", visitorId: VISITORS[0], runId, runToken: start.runToken,
    mode: "NORMAL", ...validSummary({ garbageDestroyed: 2 }),
  }), { DB: db });
  assert.equal(inconsistent.status, 422);

  const scoreRunId = "60000000-0000-4000-8000-000000000003";
  const scoreStart = await (await handleGameEvent(gameRequest({
    event: "start", visitorId: VISITORS[0], runId: scoreRunId,
    mode: "NORMAL", receiptVersion: 2,
  }), { DB: db })).json();
  const impossibleScore = await handleGameEvent(gameRequest({
    event: "finish", visitorId: VISITORS[0], runId: scoreRunId,
    runToken: scoreStart.runToken, mode: "NORMAL", ...validSummary({ score: 801 }),
  }), { DB: db });
  assert.equal(impossibleScore.status, 422);
});

test("run details include telemetry, public identity, source, and location fallback", async (t) => {
  const db = new TestD1();
  t.after(() => db.close());
  const runId = "70000000-0000-4000-8000-000000000001";
  db.database.prepare(
    `INSERT INTO visitor_locations
      (visitor_id, section, country_code, region, city, latitude, longitude)
     VALUES (?, 'game', 'US', 'Minnesota', 'Edina', 44.9, -93.3)`,
  ).run(VISITORS[0]);
  db.database.prepare(
    "INSERT INTO game_source_first (visitor_id, source) VALUES (?, 'site')",
  ).run(VISITORS[0]);
  db.database.prepare(
    `INSERT INTO game_starts (run_id, visitor_id, mode, visit_date, started_at, completed_at)
     VALUES (?, ?, 'NORMAL', '2026-09-02', '2026-09-02 12:00:00', '2026-09-02 12:05:00')`,
  ).run(runId, VISITORS[0]);
  db.database.prepare(
    `INSERT INTO game_runs (
       run_id, visitor_id, mode, visit_date, score, longest_streak, game_time_seconds,
       popcorn_collected, popcorn_missed, garbage_destroyed, destroyed_by_stars,
       destroyed_by_blasts, stars_fired, stars_hit, hits_taken, shield_blocks,
       blasts_used, powerup_shield, powerup_speed, powerup_super, powerup_magnet,
       finished_at
     ) VALUES (?, ?, 'NORMAL', '2026-09-02', 12345, 30, 300, 40, 2, 10, 8, 2,
               100, 50, 3, 4, 5, 1, 2, 3, 4, '2026-09-02 12:05:00')`,
  ).run(runId, VISITORS[0]);
  db.database.prepare(
    "INSERT INTO leaderboard_profiles (visitor_id, display_name) VALUES (?, 'MOVIE APPRENTICE')",
  ).run(VISITORS[0]);

  await persistRunTelemetry(db, {
    runId,
    visitorId: VISITORS[0],
    deviceType: "WINDOWS PC",
    browserName: "CHROME",
    controlMethod: "CONTROLLER",
    qualityLevel: "HIGH",
    countryCode: null,
    region: null,
    regionCode: null,
    city: null,
    latitude: null,
    longitude: null,
  });

  const response = await handleRunDetailsRequest(
    new Request(`https://worker.example/run-details?runId=${runId}`, {
      headers: { Origin: "https://moviemaster.vip" },
    }),
    { DB: db },
  );
  assert.equal(response.status, 200);
  const run = await response.json();
  assert.equal(run.player, "MOVIE APPRENTICE");
  assert.match(run.generatedPlayerId, /^PLAYER [0-9A-F]{6}$/);
  assert.equal(run.source, "site");
  assert.equal(run.location.city, "Edina");
  assert.equal(run.location.countryCode, "US");
  assert.equal(run.device.type, "WINDOWS PC");
  assert.equal(run.device.controlMethod, "CONTROLLER");
  assert.equal(run.stats.score, 12345);
  assert.equal(run.stats.starAccuracy, 50);
  assert.equal(run.stats.powerups.magnet, 4);
});

test("legacy cached clients remain compatible during rollout", async (t) => {
  const db = new TestD1();
  t.after(() => db.close());
  const runId = "80000000-0000-4000-8000-000000000001";
  const start = await (await handleGameEvent(gameRequest({
    event: "start", visitorId: VISITORS[0], runId, mode: "HARDCORE",
  }), { DB: db })).json();
  assert.equal(start.runToken, null);
  const finish = await handleGameEvent(gameRequest({
    event: "finish", visitorId: VISITORS[0], runId, mode: "HARDCORE",
    ...validSummary({ hitsTaken: 1 }),
  }), { DB: db });
  assert.equal(finish.status, 200);
});

test("browser lifecycle wiring queues retries and covers every game stop path", () => {
  const recordsSource = readFileSync(new URL("../../game-records.js", import.meta.url), "utf8");
  const gameSource = readFileSync(new URL("../../game/game.js", import.meta.url), "utf8");
  const analyticsHtml = readFileSync(new URL("../../analytics/index.html", import.meta.url), "utf8");

  assert.match(recordsSource, /movie-master-pending-game-events-v1/);
  assert.match(recordsSource, /navigator\.sendBeacon/);
  assert.match(recordsSource, /movie-master:game-run-checkpoint/);
  assert.match(recordsSource, /movie-master:game-run-finalized/);
  assert.match(gameSource, /function endGame\(reason = "garbage"\)/);
  for (const reason of ["missed-popcorn", "manual", "reset", "exit", "pagehide"]) {
    assert.match(gameSource, new RegExp(`(?:endGame|finalizeRunForTracking)\\(\"${reason}\"`));
  }
  assert.match(analyticsHtml, />GAMES PLAYED</);
  assert.doesNotMatch(analyticsHtml, /RUN COMPLETION RATE/);
});
