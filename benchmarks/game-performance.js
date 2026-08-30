#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const inspector = require("node:inspector");

function readOption(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function readIntegerOption(name, fallback) {
  const value = Number.parseInt(readOption(name, ""), 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

const repositoryRoot = path.resolve(readOption("root", path.join(__dirname, "..")));
const outputPath = readOption("output");
const profileDirectory = readOption("profile-dir");
const label = readOption("label", "unlabeled");
const scenarioFilter = readOption("scenario");
const sampleCount = readIntegerOption("samples", 25);
const warmupCount = readIntegerOption("warmups", 7);
const source = fs.readFileSync(path.join(repositoryRoot, "game", "game.js"), "utf8");

const hook = String.raw`
  globalThis.__performanceGame = {
    buildCollisionScene(enemyCount, projectileCount) {
      gameState = "running";
      enemies.length = 0;
      recycleAllProjectiles();
      recycleAllParticles();
      floatingTexts.length = 0;
      pickups.length = 0;
      powerups.length = 0;
      blast = null;
      player.x = world.width * 0.5;
      player.y = world.bounds.bottom - scaleWorld(120);
      player.vx = scaleWorld(95);
      player.vy = scaleWorld(-32);
      player.moving = true;
      player.invulnerable = 999;

      const columns = Math.max(12, Math.ceil(Math.sqrt(enemyCount * 1.8)));
      const rows = Math.ceil(enemyCount / columns);
      const usableWidth = Math.max(100, world.bounds.right - world.bounds.left - 90);
      const usableHeight = Math.max(100, world.bounds.bottom - world.bounds.top - 110);
      for (let index = 0; index < enemyCount; index += 1) {
        const column = index % columns;
        const row = Math.floor(index / columns);
        const kind = index % 5 === 0 ? "heavy" : index % 3 === 0 ? "fast" : "standard";
        const radius = scaleWorld(kind === "heavy" ? 31 : kind === "fast" ? 18 : 23);
        enemies.push({
          x: world.bounds.left + 45 + (column / Math.max(1, columns - 1)) * usableWidth,
          y: world.bounds.top + 42 + (row / Math.max(1, rows - 1)) * usableHeight,
          vx: 0,
          vy: 0,
          radius,
          speed: scaleWorld(190),
          hp: kind === "heavy" ? 3 : 1,
          maxHp: kind === "heavy" ? 3 : 1,
          color: kind === "heavy" ? "#513660" : kind === "fast" ? "#a53a29" : "#6d5747",
          scoreValue: kind === "heavy" ? 105 : kind === "fast" ? 52 : 34,
          kind,
          mode: index % 11 === 0 ? "rush" : "chase",
          phase: index * 0.371,
          hitFlash: 0,
          blastMarked: false,
          collisionStamp: 0,
          destroyed: false,
        });
      }

      const projectileColumns = Math.max(16, Math.ceil(Math.sqrt(projectileCount * 1.7)));
      const projectileRows = Math.ceil(projectileCount / projectileColumns);
      for (let index = 0; index < projectileCount; index += 1) {
        const column = index % projectileColumns;
        const row = Math.floor(index / projectileColumns);
        const projectile = acquireProjectile();
        projectile.x = world.bounds.left + 23
          + (column / Math.max(1, projectileColumns - 1)) * (usableWidth + 44);
        projectile.y = world.bounds.top + 19
          + (row / Math.max(1, projectileRows - 1)) * (usableHeight + 50);
        projectile.vx = 0;
        projectile.vy = 0;
        projectile.radius = scaleWorld(9 + (index % 4));
        projectile.color = index % 3 === 0 ? COLORS.super : COLORS.goldBright;
        projectile.rotation = ((index % 80) * 0.071) % STAR_ROTATION_PERIOD;
        projectiles.push(projectile);
      }
    },

    buildEnemyAiScene(enemyCount) {
      this.buildCollisionScene(enemyCount, 0);
      player.x = world.width * 0.5;
      player.y = world.height * 0.5;
      player.vx = scaleWorld(260);
      player.vy = scaleWorld(-115);
      for (let index = 0; index < enemies.length; index += 1) {
        const enemy = enemies[index];
        const angle = (index / enemies.length) * Math.PI * 2;
        const distance = scaleWorld(260 + (index % 9) * 22);
        enemy.x = player.x + Math.cos(angle) * distance;
        enemy.y = player.y + Math.sin(angle) * distance;
        enemy.mode = "chase";
      }
    },

    buildRenderScene(enemyCount, projectileCount, particleCount, floatingTextCount) {
      this.buildCollisionScene(enemyCount, projectileCount);
      particles.length = 0;
      floatingTexts.length = 0;
      shieldTime = 12;
      shieldHits = 3;
      speedTime = 11;
      superStarsTime = 10;
      magnetTime = 9;
      mastery = 1.65;
      dualBlastUnlocked = true;
      player.x = world.width * 0.5;
      player.y = world.height * 0.72;
      player.moving = true;
      for (let index = 0; index < particleCount; index += 1) {
        const particle = acquireParticle();
        particle.x = 10 + (index * 59) % Math.max(20, world.width - 20);
        particle.y = world.bounds.top
          + (index * 31) % Math.max(100, world.bounds.bottom - world.bounds.top);
        particle.vx = 0;
        particle.vy = 0;
        particle.life = 0.6;
        particle.maxLife = 0.8;
        particle.size = scaleWorld(2 + (index % 5));
        particle.color = index % 2 ? COLORS.goldBright : COLORS.super;
        particle.star = index % 4 === 0;
        particle.renderStarPath = null;
        particles.push(particle);
      }
      for (let index = 0; index < floatingTextCount; index += 1) {
        floatingTexts.push({
          x: 80 + (index * 61) % Math.max(160, world.width - 160),
          y: world.bounds.top + 80 + (index * 53) % Math.max(100, world.height - 280),
          text: "+51",
          color: COLORS.goldBright,
          life: 0.6,
          maxLife: 0.85,
          size: Math.max(12, scaleWorld(22)),
        });
      }
      pickups.push({
        x: world.width * 0.22,
        y: world.height * 0.58,
        radius: scaleWorld(21),
        ttl: 5.1,
        totalTtl: 8.5,
        phase: 0.4,
      });
      powerups.push({
        type: "super",
        x: world.width * 0.78,
        y: world.height * 0.46,
        radius: scaleWorld(23),
        ttl: 8.2,
        totalTtl: 11,
        phase: 1.2,
      });
    },

    buildCrowdedSpawnScene(enemyCount) {
      this.buildCollisionScene(enemyCount, 0);
      const { left, right, top, bottom } = world.playerBounds;
      const columns = Math.max(8, Math.ceil(Math.sqrt(enemyCount)));
      const rows = Math.ceil(enemyCount / columns);
      enemies.forEach((enemy, index) => {
        enemy.x = left + ((index % columns) + 0.5) * ((right - left) / columns);
        enemy.y = top + (Math.floor(index / columns) + 0.5) * ((bottom - top) / rows);
      });
    },

    updateProjectilesMany(iterations, dt) {
      for (let index = 0; index < iterations; index += 1) updateProjectiles(dt);
    },

    updateEnemiesMany(iterations, dt) {
      for (let index = 0; index < iterations; index += 1) updateEnemies(dt);
    },

    acquireTargetsMany(iterations) {
      for (let index = 0; index < iterations; index += 1) {
        fireAutomaticRecommendation();
        recycleAllProjectiles();
      }
    },

    buildSuperstarVolleyScene() {
      this.buildCollisionScene(0, 0);
      starRowSize = 5;
      recommendationPower = 50;
      superVolleyAngle = 0;
      runStats = createRunStats();
    },

    fireSuperStarsMany(iterations) {
      for (let index = 0; index < iterations; index += 1) {
        fireSuperStars();
        recycleAllProjectiles();
      }
    },

    choosePopcornMany(iterations) {
      const radius = scaleWorld(21);
      for (let index = 0; index < iterations; index += 1) choosePopcornPosition(radius);
    },

    updateStableMany(iterations, dt) {
      for (let index = 0; index < iterations; index += 1) {
        updateMovement(dt);
        updateEnemies(0);
        updateProjectiles(dt);
        updatePickups(0);
        updatePowerups(0);
        updateParticles(0);
        updateFloatingTexts(0);
        updateInterface();
      }
    },

    drawMany(iterations) {
      for (let index = 0; index < iterations; index += 1) draw(index * 16.6667);
    },

    drawBackgroundMany(iterations) {
      for (let index = 0; index < iterations; index += 1) drawBackground(index / 60);
    },

    projectileSpriteLookupsMany(iterations) {
      for (let pass = 0; pass < iterations; pass += 1) {
        for (let index = 0; index < projectiles.length; index += 1) {
          getProjectileSprite(projectiles[index]);
        }
      }
    },

    enemySpriteLookupsMany(iterations) {
      for (let pass = 0; pass < iterations; pass += 1) {
        for (let index = 0; index < enemies.length; index += 1) getEnemySprite(enemies[index]);
      }
    },

    counts() {
      return {
        enemies: enemies.length,
        projectiles: projectiles.length,
        particles: particles.length,
        floatingTexts: floatingTexts.length,
      };
    },
  };
`;

const instrumented = source.replace(/\n\}\)\(\);\s*$/, `${hook}\n})();\n`);
if (instrumented === source) throw new Error("Unable to instrument game.js");

let randomState = 0x4d4d4752;
const deterministicMath = Object.create(Math);
deterministicMath.random = () => {
  randomState ^= randomState << 13;
  randomState ^= randomState >>> 17;
  randomState ^= randomState << 5;
  return (randomState >>> 0) / 0x100000000;
};

let recordCanvasOperations = false;
const canvasOperations = Object.create(null);

function recordCanvasOperation(name) {
  if (!recordCanvasOperations) return;
  canvasOperations[name] = (canvasOperations[name] || 0) + 1;
}

function createGradient() {
  return { addColorStop() { recordCanvasOperation("addColorStop"); } };
}

function createContext() {
  const context = {
    save() { recordCanvasOperation("save"); },
    restore() { recordCanvasOperation("restore"); },
    translate() { recordCanvasOperation("translate"); },
    rotate() { recordCanvasOperation("rotate"); },
    scale() { recordCanvasOperation("scale"); },
    setTransform() { recordCanvasOperation("setTransform"); },
    fillRect() { recordCanvasOperation("fillRect"); },
    strokeRect() { recordCanvasOperation("strokeRect"); },
    clearRect() { recordCanvasOperation("clearRect"); },
    beginPath() { recordCanvasOperation("beginPath"); },
    closePath() { recordCanvasOperation("closePath"); },
    moveTo() { recordCanvasOperation("moveTo"); },
    lineTo() { recordCanvasOperation("lineTo"); },
    arc() { recordCanvasOperation("arc"); },
    rect() { recordCanvasOperation("rect"); },
    quadraticCurveTo() { recordCanvasOperation("quadraticCurveTo"); },
    clip() { recordCanvasOperation("clip"); },
    fill() { recordCanvasOperation("fill"); },
    stroke() { recordCanvasOperation("stroke"); },
    drawImage() { recordCanvasOperation("drawImage"); },
    fillText() { recordCanvasOperation("fillText"); },
    strokeText() { recordCanvasOperation("strokeText"); },
    createLinearGradient() {
      recordCanvasOperation("createLinearGradient");
      return createGradient();
    },
    createRadialGradient() {
      recordCanvasOperation("createRadialGradient");
      return createGradient();
    },
    measureText(value) {
      recordCanvasOperation("measureText");
      const width = String(value).length * 8;
      return {
        width,
        actualBoundingBoxLeft: 0,
        actualBoundingBoxRight: width,
        actualBoundingBoxAscent: 10,
        actualBoundingBoxDescent: 3,
      };
    },
  };
  return new Proxy(context, {
    get(target, property) {
      if (!(property in target)) target[property] = () => recordCanvasOperation(String(property));
      return target[property];
    },
    set(target, property, value) {
      target[property] = value;
      return true;
    },
  });
}

function createClassList() {
  return { add() {}, remove() {}, toggle() {} };
}

function createCanvas(isMain = false) {
  const context = createContext();
  return {
    width: 0,
    height: 0,
    style: {},
    parentElement: null,
    classList: createClassList(),
    addEventListener() {},
    setAttribute() {},
    focus() {},
    getContext() { return context; },
    getBoundingClientRect() {
      return isMain
        ? { left: 0, top: 0, right: 1280, bottom: 900, width: 1280, height: 900 }
        : { left: 0, top: 0, right: this.width, bottom: this.height, width: this.width, height: this.height };
    },
  };
}

function createElement(id) {
  return {
    id,
    hidden: false,
    disabled: false,
    textContent: "",
    offsetWidth: 1,
    classList: createClassList(),
    style: {},
    parentElement: null,
    addEventListener() {},
    setAttribute() {},
    focus() {},
    setPointerCapture() {},
    closest() { return null; },
    getBoundingClientRect() {
      return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
    },
  };
}

const elements = new Map();
const mainCanvas = createCanvas(true);
mainCanvas.parentElement = {
  getBoundingClientRect() {
    return { left: 0, top: 0, right: 1280, bottom: 900, width: 1280, height: 900 };
  },
};
elements.set("game-canvas", mainCanvas);

const documentObject = {
  hidden: false,
  fonts: { ready: new Promise(() => {}) },
  getElementById(id) {
    if (!elements.has(id)) elements.set(id, createElement(id));
    return elements.get(id);
  },
  createElement(tagName) {
    return tagName === "canvas" ? createCanvas(false) : createElement(tagName);
  },
  addEventListener() {},
};

const storage = new Map();
const windowObject = {
  devicePixelRatio: 2,
  navigator: { getGamepads() { return []; } },
  localStorage: {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(key, String(value)); },
  },
  matchMedia() { return { matches: false }; },
  getComputedStyle(element) {
    return {
      fontSize: element?.id?.startsWith("stat-") ? "20px" : "60px",
      getPropertyValue(name) {
        if (name === "--play-top") return "166";
        if (name === "--play-bottom") return "43";
        return "";
      },
    };
  },
  addEventListener() {},
  requestAnimationFrame() {},
  setTimeout(callback) { callback(); },
};

