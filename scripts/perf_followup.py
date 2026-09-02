from pathlib import Path


def replace_once(path, old, new, label):
    file = Path(path)
    text = file.read_text()
    if old not in text:
        raise RuntimeError(f"Missing expected text for {label}")
    file.write_text(text.replace(old, new, 1))


replace_once(
    "game/leaderboard.js",
    '''    const normal = Math.max(readStoredScore(legacyScoreKey), readStoredScore(standardScoreKey));
    const hardcore = readStoredScore(hardcoreScoreKey);
    const result = await request("/legacy-leaderboard-import", {
''',
    '''    const normal = Math.max(readStoredScore(legacyScoreKey), readStoredScore(standardScoreKey));
    const hardcore = readStoredScore(hardcoreScoreKey);
    if (normal <= 0 && hardcore <= 0) {
      try {
        window.localStorage.setItem(legacyImportMarker, "1");
      } catch {
        // No marker means this harmless local check may run again next load.
      }
      return;
    }
    const result = await request("/legacy-leaderboard-import", {
''',
    "zero-score legacy import skip",
)

replace_once(
    "game/leaderboard.js",
    '''  window.addEventListener("movie-master:run-record-failed", () => {
    void loadLeaderboards(true).catch(() => {});
  });
''',
    '''  window.addEventListener("movie-master:run-record-failed", () => {
    void loadLeaderboards(false).catch(() => {});
  });
''',
    "failed-run leaderboard reuse",
)

replace_once(
    "game/index.html",
    "./leaderboard.js?v=20260902-perf-1",
    "./leaderboard.js?v=20260902-perf-2",
    "leaderboard follow-up cache bust",
)

replace_once(
    "analytics/auto-refresh.js",
    "  const QUIET_MIN_AGE_MS = 60 * 1000;",
    "  const QUIET_MIN_AGE_MS = AUTO_REFRESH_MS;",
    "analytics quiet refresh full-cadence cap",
)

replace_once(
    "analytics/index.html",
    "./auto-refresh.js?v=20260902-perf-1",
    "./auto-refresh.js?v=20260902-perf-2",
    "analytics follow-up cache bust",
)

leaderboard = Path("game/leaderboard.js").read_text()
if 'if (normal <= 0 && hardcore <= 0)' not in leaderboard:
    raise RuntimeError("zero-score legacy import guard missing")
if 'movie-master:run-record-failed' not in leaderboard or 'loadLeaderboards(false)' not in leaderboard:
    raise RuntimeError("failed-run leaderboard cache reuse missing")

auto = Path("analytics/auto-refresh.js").read_text()
if "const QUIET_MIN_AGE_MS = AUTO_REFRESH_MS;" not in auto:
    raise RuntimeError("quiet analytics refresh can still exceed cadence")
