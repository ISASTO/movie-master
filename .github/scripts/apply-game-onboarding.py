from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}")
    return text.replace(old, new, 1)


index_path = Path("game/index.html")
js_path = Path("game/game.js")
css_path = Path("game/game.css")

index = index_path.read_text(encoding="utf-8")
js = js_path.read_text(encoding="utf-8")
css = css_path.read_text(encoding="utf-8")

# Cache-bust the two files changed by this patch.
index = replace_once(
    index,
    '<link rel="stylesheet" href="./game.css?v=20260902-public-leaderboards">',
    '<link rel="stylesheet" href="./game.css?v=20260904-onboarding-1">',
    "game.css cache bust",
)
index = replace_once(
    index,
    '<script src="./game.js?v=20260902-public-leaderboards" defer></script>',
    '<script src="./game.js?v=20260904-onboarding-1" defer></script>',
    "game.js cache bust",
)

# Add INFO to the persistent game controls.
index = replace_once(
    index,
    '          <button class="quality-button" id="quality-button" type="button">QUALITY: HIGH</button>\n          <button id="pause-button" type="button" disabled>PAUSE</button>',
    '          <button class="quality-button" id="quality-button" type="button">QUALITY: HIGH</button>\n          <button class="info-button" id="info-button" type="button">INFO</button>\n          <button id="pause-button" type="button" disabled>PAUSE</button>',
    "top info button",
)

# Replace the opening wall of text with a single quick rule line.
old_rules = '''            <p class="poster-deck">Help! The Movie Master is being attacked by garbage🗑!</p>
            <div class="rules">
              <p><b>KEEP MOVING.</b> The Movie Master shoots his recommendation stars automatically while he is in motion.</p>
              <p><b>COLLECT THE POPCORN.</b> Every 10 in a row makes his recommendation stars faster and larger. Every 20 also makes the Movie Master move faster. At streaks of 100, 200, 300, and 400, every shot gains another star. At 500, a second Blockbuster Blast bar unlocks. In Normal Mode, miss one and more garbage arrives. In Hardcore Mode, miss one and the game ends.</p>
              <p><b>COLLECT POWER-UPS.</b> Grab Shields, Super Speed, Super Stars, and the Magnet when they appear.</p>
              <p><b>DO NOT TOUCH GARBAGE.</b> Each hit costs a star. Reach zero stars and you lose. In Hardcore Mode, one unshielded hit ends the game.</p>
              <p><b>BLOCKBUSTER BLAST.</b> Collect popcorn to charge it. At 100%, press Space, click anywhere in the playable area, or use the gold button to clear the screen.</p>
            </div>'''
new_rules = '''            <p class="poster-deck start-quick-copy">COLLECT POPCORN FOR UPGRADES · KEEP MOVING TO SHOOT · AVOID GARBAGE 🗑️</p>'''
index = replace_once(index, old_rules, new_rules, "concise opening rules")

# Add INFO beside the other start-screen actions.
index = replace_once(
    index,
    '''              <button class="secondary-button leaderboard-open-button" id="start-leaderboards-button" type="button">
                LEADERBOARDS
              </button>
            </div>''',
    '''              <button class="secondary-button leaderboard-open-button" id="start-leaderboards-button" type="button">
                LEADERBOARDS
              </button>
              <button class="secondary-button" id="start-info-button" type="button">
                INFO
              </button>
            </div>''',
    "start info button",
)