class ImageStub {
  constructor() {
    this.complete = false;
    this.naturalWidth = 0;
    this.decoding = "";
    this.src = "";
  }
}

class ResizeObserverStub { observe() {} }
class Path2DStub {
  moveTo() {}
  lineTo() {}
  arc() {}
  closePath() {}
  rect() {}
}

const context = {
  console,
  document: documentObject,
  window: windowObject,
  Image: ImageStub,
  ResizeObserver: ResizeObserverStub,
  Path2D: Path2DStub,
  performance: { now: () => 0 },
  Math: deterministicMath,
};
context.globalThis = context;
vm.createContext(context);
vm.runInContext(instrumented, context, { filename: "game.js" });
const game = context.__performanceGame;

function nowNanoseconds() {
  return process.hrtime.bigint();
}

function elapsedMilliseconds(start) {
  return Number(process.hrtime.bigint() - start) / 1e6;
}

function percentile(sortedValues, fraction) {
  const index = Math.min(sortedValues.length - 1, Math.max(0, Math.ceil(sortedValues.length * fraction) - 1));
  return sortedValues[index];
}

function summarize(values, workUnits) {
  const ordered = [...values].sort((a, b) => a - b);
  const median = percentile(ordered, 0.5);
  const deviations = ordered.map((value) => Math.abs(value - median)).sort((a, b) => a - b);
  return {
    samples: ordered.length,
    totalMedianMs: Number(median.toFixed(4)),
    unitMedianMs: Number((median / workUnits).toFixed(6)),
    p10Ms: Number(percentile(ordered, 0.1).toFixed(4)),
    p90Ms: Number(percentile(ordered, 0.9).toFixed(4)),
    p95Ms: Number(percentile(ordered, 0.95).toFixed(4)),
    minimumMs: Number(ordered[0].toFixed(4)),
    maximumMs: Number(ordered[ordered.length - 1].toFixed(4)),
    medianAbsoluteDeviationMs: Number(percentile(deviations, 0.5).toFixed(4)),
    rawMs: values.map((value) => Number(value.toFixed(4))),
  };
}

