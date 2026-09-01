import worker from "./index.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/traffic") {
      url.pathname = "/analytics";
      request = new Request(url.toString(), request);
    }

    return worker.fetch(request, env, ctx);
  },
};
