(() => {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const movieMasterEmail = "rcravens60@gmail.com";

  async function copyText(text, selectableElement = null) {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // Continue to the selection-based fallback.
      }
    }

    const temporaryField = selectableElement ?? document.createElement("textarea");
    const isTemporary = !selectableElement;

    if (isTemporary) {
      temporaryField.value = text;
      temporaryField.setAttribute("readonly", "");
      temporaryField.style.position = "fixed";
      temporaryField.style.opacity = "0";
      temporaryField.style.pointerEvents = "none";
      document.body.append(temporaryField);
    }

    temporaryField.focus();
    temporaryField.select();
    temporaryField.setSelectionRange(0, temporaryField.value.length);
    const copied = document.execCommand("copy");
    if (isTemporary) temporaryField.remove();
    return copied;
  }

  function setUpEmailCopyButtons() {
    const buttons = [...document.querySelectorAll("[data-copy-email]")];
    const statuses = [...document.querySelectorAll("[data-email-copy-status]")];

    buttons.forEach((button) => {
      const statusId = button.getAttribute("aria-describedby");
      const status = statusId ? document.getElementById(statusId) : null;
      if (!status) return;

      button.addEventListener("click", async () => {
        const copied = await copyText(movieMasterEmail);
        statuses.forEach((entry) => {
          entry.textContent = "";
        });
        status.textContent = copied ? "EMAIL ADDRESS COPIED" : "";
        button.focus();
      });
    });
  }

  function buildMarquee() {
    const track = document.querySelector("#marquee-track");
    const testimonials = [...document.querySelectorAll(".testimonial-card.testimonial-marquee-source")];

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
    const cards = [
      ...document.querySelectorAll(".testimonial-mobile-extra, .testimonial-extra"),
    ];
    const mobileTestimonials = window.matchMedia("(max-width: 560px)");

    if (!button || !cards.length) return;

    const isCollapsed = (card) =>
      card.hidden ||
      (mobileTestimonials.matches &&
        card.classList.contains("testimonial-mobile-extra") &&
        !card.classList.contains("revealed"));

    const updateButton = () => {
      button.hidden = !cards.some(isCollapsed);
    };

    button.addEventListener("click", () => {
      const batchSize = mobileTestimonials.matches ? 4 : 8;
      const nextBatch = cards.filter(isCollapsed).slice(0, batchSize);

      nextBatch.forEach((card, index) => {
        card.hidden = false;
        card.style.animationDelay = `${Math.min(index * 55, 330)}ms`;
        card.classList.add("revealed");
      });

      updateButton();
      nextBatch[0]?.scrollIntoView({
        behavior: reducedMotion.matches ? "auto" : "smooth",
        block: "center",
      });
    });

    mobileTestimonials.addEventListener?.("change", updateButton);
    updateButton();
  }

  function setUpVisitorCounter() {
    const output = document.querySelector("#visitor-counter");
    if (!output) return;

    const counter = output.closest(".visitor-counter");
    const epoch = Date.parse("2026-08-03T00:00:00-05:00");
    const tickLength = 2500;
    let priorFormatted = "";

    const formatCount = (value) => value.toLocaleString("en-US");

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
          `THE MOVIE MASTER HAS ${count.toLocaleString("en-US")} SATISFIED CUSTOMERS AND COUNTING!`,
        );
        priorFormatted = formatted;
      }

      const delay = Math.max(16, tickLength - (Date.now() - epoch) % tickLength);
      window.setTimeout(render, delay);
    };

    render();
  }

  function setUpPurchaseFlow() {
    const dialog = document.querySelector("#purchase-dialog");
    const closeButton = document.querySelector("#purchase-dialog-close");
    const requestPanel = document.querySelector("#purchase-request");
    const messageField = document.querySelector("#purchase-message");
    const copyMessageButton = document.querySelector("#copy-message-button");
    const messageCopyStatus = document.querySelector("#message-copy-status");
    const emailLink = document.querySelector("#purchase-email-link");
    const emailCopyStatus = document.querySelector("#email-copy-status");
    const packageButtons = [...document.querySelectorAll("[data-package]")];
    const packageSelectors = [...document.querySelectorAll("[data-package-select]")];
    const generalLaunchButtons = [...document.querySelectorAll("[data-purchase-launch]")];

    if (
      !dialog ||
      !closeButton ||
      !requestPanel ||
      !messageField ||
      !copyMessageButton ||
      !messageCopyStatus ||
      !emailLink ||
      !emailCopyStatus
    ) {
      return;
    }

    const emailAddress = movieMasterEmail;
    const emailSubject = "Movie Master Package Purchase Request";
    const packageMessages = {
      five:
        "Hello Mr. Movie Master sir. I am interested in purchasing 5 Blockbuster Smash Hit Masterpieces for $5. Please provide your payment information so I can pay you via PayPal or Cash App. Thank you.",
      ten:
        "Hello Mr. Movie Master sir. I am interested in purchasing 10 Blockbuster Smash Hit Masterpieces for $10. Please provide your payment information so I can pay you via PayPal or Cash App. Thank you.",
      vip:
        "Hello Mr. Movie Master sir. I am interested in purchasing the Movie Master VIP Package for $20. It includes 20 Blockbuster Smash Hit Masterpieces, 3 of the best R&B music videos ever made, and a VIP certificate to prove my VIP status. Please provide your payment information so I can pay you via PayPal or Cash App. Thank you.",
    };
    let launchElement = null;

    const clearCopyStatuses = () => {
      messageCopyStatus.textContent = "";
      emailCopyStatus.textContent = "";
    };

    const sizeMessageField = () => {
      messageField.style.height = "auto";
      messageField.style.height = `${messageField.scrollHeight + 2}px`;
    };

    const selectPackage = (packageKey) => {
      const message = packageMessages[packageKey];
      if (!message) return;

      packageSelectors.forEach((button) => {
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.packageSelect === packageKey),
        );
      });

      messageField.value = message;
      emailLink.href = `mailto:${emailAddress}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(message)}`;
      requestPanel.hidden = false;
      clearCopyStatuses();
      window.requestAnimationFrame(() => {
        sizeMessageField();
      });
    };

    const clearPackageSelection = () => {
      packageSelectors.forEach((button) => button.setAttribute("aria-pressed", "false"));
      requestPanel.hidden = true;
      messageField.value = "";
      clearCopyStatuses();
    };

    const openDialog = (packageKey, trigger) => {
      launchElement = trigger;

      if (packageKey) {
        selectPackage(packageKey);
      } else {
        clearPackageSelection();
      }

      if (typeof dialog.showModal === "function") {
        if (!dialog.open) dialog.showModal();
      } else {
        dialog.setAttribute("open", "");
      }
    };

    const closeDialog = () => {
      if (typeof dialog.close === "function") {
        dialog.close();
      } else {
        dialog.removeAttribute("open");
        launchElement?.focus();
      }
    };

    packageButtons.forEach((button) => {
      button.addEventListener("click", () => openDialog(button.dataset.package, button));
    });

    generalLaunchButtons.forEach((button) => {
      button.addEventListener("click", () => openDialog(null, button));
    });

    packageSelectors.forEach((button) => {
      button.addEventListener("click", () => selectPackage(button.dataset.packageSelect));
    });

    closeButton.addEventListener("click", closeDialog);
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) closeDialog();
    });
    dialog.addEventListener("close", () => launchElement?.focus());

    copyMessageButton.addEventListener("click", async () => {
      const copied = await copyText(messageField.value, messageField);
      messageCopyStatus.textContent = copied ? "MESSAGE COPIED" : "";
      copyMessageButton.focus();
    });

    window.addEventListener("resize", () => {
      if (!requestPanel.hidden) sizeMessageField();
    });
  }

  function setUpActionBar() {
    const menuButton = document.querySelector("#mobile-menu-button");
    const menuPanel = document.querySelector("#mobile-nav-panel");
    const desktopLinks = [...document.querySelectorAll(".action-bar-desktop a[href^='#']")];

    if (!menuButton || !menuPanel) return;

    const closeMenu = () => {
      menuPanel.hidden = true;
      menuButton.setAttribute("aria-expanded", "false");
    };

    const openMenu = () => {
      menuPanel.hidden = false;
      menuButton.setAttribute("aria-expanded", "true");
    };

    menuButton.addEventListener("click", () => {
      if (menuPanel.hidden) openMenu();
      else closeMenu();
    });

    menuPanel.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeMenu);
    });

    document.addEventListener("pointerdown", (event) => {
      if (menuPanel.hidden || menuPanel.contains(event.target) || menuButton.contains(event.target)) {
        return;
      }
      closeMenu();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || menuPanel.hidden) return;
      closeMenu();
      menuButton.focus();
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 820) closeMenu();
    });

    if (!desktopLinks.length) return;

    const targets = desktopLinks
      .map((link) => ({ link, target: document.querySelector(link.getAttribute("href")) }))
      .filter(({ target }) => target);
    let ticking = false;

    const updateActiveLink = () => {
      ticking = false;
      const headerHeight = document.querySelector(".site-header-strip")?.getBoundingClientRect().height ?? 0;
      const threshold = headerHeight + 30;
      let activeTarget = null;

      targets.forEach((entry) => {
        if (entry.target.getBoundingClientRect().top <= threshold) activeTarget = entry;
      });

      targets.forEach(({ link }) => {
        const isActive = activeTarget?.link === link;
        link.classList.toggle("is-active", isActive);
        if (isActive) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    };

    const requestUpdate = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(updateActiveLink);
    };

    updateActiveLink();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
  }

  buildMarquee();
  setUpScrollReveals();
  setUpTestimonials();
  setUpVisitorCounter();
  setUpPurchaseFlow();
  setUpEmailCopyButtons();
  setUpActionBar();
})();
