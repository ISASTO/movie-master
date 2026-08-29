(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const canvas = $("game-canvas");
  const ctx = canvas?.getContext("2d", { alpha: false });

  if (!canvas || !ctx) return;

  const ui = {
    score: $("score-value"),
    best: $("best-value"),
    bestStreak: $("best-streak-value"),
    lives: $("lives-value"),
    streak: $("streak-value"),
    masteryPercent: $("mastery-percent"),
    masteryTrack: $("mastery-track"),
    masteryFill: $("mastery-fill"),
    reserveMasteryTrack: $("reserve-mastery-track"),
    reserveMasteryFill: $("reserve-mastery-fill"),
    blastMeter: $("mastery-track")?.closest?.(".blast-meter") || $("mastery-track")?.parentElement?.parentElement,
    missionBanner: $("mission-banner"),
    startOverlay: $("start-overlay"),
    pauseOverlay: $("pause-overlay"),
    resetConfirmOverlay: $("reset-confirm-overlay"),
    gameoverOverlay: $("gameover-overlay"),
    statsOverlay: $("stats-overlay"),
    startButton: $("start-button"),
    startModeButton: $("start-mode-button"),
    resumeButton: $("resume-button"),
    resetButton: $("reset-button"),
    resetCancelButton: $("reset-cancel-button"),
    resetConfirmButton: $("reset-confirm-button"),
    restartButton: $("restart-button"),
    statsButton: $("stats-button"),
    statsCloseButton: $("stats-close-button"),
    gameoverModeButton: $("gameover-mode-button"),
    movementButton: $("movement-button"),
    qualityButton: $("quality-button"),
    pauseButton: $("pause-button"),
    soundButton: $("sound-button"),
    judgmentButton: $("judgment-button"),
    joystick: $("joystick"),
    joystickKnob: $("joystick-knob"),
    startBest: $("start-best"),
    finalScore: $("final-score"),
    finalLongestStreak: $("final-longest-streak"),
    gameoverTitle: $("gameover-title"),
    comboCallout: $("combo-callout"),
    statusAnnouncement: $("status-announcement"),
    screenFlash: $("screen-flash"),
    startMoveCopy: $("start-move-copy"),
    desktopInstructions: $("desktop-instructions"),
    mobileInstructions: $("mobile-instructions"),
    statMode: $("stat-mode"),
    statGameTime: $("stat-game-time"),
    statScore: $("stat-score"),
    statLongestStreak: $("stat-longest-streak"),
    statPopcornCollected: $("stat-popcorn-collected"),
    statPopcornMissed: $("stat-popcorn-missed"),
    statGarbageDestroyed: $("stat-garbage-destroyed"),
    statDestroyedByStars: $("stat-destroyed-by-stars"),
    statDestroyedByBlasts: $("stat-destroyed-by-blasts"),
    statStarsFired: $("stat-stars-fired"),
    statStarsHit: $("stat-stars-hit"),
    statStarAccuracy: $("stat-star-accuracy"),
    statHitsTaken: $("stat-hits-taken"),
    statShieldBlocks: $("stat-shield-blocks"),
    statBlastsUsed: $("stat-blasts-used"),
    statMovingTime: $("stat-moving-time"),
    statPeakGarbage: $("stat-peak-garbage"),
    statPowerupShield: $("stat-powerup-shield"),
    statPowerupSpeed: $("stat-powerup-speed"),
    statPowerupSuper: $("stat-powerup-super"),
    statPowerupMagnet: $("stat-powerup-magnet"),
  };

  const COLORS = {
    ink: "#120c08",
    paper: "#d8c5a1",
    cream: "#fff0c4",
    gold: "#e5a408",
    goldBright: "#ffd360",
    goldLight: "#ffe7a2",
    goldDark: "#914800",
    purple: "#5b3370",
    red: "#d24b35",
    shield: "#75dcff",
    speed: "#fff07e",
    super: "#e5a7ff",
    magnet: "#ff806b",
  };

  const LEGACY_SCORE_KEY = "movie-master-vs-garbage-high-score-v1";
  const SCORE_KEY = "movie-master-vs-garbage-high-score-easy-v1";
  const STREAK_SCORE_KEY = "movie-master-vs-garbage-best-streak-v1";
  const HARDCORE_SCORE_KEY = "movie-master-vs-garbage-high-score-hardcore-v1";
  const HARDCORE_STREAK_SCORE_KEY = "movie-master-vs-garbage-best-streak-hardcore-v1";
  const GAME_MODE_KEY = "movie-master-vs-garbage-mode-v1";
  const MAX_LIVES = 5;
  const POWERUP_DURATION = 15;
  const SHIELD_HITS = 3;
  const MAGNET_RADIUS = 600;
  const CLOSE_THREAT_RADIUS = 150;
  const GAMEPAD_DEAD_ZONE = 0.18;
  const GAMEPAD_TRIGGER_THRESHOLD = 0.5;
  const GAMEPAD_BLAST_BUTTONS = [0, 1, 2, 3, 7];
  const GAMEPAD_PAUSE_BUTTON = 9;
  const GAMEPAD_RUMBLE = {
    blast: { duration: 130, weakMagnitude: 0.3, strongMagnitude: 0.5 },
    hit: { duration: 130, weakMagnitude: 0.3, strongMagnitude: 0.5 },
    shield: { duration: 110, weakMagnitude: 0.28, strongMagnitude: 0.46 },
  };
  const POPCORN_LIFETIME_MULTIPLIER = 1.25;
  const MAX_PURSUIT_LEAD_FRACTION = 0.42;
  const MAX_RECOMMENDATION_LEAD_FRACTION = 0.55;
  const DUAL_BLAST_STREAK = 500;
  const POPCORN_SAFE_BORDER = 26;
  const REFERENCE_PLAYABLE_HEIGHT = 1231;
  const MIN_GAME_SCALE = 0.16;
  const MAX_GAME_SCALE = 2;
  const REFERENCE_PLAYER_HEIGHT = 168;
  const REFERENCE_PLAYER_SPEED = 365;
  const REFERENCE_ENEMY_SPEED = 126.8;
  const POWERUP_TYPES = {
    shield: { label: "SHIELD", icon: "🛡️", color: COLORS.shield },
    speed: { label: "SUPER SPEED", icon: "⚡", color: COLORS.speed },
    super: { label: "SUPER STARS", icon: "★10", color: COLORS.super },
    magnet: { label: "MAGNET", icon: "🧲", color: COLORS.magnet },
  };
  const SOUND_KEY = "movie-master-vs-garbage-sound-v1";
  const MOVEMENT_KEY = "movie-master-vs-garbage-movement-v1";
  const QUALITY_KEY = "movie-master-vs-garbage-quality-v1";
  const QUALITY_ORDER = ["high", "medium", "low"];
  const QUALITY_LEVELS = {
    high: {
      label: "HIGH",
      maxDpr: 2,
      particleMultiplier: 1,
      particleDrawStride: 1,
      backgroundStarMultiplier: 1,
      projectileGlow: 1,
      projectileFrames: 12,
      pickupBeams: true,
      playerAura: "gradient",
      speedTrailLines: 5,
      superOrbitStars: 10,
      enemyFrames: 11,
    },
    medium: {
      label: "MEDIUM",
      maxDpr: 1.5,
      particleMultiplier: 0.68,
      particleDrawStride: 1,
      backgroundStarMultiplier: 0.68,
      projectileGlow: 0.62,
      projectileFrames: 8,
      pickupBeams: true,
      playerAura: "gradient",
      speedTrailLines: 3,
      superOrbitStars: 8,
      enemyFrames: 7,
    },
    low: {
      label: "LOW",
      maxDpr: 1,
      particleMultiplier: 0.36,
      particleDrawStride: 2,
      backgroundStarMultiplier: 0.34,
      projectileGlow: 0.18,
      projectileFrames: 4,
      pickupBeams: false,
      playerAura: "flat",
      speedTrailLines: 1,
      superOrbitStars: 5,
      enemyFrames: 3,
    },
  };
  const STAR_ROTATION_PERIOD = (Math.PI * 2) / 5;
  const SUPER_STAR_DIRECTIONS = Array.from({ length: 10 }, (_, index) => {
    const angle = (index / 10) * Math.PI * 2;
    return { x: Math.cos(angle), y: Math.sin(angle) };
  });
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarsePointer = window.matchMedia("(hover: none), (pointer: coarse)").matches;

  const movieMasterImage = new Image();
  movieMasterImage.decoding = "async";
  movieMasterImage.src = "../assets/images/movie-master.webp";

  const world = {
    width: 0,
    height: 0,
    dpr: 1,
    gameScale: 1,
    backgroundStars: [],
    bounds: { left: 24, right: 300, top: 160, bottom: 500 },
    playerBounds: { left: 24, right: 300, top: 160, bottom: 500 },
  };

  const renderCache = {
    backgroundGradient: null,
    backgroundRays: null,
    backgroundGrid: null,
    filmHoles: null,
    starPaths: new Map(),
    projectileSprites: new Map(),
    enemySprites: new Map(),
    emojiSprites: new Map(),
    textWidths: new Map(),
    emojiMetrics: new Map(),
  };

  const player = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    speed: 280,
    lives: MAX_LIVES,
    invulnerable: 0,
    bob: 0,
    drawHeight: 145,
    drawWidth: 50,
    radius: 22,
    moving: false,
    stationaryTime: 0,
  };

  const keys = new Set();
  const touchMove = { x: 0, y: 0, pointerId: null };
  const gamepadMove = { x: 0, y: 0, active: false };
  const mouseTarget = { x: 0, y: 0, active: false };
  const enemies = [];
  const projectiles = [];
  const pickups = [];
  const powerups = [];
  const particles = [];
  const floatingTexts = [];
  const projectilePool = [];
  const particlePool = [];
  const collisionIndex = {
    enemies: [],
    maxEnemyRadius: 0,
  };
  const MAX_PROJECTILE_POOL_SIZE = 1800;
  const MAX_PARTICLE_POOL_SIZE = 2400;

  let gameState = "ready";
  let lastFrame = performance.now();
  let elapsed = 0;
  let score = 0;
  let hardcoreMode = readString(GAME_MODE_KEY, "normal") === "hardcore";
  let bestScore = readNumber(
    hardcoreMode ? HARDCORE_SCORE_KEY : SCORE_KEY,
    hardcoreMode ? 0 : readNumber(LEGACY_SCORE_KEY, 0),
  );
  let bestStreak = readNumber(
    hardcoreMode ? HARDCORE_STREAK_SCORE_KEY : STREAK_SCORE_KEY,
    0,
  );
  let difficultyLevel = 1;
  let mastery = 0;
  let spawnTimer = 0;
  let shotTimer = 0;
  let popcornSpawnTimer = 0;
  let powerupSpawnTimer = 0;
  let popcornCollected = 0;
  let popcornChain = 0;
  let longestStreak = 0;
  let recommendationPower = 0;
  let movementPower = 0;
  let starRowSize = 1;
  let dualBlastUnlocked = false;
  let shieldTime = 0;
  let shieldHits = 0;
  let speedTime = 0;
  let superStarsTime = 0;
  let magnetTime = 0;
  let superVolleyAngle = 0;
  let killCombo = 0;
  let comboTimer = 0;
  let rushTimer = 0;
  let rushWarning = null;
  let shakeTime = 0;
  let shakePower = 0;
  let blast = null;
  let bannerMessage = "";
  let bannerTime = 0;
  let bannerDanger = false;
  let blastReadyAnnounced = false;
  let lastRenderedScore = -1;
  let lastRenderedBest = -1;
  let lastRenderedBestStreak = -1;
  let lastRenderedLives = -1;
  let lastRenderedStreak = -1;
  let lastRenderedMastery = -1;
  let lastRenderedReserveMastery = -1;
  let lastRenderedBlastReady = null;
  let lastRenderedMissionMessage = null;
  let lastRenderedMissionDanger = null;
  let audioContext = null;
  let soundOn = readString(SOUND_KEY, "on") !== "off";
  let movementMode = coarsePointer ? "touch" : readString(MOVEMENT_KEY, "mouse");
  let qualityLevel = readString(QUALITY_KEY, "high");
  if (!QUALITY_LEVELS[qualityLevel]) qualityLevel = "high";
  let qualitySettings = QUALITY_LEVELS[qualityLevel];
  let activeGamepadIndex = null;
  let gamepadBlastPressed = false;
  let gamepadPausePressed = false;
  let runStats = createRunStats();

  if (movementMode !== "mouse" && movementMode !== "keys" && movementMode !== "touch") {
    movementMode = coarsePointer ? "touch" : "mouse";
  }

  function readNumber(key, fallback) {
    try {
      const value = Number.parseInt(window.localStorage.getItem(key) ?? "", 10);
      return Number.isFinite(value) ? value : fallback;
    } catch {
      return fallback;
    }
  }

  function readString(key, fallback) {
    try {
      return window.localStorage.getItem(key) ?? fallback;
    } catch {
      return fallback;
    }
  }

  function saveValue(key, value) {
    try {
      window.localStorage.setItem(key, String(value));
    } catch {
      // The game remains playable if browser storage is unavailable.
    }
  }

  function currentScoreKey() {
    return hardcoreMode ? HARDCORE_SCORE_KEY : SCORE_KEY;
  }

  function currentStreakScoreKey() {
    return hardcoreMode ? HARDCORE_STREAK_SCORE_KEY : STREAK_SCORE_KEY;
  }

  function loadCurrentModeRecords() {
    bestScore = readNumber(
      currentScoreKey(),
      hardcoreMode ? 0 : readNumber(LEGACY_SCORE_KEY, 0),
    );
    bestStreak = readNumber(currentStreakScoreKey(), 0);
    lastRenderedBest = -1;
    lastRenderedBestStreak = -1;
  }

  function maximumLives() {
    return hardcoreMode ? 1 : MAX_LIVES;
  }

  function maximumBlastCharge() {
    return dualBlastUnlocked ? 2 : 1;
  }

  function addBlastCharge(amount) {
    mastery = clamp(mastery + amount, 0, maximumBlastCharge());
  }

  function createRunStats() {
    return {
      mode: hardcoreMode ? "HARDCORE" : "NORMAL",
      popcornMissed: 0,
      garbageDestroyed: 0,
      destroyedByStars: 0,
      destroyedByBlasts: 0,
      starsFired: 0,
      starsHit: 0,
      hitsTaken: 0,
      shieldBlocks: 0,
      blastsUsed: 0,
      bestCombo: 0,
      movingTime: 0,
      peakGarbage: 0,
      powerups: { shield: 0, speed: 0, super: 0, magnet: 0 },
    };
  }

  function formatDuration(seconds) {
    const totalSeconds = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const remainder = totalSeconds % 60;
    return hours > 0
      ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
      : `${minutes}:${String(remainder).padStart(2, "0")}`;
  }

  function updateGameModeUi() {
    const enabled = hardcoreMode;
    const label = `HARDCORE MODE: ${enabled ? "ON" : "OFF"}`;
    for (const button of [ui.startModeButton, ui.gameoverModeButton]) {
      button.textContent = label;
      button.setAttribute("aria-pressed", enabled ? "true" : "false");
    }
    document.documentElement?.classList.toggle("hardcore-mode", enabled);
  }

  function toggleHardcoreMode() {
    if (gameState === "running" || gameState === "paused") return;
    hardcoreMode = !hardcoreMode;
    saveValue(GAME_MODE_KEY, hardcoreMode ? "hardcore" : "normal");
    loadCurrentModeRecords();
    if (gameState === "ready") player.lives = maximumLives();
    updateGameModeUi();
    updateInterface(true);
    announce(`Hardcore mode ${hardcoreMode ? "on" : "off"}.`);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function randomBetween(min, max) {
    if (max < min) return (min + max) / 2;
    return min + Math.random() * (max - min);
  }

  function scaleWorld(value) {
    return value * world.gameScale;
  }

  function remapAxis(value, oldStart, oldEnd, newStart, newEnd) {
    const oldSpan = oldEnd - oldStart;
    if (!Number.isFinite(value) || Math.abs(oldSpan) < 1) return (newStart + newEnd) / 2;
    return newStart + ((value - oldStart) / oldSpan) * (newEnd - newStart);
  }

  const scoreFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
  const fittedNumberLengths = new WeakMap();
  const fittedNumberDisplays = [
    ui.score,
    ui.best,
    ui.streak,
    ui.bestStreak,
    ui.startBest,
    ui.finalScore,
    ui.finalLongestStreak,
  ];

  function formatScore(value) {
    return scoreFormatter.format(Math.floor(Math.max(0, value)));
  }

  function fitNumberToWidth(element) {
    if (!element) return;

    element.style.fontSize = "";
    const availableWidth = element.clientWidth;
    const naturalWidth = element.scrollWidth;

    if (!(availableWidth > 0) || !(naturalWidth > availableWidth)) {
      fittedNumberLengths.set(element, element.textContent.length);
      return;
    }

    const baseFontSize = Number.parseFloat(window.getComputedStyle(element).fontSize);
    if (!(baseFontSize > 0)) return;

    let fittedSize = Math.max(0.1, baseFontSize * (availableWidth / naturalWidth) * 0.98);
    element.style.fontSize = `${fittedSize}px`;

    const remainingOverflow = element.scrollWidth / Math.max(1, element.clientWidth);
    if (remainingOverflow > 1) {
      fittedSize = Math.max(0.1, (fittedSize / remainingOverflow) * 0.98);
      element.style.fontSize = `${fittedSize}px`;
    }

    fittedNumberLengths.set(element, element.textContent.length);
  }

  function setFittedNumber(element, value) {
    const text = String(value);
    if (element.textContent !== text) element.textContent = text;
    if (fittedNumberLengths.get(element) !== text.length) fitNumberToWidth(element);
  }

  function fitAllNumberDisplays() {
    for (const element of fittedNumberDisplays) fitNumberToWidth(element);
  }

  function magnitude(x, y) {
    return Math.sqrt(x * x + y * y);
  }

  function distanceSquared(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
  }

  function cappedLeadTime(
    originX,
    originY,
    targetX,
    targetY,
    velocityX,
    velocityY,
    preferredLead,
    maximumLeadFraction,
  ) {
    const distance = magnitude(targetX - originX, targetY - originY);
    const targetSpeed = magnitude(velocityX || 0, velocityY || 0);
    if (distance < 1 || targetSpeed < 1) return 0;
    return Math.min(preferredLead, (distance * maximumLeadFraction) / targetSpeed);
  }

  function getPlayBounds() {
    const shellStyles = window.getComputedStyle(canvas.parentElement);
    const configuredTop = Number.parseFloat(shellStyles.getPropertyValue("--play-top"));
    const configuredBottom = Number.parseFloat(shellStyles.getPropertyValue("--play-bottom"));
    const top = Number.isFinite(configuredTop) ? configuredTop : 166;
    const bottomInset = Number.isFinite(configuredBottom) ? configuredBottom : 43;
    const bottom = Math.max(top + 80, world.height - bottomInset);
    const sideInset = world.width <= 480 ? 14 : 22;

    return {
      left: sideInset,
      right: Math.max(sideInset + 1, world.width - sideInset),
      top,
      bottom,
    };
  }

  function getPlayerMovementBounds() {
    const horizontalInset = Math.max(player.radius, player.drawWidth * 0.52);
    const topInset = player.drawHeight * 0.56;
    const bottomInset = player.drawHeight * 0.46;
    let left = world.bounds.left + horizontalInset;
    let right = world.bounds.right - horizontalInset;
    let top = world.bounds.top + topInset;
    let bottom = world.bounds.bottom - bottomInset;

    if (left > right) left = right = (world.bounds.left + world.bounds.right) / 2;
    if (top > bottom) top = bottom = (world.bounds.top + world.bounds.bottom) / 2;

    return { left, right, top, bottom };
  }

  function createBackgroundGradient() {
    const gradient = ctx.createRadialGradient(
      world.width * 0.5,
      world.height * 0.52,
      10,
      world.width * 0.5,
      world.height * 0.54,
      Math.max(world.width, world.height) * 0.72,
    );
    gradient.addColorStop(0, "#442913");
    gradient.addColorStop(0.42, "#25150b");
    gradient.addColorStop(1, "#090604");
    return gradient;
  }

  function rebuildRenderCache() {
    renderCache.textWidths.clear();
    renderCache.emojiMetrics.clear();
    renderCache.projectileSprites.clear();
    renderCache.enemySprites.clear();
    renderCache.emojiSprites.clear();
    renderCache.backgroundGradient = createBackgroundGradient();

    if (typeof Path2D !== "function") {
      renderCache.backgroundRays = null;
      renderCache.backgroundGrid = null;
      renderCache.filmHoles = null;
      return;
    }

    const rays = new Path2D();
    const radius = magnitude(world.width, world.height);
    const rayCount = 32;
    for (let i = 0; i < rayCount; i += 2) {
      const start = (i / rayCount) * Math.PI * 2;
      const end = ((i + 1) / rayCount) * Math.PI * 2;
      rays.moveTo(0, 0);
      rays.arc(0, 0, radius, start, end);
      rays.closePath();
    }
    renderCache.backgroundRays = rays;

    const grid = new Path2D();
    for (let y = world.bounds.top + 28; y < world.bounds.bottom; y += 64) {
      grid.moveTo(world.bounds.left, y);
      grid.lineTo(world.bounds.right, y);
    }
    renderCache.backgroundGrid = grid;

    const holes = new Path2D();
    for (let x = 12; x < world.width; x += 38) {
      holes.rect(x, world.bounds.top + 3, 21, 6);
      holes.rect(x, world.bounds.bottom - 9, 21, 6);
    }
    renderCache.filmHoles = holes;
  }

  function populateCollisionIndex() {
    const sortedEnemies = collisionIndex.enemies;
    sortedEnemies.length = enemies.length;
    let maxEnemyRadius = 0;
    for (let index = 0; index < enemies.length; index += 1) {
      const enemy = enemies[index];
      sortedEnemies[index] = enemy;
      if (enemy.radius > maxEnemyRadius) maxEnemyRadius = enemy.radius;
    }
    sortedEnemies.sort((a, b) => a.x - b.x);
    collisionIndex.maxEnemyRadius = maxEnemyRadius;
  }

  function findFirstCollisionCandidate(minimumX) {
    const sortedEnemies = collisionIndex.enemies;
    let low = 0;
    let high = sortedEnemies.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (sortedEnemies[middle].x < minimumX) low = middle + 1;
      else high = middle;
    }
    return low;
  }

  function acquireProjectile() {
    return projectilePool.pop() || {};
  }

  function recycleProjectileAt(index) {
    const projectile = projectiles[index];
    const last = projectiles.pop();
    if (index < projectiles.length) projectiles[index] = last;
    if (projectilePool.length < MAX_PROJECTILE_POOL_SIZE) projectilePool.push(projectile);
  }

  function recycleAllProjectiles() {
    const room = MAX_PROJECTILE_POOL_SIZE - projectilePool.length;
    const start = Math.max(0, projectiles.length - room);
    for (let index = start; index < projectiles.length; index += 1) {
      projectilePool.push(projectiles[index]);
    }
    projectiles.length = 0;
  }

  function acquireParticle() {
    return particlePool.pop() || {};
  }

  function recycleParticleAt(index) {
    const particle = particles[index];
    const last = particles.pop();
    if (index < particles.length) particles[index] = last;
    if (particlePool.length < MAX_PARTICLE_POOL_SIZE) particlePool.push(particle);
  }

  function recycleAllParticles() {
    const room = MAX_PARTICLE_POOL_SIZE - particlePool.length;
    const start = Math.max(0, particles.length - room);
    for (let index = start; index < particles.length; index += 1) {
      particlePool.push(particles[index]);
    }
    particles.length = 0;
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const hadWorld = world.width > 0 && world.height > 0;
    const oldBounds = { ...world.bounds };
    const oldGameScale = world.gameScale || 1;

    world.width = Math.max(1, rect.width);
    world.height = Math.max(1, rect.height);
    world.dpr = Math.min(window.devicePixelRatio || 1, qualitySettings.maxDpr);
    world.bounds = getPlayBounds();

    const { left, right, top, bottom } = world.bounds;
    const playableHeight = Math.max(120, bottom - top);
    world.gameScale = clamp(
      playableHeight / REFERENCE_PLAYABLE_HEIGHT,
      MIN_GAME_SCALE,
      MAX_GAME_SCALE,
    );
    const resizeScale = world.gameScale / oldGameScale;

    canvas.width = Math.round(world.width * world.dpr);
    canvas.height = Math.round(world.height * world.dpr);
    ctx.setTransform(world.dpr, 0, 0, world.dpr, 0, 0);

    player.drawHeight = scaleWorld(REFERENCE_PLAYER_HEIGHT);
    player.drawWidth = player.drawHeight * (705 / 2048);
    player.radius = scaleWorld(27);
    player.speed = scaleWorld(REFERENCE_PLAYER_SPEED);
    world.playerBounds = getPlayerMovementBounds();
    rebuildRenderCache();

    const movementBounds = world.playerBounds;
    if (player.x && player.y) {
      player.x = clamp(
        remapAxis(player.x, oldBounds.left, oldBounds.right, left, right),
        movementBounds.left,
        movementBounds.right,
      );
      player.y = clamp(
        remapAxis(player.y, oldBounds.top, oldBounds.bottom, top, bottom),
        movementBounds.top,
        movementBounds.bottom,
      );
    } else {
      player.x = (movementBounds.left + movementBounds.right) / 2;
      player.y = (movementBounds.top + movementBounds.bottom) / 2;
    }

    world.backgroundStars = Array.from(
      {
        length: Math.max(
          8,
          Math.round(
            clamp(world.width / 28, 18, 58) * qualitySettings.backgroundStarMultiplier,
          ),
        ),
      },
      () => ({
        x: Math.random() * world.width,
        y: Math.random() * world.height,
        size: randomBetween(0.7, 2.1),
        phase: Math.random() * Math.PI * 2,
      }),
    );

    const remapGameplayPosition = (item) => {
      if (!hadWorld) return;
      item.x = remapAxis(item.x, oldBounds.left, oldBounds.right, left, right);
      item.y = remapAxis(item.y, oldBounds.top, oldBounds.bottom, top, bottom);
    };

    for (const enemy of enemies) {
      remapGameplayPosition(enemy);
      enemy.radius *= resizeScale;
      enemy.speed *= resizeScale;
      enemy.vx *= resizeScale;
      enemy.vy *= resizeScale;
      const enemyMargin = scaleWorld(70);
      enemy.x = clamp(enemy.x, left - enemyMargin, right + enemyMargin);
      enemy.y = clamp(enemy.y, top - enemyMargin, bottom + enemyMargin);
    }

    for (const projectile of projectiles) {
      remapGameplayPosition(projectile);
      projectile.radius *= resizeScale;
      projectile.vx *= resizeScale;
      projectile.vy *= resizeScale;
    }

    for (let index = pickups.length - 1; index >= 0; index -= 1) {
      const pickup = pickups[index];
      remapGameplayPosition(pickup);
      pickup.radius *= resizeScale;
      const pickupInset = scaleWorld(35);
      pickup.x = clamp(pickup.x, left + pickupInset, right - pickupInset);
      pickup.y = clamp(pickup.y, top + pickupInset, bottom - pickupInset);

      if (isPopcornBlockedByTouchControls(pickup.x, pickup.y, pickup.radius)) {
        const replacement = choosePopcornPosition(pickup.radius);
        if (replacement) {
          pickup.x = replacement.x;
          pickup.y = replacement.y;
        } else {
          pickups.splice(index, 1);
        }
      }
    }

    for (const powerup of powerups) {
      remapGameplayPosition(powerup);
      powerup.radius *= resizeScale;
      const powerupInset = scaleWorld(35);
      powerup.x = clamp(powerup.x, left + powerupInset, right - powerupInset);
      powerup.y = clamp(powerup.y, top + powerupInset, bottom - powerupInset);
    }

    for (const particle of particles) {
      remapGameplayPosition(particle);
      particle.vx *= resizeScale;
      particle.vy *= resizeScale;
      particle.size *= resizeScale;
    }

    for (const text of floatingTexts) {
      remapGameplayPosition(text);
      text.size *= resizeScale;
    }

    if (blast) {
      remapGameplayPosition(blast);
      blast.maxRadius = magnitude(world.width, world.height) * 1.06;
      blast.radius = blast.maxRadius * (1 - Math.pow(1 - clamp(blast.life / blast.duration, 0, 1), 3));
    }

    if (rushWarning && hadWorld) {
      const horizontal = rushWarning.edge === "top" || rushWarning.edge === "bottom";
      rushWarning.gapCenter = horizontal
        ? remapAxis(rushWarning.gapCenter, oldBounds.left, oldBounds.right, left, right)
        : remapAxis(rushWarning.gapCenter, oldBounds.top, oldBounds.bottom, top, bottom);
      rushWarning.gapSize *= resizeScale;
    }

    mouseTarget.active = false;
    fitAllNumberDisplays();
  }

  function resetGame() {
    elapsed = 0;
    score = 0;
    difficultyLevel = 1;
    mastery = 0;
    spawnTimer = 0.55;
    shotTimer = 0.05;
    popcornSpawnTimer = 0.3;
    powerupSpawnTimer = 6.5;
    popcornCollected = 0;
    popcornChain = 0;
    longestStreak = 0;
    recommendationPower = 0;
    movementPower = 0;
    starRowSize = 1;
    dualBlastUnlocked = false;
    shieldTime = 0;
    shieldHits = 0;
    speedTime = 0;
    superStarsTime = 0;
    magnetTime = 0;
    superVolleyAngle = 0;
    killCombo = 0;
    comboTimer = 0;
    rushTimer = 11.5;
    rushWarning = null;
    shakeTime = 0;
    shakePower = 0;
    blast = null;
    bannerMessage = "";
    bannerTime = 0;
    bannerDanger = false;
    blastReadyAnnounced = false;
    lastRenderedScore = -1;
    lastRenderedBest = -1;
    lastRenderedBestStreak = -1;
    lastRenderedLives = -1;
    lastRenderedStreak = -1;
    lastRenderedMastery = -1;
    lastRenderedReserveMastery = -1;
    lastRenderedBlastReady = null;
    lastRenderedMissionMessage = null;
    lastRenderedMissionDanger = null;
    runStats = createRunStats();

    enemies.length = 0;
    recycleAllProjectiles();
    pickups.length = 0;
    powerups.length = 0;
    recycleAllParticles();
    floatingTexts.length = 0;

    const { left, right, top, bottom } = world.bounds;
    player.x = (left + right) / 2;
    player.y = (top + bottom) / 2;
    player.vx = 0;
    player.vy = 0;
    player.lives = maximumLives();
    player.invulnerable = 0;
    player.bob = 0;
    player.moving = false;
    player.stationaryTime = 0;
    mouseTarget.active = false;
    gamepadMove.x = 0;
    gamepadMove.y = 0;
    gamepadMove.active = false;

    resetJoystick();
    updateInterface(true);
  }

  function setPausePresentation(active) {
    document.documentElement?.classList.toggle("game-paused", active);
  }

  function startGame() {
    ensureAudio();
    resetGame();
    gameState = "running";
    setPausePresentation(false);
    ui.startOverlay.hidden = true;
    ui.pauseOverlay.hidden = true;
    ui.resetConfirmOverlay.hidden = true;
    ui.gameoverOverlay.hidden = true;
    ui.statsOverlay.hidden = true;
    ui.pauseButton.disabled = false;
    ui.pauseButton.textContent = "PAUSE";
    lastFrame = performance.now();
    canvas.focus({ preventScroll: true });
    setBanner("KEEP MOVING. COLLECT THE POPCORN.", 2.8, false);
    announce("The Movie Master is ready. Keep moving and collect the popcorn.");
    playCue("start");
  }

  function saveRunRecords() {
    const finalScore = Math.floor(score);
    const scoreRecord = finalScore > bestScore;
    const streakRecord = longestStreak > bestStreak;

    if (scoreRecord) {
      bestScore = finalScore;
      saveValue(currentScoreKey(), bestScore);
    }
    if (streakRecord) {
      bestStreak = longestStreak;
      saveValue(currentStreakScoreKey(), bestStreak);
    }

    return { finalScore, scoreRecord, streakRecord };
  }

  function endGame() {
    if (gameState === "gameover") return;

    gameState = "gameover";
    setPausePresentation(false);
    const records = saveRunRecords();

    setFittedNumber(ui.finalScore, formatScore(records.finalScore));
    setFittedNumber(ui.finalLongestStreak, longestStreak);
    ui.gameoverTitle.textContent = records.scoreRecord
      ? "NEW BEST SCORE"
      : records.streakRecord
        ? "NEW BEST STREAK"
        : "OVERWHELMED BY GARBAGE 🗑️";
    ui.pauseOverlay.hidden = true;
    ui.resetConfirmOverlay.hidden = true;
    ui.gameoverOverlay.hidden = false;
    ui.statsOverlay.hidden = true;
    fitNumberToWidth(ui.finalScore);
    fitNumberToWidth(ui.finalLongestStreak);
    ui.pauseButton.disabled = true;
    resetJoystick();
    renderGameStats(records.finalScore);
    updateInterface(true);
    announce(
      records.scoreRecord
        ? "New best score."
        : records.streakRecord
          ? "New best streak."
          : "Game over.",
    );
    playCue("gameover");
  }

  function renderGameStats(finalScore = Math.floor(score)) {
    const accuracy = runStats.starsFired > 0
      ? Math.round((runStats.starsHit / runStats.starsFired) * 1000) / 10
      : 0;
    const movingPercent = elapsed > 0
      ? Math.round((runStats.movingTime / elapsed) * 100)
      : 0;

    ui.statMode.textContent = runStats.mode;
    ui.statGameTime.textContent = formatDuration(elapsed);
    ui.statScore.textContent = formatScore(finalScore);
    ui.statLongestStreak.textContent = formatScore(longestStreak);
    ui.statPopcornCollected.textContent = formatScore(popcornCollected);
    ui.statPopcornMissed.textContent = formatScore(runStats.popcornMissed);
    ui.statGarbageDestroyed.textContent = formatScore(runStats.garbageDestroyed);
    ui.statDestroyedByStars.textContent = formatScore(runStats.destroyedByStars);
    ui.statDestroyedByBlasts.textContent = formatScore(runStats.destroyedByBlasts);
    ui.statStarsFired.textContent = formatScore(runStats.starsFired);
    ui.statStarsHit.textContent = formatScore(runStats.starsHit);
    ui.statStarAccuracy.textContent = `${accuracy}%`;
    ui.statHitsTaken.textContent = formatScore(runStats.hitsTaken);
    ui.statShieldBlocks.textContent = formatScore(runStats.shieldBlocks);
    ui.statBlastsUsed.textContent = formatScore(runStats.blastsUsed);
    ui.statMovingTime.textContent = `${formatDuration(runStats.movingTime)} (${movingPercent}%)`;
    ui.statPeakGarbage.textContent = formatScore(runStats.peakGarbage);
    ui.statPowerupShield.textContent = formatScore(runStats.powerups.shield);
    ui.statPowerupSpeed.textContent = formatScore(runStats.powerups.speed);
    ui.statPowerupSuper.textContent = formatScore(runStats.powerups.super);
    ui.statPowerupMagnet.textContent = formatScore(runStats.powerups.magnet);
  }

  function openGameStats() {
    if (gameState !== "gameover") return;
    ui.gameoverOverlay.hidden = true;
    ui.statsOverlay.hidden = false;
    ui.statsCloseButton.focus({ preventScroll: true });
    announce("Game stats.");
  }

  function closeGameStats() {
    if (gameState !== "gameover" || ui.statsOverlay.hidden) return;
    ui.statsOverlay.hidden = true;
    ui.gameoverOverlay.hidden = false;
    ui.statsButton.focus({ preventScroll: true });
    announce("Game over.");
  }

  function openResetConfirmation() {
    if (gameState !== "paused") return;
    ui.pauseOverlay.hidden = true;
    ui.resetConfirmOverlay.hidden = false;
    ui.resetCancelButton.focus({ preventScroll: true });
    announce("Confirm reset. Your current game will end.");
  }

  function cancelResetConfirmation() {
    if (gameState !== "paused" || ui.resetConfirmOverlay.hidden) return;
    ui.resetConfirmOverlay.hidden = true;
    ui.pauseOverlay.hidden = false;
    ui.resetButton.focus({ preventScroll: true });
    announce("Reset cancelled. Intermission.");
  }

  function confirmResetGame() {
    if (gameState !== "paused") return;
    saveRunRecords();
    startGame();
  }

  function togglePause(forcePause = false) {
    if (gameState === "running") {
      gameState = "paused";
      setPausePresentation(true);
      ui.resetConfirmOverlay.hidden = true;
      ui.pauseOverlay.hidden = false;
      ui.pauseButton.textContent = "RESUME";
      resetJoystick();
      announce("Intermission.");
      return;
    }

    if (gameState === "paused" && !forcePause) {
      gameState = "running";
      setPausePresentation(false);
      ui.pauseOverlay.hidden = true;
      ui.resetConfirmOverlay.hidden = true;
      ui.pauseButton.textContent = "PAUSE";
      lastFrame = performance.now();
      canvas.focus({ preventScroll: true });
      announce("The Movie Master has resumed.");
    }
  }

  function announce(message) {
    ui.statusAnnouncement.textContent = "";
    window.setTimeout(() => {
      ui.statusAnnouncement.textContent = message;
    }, 20);
  }

  function setBanner(message, duration = 2, danger = false) {
    bannerMessage = message;
    bannerTime = duration;
    bannerDanger = danger;
  }

  function ensureAudio() {
    if (!soundOn || audioContext) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    try {
      audioContext = new AudioContextClass();
    } catch {
      audioContext = null;
    }
  }

  function tone(frequency, duration, type = "sine", volume = 0.045, delay = 0) {
    if (!soundOn) return;
    ensureAudio();
    if (!audioContext) return;

    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }

    const start = audioContext.currentTime + delay;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  function playCue(name) {
    if (!soundOn) return;

    if (name === "start") {
      tone(220, 0.16, "triangle", 0.055);
      tone(330, 0.18, "triangle", 0.055, 0.1);
      tone(440, 0.24, "triangle", 0.06, 0.2);
    } else if (name === "destroy") {
      tone(520, 0.08, "square", 0.025);
      tone(720, 0.1, "triangle", 0.025, 0.045);
    } else if (name === "popcorn") {
      tone(660, 0.09, "sine", 0.05);
      tone(880, 0.14, "sine", 0.04, 0.07);
    } else if (name === "miss") {
      tone(145, 0.2, "sawtooth", 0.055);
      tone(105, 0.28, "square", 0.035, 0.08);
    } else if (name === "hit") {
      tone(95, 0.22, "sawtooth", 0.075);
      tone(66, 0.28, "square", 0.035, 0.04);
    } else if (name === "blast") {
      tone(110, 0.45, "sawtooth", 0.055);
      tone(330, 0.5, "triangle", 0.05, 0.03);
      tone(660, 0.42, "sine", 0.045, 0.12);
    } else if (name === "advance") {
      tone(410, 0.12, "square", 0.035);
      tone(520, 0.16, "square", 0.035, 0.1);
    } else if (name === "gameover") {
      tone(230, 0.25, "triangle", 0.05);
      tone(170, 0.32, "triangle", 0.05, 0.18);
      tone(110, 0.5, "triangle", 0.055, 0.38);
    }
  }

  function toggleSound() {
    soundOn = !soundOn;
    saveValue(SOUND_KEY, soundOn ? "on" : "off");
    ui.soundButton.textContent = soundOn ? "SOUND ON" : "SOUND OFF";
    ui.soundButton.setAttribute("aria-pressed", soundOn ? "false" : "true");

    if (soundOn) {
      ensureAudio();
      tone(540, 0.11, "triangle", 0.04);
    }
  }

  function updateMovementModeUi() {
    if (movementMode === "touch") {
      ui.movementButton.textContent = "MOVE: TOUCH";
      ui.startMoveCopy.textContent = "TOUCH JOYSTICK";
      ui.desktopInstructions.textContent = "KEEP MOVING • COLLECT POPCORN & POWER-UPS • USE THE GOLD BUTTON WHEN READY";
      ui.mobileInstructions.textContent = ui.desktopInstructions.textContent;
      return;
    }

    const usingMouse = movementMode === "mouse";
    ui.movementButton.textContent = usingMouse ? "MOVE: MOUSE" : "MOVE: KEYS";
    ui.movementButton.setAttribute(
      "aria-label",
      usingMouse
        ? "Movement follows the mouse. Activate to use WASD and arrow keys."
        : "Movement uses WASD and arrow keys. Activate to follow the mouse.",
    );
    ui.startMoveCopy.textContent = usingMouse ? "FOLLOW THE MOUSE" : "WASD / ARROWS";
    const movementInstruction = usingMouse ? "FOLLOW THE MOUSE TO MOVE" : "WASD / ARROWS TO MOVE";
    ui.desktopInstructions.textContent = `${movementInstruction} • AUTOMATIC SHOOTING • COLLECT POWER-UPS • SPACE FOR BLOCKBUSTER BLAST`;
    ui.mobileInstructions.textContent = "KEEP MOVING • COLLECT POPCORN & POWER-UPS • USE THE GOLD BUTTON WHEN READY";
  }

  function toggleMovementMode() {
    if (coarsePointer) return;
    movementMode = movementMode === "mouse" ? "keys" : "mouse";
    saveValue(MOVEMENT_KEY, movementMode);
    mouseTarget.active = false;
    keys.clear();
    updateMovementModeUi();

    const message = movementMode === "mouse" ? "MOUSE MOVEMENT SELECTED" : "KEYBOARD MOVEMENT SELECTED";
    if (gameState === "running") setBanner(message, 1.4, false);
    announce(message.toLowerCase());
    canvas.focus({ preventScroll: true });
  }

  function applyQuality(level, persist = true, announceChange = true) {
    qualityLevel = QUALITY_LEVELS[level] ? level : "high";
    qualitySettings = QUALITY_LEVELS[qualityLevel];
    if (persist) saveValue(QUALITY_KEY, qualityLevel);
    if (document.documentElement?.dataset) {
      document.documentElement.dataset.gameQuality = qualityLevel;
    }
    ui.qualityButton.textContent = `QUALITY: ${qualitySettings.label}`;
    ui.qualityButton.setAttribute(
      "aria-label",
      `Visual quality ${qualitySettings.label.toLowerCase()}. Activate for the next quality level.`,
    );
    if (world.width > 0) resizeCanvas();

    if (announceChange) {
      const message = `${qualitySettings.label} QUALITY SELECTED`;
      if (gameState === "running") setBanner(message, 1.4, false);
      announce(message.toLowerCase());
      canvas.focus({ preventScroll: true });
    }
  }

  function cycleQuality() {
    const currentIndex = QUALITY_ORDER.indexOf(qualityLevel);
    const nextLevel = QUALITY_ORDER[(currentIndex + 1) % QUALITY_ORDER.length];
    applyQuality(nextLevel);
  }

  function enemyDefinition(kind) {
    const definitions = {
      standard: { radius: 23, speed: 1, hp: 1, color: "#6d5747", score: 34 },
      fast: { radius: 18, speed: 1.56, hp: 1, color: "#a53a29", score: 52 },
      heavy: { radius: 31, speed: 0.72, hp: 3, color: "#513660", score: 105 },
    };
    return definitions[kind];
  }

  function chooseEnemyKind(forceKind = null) {
    if (forceKind) return forceKind;
    const roll = Math.random();
    if (difficultyLevel >= 3 && roll > 0.82) return "heavy";
    if (difficultyLevel >= 2 && roll < Math.min(0.2 + difficultyLevel * 0.025, 0.38)) return "fast";
    return "standard";
  }

  function addEnemy({ x, y, kind = null, mode = "chase", vx = 0, vy = 0 }) {
    const resolvedKind = chooseEnemyKind(kind);
    const definition = enemyDefinition(resolvedKind);
    const speedScale = 1 + elapsed * 0.004 + Math.max(0, difficultyLevel - 1) * 0.045;
    enemies.push({
      x,
      y,
      vx,
      vy,
      radius: scaleWorld(definition.radius),
      speed: scaleWorld(REFERENCE_ENEMY_SPEED) * definition.speed * speedScale,
      hp: definition.hp,
      maxHp: definition.hp,
      color: definition.color,
      scoreValue: definition.score,
      kind: resolvedKind,
      mode,
      phase: Math.random() * Math.PI * 2,
      hitFlash: 0,
      blastMarked: false,
      collisionStamp: 0,
      destroyed: false,
    });
    runStats.peakGarbage = Math.max(runStats.peakGarbage, enemies.length);
  }

  function spawnEnemy(forceKind = null) {
    const kind = chooseEnemyKind(forceKind);
    const definition = enemyDefinition(kind);
    const { left, right, top, bottom } = world.bounds;
    const edge = Math.floor(Math.random() * 4);
    const margin = scaleWorld(definition.radius + 28);
    let x;
    let y;

    if (edge === 0) {
      x = randomBetween(left, right);
      y = top - margin;
    } else if (edge === 1) {
      x = right + margin;
      y = randomBetween(top, bottom);
    } else if (edge === 2) {
      x = randomBetween(left, right);
      y = bottom + margin;
    } else {
      x = left - margin;
      y = randomBetween(top, bottom);
    }

    addEnemy({ x, y, kind });
  }

  function queueGarbageRush() {
    const { left, right, top, bottom } = world.bounds;
    const horizontal = Math.random() < 0.5;
    const edge = horizontal
      ? Math.random() < 0.5 ? "top" : "bottom"
      : Math.random() < 0.5 ? "left" : "right";
    const spanStart = horizontal ? left : top;
    const spanEnd = horizontal ? right : bottom;
    const span = spanEnd - spanStart;
    const gapSize = clamp(span * 0.23, scaleWorld(86), scaleWorld(158));
    const gapCenter = randomBetween(spanStart + gapSize * 0.65, spanEnd - gapSize * 0.65);

    rushWarning = {
      edge,
      gapCenter,
      gapSize,
      life: 1.15,
      totalLife: 1.15,
    };
    setBanner("GARBAGE RUSH — FIND THE OPENING", 1.5, true);
    announce("Garbage rush. Find the opening.");
    playCue("miss");
  }

  function launchGarbageRush(warning) {
    const { left, right, top, bottom } = world.bounds;
    const horizontal = warning.edge === "top" || warning.edge === "bottom";
    const spanStart = horizontal ? left : top;
    const spanEnd = horizontal ? right : bottom;
    const spacing = clamp((spanEnd - spanStart) / 7, scaleWorld(54), scaleWorld(88));
    const direction = warning.edge === "top" || warning.edge === "left" ? 1 : -1;
    const rushSpeed = scaleWorld(150 + difficultyLevel * 11);
    const rushOffset = scaleWorld(42);

    for (let position = spanStart + spacing * 0.45; position < spanEnd; position += spacing) {
      if (Math.abs(position - warning.gapCenter) < warning.gapSize / 2) continue;
      const fast = Math.random() < Math.min(0.18 + difficultyLevel * 0.025, 0.34);
      if (horizontal) {
        addEnemy({
          x: position,
          y: warning.edge === "top" ? top - rushOffset : bottom + rushOffset,
          kind: fast ? "fast" : "standard",
          mode: "rush",
          vx: 0,
          vy: rushSpeed * direction,
        });
      } else {
        addEnemy({
          x: warning.edge === "left" ? left - rushOffset : right + rushOffset,
          y: position,
          kind: fast ? "fast" : "standard",
          mode: "rush",
          vx: rushSpeed * direction,
          vy: 0,
        });
      }
    }

    shakeTime = reducedMotion ? 0.06 : 0.22;
    shakePower = reducedMotion ? 1 : 5;
    showCombo("GARBAGE RUSH");
  }

  function getTouchControlExclusionZones(popcornRadius = 0) {
    if (!coarsePointer) return [];

    const canvasRect = canvas.getBoundingClientRect();
    const clearance = popcornRadius + Math.max(12, scaleWorld(18));

    return [ui.joystick, ui.judgmentButton]
      .map((control) => control.getBoundingClientRect())
      .filter((rect) => rect.width > 0 && rect.height > 0)
      .map((rect) => ({
        left: rect.left - canvasRect.left - clearance,
        right: rect.right - canvasRect.left + clearance,
        top: rect.top - canvasRect.top - clearance,
        bottom: rect.bottom - canvasRect.top + clearance,
      }));
  }

  function isPopcornBlockedByTouchControls(x, y, radius) {
    return getTouchControlExclusionZones(radius).some((zone) => (
      x >= zone.left &&
      x <= zone.right &&
      y >= zone.top &&
      y <= zone.bottom
    ));
  }

  function choosePopcornPosition(radius) {
    const { left, right, top, bottom } = world.playerBounds;
    const width = right - left;
    const height = bottom - top;
    const requiredDistance = Math.min(Math.hypot(width, height) * 0.33, scaleWorld(280));
    const spawnInset = scaleWorld(POPCORN_SAFE_BORDER);
    const centerX = (left + right) / 2;
    const centerY = (top + bottom) / 2;
    const minX = Math.min(centerX, left + spawnInset);
    const maxX = Math.max(centerX, right - spawnInset);
    const minY = Math.min(centerY, top + spawnInset);
    const maxY = Math.max(centerY, bottom - spawnInset);
    const enemyClearance = scaleWorld(70);
    let best = null;
    let bestClearance = -Infinity;

    const consider = (x, y) => {
      if (isPopcornBlockedByTouchControls(x, y, radius)) return false;

      const playerDistance = Math.hypot(x - player.x, y - player.y);
      let nearestClearance = playerDistance;
      let clearsEnemies = true;

      for (const enemy of enemies) {
        const enemyDistance = Math.hypot(x - enemy.x, y - enemy.y);
        nearestClearance = Math.min(nearestClearance, enemyDistance);
        if (enemyDistance < enemyClearance) clearsEnemies = false;
      }

      if (playerDistance >= requiredDistance && clearsEnemies) {
        best = { x, y };
        return true;
      }

      if (nearestClearance > bestClearance) {
        bestClearance = nearestClearance;
        best = { x, y };
      }
      return false;
    };

    for (let attempt = 0; attempt < 32; attempt += 1) {
      if (consider(randomBetween(minX, maxX), randomBetween(minY, maxY))) return best;
    }

    for (let row = 0; row < 7; row += 1) {
      const y = minY + ((maxY - minY) * (row + 0.5)) / 7;
      for (let column = 0; column < 9; column += 1) {
        const x = minX + ((maxX - minX) * (column + 0.5)) / 9;
        if (consider(x, y)) return best;
      }
    }

    return best;
  }

  function spawnPopcorn() {
    if (pickups.length) return;

    const radius = scaleWorld(21);
    const position = choosePopcornPosition(radius);
    if (!position) {
      popcornSpawnTimer = 0.35;
      return;
    }

    const totalTtl = clamp(8.8 - difficultyLevel * 0.18, 5.7, 8.6) * POPCORN_LIFETIME_MULTIPLIER;
    pickups.push({
      x: position.x,
      y: position.y,
      radius,
      ttl: totalTtl,
      totalTtl,
      phase: Math.random() * Math.PI * 2,
    });
  }

  function spawnPowerup() {
    if (powerups.length) return;

    const { left, right, top, bottom } = world.bounds;
    const availableTypes = Object.keys(POWERUP_TYPES);
    const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
    const horizontalInset = scaleWorld(62);
    const topInset = scaleWorld(55);
    const bottomInset = scaleWorld(72);
    let x = (left + right) / 2;
    let y = (top + bottom) / 2;
    let attempts = 0;

    do {
      x = randomBetween(left + horizontalInset, right - horizontalInset);
      y = randomBetween(top + topInset, bottom - bottomInset);
      attempts += 1;
    } while (
      attempts < 18 &&
      (Math.hypot(x - player.x, y - player.y) < scaleWorld(170) ||
        enemies.some((enemy) => Math.hypot(x - enemy.x, y - enemy.y) < scaleWorld(75)) ||
        pickups.some((pickup) => Math.hypot(x - pickup.x, y - pickup.y) < scaleWorld(90)))
    );

    powerups.push({
      type,
      x,
      y,
      radius: scaleWorld(23),
      ttl: 11,
      totalTtl: 11,
      phase: Math.random() * Math.PI * 2,
    });
  }

  function collectPowerup(index) {
    const powerup = powerups[index];
    const definition = POWERUP_TYPES[powerup.type];
    powerups.splice(index, 1);
    powerupSpawnTimer = randomBetween(8, 13);
    runStats.powerups[powerup.type] += 1;

    let message = "";
    let announcement = "";
    if (powerup.type === "shield") {
      shieldTime = POWERUP_DURATION;
      shieldHits = SHIELD_HITS;
      message = `SHIELD — ${SHIELD_HITS} HITS / ${POWERUP_DURATION} SECONDS`;
      announcement = `Shield activated for ${POWERUP_DURATION} seconds. It can block ${SHIELD_HITS} hits.`;
    } else if (powerup.type === "speed") {
      speedTime = POWERUP_DURATION;
      message = `SUPER SPEED — ${POWERUP_DURATION} SECONDS`;
      announcement = `Super Speed activated for ${POWERUP_DURATION} seconds.`;
    } else if (powerup.type === "super") {
      superStarsTime = POWERUP_DURATION;
      shotTimer = 0;
      const superStarCount = 10 * starRowSize;
      message = `SUPER STARS — ${superStarCount} AT A TIME / ${POWERUP_DURATION} SECONDS`;
      announcement = `Super Stars activated for ${POWERUP_DURATION} seconds. ${superStarCount} stars fire across ten directions at once.`;
    } else {
      magnetTime = POWERUP_DURATION;
      message = `MAGNET — NEARBY COLLECTIBLES / ${POWERUP_DURATION} SECONDS`;
      announcement = `Magnet activated for ${POWERUP_DURATION} seconds. Nearby popcorn and powerups are pulled toward the Movie Master.`;
    }

    addParticles(powerup.x, powerup.y, definition.color, 26, 210);
    addFloatingText(powerup.x, powerup.y - scaleWorld(34), definition.label, definition.color, true);
    showCombo(`${definition.label} ACTIVATED`);
    setBanner(message, 2.2, false);
    announce(announcement);
    playCue("advance");
  }

  function missPopcorn() {
    popcornChain = 0;
    mastery = Math.max(0, mastery - 0.1);
    runStats.popcornMissed += 1;
    popcornSpawnTimer = 0.55;
    const surgeCount = Math.min(9, 3 + Math.ceil(difficultyLevel * 0.75));

    for (let i = 0; i < surgeCount; i += 1) {
      spawnEnemy(i % 4 === 0 && difficultyLevel >= 2 ? "fast" : null);
    }

    setBanner("POPCORN MISSED — MORE GARBAGE HAS ARRIVED", 2.2, true);
    showCombo("GARBAGE SURGE");
    announce("Popcorn missed. More garbage has arrived.");
    shakeTime = reducedMotion ? 0.06 : 0.28;
    shakePower = reducedMotion ? 1 : 6;
    playCue("miss");
  }

  function emitRecommendationRow(directionX, directionY, color, speed, projectileRadius) {
    const startX = player.x;
    const startY = player.y - player.drawHeight * 0.08;
    const perpendicularX = -directionY;
    const perpendicularY = directionX;
    const rowSpacing = projectileRadius * 1.8;
    const rowCenter = (starRowSize - 1) / 2;

    for (let index = 0; index < starRowSize; index += 1) {
      const rowOffset = (index - rowCenter) * rowSpacing;
      const projectile = acquireProjectile();
      projectile.x = startX + perpendicularX * rowOffset;
      projectile.y = startY + perpendicularY * rowOffset;
      projectile.vx = directionX * speed;
      projectile.vy = directionY * speed;
      projectile.radius = projectileRadius;
      projectile.color = color;
      projectile.rotation = Math.random() * STAR_ROTATION_PERIOD;
      projectiles.push(projectile);
      runStats.starsFired += 1;
    }
  }

  function launchRecommendation(aimX, aimY, color = COLORS.goldBright) {
    const startX = player.x;
    const startY = player.y - player.drawHeight * 0.08;
    const dx = aimX - startX;
    const dy = aimY - startY;
    const length = magnitude(dx, dy);
    if (length < 1) return false;

    emitRecommendationRow(
      dx / length,
      dy / length,
      color,
      currentProjectileSpeed(),
      currentProjectileRadius(),
    );
    return true;
  }

  function currentShotInterval() {
    const baseInterval = Math.max(0.24, 0.36 - difficultyLevel * 0.008);
    return Math.max(0.105, baseInterval * Math.pow(0.88, recommendationPower));
  }

  function currentProjectileSpeed() {
    const speedUpgrade = 1 + Math.min(0.8, recommendationPower * 0.12);
    return scaleWorld(690) * speedUpgrade;
  }

  function currentProjectileRadius() {
    return scaleWorld(Math.min(20, 7 + recommendationPower * 1.4));
  }

  function fireSuperStars() {
    const rotationCosine = Math.cos(superVolleyAngle);
    const rotationSine = Math.sin(superVolleyAngle);
    const speed = currentProjectileSpeed();
    const projectileRadius = currentProjectileRadius();
    for (const direction of SUPER_STAR_DIRECTIONS) {
      emitRecommendationRow(
        direction.x * rotationCosine - direction.y * rotationSine,
        direction.x * rotationSine + direction.y * rotationCosine,
        COLORS.super,
        speed,
        projectileRadius,
      );
    }
    superVolleyAngle = (superVolleyAngle + Math.PI / 10) % (Math.PI * 2);
  }

  function fireAutomaticRecommendation() {
    if (!enemies.length) return false;

    const rangeUpgrade = 1 + Math.min(0.65, recommendationPower * 0.07);
    const maxRange = scaleWorld(560) * rangeUpgrade;
    const maxRangeSquared = maxRange * maxRange;
    let target = null;
    let targetDistanceSquared = maxRangeSquared;
    let bestThreatScore = maxRangeSquared;

    for (const enemy of enemies) {
      if (enemy.destroyed) continue;
      const candidateDistance = distanceSquared(player, enemy);
      if (candidateDistance > maxRangeSquared) continue;
      const threatWeight = (enemy.kind === "fast" ? 1.35 : 1)
        * (enemy.mode === "rush" ? 1.12 : 1);
      const threatScore = candidateDistance / (threatWeight * threatWeight);
      if (threatScore < bestThreatScore) {
        bestThreatScore = threatScore;
        targetDistanceSquared = candidateDistance;
        target = enemy;
      }
    }

    if (!target) return false;

    const closeThreatDistance = scaleWorld(CLOSE_THREAT_RADIUS);
    const closeThreat = targetDistanceSquared <= closeThreatDistance * closeThreatDistance;
    if (!player.moving && !closeThreat) return false;

    const preferredLead = target.mode === "rush" ? 0.11 : target.kind === "fast" ? 0.18 : 0.08;
    const lead = closeThreat
      ? 0
      : cappedLeadTime(
        player.x,
        player.y,
        target.x,
        target.y,
        target.vx,
        target.vy,
        preferredLead,
        MAX_RECOMMENDATION_LEAD_FRACTION,
      );
    const aimX = target.x + (target.vx || 0) * lead;
    const aimY = target.y + (target.vy || 0) * lead;
    return launchRecommendation(aimX, aimY);
  }

  function addParticles(x, y, color, count = 10, speed = 120) {
    const motionMultiplier = reducedMotion ? 0.35 : 1;
    const actualCount = Math.ceil(count * motionMultiplier * qualitySettings.particleMultiplier);
    for (let i = 0; i < actualCount; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = randomBetween(speed * 0.35, speed) * world.gameScale;
      const maxLife = randomBetween(0.34, 0.78);
      const particle = acquireParticle();
      particle.x = x;
      particle.y = y;
      particle.vx = Math.cos(angle) * velocity;
      particle.vy = Math.sin(angle) * velocity;
      particle.life = maxLife;
      particle.maxLife = maxLife;
      particle.size = randomBetween(2, 6) * world.gameScale;
      particle.color = color;
      particle.star = Math.random() < 0.24;
      particles.push(particle);
    }
  }

  function addFloatingText(x, y, text, color = COLORS.goldBright, large = false) {
    const maxLife = large ? 1.25 : 0.85;
    floatingTexts.push({
      x,
      y,
      text,
      color,
      life: maxLife,
      maxLife,
      size: Math.max(9, scaleWorld(large ? 28 : 18)),
    });
  }

  function registerDestroy(enemy, fromBlast = false) {
    enemy.destroyed = true;
    const activeCombo = comboTimer > 0;
    killCombo = activeCombo ? killCombo + 1 : 1;
    comboTimer = 1.65;
    const comboMultiplier = 1 + Math.min(1.5, Math.floor(killCombo / 6) * 0.5);
    const points = Math.round(enemy.scoreValue * comboMultiplier * (fromBlast ? 0.64 : 1));
    score += points;
    addBlastCharge(fromBlast ? 0.006 : 0.018);
    runStats.garbageDestroyed += 1;
    runStats.bestCombo = Math.max(runStats.bestCombo, killCombo);
    if (fromBlast) runStats.destroyedByBlasts += 1;
    else runStats.destroyedByStars += 1;

    addParticles(enemy.x, enemy.y, COLORS.goldBright, enemy.kind === "heavy" ? 20 : 11, 165);
    addParticles(enemy.x, enemy.y, enemy.color, 7, 105);
    addFloatingText(enemy.x, enemy.y - enemy.radius, `+${points}`, COLORS.goldLight);

    if (!fromBlast) playCue("destroy");
  }

  function showCombo(message) {
    ui.comboCallout.textContent = message;
    ui.comboCallout.classList.remove("active");
    void ui.comboCallout.offsetWidth;
    ui.comboCallout.classList.add("active");
  }

  function awardRecommendationUpgrade(pickup) {
    recommendationPower += 1;
    const movementUpgraded = popcornChain % 20 === 0;
    if (movementUpgraded) movementPower += 1;

    const unlockedRowSize = Math.min(5, 1 + Math.floor(popcornChain / 100));
    const rowUpgraded = unlockedRowSize > starRowSize;
    if (rowUpgraded) starRowSize = unlockedRowSize;
    const dualBlastUpgraded = !dualBlastUnlocked && popcornChain >= DUAL_BLAST_STREAK;
    if (dualBlastUpgraded) dualBlastUnlocked = true;

    const message = dualBlastUpgraded
      ? `${popcornChain} POPCORNS IN A ROW — SECOND BLAST BAR UNLOCKED`
      : rowUpgraded
        ? `${popcornChain} POPCORNS IN A ROW — ${starRowSize}-STAR ROWS UNLOCKED`
        : movementUpgraded
          ? `${popcornChain} POPCORNS IN A ROW — STARS + MOVEMENT FASTER`
          : `${popcornChain} POPCORNS IN A ROW — FASTER, LARGER STARS`;
    showCombo(
      dualBlastUpgraded
        ? "SECOND BLAST BAR UNLOCKED"
        : rowUpgraded
          ? `${starRowSize}-STAR ROWS UNLOCKED`
          : movementUpgraded
            ? "STARS + MOVEMENT UPGRADED"
            : "RECOMMENDATION STARS UPGRADED",
    );
    setBanner(message, 2.4, false);
    addFloatingText(
      pickup.x,
      pickup.y - scaleWorld(38),
      dualBlastUpgraded
        ? "BLAST × 2"
        : rowUpgraded
          ? `★ × ${starRowSize}`
          : movementUpgraded
            ? "★ + SPEED ★"
            : "★ UPGRADE ★",
      COLORS.goldBright,
      true,
    );
    announce(
      dualBlastUpgraded
        ? `${popcornChain} popcorns in a row. A second Blockbuster Blast bar is unlocked.`
        : rowUpgraded
          ? `${popcornChain} popcorns in a row. Every shot now fires a row of ${starRowSize} stars.`
          : movementUpgraded
            ? `${popcornChain} popcorns in a row. Recommendation stars and movement speed upgraded.`
            : `${popcornChain} popcorns in a row. Recommendation stars upgraded.`,
    );
    playCue("advance");
  }

  function collectPopcorn(index) {
    const pickup = pickups[index];
    pickups.splice(index, 1);
    popcornCollected += 1;
    popcornChain += 1;
    longestStreak = Math.max(longestStreak, popcornChain);
    popcornSpawnTimer = 0.65;

    const points = 300 + Math.min(500, Math.max(0, popcornChain - 1) * 75);
    score += points;
    addBlastCharge(0.22);

    const restored = !hardcoreMode
      && popcornCollected % 6 === 0
      && player.lives < maximumLives();
    if (restored) player.lives += 1;

    addParticles(pickup.x, pickup.y, COLORS.cream, 18, 165);
    addFloatingText(
      pickup.x,
      pickup.y - scaleWorld(20),
      restored ? `+${points}  ★ RESTORED` : `+${points}  POPCORN`,
      COLORS.cream,
      true,
    );
    if (popcornChain % 10 === 0) {
      awardRecommendationUpgrade(pickup);
    } else {
      showCombo(popcornChain > 1 ? `${popcornChain} POPCORNS IN A ROW` : "POPCORN COLLECTED");
    }
    playCue("popcorn");
  }

  function damagePlayer(enemyIndex) {
    if (gameState !== "running") return;

    if (player.invulnerable > 0) {
      const overlappingEnemy = enemies[enemyIndex];
      if (overlappingEnemy) {
        overlappingEnemy.destroyed = true;
        enemies.splice(enemyIndex, 1);
        addParticles(overlappingEnemy.x, overlappingEnemy.y, overlappingEnemy.color, 5, 90);
      }
      return;
    }

    const enemy = enemies[enemyIndex];
    if (enemy) enemy.destroyed = true;
    enemies.splice(enemyIndex, 1);

    if (shieldTime > 0 && shieldHits > 0) {
      shieldHits -= 1;
      runStats.shieldBlocks += 1;
      player.invulnerable = 0.24;
      shakeTime = reducedMotion ? 0.04 : 0.15;
      shakePower = reducedMotion ? 1 : 4;
      addParticles(player.x, player.y, COLORS.shield, 20, 180);
      addFloatingText(player.x, player.y - scaleWorld(54), "SHIELD BLOCKED IT", COLORS.shield, true);

      if (shieldHits > 0) {
        setBanner(`SHIELD BLOCKED GARBAGE — ${shieldHits} HITS LEFT`, 1.6, false);
        announce(`Shield blocked garbage. ${shieldHits} hits left.`);
      } else {
        shieldTime = 0;
        setBanner("SHIELD BLOCKED GARBAGE — SHIELD BROKEN", 1.8, true);
        announce("Shield blocked garbage and broke.");
      }

      playCue("destroy");
      vibrateGamepad("shield");
      updateInterface(true);
      return;
    }

    player.lives = Math.max(0, player.lives - 1);
    runStats.hitsTaken += 1;
    player.invulnerable = 1.18;
    player.stationaryTime = 0;
    mastery = Math.max(0, mastery - 0.18);
    popcornChain = 0;
    killCombo = 0;
    comboTimer = 0;
    shakeTime = reducedMotion ? 0.08 : 0.42;
    shakePower = reducedMotion ? 2 : 11;

    addParticles(player.x, player.y, COLORS.red, 22, 210);
    addFloatingText(player.x, player.y - scaleWorld(54), "GARBAGE 🗑️", "#ff806b", true);
    setBanner("GARBAGE TOUCHED THE MOVIE MASTER", 1.7, true);
    playCue("hit");
    vibrateGamepad("hit");

    if (enemy) {
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const length = magnitude(dx, dy) || 1;
      const movementBounds = world.playerBounds;
      const knockback = scaleWorld(34);
      player.x = clamp(player.x + (dx / length) * knockback, movementBounds.left, movementBounds.right);
      player.y = clamp(player.y + (dy / length) * knockback, movementBounds.top, movementBounds.bottom);
    }

    updateInterface(true);
    if (player.lives <= 0) endGame();
  }

  function activateBlast(sourceGamepad = null) {
    if (gameState !== "running" || mastery < 0.999 || blast) return;

    mastery = Math.max(0, mastery - 1);
    const anotherBlastReady = mastery >= 0.999;
    blastReadyAnnounced = anotherBlastReady;
    runStats.blastsUsed += 1;
    blast = {
      x: player.x,
      y: player.y,
      radius: 0,
      maxRadius: magnitude(world.width, world.height) * 1.06,
      life: 0,
      duration: 0.72,
    };

    for (const enemy of enemies) enemy.blastMarked = false;
    shakeTime = reducedMotion ? 0.08 : 0.56;
    shakePower = reducedMotion ? 2 : 9;
    triggerFlash();
    showCombo("BLOCKBUSTER BLAST");
    setBanner(
      anotherBlastReady ? "BLOCKBUSTER BLAST — ANOTHER BLAST READY" : "BLOCKBUSTER BLAST",
      1.15,
      false,
    );
    announce(
      anotherBlastReady
        ? "Blockbuster Blast activated. Another blast is ready."
        : "Blockbuster Blast activated.",
    );
    playCue("blast");
    vibrateGamepad("blast", sourceGamepad);
    updateInterface(true);
  }

  function triggerFlash() {
    ui.screenFlash.classList.remove("active");
    void ui.screenFlash.offsetWidth;
    ui.screenFlash.classList.add("active");
  }

  function update(dt) {
    elapsed += dt;
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    shieldTime = Math.max(0, shieldTime - dt);
    speedTime = Math.max(0, speedTime - dt);
    superStarsTime = Math.max(0, superStarsTime - dt);
    magnetTime = Math.max(0, magnetTime - dt);
    if (shieldTime === 0) shieldHits = 0;
    player.bob += dt * (player.moving ? 8 : 3);
    bannerTime = Math.max(0, bannerTime - dt);

    const nextDifficulty = 1 + Math.floor(elapsed / 27);
    if (nextDifficulty > difficultyLevel) {
      difficultyLevel = nextDifficulty;
      setBanner("MORE GARBAGE IS APPROACHING", 2, true);
      announce("More garbage is approaching.");
      playCue("advance");
    }

    updateMovement(dt);
    if (player.moving) runStats.movingTime += dt;

    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnEnemy();
      if (difficultyLevel >= 4 && Math.random() < Math.min(0.1 + difficultyLevel * 0.018, 0.28)) {
        spawnEnemy();
      }
      const baseInterval = Math.max(0.34, 1.05 - elapsed * 0.0085);
      spawnTimer = baseInterval * randomBetween(0.78, 1.15);
    }

    shotTimer = Math.max(0, shotTimer - dt);
    if (superStarsTime > 0 && shotTimer <= 0) {
      fireSuperStars();
      shotTimer = currentShotInterval();
    } else if (shotTimer <= 0) {
      const fired = fireAutomaticRecommendation();
      shotTimer = fired || player.moving ? currentShotInterval() : 0.08;
    }

    if (!pickups.length) {
      popcornSpawnTimer -= dt;
      if (popcornSpawnTimer <= 0) spawnPopcorn();
    }

    if (!powerups.length) {
      powerupSpawnTimer -= dt;
      if (powerupSpawnTimer <= 0) spawnPowerup();
    }

    rushTimer -= dt;
    if (rushTimer <= 0 && !rushWarning) {
      queueGarbageRush();
      rushTimer = randomBetween(13.5, 17) - Math.min(3, difficultyLevel * 0.3);
    }

    if (rushWarning) {
      rushWarning.life -= dt;
      if (rushWarning.life <= 0) {
        const warning = rushWarning;
        rushWarning = null;
        launchGarbageRush(warning);
      }
    }

    comboTimer = Math.max(0, comboTimer - dt);
    if (comboTimer === 0) killCombo = 0;

    updatePowerups(dt);
    updatePickups(dt);
    updateEnemies(dt);
    updateProjectiles(dt);
    updateBlast(dt);
    updateParticles(dt);
    updateFloatingTexts(dt);

    shakeTime = Math.max(0, shakeTime - dt);
    updateInterface();
  }

  function updateMovement(dt) {
    let dx = 0;
    let dy = 0;
    const touchMagnitude = magnitude(touchMove.x, touchMove.y);

    if (gamepadMove.active) {
      dx = gamepadMove.x;
      dy = gamepadMove.y;
    } else if (touchMagnitude > 0.08) {
      dx = touchMove.x;
      dy = touchMove.y;
    } else if (movementMode === "mouse" && mouseTarget.active) {
      const targetDx = mouseTarget.x - player.x;
      const targetDy = mouseTarget.y - player.y;
      const targetDistance = magnitude(targetDx, targetDy);
      if (targetDistance > scaleWorld(9)) {
        const approachSpeed = Math.min(1, targetDistance / scaleWorld(72));
        dx = (targetDx / targetDistance) * approachSpeed;
        dy = (targetDy / targetDistance) * approachSpeed;
      }
    } else {
      if (keys.has("ArrowLeft") || keys.has("KeyA")) dx -= 1;
      if (keys.has("ArrowRight") || keys.has("KeyD")) dx += 1;
      if (keys.has("ArrowUp") || keys.has("KeyW")) dy -= 1;
      if (keys.has("ArrowDown") || keys.has("KeyS")) dy += 1;
    }

    const length = magnitude(dx, dy);
    if (length > 1) {
      dx /= length;
      dy /= length;
    }

    const previousX = player.x;
    const previousY = player.y;
    const popcornSpeedMultiplier = 1 + Math.min(0.6, movementPower * 0.1);
    const movementSpeed = player.speed * popcornSpeedMultiplier * (speedTime > 0 ? 1.85 : 1);
    const requestedVx = dx * movementSpeed;
    const requestedVy = dy * movementSpeed;
    const movementBounds = world.playerBounds;
    const nextX = clamp(player.x + requestedVx * dt, movementBounds.left, movementBounds.right);
    const nextY = clamp(player.y + requestedVy * dt, movementBounds.top, movementBounds.bottom);
    const actualDx = nextX - previousX;
    const actualDy = nextY - previousY;

    player.moving = actualDx * actualDx + actualDy * actualDy > 0.01;
    if (player.moving) player.stationaryTime = 0;
    else player.stationaryTime += dt;

    player.vx = dt > 0 ? actualDx / dt : 0;
    player.vy = dt > 0 ? actualDy / dt : 0;
    player.x = nextX;
    player.y = nextY;
  }

  function updateEnemies(dt) {
    for (let i = enemies.length - 1; i >= 0; i -= 1) {
      const enemy = enemies[i];
      enemy.phase += dt * (enemy.kind === "fast" ? 8 : 4.5);
      enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);

      if (enemy.mode === "rush") {
        enemy.x += enemy.vx * dt;
        enemy.y += enemy.vy * dt;
        if (
          enemy.x < world.bounds.left - scaleWorld(90) ||
          enemy.x > world.bounds.right + scaleWorld(90) ||
          enemy.y < world.bounds.top - scaleWorld(90) ||
          enemy.y > world.bounds.bottom + scaleWorld(90)
        ) {
          enemy.destroyed = true;
          enemies.splice(i, 1);
          continue;
        }
      } else {
        const directDx = player.x - enemy.x;
        const directDy = player.y - enemy.y;
        const directDistance = magnitude(directDx, directDy);
        const closeThreatDistance = scaleWorld(CLOSE_THREAT_RADIUS);
        const isCloseThreat = directDistance <= closeThreatDistance;
        const preferredPrediction = enemy.kind === "fast"
          ? 0.23
          : enemy.kind === "heavy"
            ? 0.04
            : 0.11;
        const prediction = isCloseThreat
          ? 0
          : cappedLeadTime(
            enemy.x,
            enemy.y,
            player.x,
            player.y,
            player.vx,
            player.vy,
            preferredPrediction,
            MAX_PURSUIT_LEAD_FRACTION,
          );
        const targetX = player.x + player.vx * prediction;
        const targetY = player.y + player.vy * prediction;
        const dx = targetX - enemy.x;
        const dy = targetY - enemy.y;
        const length = magnitude(dx, dy) || 1;
        enemy.vx = (dx / length) * enemy.speed;
        enemy.vy = (dy / length) * enemy.speed;
        enemy.x += enemy.vx * dt;
        enemy.y += enemy.vy * dt;
      }

      const hitDistance = enemy.radius + player.radius;
      if (distanceSquared(enemy, player) < hitDistance * hitDistance) {
        damagePlayer(i);
        if (gameState !== "running") return;
      }
    }
  }

  function normalizeGamepadStick(x, y, target = null) {
    const output = target || { x: 0, y: 0, active: false };
    const axisX = Number.isFinite(x) ? clamp(x, -1, 1) : 0;
    const axisY = Number.isFinite(y) ? clamp(y, -1, 1) : 0;
    const stickMagnitude = magnitude(axisX, axisY);

    if (stickMagnitude <= GAMEPAD_DEAD_ZONE) {
      output.x = 0;
      output.y = 0;
      output.active = false;
      return output;
    }

    const scaledMagnitude = Math.min(
      1,
      (stickMagnitude - GAMEPAD_DEAD_ZONE) / (1 - GAMEPAD_DEAD_ZONE),
    );
    output.x = (axisX / stickMagnitude) * scaledMagnitude;
    output.y = (axisY / stickMagnitude) * scaledMagnitude;
    output.active = true;
    return output;
  }

  function isGamepadButtonPressed(gamepad, index) {
    const button = gamepad?.buttons?.[index];
    if (typeof button === "number") return button >= GAMEPAD_TRIGGER_THRESHOLD;
    return Boolean(button?.pressed || button?.value >= GAMEPAD_TRIGGER_THRESHOLD);
  }

  function hasRelevantGamepadInput(gamepad) {
    const stickX = Number(gamepad?.axes?.[0]) || 0;
    const stickY = Number(gamepad?.axes?.[1]) || 0;
    return magnitude(stickX, stickY) > GAMEPAD_DEAD_ZONE
      || GAMEPAD_BLAST_BUTTONS.some((index) => isGamepadButtonPressed(gamepad, index))
      || isGamepadButtonPressed(gamepad, GAMEPAD_PAUSE_BUTTON);
  }

  function readConnectedGamepads() {
    const gamepadNavigator = window.navigator;
    const getGamepads = gamepadNavigator?.getGamepads || gamepadNavigator?.webkitGetGamepads;
    if (typeof getGamepads !== "function") return [];

    try {
      return getGamepads.call(gamepadNavigator) || [];
    } catch {
      return [];
    }
  }

  function chooseActiveGamepad() {
    const gamepads = readConnectedGamepads();
    let first = null;
    let current = null;
    let engaged = null;

    for (let i = 0; i < gamepads.length; i += 1) {
      const gamepad = gamepads[i];
      if (!gamepad || gamepad.connected === false) continue;
      if (!first) first = gamepad;
      if (gamepad.index === activeGamepadIndex) current = gamepad;
      if (!engaged && hasRelevantGamepadInput(gamepad)) engaged = gamepad;
    }

    if (!first) {
      activeGamepadIndex = null;
      return null;
    }

    const selected = engaged && (!current || !hasRelevantGamepadInput(current))
      ? engaged
      : current || engaged || first;
    activeGamepadIndex = selected.index;
    return selected;
  }

  function supportsGamepadHapticEffect(actuator, effectType) {
    try {
      if (typeof actuator?.canPlayEffectType === "function") {
        return Boolean(actuator.canPlayEffectType(effectType));
      }
      if (typeof actuator?.effects?.includes === "function") {
        return actuator.effects.includes(effectType);
      }
      return true;
    } catch {
      return false;
    }
  }

  async function playGamepadHaptic(actuator, settings) {
    if (!actuator) return false;

    if (
      typeof actuator.playEffect === "function"
      && supportsGamepadHapticEffect(actuator, "dual-rumble")
    ) {
      try {
        await actuator.playEffect("dual-rumble", {
          startDelay: 0,
          duration: settings.duration,
          weakMagnitude: settings.weakMagnitude,
          strongMagnitude: settings.strongMagnitude,
        });
        return true;
      } catch {
        // Try the legacy pulse API or another actuator exposed by the browser.
      }
    }

    if (typeof actuator.pulse === "function") {
      try {
        const result = await actuator.pulse(
          Math.max(settings.weakMagnitude, settings.strongMagnitude),
          settings.duration,
        );
        return result !== false;
      } catch {
        // Try the next actuator, if the browser exposes one.
      }
    }

    return false;
  }

  function vibrateGamepad(cue, sourceGamepad = null) {
    const settings = GAMEPAD_RUMBLE[cue];
    if (!settings) return;

    const sourceIsGamepad = sourceGamepad
      && Number.isInteger(sourceGamepad.index)
      && sourceGamepad.connected !== false;
    const gamepad = sourceIsGamepad ? sourceGamepad : chooseActiveGamepad();
    if (!gamepad) return;

    const actuators = [];
    const addActuator = (actuator) => {
      if (actuator && !actuators.includes(actuator)) actuators.push(actuator);
    };
    addActuator(gamepad.vibrationActuator);
    const legacyActuators = gamepad.hapticActuators;
    for (let index = 0; index < (legacyActuators?.length || 0); index += 1) {
      addActuator(legacyActuators[index]);
    }
    if (actuators.length === 0) return;

    void (async () => {
      for (const actuator of actuators) {
        if (await playGamepadHaptic(actuator, settings)) return;
      }
    })();
  }

  function pollGamepad() {
    const gamepad = chooseActiveGamepad();
    if (!gamepad) {
      gamepadMove.x = 0;
      gamepadMove.y = 0;
      gamepadMove.active = false;
      gamepadBlastPressed = false;
      gamepadPausePressed = false;
      return;
    }

    normalizeGamepadStick(gamepad.axes?.[0], gamepad.axes?.[1], gamepadMove);
    if (gamepadMove.active) mouseTarget.active = false;

    const blastPressed = GAMEPAD_BLAST_BUTTONS.some(
      (index) => isGamepadButtonPressed(gamepad, index),
    );
    if (blastPressed && !gamepadBlastPressed) activateBlast(gamepad);
    gamepadBlastPressed = blastPressed;

    const pausePressed = isGamepadButtonPressed(gamepad, GAMEPAD_PAUSE_BUTTON);
    if (
      pausePressed
      && !gamepadPausePressed
      && (gameState === "running" || gameState === "paused")
    ) {
      togglePause();
    }
    gamepadPausePressed = pausePressed;
  }

  function updateProjectiles(dt) {
    const offscreenMargin = scaleWorld(30);
    let destroyedEnemies = false;
    populateCollisionIndex();

    for (let i = projectiles.length - 1; i >= 0; i -= 1) {
      const projectile = projectiles[i];
      const previousX = projectile.x;
      const previousY = projectile.y;
      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;
      projectile.rotation += dt * 10;
      if (projectile.rotation >= STAR_ROTATION_PERIOD) {
        projectile.rotation -= STAR_ROTATION_PERIOD;
      }
      const segmentMinX = Math.min(previousX, projectile.x);
      const segmentMaxX = Math.max(previousX, projectile.x);
      const segmentMinY = Math.min(previousY, projectile.y);
      const segmentMaxY = Math.max(previousY, projectile.y);

      if (
        projectile.x < -offscreenMargin ||
        projectile.x > world.width + offscreenMargin ||
        projectile.y < -offscreenMargin ||
        projectile.y > world.height + offscreenMargin
      ) {
        recycleProjectileAt(i);
        continue;
      }

      const queryPadding = projectile.radius + collisionIndex.maxEnemyRadius;
      const minimumX = segmentMinX - queryPadding;
      const maximumX = segmentMaxX + queryPadding;
      const sortedEnemies = collisionIndex.enemies;
      const firstCandidate = findFirstCollisionCandidate(minimumX);

      for (let candidateIndex = firstCandidate; candidateIndex < sortedEnemies.length; candidateIndex += 1) {
        const enemy = sortedEnemies[candidateIndex];
        if (enemy.x > maximumX) break;
        if (enemy.destroyed) continue;
        const hitDistance = projectile.radius + enemy.radius;
        if (
          enemy.x + hitDistance < segmentMinX
          || enemy.x - hitDistance > segmentMaxX
          || enemy.y + hitDistance < segmentMinY
          || enemy.y - hitDistance > segmentMaxY
        ) {
          continue;
        }
        if (!segmentIntersectsCircle(
          previousX,
          previousY,
          projectile.x,
          projectile.y,
          enemy.x,
          enemy.y,
          hitDistance,
        )) {
          continue;
        }

        recycleProjectileAt(i);
        runStats.starsHit += 1;
        enemy.hp -= 1;
        enemy.hitFlash = 0.12;
        addParticles(projectile.x, projectile.y, projectile.color, 6, 90);

        if (enemy.hp <= 0) {
          enemy.destroyed = true;
          destroyedEnemies = true;
          registerDestroy(enemy);
        }
        break;
      }
    }

    if (destroyedEnemies) {
      let writeIndex = 0;
      for (let readIndex = 0; readIndex < enemies.length; readIndex += 1) {
        const enemy = enemies[readIndex];
        if (enemy.destroyed) continue;
        enemies[writeIndex] = enemy;
        writeIndex += 1;
      }
      enemies.length = writeIndex;
    }
  }

  function segmentIntersectsCircle(startX, startY, endX, endY, circleX, circleY, radius) {
    const segmentX = endX - startX;
    const segmentY = endY - startY;
    const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;
    const projection = segmentLengthSquared > 0
      ? clamp(
        ((circleX - startX) * segmentX + (circleY - startY) * segmentY) / segmentLengthSquared,
        0,
        1,
      )
      : 0;
    const closestX = startX + segmentX * projection;
    const closestY = startY + segmentY * projection;
    const dx = circleX - closestX;
    const dy = circleY - closestY;
    return dx * dx + dy * dy <= radius * radius;
  }

  function applyMagnet(collectible, dt) {
    if (magnetTime <= 0) return;
    const dx = player.x - collectible.x;
    const dy = player.y - collectible.y;
    const distance = magnitude(dx, dy);
    if (distance < 1 || distance > scaleWorld(MAGNET_RADIUS)) return;
    const pullSpeed = Math.min(scaleWorld(900), scaleWorld(320) + distance * 0.7);
    const step = Math.min(distance, pullSpeed * dt);
    collectible.x += (dx / distance) * step;
    collectible.y += (dy / distance) * step;
  }

  function updatePickups(dt) {
    for (let i = pickups.length - 1; i >= 0; i -= 1) {
      const pickup = pickups[i];
      applyMagnet(pickup, dt);
      pickup.ttl -= dt;
      pickup.phase += dt * 5;

      if (pickup.ttl <= 0) {
        pickups.splice(i, 1);
        missPopcorn();
        continue;
      }

      const pickupDistance = pickup.radius + player.radius + scaleWorld(7);
      if (distanceSquared(pickup, player) <= pickupDistance * pickupDistance) {
        collectPopcorn(i);
      }
    }
  }

  function updatePowerups(dt) {
    for (let i = powerups.length - 1; i >= 0; i -= 1) {
      const powerup = powerups[i];
      applyMagnet(powerup, dt);
      powerup.ttl -= dt;
      powerup.phase += dt * 4.2;

      if (powerup.ttl <= 0) {
        powerups.splice(i, 1);
        powerupSpawnTimer = randomBetween(5.5, 9);
        continue;
      }

      const collectionDistance = powerup.radius + player.radius + scaleWorld(8);
      if (distanceSquared(powerup, player) <= collectionDistance * collectionDistance) {
        collectPowerup(i);
      }
    }
  }

  function updateBlast(dt) {
    if (!blast) return;

    blast.life += dt;
    const progress = clamp(blast.life / blast.duration, 0, 1);
    blast.radius = blast.maxRadius * (1 - Math.pow(1 - progress, 3));

    for (let i = enemies.length - 1; i >= 0; i -= 1) {
      const enemy = enemies[i];
      if (enemy.blastMarked) continue;
      const range = blast.radius + enemy.radius;
      if (distanceSquared(blast, enemy) <= range * range) {
        enemy.blastMarked = true;
        enemies.splice(i, 1);
        registerDestroy(enemy, true);
      }
    }

    if (progress >= 1) blast = null;
  }

  function updateParticles(dt) {
    const horizontalDrag = Math.pow(0.08, dt);
    const verticalDrag = Math.pow(0.12, dt);
    const gravity = scaleWorld(45) * dt;
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const particle = particles[i];
      particle.life -= dt;
      if (particle.life <= 0) {
        recycleParticleAt(i);
        continue;
      }
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= horizontalDrag;
      particle.vy = particle.vy * verticalDrag + gravity;
    }
  }

  function updateFloatingTexts(dt) {
    for (let i = floatingTexts.length - 1; i >= 0; i -= 1) {
      const text = floatingTexts[i];
      text.life -= dt;
      text.y -= scaleWorld(29) * dt;
      if (text.life <= 0) floatingTexts.splice(i, 1);
    }
  }

  function updateInterface(force = false) {
    const roundedScore = Math.floor(score);
    const liveBest = Math.max(bestScore, roundedScore);
    const liveBestStreak = Math.max(bestStreak, longestStreak);
    const masteryPercent = Math.round(Math.min(1, mastery) * 100);
    const reserveMasteryPercent = dualBlastUnlocked
      ? Math.round(clamp(mastery - 1, 0, 1) * 100)
      : 0;

    if (force || roundedScore !== lastRenderedScore) {
      setFittedNumber(ui.score, formatScore(roundedScore));
      lastRenderedScore = roundedScore;
    }

    if (force || liveBest !== lastRenderedBest) {
      setFittedNumber(ui.best, formatScore(liveBest));
      setFittedNumber(ui.startBest, formatScore(bestScore));
      lastRenderedBest = liveBest;
    }

    if (force || liveBestStreak !== lastRenderedBestStreak) {
      setFittedNumber(ui.bestStreak, liveBestStreak);
      ui.bestStreak.setAttribute("aria-label", `Best popcorn streak: ${liveBestStreak}`);
      lastRenderedBestStreak = liveBestStreak;
    }

    if (force || player.lives !== lastRenderedLives) {
      const remainingLives = Math.max(0, player.lives);
      const modeMaximumLives = maximumLives();
      ui.lives.textContent = "★".repeat(remainingLives)
        + "☆".repeat(Math.max(0, modeMaximumLives - remainingLives));
      ui.lives.setAttribute(
        "aria-label",
        `${player.lives} of ${modeMaximumLives} ${modeMaximumLives === 1 ? "life" : "lives"} remaining`,
      );
      ui.lives.classList.toggle("danger", modeMaximumLives > 1 && player.lives === 1);
      lastRenderedLives = player.lives;
    }

    if (force || popcornChain !== lastRenderedStreak) {
      setFittedNumber(ui.streak, popcornChain);
      ui.streak.setAttribute("aria-label", `Current popcorn streak: ${popcornChain}`);
      lastRenderedStreak = popcornChain;
    }

    const pickup = pickups[0];

    const dualBlastPresentationChanged = ui.reserveMasteryTrack.hidden === dualBlastUnlocked;
    if (dualBlastPresentationChanged) {
      ui.reserveMasteryTrack.hidden = !dualBlastUnlocked;
      ui.blastMeter?.classList.toggle("is-dual", dualBlastUnlocked);
    }

    if (
      force
      || dualBlastPresentationChanged
      || masteryPercent !== lastRenderedMastery
      || reserveMasteryPercent !== lastRenderedReserveMastery
    ) {
      ui.masteryPercent.textContent = dualBlastUnlocked
        ? `${masteryPercent}% + ${reserveMasteryPercent}%`
        : `${masteryPercent}%`;
      ui.masteryFill.style.width = `${masteryPercent}%`;
      ui.masteryTrack.setAttribute("aria-valuenow", String(masteryPercent));
      ui.reserveMasteryFill.style.width = `${reserveMasteryPercent}%`;
      ui.reserveMasteryTrack.setAttribute("aria-valuenow", String(reserveMasteryPercent));
      ui.reserveMasteryTrack.classList.toggle("is-ready", reserveMasteryPercent >= 100);
      lastRenderedMastery = masteryPercent;
      lastRenderedReserveMastery = reserveMasteryPercent;
    }

    const fullyCharged = mastery >= 0.999;
    if (fullyCharged && !blastReadyAnnounced && gameState === "running") {
      blastReadyAnnounced = true;
      setBanner("BLOCKBUSTER BLAST READY — PRESS SPACE", 2.2, false);
      showCombo("BLOCKBUSTER BLAST READY");
      announce("Blockbuster Blast is ready.");
    } else if (!fullyCharged) {
      blastReadyAnnounced = false;
    }

    const blastReady = fullyCharged && gameState === "running";
    if (force || blastReady !== lastRenderedBlastReady) {
      ui.masteryTrack.classList.toggle("is-ready", blastReady);
      ui.judgmentButton.disabled = !blastReady;
      ui.judgmentButton.classList.toggle("ready", blastReady);
      lastRenderedBlastReady = blastReady;
    }

    let message = "";
    let danger = false;
    if (bannerTime > 0) {
      message = bannerMessage;
      danger = bannerDanger;
    } else if (gameState === "running" && pickup && pickup.ttl < 3) {
      message = `POPCORN EXPIRES IN ${pickup.ttl.toFixed(1)} SECONDS`;
      danger = true;
    } else if (gameState === "running" && superStarsTime <= 0 && player.stationaryTime > 0.48 && enemies.length) {
      message = "KEEP MOVING TO CONTINUE SHOOTING";
    }

    if (
      force
      || message !== lastRenderedMissionMessage
      || danger !== lastRenderedMissionDanger
    ) {
      ui.missionBanner.textContent = message;
      ui.missionBanner.classList.toggle("visible", Boolean(message));
      ui.missionBanner.classList.toggle("danger", danger);
      lastRenderedMissionMessage = message;
      lastRenderedMissionDanger = danger;
    }
  }
  function draw(now) {
    const time = now / 1000;
    ctx.save();

    if (shakeTime > 0 && !reducedMotion) {
      const strength = scaleWorld(shakePower) * clamp(shakeTime / 0.42, 0, 1);
      ctx.translate(randomBetween(-strength, strength), randomBetween(-strength, strength));
    }

    drawBackground(time);
    drawRushWarning(time);
    drawPickups(time);
    drawPowerups(time);
    drawMouseTarget(time);
    drawProjectiles();
    drawEnemies();
    drawBlast();
    drawPlayer(time);
    drawParticles();
    drawFloatingTexts();
    drawPowerupStatus();
    ctx.restore();
  }

  function drawBackground(time) {
    const backgroundGradient = shakeTime > 0 && !reducedMotion
      ? createBackgroundGradient()
      : renderCache.backgroundGradient;
    ctx.fillStyle = backgroundGradient;
    ctx.fillRect(0, 0, world.width, world.height);

    ctx.save();
    ctx.translate(world.width / 2, world.height * 0.56);
    ctx.rotate(reducedMotion ? 0 : time * 0.016);
    ctx.fillStyle = "rgba(229, 164, 8, 0.062)";
    if (renderCache.backgroundRays) {
      ctx.fill(renderCache.backgroundRays);
    } else {
      const radius = magnitude(world.width, world.height);
      const rays = 32;
      for (let i = 0; i < rays; i += 2) {
        const startAngle = (i / rays) * Math.PI * 2;
        const endAngle = ((i + 1) / rays) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();

    for (const star of world.backgroundStars) {
      const alpha = 0.14 + (Math.sin(time * 1.7 + star.phase) + 1) * 0.11;
      ctx.fillStyle = `rgba(255, 231, 162, ${alpha})`;
      ctx.fillRect(star.x, star.y, star.size, star.size);
    }

    ctx.strokeStyle = "rgba(229, 164, 8, 0.13)";
    ctx.lineWidth = 1;
    if (renderCache.backgroundGrid) {
      ctx.stroke(renderCache.backgroundGrid);
    } else {
      ctx.beginPath();
      for (let y = world.bounds.top + 28; y < world.bounds.bottom; y += 64) {
        ctx.moveTo(world.bounds.left, y);
        ctx.lineTo(world.bounds.right, y);
      }
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(4, 2, 1, 0.38)";
    if (renderCache.filmHoles) {
      ctx.fill(renderCache.filmHoles);
    } else {
      for (let x = 12; x < world.width; x += 38) {
        ctx.fillRect(x, world.bounds.top + 3, 21, 6);
        ctx.fillRect(x, world.bounds.bottom - 9, 21, 6);
      }
    }
  }
  function drawRushWarning(time) {
    if (!rushWarning) return;
    const warning = rushWarning;
    const { left, right, top, bottom } = world.bounds;
    const pulse = 0.52 + (Math.sin(time * 18) + 1) * 0.22;
    const gapStart = warning.gapCenter - warning.gapSize / 2;
    const gapEnd = warning.gapCenter + warning.gapSize / 2;

    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = "#ff6d52";
    ctx.lineWidth = scaleWorld(7);
    ctx.shadowColor = "#ff3f24";
    ctx.shadowBlur = scaleWorld(16) * qualitySettings.projectileGlow;
    ctx.beginPath();

    if (warning.edge === "top" || warning.edge === "bottom") {
      const warningInset = scaleWorld(4);
      const y = warning.edge === "top" ? top + warningInset : bottom - warningInset;
      ctx.moveTo(left, y);
      ctx.lineTo(gapStart, y);
      ctx.moveTo(gapEnd, y);
      ctx.lineTo(right, y);
    } else {
      const warningInset = scaleWorld(4);
      const x = warning.edge === "left" ? left + warningInset : right - warningInset;
      ctx.moveTo(x, top);
      ctx.lineTo(x, gapStart);
      ctx.moveTo(x, gapEnd);
      ctx.lineTo(x, bottom);
    }

    ctx.stroke();
    ctx.restore();
  }

  function measureCachedText(text, font) {
    const key = `${font}\u0000${text}`;
    const cached = renderCache.textWidths.get(key);
    if (cached !== undefined) return cached;

    ctx.font = font;
    const width = ctx.measureText(text).width;
    if (renderCache.textWidths.size >= 768) renderCache.textWidths.clear();
    renderCache.textWidths.set(key, width);
    return width;
  }

  function getStarPath(points, innerRatio) {
    if (typeof Path2D !== "function") return null;
    const key = `${points}:${innerRatio.toFixed(4)}`;
    let path = renderCache.starPaths.get(key);
    if (path) return path;

    path = new Path2D();
    for (let i = 0; i < points * 2; i += 1) {
      const radius = i % 2 === 0 ? 1 : innerRatio;
      const angle = -Math.PI / 2 + (i * Math.PI) / points;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) path.moveTo(x, y);
      else path.lineTo(x, y);
    }
    path.closePath();
    renderCache.starPaths.set(key, path);
    return path;
  }

  function createRasterCanvas(width, height) {
    if (typeof document.createElement !== "function") return null;
    const rasterCanvas = document.createElement("canvas");
    if (!rasterCanvas || typeof rasterCanvas.getContext !== "function") return null;
    rasterCanvas.width = width;
    rasterCanvas.height = height;
    const rasterContext = rasterCanvas.getContext("2d");
    return rasterContext ? { canvas: rasterCanvas, context: rasterContext } : null;
  }

  function getProjectileSprite(projectile) {
    if (typeof Path2D !== "function" || typeof ctx.drawImage !== "function") return null;

    const outerRadius = projectile.radius + scaleWorld(2);
    const innerRatio = projectile.radius * 0.44 / outerRadius;
    const glow = scaleWorld(12) * qualitySettings.projectileGlow;
    const frameCount = qualitySettings.projectileFrames;
    const rotationPeriod = STAR_ROTATION_PERIOD;
    const key = [
      outerRadius.toFixed(3),
      innerRatio.toFixed(4),
      glow.toFixed(3),
      projectile.color,
      world.dpr,
      frameCount,
    ].join(":");
    const cached = renderCache.projectileSprites.get(key);
    if (cached) return cached;

    const logicalSize = Math.ceil((outerRadius + glow * 2 + 3) * 2);
    const framePixelSize = Math.max(1, Math.ceil(logicalSize * world.dpr));
    const frameLogicalSize = framePixelSize / world.dpr;
    const columns = Math.min(4, frameCount);
    const rows = Math.ceil(frameCount / columns);
    const raster = createRasterCanvas(framePixelSize * columns, framePixelSize * rows);
    const path = getStarPath(5, innerRatio);
    if (!raster || !path) return null;

    for (let frame = 0; frame < frameCount; frame += 1) {
      const frameOffsetX = (frame % columns) * framePixelSize;
      const frameOffsetY = Math.floor(frame / columns) * framePixelSize;
      raster.context.setTransform(
        world.dpr,
        0,
        0,
        world.dpr,
        frameOffsetX,
        frameOffsetY,
      );
      raster.context.translate(frameLogicalSize / 2, frameLogicalSize / 2);
      raster.context.rotate((frame / frameCount) * rotationPeriod);
      raster.context.scale(outerRadius, outerRadius);
      raster.context.fillStyle = projectile.color;
      raster.context.shadowColor = projectile.color;
      raster.context.shadowBlur = glow;
      raster.context.fill(path);
    }

    const sprite = {
      canvas: raster.canvas,
      frameCount,
      columns,
      framePixelSize,
      frameLogicalSize,
      rotationPeriod,
      rotationFrameScale: frameCount / rotationPeriod,
    };
    if (renderCache.projectileSprites.size >= 28) renderCache.projectileSprites.clear();
    renderCache.projectileSprites.set(key, sprite);
    return sprite;
  }

  function getEmojiBounds(emoji, font, fontSize) {
    const cacheKey = `${emoji}\u0000${font}`;
    let bounds = renderCache.emojiMetrics.get(cacheKey);
    if (bounds) return bounds;

    ctx.save();
    ctx.font = font;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    const metrics = ctx.measureText(emoji);
    ctx.restore();
    const left = Number.isFinite(metrics.actualBoundingBoxLeft)
      ? metrics.actualBoundingBoxLeft
      : 0;
    const right = Number.isFinite(metrics.actualBoundingBoxRight)
      ? metrics.actualBoundingBoxRight
      : metrics.width;
    const ascent = Number.isFinite(metrics.actualBoundingBoxAscent)
      ? metrics.actualBoundingBoxAscent
      : fontSize * 0.8;
    const descent = Number.isFinite(metrics.actualBoundingBoxDescent)
      ? metrics.actualBoundingBoxDescent
      : fontSize * 0.2;
    bounds = {
      left,
      right,
      ascent,
      descent,
      x: -(right - left) / 2,
      y: (ascent - descent) / 2,
    };
    renderCache.emojiMetrics.set(cacheKey, bounds);
    return bounds;
  }

  function getEmojiSprite(emoji, fontSize, font, bounds, preferredFallbackColor = null) {
    if (typeof ctx.drawImage !== "function") return null;
    const fallbackColor = preferredFallbackColor
      || (typeof ctx.fillStyle === "string" ? ctx.fillStyle : "#fff0c4");
    const cacheKey = `${emoji}\u0000${font}\u0000${fallbackColor}\u0000${world.dpr}`;
    const cached = renderCache.emojiSprites.get(cacheKey);
    if (cached) return cached;

    const logicalSize = Math.ceil(Math.max(
      fontSize * 1.8,
      bounds.left + bounds.right + 8,
      bounds.ascent + bounds.descent + 8,
    ));
    const pixelSize = Math.max(1, Math.ceil(logicalSize * world.dpr));
    const raster = createRasterCanvas(pixelSize, pixelSize);
    if (!raster) return null;

    const actualLogicalSize = pixelSize / world.dpr;
    raster.context.setTransform(world.dpr, 0, 0, world.dpr, 0, 0);
    raster.context.font = font;
    raster.context.textAlign = "left";
    raster.context.textBaseline = "alphabetic";
    raster.context.fillStyle = fallbackColor;
    raster.context.fillText(
      emoji,
      actualLogicalSize / 2 + bounds.x,
      actualLogicalSize / 2 + bounds.y,
    );

    const sprite = { canvas: raster.canvas, logicalSize: actualLogicalSize };
    if (renderCache.emojiSprites.size >= 24) renderCache.emojiSprites.clear();
    renderCache.emojiSprites.set(cacheKey, sprite);
    return sprite;
  }

  function drawCenteredEmoji(emoji, x, y, fontSize) {
    const font = `${fontSize}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
    const bounds = getEmojiBounds(emoji, font, fontSize);
    const sprite = getEmojiSprite(emoji, fontSize, font, bounds);
    if (sprite) {
      ctx.drawImage(
        sprite.canvas,
        x - sprite.logicalSize / 2,
        y - sprite.logicalSize / 2,
        sprite.logicalSize,
        sprite.logicalSize,
      );
      return;
    }

    ctx.save();
    ctx.font = font;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(emoji, x + bounds.x, y + bounds.y);
    ctx.restore();
  }

  function getEnemySprite(enemy) {
    if (typeof ctx.drawImage !== "function") return null;

    const fillColor = enemy.hitFlash > 0 ? COLORS.goldBright : enemy.color;
    const outlineColor = enemy.mode === "rush"
      ? "#ff6f55"
      : enemy.kind === "fast"
        ? "#ff8b72"
        : enemy.kind === "heavy"
          ? "#c99cdc"
          : "#ad8b72";
    const frameCount = enemy.mode === "rush" ? 1 : qualitySettings.enemyFrames;
    const key = [
      enemy.radius.toFixed(3),
      enemy.kind,
      enemy.mode,
      fillColor,
      outlineColor,
      enemy.hp,
      enemy.maxHp,
      world.dpr,
      frameCount,
    ].join(":");
    const cached = renderCache.enemySprites.get(key);
    if (cached) return cached;

    const halfSize = Math.ceil(enemy.radius + scaleWorld(48));
    const logicalSize = halfSize * 2;
    const framePixelSize = Math.max(1, Math.ceil(logicalSize * world.dpr));
    const frameLogicalSize = framePixelSize / world.dpr;
    const columns = Math.min(4, frameCount);
    const rows = Math.ceil(frameCount / columns);
    const raster = createRasterCanvas(framePixelSize * columns, framePixelSize * rows);
    if (!raster) return null;

    const emojiFontSize = Math.round(enemy.radius * 1.68);
    const emojiFont = `${emojiFontSize}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
    const emojiBounds = getEmojiBounds("🗑️", emojiFont, emojiFontSize);
    const emojiSprite = getEmojiSprite(
      "🗑️",
      emojiFontSize,
      emojiFont,
      emojiBounds,
      fillColor,
    );

    for (let frame = 0; frame < frameCount; frame += 1) {
      const frameOffsetX = (frame % columns) * framePixelSize;
      const frameOffsetY = Math.floor(frame / columns) * framePixelSize;
      const rotation = frameCount === 1
        ? 0
        : -0.07 + (frame / (frameCount - 1)) * 0.14;
      const spriteContext = raster.context;
      spriteContext.setTransform(
        world.dpr,
        0,
        0,
        world.dpr,
        frameOffsetX,
        frameOffsetY,
      );
      spriteContext.translate(frameLogicalSize / 2, frameLogicalSize / 2);
      spriteContext.rotate(rotation);

      spriteContext.fillStyle = fillColor;
      spriteContext.globalAlpha = 0.72;
      spriteContext.beginPath();
      spriteContext.arc(0, 0, enemy.radius + scaleWorld(7), 0, Math.PI * 2);
      spriteContext.fill();
      spriteContext.globalAlpha = 1;

      spriteContext.strokeStyle = outlineColor;
      spriteContext.lineWidth = scaleWorld(enemy.kind === "heavy" ? 4 : 2);
      spriteContext.beginPath();
      spriteContext.arc(0, 0, enemy.radius + scaleWorld(3), 0, Math.PI * 2);
      spriteContext.stroke();

      if (emojiSprite) {
        spriteContext.drawImage(
          emojiSprite.canvas,
          -emojiSprite.logicalSize / 2,
          -emojiSprite.logicalSize / 2,
          emojiSprite.logicalSize,
          emojiSprite.logicalSize,
        );
      } else {
        spriteContext.font = emojiFont;
        spriteContext.textAlign = "left";
        spriteContext.textBaseline = "alphabetic";
        spriteContext.fillStyle = fillColor;
        spriteContext.fillText("🗑️", emojiBounds.x, emojiBounds.y);
      }

      if (enemy.maxHp > 1) {
        const barWidth = enemy.radius * 1.6;
        spriteContext.fillStyle = "rgba(18, 12, 8, 0.82)";
        spriteContext.fillRect(
          -barWidth / 2,
          enemy.radius + scaleWorld(10),
          barWidth,
          scaleWorld(5),
        );
        spriteContext.fillStyle = COLORS.goldBright;
        spriteContext.fillRect(
          -barWidth / 2,
          enemy.radius + scaleWorld(10),
          barWidth * (enemy.hp / enemy.maxHp),
          scaleWorld(5),
        );
      }
    }

    const sprite = {
      canvas: raster.canvas,
      columns,
      frameCount,
      framePixelSize,
      frameLogicalSize,
    };
    if (renderCache.enemySprites.size >= 32) renderCache.enemySprites.clear();
    renderCache.enemySprites.set(key, sprite);
    return sprite;
  }

  function drawPlayer(time) {
    const movementTilt = clamp(player.vx / Math.max(1, player.speed), -1, 1) * 0.055;
    const bob = player.moving
      ? Math.sin(player.bob) * scaleWorld(2.6)
      : Math.sin(player.bob * 0.42) * scaleWorld(1.1);
    const blastReady = mastery >= 0.999 && gameState === "running";
    const readyPulse = blastReady ? 1 + Math.sin(time * 7.2) * 0.055 : 1;

    ctx.save();
    ctx.translate(player.x, player.y + bob);
    ctx.rotate(movementTilt);
    ctx.scale(readyPulse, readyPulse);

    if (speedTime > 0 && player.moving) {
      const motion = magnitude(player.vx, player.vy) || 1;
      const trailX = -player.vx / motion;
      const trailY = -player.vy / motion;
      const sideX = -trailY;
      const sideY = trailX;
      ctx.save();
      ctx.strokeStyle = COLORS.speed;
      ctx.shadowColor = COLORS.speed;
      ctx.shadowBlur = scaleWorld(14) * qualitySettings.projectileGlow;
      ctx.lineCap = "round";
      const trailRadius = (qualitySettings.speedTrailLines - 1) / 2;
      for (let i = -trailRadius; i <= trailRadius; i += 1) {
        const sideOffset = i * scaleWorld(9);
        ctx.globalAlpha = 0.58 - Math.abs(i) * 0.08;
        ctx.lineWidth = scaleWorld(i === 0 ? 4 : 2);
        ctx.beginPath();
        ctx.moveTo(
          trailX * scaleWorld(24) + sideX * sideOffset,
          trailY * scaleWorld(24) + sideY * sideOffset - scaleWorld(8),
        );
        ctx.lineTo(
          trailX * scaleWorld(76) + sideX * sideOffset,
          trailY * scaleWorld(76) + sideY * sideOffset - scaleWorld(8),
        );
        ctx.stroke();
      }
      ctx.restore();
    }

    const auraRadius = player.drawHeight * (blastReady ? 0.62 : 0.5);
    const playerVisualOffset = scaleWorld(8);
    if (qualitySettings.playerAura === "gradient") {
      const aura = ctx.createRadialGradient(
        0,
        -playerVisualOffset,
        scaleWorld(4),
        0,
        -playerVisualOffset,
        auraRadius,
      );
      aura.addColorStop(0, blastReady ? "rgba(255, 244, 185, 0.92)" : "rgba(255, 218, 107, 0.58)");
      aura.addColorStop(0.42, blastReady ? "rgba(255, 196, 41, 0.54)" : "rgba(229, 164, 8, 0.25)");
      aura.addColorStop(1, "rgba(229, 164, 8, 0)");
      ctx.fillStyle = aura;
    } else {
      ctx.fillStyle = blastReady ? "rgba(255, 211, 96, 0.34)" : "rgba(229, 164, 8, 0.18)";
    }
    ctx.beginPath();
    ctx.arc(0, -playerVisualOffset, auraRadius, 0, Math.PI * 2);
    ctx.fill();

    if (blastReady) {
      ctx.save();
      ctx.globalAlpha = 0.62 + (Math.sin(time * 9) + 1) * 0.16;
      ctx.strokeStyle = COLORS.goldBright;
      ctx.lineWidth = scaleWorld(4);
      ctx.shadowColor = COLORS.goldBright;
      ctx.shadowBlur = scaleWorld(24) * qualitySettings.projectileGlow;
      ctx.beginPath();
      ctx.arc(0, -playerVisualOffset, player.drawHeight * 0.52, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    const shouldBlink = player.invulnerable > 0 && Math.floor(player.invulnerable * 14) % 2 === 0;
    if (shouldBlink) ctx.globalAlpha = 0.33;

    if (movieMasterImage.complete && movieMasterImage.naturalWidth) {
      ctx.drawImage(
        movieMasterImage,
        -player.drawWidth / 2,
        -player.drawHeight * 0.55,
        player.drawWidth,
        player.drawHeight,
      );
    } else {
      ctx.fillStyle = COLORS.goldBright;
      ctx.beginPath();
      ctx.arc(0, 0, scaleWorld(24), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.ink;
      ctx.font = `800 ${Math.max(8, scaleWorld(14))}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("MM", 0, 0);
    }

    if (shieldTime > 0 && shieldHits > 0) {
      const shieldRadius = player.drawHeight * 0.54;
      const shieldFade = shieldTime < 3
        ? clamp(shieldTime / 3, 0, 1) * (0.35 + (Math.sin(time * 18) + 1) * 0.325)
        : 1;
      ctx.save();
      ctx.globalAlpha = (0.76 + (Math.sin(time * 8) + 1) * 0.1) * shieldFade;
      ctx.strokeStyle = COLORS.shield;
      ctx.lineWidth = scaleWorld(4);
      ctx.shadowColor = COLORS.shield;
      ctx.shadowBlur = scaleWorld(22) * qualitySettings.projectileGlow;
      ctx.beginPath();
      ctx.arc(0, -playerVisualOffset, shieldRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.12 * shieldFade;
      ctx.fillStyle = COLORS.shield;
      ctx.fill();
      ctx.globalAlpha = shieldFade;
      ctx.shadowBlur = scaleWorld(10) * qualitySettings.projectileGlow;
      for (let i = 0; i < shieldHits; i += 1) {
        const angle = -Math.PI * 0.74 + i * 0.2;
        ctx.beginPath();
        ctx.arc(
          Math.cos(angle) * shieldRadius,
          -playerVisualOffset + Math.sin(angle) * shieldRadius,
          scaleWorld(5.5),
          0,
          Math.PI * 2,
        );
        ctx.fillStyle = COLORS.shield;
        ctx.fill();
      }
      ctx.restore();
    }

    if (superStarsTime > 0) {
      const orbitRadius = player.drawHeight * 0.61;
      const orbitStarCount = qualitySettings.superOrbitStars;
      ctx.save();
      ctx.globalAlpha = 0.5 + (Math.sin(time * 9) + 1) * 0.14;
      ctx.shadowColor = COLORS.super;
      ctx.shadowBlur = scaleWorld(12) * qualitySettings.projectileGlow;
      for (let i = 0; i < orbitStarCount; i += 1) {
        const angle = time * 1.8 + (i / orbitStarCount) * Math.PI * 2;
        drawStar(
          Math.cos(angle) * orbitRadius,
          -playerVisualOffset + Math.sin(angle) * orbitRadius,
          scaleWorld(5.5),
          scaleWorld(2.4),
          5,
          COLORS.super,
        );
      }
      ctx.restore();
    }

    if (magnetTime > 0) {
      const badgeX = -player.drawWidth * 0.86;
      const badgeY = -player.drawHeight * 0.43;
      ctx.save();
      ctx.globalAlpha = 0.82 + (Math.sin(time * 7) + 1) * 0.08;
      ctx.shadowColor = COLORS.magnet;
      ctx.shadowBlur = scaleWorld(18) * qualitySettings.projectileGlow;
      drawCenteredEmoji("🧲", badgeX, badgeY, Math.max(10, scaleWorld(25)));
      ctx.restore();
    }

    ctx.restore();

    if (gameState === "running" && superStarsTime <= 0 && player.stationaryTime > 0.5 && enemies.length) {
      const alpha = 0.72 + (Math.sin(time * 7) + 1) * 0.12;
      ctx.save();
      ctx.globalAlpha = alpha;
      const font = `800 ${clamp(world.width * 0.012, 10, 14)}px "Futura Web", sans-serif`;
      ctx.font = font;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const text = "KEEP MOVING";
      const width = measureCachedText(text, font) + scaleWorld(20);
      const y = player.y + player.drawHeight * 0.55;
      ctx.fillStyle = "rgba(18, 12, 8, 0.9)";
      ctx.fillRect(player.x - width / 2, y - scaleWorld(12), width, scaleWorld(24));
      ctx.strokeStyle = COLORS.gold;
      ctx.strokeRect(player.x - width / 2, y - scaleWorld(12), width, scaleWorld(24));
      ctx.fillStyle = COLORS.goldLight;
      ctx.fillText(text, player.x, y);
      ctx.restore();
    }
  }

  function drawEnemies() {
    for (const enemy of enemies) {
      const margin = enemy.radius + scaleWorld(45);
      if (
        enemy.x < -margin
        || enemy.x > world.width + margin
        || enemy.y < -margin
        || enemy.y > world.height + margin
      ) continue;
      const drawY = enemy.y + Math.sin(enemy.phase) * scaleWorld(2.4);
      const sprite = getEnemySprite(enemy);
      if (sprite) {
        const tilt = enemy.mode === "rush" ? 0 : Math.sin(enemy.phase * 0.7) * 0.07;
        const frame = sprite.frameCount === 1
          ? 0
          : Math.round(((tilt + 0.07) / 0.14) * (sprite.frameCount - 1));
        ctx.drawImage(
          sprite.canvas,
          (frame % sprite.columns) * sprite.framePixelSize,
          Math.floor(frame / sprite.columns) * sprite.framePixelSize,
          sprite.framePixelSize,
          sprite.framePixelSize,
          enemy.x - sprite.frameLogicalSize / 2,
          drawY - sprite.frameLogicalSize / 2,
          sprite.frameLogicalSize,
          sprite.frameLogicalSize,
        );
        continue;
      }
      ctx.save();
      ctx.translate(enemy.x, drawY);
      ctx.rotate(enemy.mode === "rush" ? 0 : Math.sin(enemy.phase * 0.7) * 0.07);

      ctx.fillStyle = enemy.hitFlash > 0 ? COLORS.goldBright : enemy.color;
      ctx.globalAlpha = 0.72;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius + scaleWorld(7), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.strokeStyle = enemy.mode === "rush"
        ? "#ff6f55"
        : enemy.kind === "fast"
          ? "#ff8b72"
          : enemy.kind === "heavy"
            ? "#c99cdc"
            : "#ad8b72";
      ctx.lineWidth = scaleWorld(enemy.kind === "heavy" ? 4 : 2);
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius + scaleWorld(3), 0, Math.PI * 2);
      ctx.stroke();

      drawCenteredEmoji("🗑️", 0, 0, Math.round(enemy.radius * 1.68));

      if (enemy.maxHp > 1) {
        const barWidth = enemy.radius * 1.6;
        ctx.fillStyle = "rgba(18, 12, 8, 0.82)";
        ctx.fillRect(-barWidth / 2, enemy.radius + scaleWorld(10), barWidth, scaleWorld(5));
        ctx.fillStyle = COLORS.goldBright;
        ctx.fillRect(
          -barWidth / 2,
          enemy.radius + scaleWorld(10),
          barWidth * (enemy.hp / enemy.maxHp),
          scaleWorld(5),
        );
      }

      ctx.restore();
    }
  }

  function drawProjectiles() {
    for (const projectile of projectiles) {
      const margin = projectile.radius + scaleWorld(30);
      if (
        projectile.x < -margin
        || projectile.x > world.width + margin
        || projectile.y < -margin
        || projectile.y > world.height + margin
      ) continue;
      const sprite = getProjectileSprite(projectile);
      if (sprite) {
        const normalizedRotation = projectile.rotation < sprite.rotationPeriod
          ? projectile.rotation
          : projectile.rotation % sprite.rotationPeriod;
        let frame = Math.round(normalizedRotation * sprite.rotationFrameScale);
        if (frame === sprite.frameCount) frame = 0;
        ctx.drawImage(
          sprite.canvas,
          (frame % sprite.columns) * sprite.framePixelSize,
          Math.floor(frame / sprite.columns) * sprite.framePixelSize,
          sprite.framePixelSize,
          sprite.framePixelSize,
          projectile.x - sprite.frameLogicalSize / 2,
          projectile.y - sprite.frameLogicalSize / 2,
          sprite.frameLogicalSize,
          sprite.frameLogicalSize,
        );
        continue;
      }
      ctx.save();
      ctx.translate(projectile.x, projectile.y);
      ctx.rotate(projectile.rotation);
      ctx.shadowColor = projectile.color;
      ctx.shadowBlur = scaleWorld(12) * qualitySettings.projectileGlow;
      drawStar(0, 0, projectile.radius + scaleWorld(2), projectile.radius * 0.44, 5, projectile.color);
      ctx.restore();
    }
  }

  function drawPickups(time) {
    for (const pickup of pickups) {
      const pulse = 1 + Math.sin(time * 5 + pickup.phase) * 0.09;
      const progress = clamp(pickup.ttl / pickup.totalTtl, 0, 1);
      const danger = progress < 0.34;

      ctx.save();
      if (qualitySettings.pickupBeams) {
        const beamRadius = scaleWorld(95);
        const beam = ctx.createRadialGradient(
          pickup.x,
          pickup.y,
          scaleWorld(5),
          pickup.x,
          pickup.y,
          beamRadius,
        );
        beam.addColorStop(0, danger ? "rgba(255, 105, 72, 0.27)" : "rgba(255, 211, 96, 0.27)");
        beam.addColorStop(1, "rgba(229, 164, 8, 0)");
        ctx.fillStyle = beam;
        ctx.beginPath();
        ctx.arc(pickup.x, pickup.y, beamRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.translate(pickup.x, pickup.y);
      ctx.scale(pulse, pulse);
      ctx.shadowColor = danger ? "#ff5a3b" : COLORS.goldBright;
      ctx.shadowBlur = scaleWorld(22) * qualitySettings.projectileGlow;
      ctx.fillStyle = danger ? "rgba(210, 75, 53, 0.42)" : "rgba(229, 164, 8, 0.4)";
      ctx.beginPath();
      ctx.arc(0, 0, pickup.radius + scaleWorld(10), 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = danger ? "#ff806b" : COLORS.goldBright;
      ctx.lineWidth = scaleWorld(4);
      ctx.beginPath();
      ctx.arc(
        0,
        0,
        pickup.radius + scaleWorld(15),
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * progress,
      );
      ctx.stroke();

      drawCenteredEmoji("🍿", 0, 0, Math.round(pickup.radius * 1.8));
      ctx.restore();
    }
  }

  function drawPowerups(time) {
    for (const powerup of powerups) {
      const definition = POWERUP_TYPES[powerup.type];
      const pulse = 1 + Math.sin(time * 5.8 + powerup.phase) * 0.08;
      const progress = clamp(powerup.ttl / powerup.totalTtl, 0, 1);

      ctx.save();
      if (qualitySettings.pickupBeams) {
        const beamRadius = scaleWorld(108);
        const beam = ctx.createRadialGradient(
          powerup.x,
          powerup.y,
          scaleWorld(5),
          powerup.x,
          powerup.y,
          beamRadius,
        );
        beam.addColorStop(0, `${definition.color}55`);
        beam.addColorStop(1, `${definition.color}00`);
        ctx.fillStyle = beam;
        ctx.beginPath();
        ctx.arc(powerup.x, powerup.y, beamRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.translate(powerup.x, powerup.y);
      ctx.scale(pulse, pulse);
      ctx.shadowColor = definition.color;
      ctx.shadowBlur = scaleWorld(24) * qualitySettings.projectileGlow;
      ctx.fillStyle = "rgba(18, 12, 8, 0.92)";
      ctx.beginPath();
      ctx.arc(0, 0, powerup.radius + scaleWorld(8), 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = definition.color;
      ctx.lineWidth = scaleWorld(4);
      ctx.beginPath();
      ctx.arc(
        0,
        0,
        powerup.radius + scaleWorld(14),
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * progress,
      );
      ctx.stroke();
      ctx.lineWidth = scaleWorld(2);
      ctx.beginPath();
      ctx.arc(0, 0, powerup.radius + scaleWorld(7), 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = definition.color;
      if (powerup.type === "super") {
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `800 ${Math.max(8, scaleWorld(20))}px "Futura Web", sans-serif`;
        ctx.fillText(`★${10 * starRowSize}`, 0, 1);
      } else {
        drawCenteredEmoji(definition.icon, 0, 0, Math.max(10, scaleWorld(28)));
      }

      const labelFont = `800 ${Math.max(7, scaleWorld(10))}px "Futura Web", sans-serif`;
      ctx.font = labelFont;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const labelWidth = measureCachedText(definition.label, labelFont) + scaleWorld(16);
      const labelTop = powerup.radius + scaleWorld(20);
      const labelHeight = Math.max(13, scaleWorld(19));
      ctx.fillStyle = "rgba(18, 12, 8, 0.92)";
      ctx.fillRect(-labelWidth / 2, labelTop, labelWidth, labelHeight);
      ctx.strokeStyle = definition.color;
      ctx.lineWidth = Math.max(1, scaleWorld(1));
      ctx.strokeRect(-labelWidth / 2, labelTop, labelWidth, labelHeight);
      ctx.fillStyle = definition.color;
      ctx.fillText(definition.label, 0, labelTop + labelHeight / 2 + 1);
      ctx.restore();
    }
  }

  function drawMouseTarget(time) {
    if (movementMode !== "mouse" || !mouseTarget.active || gameState !== "running") return;
    const pulse = 1 + Math.sin(time * 7) * 0.16;

    ctx.save();
    ctx.translate(mouseTarget.x, mouseTarget.y);
    ctx.scale(pulse, pulse);
    ctx.globalAlpha = 0.52;
    ctx.strokeStyle = COLORS.goldLight;
    ctx.lineWidth = scaleWorld(2);
    ctx.beginPath();
    ctx.arc(0, 0, scaleWorld(11), 0, Math.PI * 2);
    ctx.moveTo(-scaleWorld(20), 0);
    ctx.lineTo(-scaleWorld(8), 0);
    ctx.moveTo(scaleWorld(8), 0);
    ctx.lineTo(scaleWorld(20), 0);
    ctx.moveTo(0, -scaleWorld(20));
    ctx.lineTo(0, -scaleWorld(8));
    ctx.moveTo(0, scaleWorld(8));
    ctx.lineTo(0, scaleWorld(20));
    ctx.stroke();
    ctx.restore();
  }

  function drawPowerupStatusIcon(type, x, y, size, color) {
    const radius = size / 2;

    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (type === "shield") {
      ctx.lineWidth = Math.max(1.2, size * 0.12);
      ctx.beginPath();
      ctx.moveTo(0, -radius * 0.92);
      ctx.lineTo(radius * 0.72, -radius * 0.58);
      ctx.lineTo(radius * 0.58, radius * 0.2);
      ctx.quadraticCurveTo(radius * 0.34, radius * 0.72, 0, radius * 0.94);
      ctx.quadraticCurveTo(-radius * 0.34, radius * 0.72, -radius * 0.58, radius * 0.2);
      ctx.lineTo(-radius * 0.72, -radius * 0.58);
      ctx.closePath();
      ctx.globalAlpha = 0.22;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.stroke();
    } else if (type === "speed") {
      ctx.beginPath();
      ctx.moveTo(radius * 0.08, -radius);
      ctx.lineTo(-radius * 0.68, radius * 0.12);
      ctx.lineTo(-radius * 0.12, radius * 0.06);
      ctx.lineTo(-radius * 0.28, radius);
      ctx.lineTo(radius * 0.72, -radius * 0.22);
      ctx.lineTo(radius * 0.13, -radius * 0.12);
      ctx.closePath();
      ctx.fill();
    } else if (type === "super") {
      drawStar(0, 0, radius, radius * 0.44, 5, color);
    } else {
      ctx.lineWidth = Math.max(1.7, size * 0.19);
      ctx.beginPath();
      ctx.moveTo(-radius * 0.72, -radius * 0.52);
      ctx.lineTo(-radius * 0.72, radius * 0.08);
      ctx.arc(0, radius * 0.08, radius * 0.72, Math.PI, 0, true);
      ctx.lineTo(radius * 0.72, -radius * 0.52);
      ctx.stroke();
      ctx.lineWidth = Math.max(2.2, size * 0.25);
      ctx.beginPath();
      ctx.moveTo(-radius * 0.72, -radius * 0.68);
      ctx.lineTo(-radius * 0.72, -radius * 0.42);
      ctx.moveTo(radius * 0.72, -radius * 0.68);
      ctx.lineTo(radius * 0.72, -radius * 0.42);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawPowerupStatus() {
    const statuses = [];
    if (shieldTime > 0 && shieldHits > 0) {
      statuses.push({ type: "shield", text: `SHIELD ${shieldHits} · ${shieldTime.toFixed(1)}s`, color: COLORS.shield });
    }
    if (speedTime > 0) {
      statuses.push({ type: "speed", text: `SUPER SPEED · ${speedTime.toFixed(1)}s`, color: COLORS.speed });
    }
    if (superStarsTime > 0) {
      statuses.push({ type: "super", text: `SUPER STARS · ${superStarsTime.toFixed(1)}s`, color: COLORS.super });
    }
    if (magnetTime > 0) {
      statuses.push({ type: "magnet", text: `MAGNET · ${magnetTime.toFixed(1)}s`, color: COLORS.magnet });
    }
    if (!statuses.length) return;

    const shortViewport = world.height <= 500;
    const fontSize = clamp(world.width * 0.012, shortViewport ? 9 : 10, shortViewport ? 11 : 13);
    const iconSize = fontSize * (shortViewport ? 1.08 : 1.18);
    const iconGap = shortViewport ? 4 : 6;
    const horizontalPadding = shortViewport ? 7 : 10;
    const verticalPadding = shortViewport ? 5 : 7;
    const height = Math.max(fontSize, iconSize) + verticalPadding * 2;
    const gap = shortViewport ? 4 : 6;
    const availableWidth = Math.max(1, world.bounds.right - world.bounds.left);
    const statusFont = `800 ${fontSize}px "Futura Web", sans-serif`;
    const widths = statuses.map((status) => {
      const textWidth = measureCachedText(status.text, statusFont);
      status.textWidth = textWidth;
      return Math.min(
        availableWidth,
        horizontalPadding * 2 + iconSize + iconGap + textWidth,
      );
    });

    const rows = [];
    let row = { items: [], width: 0 };
    statuses.forEach((status, index) => {
      const width = widths[index];
      const nextWidth = row.items.length ? row.width + gap + width : width;
      if (row.items.length && nextWidth > availableWidth) {
        rows.push(row);
        row = { items: [], width: 0 };
      }
      row.items.push({ status, width });
      row.width += (row.items.length > 1 ? gap : 0) + width;
    });
    if (row.items.length) rows.push(row);

    ctx.save();
    ctx.font = statusFont;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    let y = world.bounds.top + 10;

    rows.forEach((statusRow) => {
      let x = world.bounds.right - statusRow.width;
      statusRow.items.forEach(({ status, width }) => {
        ctx.fillStyle = "rgba(18, 12, 8, 0.9)";
        ctx.fillRect(x, y, width, height);
        ctx.strokeStyle = status.color;
        ctx.lineWidth = shortViewport ? 1.5 : 2;
        ctx.strokeRect(x, y, width, height);

        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, width, height);
        ctx.clip();

        const contentWidth = iconSize + iconGap + status.textWidth;
        const contentStart = x + Math.max(horizontalPadding, (width - contentWidth) / 2);
        const centerY = y + height / 2;
        drawPowerupStatusIcon(
          status.type,
          contentStart + iconSize / 2,
          centerY,
          iconSize,
          status.color,
        );
        ctx.fillStyle = status.color;
        ctx.fillText(status.text, contentStart + iconSize + iconGap, centerY + 0.5);
        ctx.restore();

        x += width + gap;
      });
      y += height + gap;
    });
    ctx.restore();
  }

  function drawBlast() {
    if (!blast) return;
    const progress = clamp(blast.life / blast.duration, 0, 1);
    ctx.save();
    ctx.globalAlpha = 1 - progress;
    ctx.strokeStyle = COLORS.goldBright;
    ctx.lineWidth = Math.max(scaleWorld(4), scaleWorld(18) * (1 - progress));
    ctx.shadowColor = COLORS.goldBright;
    ctx.shadowBlur = scaleWorld(28) * qualitySettings.projectileGlow;
    ctx.beginPath();
    ctx.arc(blast.x, blast.y, blast.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = COLORS.cream;
    ctx.lineWidth = Math.max(scaleWorld(2), scaleWorld(6) * (1 - progress));
    ctx.beginPath();
    ctx.arc(blast.x, blast.y, Math.max(0, blast.radius - scaleWorld(18)), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawParticles() {
    ctx.save();
    const stride = qualitySettings.particleDrawStride;
    for (let index = 0; index < particles.length; index += stride) {
      const particle = particles[index];
      const margin = particle.size + scaleWorld(16);
      if (
        particle.x < -margin
        || particle.x > world.width + margin
        || particle.y < -margin
        || particle.y > world.height + margin
      ) continue;
      const alpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.globalAlpha = alpha;
      if (particle.star && qualityLevel !== "low") {
        drawStar(
          particle.x,
          particle.y,
          particle.size + scaleWorld(1.5),
          particle.size * 0.42,
          5,
          particle.color,
        );
      } else {
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawFloatingTexts() {
    ctx.save();
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = Math.max(1.5, scaleWorld(4));
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const text of floatingTexts) {
      const alpha = clamp(text.life / text.maxLife, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = text.color;
      ctx.font = `800 ${text.size}px "Futura Web", sans-serif`;
      ctx.strokeText(text.text, text.x, text.y);
      ctx.fillText(text.text, text.x, text.y);
    }
    ctx.restore();
  }

  function drawStar(x, y, outerRadius, innerRadius, points, color) {
    if (typeof Path2D === "function" && outerRadius > 0) {
      const innerRatio = innerRadius / outerRadius;
      const path = getStarPath(points, innerRatio);

      ctx.save();
      ctx.translate(x, y);
      ctx.scale(outerRadius, outerRadius);
      ctx.fillStyle = color;
      ctx.fill(path);
      ctx.restore();
      return;
    }

    ctx.beginPath();
    for (let i = 0; i < points * 2; i += 1) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = -Math.PI / 2 + (i * Math.PI) / points;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }
  function resetJoystick() {
    touchMove.x = 0;
    touchMove.y = 0;
    touchMove.pointerId = null;
    ui.joystickKnob.style.transform = "translate(-50%, -50%)";
  }

  function updateJoystick(event) {
    const rect = ui.joystick.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    let dx = event.clientX - centerX;
    let dy = event.clientY - centerY;
    const maxDistance = rect.width * 0.31;
    const length = magnitude(dx, dy);
    if (length > maxDistance) {
      dx = (dx / length) * maxDistance;
      dy = (dy / length) * maxDistance;
    }
    touchMove.x = dx / maxDistance;
    touchMove.y = dy / maxDistance;
    ui.joystickKnob.style.transform = `translate(-50%, -50%) translate(${dx}px, ${dy}px)`;
  }

  function frame(now) {
    const dt = Math.min((now - lastFrame) / 1000, 0.034);
    lastFrame = now;
    pollGamepad();

    if (gameState === "running") {
      update(dt);
      draw(now);
    } else if (gameState !== "paused") {
      player.bob += dt * 2;
      draw(now);
    }
    window.requestAnimationFrame(frame);
  }

  const movementCodes = new Set([
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "KeyA",
    "KeyD",
    "KeyW",
    "KeyS",
  ]);

  window.addEventListener("keydown", (event) => {
    if (movementCodes.has(event.code)) {
      keys.add(event.code);
      if (gameState === "running") event.preventDefault();
    }

    if (event.code === "Space") {
      if (gameState === "running") {
        event.preventDefault();
        activateBlast();
      }
    } else if (
      event.code === "Escape"
      && gameState === "gameover"
      && !ui.statsOverlay.hidden
    ) {
      event.preventDefault();
      closeGameStats();
    } else if (
      event.code === "Escape"
      && gameState === "paused"
      && !ui.resetConfirmOverlay.hidden
    ) {
      event.preventDefault();
      cancelResetConfirmation();
    } else if (event.code === "KeyP" || event.code === "Escape") {
      if (gameState === "running" || gameState === "paused") {
        event.preventDefault();
        togglePause();
      }
    } else if (
      event.code === "Enter"
      && (gameState === "ready" || (gameState === "gameover" && ui.statsOverlay.hidden))
    ) {
      event.preventDefault();
      startGame();
    }
  });

  window.addEventListener("keyup", (event) => {
    keys.delete(event.code);
  });

  window.addEventListener("gamepadconnected", (event) => {
    activeGamepadIndex = event.gamepad.index;
  });

  window.addEventListener("gamepaddisconnected", (event) => {
    if (event.gamepad.index !== activeGamepadIndex) return;
    activeGamepadIndex = null;
    gamepadMove.x = 0;
    gamepadMove.y = 0;
    gamepadMove.active = false;
    gamepadBlastPressed = false;
    gamepadPausePressed = false;
  });

  window.addEventListener("pointermove", (event) => {
    if (coarsePointer || event.pointerType === "touch") return;
    const rect = canvas.getBoundingClientRect();
    const movementBounds = world.playerBounds;
    mouseTarget.x = clamp(event.clientX - rect.left, movementBounds.left, movementBounds.right);
    mouseTarget.y = clamp(event.clientY - rect.top, movementBounds.top, movementBounds.bottom);
    if (gameState === "running") mouseTarget.active = true;
  }, { passive: true });

  window.addEventListener("blur", () => {
    keys.clear();
    gamepadMove.x = 0;
    gamepadMove.y = 0;
    gamepadMove.active = false;
    gamepadBlastPressed = false;
    gamepadPausePressed = false;
    if (gameState === "running") togglePause(true);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && gameState === "running") togglePause(true);
  });

  ui.startButton.addEventListener("click", startGame);
  ui.startModeButton.addEventListener("click", toggleHardcoreMode);
  ui.restartButton.addEventListener("click", startGame);
  ui.statsButton.addEventListener("click", openGameStats);
  ui.statsCloseButton.addEventListener("click", closeGameStats);
  ui.gameoverModeButton.addEventListener("click", toggleHardcoreMode);
  ui.resumeButton.addEventListener("click", () => togglePause());
  ui.resetButton.addEventListener("click", openResetConfirmation);
  ui.resetCancelButton.addEventListener("click", cancelResetConfirmation);
  ui.resetConfirmButton.addEventListener("click", confirmResetGame);
  ui.movementButton.addEventListener("click", toggleMovementMode);
  ui.qualityButton.addEventListener("click", cycleQuality);
  ui.pauseButton.addEventListener("click", () => togglePause());
  ui.soundButton.addEventListener("click", toggleSound);
  ui.judgmentButton.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    activateBlast();
  });
  ui.judgmentButton.addEventListener("click", () => activateBlast());
  canvas.addEventListener("pointerdown", () => {
    canvas.focus({ preventScroll: true });
  });

  ui.joystick.addEventListener("pointerdown", (event) => {
    if (gameState !== "running") return;
    event.preventDefault();
    touchMove.pointerId = event.pointerId;
    ui.joystick.setPointerCapture(event.pointerId);
    updateJoystick(event);
  });

  ui.joystick.addEventListener("pointermove", (event) => {
    if (touchMove.pointerId !== event.pointerId) return;
    event.preventDefault();
    updateJoystick(event);
  });

  for (const eventName of ["pointerup", "pointercancel", "lostpointercapture"]) {
    ui.joystick.addEventListener(eventName, (event) => {
      if (touchMove.pointerId === null || touchMove.pointerId === event.pointerId) resetJoystick();
    });
  }

  const resizeObserver = new ResizeObserver(resizeCanvas);
  resizeObserver.observe(canvas);
  window.addEventListener("resize", resizeCanvas, { passive: true });

  ui.soundButton.textContent = soundOn ? "SOUND ON" : "SOUND OFF";
  ui.soundButton.setAttribute("aria-pressed", soundOn ? "false" : "true");
  player.lives = maximumLives();
  updateGameModeUi();
  applyQuality(qualityLevel, false, false);
  resizeCanvas();
  updateMovementModeUi();
  updateInterface(true);
  if (document.fonts?.ready) {
    document.fonts.ready.then(() => {
      renderCache.textWidths.clear();
      renderCache.emojiMetrics.clear();
      renderCache.emojiSprites.clear();
      renderCache.enemySprites.clear();
      fitAllNumberDisplays();
    });
  }
  window.requestAnimationFrame(frame);
})();
