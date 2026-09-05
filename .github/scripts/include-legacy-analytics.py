from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}")
    return text.replace(old, new, 1)


worker_path = Path("counter-worker/src/leaderboards.js")
client_path = Path("analytics/mode-leaderboards.js")
index_path = Path("analytics/index.html")

worker = worker_path.read_text(encoding="utf-8")
client = client_path.read_text(encoding="utf-8")
index = index_path.read_text(encoding="utf-8")

old_normalize = '''function normalizeAnalyticsRows(rows, includeRank = true) {
  return (rows ?? []).map((row, index) => ({
    ...(includeRank ? { rank: index + 1 } : {}),
    runId: row.run_id,
    player: analyticsPlayerName(row),
    mode: row.mode,
    score: Number(row.score ?? 0),
    longestStreak: Number(row.longest_streak ?? 0),
    gameTimeSeconds: Number(row.game_time_seconds ?? 0),
    finishedAt: sqliteTimestampToIso(row.finished_at),
  }));
}
'''
new_normalize = '''function normalizeAnalyticsRows(rows, includeRank = true) {
  return (rows ?? []).map((row, index) => {
    const legacy = Number(row.is_legacy ?? 0) === 1;
    return {
      ...(includeRank ? { rank: index + 1 } : {}),
      runId: legacy ? null : row.run_id,
      legacy,
      player: analyticsPlayerName(row),
      mode: row.mode,
      score: Number(row.score ?? 0),
      longestStreak: row.longest_streak == null ? null : Number(row.longest_streak),
      gameTimeSeconds: row.game_time_seconds == null ? null : Number(row.game_time_seconds),
      finishedAt: sqliteTimestampToIso(row.finished_at),
    };
  });
}
'''
worker = replace_once(worker, old_normalize, new_normalize, "analytics row normalization")

old_best = '''function bestRunsForMode(mode) {
  return `
    WITH ranked_runs AS (
      SELECT
        run_id,
        visitor_id,
        mode,
        score,
        longest_streak,
        game_time_seconds,
        finished_at,
        ROW_NUMBER() OVER (
          PARTITION BY visitor_id
          ORDER BY score DESC, longest_streak DESC, game_time_seconds DESC, finished_at ASC
        ) AS player_rank
      FROM game_runs
      WHERE mode = '${mode}'
    )
    SELECT
      ranked_runs.run_id,
      ranked_runs.visitor_id,
      ranked_runs.mode,
      ranked_runs.score,
      ranked_runs.longest_streak,
      ranked_runs.game_time_seconds,
      ranked_runs.finished_at,
      leaderboard_profiles.display_name
    FROM ranked_runs
    LEFT JOIN leaderboard_profiles
      ON leaderboard_profiles.visitor_id = ranked_runs.visitor_id
    WHERE ranked_runs.player_rank = 1
    ORDER BY ranked_runs.score DESC,
             ranked_runs.longest_streak DESC,
             ranked_runs.game_time_seconds DESC,
             ranked_runs.finished_at ASC
    LIMIT 10
  `;
}
'''
new_best = '''function bestRunsForMode(mode) {
  return `
    WITH source_runs AS (
      SELECT
        run_id,
        visitor_id,
        mode,
        score,
        longest_streak,
        game_time_seconds,
        finished_at,
        0 AS is_legacy
      FROM game_runs
      WHERE mode = '${mode}'

      UNION ALL

      SELECT
        'legacy:' || visitor_id || ':' || mode AS run_id,
        visitor_id,
        mode,
        score,
        NULL AS longest_streak,
        NULL AS game_time_seconds,
        imported_at AS finished_at,
        1 AS is_legacy
      FROM legacy_leaderboard_scores
      WHERE mode = '${mode}'
    ),
    ranked_runs AS (
      SELECT
        source_runs.*,
        ROW_NUMBER() OVER (
          PARTITION BY visitor_id
          ORDER BY score DESC,
                   CASE WHEN longest_streak IS NULL THEN 1 ELSE 0 END ASC,
                   longest_streak DESC,
                   CASE WHEN game_time_seconds IS NULL THEN 1 ELSE 0 END ASC,
                   game_time_seconds DESC,
                   is_legacy ASC,
                   finished_at ASC,
                   run_id ASC
        ) AS player_rank
      FROM source_runs
    )
    SELECT
      ranked_runs.run_id,
      ranked_runs.visitor_id,
      ranked_runs.mode,
      ranked_runs.score,
      ranked_runs.longest_streak,
      ranked_runs.game_time_seconds,
      ranked_runs.finished_at,
      ranked_runs.is_legacy,
      leaderboard_profiles.display_name
    FROM ranked_runs
    LEFT JOIN leaderboard_profiles
      ON leaderboard_profiles.visitor_id = ranked_runs.visitor_id
    WHERE ranked_runs.player_rank = 1
    ORDER BY ranked_runs.score DESC,
             CASE WHEN ranked_runs.longest_streak IS NULL THEN 1 ELSE 0 END ASC,
             ranked_runs.longest_streak DESC,
             CASE WHEN ranked_runs.game_time_seconds IS NULL THEN 1 ELSE 0 END ASC,
             ranked_runs.game_time_seconds DESC,
             ranked_runs.is_legacy ASC,
             ranked_runs.finished_at ASC,
             ranked_runs.run_id ASC
    LIMIT 10
  `;
}
'''
worker = replace_once(worker, old_best, new_best, "analytics best-run query")

