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

index = replace_once(
    index,
    '<section class="info-panel" aria-labelledby="info-title">',
    '<section class="info-panel" role="dialog" aria-modal="true" aria-labelledby="info-title">',
    "info dialog semantics",
)

js = replace_once(
    js,
    '      return [ui.startButton, ui.startModeButton, ui.startLeaderboardsButton];',
    '      return [ui.startButton, ui.startModeButton, ui.startLeaderboardsButton, ui.startInfoButton];',
    "controller can reach start info",
)

js = replace_once(
    js,
    '    ui.startOverlay.hidden = true;\n    ui.pauseOverlay.hidden = true;',
    '    ui.startOverlay.hidden = true;\n    ui.infoOverlay.hidden = true;\n    ui.pauseOverlay.hidden = true;',
    "starting always closes info",
)

js = replace_once(
    js,
    '''    } else if (event.code === "KeyP" || event.code === "Escape") {
      if (gameState === "running" || gameState === "paused" || gameState === "resuming") {''',
    '''    } else if (event.code === "KeyP" || event.code === "Escape") {
      if (
        ui.infoOverlay.hidden
        && (gameState === "running" || gameState === "paused" || gameState === "resuming")
      ) {''',
    "keyboard pause blocked behind info",
)

js = replace_once(
    js,
    '''      pausePressed
      && !gamepadPausePressed
      && (gameState === "running" || gameState === "paused" || gameState === "resuming")''',
    '''      pausePressed
      && !gamepadPausePressed
      && ui.infoOverlay.hidden
      && (gameState === "running" || gameState === "paused" || gameState === "resuming")''',
    "gamepad pause blocked behind info",
)

css += '''

/* Preserve the compact start poster on short desktop/landscape screens. */
@media (max-height: 650px) and (min-width: 721px) {
  .start-poster {
    min-height: 0;
  }
}

@media (max-height: 500px) and (orientation: landscape) and (min-width: 520px) {
  .start-poster {
    min-height: calc(100vh - 16px);
    min-height: calc(100dvh - 16px);
  }
}
'''

checks = {
    "start info in controller menu": 'ui.startLeaderboardsButton, ui.startInfoButton',
    "keyboard info pause guard": 'ui.infoOverlay.hidden\n        && (gameState === "running"',
    "gamepad info pause guard": '&& ui.infoOverlay.hidden\n      && (gameState === "running"',
    "dialog semantics": 'role="dialog" aria-modal="true" aria-labelledby="info-title"',
}
for label, marker in checks.items():
    haystack = index if label == "dialog semantics" else js
    if marker not in haystack:
        raise SystemExit(f"missing {label}")

index_path.write_text(index, encoding="utf-8")
js_path.write_text(js, encoding="utf-8")
css_path.write_text(css, encoding="utf-8")
print("Onboarding edge-case fixes applied successfully.")
