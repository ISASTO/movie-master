from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}")
    return text.replace(old, new, 1)


game_path = Path("game/game.js")
records_path = Path("game-records.js")
index_path = Path("game/index.html")

game = game_path.read_text(encoding="utf-8")
records = records_path.read_text(encoding="utf-8")
index = index_path.read_text(encoding="utf-8")

records = replace_once(
    records,
    '  const startButtons = ["start-button", "restart-button", "reset-confirm-button"];\n',
    '',
    'remove inferred start-button list',
)

old_record_listeners = '''  for (const id of startButtons) {
    document.getElementById(id)?.addEventListener("click", beginRun);
  }
  window.addEventListener("gamepadconnected", () => {
'''
new_record_listeners = '''  window.addEventListener("movie-master:game-run-started", () => {
    beginRun();
  });
  window.addEventListener("movie-master:game-run-finalized", (event) => {
    if (!runActive) return;
    const pending = finishRun();
    if (Array.isArray(event.detail?.pending)) event.detail.pending.push(pending);
  });
  window.addEventListener("gamepadconnected", () => {
'''
records = replace_once(records, old_record_listeners, new_record_listeners, 'replace run lifecycle listeners')

old_start_tail = '''    setBanner("KEEP MOVING. COLLECT THE POPCORN.", 2.8, false);
    announce("The Movie Master is ready. Keep moving and collect the popcorn.");
    playCue("start");
  }

  function saveRunRecords() {
'''
new_start_tail = '''    setBanner("KEEP MOVING. COLLECT THE POPCORN.", 2.8, false);
    announce("The Movie Master is ready. Keep moving and collect the popcorn.");
    playCue("start");
    window.dispatchEvent(new CustomEvent("movie-master:game-run-started", {
      detail: { mode: runStats.mode },
    }));
  }

  function saveRunRecords() {
'''
game = replace_once(game, old_start_tail, new_start_tail, 'emit actual run start')

old_save_tail = '''    flushRunRecords();

    return { finalScore, scoreRecord, streakRecord };
  }

  function endGame(reason = "garbage") {
'''
new_save_tail = '''    flushRunRecords();

    return { finalScore, scoreRecord, streakRecord };
  }

  let runFinalizedForTracking = false;
  const EARLY_FINALIZE_STATES = new Set([
    "running",
    "paused",
    "resuming",
    "reset-confirm",
    "end-confirm",
    "exit-confirm",
  ]);

  function finalizeRunForTracking(reason) {
    if (runFinalizedForTracking || !EARLY_FINALIZE_STATES.has(gameState)) {
      flushRunRecords();
      return null;
    }

    runFinalizedForTracking = true;
    const records = saveRunRecords();
    renderGameStats(records.finalScore);
    const pending = [];
    window.dispatchEvent(new CustomEvent("movie-master:game-run-finalized", {
      detail: { reason, pending },
    }));
    return pending.length ? Promise.allSettled(pending) : null;
  }

  function endGame(reason = "garbage") {
'''
game = replace_once(game, old_save_tail, new_save_tail, 'add early finalizer')

old_start_reset = '''    flushRunRecords();
    resetGame();
    gameState = "running";
'''
new_start_reset = '''    flushRunRecords();
    resetGame();
    runFinalizedForTracking = false;
    gameState = "running";
'''
game = replace_once(game, old_start_reset, new_start_reset, 'reset early-finalized flag on start')

old_reset = '''  function confirmResetGame() {
    if (gameState !== "reset-confirm") return;
    saveRunRecords();
    startGame();
  }
'''
new_reset = '''  function confirmResetGame() {
    if (gameState !== "reset-confirm") return;
    finalizeRunForTracking("reset");
    startGame();
  }
'''
game = replace_once(game, old_reset, new_reset, 'finalize reset run')

old_main_site = '''  function goToMainSite() {
    flushRunRecords();
    window.location.assign(ui.exitButton.href);
  }
'''
new_main_site = '''  async function goToMainSite() {
    const finalization = finalizeRunForTracking("exit");
    if (finalization) {
      await Promise.race([
        finalization,
        new Promise((resolve) => window.setTimeout(resolve, 650)),
      ]);
    }
    window.location.assign(ui.exitButton.href);
  }
'''
game = replace_once(game, old_main_site, new_main_site, 'finalize confirmed exit')

old_pagehide = '  window.addEventListener("pagehide", flushRunRecords);\n'
new_pagehide = '''  window.addEventListener("pagehide", (event) => {
    if (event.persisted) {
      flushRunRecords();
      return;
    }
    finalizeRunForTracking("pagehide");
  });
'''
game = replace_once(game, old_pagehide, new_pagehide, 'finalize non-BFCache pagehide')

index = replace_once(
    index,
    '<script src="../game-records.js?v=20260902-perf-1" defer></script>',
    '<script src="../game-records.js?v=20260905-early-finish-1" defer></script>',
    'game records cache bust',
)
index = replace_once(
    index,
    '<script src="./game.js?v=20260904-performance-sweep-2" defer></script>',
    '<script src="./game.js?v=20260905-early-finish-1" defer></script>',
    'game cache bust',
)

assert 'const startButtons =' not in records
assert 'movie-master:game-run-started' in records and 'movie-master:game-run-finalized' in records
assert 'movie-master:game-run-started' in game and 'movie-master:game-run-finalized' in game
assert 'finalizeRunForTracking("reset")' in game
assert 'finalizeRunForTracking("exit")' in game
assert 'finalizeRunForTracking("pagehide")' in game
assert 'runFinalizedForTracking = false' in game
assert '650' in game

records_path.write_text(records, encoding="utf-8")
game_path.write_text(game, encoding="utf-8")
index_path.write_text(index, encoding="utf-8")
print("Early run finalization patch applied.")
