from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}")
    return text.replace(old, new, 1)

index_path = Path('game/index.html')
js_path = Path('game/game.js')
index = index_path.read_text(encoding='utf-8')
js = js_path.read_text(encoding='utf-8')

index = replace_once(
    index,
    '<script src="./game.js?v=20260904-onboarding-1" defer></script>',
    '<script src="./game.js?v=20260904-main-site-buttons-1" defer></script>',
    'game.js cache bust',
)

index = replace_once(
    index,
    '''              <button class="secondary-button" id="start-info-button" type="button">\n                INFO\n              </button>\n            </div>''',
    '''              <button class="secondary-button" id="start-info-button" type="button">\n                INFO\n              </button>\n              <button class="secondary-button" id="start-main-site-button" type="button">\n                MAIN SITE\n              </button>\n            </div>''',
    'intro main-site button',
)

index = replace_once(
    index,
    '''            <button class="secondary-button" id="reset-button" type="button">RESET</button>\n            <button class="secondary-button danger-button" id="end-button" type="button">END GAME</button>''',
    '''            <button class="secondary-button" id="reset-button" type="button">RESET</button>\n            <button class="secondary-button danger-button" id="end-button" type="button">END GAME</button>\n            <button class="secondary-button" id="pause-main-site-button" type="button">MAIN SITE</button>''',
    'pause main-site button',
)

index = replace_once(
    index,
    '<button class="secondary-button danger-button" id="exit-confirm-button" type="button">EXIT GAME</button>',
    '<button class="secondary-button danger-button" id="exit-confirm-button" type="button">GO TO MAIN SITE</button>',
    'exit confirmation label',
)

index = replace_once(
    index,
    '''              <button class="secondary-button leaderboard-open-button" id="gameover-leaderboards-button" type="button">LEADERBOARDS</button>\n              <button class="secondary-button mode-toggle" id="gameover-mode-button" type="button">''',
    '''              <button class="secondary-button leaderboard-open-button" id="gameover-leaderboards-button" type="button">LEADERBOARDS</button>\n              <button class="secondary-button" id="gameover-main-site-button" type="button">MAIN SITE</button>\n              <button class="secondary-button mode-toggle" id="gameover-mode-button" type="button">''',
    'gameover main-site button',
)

js = replace_once(
    js,
    '''    startLeaderboardsButton: $("start-leaderboards-button"),\n    startInfoButton: $("start-info-button"),\n    startHardcoreWarning: $("start-hardcore-warning"),''',
    '''    startLeaderboardsButton: $("start-leaderboards-button"),\n    startInfoButton: $("start-info-button"),\n    startMainSiteButton: $("start-main-site-button"),\n    startHardcoreWarning: $("start-hardcore-warning"),''',
    'start main-site ui hook',
)

js = replace_once(
    js,
    '''    resumeButton: $("resume-button"),\n    resetButton: $("reset-button"),''',
    '''    resumeButton: $("resume-button"),\n    pauseMainSiteButton: $("pause-main-site-button"),\n    resetButton: $("reset-button"),''',
    'pause main-site ui hook',
)

js = replace_once(
    js,
    '''    shareRunButton: $("share-run-button"),\n    gameoverLeaderboardsButton: $("gameover-leaderboards-button"),\n    shareRunStatus: $("share-run-status"),''',
    '''    shareRunButton: $("share-run-button"),\n    gameoverLeaderboardsButton: $("gameover-leaderboards-button"),\n    gameoverMainSiteButton: $("gameover-main-site-button"),\n    shareRunStatus: $("share-run-status"),''',
    'gameover main-site ui hook',
)

js = replace_once(
    js,
    'return [ui.startButton, ui.startModeButton, ui.startLeaderboardsButton, ui.startInfoButton];',
    'return [ui.startButton, ui.startModeButton, ui.startLeaderboardsButton, ui.startInfoButton, ui.startMainSiteButton];',
    'ready controller menu',
)

js = replace_once(
    js,
    'if (gameState === "paused") return [ui.resumeButton, ui.resetButton, ui.endButton];',
    'if (gameState === "paused") return [ui.resumeButton, ui.resetButton, ui.endButton, ui.pauseMainSiteButton];',
    'paused controller menu',
)

