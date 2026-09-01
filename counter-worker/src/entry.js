import worker from "./index.js";
import { handleEnhancedRequest } from "./insights.js";

export default {
  async fetch(request, env, ctx) {
    return handleEnhancedRequest(request, env, ctx, worker);
  },
};
