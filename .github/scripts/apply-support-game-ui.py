from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}")
    return text.replace(old, new, 1)


site_index_path = Path("index.html")
site_core_path = Path("site-core.js")
site_loader_path = Path("script.js")
site_styles_path = Path("styles.css")
game_index_path = Path("game/index.html")
game_styles_path = Path("game/game.css")

site_index = site_index_path.read_text(encoding="utf-8")
site_core = site_core_path.read_text(encoding="utf-8")
site_loader = site_loader_path.read_text(encoding="utf-8")
site_styles = site_styles_path.read_text(encoding="utf-8")
game_index = game_index_path.read_text(encoding="utf-8")
game_styles = game_styles_path.read_text(encoding="utf-8")

# --- Support strip: turn the headline into a real existing-style purchase button. ---
site_index = replace_once(
    site_index,
    '<link rel="stylesheet" href="./styles.css?v=20260904-support-section">',
    '<link rel="stylesheet" href="./styles.css?v=20260904-support-modal-1">',
    "site stylesheet cache bust",
)
site_index = replace_once(
    site_index,
    '<script src="./script.js?v=20260902-perf-1" defer></script>',
    '<script src="./script.js?v=20260904-support-modal-1" defer></script>',
    "site script cache bust",
)
site_index = replace_once(
    site_index,
    '''            <p class="support-eyebrow">WANT TO HELP THE MOVIE MASTER GROW?</p>
            <h2 id="support-title">GIVE THE MOVIE MASTER MONEY</h2>
            <p class="support-copy">This isn't a recommendation package. You are just giving the Movie Master money for free.</p>''',
    '''            <p class="support-eyebrow">WANT TO HELP THE MOVIE MASTER GROW?</p>
            <h2 class="visually-hidden" id="support-title">Give the Movie Master Money</h2>
            <button class="package-purchase-button support-money-button" type="button" data-package="support">
              GIVE THE MOVIE MASTER MONEY
            </button>
            <p class="support-copy">This isn't a recommendation package. You are just giving the Movie Master money for free.</p>''',
    "support money button markup",
)

site_loader = replace_once(
    site_loader,
    'load("./site-core.js?v=20260904-cleanup-1");',
    'load("./site-core.js?v=20260904-support-modal-1");',
    "site core cache bust",
)

site_core = replace_once(
    site_core,
    '''      vip:
        "Hello Mr. Movie Master sir. I am interested in purchasing the Movie Master VIP Package for $20. It includes 20 Blockbuster Smash Hit Masterpieces, 3 of the best R&B music videos ever made, and a VIP certificate to prove my VIP status. Please provide your payment information so I can pay you via PayPal, Venmo, or Cash App. Thank you.",
      lifetime:''',
    '''      vip:
        "Hello Mr. Movie Master sir. I am interested in purchasing the Movie Master VIP Package for $20. It includes 20 Blockbuster Smash Hit Masterpieces, 3 of the best R&B music videos ever made, and a VIP certificate to prove my VIP status. Please provide your payment information so I can pay you via PayPal, Venmo, or Cash App. Thank you.",
      support:
        "Hello Mr. Movie Master, sir. I am interested in giving you money for free to help grow your business. I do not require any movie recommendations in return. Please provide your PayPal, Venmo, or Cash App payment information so I can pay you. Thank you.",
      lifetime:''',
    "support message",
)
site_core = replace_once(
    site_core,
    '''    const packageSubjects = {
      lifetime: "Ultimate Lifetime Membership Inquiry",
    };''',
    '''    const packageSubjects = {
      support: "Give the Movie Master Money",
      lifetime: "Ultimate Lifetime Membership Inquiry",
    };''',
    "support email subject",
)
site_core = replace_once(
    site_core,
    '''      const isLifetimeInquiry = packageKey === "lifetime";

      dialog.classList.toggle("is-lifetime-inquiry", isLifetimeInquiry);
      if (dialogTitle) {
        dialogTitle.textContent = isLifetimeInquiry
          ? "INQUIRE ABOUT ULTIMATE LIFETIME MEMBERSHIP"
          : "CONTACT THE MOVIE MASTER TO PURCHASE";
      }
      if (packageSelector) packageSelector.hidden = isLifetimeInquiry;''',
    '''      const isLifetimeInquiry = packageKey === "lifetime";
      const isSupportInquiry = packageKey === "support";

      dialog.classList.toggle("is-lifetime-inquiry", isLifetimeInquiry);
      dialog.classList.toggle("is-support-inquiry", isSupportInquiry);
      if (dialogTitle) {
        dialogTitle.textContent = isLifetimeInquiry
          ? "INQUIRE ABOUT ULTIMATE LIFETIME MEMBERSHIP"
          : isSupportInquiry
            ? "GIVE THE MOVIE MASTER MONEY"
            : "CONTACT THE MOVIE MASTER TO PURCHASE";
      }
      if (packageSelector) packageSelector.hidden = isLifetimeInquiry || isSupportInquiry;''',
    "support modal mode",
)

