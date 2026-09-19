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
      (document.querySelector("dialog[open]") ?? document.body).append(temporaryField);
    }

    try {
      temporaryField.focus();
      temporaryField.select();
      temporaryField.setSelectionRange(0, temporaryField.value.length);
      return document.execCommand("copy");
    } finally {
      if (isTemporary) temporaryField.remove();
    }
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

  function setUpTextContacts() {
    // This acknowledgement masks the display, not the public website's source.
    const phoneNumber = "612-443-6846";
    const contacts = [...document.querySelectorAll("[data-text-contact]")]
      .map((card) => ({
        gate: card.querySelector("[data-text-gate]"),
        revealButton: card.querySelector("[data-reveal-phone]"),
        details: card.querySelector("[data-text-details]"),
        number: card.querySelector("[data-phone-number]"),
        smsLink: card.querySelector("[data-sms-link]"),
        copyButton: card.querySelector("[data-copy-phone]"),
        status: card.querySelector("[data-phone-status]"),
      }))
      .filter((contact) => Object.values(contact).every(Boolean));

    contacts.forEach((contact) => {
      contact.revealButton.addEventListener("click", () => {
        // Agreement applies across this page and resets when the page reloads.
        contacts.forEach((entry) => {
          entry.number.textContent = phoneNumber;
          entry.smsLink.href = `sms:+1${phoneNumber.replace(/\D/g, "")}`;
          entry.smsLink.setAttribute("aria-label", `Send a text to the Movie Master at ${phoneNumber}`);
          entry.revealButton.setAttribute("aria-expanded", "true");
          entry.details.hidden = false;
          entry.number.closest("[data-phone-display]")?.removeAttribute("hidden");
          entry.gate.hidden = true;
          entry.smsLink.dispatchEvent(new Event("phone-revealed"));
        });
        contact.smsLink.focus();
      });

      contact.copyButton.addEventListener("click", async () => {
        if (contact.details.hidden) return;
        let copied = false;
        try {
          copied = await copyText(phoneNumber);
        } catch {
          // Leave the displayed number available for manual selection.
        }
        contact.copyButton.textContent = copied ? "COPIED!" : "COPY NUMBER";
        contact.status.classList.toggle("visually-hidden", copied);
        contact.status.textContent = copied
          ? "NUMBER COPIED. TEXT ONLY, PLEASE."
          : "Select the number to copy it.";
        contact.copyButton.focus();
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
    if (!counter) return;

    const apiBase = "https://movie-master-visitor-counter.isasto.workers.dev";
    const visitorIdKey = "movie-master-visitor-id";
    const pollInterval = 60 * 1000;
    let priorFormatted = "";
    let counterIsVisible = false;
    let initialRequestDone = false;
    let pollTimer = null;
    let pollInFlight = false;
    let lastSuccessfulFetchAt = 0;

    const render = (count) => {
      const formatted = count.toLocaleString("en-US");
      if (formatted === priorFormatted) return;

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
      counter.setAttribute(
        "aria-label",
        `THIS SITE HAS HAD ${formatted} VISITORS AND COUNTING!`,
      );
      priorFormatted = formatted;
    };

    const getVisitorId = () => {
      try {
        let visitorId = window.localStorage.getItem(visitorIdKey);
        if (!visitorId) {
          visitorId = crypto.randomUUID();
          window.localStorage.setItem(visitorIdKey, visitorId);
        }
        return visitorId;
      } catch {
        return null;
      }
    };

    const fetchCount = async () => {
      const response = await fetch(`${apiBase}/count`, {
        method: "GET",
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`Counter request failed: ${response.status}`);
      const data = await response.json();
      if (!Number.isSafeInteger(data.count) || data.count < 0) {
        throw new Error("Counter returned an invalid count");
      }
      return data.count;
    };

    const registerVisit = async () => {
      const visitorId = getVisitorId();

      if (!visitorId) {
        const count = await fetchCount();
        lastSuccessfulFetchAt = Date.now();
        render(count);
        return;
      }

      const response = await fetch(`${apiBase}/visit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId }),
        cache: "no-store",
      });

      if (!response.ok) throw new Error(`Counter request failed: ${response.status}`);
      const data = await response.json();
      if (!Number.isSafeInteger(data.count) || data.count < 0) {
        throw new Error("Counter returned an invalid count");
      }
      lastSuccessfulFetchAt = Date.now();
      render(data.count);
    };

    const shouldPoll = () =>
      initialRequestDone &&
      counterIsVisible &&
      document.visibilityState === "visible" &&
      document.hasFocus();

    const stopPolling = () => {
      if (pollTimer !== null) {
        window.clearTimeout(pollTimer);
        pollTimer = null;
      }
    };

    const scheduleNextPoll = () => {
      stopPolling();
      if (!shouldPoll()) return;
      pollTimer = window.setTimeout(runPoll, pollInterval);
    };

    const runPoll = async () => {
      stopPolling();
      if (!shouldPoll() || pollInFlight) return;

      pollInFlight = true;
      try {
        const count = await fetchCount();
        lastSuccessfulFetchAt = Date.now();
        render(count);
      } catch (error) {
        console.error("Unable to refresh Movie Master visitor count", error);
      } finally {
        pollInFlight = false;
        scheduleNextPoll();
      }
    };

    const syncPolling = () => {
      stopPolling();
      if (!shouldPoll()) return;
      if (lastSuccessfulFetchAt && Date.now() - lastSuccessfulFetchAt >= pollInterval) {
        runPoll();
        return;
      }
      scheduleNextPoll();
    };

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          counterIsVisible = Boolean(entry?.isIntersecting && entry.intersectionRatio > 0);
          syncPolling();
        },
        { threshold: 0.01 },
      );
      observer.observe(counter);
    } else {
      const updateFallbackVisibility = () => {
        const rect = counter.getBoundingClientRect();
        counterIsVisible =
          rect.bottom > 0 &&
          rect.top < window.innerHeight &&
          rect.right > 0 &&
          rect.left < window.innerWidth;
        syncPolling();
      };
      window.addEventListener("scroll", updateFallbackVisibility, { passive: true });
      window.addEventListener("resize", updateFallbackVisibility);
      updateFallbackVisibility();
    }

    document.addEventListener("visibilitychange", syncPolling);
    window.addEventListener("focus", syncPolling);
    window.addEventListener("blur", syncPolling);

    registerVisit()
      .catch(async (error) => {
        console.error("Unable to register Movie Master visitor", error);
        try {
          const count = await fetchCount();
          lastSuccessfulFetchAt = Date.now();
          render(count);
        } catch (fallbackError) {
          console.error("Unable to load Movie Master visitor count", fallbackError);
        }
      })
      .finally(() => {
        initialRequestDone = true;
        syncPolling();
      });
  }

  function setUpPurchaseFlow() {
    const dialog = document.querySelector("#purchase-dialog");
    const closeButton = document.querySelector("#purchase-dialog-close");
    const requestPanel = document.querySelector("#purchase-request");
    const dialogTitle = document.querySelector("#purchase-dialog-title");
    const packageSelector = document.querySelector("#purchase-package-selector");
    const packageSummary = document.querySelector("#purchase-summary");
    const packageName = document.querySelector("#purchase-package-name");
    const packageDetail = document.querySelector("#purchase-package-detail");
    const changePackageButton = document.querySelector("#purchase-change-package");
    const messageDetails = document.querySelector("#purchase-message-details");
    const editMessageButton = document.querySelector("#purchase-edit-message");
    const messageField = document.querySelector("#purchase-message");
    const messageHelp = document.querySelector("#purchase-message-help");
    const copyMessageButton = document.querySelector("#copy-message-button");
    const messageCopyStatus = document.querySelector("#message-copy-status");
    const emailLink = document.querySelector("#purchase-email-link");
    const emailFallback = document.querySelector("#purchase-email-fallback");
    const facebookLink = document.querySelector("#purchase-facebook-link");
    const smsLink = dialog?.querySelector("[data-sms-link]");
    const messageFirstButton = document.querySelector("#purchase-message-first");
    const paymentNameRow = document.querySelector("#purchase-payment-name-row");
    const paymentNameField = document.querySelector("#purchase-payment-name");
    const paymentNameLabel = document.querySelector("#purchase-payment-name-label");
    const deliveryNote = document.querySelector("#purchase-delivery");
    const payments = document.querySelector("#purchase-payments");
    const paymentTitle = document.querySelector("#purchase-payment-title");
    const paymentStatus = document.querySelector("#payment-copy-status");
    const paymentMethods = [...document.querySelectorAll('[name="purchase-payment-method"]')];
    const paymentRecipient = document.querySelector("#purchase-payment-recipient");
    const recipientLabel = document.querySelector("#purchase-recipient-label");
    const paymentHelp = document.querySelector("#purchase-payment-help");
    const paymentCopyButton = document.querySelector("#purchase-copy-recipient");
    const paymentLink = document.querySelector("#purchase-payment-open");
    const paymentLinkLabel = document.querySelector("#purchase-payment-open-label");
    const instructionTitle = document.querySelector("#purchase-instruction-title");
    const instructionDetail = document.querySelector("#purchase-instruction-detail");
    const packageButtons = [...document.querySelectorAll("[data-package]")];
    const packageSelectors = [...document.querySelectorAll("[data-package-select]")];
    const generalLaunchButtons = [...document.querySelectorAll("[data-purchase-launch]")];

    if (!dialog || !closeButton || !requestPanel || !messageField || !emailLink ||
        !packageSummary || !changePackageButton || !paymentRecipient || !paymentLink ||
        !editMessageButton || !paymentNameField || !smsLink) return;

    const emailSubject = "Movie Master Package Purchase Request";
    const packageMessages = {
      five:
        "Hello Mr. Movie Master sir. I would like 5 Blockbuster Smash Hit Masterpiece recommendations for $5. Please send my recommendations here. Thank you.",
      ten:
        "Hello Mr. Movie Master sir. I would like 10 Blockbuster Smash Hit Masterpiece recommendations for $10. Please send my recommendations here. Thank you.",
      vip:
        "Hello Mr. Movie Master sir. I would like the $20 VIP Package: 20 Blockbuster Smash Hit Masterpiece recommendations, 3 R&B music videos, and my VIP certificate. Please send my recommendations here. Thank you.",
      support:
        "Hello Mr. Movie Master, sir. I would like to support your website and help your business grow. This is a contribution, with no recommendations needed. Thank you.",
      lifetime:
        "Hello Mr. Movie Master sir. I am interested in applying for the Ultimate Lifetime Membership for $1,000,000. I understand that membership requires your personal approval. Please tell me what I must do to prove that I am worthy. Thank you.",
    };
    const packageSubjects = {
      support: "Support the Movie Master",
      lifetime: "Ultimate Lifetime Membership Inquiry",
    };
    const packagePrices = { five: 5, ten: 10, vip: 20 };
    const packageNames = {
      five: "5 recommendations · $5",
      ten: "10 recommendations · $10",
      vip: "VIP package · $20",
      support: "Help cover website costs and grow the business.",
      lifetime: "Ultimate Lifetime Membership",
    };
    const methods = {
      paypal: {
        name: "PayPal",
        recipient: "refreshingspring148@gmail.com",
        url: "https://www.paypal.com/myaccount/transfer/",
        copyLabel: "Copy PayPal email",
      },
      venmo: {
        name: "Venmo",
        recipient: "@Freshwater55",
        url: "https://venmo.com/Freshwater55",
        copyLabel: "Copy Venmo username",
      },
      cashapp: {
        name: "Cash App",
        recipient: "$Livinglife5444",
        url: "https://cash.app/$Livinglife5444",
        copyLabel: "Copy Cash App Cashtag",
      },
    };
    const sessionKey = "movie-master-purchase-draft-v1";
    const sessionMaxAge = 4 * 60 * 60 * 1000;
    const drafts = Object.create(null);
    let launchElement = null;
    let selectedPackage = null;
    let selectedMethod = "paypal";
    let paymentOpened = false;

    const isRecommendationPackage = () => Object.hasOwn(packagePrices, selectedPackage);

    const rememberDraft = () => {
      if (!selectedPackage) return;
      drafts[selectedPackage] = {
        message: messageField.value.slice(0, 4000),
        paymentName: paymentNameField.value.slice(0, 120),
      };
    };

    const saveSession = () => {
      if (!selectedPackage) return;
      rememberDraft();
      try {
        // This tab only; never a payment receipt, order, or persistent profile.
        sessionStorage.setItem(sessionKey, JSON.stringify({
          version: 1,
          updatedAt: Date.now(),
          packageKey: selectedPackage,
          method: selectedMethod,
          paymentOpened,
          open: dialog.open,
          drafts,
        }));
      } catch {
        // Storage may be disabled or full. The current window remains usable.
      }
    };

    const readSession = () => {
      try {
        const value = JSON.parse(sessionStorage.getItem(sessionKey));
        const age = Date.now() - value?.updatedAt;
        if (value?.version !== 1 || !Number.isFinite(age) || age < 0 || age > sessionMaxAge ||
            !Object.hasOwn(packageMessages, value.packageKey) || !Object.hasOwn(methods, value.method)) return null;
        Object.keys(packageMessages).forEach((key) => {
          const draft = value.drafts?.[key];
          if (typeof draft?.message === "string" && typeof draft?.paymentName === "string") {
            drafts[key] = { message: draft.message.slice(0, 4000), paymentName: draft.paymentName.slice(0, 120) };
          }
        });
        return value;
      } catch {
        return null;
      }
    };

    const composedMessage = () => {
      const name = paymentNameField.value.trim();
      const details = isRecommendationPackage() && name
        ? "\n\nName on payment: " + name + "\nPayment method: " + methods[selectedMethod].name
        : "";
      return messageField.value.trim() + details;
    };

    const updateMessageLinks = () => {
      const message = composedMessage();
      const subject = packageSubjects[selectedPackage] ?? emailSubject;
      emailLink.href = "mailto:" + movieMasterEmail + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(message);
      // Keep the number gated. Apple documents number-only SMS links; retain
      // the copy fallback there, and use the standard body field elsewhere.
      if (!smsLink.closest("[data-text-details]").hidden && smsLink.hasAttribute("href")) {
        const numberOnly = smsLink.getAttribute("href").split("?")[0];
        const appleDevice = /iPad|iPhone|iPod|Macintosh|Mac OS X/.test(navigator.userAgent);
        smsLink.href = numberOnly + (appleDevice ? "" : "?body=" + encodeURIComponent(message));
      }
    };

    const updatePaymentHelp = () => {
      if (!selectedPackage) return;
      const amount = isRecommendationPackage() ? "$" + packagePrices[selectedPackage] : "your amount";
      paymentHelp.textContent = selectedMethod === "paypal"
        ? "Copy this email into PayPal and enter " + amount + ". Then return here."
        : "Check the recipient and enter " + amount + " in " + methods[selectedMethod].name + ". Then return here.";
    };

    const updateInstruction = () => {
      instructionDetail.textContent = selectedPackage === "lifetime"
        ? "Membership requires his personal approval."
        : selectedPackage === "support"
          ? "Thank you for your support. No recommendations are included. You can message him before or after contributing."
          : paymentOpened
            ? "If you’ve paid, add your payment name and send a message below. Recommendations aren’t automatic."
            : "Recommendations aren’t automatic—message him after paying.";
    };

    const clearPaymentStatus = () => {
      paymentStatus.textContent = "";
      paymentStatus.classList.add("visually-hidden");
      paymentCopyButton.textContent = "Copy";
    };

    const clearCopyStatuses = () => {
      messageCopyStatus.textContent = "";
      messageCopyStatus.classList.add("visually-hidden");
      copyMessageButton.textContent = "Copy message";
      clearPaymentStatus();
    };

    const selectPaymentMethod = (key) => {
      const method = methods[key];
      if (!method) return;
      selectedMethod = key;
      paymentMethods.forEach((input) => { input.checked = input.value === key; });
      paymentNameLabel.textContent = "Name on " + method.name + " payment (if you’ve paid)";
      recipientLabel.textContent = method.name + " recipient";
      paymentRecipient.textContent = method.recipient;
      paymentCopyButton.setAttribute("aria-label", method.copyLabel);
      paymentLink.href = method.url;
      paymentLink.setAttribute("aria-label", "Open " + method.name + " in a new tab");
      paymentLinkLabel.textContent = "OPEN " + method.name.toUpperCase();
      clearPaymentStatus();
      updatePaymentHelp();
      updateMessageLinks();
    };

    const sizeMessageField = () => {
      if (messageDetails.hidden || requestPanel.hidden) return;
      messageField.style.height = "auto";
      messageField.style.height = (messageField.scrollHeight + 2) + "px";
    };

    const selectPackage = (packageKey) => {
      if (!Object.hasOwn(packageMessages, packageKey)) return;
      rememberDraft();
      if (selectedPackage !== packageKey) paymentOpened = false;
      selectedPackage = packageKey;
      const isSupport = packageKey === "support";
      const isLifetime = packageKey === "lifetime";
      packageSelectors.forEach((button) => {
        button.setAttribute("aria-pressed", String(button.dataset.packageSelect === packageKey));
      });
      packageSelector.hidden = true;
      changePackageButton.hidden = isSupport || isLifetime;
      changePackageButton.setAttribute("aria-expanded", "false");
      packageSummary.hidden = false;
      packageName.textContent = packageNames[packageKey];
      packageDetail.textContent = packageKey === "vip"
        ? "20 recommendations, 3 R&B videos + VIP certificate"
        : "";
      packageDetail.hidden = !packageDetail.textContent;
      dialogTitle.textContent = isSupport ? "SUPPORT THE MOVIE MASTER"
        : isLifetime ? "MEMBERSHIP INQUIRY" : "YOUR PACKAGE";
      payments.hidden = isLifetime;
      messageFirstButton.hidden = isSupport || isLifetime;
      paymentTitle.textContent = isSupport ? "CONTRIBUTE ANY AMOUNT"
        : isLifetime ? "" : "1. PAY $" + packagePrices[packageKey];
      instructionTitle.textContent = isLifetime
        ? "MESSAGE THE MOVIE MASTER TO APPLY"
        : isSupport ? "MESSAGE HIM (OPTIONAL)" : "2. MESSAGE THE MOVIE MASTER";
      paymentNameRow.hidden = !isRecommendationPackage();
      deliveryNote.hidden = !isRecommendationPackage();
      updateInstruction();
      messageDetails.hidden = true;
      editMessageButton.setAttribute("aria-expanded", "false");
      messageField.value = drafts[packageKey]?.message ?? packageMessages[packageKey];
      paymentNameField.value = drafts[packageKey]?.paymentName ?? "";
      messageHelp.textContent = isRecommendationPackage()
        ? "Edit your request or add movie preferences. Your payment name and selected method are added if you fill in the name above. Your draft stays in this tab."
        : "Edit your message before sending. Your draft stays in this tab.";
      emailFallback.hidden = true;
      updatePaymentHelp();
      updateMessageLinks();
      requestPanel.hidden = false;
      clearCopyStatuses();
    };

    const clearPackageSelection = () => {
      packageSelectors.forEach((button) => button.setAttribute("aria-pressed", "false"));
      dialogTitle.textContent = "CHOOSE YOUR PACKAGE";
      packageSelector.hidden = false;
      packageSummary.hidden = true;
      changePackageButton.setAttribute("aria-expanded", "false");
      requestPanel.hidden = true;
      selectedPackage = null;
      messageDetails.hidden = true;
      messageField.value = "";
      clearCopyStatuses();
    };

    const openDialog = (packageKey, trigger) => {
      launchElement = trigger;
      if (packageKey) selectPackage(packageKey);
      else if (isRecommendationPackage()) selectPackage(selectedPackage);
      else clearPackageSelection();
      if (typeof dialog.showModal === "function") {
        if (!dialog.open) dialog.showModal();
      } else {
        dialog.setAttribute("open", "");
      }
      saveSession();
    };

    const closeDialog = () => {
      if (typeof dialog.close === "function") dialog.close();
      else {
        dialog.removeAttribute("open");
        saveSession();
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
      button.addEventListener("click", () => {
        selectPackage(button.dataset.packageSelect);
        saveSession();
        // Keep keyboard focus in view when the package choices collapse.
        paymentMethods.find((input) => input.checked)?.focus();
      });
    });
    changePackageButton.addEventListener("click", () => {
      packageSelector.hidden = !packageSelector.hidden;
      changePackageButton.setAttribute("aria-expanded", String(!packageSelector.hidden));
      if (!packageSelector.hidden) {
        packageSelectors.find((button) => button.getAttribute("aria-pressed") === "true")?.focus();
      }
    });
    paymentMethods.forEach((input) => {
      input.addEventListener("change", () => {
        if (!input.checked) return;
        selectPaymentMethod(input.value);
        clearCopyStatuses();
        saveSession();
      });
    });

    closeButton.addEventListener("click", closeDialog);
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) closeDialog();
    });
    dialog.addEventListener("close", () => {
      saveSession();
      launchElement?.focus();
    });

    paymentLink.addEventListener("click", () => {
      // Opening a provider says nothing about whether a payment succeeded.
      paymentOpened = true;
      updateInstruction();
      saveSession();
    });

    messageFirstButton.addEventListener("click", () => {
      instructionDetail.textContent = "You can message him before paying. Leave the payment name blank if you haven’t paid yet.";
      const firstContact = [...dialog.querySelectorAll(".purchase-contact-button")]
        .find((button) => !button.closest("[hidden]"));
      firstContact?.focus();
    });

    const showMessageEditor = () => {
      messageDetails.hidden = false;
      editMessageButton.setAttribute("aria-expanded", "true");
      sizeMessageField();
    };

    editMessageButton.addEventListener("click", () => {
      if (messageDetails.hidden) {
        showMessageEditor();
        messageField.focus();
      } else {
        messageDetails.hidden = true;
        editMessageButton.setAttribute("aria-expanded", "false");
      }
    });

    [messageField, paymentNameField].forEach((field) => {
      field.addEventListener("input", () => {
        clearCopyStatuses();
        updateMessageLinks();
        sizeMessageField();
        saveSession();
      });
    });
    smsLink.addEventListener("phone-revealed", updateMessageLinks);

    paymentCopyButton.addEventListener("click", async () => {
      const methodKey = selectedMethod;
      const method = methods[methodKey];
      let copied = false;
      try {
        copied = await copyText(method.recipient);
      } catch {
        // Keep the displayed recipient available for manual selection.
      }
      // Do not show stale feedback if the method changed while copying.
      if (methodKey !== selectedMethod) return;
      paymentCopyButton.textContent = copied ? "Copied!" : "Copy";
      paymentStatus.classList.toggle("visually-hidden", copied);
      paymentStatus.textContent = copied
        ? method.name + " recipient copied."
        : "Select and copy this recipient: " + method.recipient;
      paymentCopyButton.focus();
    });

    const copyMessage = async (channel = "") => {
      const message = composedMessage();
      const packageKey = selectedPackage;
      let copied = false;
      try {
        // Copy the complete message, including the separate payment-name field.
        if (message) copied = await copyText(message);
      } catch {
        // Keep the message available for manual selection.
      }
      if (packageKey !== selectedPackage || message !== composedMessage()) return;
      copyMessageButton.textContent = copied ? "Copied!" : "Copy message";
      messageCopyStatus.classList.toggle("visually-hidden", copied && !channel);
      messageCopyStatus.textContent = copied
        ? channel === "Facebook"
          ? "Message copied. Open Message on his Facebook profile and paste it."
          : channel === "text"
            ? "Message copied. Paste it if your text app leaves the message blank."
            : "Message copied, including any payment details you entered."
        : message
          ? "Copy isn’t available. Select your message below, and include your payment name and method if you’ve paid."
          : "Write a message below before copying.";
      if (!copied) showMessageEditor();
      if (!channel) (copied ? copyMessageButton : messageField).focus();
    };

    copyMessageButton.addEventListener("click", () => { void copyMessage(); });
    facebookLink.addEventListener("click", () => { void copyMessage("Facebook"); });
    smsLink.addEventListener("click", () => { void copyMessage("text"); });
    emailLink.addEventListener("click", () => { emailFallback.hidden = false; });

    window.addEventListener("resize", sizeMessageField);
    window.addEventListener("pagehide", saveSession);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden" && dialog.open) saveSession();
    });

    const saved = readSession();
    if (saved) {
      selectPaymentMethod(saved.method);
      selectPackage(saved.packageKey);
      paymentOpened = saved.paymentOpened === true;
      updateInstruction();
      if (saved.open === true) {
        const trigger = generalLaunchButtons.find((button) => button.getClientRects().length);
        openDialog(saved.packageKey, trigger);
      }
    }
    selectPaymentMethod(selectedMethod);
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
  setUpTextContacts();
  setUpActionBar();
})();
