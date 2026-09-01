(() => {
  "use strict";

  document.querySelectorAll(".process-film li").forEach((step) => {
    const heading = step.querySelector("h4")?.textContent.trim();
    if (heading !== "RECEIVE PAYMENT INFORMATION") return;

    const copy = step.querySelector("p");
    if (copy) {
      copy.textContent =
        "The Movie Master will reply with the information you need to pay through PayPal, Venmo, or Cash App.";
    }
  });

  document.querySelectorAll(".faq-list details").forEach((item) => {
    const question = item.querySelector("summary")?.textContent.trim();
    if (question !== "How will I pay for my recommendations?") return;

    const answer = item.querySelector("p");
    if (answer) {
      answer.textContent = "The Movie Master accepts PayPal, Venmo, and Cash App.";
    }
  });
})();
