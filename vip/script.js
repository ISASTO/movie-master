(() => {
  "use strict";

  const body = document.body;
  const gate = document.querySelector("#vip-gate");
  const vipPage = document.querySelector("#vip-page");
  const enterButton = document.querySelector("#enter-vip");
  const leaveButton = document.querySelector("#leave-vip");
  const printButton = document.querySelector("#print-certificate");
  const certificate = document.querySelector("#certificate");
  const dateOutput = document.querySelector("#certificate-date");

  if (gate && enterButton) {
    gate.scrollTop = 0;
    enterButton.focus({ preventScroll: true });
  }

  if (dateOutput) {
    const today = new Date();
    dateOutput.dateTime = today.toISOString().slice(0, 10);
    dateOutput.textContent = new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(today);
  }

  function enterVipPage() {
    body.classList.remove("vip-locked");
    gate?.setAttribute("hidden", "");
    vipPage?.removeAttribute("inert");
    certificate?.focus({ preventScroll: true });
  }

  function leaveVipPage() {
    window.location.assign("../");
  }

  function keepFocusInGate(event) {
    if (event.key !== "Tab" || !body.classList.contains("vip-locked")) return;

    const focusable = [enterButton, leaveButton].filter(Boolean);
    const first = focusable[0];
    const last = focusable.at(-1);

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  enterButton?.addEventListener("click", enterVipPage);
  leaveButton?.addEventListener("click", leaveVipPage);
  printButton?.addEventListener("click", () => window.print());
  document.addEventListener("keydown", keepFocusInGate);
})();
