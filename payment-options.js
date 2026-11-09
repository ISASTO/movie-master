(() => {
  "use strict";

  document.querySelectorAll(".process-film li").forEach((step) => {
    const heading = step.querySelector("h4")?.textContent.trim();
    if (heading !== "RECEIVE PAYMENT INFORMATION") return;

    const copy = step.querySelector("p");
    if (copy) {
      step.querySelector("h4").textContent = "PAY NOW OR MESSAGE FIRST";
      copy.textContent =
        "PayPal, Venmo, and Cash App details are in the purchase window. You can message him first; after paying, message him to receive your recommendations.";
    }
  });

  document.querySelectorAll(".faq-list details").forEach((item) => {
    const question = item.querySelector("summary")?.textContent.trim();
    if (question !== "How will I pay for my recommendations?") return;

    const answer = item.querySelector("p");
    if (answer) {
      answer.textContent = "PayPal, Venmo, and Cash App details are in the purchase window. You can pay now or message him first. After paying, message him with your payment name and method to receive your recommendations; they are not sent automatically.";
    }
  });
})();
