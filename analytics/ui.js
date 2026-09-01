(() => {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const primaryTabs = [...document.querySelectorAll("[data-dashboard-tab]")];
  const primarySections = ["traffic-dashboard", "game-dashboard"]
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  const setCurrentSection = (id) => {
    primaryTabs.forEach((tab) => {
      if (tab.dataset.dashboardTab === id) {
        tab.setAttribute("aria-current", "location");
      } else {
        tab.removeAttribute("aria-current");
      }
    });
  };

  const easeOutCubic = (progress) => 1 - ((1 - progress) ** 3);

  const scrollToTarget = (target, { focus = false } = {}) => {
    if (target instanceof HTMLDetailsElement) target.open = true;
    const stickyHeight = document.querySelector(".dashboard-tabs")?.offsetHeight ?? 0;
    const destination = Math.max(
      0,
      window.scrollY + target.getBoundingClientRect().top - stickyHeight - 12,
    );

    if (reducedMotion.matches) {
      window.scrollTo(0, destination);
      if (focus) target.focus({ preventScroll: true });
      return;
    }

    const start = window.scrollY;
    const distance = destination - start;
    const startTime = window.performance.now();
    const duration = 360;

    const frame = (now) => {
      const progress = Math.min(1, (now - startTime) / duration);
      window.scrollTo(0, start + distance * easeOutCubic(progress));
      if (progress < 1) {
        window.requestAnimationFrame(frame);
      } else if (focus) {
        target.focus({ preventScroll: true });
      }
    };
    window.requestAnimationFrame(frame);
  };

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const hash = link.getAttribute("href");
      if (!hash || hash === "#") return;
      const target = document.querySelector(hash);
      if (!target) return;
      event.preventDefault();
      const focusTarget = link.classList.contains("skip-link");
      scrollToTarget(target, { focus: focusTarget });
      window.history.pushState(null, "", hash);

      const dashboardSection = target.closest(".dashboard-section");
      if (dashboardSection) setCurrentSection(dashboardSection.id);
    });
  });

  if ("IntersectionObserver" in window && primarySections.length) {
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) setCurrentSection(visible.target.id);
      },
      { rootMargin: "-22% 0px -58% 0px", threshold: [0, 0.05, 0.2] },
    );
    primarySections.forEach((section) => sectionObserver.observe(section));
  }

  window.addEventListener("hashchange", () => {
    const target = document.querySelector(window.location.hash);
    if (!target) return;
    if (target instanceof HTMLDetailsElement) target.open = true;
    const dashboardSection = target.closest(".dashboard-section");
    if (dashboardSection) setCurrentSection(dashboardSection.id);
  });
})();
