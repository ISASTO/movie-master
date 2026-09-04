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
    ratingLabel: $("rating-label"),
    streak: $("streak-value"),
    masteryPercent: $("mastery-percent"),
    masteryTrack: $("mastery-track"),
    masteryFill: $("mastery-fill"),
    reserveMasteryTrack: $("reserve-mastery-track"),
    reserveMasteryFill: $("reserve-mastery-fill"),
    blastMeter: $("mastery-track")?.closest?.(".blast-meter") || $("mastery-track")?.parentElement?.parentElement,
    missionBanner: $("mission-banner"),
    startOverlay: $("start-overlay"),
    infoOverlay: $("info-overlay"),
    pauseOverlay: $("pause-overlay"),
    resetConfirmOverlay: $("reset-confirm-overlay"),
    endConfirmOverlay: $("end-confirm-overlay"),
    exitConfirmOverlay: $("exit-confirm-overlay"),
    gameoverOverlay: $("gameover-overlay"),
    statsOverlay: $("stats-overlay"),
    resumeCountdown: $("resume-countdown"),
    resumeCountdownValue: $("resume-countdown-value"),
    startButton: $("start-button"),
    startModeButton: $("start-mode-button"),
    startLeaderboardsButton: $("start-leaderboards-button"),
    startInfoButton: $("start-info-button"),
    startMainSiteButton: $("start-main-site-button"),
    startHardcoreWarning: $("start-hardcore-warning"),
    resumeButton: $("resume-button"),
    pauseMainSiteButton: $("pause-main-site-button"),
    resetButton: $("reset-button"),
    resetCancelButton: $("reset-cancel-button"),
    resetConfirmButton: $("reset-confirm-button"),
    endButton: $("end-button"),
    endCancelButton: $("end-cancel-button"),
    endConfirmButton: $("end-confirm-button"),
    exitButton: $("exit-button"),
    exitCancelButton: $("exit-cancel-button"),
    exitConfirmButton: $("exit-confirm-button"),
    restartButton: $("restart-button"),
    statsButton: $("stats-button"),
    shareRunButton: $("share-run-button"),
    gameoverLeaderboardsButton: $("gameover-leaderboards-button"),
    gameoverMainSiteButton: $("gameover-main-site-button"),
    shareRunStatus: $("share-run-status"),
    statsCloseButton: $("stats-close-button"),
    leaderboardOverlay: $("leaderboard-overlay"),
    leaderboardCloseButton: $("leaderboards-close-button"),
    gameoverModeButton: $("gameover-mode-button"),
    gameoverHardcoreWarning: $("gameover-hardcore-warning"),
    movementButton: $("movement-button"),
    qualityButton: $("quality-button"),
    infoButton: $("info-button"),
    infoCloseButton: $("info-close-button"),
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
  const GAMEPAD_CONFIRM_BUTTON = 0;
  const GAMEPAD_CANCEL_BUTTON = 1;
  const GAMEPAD_DPAD_UP = 12;
  const GAMEPAD_DPAD_DOWN = 13;
  const GAMEPAD_DPAD_LEFT = 14;
  const GAMEPAD_DPAD_RIGHT = 15;
  const MENU_AXIS_THRESHOLD = 0.64;
  const MENU_AXIS_RELEASE_THRESHOLD = 0.3;
  const MENU_NEUTRAL_DWELL = 85;
  const MENU_REPEAT_DELAY = 170;
  const MENU_REPEAT_INTERVAL = 170;
  const RECORD_SAVE_DELAY = 1800;
  const RESUME_COUNTDOWN_DURATION = 2000;
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
  const POPCORN_GLOW_RADIUS = 95;
  const POWERUP_GLOW_RADIUS = 108;
  const COLLECTIBLE_GLOW_GAP = 8;
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
  const POWERUP_TYPE_KEYS = Object.keys(POWERUP_TYPES);
  const PLAYER_AURA_STOPS = {
    normal: [
      [0, "rgba(255, 218, 107, 0.58)"],
      [0.42, "rgba(229, 164, 8, 0.25)"],
      [1, "rgba(229, 164, 8, 0)"],
    ],
    ready: [
      [0, "rgba(255, 244, 185, 0.92)"],
      [0.42, "rgba(255, 196, 41, 0.54)"],
      [1, "rgba(229, 164, 8, 0)"],
    ],
  };
  const PICKUP_BEAM_STOPS = {
    normal: [[0, "rgba(255, 211, 96, 0.27)"], [1, "rgba(229, 164, 8, 0)"]],
    danger: [[0, "rgba(255, 105, 72, 0.27)"], [1, "rgba(229, 164, 8, 0)"]],
  };
  const POWERUP_BEAM_STOPS = Object.fromEntries(
    POWERUP_TYPE_KEYS.map((type) => [
      type,
      [[0, `${POWERUP_TYPES[type].color}55`], [1, `${POWERUP_TYPES[type].color}00`]],
    ]),
  );
  const ENEMY_DEFINITIONS = {
    standard: { radius: 23, speed: 1, hp: 1, color: "#6d5747", score: 34 },
    fast: { radius: 18, speed: 1.56, hp: 1, color: "#a53a29", score: 52 },
    heavy: { radius: 31, speed: 0.72, hp: 3, color: "#513660", score: 105 },
  };
  const SOUND_KEY = "movie-master-vs-garbage-sound-v1";
  const MOVEMENT_KEY = "movie-master-vs-garbage-movement-v1";
  const QUALITY_KEY = "movie-master-vs-garbage-quality-v1";
  const QUALITY_ORDER = ["high", "medium", "low"];
  const BACKGROUND_TWINKLE_PHASE_COUNT = 16;
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
  const PARTICLE_DIRECTIONS = Array.from({ length: 256 }, (_, index) => {
    const angle = (index / 256) * Math.PI * 2;
    return { x: Math.cos(angle), y: Math.sin(angle) };
  });
  const FAST_THREAT_SCORE_FACTOR = 1 / (1.35 * 1.35);
  const RUSH_THREAT_SCORE_FACTOR = 1 / (1.12 * 1.12);
  const FAST_RUSH_THREAT_SCORE_FACTOR = 1 / ((1.35 * 1.12) ** 2);
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
    canvasLeft: 0,
    canvasTop: 0,
    backgroundStars: [],
    bounds: { left: 24, right: 300, top: 160, bottom: 500 },
    playerBounds: { left: 24, right: 300, top: 160, bottom: 500 },
  };

  const renderCache = {
    generation: 0,
    backgroundGradient: null,
    backgroundRays: null,
    backgroundStarBatches: null,
    backgroundGrid: null,
    filmHoles: null,
    starPaths: new Map(),
    projectileSprites: new Map(),
    enemySprites: new Map(),
    emojiSprites: new Map(),
    radialFillSprites: new Map(),
    textWidths: new Map(),
    emojiMetrics: new Map(),
    powerupStatusLayout: null,
  };
  const powerupStatusItems = [
    { type: "shield", color: COLORS.shield, text: "", textWidth: 0, width: 0, tenths: -1, hits: -1 },
    { type: "speed", color: COLORS.speed, text: "", textWidth: 0, width: 0, tenths: -1, hits: -1 },
    { type: "super", color: COLORS.super, text: "", textWidth: 0, width: 0, tenths: -1, hits: -1 },
    { type: "magnet", color: COLORS.magnet, text: "", textWidth: 0, width: 0, tenths: -1, hits: -1 },
  ];
  const powerupStatusRows = Array.from(
    { length: powerupStatusItems.length },
    () => ({ start: 0, end: 0, width: 0 }),
  );

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
  const compareEnemiesByX = (a, b) => a.x - b.x;
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
  let runStartingBestScore = bestScore;
  let runStartingBestStreak = bestStreak;
  let recordScoreDirty = false;
  let recordStreakDirty = false;
  let recordSaveTimer = 0;
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
  let lastRenderedPickupTenths = -1;
  let audioContext = null;
  let soundOn = readString(SOUND_KEY, "on") !== "off";
  let movementMode = coarsePointer ? "touch" : readString(MOVEMENT_KEY, "mouse");
  let qualityLevel = readString(QUALITY_KEY, "high");
  if (!QUALITY_LEVELS[qualityLevel]) qualityLevel = "high";
  let qualitySettings = QUALITY_LEVELS[qualityLevel];
  let activeGamepadIndex = null;
  let activeGamepadHasRelevantInput = false;
  let gamepadConnectionKnown = false;
  let nextGamepadProbeAt = 0;
  let gamepadBlastPressed = false;
  let gamepadPausePressed = false;
  let gamepadConfirmPressed = false;
  let gamepadCancelPressed = false;
  let gamepadMenuDirectionActive = false;
  let gamepadMenuDirectionX = 0;
  let gamepadMenuDirectionY = 0;
  let gamepadMenuNeutralSince = -1;
  let gamepadMenuNextRepeatAt = 0;
  let gamepadMenuRequiresNeutral = false;
  let gamepadMenuContext = "ready";
  let controllerSelectedButton = null;
  let controllerInputActive = false;
  let backgroundAnimationTime = performance.now() / 1000;
  let resumeCountdownStartedAt = 0;
  let resumeCountdownStep = "";
  let exitReturnState = "paused";
  let infoReturnState = "ready";
  let leaderboardReturnButton = null;
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

  function flushRunRecords() {
    if (recordSaveTimer) {
      window.clearTimeout(recordSaveTimer);
      recordSaveTimer = 0;
    }
    if (recordScoreDirty) {
      saveValue(currentScoreKey(), bestScore);
      recordScoreDirty = false;
    }
    if (recordStreakDirty) {
      saveValue(currentStreakScoreKey(), bestStreak);
      recordStreakDirty = false;
    }
  }

  function scheduleRunRecordSave() {
    if (recordSaveTimer) return;
    recordSaveTimer = window.setTimeout(() => {
      recordSaveTimer = 0;
      if (recordScoreDirty) {
        saveValue(currentScoreKey(), bestScore);
        recordScoreDirty = false;
      }
      if (recordStreakDirty) {
        saveValue(currentStreakScoreKey(), bestStreak);
        recordStreakDirty = false;
      }
    }, RECORD_SAVE_DELAY);
  }

  function trackRunRecords(roundedScore = Math.floor(score), streak = longestStreak) {
    if (roundedScore > bestScore) {
      bestScore = roundedScore;
      recordScoreDirty = true;
    }
    if (streak > bestStreak) {
      bestStreak = streak;
      recordStreakDirty = true;
    }
    if (recordScoreDirty || recordStreakDirty) scheduleRunRecordSave();
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
    for (const warning of [ui.startHardcoreWarning, ui.gameoverHardcoreWarning]) {
      warning.hidden = !enabled;
    }
    ui.ratingLabel.textContent = enabled ? "YOUR HARDCORE RATING" : "YOUR CURRENT RATING";
    document.documentElement?.classList.toggle("hardcore-mode", enabled);
  }

  function toggleHardcoreMode() {
    if (!["ready", "gameover"].includes(gameState)) return;
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
  const fittedStatDisplays = [
    ui.statMode,
    ui.statGameTime,
    ui.statScore,
    ui.statLongestStreak,
    ui.statPopcornCollected,
    ui.statPopcornMissed,
    ui.statGarbageDestroyed,
    ui.statDestroyedByStars,
    ui.statDestroyedByBlasts,
    ui.statStarsFired,
    ui.statStarsHit,
    ui.statStarAccuracy,
    ui.statHitsTaken,
    ui.statShieldBlocks,
    ui.statBlastsUsed,
    ui.statPowerupShield,
    ui.statPowerupSpeed,
    ui.statPowerupSuper,
    ui.statPowerupMagnet,
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

  function fitAllStatDisplays() {
    for (const element of fittedStatDisplays) fitNumberToWidth(element);
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
    renderCache.generation += 1;
    renderCache.textWidths.clear();
    renderCache.emojiMetrics.clear();
    renderCache.projectileSprites.clear();
    renderCache.enemySprites.clear();
    renderCache.emojiSprites.clear();
    renderCache.radialFillSprites.clear();
    for (let index = 0; index < projectilePool.length; index += 1) {
      projectilePool[index].renderSprite = null;
    }
    for (let index = 0; index < projectiles.length; index += 1) {
      projectiles[index].renderSprite = null;
    }
    for (let index = 0; index < enemies.length; index += 1) {
      enemies[index].renderSprite = null;
    }
    renderCache.backgroundGradient = createBackgroundGradient();
    renderCache.backgroundStarBatches = null;
    const shortViewport = world.height <= 500;
    const fontSize = clamp(world.width * 0.012, shortViewport ? 9 : 10, shortViewport ? 11 : 13);
    const iconSize = fontSize * (shortViewport ? 1.08 : 1.18);
    const iconGap = shortViewport ? 4 : 6;
    const horizontalPadding = shortViewport ? 7 : 10;
    const verticalPadding = shortViewport ? 5 : 7;
    renderCache.powerupStatusLayout = {
      shortViewport,
      fontSize,
      iconSize,
      iconGap,
      horizontalPadding,
      height: Math.max(fontSize, iconSize) + verticalPadding * 2,
      gap: shortViewport ? 4 : 6,
      availableWidth: Math.max(1, world.bounds.right - world.bounds.left),
      font: `800 ${fontSize}px "Futura Web", sans-serif`,
    };

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

  function rebuildBackgroundStarBatches() {
    if (typeof Path2D !== "function") {
      renderCache.backgroundStarBatches = null;
      return;
    }

    const paths = Array(BACKGROUND_TWINKLE_PHASE_COUNT).fill(null);
    const stars = world.backgroundStars;
    for (let index = 0; index < stars.length; index += 1) {
      const star = stars[index];
      let path = paths[star.phaseBucket];
      if (!path) {
        path = new Path2D();
        paths[star.phaseBucket] = path;
      }
      path.rect(star.x, star.y, star.size, star.size);
    }

    const batches = [];
    for (let phaseBucket = 0; phaseBucket < paths.length; phaseBucket += 1) {
      const path = paths[phaseBucket];
      if (!path) continue;
      const phase = (phaseBucket / BACKGROUND_TWINKLE_PHASE_COUNT) * Math.PI * 2;
      batches.push({
        path,
        phaseSine: Math.sin(phase),
        phaseCosine: Math.cos(phase),
      });
    }
    renderCache.backgroundStarBatches = batches;
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
    sortedEnemies.sort(compareEnemiesByX);
    collisionIndex.maxEnemyRadius = maxEnemyRadius;
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
    particle.renderStarPath = null;
    if (particlePool.length < MAX_PARTICLE_POOL_SIZE) particlePool.push(particle);
  }

  function recycleAllParticles() {
    const room = MAX_PARTICLE_POOL_SIZE - particlePool.length;
    const start = Math.max(0, particles.length - room);
    for (let index = start; index < particles.length; index += 1) {
      const particle = particles[index];
      particle.renderStarPath = null;
      particlePool.push(particle);
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
    world.canvasLeft = rect.left;
    world.canvasTop = rect.top;
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
      () => {
        const x = Math.random() * world.width;
        const y = Math.random() * world.height;
        const size = randomBetween(0.7, 2.1);
        const phase = Math.random() * Math.PI * 2;
        return {
          x,
          y,
          size,
          phaseBucket: Math.floor(
            (phase / (Math.PI * 2)) * BACKGROUND_TWINKLE_PHASE_COUNT,
          ) % BACKGROUND_TWINKLE_PHASE_COUNT,
          phaseSine: Math.sin(phase),
          phaseCosine: Math.cos(phase),
        };
      },
    );
    rebuildBackgroundStarBatches();

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

    for (let index = pickups.length - 1; index >= 0; index -= 1) {
      const pickup = pickups[index];
      if (!isCollectibleGlowBlocked(pickup.x, pickup.y, powerups)) continue;
      const replacement = choosePopcornPosition(pickup.radius);
      if (replacement) {
        pickup.x = replacement.x;
        pickup.y = replacement.y;
      } else {
        pickups.splice(index, 1);
      }
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
    fitAllStatDisplays();
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
    lastRenderedPickupTenths = -1;
    runStartingBestScore = bestScore;
    runStartingBestStreak = bestStreak;
    recordScoreDirty = false;
    recordStreakDirty = false;
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

  function visibleMenuButtons() {
    if (!ui.infoOverlay.hidden) return [ui.infoCloseButton];
    if (!ui.leaderboardOverlay.hidden) {
      return [
        ui.leaderboardCloseButton,
        ...ui.leaderboardOverlay.querySelectorAll("button"),
      ].filter((button, index, items) => button && items.indexOf(button) === index);
    }
    if (gameState === "ready") {
      return [ui.startButton, ui.startModeButton, ui.startLeaderboardsButton, ui.startInfoButton, ui.startMainSiteButton];
    }
    if (gameState === "paused") return [ui.resumeButton, ui.resetButton, ui.endButton, ui.pauseMainSiteButton];
    if (gameState === "reset-confirm") return [ui.resetCancelButton, ui.resetConfirmButton];
    if (gameState === "end-confirm") return [ui.endCancelButton, ui.endConfirmButton];
    if (gameState === "exit-confirm") return [ui.exitCancelButton, ui.exitConfirmButton];
    if (gameState === "gameover" && !ui.statsOverlay.hidden) return [ui.statsCloseButton];
    if (gameState === "gameover") {
      return [
        ui.restartButton,
        ui.statsButton,
        ui.shareRunButton,
        ui.gameoverLeaderboardsButton,
        ui.gameoverMainSiteButton,
        ui.gameoverModeButton,
        ...ui.gameoverOverlay.querySelectorAll(".leaderboard-name-form button, .leaderboard-card button"),
      ].filter((button, index, items) => button && items.indexOf(button) === index);
    }
    return [];
  }

  function setControllerSelection(button) {
    const candidates = visibleMenuButtons().filter((item) => item.getClientRects().length);
    const next = candidates.includes(button) && !button.disabled ? button : candidates.find((item) => !item.disabled) || null;
    if (controllerSelectedButton === next) return;
    controllerSelectedButton?.classList.remove("controller-selected");
    controllerSelectedButton = next;
    controllerSelectedButton?.classList.add("controller-selected");
    if (controllerInputActive) controllerSelectedButton?.focus({ preventScroll: true });
  }

  function setControllerInputActive(active) {
    const next = Boolean(active);
    if (controllerInputActive === next) return;
    controllerInputActive = next;
    document.documentElement.classList.toggle("controller-input", next);
    if (next) controllerSelectedButton?.focus({ preventScroll: true });
    else controllerSelectedButton?.blur();
  }

  function selectDefaultMenuButton() {
    setControllerSelection(visibleMenuButtons().find((button) => !button.disabled) || null);
  }

  function moveControllerSelection(directionX, directionY) {
    const candidates = visibleMenuButtons().filter((button) => !button.disabled && button.getClientRects().length);
    if (!candidates.length) return;
    if (!candidates.includes(controllerSelectedButton)) {
      setControllerSelection(candidates[0]);
      return;
    }

    const currentRect = controllerSelectedButton.getBoundingClientRect();
    const currentX = currentRect.left + currentRect.width / 2;
    const currentY = currentRect.top + currentRect.height / 2;
    let winner = null;
    let winnerScore = Infinity;

    for (const candidate of candidates) {
      if (candidate === controllerSelectedButton) continue;
      const rect = candidate.getBoundingClientRect();
      const dx = rect.left + rect.width / 2 - currentX;
      const dy = rect.top + rect.height / 2 - currentY;
      const forwardDistance = dx * directionX + dy * directionY;
      if (forwardDistance <= 2) continue;
      const perpendicularDistance = Math.abs(dx * directionY - dy * directionX);
      const scoreValue = forwardDistance + perpendicularDistance * 2.35;
      if (scoreValue < winnerScore) {
        winner = candidate;
        winnerScore = scoreValue;
      }
    }

    if (winner) setControllerSelection(winner);
  }

  function clearControllerSelection() {
    controllerSelectedButton?.classList.remove("controller-selected");
    controllerSelectedButton = null;
  }

  function hideResumeCountdown() {
    ui.resumeCountdown.hidden = true;
    ui.resumeCountdown.setAttribute("aria-hidden", "true");
    ui.resumeCountdown.style.removeProperty("--resume-progress");
    resumeCountdownStartedAt = 0;
    resumeCountdownStep = "";
  }

  function pauseRunningGame() {
    flushRunRecords();
    gameState = "paused";
    setPausePresentation(true);
    hideResumeCountdown();
    ui.resetConfirmOverlay.hidden = true;
    ui.endConfirmOverlay.hidden = true;
    ui.exitConfirmOverlay.hidden = true;
    ui.pauseOverlay.hidden = false;
    ui.pauseButton.textContent = "RESUME";
    mouseTarget.active = false;
    resetJoystick();
    selectDefaultMenuButton();
    announce("Intermission.");
  }

  function beginResumeCountdown() {
    if (!["paused", "resuming", "exit-confirm"].includes(gameState)) return;
    gameState = "resuming";
    setPausePresentation(false);
    ui.pauseOverlay.hidden = true;
    ui.resetConfirmOverlay.hidden = true;
    ui.endConfirmOverlay.hidden = true;
    ui.exitConfirmOverlay.hidden = true;
    clearControllerSelection();
    resumeCountdownStartedAt = performance.now();
    resumeCountdownStep = "3";
    ui.resumeCountdownValue.textContent = "3";
    ui.resumeCountdown.style.setProperty("--resume-progress", "0");
    ui.resumeCountdown.hidden = false;
    ui.resumeCountdown.setAttribute("aria-hidden", "false");
    ui.pauseButton.textContent = "PAUSE";
    announce("Resuming in three, two, one.");
  }

  function updateResumeCountdown(now) {
    if (gameState !== "resuming") return;
    const elapsedCountdown = Math.max(0, now - resumeCountdownStartedAt);
    const progress = Math.min(1, elapsedCountdown / RESUME_COUNTDOWN_DURATION);
    ui.resumeCountdown.style.setProperty("--resume-progress", String(progress));
    const nextStep = elapsedCountdown < 550
      ? "3"
      : elapsedCountdown < 1100
        ? "2"
        : elapsedCountdown < 1650
          ? "1"
          : "GO";
    if (nextStep !== resumeCountdownStep) {
      resumeCountdownStep = nextStep;
      ui.resumeCountdownValue.textContent = nextStep;
    }
    if (progress < 1) return;

    gameState = "running";
    hideResumeCountdown();
    lastFrame = now;
    canvas.focus({ preventScroll: true });
    announce("The Movie Master has resumed.");
  }

  function startGame() {
    ensureAudio();
    flushRunRecords();
    resetGame();
    gameState = "running";
    setPausePresentation(false);
    hideResumeCountdown();
    clearControllerSelection();
    ui.startOverlay.hidden = true;
    ui.infoOverlay.hidden = true;
    ui.pauseOverlay.hidden = true;
    ui.resetConfirmOverlay.hidden = true;
    ui.endConfirmOverlay.hidden = true;
    ui.exitConfirmOverlay.hidden = true;
    ui.gameoverOverlay.hidden = true;
    ui.statsOverlay.hidden = true;
    ui.leaderboardOverlay.hidden = true;
    ui.shareRunStatus.textContent = "";
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
    const scoreRecord = finalScore > runStartingBestScore;
    const streakRecord = longestStreak > runStartingBestStreak;
    trackRunRecords(finalScore, longestStreak);
    flushRunRecords();

    return { finalScore, scoreRecord, streakRecord };
  }

  function endGame(reason = "garbage") {
    if (gameState === "gameover") return;

    gameState = "gameover";
    setPausePresentation(false);
    const records = saveRunRecords();

    setFittedNumber(ui.finalScore, formatScore(records.finalScore));
    setFittedNumber(ui.finalLongestStreak, longestStreak);
    const missedPopcorn = reason === "missed-popcorn";
    const manuallyEnded = reason === "manual";
    ui.gameoverTitle.textContent = manuallyEnded
      ? "RUN ENDED"
      : missedPopcorn
        ? "YOU MISSED A POPCORN"
        : records.scoreRecord
          ? "NEW BEST SCORE"
          : records.streakRecord
            ? "NEW BEST STREAK"
            : "OVERWHELMED BY GARBAGE 🗑️";
    ui.pauseOverlay.hidden = true;
    ui.resetConfirmOverlay.hidden = true;
    ui.endConfirmOverlay.hidden = true;
    ui.exitConfirmOverlay.hidden = true;
    hideResumeCountdown();
    ui.gameoverOverlay.hidden = false;
    ui.statsOverlay.hidden = true;
    ui.leaderboardOverlay.hidden = true;
    ui.shareRunStatus.textContent = "";
    fitNumberToWidth(ui.finalScore);
    fitNumberToWidth(ui.finalLongestStreak);
    ui.pauseButton.disabled = true;
    resetJoystick();
    renderGameStats(records.finalScore);
    updateInterface(true);
    setControllerSelection(ui.restartButton);
    announce(
      manuallyEnded
        ? "Run ended. Results are ready."
        : missedPopcorn
          ? "You missed a popcorn. Game over."
          : records.scoreRecord
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
    ui.statPowerupShield.textContent = formatScore(runStats.powerups.shield);
    ui.statPowerupSpeed.textContent = formatScore(runStats.powerups.speed);
    ui.statPowerupSuper.textContent = formatScore(runStats.powerups.super);
    ui.statPowerupMagnet.textContent = formatScore(runStats.powerups.magnet);
  }

  async function copyRunText(text) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    if (!copied) throw new Error("Copy unavailable");
  }

  async function shareRun() {
    if (gameState !== "gameover") return;
    const runSummary = `I scored ${formatScore(Math.floor(score))} points with a ${formatScore(longestStreak)} popcorn streak in ${hardcoreMode ? "Hardcore" : "Normal"} Mode in Movie Master vs Garbage. Game time: ${formatDuration(elapsed)}.`;
    const gameUrl = "https://moviemaster.vip/game/";
    ui.shareRunStatus.textContent = "";
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: "Movie Master vs Garbage", text: runSummary, url: gameUrl });
        ui.shareRunStatus.textContent = "RUN SHARED";
        announce("Run shared.");
        return;
      }
      await copyRunText(`${runSummary} ${gameUrl}`);
      ui.shareRunStatus.textContent = "RUN SUMMARY COPIED";
      announce("Run summary copied.");
    } catch (error) {
      if (error?.name === "AbortError") return;
      ui.shareRunStatus.textContent = "SHARING ISN'T AVAILABLE HERE";
      announce("Sharing is not available in this browser.");
    }
  }

  function openGameStats() {
    if (gameState !== "gameover") return;
    ui.gameoverOverlay.hidden = true;
    ui.statsOverlay.hidden = false;
    fitAllStatDisplays();
    setControllerSelection(ui.statsCloseButton);
    announce("Game stats.");
  }

  function closeGameStats() {
    if (gameState !== "gameover" || ui.statsOverlay.hidden) return;
    ui.statsOverlay.hidden = true;
    ui.gameoverOverlay.hidden = false;
    setControllerSelection(ui.statsButton);
    announce("Game over.");
  }

  function openLeaderboards(event) {
    if (gameState !== "ready" && gameState !== "gameover") return;
    leaderboardReturnButton = event?.currentTarget || null;
    ui.startOverlay.hidden = true;
    ui.gameoverOverlay.hidden = true;
    ui.statsOverlay.hidden = true;
    ui.leaderboardOverlay.hidden = false;
    const mode = hardcoreMode ? "HARDCORE" : "NORMAL";
    window.dispatchEvent(new CustomEvent("movie-master:leaderboards-opened", {
      detail: { mode },
    }));
    const mobileTab = ui.leaderboardOverlay.querySelector(`[data-leaderboard-mode-tab="${mode}"]`);
    setControllerSelection(
      window.matchMedia("(max-width: 760px)").matches
        ? mobileTab
        : ui.leaderboardCloseButton,
    );
    announce(`${hardcoreMode ? "Hardcore" : "Standard"} leaderboard.`);
  }

  function closeLeaderboards() {
    if (ui.leaderboardOverlay.hidden) return;
    ui.leaderboardOverlay.hidden = true;
    if (gameState === "gameover") ui.gameoverOverlay.hidden = false;
    else ui.startOverlay.hidden = false;
    setControllerSelection(leaderboardReturnButton);
    leaderboardReturnButton = null;
    announce(gameState === "gameover" ? "Game over." : "Ready to start.");
  }

  function openInfo() {
    if (!ui.infoOverlay.hidden) return;
    infoReturnState = gameState;
    if (gameState === "running" || gameState === "resuming") {
      pauseRunningGame();
      infoReturnState = "paused";
    }
    ui.infoOverlay.hidden = false;
    setControllerSelection(ui.infoCloseButton);
    announce("How to play.");
  }

  function closeInfo() {
    if (ui.infoOverlay.hidden) return;
    ui.infoOverlay.hidden = true;
    if (infoReturnState === "ready") setControllerSelection(ui.startButton);
    else if (infoReturnState === "paused") setControllerSelection(ui.resumeButton);
    else if (infoReturnState === "reset-confirm") setControllerSelection(ui.resetCancelButton);
    else if (infoReturnState === "end-confirm") setControllerSelection(ui.endCancelButton);
    else if (infoReturnState === "exit-confirm") setControllerSelection(ui.exitCancelButton);
    else if (infoReturnState === "gameover") setControllerSelection(ui.restartButton);
    else selectDefaultMenuButton();
    announce(
      infoReturnState === "paused"
        ? "Intermission."
        : infoReturnState === "gameover"
          ? "Game over."
          : "Ready.",
    );
  }

  function openResetConfirmation() {
    if (gameState !== "paused") return;
    gameState = "reset-confirm";
    ui.pauseOverlay.hidden = true;
    ui.resetConfirmOverlay.hidden = false;
    setControllerSelection(ui.resetCancelButton);
    announce("Confirm reset. Your current game will end.");
  }

  function cancelResetConfirmation() {
    if (gameState !== "reset-confirm" || ui.resetConfirmOverlay.hidden) return;
    gameState = "paused";
    ui.resetConfirmOverlay.hidden = true;
    ui.pauseOverlay.hidden = false;
    setControllerSelection(ui.resetButton);
    announce("Reset cancelled. Intermission.");
  }

  function confirmResetGame() {
    if (gameState !== "reset-confirm") return;
    saveRunRecords();
    startGame();
  }

  function openEndConfirmation() {
    if (gameState !== "paused") return;
    gameState = "end-confirm";
    ui.pauseOverlay.hidden = true;
    ui.endConfirmOverlay.hidden = false;
    setControllerSelection(ui.endCancelButton);
    announce("Confirm end game. Your run will end and results will be shown.");
  }

  function cancelEndConfirmation() {
    if (gameState !== "end-confirm" || ui.endConfirmOverlay.hidden) return;
    gameState = "paused";
    ui.endConfirmOverlay.hidden = true;
    ui.pauseOverlay.hidden = false;
    setControllerSelection(ui.endButton);
    announce("End game cancelled. Intermission.");
  }

  function confirmEndGame() {
    if (gameState !== "end-confirm") return;
    endGame("manual");
  }

  function openExitConfirmation(event) {
    if (gameState === "exit-confirm") {
      event?.preventDefault();
      return;
    }
    if (!["running", "paused", "resuming", "reset-confirm", "end-confirm"].includes(gameState)) return;
    event?.preventDefault();
    flushRunRecords();
    exitReturnState = gameState === "paused" || gameState === "reset-confirm" || gameState === "end-confirm"
      ? "paused"
      : "running";
    gameState = "exit-confirm";
    setPausePresentation(true);
    hideResumeCountdown();
    ui.pauseOverlay.hidden = true;
    ui.resetConfirmOverlay.hidden = true;
    ui.endConfirmOverlay.hidden = true;
    ui.exitConfirmOverlay.hidden = false;
    mouseTarget.active = false;
    resetJoystick();
    setControllerSelection(ui.exitCancelButton);
    announce("Confirm exit. Your current game will end.");
  }

  function cancelExitConfirmation() {
    if (gameState !== "exit-confirm") return;
    ui.exitConfirmOverlay.hidden = true;
    if (exitReturnState === "paused") {
      gameState = "paused";
      setPausePresentation(true);
      ui.pauseOverlay.hidden = false;
      ui.pauseButton.textContent = "RESUME";
      setControllerSelection(ui.resumeButton);
      announce("Exit cancelled. Intermission.");
      return;
    }
    beginResumeCountdown();
  }

  function goToMainSite() {
    flushRunRecords();
    window.location.assign(ui.exitButton.href);
  }

  function confirmExitGame() {
    if (gameState !== "exit-confirm") return;
    goToMainSite();
  }

  function togglePause(forcePause = false) {
    if (gameState === "running") {
      pauseRunningGame();
      return;
    }

    if (gameState === "paused" && !forcePause) {
      beginResumeCountdown();
      return;
    }

    if (gameState === "resuming") {
      pauseRunningGame();
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
    ui.soundButton.setAttribute("aria-pressed", soundOn ? "true" : "false");

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
    ui.desktopInstructions.textContent = `${movementInstruction} • AUTOMATIC SHOOTING • COLLECT POWER-UPS • SPACE OR CLICK FOR BLOCKBUSTER BLAST`;
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
    return ENEMY_DEFINITIONS[kind];
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
      renderSprite: null,
      renderSpriteGeneration: -1,
      renderSpriteHp: -1,
      renderSpriteHit: false,
    });
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

  function isPopcornBlockedByTouchControls(x, y, radius, exclusionZones = null) {
    const zones = exclusionZones || getTouchControlExclusionZones(radius);
    for (let index = 0; index < zones.length; index += 1) {
      const zone = zones[index];
      if (
        x >= zone.left
        && x <= zone.right
        && y >= zone.top
        && y <= zone.bottom
      ) {
        return true;
      }
    }
    return false;
  }

  function isCollectibleGlowBlocked(x, y, otherCollectibles) {
    if (!otherCollectibles.length) return false;
    const clearance = scaleWorld(
      POPCORN_GLOW_RADIUS + POWERUP_GLOW_RADIUS + COLLECTIBLE_GLOW_GAP,
    );
    const clearanceSquared = clearance * clearance;
    for (let index = 0; index < otherCollectibles.length; index += 1) {
      const other = otherCollectibles[index];
      const dx = x - other.x;
      const dy = y - other.y;
      if (dx * dx + dy * dy < clearanceSquared) return true;
    }
    return false;
  }

  function choosePopcornPosition(radius) {
    const { left, right, top, bottom } = world.playerBounds;
    const width = right - left;
    const height = bottom - top;
    const requiredDistance = Math.min(Math.hypot(width, height) * 0.33, scaleWorld(280));
    const requiredDistanceSquared = requiredDistance * requiredDistance;
    const spawnInset = scaleWorld(POPCORN_SAFE_BORDER);
    const centerX = (left + right) / 2;
    const centerY = (top + bottom) / 2;
    const minX = Math.min(centerX, left + spawnInset);
    const maxX = Math.max(centerX, right - spawnInset);
    const minY = Math.min(centerY, top + spawnInset);
    const maxY = Math.max(centerY, bottom - spawnInset);
    const enemyClearance = scaleWorld(70);
    const enemyClearanceSquared = enemyClearance * enemyClearance;
    const exclusionZones = getTouchControlExclusionZones(radius);
    const playerX = player.x;
    const playerY = player.y;
    const enemyCount = enemies.length;
    let hasBest = false;
    let bestX = 0;
    let bestY = 0;
    let bestClearanceSquared = -Infinity;

    for (let candidateIndex = 0; candidateIndex < 95; candidateIndex += 1) {
      let x;
      let y;
      if (candidateIndex < 32) {
        x = randomBetween(minX, maxX);
        y = randomBetween(minY, maxY);
      } else {
        const gridIndex = candidateIndex - 32;
        const row = (gridIndex / 9) | 0;
        const column = gridIndex % 9;
        x = minX + ((maxX - minX) * (column + 0.5)) / 9;
        y = minY + ((maxY - minY) * (row + 0.5)) / 7;
      }

      if (isPopcornBlockedByTouchControls(x, y, radius, exclusionZones)) continue;
      if (isCollectibleGlowBlocked(x, y, powerups)) continue;

      const playerDx = x - playerX;
      const playerDy = y - playerY;
      const playerDistanceSquared = playerDx * playerDx + playerDy * playerDy;
      let nearestClearanceSquared = playerDistanceSquared;
      let clearsEnemies = true;

      for (let index = 0; index < enemyCount; index += 1) {
        const enemy = enemies[index];
        const enemyDx = x - enemy.x;
        const enemyDy = y - enemy.y;
        const enemyDistanceSquared = enemyDx * enemyDx + enemyDy * enemyDy;
        if (enemyDistanceSquared < nearestClearanceSquared) {
          nearestClearanceSquared = enemyDistanceSquared;
        }
        if (enemyDistanceSquared < enemyClearanceSquared) clearsEnemies = false;
      }

      if (playerDistanceSquared >= requiredDistanceSquared && clearsEnemies) {
        return { x, y };
      }

      if (nearestClearanceSquared > bestClearanceSquared) {
        bestClearanceSquared = nearestClearanceSquared;
        hasBest = true;
        bestX = x;
        bestY = y;
      }
    }

    return hasBest ? { x: bestX, y: bestY } : null;
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
    const type = POWERUP_TYPE_KEYS[Math.floor(Math.random() * POWERUP_TYPE_KEYS.length)];
    const horizontalInset = scaleWorld(62);
    const topInset = scaleWorld(55);
    const bottomInset = scaleWorld(72);
    let x = (left + right) / 2;
    let y = (top + bottom) / 2;
    let attempts = 0;
    let blocked = false;
    const playerClearance = scaleWorld(170);
    const playerClearanceSquared = playerClearance * playerClearance;
    const enemyClearance = scaleWorld(75);
    const enemyClearanceSquared = enemyClearance * enemyClearance;

    do {
      x = randomBetween(left + horizontalInset, right - horizontalInset);
      y = randomBetween(top + topInset, bottom - bottomInset);
      attempts += 1;
      const playerDx = x - player.x;
      const playerDy = y - player.y;
      blocked = playerDx * playerDx + playerDy * playerDy < playerClearanceSquared;
      for (let index = 0; !blocked && index < enemies.length; index += 1) {
        const enemy = enemies[index];
        const dx = x - enemy.x;
        const dy = y - enemy.y;
        blocked = dx * dx + dy * dy < enemyClearanceSquared;
      }
      if (!blocked) blocked = isCollectibleGlowBlocked(x, y, pickups);
    } while (attempts < 18 && blocked);

    if (isCollectibleGlowBlocked(x, y, pickups)) {
      powerupSpawnTimer = 0.5;
      return;
    }

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

    if (hardcoreMode) {
      endGame("missed-popcorn");
      return;
    }

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
      projectile.renderSprite = null;
      projectile.renderSpriteGeneration = -1;
      projectile.renderSpriteRadius = -1;
      projectile.renderSpriteColor = "";
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

    const playerX = player.x;
    const playerY = player.y;
    for (let index = 0; index < enemies.length; index += 1) {
      const enemy = enemies[index];
      if (enemy.destroyed) continue;
      const dx = playerX - enemy.x;
      const dy = playerY - enemy.y;
      const candidateDistance = dx * dx + dy * dy;
      if (candidateDistance > maxRangeSquared) continue;
      const threatScoreFactor = enemy.kind === "fast"
        ? enemy.mode === "rush" ? FAST_RUSH_THREAT_SCORE_FACTOR : FAST_THREAT_SCORE_FACTOR
        : enemy.mode === "rush" ? RUSH_THREAT_SCORE_FACTOR : 1;
      const threatScore = candidateDistance * threatScoreFactor;
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
    const speedMinimum = speed * 0.35;
    const speedRange = speed - speedMinimum;
    const gameScale = world.gameScale;
    const random = Math.random;
    for (let i = 0; i < actualCount; i += 1) {
      const direction = PARTICLE_DIRECTIONS[(random() * PARTICLE_DIRECTIONS.length) | 0];
      const velocity = (speedMinimum + random() * speedRange) * gameScale;
      const maxLife = 0.34 + random() * (0.78 - 0.34);
      const particle = acquireParticle();
      particle.x = x;
      particle.y = y;
      particle.vx = direction.x * velocity;
      particle.vy = direction.y * velocity;
      particle.life = maxLife;
      particle.maxLife = maxLife;
      particle.size = (2 + random() * (6 - 2)) * gameScale;
      particle.color = color;
      particle.star = random() < 0.24;
      particle.renderStarPath = null;
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
    if (player.invulnerable > 0) {
      player.invulnerable = player.invulnerable > dt ? player.invulnerable - dt : 0;
    }
    if (shieldTime > 0) {
      shieldTime = shieldTime > dt ? shieldTime - dt : 0;
      if (shieldTime === 0) shieldHits = 0;
    } else if (shieldHits) {
      shieldHits = 0;
    }
    if (speedTime > 0) speedTime = speedTime > dt ? speedTime - dt : 0;
    if (superStarsTime > 0) superStarsTime = superStarsTime > dt ? superStarsTime - dt : 0;
    if (magnetTime > 0) magnetTime = magnetTime > dt ? magnetTime - dt : 0;
    player.bob += dt * (player.moving ? 8 : 3);
    if (bannerTime > 0) bannerTime = bannerTime > dt ? bannerTime - dt : 0;

    const nextDifficulty = 1 + Math.floor(elapsed / 27);
    if (nextDifficulty > difficultyLevel) {
      difficultyLevel = nextDifficulty;
      setBanner("MORE GARBAGE IS APPROACHING", 2, true);
      announce("More garbage is approaching.");
      playCue("advance");
    }

    updateMovement(dt);
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnEnemy();
      if (difficultyLevel >= 4 && Math.random() < Math.min(0.1 + difficultyLevel * 0.018, 0.28)) {
        spawnEnemy();
      }
      const baseInterval = Math.max(0.34, 1.05 - elapsed * 0.0085);
      spawnTimer = baseInterval * randomBetween(0.78, 1.15);
    }

    if (shotTimer > 0) shotTimer = shotTimer > dt ? shotTimer - dt : 0;
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

    if (comboTimer > 0) {
      comboTimer = comboTimer > dt ? comboTimer - dt : 0;
      if (comboTimer === 0) killCombo = 0;
    } else if (killCombo) {
      killCombo = 0;
    }

    updatePowerups(dt);
    updatePickups(dt);
    if (gameState !== "running") return;
    updateEnemies(dt);
    updateProjectiles(dt);
    updateBlast(dt);
    updateParticles(dt);
    updateFloatingTexts(dt);

    if (shakeTime > 0) shakeTime = shakeTime > dt ? shakeTime - dt : 0;
    updateInterface();
  }

  function updateMovement(dt) {
    let dx = 0;
    let dy = 0;
    const touchMagnitudeSquared = touchMove.x * touchMove.x + touchMove.y * touchMove.y;

    if (gamepadMove.active) {
      dx = gamepadMove.x;
      dy = gamepadMove.y;
    } else if (touchMagnitudeSquared > 0.0064) {
      dx = touchMove.x;
      dy = touchMove.y;
    } else if (movementMode === "mouse" && mouseTarget.active) {
      const targetDx = mouseTarget.x - player.x;
      const targetDy = mouseTarget.y - player.y;
      const targetDistanceSquared = targetDx * targetDx + targetDy * targetDy;
      const stopDistance = scaleWorld(9);
      if (targetDistanceSquared > stopDistance * stopDistance) {
        const targetDistance = Math.sqrt(targetDistanceSquared);
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

    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared > 1) {
      const length = Math.sqrt(lengthSquared);
      dx /= length;
      dy /= length;
    }

    if (dx === 0 && dy === 0) {
      player.moving = false;
      player.stationaryTime += dt;
      player.vx = 0;
      player.vy = 0;
      return;
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
    if (!enemies.length) return;

    const rushMargin = scaleWorld(90);
    const closeThreatDistance = scaleWorld(CLOSE_THREAT_RADIUS);
    const closeThreatDistanceSquared = closeThreatDistance * closeThreatDistance;
    const playerX = player.x;
    const playerY = player.y;
    const playerVx = player.vx;
    const playerVy = player.vy;
    const playerRadius = player.radius;
    const playerSpeedSquared = playerVx * playerVx + playerVy * playerVy;
    const canPredictPlayer = playerSpeedSquared >= 1;
    const playerSpeed = canPredictPlayer ? Math.sqrt(playerSpeedSquared) : 0;
    const maximumPredictionScale = canPredictPlayer
      ? MAX_PURSUIT_LEAD_FRACTION / playerSpeed
      : 0;
    const predictionCapScale = canPredictPlayer
      ? playerSpeed / MAX_PURSUIT_LEAD_FRACTION
      : 0;
    const fastPredictionCap = 0.23 * predictionCapScale;
    const heavyPredictionCap = 0.04 * predictionCapScale;
    const standardPredictionCap = 0.11 * predictionCapScale;
    const fastPredictionCapSquared = fastPredictionCap * fastPredictionCap;
    const heavyPredictionCapSquared = heavyPredictionCap * heavyPredictionCap;
    const standardPredictionCapSquared = standardPredictionCap * standardPredictionCap;
    const rushLeft = world.bounds.left - rushMargin;
    const rushRight = world.bounds.right + rushMargin;
    const rushTop = world.bounds.top - rushMargin;
    const rushBottom = world.bounds.bottom + rushMargin;

    for (let i = enemies.length - 1; i >= 0; i -= 1) {
      const enemy = enemies[i];
      enemy.phase += dt * (enemy.kind === "fast" ? 8 : 4.5);
      if (enemy.hitFlash > 0) {
        enemy.hitFlash = enemy.hitFlash > dt ? enemy.hitFlash - dt : 0;
      }

      if (enemy.mode === "rush") {
        enemy.x += enemy.vx * dt;
        enemy.y += enemy.vy * dt;
        if (
          enemy.x < rushLeft ||
          enemy.x > rushRight ||
          enemy.y < rushTop ||
          enemy.y > rushBottom
        ) {
          enemy.destroyed = true;
          enemies.splice(i, 1);
          continue;
        }
      } else {
        const directDx = playerX - enemy.x;
        const directDy = playerY - enemy.y;
        const directDistanceSquared = directDx * directDx + directDy * directDy;
        const isCloseThreat = directDistanceSquared <= closeThreatDistanceSquared;
        const preferredPrediction = enemy.kind === "fast"
          ? 0.23
          : enemy.kind === "heavy"
            ? 0.04
            : 0.11;
        const predictionCapSquared = enemy.kind === "fast"
          ? fastPredictionCapSquared
          : enemy.kind === "heavy"
            ? heavyPredictionCapSquared
            : standardPredictionCapSquared;
        const prediction = isCloseThreat || !canPredictPlayer
          ? 0
          : directDistanceSquared >= predictionCapSquared
            ? preferredPrediction
            : Math.sqrt(directDistanceSquared) * maximumPredictionScale;
        const targetX = playerX + playerVx * prediction;
        const targetY = playerY + playerVy * prediction;
        const dx = targetX - enemy.x;
        const dy = targetY - enemy.y;
        const length = Math.sqrt(dx * dx + dy * dy) || 1;
        enemy.vx = (dx / length) * enemy.speed;
        enemy.vy = (dy / length) * enemy.speed;
        enemy.x += enemy.vx * dt;
        enemy.y += enemy.vy * dt;
      }

      const playerDx = enemy.x - playerX;
      const playerDy = enemy.y - playerY;
      const hitDistance = enemy.radius + playerRadius;
      if (playerDx * playerDx + playerDy * playerDy < hitDistance * hitDistance) {
        damagePlayer(i);
        if (gameState !== "running") return;
      }
    }
  }

  function normalizeGamepadStick(x, y, target = null) {
    const output = target || { x: 0, y: 0, active: false };
    const axisX = Number.isFinite(x) ? clamp(x, -1, 1) : 0;
    const axisY = Number.isFinite(y) ? clamp(y, -1, 1) : 0;
    const stickMagnitudeSquared = axisX * axisX + axisY * axisY;

    if (stickMagnitudeSquared <= GAMEPAD_DEAD_ZONE * GAMEPAD_DEAD_ZONE) {
      output.x = 0;
      output.y = 0;
      output.active = false;
      return output;
    }

    const stickMagnitude = Math.sqrt(stickMagnitudeSquared);
    const scaledMagnitude = Math.min(
      1,
      (stickMagnitude - GAMEPAD_DEAD_ZONE) / (1 - GAMEPAD_DEAD_ZONE),
    );
    output.x = (axisX / stickMagnitude) * scaledMagnitude;
    output.y = (axisY / stickMagnitude) * scaledMagnitude;
    output.active = true;
    return output;
  }

  function resetGamepadMenuNavigation(requireNeutral = false) {
    gamepadMenuDirectionActive = false;
    gamepadMenuDirectionX = 0;
    gamepadMenuDirectionY = 0;
    gamepadMenuNeutralSince = -1;
    gamepadMenuNextRepeatAt = 0;
    gamepadMenuRequiresNeutral = requireNeutral;
  }

  function readGamepadMenuDirection(gamepad) {
    const dpadX = (isGamepadButtonPressed(gamepad, GAMEPAD_DPAD_RIGHT) ? 1 : 0)
      - (isGamepadButtonPressed(gamepad, GAMEPAD_DPAD_LEFT) ? 1 : 0);
    const dpadY = (isGamepadButtonPressed(gamepad, GAMEPAD_DPAD_DOWN) ? 1 : 0)
      - (isGamepadButtonPressed(gamepad, GAMEPAD_DPAD_UP) ? 1 : 0);
    if (dpadX !== 0 || dpadY !== 0) {
      return {
        directionX: dpadX,
        directionY: dpadY,
        holdX: dpadX,
        holdY: dpadY,
        neutral: false,
      };
    }

    const axisX = Number.isFinite(gamepad?.axes?.[0])
      ? clamp(gamepad.axes[0], -1, 1)
      : 0;
    const axisY = Number.isFinite(gamepad?.axes?.[1])
      ? clamp(gamepad.axes[1], -1, 1)
      : 0;
    const absoluteX = Math.abs(axisX);
    const absoluteY = Math.abs(axisY);
    const horizontal = absoluteX >= absoluteY;
    const dominantMagnitude = horizontal ? absoluteX : absoluteY;
    const dominantSign = Math.sign(horizontal ? axisX : axisY);

    return {
      directionX: horizontal && dominantMagnitude >= MENU_AXIS_THRESHOLD ? dominantSign : 0,
      directionY: !horizontal && dominantMagnitude >= MENU_AXIS_THRESHOLD ? dominantSign : 0,
      holdX: horizontal && dominantMagnitude > MENU_AXIS_RELEASE_THRESHOLD ? dominantSign : 0,
      holdY: !horizontal && dominantMagnitude > MENU_AXIS_RELEASE_THRESHOLD ? dominantSign : 0,
      neutral: Math.max(absoluteX, absoluteY) <= MENU_AXIS_RELEASE_THRESHOLD,
    };
  }

  function updateGamepadMenuNavigation(gamepad, now, contextChanged) {
    const input = readGamepadMenuDirection(gamepad);
    if (contextChanged) resetGamepadMenuNavigation(!input.neutral);

    if (gamepadMenuRequiresNeutral) {
      if (!input.neutral) {
        gamepadMenuNeutralSince = -1;
        return;
      }
      if (gamepadMenuNeutralSince < 0) gamepadMenuNeutralSince = now;
      if (now - gamepadMenuNeutralSince < MENU_NEUTRAL_DWELL) return;
      resetGamepadMenuNavigation(false);
      return;
    }

    if (!gamepadMenuDirectionActive) {
      if (input.directionX === 0 && input.directionY === 0) return;
      moveControllerSelection(input.directionX, input.directionY);
      gamepadMenuDirectionActive = true;
      gamepadMenuDirectionX = input.directionX;
      gamepadMenuDirectionY = input.directionY;
      gamepadMenuNeutralSince = -1;
      gamepadMenuNextRepeatAt = now + MENU_REPEAT_DELAY;
      return;
    }

    if (input.neutral) {
      if (gamepadMenuNeutralSince < 0) gamepadMenuNeutralSince = now;
      if (now - gamepadMenuNeutralSince >= MENU_NEUTRAL_DWELL) {
        resetGamepadMenuNavigation(false);
      }
      return;
    }

    gamepadMenuNeutralSince = -1;
    const heldDirectionMatches = input.holdX === gamepadMenuDirectionX
      && input.holdY === gamepadMenuDirectionY;
    if (!heldDirectionMatches || now < gamepadMenuNextRepeatAt) return;

    moveControllerSelection(gamepadMenuDirectionX, gamepadMenuDirectionY);
    gamepadMenuNextRepeatAt = now + MENU_REPEAT_INTERVAL;
  }

  function isGamepadButtonPressed(gamepad, index) {
    const button = gamepad?.buttons?.[index];
    if (typeof button === "number") return button >= GAMEPAD_TRIGGER_THRESHOLD;
    return Boolean(button?.pressed || button?.value >= GAMEPAD_TRIGGER_THRESHOLD);
  }

  function hasRelevantGamepadInput(gamepad) {
    const stickX = Number(gamepad?.axes?.[0]) || 0;
    const stickY = Number(gamepad?.axes?.[1]) || 0;
    if (stickX * stickX + stickY * stickY > GAMEPAD_DEAD_ZONE * GAMEPAD_DEAD_ZONE) return true;
    for (let index = 0; index < GAMEPAD_BLAST_BUTTONS.length; index += 1) {
      if (isGamepadButtonPressed(gamepad, GAMEPAD_BLAST_BUTTONS[index])) return true;
    }
    if (isGamepadButtonPressed(gamepad, GAMEPAD_DPAD_UP)) return true;
    if (isGamepadButtonPressed(gamepad, GAMEPAD_DPAD_DOWN)) return true;
    if (isGamepadButtonPressed(gamepad, GAMEPAD_DPAD_LEFT)) return true;
    if (isGamepadButtonPressed(gamepad, GAMEPAD_DPAD_RIGHT)) return true;
    return isGamepadButtonPressed(gamepad, GAMEPAD_PAUSE_BUTTON);
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

  function chooseActiveGamepad(now = performance.now(), forceProbe = false) {
    if (
      !forceProbe
      && !gamepadConnectionKnown
      && activeGamepadIndex === null
      && now < nextGamepadProbeAt
    ) {
      activeGamepadHasRelevantInput = false;
      return null;
    }

    const gamepads = readConnectedGamepads();
    let first = null;
    let current = null;
    let currentEngaged = false;
    let engaged = null;

    for (let i = 0; i < gamepads.length; i += 1) {
      const gamepad = gamepads[i];
      if (!gamepad || gamepad.connected === false) continue;
      if (!first) first = gamepad;
      const isCurrent = gamepad.index === activeGamepadIndex;
      const relevant = (!engaged || isCurrent) && hasRelevantGamepadInput(gamepad);
      if (isCurrent) {
        current = gamepad;
        currentEngaged = relevant;
      }
      if (!engaged && relevant) engaged = gamepad;
    }

    if (!first) {
      activeGamepadIndex = null;
      activeGamepadHasRelevantInput = false;
      gamepadConnectionKnown = false;
      nextGamepadProbeAt = now + 500;
      return null;
    }

    const selected = engaged && (!current || !currentEngaged)
      ? engaged
      : current || engaged || first;
    activeGamepadIndex = selected.index;
    activeGamepadHasRelevantInput = selected === engaged
      || (selected === current && currentEngaged);
    gamepadConnectionKnown = true;
    nextGamepadProbeAt = 0;
    return selected;
  }

  function resetGamepadInputState() {
    gamepadMove.x = 0;
    gamepadMove.y = 0;
    gamepadMove.active = false;
    gamepadBlastPressed = false;
    gamepadPausePressed = false;
    gamepadConfirmPressed = false;
    gamepadCancelPressed = false;
    gamepadMenuContext = "";
    resetGamepadMenuNavigation(false);
    setControllerInputActive(false);
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
    const gamepad = sourceIsGamepad ? sourceGamepad : chooseActiveGamepad(undefined, true);
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

  function pollGamepad(now = performance.now()) {
    const gamepad = chooseActiveGamepad(now);
    if (!gamepad) {
      if (
        controllerInputActive
        || gamepadMove.active
        || gamepadBlastPressed
        || gamepadPausePressed
        || gamepadConfirmPressed
        || gamepadCancelPressed
        || gamepadMenuDirectionActive
      ) {
        resetGamepadInputState();
      }
      return;
    }

    if (activeGamepadHasRelevantInput) setControllerInputActive(true);

    normalizeGamepadStick(gamepad.axes?.[0], gamepad.axes?.[1], gamepadMove);
    const menuActive = gameState === "ready"
      || gameState === "paused"
      || gameState === "reset-confirm"
      || gameState === "end-confirm"
      || gameState === "exit-confirm"
      || gameState === "gameover";
    const menuButtons = menuActive ? visibleMenuButtons() : null;
    if (menuActive) {
      const currentMenuContext = !ui.infoOverlay.hidden
        ? `info-${gameState}`
        : !ui.leaderboardOverlay.hidden
          ? `leaderboards-${gameState}`
          : gameState === "gameover" && !ui.statsOverlay.hidden
            ? "gameover-stats"
            : gameState;
      const menuContextChanged = gamepadMenuContext !== currentMenuContext;
      updateGamepadMenuNavigation(gamepad, now, menuContextChanged);
      gamepadMenuContext = currentMenuContext;
      gamepadMove.x = 0;
      gamepadMove.y = 0;
      gamepadMove.active = false;
    } else {
      if (gamepadMenuContext) {
        gamepadMenuContext = "";
        resetGamepadMenuNavigation(false);
      }
      if (gamepadMove.active) mouseTarget.active = false;
    }

    const confirmPressed = isGamepadButtonPressed(gamepad, GAMEPAD_CONFIRM_BUTTON);
    if (menuActive && confirmPressed && !gamepadConfirmPressed) {
      if (!menuButtons.includes(controllerSelectedButton)) selectDefaultMenuButton();
      controllerSelectedButton?.click();
    }
    gamepadConfirmPressed = confirmPressed;

    const cancelPressed = isGamepadButtonPressed(gamepad, GAMEPAD_CANCEL_BUTTON);
    if (menuActive && cancelPressed && !gamepadCancelPressed) {
      if (!ui.infoOverlay.hidden) closeInfo();
      else if (!ui.leaderboardOverlay.hidden) closeLeaderboards();
      else if (gameState === "reset-confirm") cancelResetConfirmation();
      else if (gameState === "end-confirm") cancelEndConfirmation();
      else if (gameState === "exit-confirm") cancelExitConfirmation();
      else if (gameState === "gameover" && !ui.statsOverlay.hidden) closeGameStats();
      else if (gameState === "paused") beginResumeCountdown();
    }
    gamepadCancelPressed = cancelPressed;

    let blastPressed = false;
    if (!menuActive && gameState === "running") {
      for (let index = 0; index < GAMEPAD_BLAST_BUTTONS.length; index += 1) {
        if (!isGamepadButtonPressed(gamepad, GAMEPAD_BLAST_BUTTONS[index])) continue;
        blastPressed = true;
        break;
      }
    }
    if (blastPressed && !gamepadBlastPressed) activateBlast(gamepad);
    gamepadBlastPressed = blastPressed;

    const pausePressed = isGamepadButtonPressed(gamepad, GAMEPAD_PAUSE_BUTTON);
    if (
      pausePressed
      && !gamepadPausePressed
      && ui.infoOverlay.hidden
      && (gameState === "running" || gameState === "paused" || gameState === "resuming")
    ) {
      togglePause();
    }
    gamepadPausePressed = pausePressed;
  }

  function updateProjectiles(dt) {
    if (!projectiles.length) return;

    const offscreenMargin = scaleWorld(30);
    const maximumXBoundary = world.width + offscreenMargin;
    const maximumYBoundary = world.height + offscreenMargin;
    const rotationStep = dt * 10;
    if (!enemies.length) {
      for (let index = projectiles.length - 1; index >= 0; index -= 1) {
        const projectile = projectiles[index];
        projectile.x += projectile.vx * dt;
        projectile.y += projectile.vy * dt;
        projectile.rotation += rotationStep;
        if (projectile.rotation >= STAR_ROTATION_PERIOD) {
          projectile.rotation -= STAR_ROTATION_PERIOD;
        }
        if (
          projectile.x < -offscreenMargin
          || projectile.x > maximumXBoundary
          || projectile.y < -offscreenMargin
          || projectile.y > maximumYBoundary
        ) {
          recycleProjectileAt(index);
        }
      }
      return;
    }

    let destroyedEnemies = false;
    populateCollisionIndex();
    const sortedEnemies = collisionIndex.enemies;
    const sortedEnemyCount = sortedEnemies.length;
    const maximumEnemyRadius = collisionIndex.maxEnemyRadius;

    for (let i = projectiles.length - 1; i >= 0; i -= 1) {
      const projectile = projectiles[i];
      const previousX = projectile.x;
      const previousY = projectile.y;
      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;
      projectile.rotation += rotationStep;
      if (projectile.rotation >= STAR_ROTATION_PERIOD) {
        projectile.rotation -= STAR_ROTATION_PERIOD;
      }
      const currentX = projectile.x;
      const currentY = projectile.y;

      if (
        currentX < -offscreenMargin ||
        currentX > maximumXBoundary ||
        currentY < -offscreenMargin ||
        currentY > maximumYBoundary
      ) {
        recycleProjectileAt(i);
        continue;
      }

      if (!sortedEnemyCount) continue;

      const segmentMinX = previousX < currentX ? previousX : currentX;
      const segmentMaxX = previousX > currentX ? previousX : currentX;
      const segmentMinY = previousY < currentY ? previousY : currentY;
      const segmentMaxY = previousY > currentY ? previousY : currentY;
      const segmentX = currentX - previousX;
      const segmentY = currentY - previousY;
      const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;

      const queryPadding = projectile.radius + maximumEnemyRadius;
      const minimumX = segmentMinX - queryPadding;
      const maximumX = segmentMaxX + queryPadding;
      let low = 0;
      let high = sortedEnemyCount;
      while (low < high) {
        const middle = (low + high) >>> 1;
        if (sortedEnemies[middle].x < minimumX) low = middle + 1;
        else high = middle;
      }

      for (let candidateIndex = low; candidateIndex < sortedEnemyCount; candidateIndex += 1) {
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
        let projection = 0;
        if (segmentLengthSquared > 0) {
          projection = (
            (enemy.x - previousX) * segmentX
            + (enemy.y - previousY) * segmentY
          ) / segmentLengthSquared;
          if (projection < 0) projection = 0;
          else if (projection > 1) projection = 1;
        }
        const closestX = previousX + segmentX * projection;
        const closestY = previousY + segmentY * projection;
        const collisionDx = enemy.x - closestX;
        const collisionDy = enemy.y - closestY;
        if (collisionDx * collisionDx + collisionDy * collisionDy > hitDistance * hitDistance) {
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
    let projection = 0;
    if (segmentLengthSquared > 0) {
      projection = (
        (circleX - startX) * segmentX
        + (circleY - startY) * segmentY
      ) / segmentLengthSquared;
      if (projection < 0) projection = 0;
      else if (projection > 1) projection = 1;
    }
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
    const distanceSquared = dx * dx + dy * dy;
    const maximumDistance = scaleWorld(MAGNET_RADIUS);
    if (distanceSquared < 1 || distanceSquared > maximumDistance * maximumDistance) return;
    const distance = Math.sqrt(distanceSquared);
    const pullSpeed = Math.min(scaleWorld(900), scaleWorld(320) + distance * 0.7);
    const step = Math.min(distance, pullSpeed * dt);
    collectible.x += (dx / distance) * step;
    collectible.y += (dy / distance) * step;
  }

  function updatePickups(dt) {
    if (!pickups.length) return;
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
    if (!powerups.length) return;
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
    if (!particles.length) return;
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
    if (!floatingTexts.length) return;
    const riseDistance = scaleWorld(29) * dt;
    for (let i = floatingTexts.length - 1; i >= 0; i -= 1) {
      const text = floatingTexts[i];
      text.life -= dt;
      text.y -= riseDistance;
      if (text.life <= 0) floatingTexts.splice(i, 1);
    }
  }

  function updateInterface(force = false) {
    const roundedScore = Math.floor(score);
    if (gameState === "running") trackRunRecords(roundedScore, longestStreak);
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
      setBanner("BLOCKBUSTER BLAST READY — PRESS SPACE OR CLICK", 2.2, false);
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
      lastRenderedPickupTenths = -1;
    } else if (gameState === "running" && pickup && pickup.ttl < 3) {
      const pickupTenths = Math.max(0, Math.floor(pickup.ttl * 10 + 0.5));
      message = pickupTenths === lastRenderedPickupTenths && lastRenderedMissionDanger
        ? lastRenderedMissionMessage
        : `POPCORN EXPIRES IN ${(pickupTenths / 10).toFixed(1)} SECONDS`;
      lastRenderedPickupTenths = pickupTenths;
      danger = true;
    } else if (gameState === "running" && superStarsTime <= 0 && player.stationaryTime > 0.48 && enemies.length) {
      message = "KEEP MOVING TO CONTINUE SHOOTING";
      lastRenderedPickupTenths = -1;
    } else {
      lastRenderedPickupTenths = -1;
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

    drawBackground(backgroundAnimationTime);
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

    ctx.fillStyle = COLORS.goldLight;
    const backgroundStars = world.backgroundStars;
    const twinkleTime = time * 1.7;
    const twinkleSine = Math.sin(twinkleTime);
    const twinkleCosine = Math.cos(twinkleTime);
    const backgroundStarBatches = renderCache.backgroundStarBatches;
    if (backgroundStarBatches) {
      for (let index = 0; index < backgroundStarBatches.length; index += 1) {
        const batch = backgroundStarBatches[index];
        const twinkle = twinkleSine * batch.phaseCosine + twinkleCosine * batch.phaseSine;
        ctx.globalAlpha = 0.25 + twinkle * 0.11;
        ctx.fill(batch.path);
      }
    } else {
      for (let index = 0; index < backgroundStars.length; index += 1) {
        const star = backgroundStars[index];
        const twinkle = twinkleSine * star.phaseCosine + twinkleCosine * star.phaseSine;
        ctx.globalAlpha = 0.25 + twinkle * 0.11;
        ctx.fillRect(star.x, star.y, star.size, star.size);
      }
    }
    ctx.globalAlpha = 1;

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
    let pathsForPointCount = renderCache.starPaths.get(points);
    if (!pathsForPointCount) {
      pathsForPointCount = new Map();
      renderCache.starPaths.set(points, pathsForPointCount);
    }
    let path = pathsForPointCount.get(innerRatio);
    if (path) return path;

    path = createStarPath(points, innerRatio);
    pathsForPointCount.set(innerRatio, path);
    return path;
  }

  function createStarPath(points, innerRatio) {
    return createSizedStarPath(points, 1, innerRatio);
  }

  function createSizedStarPath(points, outerRadius, innerRadius) {
    if (typeof Path2D !== "function") return null;
    const path = new Path2D();
    for (let i = 0; i < points * 2; i += 1) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = -Math.PI / 2 + (i * Math.PI) / points;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) path.moveTo(x, y);
      else path.lineTo(x, y);
    }
    path.closePath();
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

  function getRadialFillSprite(key, innerRadius, outerRadius, colorStops) {
    const cached = renderCache.radialFillSprites.get(key);
    if (cached) return cached;

    const logicalSize = Math.ceil(outerRadius * 2 + 2);
    const pixelSize = Math.max(1, Math.ceil(logicalSize * world.dpr));
    const actualLogicalSize = pixelSize / world.dpr;
    const center = actualLogicalSize / 2;
    const raster = createRasterCanvas(pixelSize, pixelSize);
    if (!raster) return null;

    const rasterContext = raster.context;
    rasterContext.setTransform(world.dpr, 0, 0, world.dpr, 0, 0);
    const gradient = rasterContext.createRadialGradient(
      center,
      center,
      innerRadius,
      center,
      center,
      outerRadius,
    );
    for (let index = 0; index < colorStops.length; index += 1) {
      gradient.addColorStop(colorStops[index][0], colorStops[index][1]);
    }
    rasterContext.fillStyle = gradient;
    rasterContext.beginPath();
    rasterContext.arc(center, center, outerRadius, 0, Math.PI * 2);
    rasterContext.fill();

    const sprite = { canvas: raster.canvas, logicalSize: actualLogicalSize };
    renderCache.radialFillSprites.set(key, sprite);
    return sprite;
  }

  function getProjectileSprite(projectile) {
    if (typeof Path2D !== "function" || typeof ctx.drawImage !== "function") return null;

    if (
      projectile.renderSprite
      && projectile.renderSpriteGeneration === renderCache.generation
      && projectile.renderSpriteRadius === projectile.radius
      && projectile.renderSpriteColor === projectile.color
    ) {
      return projectile.renderSprite;
    }

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
    if (cached) {
      projectile.renderSprite = cached;
      projectile.renderSpriteGeneration = renderCache.generation;
      projectile.renderSpriteRadius = projectile.radius;
      projectile.renderSpriteColor = projectile.color;
      return cached;
    }

    const logicalSize = Math.ceil((outerRadius + glow * 2 + 3) * 2);
    const framePixelSize = Math.max(1, Math.ceil(logicalSize * world.dpr));
    const frameLogicalSize = framePixelSize / world.dpr;
    const columns = Math.min(4, frameCount);
    const rows = Math.ceil(frameCount / columns);
    const frameSourceX = new Int32Array(frameCount);
    const frameSourceY = new Int32Array(frameCount);
    const raster = createRasterCanvas(framePixelSize * columns, framePixelSize * rows);
    const path = getStarPath(5, innerRatio);
    if (!raster || !path) return null;

    for (let frame = 0; frame < frameCount; frame += 1) {
      const frameOffsetX = (frame % columns) * framePixelSize;
      const frameOffsetY = Math.floor(frame / columns) * framePixelSize;
      frameSourceX[frame] = frameOffsetX;
      frameSourceY[frame] = frameOffsetY;
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
      frameLogicalHalf: frameLogicalSize / 2,
      frameSourceX,
      frameSourceY,
      rotationPeriod,
      rotationFrameScale: frameCount / rotationPeriod,
    };
    if (renderCache.projectileSprites.size >= 28) renderCache.projectileSprites.clear();
    renderCache.projectileSprites.set(key, sprite);
    projectile.renderSprite = sprite;
    projectile.renderSpriteGeneration = renderCache.generation;
    projectile.renderSpriteRadius = projectile.radius;
    projectile.renderSpriteColor = projectile.color;
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

    const hitState = enemy.hitFlash > 0;
    if (
      enemy.renderSprite
      && enemy.renderSpriteGeneration === renderCache.generation
      && enemy.renderSpriteHp === enemy.hp
      && enemy.renderSpriteHit === hitState
    ) {
      return enemy.renderSprite;
    }

    const fillColor = hitState ? COLORS.goldBright : enemy.color;
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
    if (cached) {
      enemy.renderSprite = cached;
      enemy.renderSpriteGeneration = renderCache.generation;
      enemy.renderSpriteHp = enemy.hp;
      enemy.renderSpriteHit = hitState;
      return cached;
    }

    const halfSize = Math.ceil(enemy.radius + scaleWorld(48));
    const logicalSize = halfSize * 2;
    const framePixelSize = Math.max(1, Math.ceil(logicalSize * world.dpr));
    const frameLogicalSize = framePixelSize / world.dpr;
    const columns = Math.min(4, frameCount);
    const rows = Math.ceil(frameCount / columns);
    const frameSourceX = new Int32Array(frameCount);
    const frameSourceY = new Int32Array(frameCount);
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
      frameSourceX[frame] = frameOffsetX;
      frameSourceY[frame] = frameOffsetY;
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
      frameLogicalHalf: frameLogicalSize / 2,
      frameSourceX,
      frameSourceY,
    };
    if (renderCache.enemySprites.size >= 32) renderCache.enemySprites.clear();
    renderCache.enemySprites.set(key, sprite);
    enemy.renderSprite = sprite;
    enemy.renderSpriteGeneration = renderCache.generation;
    enemy.renderSpriteHp = enemy.hp;
    enemy.renderSpriteHit = hitState;
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
      const auraSprite = getRadialFillSprite(
        blastReady ? "player-aura-ready" : "player-aura-normal",
        scaleWorld(4),
        auraRadius,
        blastReady ? PLAYER_AURA_STOPS.ready : PLAYER_AURA_STOPS.normal,
      );
      if (auraSprite) {
        const auraHalf = auraSprite.logicalSize / 2;
        ctx.drawImage(
          auraSprite.canvas,
          -auraHalf,
          -playerVisualOffset - auraHalf,
          auraSprite.logicalSize,
          auraSprite.logicalSize,
        );
      } else {
        const aura = ctx.createRadialGradient(
          0,
          -playerVisualOffset,
          scaleWorld(4),
          0,
          -playerVisualOffset,
          auraRadius,
        );
        const colorStops = blastReady ? PLAYER_AURA_STOPS.ready : PLAYER_AURA_STOPS.normal;
        for (let index = 0; index < colorStops.length; index += 1) {
          aura.addColorStop(colorStops[index][0], colorStops[index][1]);
        }
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(0, -playerVisualOffset, auraRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = blastReady ? "rgba(255, 211, 96, 0.34)" : "rgba(229, 164, 8, 0.18)";
      ctx.beginPath();
      ctx.arc(0, -playerVisualOffset, auraRadius, 0, Math.PI * 2);
      ctx.fill();
    }

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
    if (!enemies.length) return;
    const cullPadding = scaleWorld(45);
    const bobDistance = scaleWorld(2.4);
    const cacheGeneration = renderCache.generation;
    const worldWidth = world.width;
    const worldHeight = world.height;
    for (let index = 0; index < enemies.length; index += 1) {
      const enemy = enemies[index];
      const margin = enemy.radius + cullPadding;
      if (
        enemy.x < -margin
        || enemy.x > worldWidth + margin
        || enemy.y < -margin
        || enemy.y > worldHeight + margin
      ) continue;
      const drawY = enemy.y + Math.sin(enemy.phase) * bobDistance;
      const hitState = enemy.hitFlash > 0;
      const sprite = enemy.renderSprite
        && enemy.renderSpriteGeneration === cacheGeneration
        && enemy.renderSpriteHp === enemy.hp
        && enemy.renderSpriteHit === hitState
        ? enemy.renderSprite
        : getEnemySprite(enemy);
      if (sprite) {
        const tilt = enemy.mode === "rush" ? 0 : Math.sin(enemy.phase * 0.7) * 0.07;
        const frame = sprite.frameCount === 1
          ? 0
          : ((((tilt + 0.07) / 0.14) * (sprite.frameCount - 1)) + 0.5) | 0;
        ctx.drawImage(
          sprite.canvas,
          sprite.frameSourceX[frame],
          sprite.frameSourceY[frame],
          sprite.framePixelSize,
          sprite.framePixelSize,
          enemy.x - sprite.frameLogicalHalf,
          drawY - sprite.frameLogicalHalf,
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
    if (!projectiles.length) return;
    const cullPadding = scaleWorld(30);
    const cacheGeneration = renderCache.generation;
    const worldWidth = world.width;
    const worldHeight = world.height;
    for (let index = 0; index < projectiles.length; index += 1) {
      const projectile = projectiles[index];
      const margin = projectile.radius + cullPadding;
      if (
        projectile.x < -margin
        || projectile.x > worldWidth + margin
        || projectile.y < -margin
        || projectile.y > worldHeight + margin
      ) continue;
      const sprite = projectile.renderSprite
        && projectile.renderSpriteGeneration === cacheGeneration
        && projectile.renderSpriteRadius === projectile.radius
        && projectile.renderSpriteColor === projectile.color
        ? projectile.renderSprite
        : getProjectileSprite(projectile);
      if (sprite) {
        let frame = (projectile.rotation * sprite.rotationFrameScale + 0.5) | 0;
        if (frame === sprite.frameCount) frame = 0;
        ctx.drawImage(
          sprite.canvas,
          sprite.frameSourceX[frame],
          sprite.frameSourceY[frame],
          sprite.framePixelSize,
          sprite.framePixelSize,
          projectile.x - sprite.frameLogicalHalf,
          projectile.y - sprite.frameLogicalHalf,
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
        const beamRadius = scaleWorld(POPCORN_GLOW_RADIUS);
        const beamSprite = getRadialFillSprite(
          "pickup-beam-normal",
          scaleWorld(5),
          beamRadius,
          PICKUP_BEAM_STOPS.normal,
        );
        if (beamSprite) {
          const beamHalf = beamSprite.logicalSize / 2;
          ctx.drawImage(
            beamSprite.canvas,
            pickup.x - beamHalf,
            pickup.y - beamHalf,
            beamSprite.logicalSize,
            beamSprite.logicalSize,
          );
        } else {
          const colorStops = PICKUP_BEAM_STOPS.normal;
          const beam = ctx.createRadialGradient(
            pickup.x,
            pickup.y,
            scaleWorld(5),
            pickup.x,
            pickup.y,
            beamRadius,
          );
          for (let index = 0; index < colorStops.length; index += 1) {
            beam.addColorStop(colorStops[index][0], colorStops[index][1]);
          }
          ctx.fillStyle = beam;
          ctx.beginPath();
          ctx.arc(pickup.x, pickup.y, beamRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.translate(pickup.x, pickup.y);
      ctx.scale(pulse, pulse);
      ctx.shadowColor = COLORS.goldBright;
      ctx.shadowBlur = scaleWorld(22) * qualitySettings.projectileGlow;
      ctx.fillStyle = "rgba(229, 164, 8, 0.4)";
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
        const beamRadius = scaleWorld(POWERUP_GLOW_RADIUS);
        const beamSprite = getRadialFillSprite(
          `powerup-beam-${powerup.type}`,
          scaleWorld(5),
          beamRadius,
          POWERUP_BEAM_STOPS[powerup.type],
        );
        if (beamSprite) {
          const beamHalf = beamSprite.logicalSize / 2;
          ctx.drawImage(
            beamSprite.canvas,
            powerup.x - beamHalf,
            powerup.y - beamHalf,
            beamSprite.logicalSize,
            beamSprite.logicalSize,
          );
        } else {
          const colorStops = POWERUP_BEAM_STOPS[powerup.type];
          const beam = ctx.createRadialGradient(
            powerup.x,
            powerup.y,
            scaleWorld(5),
            powerup.x,
            powerup.y,
            beamRadius,
          );
          for (let index = 0; index < colorStops.length; index += 1) {
            beam.addColorStop(colorStops[index][0], colorStops[index][1]);
          }
          ctx.fillStyle = beam;
          ctx.beginPath();
          ctx.arc(powerup.x, powerup.y, beamRadius, 0, Math.PI * 2);
          ctx.fill();
        }
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
    let statusCount = 0;
    if (shieldTime > 0 && shieldHits > 0) {
      const status = powerupStatusItems[statusCount];
      const tenths = Math.max(0, Math.floor(shieldTime * 10 + 0.5));
      if (status.tenths !== tenths || status.hits !== shieldHits) {
        status.text = `SHIELD ${shieldHits} · ${(tenths / 10).toFixed(1)}s`;
        status.tenths = tenths;
        status.hits = shieldHits;
      }
      status.type = "shield";
      status.color = COLORS.shield;
      statusCount += 1;
    }
    if (speedTime > 0) {
      const status = powerupStatusItems[statusCount];
      const tenths = Math.max(0, Math.floor(speedTime * 10 + 0.5));
      if (status.type !== "speed" || status.tenths !== tenths) {
        status.text = `SUPER SPEED · ${(tenths / 10).toFixed(1)}s`;
        status.tenths = tenths;
      }
      status.type = "speed";
      status.color = COLORS.speed;
      status.hits = -1;
      statusCount += 1;
    }
    if (superStarsTime > 0) {
      const status = powerupStatusItems[statusCount];
      const tenths = Math.max(0, Math.floor(superStarsTime * 10 + 0.5));
      if (status.type !== "super" || status.tenths !== tenths) {
        status.text = `SUPER STARS · ${(tenths / 10).toFixed(1)}s`;
        status.tenths = tenths;
      }
      status.type = "super";
      status.color = COLORS.super;
      status.hits = -1;
      statusCount += 1;
    }
    if (magnetTime > 0) {
      const status = powerupStatusItems[statusCount];
      const tenths = Math.max(0, Math.floor(magnetTime * 10 + 0.5));
      if (status.type !== "magnet" || status.tenths !== tenths) {
        status.text = `MAGNET · ${(tenths / 10).toFixed(1)}s`;
        status.tenths = tenths;
      }
      status.type = "magnet";
      status.color = COLORS.magnet;
      status.hits = -1;
      statusCount += 1;
    }
    if (!statusCount) return;

    const layout = renderCache.powerupStatusLayout;
    const {
      shortViewport,
      iconSize,
      iconGap,
      horizontalPadding,
      height,
      gap,
      availableWidth,
      font: statusFont,
    } = layout;
    for (let index = 0; index < statusCount; index += 1) {
      const status = powerupStatusItems[index];
      const textWidth = measureCachedText(status.text, statusFont);
      status.textWidth = textWidth;
      status.width = Math.min(
        availableWidth,
        horizontalPadding * 2 + iconSize + iconGap + textWidth,
      );
    }

    let rowCount = 0;
    let rowStart = 0;
    let rowWidth = 0;
    for (let index = 0; index < statusCount; index += 1) {
      const width = powerupStatusItems[index].width;
      const nextWidth = index > rowStart ? rowWidth + gap + width : width;
      if (index > rowStart && nextWidth > availableWidth) {
        const completedRow = powerupStatusRows[rowCount];
        completedRow.start = rowStart;
        completedRow.end = index;
        completedRow.width = rowWidth;
        rowCount += 1;
        rowStart = index;
        rowWidth = width;
      } else {
        rowWidth = nextWidth;
      }
    }
    const finalRow = powerupStatusRows[rowCount];
    finalRow.start = rowStart;
    finalRow.end = statusCount;
    finalRow.width = rowWidth;
    rowCount += 1;

    ctx.save();
    ctx.font = statusFont;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    let y = world.bounds.top + 10;

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      const statusRow = powerupStatusRows[rowIndex];
      let x = world.bounds.right - statusRow.width;
      for (let itemIndex = statusRow.start; itemIndex < statusRow.end; itemIndex += 1) {
        const status = powerupStatusItems[itemIndex];
        const width = status.width;
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
      }
      y += height + gap;
    }
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
    if (!particles.length) return;
    ctx.save();
    const stride = qualitySettings.particleDrawStride;
    const cullPadding = scaleWorld(16);
    const starRadiusPadding = scaleWorld(1.5);
    const worldWidth = world.width;
    const worldHeight = world.height;
    const drawStarParticles = qualityLevel !== "low";
    let lastColor = null;
    for (let index = 0; index < particles.length; index += stride) {
      const particle = particles[index];
      const margin = particle.size + cullPadding;
      if (
        particle.x < -margin
        || particle.x > worldWidth + margin
        || particle.y < -margin
        || particle.y > worldHeight + margin
      ) continue;
      const lifeRatio = particle.life / particle.maxLife;
      const alpha = lifeRatio <= 0 ? 0 : lifeRatio >= 1 ? 1 : lifeRatio;
      ctx.globalAlpha = alpha;
      if (particle.star && drawStarParticles) {
        const outerRadius = particle.size + starRadiusPadding;
        const starPath = particle.renderStarPath || createSizedStarPath(
          5,
          outerRadius,
          particle.size * 0.42,
        );
        particle.renderStarPath = starPath;
        if (starPath) {
          if (particle.color !== lastColor) {
            ctx.fillStyle = particle.color;
            lastColor = particle.color;
          }
          ctx.save();
          ctx.translate(particle.x, particle.y);
          ctx.fill(starPath);
          ctx.restore();
        } else {
          drawStar(
            particle.x,
            particle.y,
            outerRadius,
            particle.size * 0.42,
            5,
            particle.color,
          );
          lastColor = particle.color;
        }
      } else {
        if (particle.color !== lastColor) {
          ctx.fillStyle = particle.color;
          lastColor = particle.color;
        }
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawFloatingTexts() {
    if (!floatingTexts.length) return;
    ctx.save();
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = Math.max(1.5, scaleWorld(4));
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let index = 0; index < floatingTexts.length; index += 1) {
      const text = floatingTexts[index];
      const lifeRatio = text.life / text.maxLife;
      const alpha = lifeRatio <= 0 ? 0 : lifeRatio >= 1 ? 1 : lifeRatio;
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
    pollGamepad(now);

    if (
      gameState === "running"
      || gameState === "resuming"
      || gameState === "ready"
      || gameState === "gameover"
    ) {
      backgroundAnimationTime += dt;
    }

    if (gameState === "running") {
      update(dt);
      draw(now);
    } else if (gameState === "resuming") {
      updateResumeCountdown(now);
      draw(now);
    } else if (gameState === "ready" || gameState === "gameover") {
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
    setControllerInputActive(false);
    if (movementCodes.has(event.code)) {
      keys.add(event.code);
      if (gameState === "running") event.preventDefault();
    }

    if (event.code === "Escape" && !ui.infoOverlay.hidden) {
      event.preventDefault();
      closeInfo();
    } else if (event.code === "Escape" && !ui.leaderboardOverlay.hidden) {
      event.preventDefault();
      closeLeaderboards();
    } else if (event.code === "Space") {
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
      && gameState === "reset-confirm"
      && !ui.resetConfirmOverlay.hidden
    ) {
      event.preventDefault();
      cancelResetConfirmation();
    } else if (
      event.code === "Escape"
      && gameState === "end-confirm"
      && !ui.endConfirmOverlay.hidden
    ) {
      event.preventDefault();
      cancelEndConfirmation();
    } else if (event.code === "Escape" && gameState === "exit-confirm") {
      event.preventDefault();
      cancelExitConfirmation();
    } else if (event.code === "KeyP" || event.code === "Escape") {
      if (
        ui.infoOverlay.hidden
        && (gameState === "running" || gameState === "paused" || gameState === "resuming")
      ) {
        event.preventDefault();
        togglePause();
      }
    } else if (
      event.code === "Enter"
      && ui.infoOverlay.hidden
      && ui.leaderboardOverlay.hidden
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
    gamepadConnectionKnown = true;
    nextGamepadProbeAt = 0;
  });

  window.addEventListener("gamepaddisconnected", (event) => {
    if (event.gamepad.index !== activeGamepadIndex) return;
    activeGamepadIndex = null;
    activeGamepadHasRelevantInput = false;
    gamepadConnectionKnown = false;
    nextGamepadProbeAt = 0;
    resetGamepadInputState();
  });

  window.addEventListener("pointerdown", () => {
    setControllerInputActive(false);
  }, { capture: true, passive: true });

  window.addEventListener("pointermove", (event) => {
    if (coarsePointer || event.pointerType === "touch") return;
    setControllerInputActive(false);
    const movementBounds = world.playerBounds;
    mouseTarget.x = clamp(
      event.clientX - world.canvasLeft,
      movementBounds.left,
      movementBounds.right,
    );
    mouseTarget.y = clamp(
      event.clientY - world.canvasTop,
      movementBounds.top,
      movementBounds.bottom,
    );
    if (gameState === "running" || gameState === "resuming") mouseTarget.active = true;
  }, { passive: true });

  window.addEventListener("blur", () => {
    keys.clear();
    gamepadMove.x = 0;
    gamepadMove.y = 0;
    gamepadMove.active = false;
    gamepadBlastPressed = false;
    gamepadPausePressed = false;
    gamepadConfirmPressed = false;
    gamepadCancelPressed = false;
    gamepadMenuContext = "";
    resetGamepadMenuNavigation(false);
    if (gameState === "running" || gameState === "resuming") togglePause(true);
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) return;
    flushRunRecords();
    if (gameState === "running" || gameState === "resuming") togglePause(true);
  });

  window.addEventListener("pagehide", flushRunRecords);

  ui.startButton.addEventListener("click", startGame);
  ui.startModeButton.addEventListener("click", toggleHardcoreMode);
  ui.startLeaderboardsButton.addEventListener("click", openLeaderboards);
  ui.startInfoButton.addEventListener("click", openInfo);
  ui.infoButton.addEventListener("click", openInfo);
  ui.infoCloseButton.addEventListener("click", closeInfo);
  ui.startMainSiteButton.addEventListener("click", goToMainSite);
  ui.restartButton.addEventListener("click", startGame);
  ui.statsButton.addEventListener("click", openGameStats);
  ui.shareRunButton.addEventListener("click", shareRun);
  ui.gameoverLeaderboardsButton.addEventListener("click", openLeaderboards);
  ui.gameoverMainSiteButton.addEventListener("click", goToMainSite);
  ui.statsCloseButton.addEventListener("click", closeGameStats);
  ui.leaderboardCloseButton.addEventListener("click", closeLeaderboards);
  ui.gameoverModeButton.addEventListener("click", toggleHardcoreMode);
  ui.resumeButton.addEventListener("click", () => togglePause());
  ui.pauseMainSiteButton.addEventListener("click", openExitConfirmation);
  ui.resetButton.addEventListener("click", openResetConfirmation);
  ui.resetCancelButton.addEventListener("click", cancelResetConfirmation);
  ui.resetConfirmButton.addEventListener("click", confirmResetGame);
  ui.endButton.addEventListener("click", openEndConfirmation);
  ui.endCancelButton.addEventListener("click", cancelEndConfirmation);
  ui.endConfirmButton.addEventListener("click", confirmEndGame);
  ui.exitButton.addEventListener("click", openExitConfirmation);
  ui.exitCancelButton.addEventListener("click", cancelExitConfirmation);
  ui.exitConfirmButton.addEventListener("click", confirmExitGame);
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
  canvas.addEventListener("pointerdown", (event) => {
    canvas.focus({ preventScroll: true });
    if (event.button === 0 && event.pointerType !== "touch") activateBlast();
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

  for (const button of new Set([
    ui.startButton,
    ui.startModeButton,
    ui.startLeaderboardsButton,
    ui.startInfoButton,
    ui.startMainSiteButton,
    ui.infoCloseButton,
    ui.resumeButton,
    ui.pauseMainSiteButton,
    ui.resetButton,
    ui.resetCancelButton,
    ui.resetConfirmButton,
    ui.endButton,
    ui.endCancelButton,
    ui.endConfirmButton,
    ui.exitCancelButton,
    ui.exitConfirmButton,
    ui.restartButton,
    ui.statsButton,
    ui.shareRunButton,
    ui.gameoverLeaderboardsButton,
    ui.gameoverMainSiteButton,
    ui.gameoverModeButton,
    ui.statsCloseButton,
    ui.leaderboardCloseButton,
    ...document.querySelectorAll(".leaderboard-card button, .leaderboard-mode-tab, .leaderboard-name-form button"),
  ])) {
    button.addEventListener("pointerenter", () => {
      if (visibleMenuButtons().includes(button)) setControllerSelection(button);
    });
  }

  const resizeObserver = new ResizeObserver(resizeCanvas);
  resizeObserver.observe(canvas);
  window.addEventListener("resize", resizeCanvas, { passive: true });
  window.addEventListener("scroll", () => {
    const rect = canvas.getBoundingClientRect();
    world.canvasLeft = rect.left;
    world.canvasTop = rect.top;
  }, { passive: true });

  ui.soundButton.textContent = soundOn ? "SOUND ON" : "SOUND OFF";
  ui.soundButton.setAttribute("aria-pressed", soundOn ? "true" : "false");
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
      fitAllStatDisplays();
    });
  }
  window.requestAnimationFrame(frame);
})();