site_styles += '''

/* Support CTA uses the site's established package-button language. */
.support-money-button {
  display: inline-flex;
  width: auto;
  max-width: min(100%, 520px);
  min-height: 52px;
  align-items: center;
  justify-content: center;
  justify-self: auto;
  margin-inline: auto;
  padding: 12px 22px;
  font-size: clamp(0.86rem, 1.35vw, 1.08rem);
  letter-spacing: 0.07em;
  text-align: center;
}

@media (max-width: 520px) {
  .support-money-button {
    width: 100%;
    max-width: 340px;
    min-height: 48px;
    padding-inline: 14px;
  }
}
'''

# --- Game opening screen: stacked essential rules plus explicit Blast instruction. ---
game_index = replace_once(
    game_index,
    '<link rel="stylesheet" href="./game.css?v=20260904-onboarding-1">',
    '<link rel="stylesheet" href="./game.css?v=20260904-onboarding-2">',
    "game stylesheet cache bust",
)
game_index = replace_once(
    game_index,
    '''            <p class="poster-deck start-quick-copy">COLLECT POPCORN FOR UPGRADES · KEEP MOVING TO SHOOT · AVOID GARBAGE 🗑️</p>''',
    '''            <p class="poster-deck start-quick-copy">
              <span>COLLECT POPCORN FOR UPGRADES</span>
              <span>KEEP MOVING TO SHOOT</span>
              <span>AVOID GARBAGE 🗑️</span>
              <span class="start-blast-copy">CLICK / SPACE / GOLD BUTTON WHEN BLOCKBUSTER BLAST IS CHARGED</span>
            </p>''',
    "stacked quick instructions",
)

game_styles += '''

/* Readability refinements for the concise onboarding and INFO screen. */
.start-quick-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.start-quick-copy > span {
  display: block;
}

.start-quick-copy .start-blast-copy {
  margin-top: 5px;
  color: var(--gold-dark);
  font-size: 0.86em;
  letter-spacing: 0.055em;
}

/* Do not stretch short instruction cards to the height of their grid partner. */
.info-rules {
  align-items: start;
}

.info-rules p {
  align-self: start;
}

/* Controls are reference information, not fine print. */
.info-controls > div {
  gap: 7px;
  padding: 12px 10px;
}

.info-controls b {
  font-size: clamp(0.76rem, 1.05vw, 0.92rem);
  letter-spacing: 0.1em;
}

.info-controls span {
  font-size: clamp(0.7rem, 0.95vw, 0.84rem);
  line-height: 1.32;
}

@media (max-width: 720px) {
  .start-quick-copy {
    gap: 1px;
  }

  .start-quick-copy .start-blast-copy {
    margin-top: 4px;
  }

  .info-controls b {
    font-size: 0.78rem;
  }

  .info-controls span {
    font-size: 0.72rem;
  }
}

@media (max-height: 500px) and (orientation: landscape) and (min-width: 520px) {
  .start-quick-copy {
    gap: 0;
    font-size: 0.62rem;
    line-height: 1.18;
  }

  .start-quick-copy .start-blast-copy {
    margin-top: 2px;
    font-size: 0.9em;
  }

  .info-controls > div {
    gap: 3px;
    padding: 6px;
  }

  .info-controls b {
    font-size: 0.62rem;
  }

  .info-controls span {
    font-size: 0.58rem;
    line-height: 1.2;
  }
}
'''

# Basic production assertions.
assert 'data-package="support"' in site_index
assert 'GIVE THE MOVIE MASTER MONEY' in site_index
assert 'I am interested in giving you money for free to help grow your business.' in site_core
assert 'packageSelector.hidden = isLifetimeInquiry || isSupportInquiry' in site_core
assert '<span>COLLECT POPCORN FOR UPGRADES</span>' in game_index
assert '<span>KEEP MOVING TO SHOOT</span>' in game_index
assert '<span>AVOID GARBAGE 🗑️</span>' in game_index
assert 'BLOCKBUSTER BLAST IS CHARGED' in game_index
assert 'align-items: start;' in game_styles
assert 'font-size: clamp(0.76rem, 1.05vw, 0.92rem);' in game_styles

site_index_path.write_text(site_index, encoding="utf-8")
site_core_path.write_text(site_core, encoding="utf-8")
site_loader_path.write_text(site_loader, encoding="utf-8")
site_styles_path.write_text(site_styles, encoding="utf-8")
game_index_path.write_text(game_index, encoding="utf-8")
game_styles_path.write_text(game_styles, encoding="utf-8")
print("Combined support + game UI patch applied successfully.")
