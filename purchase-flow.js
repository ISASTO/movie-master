(() => {
  "use strict";

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

  function createPurchaseDialogViewport(dialog) {
    const page = document.documentElement;
    const body = document.body;
    const content = dialog.querySelector(".purchase-dialog-content");
    const viewport = window.visualViewport;
    let pagePosition = null;
    let viewportFrame = 0;
    let keepFocusVisible = false;

    const updateViewport = () => {
      if (!pagePosition) return;
      // The keyboard can shrink the visible screen without changing 100dvh.
      dialog.style.setProperty("--purchase-viewport-height", (viewport?.height || window.innerHeight) + "px");
      dialog.style.setProperty("--purchase-viewport-width", (viewport?.width || window.innerWidth) + "px");
      dialog.style.setProperty("--purchase-viewport-top", Math.max(0, viewport?.offsetTop || 0) + "px");
      dialog.style.setProperty("--purchase-viewport-left", Math.max(0, viewport?.offsetLeft || 0) + "px");
    };

    const revealFocusedField = () => {
      const field = document.activeElement;
      if (!content || !content.contains(field) || !field.matches("input, textarea")) return;
      const visible = content.getBoundingClientRect();
      const focused = field.getBoundingClientRect();
      // Scroll only checkout, never the fixed page or the browser viewport.
      if (focused.top < visible.top + 12) {
        content.scrollTop -= visible.top + 12 - focused.top;
      } else if (focused.bottom > visible.bottom - 12) {
        content.scrollTop += Math.min(focused.bottom - visible.bottom + 12, focused.top - visible.top - 12);
      }
    };

    const queueViewportUpdate = (event) => {
      if (!pagePosition) return;
      if (event.type !== "scroll") keepFocusVisible = true;
      if (viewportFrame) return;
      viewportFrame = window.requestAnimationFrame(() => {
        viewportFrame = 0;
        updateViewport();
        if (keepFocusVisible && pagePosition) revealFocusedField();
        keepFocusVisible = false;
      });
    };

    const lock = () => {
      if (pagePosition) return;
      pagePosition = { x: window.scrollX, y: window.scrollY };
      // Fixing the body also stops touch scrolling in mobile Safari. Keep its
      // original width so removing the page scrollbar doesn't shift the layout.
      body.style.setProperty("--purchase-page-width", page.clientWidth + "px");
      body.style.setProperty("--purchase-page-top", -pagePosition.y + "px");
      body.style.setProperty("--purchase-page-left", -pagePosition.x + "px");
      page.classList.add("purchase-open");
      const menu = document.querySelector("#mobile-nav-panel");
      if (menu) menu.hidden = true;
      document.querySelector("#mobile-menu-button")?.setAttribute("aria-expanded", "false");
      updateViewport();
      ["resize", "pageshow", "focus"].forEach((type) => window.addEventListener(type, queueViewportUpdate));
      viewport?.addEventListener("resize", queueViewportUpdate);
      viewport?.addEventListener("scroll", queueViewportUpdate);
      dialog.addEventListener("focusin", queueViewportUpdate);
    };

    const unlock = () => {
      if (!pagePosition) return false;
      const position = pagePosition;
      pagePosition = null;
      window.cancelAnimationFrame(viewportFrame);
      viewportFrame = 0;
      keepFocusVisible = false;
      ["resize", "pageshow", "focus"].forEach((type) => window.removeEventListener(type, queueViewportUpdate));
      viewport?.removeEventListener("resize", queueViewportUpdate);
      viewport?.removeEventListener("scroll", queueViewportUpdate);
      dialog.removeEventListener("focusin", queueViewportUpdate);

      // The site uses smooth anchor scrolling. Restore instantly, without
      // overwriting a pre-existing inline scroll preference.
      const behavior = page.style.getPropertyValue("scroll-behavior");
      const priority = page.style.getPropertyPriority("scroll-behavior");
      page.style.setProperty("scroll-behavior", "auto", "important");
      page.classList.remove("purchase-open");
      ["width", "top", "left"].forEach((key) => body.style.removeProperty("--purchase-page-" + key));
      ["height", "width", "top", "left"].forEach((key) => dialog.style.removeProperty("--purchase-viewport-" + key));
      window.scrollTo(position.x, position.y);
      if (behavior) page.style.setProperty("scroll-behavior", behavior, priority);
      else page.style.removeProperty("scroll-behavior");
      return true;
    };

    return { lock, unlock };
  }

  function setUpPurchaseFlow({ restoreOpen = true, packagesOnly = false } = {}) {
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

    const dialogViewport = createPurchaseDialogViewport(dialog);

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
    let lastSelectedPackage = null;
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
      const packageKey = selectedPackage || lastSelectedPackage;
      if (!packageKey) return;
      rememberDraft();
      try {
        // This tab only; never a payment receipt, order, or persistent profile.
        sessionStorage.setItem(sessionKey, JSON.stringify({
          version: 1,
          updatedAt: Date.now(),
          packageKey,
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
      lastSelectedPackage = packageKey;
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

    const openDialog = (packageKey, trigger, choosePackage = false) => {
      launchElement = trigger;
      if (packageKey) selectPackage(packageKey);
      else if (!choosePackage && isRecommendationPackage()) selectPackage(selectedPackage);
      else clearPackageSelection();
      dialogViewport.lock();
      try {
        if (typeof dialog.showModal === "function") {
          if (!dialog.open) dialog.showModal();
        } else {
          dialog.setAttribute("open", "");
        }
      } catch (error) {
        dialogViewport.unlock();
        throw error;
      }
      saveSession();
    };

    const finishClosingDialog = () => {
      // A queued native close event must not unlock a newly reopened dialog.
      if (dialog.open) return;
      const wasLocked = dialogViewport.unlock();
      saveSession();
      if (wasLocked) launchElement?.focus({ preventScroll: true });
    };

    const closeDialog = () => {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
      finishClosingDialog();
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
      if (packagesOnly) {
        rememberDraft();
        clearPackageSelection();
        packageSelectors[0]?.focus();
        saveSession();
        return;
      }
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
    let pressedBackdrop = false;
    dialog.addEventListener("pointerdown", (event) => {
      pressedBackdrop = event.target === dialog;
    });
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog && pressedBackdrop) closeDialog();
      pressedBackdrop = false;
    });
    dialog.addEventListener("close", finishClosingDialog);

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
      if (restoreOpen && saved.open === true) {
        const trigger = generalLaunchButtons.find((button) => button.getClientRects().length);
        openDialog(saved.packageKey, trigger);
      }
    }
    selectPaymentMethod(selectedMethod);
    return { dialog, open: openDialog, close: closeDialog };
  }

  window.MovieMasterPurchaseFlow = { init: setUpPurchaseFlow, setUpTextContacts };
})();
