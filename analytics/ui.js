(() => {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const primaryTabs = [...document.querySelectorAll("[data-dashboard-tab]")];
  const primarySections = new Map(
    primaryTabs
      .map((tab) => [tab.dataset.dashboardTab, document.getElementById(tab.dataset.dashboardTab)])
      .filter(([, section]) => section),
  );

  const easeOutCubic = (progress) => 1 - ((1 - progress) ** 3);

  function targetForHash(hash = window.location.hash) {
    if (!hash || hash === "#") return null;
    try {
      return document.getElementById(decodeURIComponent(hash.slice(1)));
    } catch {
      return null;
    }
  }

  function containingDashboard(target) {
    if (!(target instanceof Element)) return null;
    const section = target.closest(".dashboard-section");
    return section && primarySections.has(section.id) ? section : null;
  }

  function openDisclosurePath(target) {
    if (!(target instanceof Element)) return;
    if (target instanceof HTMLDetailsElement) target.open = true;
    let parent = target.parentElement?.closest("details");
    while (parent) {
      parent.open = true;
      parent = parent.parentElement?.closest("details");
    }
  }

  function setCurrentDashboard(id, { focusTab = false } = {}) {
    const nextSection = primarySections.get(id);
    if (!nextSection) return null;

    primarySections.forEach((section, sectionId) => {
      section.hidden = sectionId !== id;
    });

    primaryTabs.forEach((tab) => {
      const selected = tab.dataset.dashboardTab === id;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && focusTab) tab.focus({ preventScroll: true });
    });

    return nextSection;
  }

  function scrollToTarget(target, { focus = false } = {}) {
    openDisclosurePath(target);
    const stickyHeight = document.querySelector(".dashboard-tabs")?.offsetHeight ?? 0;
    const destination = Math.max(
      0,
      window.scrollY + target.getBoundingClientRect().top - stickyHeight - 12,
    );

    const finish = () => {
      if (focus && typeof target.focus === "function") target.focus({ preventScroll: true });
    };

    if (reducedMotion.matches) {
      window.scrollTo(0, destination);
      finish();
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
      } else {
        finish();
      }
    };
    window.requestAnimationFrame(frame);
  }

  function showTarget(target, { focus = false, focusTab = false } = {}) {
    const dashboard = containingDashboard(target);
    if (dashboard) setCurrentDashboard(dashboard.id, { focusTab });
    scrollToTarget(target, { focus });
  }

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const hash = link.getAttribute("href");
      const target = targetForHash(hash);
      if (!target) return;

      event.preventDefault();
      const isSkipLink = link.classList.contains("skip-link");
      showTarget(target, { focus: isSkipLink });
      window.history.pushState(null, "", hash);
    });
  });

  primaryTabs.forEach((tab, index) => {
    tab.addEventListener("keydown", (event) => {
      let nextIndex = null;
      if (event.key === "ArrowRight") nextIndex = (index + 1) % primaryTabs.length;
      if (event.key === "ArrowLeft") nextIndex = (index - 1 + primaryTabs.length) % primaryTabs.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = primaryTabs.length - 1;
      if (nextIndex === null) return;

      event.preventDefault();
      const nextTab = primaryTabs[nextIndex];
      const nextSection = setCurrentDashboard(nextTab.dataset.dashboardTab, { focusTab: true });
      if (!nextSection) return;
      const hash = `#${nextSection.id}`;
      window.history.pushState(null, "", hash);
      scrollToTarget(nextSection);
    });
  });

  window.addEventListener("hashchange", () => {
    const target = targetForHash();
    if (target) showTarget(target);
  });

  const initialTarget = targetForHash();
  const initialDashboard = containingDashboard(initialTarget);
  setCurrentDashboard(initialDashboard?.id ?? "traffic-dashboard");
  if (initialTarget) {
    window.requestAnimationFrame(() => scrollToTarget(initialTarget));
  }
})();
