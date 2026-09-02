from pathlib import Path
import re


def replace_if_present(text: str, old: str, new: str) -> str:
    return text.replace(old, new) if old in text else text


# game/index.html is restored from main immediately before this script runs.
game = Path("game/index.html")
text = game.read_text()
if len(text.splitlines()) <= 350:
    raise RuntimeError("game/index.html is unexpectedly short")

base_css = '<link rel="stylesheet" href="./game.css?v=20260902-public-leaderboards">'
override_css = '<link rel="stylesheet" href="./leaderboard-upgrades.css?v=20260902-1">'
if override_css not in text:
    text = text.replace(base_css, f"{base_css}\n    {override_css}", 1)

text = text.replace(
    "../game-records.js?v=20260902-public-leaderboards",
    "../game-records.js?v=20260902-run-analytics-2",
)
text = text.replace(
    "./leaderboard.js?v=20260902-public-leaderboards",
    "./leaderboard.js?v=20260902-run-analytics-2",
)
text = re.sub(
    r'\n\s*<p class="leaderboard-placement-status" id="leaderboard-placement-status"[^>]*>\s*CHECKING LEADERBOARD POSITION…\s*</p>',
    "",
    text,
    count=1,
)
text = text.replace(
    '          <p class="poster-kicker">THE WORLD\'S BEST AND MOST CORRECT PLAYERS</p>\n',
    "",
)
text = text.replace(
    '          <p class="leaderboard-reset-copy">DAILY BOARDS RESET AT MIDNIGHT CENTRAL TIME</p>\n',
    "",
)

required_game = [
    "leaderboard-upgrades.css?v=20260902-1",
    "game-records.js?v=20260902-run-analytics-2",
    "leaderboard.js?v=20260902-run-analytics-2",
    'id="gameover-overlay"',
    'id="stats-overlay"',
    'id="leaderboard-overlay"',
    'id="leaderboard-card-template"',
    'id="judgment-button"',
]
for needle in required_game:
    if needle not in text:
        raise RuntimeError(f"game markup lost required element: {needle}")
for forbidden in [
    "THE WORLD'S BEST AND MOST CORRECT PLAYERS",
    "DAILY BOARDS RESET AT MIDNIGHT CENTRAL TIME",
    "leaderboard-placement-status",
]:
    if forbidden in text:
        raise RuntimeError(f"obsolete leaderboard copy survived: {forbidden}")
game.write_text(text)


analytics = Path("analytics/index.html")
text = analytics.read_text()
old_mode_css = '<link rel="stylesheet" href="./mode-leaderboards.css?v=20260902-1">'
new_mode_css = '<link rel="stylesheet" href="./mode-leaderboards.css?v=20260902-run-details-2">'
text = replace_if_present(text, old_mode_css, new_mode_css)
if new_mode_css not in text:
    # Accept a previously cache-busted copy and leave it alone.
    if "./mode-leaderboards.css?v=" not in text:
        raise RuntimeError("mode leaderboard stylesheet link missing")

override = '<link rel="stylesheet" href="./run-details-overrides.css?v=20260902-1">'
if override not in text:
    anchor = new_mode_css if new_mode_css in text else next(
        line.strip() for line in text.splitlines() if "./mode-leaderboards.css?v=" in line
    )
    text = text.replace(anchor, f"{anchor}\n    {override}", 1)

text = text.replace(
    '<script src="./mode-leaderboards.js?v=20260901-2" defer></script>',
    '<script src="./mode-leaderboards.js?v=20260902-run-details-2" defer></script>',
)
old_privacy = (
    "Counts use anonymous browser IDs stored locally in each visitor's browser. "
    "No names, IP addresses, fingerprints, or user-agent histories are stored. "
    "Geography uses coarse Cloudflare IP-geolocation; the IP itself is discarded "
    "and map coordinates are rounded before storage."
)
new_privacy = (
    "Traffic counts use anonymous browser IDs stored locally in each visitor's browser. "
    "Players may optionally publish a leaderboard name. Completed runs may store coarse "
    "device, browser, control-method and graphics-quality categories plus approximate "
    "Cloudflare location. No IP addresses, full user-agent strings, exact screen "
    "dimensions or hardware fingerprints are retained."
)
text = replace_if_present(text, old_privacy, new_privacy)
for needle in [
    "run-details-overrides.css?v=20260902-1",
    "mode-leaderboards.js?v=20260902-run-details-2",
]:
    if needle not in text:
        raise RuntimeError(f"analytics cache-bust missing: {needle}")
analytics.write_text(text)


# The old details payload still calculated a generic top-10 leaderboard that no
# frontend reads. The dedicated mode leaderboard snapshot supersedes it.
insights = Path("counter-worker/src/insights.js")
text = insights.read_text()
text = text.replace("    modeResult,\n    leaderboardResult,\n", "    modeResult,\n")
text = text.replace(
    """    env.DB.prepare(
      `SELECT visitor_id, mode, score, longest_streak, game_time_seconds, finished_at
       FROM game_runs
       ORDER BY score DESC, longest_streak DESC, game_time_seconds DESC, finished_at ASC
       LIMIT 10`,
    ),
""",
    "",
)
text = text.replace(
    """      modeStarts,
      leaderboard: (leaderboardResult.results ?? []).map((row, index) => ({
        rank: index + 1,
        player: playerTag(row.visitor_id),
        mode: row.mode,
        score: Number(row.score ?? 0),
        longestStreak: Number(row.longest_streak ?? 0),
        gameTimeSeconds: Number(row.game_time_seconds ?? 0),
        finishedAt: sqliteTimestampToIso(row.finished_at),
      })),
""",
    """      modeStarts,
""",
)
if "leaderboardResult" in text:
    raise RuntimeError("redundant details leaderboard query was not fully removed")
insights.write_text(text)