old_handler = '''async function handleAnalyticsLeaderboard(request, env, origin) {
  if (request.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405, origin);
  }
  const [standardResult, hardcoreResult, recentResult] = await env.DB.batch([
'''
new_handler = '''async function handleAnalyticsLeaderboard(request, env, origin) {
  if (request.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405, origin);
  }
  await ensureLeaderboardInfrastructure(env.DB);
  const [standardResult, hardcoreResult, recentResult] = await env.DB.batch([
'''
worker = replace_once(worker, old_handler, new_handler, "ensure legacy table for analytics")

old_values = '''      const values = [
        [`#${entry.rank}`, "leaderboard-rank", "RANK"],
        [entry.player, "leaderboard-player", "PLAYER"],
        [numberFormatter.format(entry.score ?? 0), "leaderboard-score", "SCORE"],
        [numberFormatter.format(entry.longestStreak ?? 0), "leaderboard-streak", "STREAK"],
        [formatDuration(entry.gameTimeSeconds), "leaderboard-time", "TIME"],
      ];
'''
new_values = '''      const values = [
        [`#${entry.rank}`, "leaderboard-rank", "RANK"],
        [entry.player, "leaderboard-player", "PLAYER"],
        [numberFormatter.format(entry.score ?? 0), "leaderboard-score", "SCORE"],
        [entry.longestStreak == null ? "—" : numberFormatter.format(entry.longestStreak), "leaderboard-streak", "STREAK"],
        [entry.gameTimeSeconds == null ? "—" : formatDuration(entry.gameTimeSeconds), "leaderboard-time", "TIME"],
      ];
'''
client = replace_once(client, old_values, new_values, "legacy unknown stats display")

index = replace_once(
    index,
    '<script src="./mode-leaderboards.js?v=20260902-run-details-2" defer></script>',
    '<script src="./mode-leaderboards.js?v=20260905-legacy-analytics-1" defer></script>',
    "analytics leaderboard cache bust",
)

assert "FROM legacy_leaderboard_scores" in worker
assert "await ensureLeaderboardInfrastructure(env.DB);" in worker
assert "runId: legacy ? null : row.run_id" in worker
assert 'entry.longestStreak == null ? "—"' in client
assert 'entry.gameTimeSeconds == null ? "—"' in client
assert "20260905-legacy-analytics-1" in index

worker_path.write_text(worker, encoding="utf-8")
client_path.write_text(client, encoding="utf-8")
index_path.write_text(index, encoding="utf-8")
print("Legacy analytics leaderboard patch applied.")