js = replace_once(
    js,
    '''        ui.shareRunButton,\n        ui.gameoverLeaderboardsButton,\n        ui.gameoverModeButton,''',
    '''        ui.shareRunButton,\n        ui.gameoverLeaderboardsButton,\n        ui.gameoverMainSiteButton,\n        ui.gameoverModeButton,''',
    'gameover controller menu',
)

js = replace_once(
    js,
    '''  function confirmExitGame() {\n    if (gameState !== "exit-confirm") return;\n    flushRunRecords();\n    window.location.assign(ui.exitButton.href);\n  }''',
    '''  function goToMainSite() {\n    flushRunRecords();\n    window.location.assign(ui.exitButton.href);\n  }\n\n  function confirmExitGame() {\n    if (gameState !== "exit-confirm") return;\n    goToMainSite();\n  }''',
    'shared main-site navigation helper',
)

js = replace_once(
    js,
    '''  ui.infoButton.addEventListener("click", openInfo);\n  ui.infoCloseButton.addEventListener("click", closeInfo);\n  ui.restartButton.addEventListener("click", startGame);''',
    '''  ui.infoButton.addEventListener("click", openInfo);\n  ui.infoCloseButton.addEventListener("click", closeInfo);\n  ui.startMainSiteButton.addEventListener("click", goToMainSite);\n  ui.restartButton.addEventListener("click", startGame);''',
    'intro main-site listener',
)

js = replace_once(
    js,
    '''  ui.shareRunButton.addEventListener("click", shareRun);\n  ui.gameoverLeaderboardsButton.addEventListener("click", openLeaderboards);\n  ui.statsCloseButton.addEventListener("click", closeGameStats);''',
    '''  ui.shareRunButton.addEventListener("click", shareRun);\n  ui.gameoverLeaderboardsButton.addEventListener("click", openLeaderboards);\n  ui.gameoverMainSiteButton.addEventListener("click", goToMainSite);\n  ui.statsCloseButton.addEventListener("click", closeGameStats);''',
    'gameover main-site listener',
)

js = replace_once(
    js,
    '''  ui.resumeButton.addEventListener("click", () => togglePause());\n  ui.resetButton.addEventListener("click", openResetConfirmation);''',
    '''  ui.resumeButton.addEventListener("click", () => togglePause());\n  ui.pauseMainSiteButton.addEventListener("click", openExitConfirmation);\n  ui.resetButton.addEventListener("click", openResetConfirmation);''',
    'pause main-site listener',
)

# Keep the static controller-button registry aware of all three additions.
js = replace_once(
    js,
    '''    ui.startLeaderboardsButton,\n    ui.startInfoButton,\n    ui.infoCloseButton,\n    ui.resumeButton,''',
    '''    ui.startLeaderboardsButton,\n    ui.startInfoButton,\n    ui.startMainSiteButton,\n    ui.infoCloseButton,\n    ui.resumeButton,\n    ui.pauseMainSiteButton,''',
    'static controller registry intro/pause',
)

js = replace_once(
    js,
    '''    ui.shareRunButton,\n    ui.gameoverLeaderboardsButton,\n    ui.gameoverModeButton,''',
    '''    ui.shareRunButton,\n    ui.gameoverLeaderboardsButton,\n    ui.gameoverMainSiteButton,\n    ui.gameoverModeButton,''',
    'static controller registry gameover',
)

for marker in [
    'id="start-main-site-button"',
    'id="pause-main-site-button"',
    'id="gameover-main-site-button"',
    '>GO TO MAIN SITE</button>',
    'startMainSiteButton: $("start-main-site-button")',
    'pauseMainSiteButton: $("pause-main-site-button")',
    'gameoverMainSiteButton: $("gameover-main-site-button")',
    'ui.pauseMainSiteButton.addEventListener("click", openExitConfirmation)',
]:
    if marker not in index and marker not in js:
        raise SystemExit(f'missing expected marker: {marker}')

index_path.write_text(index, encoding='utf-8')
js_path.write_text(js, encoding='utf-8')
print('Main-site buttons patch applied successfully.')