function measureMemory(scenario) {
  if (typeof global.gc !== "function") return null;
  scenario.setup();
  scenario.run();
  global.gc();
  const retainedStart = process.memoryUsage().heapUsed;
  scenario.setup();
  global.gc();
  const transientStart = process.memoryUsage().heapUsed;
  scenario.run();
  const transientEnd = process.memoryUsage().heapUsed;
  global.gc();
  const retainedEnd = process.memoryUsage().heapUsed;
  return {
    transientHeapGrowthBytes: transientEnd - transientStart,
    retainedHeapGrowthBytes: retainedEnd - retainedStart,
  };
}

function measureOperations(scenario) {
  if (!scenario.operations) return null;
  scenario.setup();
  scenario.prime?.();
  for (const key of Object.keys(canvasOperations)) delete canvasOperations[key];
  recordCanvasOperations = true;
  scenario.operations();
  recordCanvasOperations = false;
  return Object.fromEntries(Object.entries(canvasOperations).sort(([a], [b]) => a.localeCompare(b)));
}

const allScenarios = [
  {
    name: "projectile-collisions-busy",
    category: "update",
    units: 360,
    setup: () => game.buildCollisionScene(96, 800),
    run: () => game.updateProjectilesMany(360, 1 / 120),
  },
  {
    name: "projectile-collisions-extreme",
    category: "update",
    units: 180,
    setup: () => game.buildCollisionScene(192, 1600),
    run: () => game.updateProjectilesMany(180, 1 / 120),
  },
  {
    name: "enemy-steering-extreme",
    category: "update",
    units: 600,
    setup: () => game.buildEnemyAiScene(240),
    run: () => game.updateEnemiesMany(600, 0),
  },
  {
    name: "target-acquisition-extreme",
    category: "update",
    units: 1600,
    setup: () => game.buildEnemyAiScene(240),
    run: () => game.acquireTargetsMany(1600),
  },
  {
    name: "superstar-volley-500",
    category: "update",
    units: 600,
    setup: () => game.buildSuperstarVolleyScene(),
    run: () => game.fireSuperStarsMany(600),
  },
  {
    name: "crowded-popcorn-placement",
    category: "jank",
    units: 240,
    setup: () => game.buildCrowdedSpawnScene(120),
    run: () => game.choosePopcornMany(240),
  },
  {
    name: "stable-full-update",
    category: "update",
    units: 180,
    setup: () => game.buildRenderScene(96, 800, 480, 24),
    run: () => game.updateStableMany(180, 1 / 240),
  },
  {
    name: "projectile-sprite-cache-hits",
    category: "render-cpu",
    units: 240000,
    setup: () => game.buildCollisionScene(0, 800),
    prime: () => game.projectileSpriteLookupsMany(1),
    run: () => game.projectileSpriteLookupsMany(300),
  },
  {
    name: "enemy-sprite-cache-hits",
    category: "render-cpu",
    units: 144000,
    setup: () => game.buildCollisionScene(240, 0),
    prime: () => game.enemySpriteLookupsMany(1),
    run: () => game.enemySpriteLookupsMany(600),
  },
  {
    name: "background-render",
    category: "render",
    units: 360,
    setup: () => game.buildRenderScene(0, 0, 0, 0),
    prime: () => game.drawBackgroundMany(5),
    run: () => game.drawBackgroundMany(360),
    operations: () => game.drawBackgroundMany(1),
  },
  {
    name: "busy-render",
    category: "render",
    units: 120,
    setup: () => game.buildRenderScene(96, 800, 480, 24),
    prime: () => game.drawMany(5),
    run: () => game.drawMany(120),
    operations: () => game.drawMany(1),
  },
  {
    name: "extreme-render",
    category: "render",
    units: 60,
    setup: () => game.buildRenderScene(180, 1600, 960, 40),
    prime: () => game.drawMany(5),
    run: () => game.drawMany(60),
    operations: () => game.drawMany(1),
  },
];
const requestedScenarios = scenarioFilter
  ? new Set(scenarioFilter.split(",").map((name) => name.trim()).filter(Boolean))
  : null;