# Preserve the full instructions in an opt-in overlay.
info_markup = '''      <div class="game-overlay info-overlay" id="info-overlay" hidden>
        <section class="info-panel" aria-labelledby="info-title">
          <p class="poster-kicker">FULL INSTRUCTIONS</p>
          <h2 id="info-title">HOW TO PLAY</h2>
          <p class="info-summary">Collect popcorn. Keep moving. Avoid garbage. Everything else is below.</p>

          <div class="info-rules">
            <p><b>KEEP MOVING.</b> The Movie Master shoots his recommendation stars automatically while he is in motion. He will still defend himself against very close garbage while standing still.</p>
            <p><b>COLLECT THE POPCORN.</b> Every 10 in a row upgrades the recommendation stars. Every 20 also upgrades movement speed. At streaks of 100, 200, 300, and 400, every shot gains another star. At 500, a second Blockbuster Blast bar unlocks. In Normal Mode, missing popcorn summons more garbage. In Hardcore Mode, one miss ends the game.</p>
            <p><b>COLLECT POWER-UPS.</b> Shields block up to three hits, Super Speed makes the Movie Master much faster, Super Stars fire in every direction, and the Magnet pulls nearby popcorn and power-ups toward you.</p>
            <p><b>AVOID GARBAGE.</b> Each unshielded hit costs a rating star. Reach zero and the run ends. In Hardcore Mode, one unshielded hit ends the game.</p>
            <p><b>USE BLOCKBUSTER BLAST.</b> Popcorn and destroyed garbage charge the meter. At 100%, press Space, click the playable area, use a gamepad blast button, or press the gold button to clear the screen.</p>
          </div>

          <div class="info-controls" aria-label="Full controls">
            <div><b>MOVE</b><span>Mouse · WASD / arrows · touch joystick · gamepad</span></div>
            <div><b>SHOOT</b><span>Automatic while moving</span></div>
            <div><b>BLAST</b><span>Space · click · gold button · gamepad</span></div>
            <div><b>PAUSE</b><span>P · Escape · pause button · gamepad menu button</span></div>
          </div>

          <div class="run-actions">
            <button class="primary-button" id="info-close-button" type="button">CLOSE</button>
          </div>
        </section>
      </div>

'''
index = replace_once(
    index,
    '      <div class="game-overlay intermission-overlay" id="pause-overlay" hidden>',
    info_markup + '      <div class="game-overlay intermission-overlay" id="pause-overlay" hidden>',
    "info overlay",
)

# Wire the INFO controls into the existing game state/controller system.
js = replace_once(
    js,
    '    startOverlay: $("start-overlay"),\n    pauseOverlay: $("pause-overlay"),',
    '    startOverlay: $("start-overlay"),\n    infoOverlay: $("info-overlay"),\n    pauseOverlay: $("pause-overlay"),',
    "info overlay UI ref",
)
js = replace_once(
    js,
    '    startLeaderboardsButton: $("start-leaderboards-button"),\n    startHardcoreWarning: $("start-hardcore-warning"),',
    '    startLeaderboardsButton: $("start-leaderboards-button"),\n    startInfoButton: $("start-info-button"),\n    startHardcoreWarning: $("start-hardcore-warning"),',
    "start info UI ref",
)
js = replace_once(
    js,
    '    qualityButton: $("quality-button"),\n    pauseButton: $("pause-button"),',
    '    qualityButton: $("quality-button"),\n    infoButton: $("info-button"),\n    infoCloseButton: $("info-close-button"),\n    pauseButton: $("pause-button"),',
    "top info UI refs",
)
js = replace_once(
    js,
    '  let exitReturnState = "paused";\n  let leaderboardReturnButton = null;',
    '  let exitReturnState = "paused";\n  let infoReturnState = "ready";\n  let leaderboardReturnButton = null;',
    "info return state",
)
js = replace_once(
    js,
    '  function visibleMenuButtons() {\n    if (!ui.leaderboardOverlay.hidden) {',
    '  function visibleMenuButtons() {\n    if (!ui.infoOverlay.hidden) return [ui.infoCloseButton];\n    if (!ui.leaderboardOverlay.hidden) {',
    "info controller menu",
)

info_functions = '''  function openInfo() {
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

'''
js = replace_once(
    js,
    '  function openResetConfirmation() {',
    info_functions + '  function openResetConfirmation() {',
    "info functions",
)

js = replace_once(
    js,
    '''      const currentMenuContext = !ui.leaderboardOverlay.hidden
        ? `leaderboards-${gameState}`
        : gameState === "gameover" && !ui.statsOverlay.hidden
          ? "gameover-stats"
          : gameState;''',
    '''      const currentMenuContext = !ui.infoOverlay.hidden
        ? `info-${gameState}`
        : !ui.leaderboardOverlay.hidden
          ? `leaderboards-${gameState}`
          : gameState === "gameover" && !ui.statsOverlay.hidden
            ? "gameover-stats"
            : gameState;''',
    "info gamepad context",
)
js = replace_once(
    js,
    '''    if (menuActive && cancelPressed && !gamepadCancelPressed) {
      if (!ui.leaderboardOverlay.hidden) closeLeaderboards();''',
    '''    if (menuActive && cancelPressed && !gamepadCancelPressed) {
      if (!ui.infoOverlay.hidden) closeInfo();
      else if (!ui.leaderboardOverlay.hidden) closeLeaderboards();''',
    "gamepad cancel info",
)

