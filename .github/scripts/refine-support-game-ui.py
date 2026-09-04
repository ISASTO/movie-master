from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}")
    return text.replace(old, new, 1)


site_core_path = Path("site-core.js")
game_styles_path = Path("game/game.css")
site_core = site_core_path.read_text(encoding="utf-8")
game_styles = game_styles_path.read_text(encoding="utf-8")

site_core = replace_once(
    site_core,
    '"Hello Mr. Movie Master, sir. I am interested in giving you money for free to help grow your business. I do not require any movie recommendations in return. Please provide your PayPal, Venmo, or Cash App payment information so I can pay you. Thank you."',
    '"Hello Mr. Movie Master, sir. I am interested in giving you money for free to help grow your business. I do not require any movie recommendations in return. Please provide your PayPal, Venmo, or Cash App payment information. Thank you."',
    "exact support message",
)

game_styles = replace_once(
    game_styles,
    '''.info-controls b {
  font-size: clamp(0.76rem, 1.05vw, 0.92rem);
  letter-spacing: 0.1em;
}

.info-controls span {
  font-size: clamp(0.7rem, 0.95vw, 0.84rem);
  line-height: 1.32;
}''',
    '''.info-controls b {
  font-size: clamp(0.84rem, 1.18vw, 1rem);
  letter-spacing: 0.1em;
}

.info-controls span {
  font-size: clamp(0.78rem, 1.06vw, 0.92rem);
  line-height: 1.32;
}''',
    "larger desktop info control text",
)

game_styles = replace_once(
    game_styles,
    '''  .info-controls b {
    font-size: 0.78rem;
  }

  .info-controls span {
    font-size: 0.72rem;
  }''',
    '''  .info-controls b {
    font-size: 0.84rem;
  }

  .info-controls span {
    font-size: 0.78rem;
  }''',
    "larger mobile info control text",
)

assert 'payment information. Thank you.' in site_core
assert 'font-size: clamp(0.84rem, 1.18vw, 1rem);' in game_styles
assert 'font-size: clamp(0.78rem, 1.06vw, 0.92rem);' in game_styles

site_core_path.write_text(site_core, encoding="utf-8")
game_styles_path.write_text(game_styles, encoding="utf-8")
print("Combined UI refinements applied successfully.")