const scenarios = requestedScenarios
  ? allScenarios.filter((scenario) => requestedScenarios.has(scenario.name))
  : allScenarios;

if (requestedScenarios && scenarios.length !== requestedScenarios.size) {
  const available = new Set(allScenarios.map((scenario) => scenario.name));
  const missing = [...requestedScenarios].filter((name) => !available.has(name));
  throw new Error(`Unknown benchmark scenario: ${missing.join(", ")}`);
}

async function recordCpuProfile(scenario, directory) {
  const session = new inspector.Session();
  session.connect();
  const post = (method, parameters = {}) => new Promise((resolve, reject) => {
    session.post(method, parameters, (error, result) => error ? reject(error) : resolve(result));
  });
  await post("Profiler.enable");
  await post("Profiler.setSamplingInterval", { interval: 100 });
  scenario.setup();
  scenario.prime?.();
  await post("Profiler.start");
  const recordingStart = nowNanoseconds();
  let repetitions = 0;
  while (elapsedMilliseconds(recordingStart) < 750) {
    scenario.setup();
    scenario.prime?.();
    scenario.run();
    repetitions += 1;
  }
  const { profile } = await post("Profiler.stop");
  session.disconnect();
  fs.mkdirSync(directory, { recursive: true });
  const filename = path.join(directory, `${scenario.name}.cpuprofile`);
  fs.writeFileSync(filename, JSON.stringify(profile));
  return { filename, repetitions };
}

