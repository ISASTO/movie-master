(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const canvas = $("game-canvas");
  const ctx = canvas?.getContext("2d", { alpha: false });

  if (!canvas || !ctx) return;

  const ui = {
    score: $("score-value"),
    best: $("best-value"),
    lives: $("lives-value"),
    streak: $("streak-value"),
    masteryPercent: $("mastery-percent"),
    masteryTrack: $("mastery-track"),
    masteryFill: $("mastery-fill"),
    missionBanner: $("mission-banner"),
    startOverlay: $("start-overlay"),
    pauseOverlay: $("pause-overlay"),
    gameoverOverlay: $("gameover-overlay"),
    startButton: $("start-button"),
    resumeButton: $("resume-button"),
    restartButton: $("restart-button"),
    movementButton: $("movement-button"),
    pauseButton: $("pause-button"),
    soundButton: $("sound-button"),
    judgmentButton: $("judgment-button"),
    joystick: $("joystick"),
    joystickKnob: $("joystick-knob"),
    startBest: $("start-best"),
    finalScore: $("final-score"),
    gameoverTitle: $("gameover-title"),
    comboCallout: $("combo-callout"),
    statusAnnouncement: $("status-announcement"),
    screenFlash: $("screen-flash"),
    startMoveCopy: $("start-move-copy"),
    desktopInstructions: $("desktop-instructions"),
    mobileInstructions: $("mobile-instructions"),
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
  const MAX_LIVES = 5;
  const POWERUP_DURATION = 15;
  const SHIELD_HITS = 3;
  const MAGNET_RADIUS = 600;
  const CLOSE_THREAT_RADIUS = 150;
  const POPCORN_LIFETIME_MULTIPLIER = 1.25;
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
  const mouseTarget = { x: 0, y: 0, active: false };
  const enemies = [];
  const projectiles = [];
  const pickups = [];
  const powerups = [];
  const particles = [];
  const floatingTexts = [];

  let gameState = "ready";
  let lastFrame = performance.now();
  let elapsed = 0;
  let score = 0;
  let bestScore = readNumber(SCORE_KEY, readNumber(LEGACY_SCORE_KEY, 0));
  let difficultyLevel = 1;
  let mastery = 0;
  let spawnTimer = 0;
  let shotTimer = 0;
  let popcornSpawnTimer = 0;
  let powerupSpawnTimer = 0;
  let popcornCollected = 0;
  let popcornChain = 0;
  let recommendationPower = 0;
  let movementPower = 0;
  let starRowSize = 1;
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
  let lastRenderedStreak = -1;
  let lastRenderedMastery = -1;
  let audioContext = null;
  let soundOn = readString(SOUND_KEY, "on") !== "off";
  let movementMode = coarsePointer ? "touch" : readString(MOVEMENT_KEY, "mouse");

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

  function formatScore(value) {
    return Math.floor(Math.max(0, value)).toString().padStart(6, "0");
  }

  function distanceSquared(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
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

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const hadWorld = world.width > 0 && world.height > 0;
    const oldBounds = { ...world.bounds };
    const oldGameScale = world.gameScale || 1;

    world.width = Math.max(1, rect.width);
    world.height = Math.max(1, rect.height);
    world.dpr = Math.min(window.devicePixelRatio || 1, 2);
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

    const movementBounds = getPlayerMovementBounds();
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
      { length: Math.round(clamp(world.width / 28, 18, 58)) },
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
      blast.maxRadius = Math.hypot(world.width, world.height) * 1.06;
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
    recommendationPower = 0;
    movementPower = 0;
    starRowSize = 1;
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
    lastRenderedStreak = -1;
    lastRenderedMastery = -1;

    enemies.length = 0;
    projectiles.length = 0;
    pickups.length = 0;
    powerups.length = 0;
    particles.length = 0;
    floatingTexts.length = 0;

    const { left, right, top, bottom } = world.bounds;
    player.x = (left + right) / 2;
    player.y = (top + bottom) / 2;
    player.vx = 0;
    player.vy = 0;
    player.lives = MAX_LIVES;
    player.invulnerable = 0;
    player.bob = 0;
    player.moving = false;
    player.stationaryTime = 0;
    mouseTarget.active = false;

    resetJoystick();
    updateInterface(true);
  }

  function startGame() {
    ensureAudio();
    resetGame();
    gameState = "running";
    ui.startOverlay.hidden = true;
    ui.pauseOverlay.hidden = true;
    ui.gameoverOverlay.hidden = true;
    ui.pauseButton.disabled = false;
    ui.pauseButton.textContent = "PAUSE";
    lastFrame = performance.now();
    canvas.focus({ preventScroll: true });
    setBanner("KEEP MOVING. COLLECT THE POPCORN.", 2.8, false);
    announce("The Movie Master is ready. Keep moving and collect the popcorn.");
    playCue("start");
  }

  function endGame() {
    if (gameState === "gameover") return;

    gameState = "gameover";
    const final = Math.floor(score);
    const isRecord = final > bestScore;

    if (isRecord) {
      bestScore = final;
      saveValue(SCORE_KEY, bestScore);
    }

    ui.finalScore.textContent = formatScore(final);
    ui.gameoverTitle.textContent = isRecord
      ? "NEW BEST SCORE"
      : "OVERWHELMED BY GARBAGE 🗑️";
    ui.gameoverOverlay.hidden = false;
    ui.pauseButton.disabled = true;
    resetJoystick();
    updateInterface(true);
    announce(isRecord ? "New best score." : "Game over.");
    playCue("gameover");
  }

  function togglePause(forcePause = false) {
    if (gameState === "running") {
      gameState = "paused";
      ui.pauseOverlay.hidden = false;
      ui.pauseButton.textContent = "RESUME";
      resetJoystick();
      announce("Intermission.");
      return;
    }

    if (gameState === "paused" && !forcePause) {
      gameState = "running";
      ui.pauseOverlay.hidden = true;
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

  function isPopcornBlockedByTouchControls(x, y, radius) {
    return getTouchControlExclusionZones(radius).some((zone) => (
      x >= zone.left &&
      x <= zone.right &&
      y >= zone.top &&
      y <= zone.bottom
    ));
  }

  function choosePopcornPosition(radius) {
    const { left, right, top, bottom } = world.bounds;
    const width = right - left;
    const height = bottom - top;
    const requiredDistance = Math.min(Math.hypot(width, height) * 0.33, scaleWorld(280));
    const spawnInset = scaleWorld(42);
    const minX = left + spawnInset;
    const maxX = right - spawnInset;
    const minY = top + spawnInset;
    const maxY = bottom - spawnInset;
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

  function launchRecommendation(aimX, aimY, color = COLORS.goldBright) {
    const startX = player.x;
    const startY = player.y - player.drawHeight * 0.08;
    const dx = aimX - startX;
    const dy = aimY - startY;
    const length = Math.hypot(dx, dy);
    if (length < 1) return false;

    const directionX = dx / length;
    const directionY = dy / length;
    const perpendicularX = -directionY;
    const perpendicularY = directionX;
    const speed = currentProjectileSpeed();
    const projectileRadius = currentProjectileRadius();
    const rowSpacing = projectileRadius * 1.8;
    const rowCenter = (starRowSize - 1) / 2;

    for (let index = 0; index < starRowSize; index += 1) {
      const rowOffset = (index - rowCenter) * rowSpacing;
      projectiles.push({
        x: startX + perpendicularX * rowOffset,
        y: startY + perpendicularY * rowOffset,
        vx: directionX * speed,
        vy: directionY * speed,
        radius: projectileRadius,
        color,
        rotation: Math.random() * Math.PI,
      });
    }
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
    const startY = player.y - player.drawHeight * 0.08;
    const radius = Math.max(world.width, world.height) + scaleWorld(200);
    for (let i = 0; i < 10; i += 1) {
      const angle = superVolleyAngle + (i / 10) * Math.PI * 2;
      launchRecommendation(
        player.x + Math.cos(angle) * radius,
        startY + Math.sin(angle) * radius,
        COLORS.super,
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
    let nearest = maxRangeSquared;

    for (const enemy of enemies) {
      const candidateDistance = distanceSquared(player, enemy);
      if (candidateDistance < nearest) {
        nearest = candidateDistance;
        target = enemy;
      }
    }

    if (!target) return false;

    const closeThreatDistance = scaleWorld(CLOSE_THREAT_RADIUS);
    const closeThreat = nearest <= closeThreatDistance * closeThreatDistance;
    if (!player.moving && !closeThreat) return false;

    const lead = closeThreat ? 0 : target.mode === "rush" ? 0.11 : target.kind === "fast" ? 0.18 : 0.08;
    const aimX = target.x + (target.vx || 0) * lead;
    const aimY = target.y + (target.vy || 0) * lead;
    return launchRecommendation(aimX, aimY);
  }

  function addParticles(x, y, color, count = 10, speed = 120) {
    const actualCount = reducedMotion ? Math.ceil(count * 0.35) : count;
    for (let i = 0; i < actualCount; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = randomBetween(speed * 0.35, speed) * world.gameScale;
      const maxLife = randomBetween(0.34, 0.78);
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life: maxLife,
        maxLife,
        size: randomBetween(2, 6) * world.gameScale,
        color,
        star: Math.random() < 0.24,
      });
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
    const activeCombo = comboTimer > 0;
    killCombo = activeCombo ? killCombo + 1 : 1;
    comboTimer = 1.65;
    const comboMultiplier = 1 + Math.min(1.5, Math.floor(killCombo / 6) * 0.5);
    const points = Math.round(enemy.scoreValue * comboMultiplier * (fromBlast ? 0.64 : 1));
    score += points;
    mastery = clamp(mastery + (fromBlast ? 0.006 : 0.018), 0, 1);

    addParticles(enemy.x, enemy.y, COLORS.goldBright, enemy.kind === "heavy" ? 20 : 11, 165);
    addParticles(enemy.x, enemy.y, enemy.color, 7, 105);
    addFloatingText(enemy.x, enemy.y - enemy.radius, `+${points}`, COLORS.goldLight);

    if (!fromBlast && killCombo >= 6 && killCombo % 6 === 0) {
      showCombo(`${comboMultiplier.toFixed(1)}× SMASH HIT STREAK`);
    }

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

    const message = rowUpgraded
      ? `${popcornChain} POPCORNS IN A ROW — ${starRowSize}-STAR ROWS UNLOCKED`
      : movementUpgraded
        ? `${popcornChain} POPCORNS IN A ROW — STARS + MOVEMENT FASTER`
        : `${popcornChain} POPCORNS IN A ROW — FASTER, LARGER STARS`;
    showCombo(
      rowUpgraded
        ? `${starRowSize}-STAR ROWS UNLOCKED`
        : movementUpgraded
          ? "STARS + MOVEMENT UPGRADED"
          : "RECOMMENDATION STARS UPGRADED",
    );
    setBanner(message, 2.4, false);
    addFloatingText(
      pickup.x,
      pickup.y - scaleWorld(38),
      rowUpgraded ? `★ × ${starRowSize}` : movementUpgraded ? "★ + SPEED ★" : "★ UPGRADE ★",
      COLORS.goldBright,
      true,
    );
    announce(
      rowUpgraded
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
    popcornSpawnTimer = 0.65;

    const points = 300 + Math.min(500, Math.max(0, popcornChain - 1) * 75);
    score += points;
    mastery = clamp(mastery + 0.22, 0, 1);

    const restored = popcornCollected % 6 === 0 && player.lives < MAX_LIVES;
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
        enemies.splice(enemyIndex, 1);
        addParticles(overlappingEnemy.x, overlappingEnemy.y, overlappingEnemy.color, 5, 90);
      }
      return;
    }

    const enemy = enemies[enemyIndex];
    enemies.splice(enemyIndex, 1);

    if (shieldTime > 0 && shieldHits > 0) {
      shieldHits -= 1;
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
      updateInterface(true);
      return;
    }

    player.lives -= 1;
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

    if (enemy) {
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const length = Math.hypot(dx, dy) || 1;
      const movementBounds = getPlayerMovementBounds();
      const knockback = scaleWorld(34);
      player.x = clamp(player.x + (dx / length) * knockback, movementBounds.left, movementBounds.right);
      player.y = clamp(player.y + (dy / length) * knockback, movementBounds.top, movementBounds.bottom);
    }

    updateInterface(true);
    if (player.lives <= 0) endGame();
  }

  function activateBlast() {
    if (gameState !== "running" || mastery < 0.999 || blast) return;

    mastery = 0;
    blastReadyAnnounced = false;
    blast = {
      x: player.x,
      y: player.y,
      radius: 0,
      maxRadius: Math.hypot(world.width, world.height) * 1.06,
      life: 0,
      duration: 0.72,
    };

    for (const enemy of enemies) enemy.blastMarked = false;
    shakeTime = reducedMotion ? 0.08 : 0.56;
    shakePower = reducedMotion ? 2 : 9;
    triggerFlash();
    showCombo("BLOCKBUSTER BLAST");
    setBanner("BLOCKBUSTER BLAST", 1.15, false);
    announce("Blockbuster Blast activated.");
    playCue("blast");
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
    const touchMagnitude = Math.hypot(touchMove.x, touchMove.y);

    if (touchMagnitude > 0.08) {
      dx = touchMove.x;
      dy = touchMove.y;
    } else if (movementMode === "mouse" && mouseTarget.active) {
      const targetDx = mouseTarget.x - player.x;
      const targetDy = mouseTarget.y - player.y;
      const targetDistance = Math.hypot(targetDx, targetDy);
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

    const length = Math.hypot(dx, dy);
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
    const movementBounds = getPlayerMovementBounds();
    const nextX = clamp(player.x + requestedVx * dt, movementBounds.left, movementBounds.right);
    const nextY = clamp(player.y + requestedVy * dt, movementBounds.top, movementBounds.bottom);
    const actualDx = nextX - previousX;
    const actualDy = nextY - previousY;

    player.moving = Math.hypot(actualDx, actualDy) > 0.1;
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
          enemies.splice(i, 1);
          continue;
        }
      } else {
        const directDx = player.x - enemy.x;
        const directDy = player.y - enemy.y;
        const closeThreatDistance = scaleWorld(CLOSE_THREAT_RADIUS);
        const isCloseThreat = directDx * directDx + directDy * directDy <= closeThreatDistance * closeThreatDistance;
        const prediction = isCloseThreat
          ? 0
          : enemy.kind === "fast"
            ? 0.23
            : enemy.kind === "heavy"
              ? 0.04
              : 0.11;
        const targetX = player.x + player.vx * prediction;
        const targetY = player.y + player.vy * prediction;
        const dx = targetX - enemy.x;
        const dy = targetY - enemy.y;
        const length = Math.hypot(dx, dy) || 1;
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

  function updateProjectiles(dt) {
    const offscreenMargin = scaleWorld(30);
    for (let i = projectiles.length - 1; i >= 0; i -= 1) {
      const projectile = projectiles[i];
      const previousX = projectile.x;
      const previousY = projectile.y;
      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;
      projectile.rotation += dt * 10;

      if (
        projectile.x < -offscreenMargin ||
        projectile.x > world.width + offscreenMargin ||
        projectile.y < -offscreenMargin ||
        projectile.y > world.height + offscreenMargin
      ) {
        projectiles.splice(i, 1);
        continue;
      }

      for (let j = enemies.length - 1; j >= 0; j -= 1) {
        const enemy = enemies[j];
        const hitDistance = projectile.radius + enemy.radius;
        if (
          segmentIntersectsCircle(
            previousX,
            previousY,
            projectile.x,
            projectile.y,
            enemy.x,
            enemy.y,
            hitDistance,
          )
        ) {
          projectiles.splice(i, 1);
          enemy.hp -= 1;
          enemy.hitFlash = 0.12;
          addParticles(projectile.x, projectile.y, projectile.color, 6, 90);

          if (enemy.hp <= 0) {
            enemies.splice(j, 1);
            registerDestroy(enemy);
          }
          break;
        }
      }
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
    const distance = Math.hypot(dx, dy);
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
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const particle = particles[i];
      particle.life -= dt;
      if (particle.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= Math.pow(0.08, dt);
      particle.vy = particle.vy * Math.pow(0.12, dt) + scaleWorld(45) * dt;
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
    const masteryPercent = Math.round(mastery * 100);

    if (force || roundedScore !== lastRenderedScore) {
      ui.score.textContent = formatScore(roundedScore);
      lastRenderedScore = roundedScore;
    }

    if (force || liveBest !== lastRenderedBest) {
      ui.best.textContent = formatScore(liveBest);
      ui.startBest.textContent = formatScore(bestScore);
      lastRenderedBest = liveBest;
    }

    const maxLives = MAX_LIVES;
    ui.lives.textContent = "★".repeat(Math.max(0, player.lives)) + "☆".repeat(maxLives - Math.max(0, player.lives));
    ui.lives.setAttribute("aria-label", `${player.lives} of ${maxLives} lives remaining`);
    ui.lives.classList.toggle("danger", player.lives === 1);

    if (force || popcornChain !== lastRenderedStreak) {
      ui.streak.textContent = String(popcornChain);
      ui.streak.setAttribute("aria-label", `Current popcorn streak: ${popcornChain}`);
      lastRenderedStreak = popcornChain;
    }

    const pickup = pickups[0];

    if (force || masteryPercent !== lastRenderedMastery) {
      ui.masteryPercent.textContent = `${masteryPercent}%`;
      ui.masteryFill.style.width = `${masteryPercent}%`;
      ui.masteryTrack.setAttribute("aria-valuenow", String(masteryPercent));
      lastRenderedMastery = masteryPercent;
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
    ui.masteryTrack.classList.toggle("is-ready", blastReady);
    ui.judgmentButton.disabled = !blastReady;
    ui.judgmentButton.classList.toggle("ready", blastReady);

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

    ui.missionBanner.textContent = message;
    ui.missionBanner.classList.toggle("visible", Boolean(message));
    ui.missionBanner.classList.toggle("danger", danger);
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
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, world.width, world.height);

    ctx.save();
    ctx.translate(world.width / 2, world.height * 0.56);
    ctx.rotate(reducedMotion ? 0 : time * 0.016);
    const radius = Math.hypot(world.width, world.height);
    const rays = 32;
    for (let i = 0; i < rays; i += 2) {
      const start = (i / rays) * Math.PI * 2;
      const end = ((i + 1) / rays) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, start, end);
      ctx.closePath();
      ctx.fillStyle = "rgba(229, 164, 8, 0.062)";
      ctx.fill();
    }
    ctx.restore();

    for (const star of world.backgroundStars) {
      const alpha = 0.14 + (Math.sin(time * 1.7 + star.phase) + 1) * 0.11;
      ctx.fillStyle = `rgba(255, 231, 162, ${alpha})`;
      ctx.fillRect(star.x, star.y, star.size, star.size);
    }

    ctx.strokeStyle = "rgba(229, 164, 8, 0.13)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let y = world.bounds.top + 28; y < world.bounds.bottom; y += 64) {
      ctx.moveTo(world.bounds.left, y);
      ctx.lineTo(world.bounds.right, y);
    }
    ctx.stroke();

    const holeWidth = 21;
    ctx.fillStyle = "rgba(4, 2, 1, 0.38)";
    for (let x = 12; x < world.width; x += 38) {
      ctx.fillRect(x, world.bounds.top + 3, holeWidth, 6);
      ctx.fillRect(x, world.bounds.bottom - 9, holeWidth, 6);
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
    ctx.shadowBlur = scaleWorld(16);
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

  function drawCenteredEmoji(emoji, x, y, fontSize) {
    ctx.save();
    ctx.font = `${fontSize}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";

    const metrics = ctx.measureText(emoji);
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

    ctx.fillText(
      emoji,
      x - (right - left) / 2,
      y + (ascent - descent) / 2,
    );
    ctx.restore();
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
      const motion = Math.hypot(player.vx, player.vy) || 1;
      const trailX = -player.vx / motion;
      const trailY = -player.vy / motion;
      const sideX = -trailY;
      const sideY = trailX;
      ctx.save();
      ctx.strokeStyle = COLORS.speed;
      ctx.shadowColor = COLORS.speed;
      ctx.shadowBlur = scaleWorld(14);
      ctx.lineCap = "round";
      for (let i = -2; i <= 2; i += 1) {
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
    ctx.beginPath();
    ctx.arc(0, -playerVisualOffset, auraRadius, 0, Math.PI * 2);
    ctx.fill();

    if (blastReady) {
      ctx.save();
      ctx.globalAlpha = 0.62 + (Math.sin(time * 9) + 1) * 0.16;
      ctx.strokeStyle = COLORS.goldBright;
      ctx.lineWidth = scaleWorld(4);
      ctx.shadowColor = COLORS.goldBright;
      ctx.shadowBlur = scaleWorld(24);
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
      ctx.shadowBlur = scaleWorld(22);
      ctx.beginPath();
      ctx.arc(0, -playerVisualOffset, shieldRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.12 * shieldFade;
      ctx.fillStyle = COLORS.shield;
      ctx.fill();
      ctx.globalAlpha = shieldFade;
      ctx.shadowBlur = scaleWorld(10);
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
      ctx.save();
      ctx.globalAlpha = 0.5 + (Math.sin(time * 9) + 1) * 0.14;
      ctx.shadowColor = COLORS.super;
      ctx.shadowBlur = scaleWorld(12);
      for (let i = 0; i < 10; i += 1) {
        const angle = time * 1.8 + (i / 10) * Math.PI * 2;
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
      ctx.shadowBlur = scaleWorld(18);
      drawCenteredEmoji("🧲", badgeX, badgeY, Math.max(10, scaleWorld(25)));
      ctx.restore();
    }

    ctx.restore();

    if (gameState === "running" && superStarsTime <= 0 && player.stationaryTime > 0.5 && enemies.length) {
      const alpha = 0.72 + (Math.sin(time * 7) + 1) * 0.12;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `800 ${clamp(world.width * 0.012, 10, 14)}px "Futura Web", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const text = "KEEP MOVING";
      const width = ctx.measureText(text).width + scaleWorld(20);
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
      ctx.save();
      ctx.translate(enemy.x, enemy.y + Math.sin(enemy.phase) * scaleWorld(2.4));
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
      ctx.save();
      ctx.translate(projectile.x, projectile.y);
      ctx.rotate(projectile.rotation);
      ctx.shadowColor = projectile.color;
      ctx.shadowBlur = scaleWorld(12);
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

      ctx.translate(pickup.x, pickup.y);
      ctx.scale(pulse, pulse);
      ctx.shadowColor = danger ? "#ff5a3b" : COLORS.goldBright;
      ctx.shadowBlur = scaleWorld(22);
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

      ctx.translate(powerup.x, powerup.y);
      ctx.scale(pulse, pulse);
      ctx.shadowColor = definition.color;
      ctx.shadowBlur = scaleWorld(24);
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

      ctx.font = `800 ${Math.max(7, scaleWorld(10))}px "Futura Web", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const labelWidth = ctx.measureText(definition.label).width + scaleWorld(16);
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

  function drawPowerupStatus() {
    const statuses = [];
    if (shieldTime > 0 && shieldHits > 0) {
      statuses.push({ text: `🛡️ SHIELD ${shieldHits} · ${shieldTime.toFixed(1)}s`, color: COLORS.shield });
    }
    if (speedTime > 0) {
      statuses.push({ text: `⚡ SUPER SPEED · ${speedTime.toFixed(1)}s`, color: COLORS.speed });
    }
    if (superStarsTime > 0) {
      statuses.push({ text: `★ SUPER STARS · ${superStarsTime.toFixed(1)}s`, color: COLORS.super });
    }
    if (magnetTime > 0) {
      statuses.push({ text: `🧲 MAGNET · ${magnetTime.toFixed(1)}s`, color: COLORS.magnet });
    }
    if (!statuses.length) return;

    const shortViewport = world.height <= 500;
    const fontSize = clamp(world.width * 0.012, shortViewport ? 9 : 10, shortViewport ? 11 : 13);
    const height = fontSize + (shortViewport ? 10 : 15);
    const gap = shortViewport ? 4 : 6;
    const availableWidth = Math.max(100, world.bounds.right - world.bounds.left);
    const widths = statuses.map((status) => {
      ctx.font = `800 ${fontSize}px "Futura Web", sans-serif`;
      return Math.min(availableWidth, ctx.measureText(status.text).width + (shortViewport ? 14 : 20));
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
    ctx.font = `800 ${fontSize}px "Futura Web", sans-serif`;
    ctx.textAlign = "center";
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
        ctx.fillStyle = status.color;
        ctx.fillText(status.text, x + width / 2, y + height / 2 + 1);
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
    ctx.shadowBlur = scaleWorld(28);
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
    for (const particle of particles) {
      const alpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      if (particle.star) {
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
      ctx.restore();
    }
  }

  function drawFloatingTexts() {
    for (const text of floatingTexts) {
      const alpha = clamp(text.life / text.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = text.color;
      ctx.strokeStyle = COLORS.ink;
      ctx.lineWidth = Math.max(1.5, scaleWorld(4));
      ctx.font = `800 ${text.size}px "Futura Web", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.strokeText(text.text, text.x, text.y);
      ctx.fillText(text.text, text.x, text.y);
      ctx.restore();
    }
  }

  function drawStar(x, y, outerRadius, innerRadius, points, color) {
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
    const length = Math.hypot(dx, dy);
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

    if (gameState === "running") update(dt);
    else player.bob += dt * 2;

    draw(now);
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
    } else if (event.code === "KeyP" || event.code === "Escape") {
      if (gameState === "running" || gameState === "paused") {
        event.preventDefault();
        togglePause();
      }
    } else if (event.code === "Enter" && (gameState === "ready" || gameState === "gameover")) {
      event.preventDefault();
      startGame();
    }
  });

  window.addEventListener("keyup", (event) => {
    keys.delete(event.code);
  });

  window.addEventListener("pointermove", (event) => {
    if (coarsePointer || event.pointerType === "touch") return;
    const rect = canvas.getBoundingClientRect();
    const movementBounds = getPlayerMovementBounds();
    mouseTarget.x = clamp(event.clientX - rect.left, movementBounds.left, movementBounds.right);
    mouseTarget.y = clamp(event.clientY - rect.top, movementBounds.top, movementBounds.bottom);
    if (gameState === "running") mouseTarget.active = true;
  }, { passive: true });

  window.addEventListener("blur", () => {
    keys.clear();
    if (gameState === "running") togglePause(true);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && gameState === "running") togglePause(true);
  });

  ui.startButton.addEventListener("click", startGame);
  ui.restartButton.addEventListener("click", startGame);
  ui.resumeButton.addEventListener("click", () => togglePause());
  ui.movementButton.addEventListener("click", toggleMovementMode);
  ui.pauseButton.addEventListener("click", () => togglePause());
  ui.soundButton.addEventListener("click", toggleSound);
  ui.judgmentButton.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    activateBlast();
  });
  ui.judgmentButton.addEventListener("click", activateBlast);
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
  resizeCanvas();
  updateMovementModeUi();
  updateInterface(true);
  window.requestAnimationFrame(frame);
})();
