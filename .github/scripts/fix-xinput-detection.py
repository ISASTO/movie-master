from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}")
    return text.replace(old, new, 1)


game_path = Path("game/game.js")
index_path = Path("game/index.html")
benchmark_path = Path("benchmarks/game-performance.js")
game = game_path.read_text(encoding="utf-8")
index = index_path.read_text(encoding="utf-8")
benchmark = benchmark_path.read_text(encoding="utf-8")

game = replace_once(
    game,
    '''  let activeGamepadIndex = null;\n  let activeGamepadHasRelevantInput = false;\n  let gamepadConnectionKnown = false;\n  let nextGamepadProbeAt = 0;\n''',
    '''  let activeGamepadIndex = null;\n  let activeGamepadHasRelevantInput = false;\n''',
    "gamepad discovery state",
)

old_choose = '''  function chooseActiveGamepad(now = performance.now(), forceProbe = false) {\n    if (\n      !forceProbe\n      && !gamepadConnectionKnown\n      && activeGamepadIndex === null\n      && now < nextGamepadProbeAt\n    ) {\n      activeGamepadHasRelevantInput = false;\n      return null;\n    }\n\n    const gamepads = readConnectedGamepads();\n    let first = null;\n    let current = null;\n    let currentEngaged = false;\n    let engaged = null;\n\n    for (let i = 0; i < gamepads.length; i += 1) {\n      const gamepad = gamepads[i];\n      if (!gamepad || gamepad.connected === false) continue;\n      if (!first) first = gamepad;\n      const isCurrent = gamepad.index === activeGamepadIndex;\n      const relevant = (!engaged || isCurrent) && hasRelevantGamepadInput(gamepad);\n      if (isCurrent) {\n        current = gamepad;\n        currentEngaged = relevant;\n      }\n      if (!engaged && relevant) engaged = gamepad;\n    }\n\n    if (!first) {\n      activeGamepadIndex = null;\n      activeGamepadHasRelevantInput = false;\n      gamepadConnectionKnown = false;\n      nextGamepadProbeAt = now + 500;\n      return null;\n    }\n\n    const selected = engaged && (!current || !currentEngaged)\n      ? engaged\n      : current || engaged || first;\n    activeGamepadIndex = selected.index;\n    activeGamepadHasRelevantInput = selected === engaged\n      || (selected === current && currentEngaged);\n    gamepadConnectionKnown = true;\n    nextGamepadProbeAt = 0;\n    return selected;\n  }\n'''
new_choose = '''  function chooseActiveGamepad() {\n    // Keep discovery continuous. Some virtual XInput devices (notably pads\n    // created or recreated by DS4Windows) are exposed through getGamepads()\n    // without a reliable gamepadconnected event. The former 500 ms idle probe\n    // could therefore miss the short window in which the browser first exposed\n    // the virtual pad. This loop is allocation-free and is intentionally run\n    // with the animation frame, matching the controller behavior that worked\n    // before the no-controller polling optimization.\n    const gamepads = readConnectedGamepads();\n    let first = null;\n    let current = null;\n    let currentEngaged = false;\n    let engaged = null;\n\n    for (let i = 0; i < gamepads.length; i += 1) {\n      const gamepad = gamepads[i];\n      if (!gamepad || gamepad.connected === false) continue;\n      if (!first) first = gamepad;\n      const isCurrent = gamepad.index === activeGamepadIndex;\n      const relevant = (!engaged || isCurrent) && hasRelevantGamepadInput(gamepad);\n      if (isCurrent) {\n        current = gamepad;\n        currentEngaged = relevant;\n      }\n      if (!engaged && relevant) engaged = gamepad;\n    }\n\n    if (!first) {\n      activeGamepadIndex = null;\n      activeGamepadHasRelevantInput = false;\n      return null;\n    }\n\n    const selected = engaged && (!current || !currentEngaged)\n      ? engaged\n      : current || engaged || first;\n    activeGamepadIndex = selected.index;\n    activeGamepadHasRelevantInput = selected === engaged\n      || (selected === current && currentEngaged);\n    return selected;\n  }\n'''
game = replace_once(game, old_choose, new_choose, "active gamepad discovery")

game = replace_once(
    game,
    '    const gamepad = sourceIsGamepad ? sourceGamepad : chooseActiveGamepad(undefined, true);\n',
    '    const gamepad = sourceIsGamepad ? sourceGamepad : chooseActiveGamepad();\n',
    "haptic gamepad lookup",
)

game = replace_once(
    game,
    '    const gamepad = chooseActiveGamepad(now);\n',
    '    const gamepad = chooseActiveGamepad();\n',
    "frame gamepad lookup",
)

game = replace_once(
    game,
    '''  window.addEventListener("gamepadconnected", (event) => {\n    activeGamepadIndex = event.gamepad.index;\n    gamepadConnectionKnown = true;\n    nextGamepadProbeAt = 0;\n  });\n''',
    '''  window.addEventListener("gamepadconnected", (event) => {\n    activeGamepadIndex = event.gamepad.index;\n  });\n''',
    "gamepad connected listener",
)

game = replace_once(
    game,
    '''    activeGamepadIndex = null;\n    activeGamepadHasRelevantInput = false;\n    gamepadConnectionKnown = false;\n    nextGamepadProbeAt = 0;\n    resetGamepadInputState();\n''',
    '''    activeGamepadIndex = null;\n    activeGamepadHasRelevantInput = false;\n    resetGamepadInputState();\n''',
    "gamepad disconnected listener",
)

benchmark = replace_once(
    benchmark,
    '''      activeGamepadIndex = null;\n      gamepadConnectionKnown = true;\n      gamepadMenuContext = entering ? "" : "paused";\n''',
    '''      activeGamepadIndex = null;\n      gamepadMenuContext = entering ? "" : "paused";\n''',
    "controller benchmark discovery state",
)

index = replace_once(
    index,
    '<script src="./game.js?v=20260905-early-finish-1" defer></script>',
    '<script src="./game.js?v=20260905-xinput-1" defer></script>',
    "game script cache bust",
)

if "gamepadConnectionKnown" in game or "nextGamepadProbeAt" in game:
    raise SystemExit("stale no-controller probe state remains")
if "function chooseActiveGamepad()" not in game:
    raise SystemExit("continuous gamepad discovery missing")

game_path.write_text(game, encoding="utf-8")
index_path.write_text(index, encoding="utf-8")
benchmark_path.write_text(benchmark, encoding="utf-8")
print("XInput compatibility patch applied.")
