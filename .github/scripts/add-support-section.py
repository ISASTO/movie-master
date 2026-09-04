from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}")
    return text.replace(old, new, 1)


index_path = Path("index.html")
styles_path = Path("styles.css")

index = index_path.read_text(encoding="utf-8")
styles = styles_path.read_text(encoding="utf-8")

# Cache-bust the stylesheet changed by this patch.
index = replace_once(
    index,
    '<link rel="stylesheet" href="./styles.css?v=20260830-arcade-ticket">',
    '<link rel="stylesheet" href="./styles.css?v=20260904-support-section">',
    "stylesheet cache bust",
)

support_markup = '''      <section class="section support-section" aria-labelledby="support-title">
        <div class="page-shell support-shell">
          <div class="support-strip reveal-on-scroll">
            <p class="support-eyebrow">WANT TO HELP THE MOVIE MASTER GROW?</p>
            <h2 id="support-title">GIVE THE MOVIE MASTER MONEY</h2>
            <p class="support-copy">This isn't a recommendation package. You are just giving the Movie Master money for free.</p>
          </div>
        </div>
      </section>

'''

anchor = '''      </section>

      <section class="section faq-section" id="faq">'''
index = replace_once(
    index,
    anchor,
    '      </section>\n\n' + support_markup + '      <section class="section faq-section" id="faq">',
    "support section after merch",
)

styles += '''

/* Narrow support strip after official merchandise. */
.support-section {
  padding-block: clamp(38px, 5vw, 68px);
  background: var(--paper, #f4e8d2);
}

.support-shell {
  display: flex;
  justify-content: center;
}

.support-strip {
  width: min(760px, 100%);
  padding: clamp(28px, 4vw, 42px) clamp(18px, 4vw, 38px);
  border-top: 2px solid rgba(87, 44, 7, 0.48);
  border-bottom: 2px solid rgba(87, 44, 7, 0.48);
  text-align: center;
}

.support-eyebrow {
  margin: 0 0 9px;
  color: #714011;
  font-size: clamp(0.68rem, 1vw, 0.82rem);
  font-weight: 800;
  letter-spacing: 0.16em;
  line-height: 1.2;
  text-transform: uppercase;
}

.support-strip h2 {
  margin: 0;
  color: #2a170c;
  font-family: "Alfa Movie", Rockwell, serif;
  font-size: clamp(2rem, 5vw, 3.8rem);
  font-weight: 400;
  letter-spacing: 0.035em;
  line-height: 0.98;
  text-wrap: balance;
}

.support-copy {
  max-width: 590px;
  margin: 16px auto 0;
  color: #57371f;
  font-size: clamp(0.9rem, 1.25vw, 1.05rem);
  font-weight: 700;
  line-height: 1.45;
  text-wrap: balance;
}

@media (max-width: 520px) {
  .support-section {
    padding-block: 30px;
  }

  .support-strip {
    padding-inline: 10px;
  }

  .support-strip h2 {
    font-size: clamp(1.8rem, 11vw, 2.75rem);
  }
}
'''

checks = {
    "support heading": "GIVE THE MOVIE MASTER MONEY",
    "support eyebrow": "WANT TO HELP THE MOVIE MASTER GROW?",
    "support disclaimer": "This isn't a recommendation package. You are just giving the Movie Master money for free.",
    "support placement": 'support-section" aria-labelledby="support-title"',
}
for label, marker in checks.items():
    if marker not in index:
        raise SystemExit(f"missing {label}")

index_path.write_text(index, encoding="utf-8")
styles_path.write_text(styles, encoding="utf-8")
print("Support section patch applied successfully.")