# Only the timer ring turns red; the popcorn glow and beam stay gold.
js = replace_once(
    js,
    '''        const beamSprite = getRadialFillSprite(
          danger ? "pickup-beam-danger" : "pickup-beam-normal",
          scaleWorld(5),
          beamRadius,
          danger ? PICKUP_BEAM_STOPS.danger : PICKUP_BEAM_STOPS.normal,
        );''',
    '''        const beamSprite = getRadialFillSprite(
          "pickup-beam-normal",
          scaleWorld(5),
          beamRadius,
          PICKUP_BEAM_STOPS.normal,
        );''',
    "popcorn beam stays gold",
)
js = replace_once(
    js,
    '          const colorStops = danger ? PICKUP_BEAM_STOPS.danger : PICKUP_BEAM_STOPS.normal;',
    '          const colorStops = PICKUP_BEAM_STOPS.normal;',
    "popcorn fallback beam stays gold",
)
js = replace_once(
    js,
    '      ctx.shadowColor = danger ? "#ff5a3b" : COLORS.goldBright;\n      ctx.shadowBlur = scaleWorld(22) * qualitySettings.projectileGlow;\n      ctx.fillStyle = danger ? "rgba(210, 75, 53, 0.42)" : "rgba(229, 164, 8, 0.4)";',
    '      ctx.shadowColor = COLORS.goldBright;\n      ctx.shadowBlur = scaleWorld(22) * qualitySettings.projectileGlow;\n      ctx.fillStyle = "rgba(229, 164, 8, 0.4)";',
    "popcorn core glow stays gold",
)

# Keyboard/controller behavior for INFO.
js = replace_once(
    js,
    '''    if (event.code === "Escape" && !ui.leaderboardOverlay.hidden) {
      event.preventDefault();
      closeLeaderboards();''',
    '''    if (event.code === "Escape" && !ui.infoOverlay.hidden) {
      event.preventDefault();
      closeInfo();
    } else if (event.code === "Escape" && !ui.leaderboardOverlay.hidden) {
      event.preventDefault();
      closeLeaderboards();''',
    "escape closes info",
)
js = replace_once(
    js,
    '''      event.code === "Enter"
      && ui.leaderboardOverlay.hidden
      && (gameState === "ready" || (gameState === "gameover" && ui.statsOverlay.hidden))''',
    '''      event.code === "Enter"
      && ui.infoOverlay.hidden
      && ui.leaderboardOverlay.hidden
      && (gameState === "ready" || (gameState === "gameover" && ui.statsOverlay.hidden))''',
    "enter does not start behind info",
)
js = replace_once(
    js,
    '''  ui.startLeaderboardsButton.addEventListener("click", openLeaderboards);
  ui.restartButton.addEventListener("click", startGame);''',
    '''  ui.startLeaderboardsButton.addEventListener("click", openLeaderboards);
  ui.startInfoButton.addEventListener("click", openInfo);
  ui.infoButton.addEventListener("click", openInfo);
  ui.infoCloseButton.addEventListener("click", closeInfo);
  ui.restartButton.addEventListener("click", startGame);''',
    "info event listeners",
)
js = replace_once(
    js,
    '''    ui.startLeaderboardsButton,
    ui.resumeButton,''',
    '''    ui.startLeaderboardsButton,
    ui.startInfoButton,
    ui.infoCloseButton,
    ui.resumeButton,''',
    "info hover/controller selection",
)