async function main() {
  const scenarioResults = {};

  for (const scenario of scenarios) {
    for (let warmup = 0; warmup < warmupCount; warmup += 1) {
      scenario.setup();
      scenario.prime?.();
      scenario.run();
    }

    const timings = [];
    for (let sample = 0; sample < sampleCount; sample += 1) {
      scenario.setup();
      scenario.prime?.();
      const start = nowNanoseconds();
      scenario.run();
      timings.push(elapsedMilliseconds(start));
    }

    scenarioResults[scenario.name] = {
      category: scenario.category,
      workUnits: scenario.units,
      timing: summarize(timings, scenario.units),
      memory: measureMemory(scenario),
      canvasOperationsPerFrame: measureOperations(scenario),
      sceneCounts: game.counts(),
    };
  }

  const profiles = {};
  if (profileDirectory) {
    const selectedProfiles = new Set([
      "projectile-collisions-extreme",
      "crowded-popcorn-placement",
      "extreme-render",
    ]);
    for (const scenario of scenarios) {
      if (!selectedProfiles.has(scenario.name)) continue;
      profiles[scenario.name] = await recordCpuProfile(scenario, path.resolve(profileDirectory));
    }
  }

  const result = {
    schemaVersion: 1,
    label,
    generatedAt: new Date().toISOString(),
    sourceBytes: Buffer.byteLength(source),
    nodeVersion: process.version,
    samplesPerScenario: sampleCount,
    warmupsPerScenario: warmupCount,
    scenarios: scenarioResults,
    profiles,
  };

  const serialized = `${JSON.stringify(result, null, 2)}\n`;
  if (outputPath) {
    const resolvedOutput = path.resolve(outputPath);
    fs.mkdirSync(path.dirname(resolvedOutput), { recursive: true });
    fs.writeFileSync(resolvedOutput, serialized);
  }
  process.stdout.write(serialized);
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});
