(() => {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function buildMarquee() {
    const track = document.querySelector("#marquee-track");
    const testimonials = [...document.querySelectorAll(".testimonial-card")];

    if (!track || !testimonials.length) return;

    const entries = testimonials.map((card) => ({
      quote: card.querySelector(".testimonial-quote")?.textContent.trim() ?? "",
      name: card.querySelector("figcaption")?.textContent.trim() ?? "",
    }));

    const makeGroup = () => {
      const group = document.createElement("div");
      group.className = "marquee-group";
      group.setAttribute("aria-hidden", "true");

      entries.forEach(({ quote, name }) => {
        const stars = document.createElement("span");
        stars.className = "marquee-item star-cluster";
        stars.textContent = "★★★★★";

        const item = document.createElement("span");
        item.className = "marquee-item";
        item.textContent = `“${quote}” — ${name}`;

        group.append(stars, item);
      });

      return group;
    };

    track.replaceChildren(makeGroup(), makeGroup());
  }

  function setUpScrollReveals() {
    const elements = [...document.querySelectorAll(".reveal-on-scroll")];

    if (reducedMotion.matches || !("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("in-view"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8%", threshold: 0.08 },
    );

    elements.forEach((element) => observer.observe(element));
  }

  function setUpTestimonials() {
    const button = document.querySelector("#see-more-testimonials");
    const hiddenCards = [...document.querySelectorAll(".testimonial-extra")];

    if (!button || !hiddenCards.length) return;

    button.addEventListener("click", () => {
      hiddenCards.forEach((card, index) => {
        card.hidden = false;
        card.style.animationDelay = `${Math.min(index * 55, 330)}ms`;
        card.classList.add("revealed");
      });

      button.hidden = true;
      hiddenCards[0]?.scrollIntoView({
        behavior: reducedMotion.matches ? "auto" : "smooth",
        block: "center",
      });
    });
  }

  function setUpVisitorCounter() {
    const output = document.querySelector("#visitor-counter");
    if (!output) return;

    const counter = output.closest(".visitor-counter");
    const epoch = Date.parse("2026-08-03T00:00:00-05:00");
    const visitorsPerSecond = 3;
    const tickLength = 1000 / visitorsPerSecond;
    let priorFormatted = "";

    const formatCount = (value) =>
      String(value)
        .padStart(9, "0")
        .replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    const render = () => {
      const elapsed = Math.max(0, Date.now() - epoch);
      const count = Math.floor(elapsed / tickLength);
      const formatted = formatCount(count);

      if (formatted !== priorFormatted) {
        const fragment = document.createDocumentFragment();

        [...formatted].forEach((character, index) => {
          const span = document.createElement("span");

          if (character === ",") {
            span.className = "counter-comma";
          } else {
            span.className = "counter-digit";
            if (priorFormatted[index] && priorFormatted[index] !== character) {
              span.classList.add("changing");
            }
          }

          span.textContent = character;
          fragment.append(span);
        });

        output.replaceChildren(fragment);
        counter?.setAttribute(
          "aria-label",
          `Total website visitors so far: ${count.toLocaleString("en-US")}`,
        );
        priorFormatted = formatted;
      }

      const delay = Math.max(16, tickLength - (Date.now() - epoch) % tickLength);
      window.setTimeout(render, delay);
    };

    render();
  }

  buildMarquee();
  setUpScrollReveals();
  setUpTestimonials();
  setUpVisitorCounter();
})();
