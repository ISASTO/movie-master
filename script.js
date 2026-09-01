(() => {
  "use strict";

  const load = (src) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    document.head.append(script);
  };

  load("./site-core.js?v=20260901-2");
  load("./payment-options.js?v=20260901-1");
  load("./store-click.js?v=20260901-1");
})();
