import worker from "./index.js";
import { handleEnhancedRequest } from "./insights.js";
import { handleLeaderboardRequest } from "./leaderboards.js";

export default {
  async fetch(request, env, ctx) {
    const leaderboardResponse = await handleLeaderboardRequest(request, env);
    if (leaderboardResponse) return leaderboardResponse;
    return handleEnhancedRequest(request, env, ctx, worker);
  },
};