# Add focused styles for the concise start screen and INFO overlay.
css += '''

/* Concise onboarding + opt-in full instructions. */
.start-poster {
  min-height: min(570px, calc(100vh - 36px));
  min-height: min(570px, calc(100dvh - 36px));
}

.start-master-wrap img {
  height: min(70vh, 545px);
  height: min(70dvh, 545px);
}

.start-quick-copy {
  margin-bottom: 22px !important;
  padding-bottom: 20px;
  color: #5d3415;
  font-size: clamp(1rem, 1.45vw, 1.3rem);
  font-weight: 800;
  letter-spacing: 0.045em;
  line-height: 1.35;
  text-wrap: balance;
}

.game-actions .info-button {
  min-width: 64px;
}

.info-overlay {
  z-index: 50;
  background:
    repeating-conic-gradient(from 0deg at 50% 50%, rgba(229, 164, 8, 0.07) 0 7deg, transparent 7deg 14deg),
    rgba(9, 5, 3, 0.97);
  backdrop-filter: none;
}

.info-panel {
  width: min(920px, 100%);
  flex: 0 0 auto;
  margin-block: auto;
  padding: clamp(24px, 4vw, 46px);
  border: 4px solid var(--ink);
  outline: 3px solid var(--gold);
  outline-offset: -9px;
  background:
    repeating-linear-gradient(0deg, rgba(87, 44, 7, 0.032) 0 1px, transparent 1px 4px),
    var(--paper-light);
  color: var(--ink);
  box-shadow: 12px 14px 0 rgba(72, 33, 6, 0.52), 0 24px 70px rgba(0, 0, 0, 0.62);
}

.info-panel .poster-kicker {
  color: var(--gold-dark);
  text-align: center;
}

.info-panel h2 {
  margin: 7px 0 10px;
  color: var(--gold-dark);
  font-family: "Alfa Movie", Rockwell, serif;
  font-size: clamp(2.2rem, 6vw, 4.6rem);
  font-weight: 400;
  letter-spacing: 0.045em;
  line-height: 1;
  text-align: center;
}

.info-summary {
  margin: 0 auto 22px;
  color: #5d3415;
  font-size: clamp(0.86rem, 1.3vw, 1.05rem);
  font-weight: 800;
  letter-spacing: 0.035em;
  text-align: center;
}

.info-rules {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 18px;
  margin: 0 0 20px;
}

.info-rules p {
  margin: 0;
  padding: 9px 12px;
  border-left: 3px solid var(--gold);
  background: rgba(255, 255, 255, 0.22);
  font-size: clamp(0.72rem, 1vw, 0.88rem);
  font-weight: 600;
  line-height: 1.38;
}

.info-rules b {
  color: var(--gold-dark);
  letter-spacing: 0.055em;
}

.info-controls {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 7px;
  margin-bottom: 22px;
}

.info-controls > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
  padding: 9px 8px;
  border: 1px solid rgba(91, 42, 2, 0.48);
  background: rgba(255, 255, 255, 0.3);
  text-align: center;
}

.info-controls b {
  color: var(--gold-dark);
  font-size: 0.62rem;
  letter-spacing: 0.12em;
}

.info-controls span {
  font-size: 0.6rem;
  font-weight: 700;
  line-height: 1.25;
}

@media (max-width: 720px) {
  .start-poster {
    min-height: 0;
  }

  .start-master-wrap img {
    height: 62vh;
    height: 62dvh;
  }

  .start-quick-copy {
    margin-bottom: 14px !important;
    padding-bottom: 14px;
    font-size: 0.9rem;
  }

  .game-actions .info-button {
    min-width: 0;
  }

  .info-rules {
    grid-template-columns: 1fr;
  }

  .info-controls {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 420px) {
  .info-panel {
    padding: 22px 14px;
  }

  .info-panel h2 {
    font-size: clamp(2rem, 14vw, 3.2rem);
  }

  .info-controls {
    grid-template-columns: 1fr;
  }
}

@media (max-height: 500px) and (orientation: landscape) and (min-width: 520px) {
  .start-quick-copy {
    margin-bottom: 7px !important;
    padding-bottom: 7px;
    font-size: 0.68rem;
  }

  .info-panel {
    margin-block: 0;
    padding: 14px 18px;
  }

  .info-panel h2 {
    margin-block: 3px 6px;
    font-size: 2rem;
  }

  .info-summary {
    margin-bottom: 8px;
    font-size: 0.68rem;
  }

  .info-rules {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 5px 10px;
    margin-bottom: 8px;
  }

  .info-rules p {
    padding: 5px 7px;
    font-size: 0.56rem;
    line-height: 1.22;
  }

  .info-controls {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 4px;
    margin-bottom: 9px;
  }

  .info-controls > div {
    padding: 5px;
  }

  .info-controls b,
  .info-controls span {
    font-size: 0.5rem;
  }
}
'''

# Sanity checks: requested copy is gone from the opening screen, full copy survives in INFO,
# and every new control has exactly one matching ID.
for marker in [
    'id="info-button"',
    'id="start-info-button"',
    'id="info-overlay"',
    'id="info-close-button"',
    'COLLECT POPCORN FOR UPGRADES · KEEP MOVING TO SHOOT · AVOID GARBAGE',
]:
    if index.count(marker) != 1:
        raise SystemExit(f"markup sanity check failed for {marker!r}: {index.count(marker)}")

if '<div class="rules">' in index:
    raise SystemExit("old opening rules block still present")
if 'danger ? "pickup-beam-danger"' in js:
    raise SystemExit("danger beam is still active")
if 'danger ? "#ff5a3b"' in js or 'danger ? "rgba(210, 75, 53, 0.42)"' in js:
    raise SystemExit("popcorn body still changes to red")
if 'ctx.strokeStyle = danger ? "#ff806b" : COLORS.goldBright;' not in js:
    raise SystemExit("timer ring no longer has red danger state")

index_path.write_text(index, encoding="utf-8")
js_path.write_text(js, encoding="utf-8")
css_path.write_text(css, encoding="utf-8")

print("Game onboarding patch applied successfully.")
