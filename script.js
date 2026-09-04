(() => {
  "use strict";

  const load = (src) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    document.head.append(script);
  };

  const applyRequestedCopyChanges = () => {
    document.querySelectorAll(".package-referral-link, #referrals, #share-dialog").forEach((element) => {
      element.remove();
    });

    const samplesCopy = document.querySelector(".samples-copy p");
    if (samplesCopy) {
      samplesCopy.textContent =
        "Quality Blockbuster Smash Hit Masterpiece recommendations are provided only to paying customers. Do not attempt to scam the Movie Master into giving you free recommendations.";
    }

    const streamingQuestion = Array.from(document.querySelectorAll("#faq details")).find((details) =>
      details.querySelector("summary")?.textContent.trim() ===
      "Will the Movie Master consider which streaming services I have?"
    );
    if (streamingQuestion) {
      const answer = streamingQuestion.querySelector("p");
      if (answer) {
        answer.innerHTML =
          "The Movie Master will specifically recommend movies that are <strong>not</strong> on your streaming services, as streaming services do not provide quality movies. You can get movies from the library, or you can search on google where to watch his recommendations.";
      }
    }

    const testimonialIntro = document.querySelector("#testimonials .section-intro");
    if (testimonialIntro) {
      testimonialIntro.textContent =
        "The Movie Master has many satisfied customers. Only one of the testimonials below is real, but the rest might plausibly be said at some point in the future.";
    }

    const testimonialDisclaimer = document.querySelector("#testimonials .testimonial-disclaimer");
    if (testimonialDisclaimer) {
      testimonialDisclaimer.textContent =
        "Disclaimer: Exactly one testimonial is real. All others are fabricated. Customer portraits are illustrative.";
    }

    const refundNotice = document.querySelector(".refund-notice");
    if (refundNotice) {
      const heading = refundNotice.querySelector("h3");
      const copy = refundNotice.querySelector("p");
      if (heading && !heading.textContent.includes("*")) {
        heading.textContent = `${heading.textContent}*`;
      }
      if (copy && !refundNotice.querySelector(".refund-legal-exception")) {
        const exception = document.createElement("p");
        exception.className = "refund-legal-exception";
        exception.textContent = "*Except where required by law.";
        exception.style.marginTop = "0.35rem";
        exception.style.fontSize = "0.82em";
        exception.style.color = getComputedStyle(heading).color;
        copy.insertAdjacentElement("afterend", exception);
      }
    }
  };

  load("./site-core.js?v=20260902-perf-1");
  load("./payment-options.js?v=20260901-1");
  load("./store-click.js?v=20260901-1");

  if (document.readyState === "complete") {
    applyRequestedCopyChanges();
  } else {
    window.addEventListener("load", applyRequestedCopyChanges, { once: true });
  }
})();
