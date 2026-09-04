from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly 1 match, found {count}")
    return text.replace(old, new, 1)


site_index_path = Path("index.html")
site_styles_path = Path("styles.css")
game_index_path = Path("game/index.html")
game_styles_path = Path("game/game.css")

site_index = site_index_path.read_text(encoding="utf-8")
site_styles = site_styles_path.read_text(encoding="utf-8")
game_index = game_index_path.read_text(encoding="utf-8")
game_styles = game_styles_path.read_text(encoding="utf-8")

site_index = replace_once(
    site_index,
    '<link rel="stylesheet" href="./styles.css?v=20260904-support-modal-1">',
    '<link rel="stylesheet" href="./styles.css?v=20260904-support-panel-2">',
    "site stylesheet cache bust",
)

game_index = replace_once(
    game_index,
    '<link rel="stylesheet" href="./game.css?v=20260904-onboarding-2">',
    '<link rel="stylesheet" href="./game.css?v=20260904-info-layout-1">',
    "game stylesheet cache bust",
)

old_rules = '''          <div class="info-rules">
            <p><b>KEEP MOVING.</b> The Movie Master shoots his recommendation stars automatically while he is in motion. He will still defend himself against very close garbage while standing still.</p>
            <p><b>COLLECT THE POPCORN.</b> Every 10 in a row upgrades the recommendation stars. Every 20 also upgrades movement speed. At streaks of 100, 200, 300, and 400, every shot gains another star. At 500, a second Blockbuster Blast bar unlocks. In Normal Mode, missing popcorn summons more garbage. In Hardcore Mode, one miss ends the game.</p>
            <p><b>COLLECT POWER-UPS.</b> Shields block up to three hits, Super Speed makes the Movie Master much faster, Super Stars fire in every direction, and the Magnet pulls nearby popcorn and power-ups toward you.</p>
            <p><b>AVOID GARBAGE.</b> Each unshielded hit costs a rating star. Reach zero and the run ends. In Hardcore Mode, one unshielded hit ends the game.</p>
            <p><b>USE BLOCKBUSTER BLAST.</b> Popcorn and destroyed garbage charge the meter. At 100%, press Space, click the playable area, use a gamepad blast button, or press the gold button to clear the screen.</p>
          </div>'''

new_rules = '''          <div class="info-rules">
            <div class="info-rule-column">
              <p class="info-rule-keep"><b>KEEP MOVING.</b> The Movie Master shoots his recommendation stars automatically while he is in motion. He will still defend himself against very close garbage while standing still.</p>
              <p class="info-rule-powerups"><b>COLLECT POWER-UPS.</b> Shields block up to three hits, Super Speed makes the Movie Master much faster, Super Stars fire in every direction, and the Magnet pulls nearby popcorn and power-ups toward you.</p>
              <p class="info-rule-blast"><b>USE BLOCKBUSTER BLAST.</b> Popcorn and destroyed garbage charge the meter. At 100%, press Space, click the playable area, use a gamepad blast button, or press the gold button to clear the screen.</p>
            </div>
            <div class="info-rule-column">
              <p class="info-rule-popcorn"><b>COLLECT THE POPCORN.</b> Every 10 in a row upgrades the recommendation stars. Every 20 also upgrades movement speed. At streaks of 100, 200, 300, and 400, every shot gains another star. At 500, a second Blockbuster Blast bar unlocks. In Normal Mode, missing popcorn summons more garbage. In Hardcore Mode, one miss ends the game.</p>
              <p class="info-rule-garbage"><b>AVOID GARBAGE.</b> Each unshielded hit costs a rating star. Reach zero and the run ends. In Hardcore Mode, one unshielded hit ends the game. Garbage keeps getting faster and faster as the run goes on.</p>
            </div>
          </div>'''

game_index = replace_once(game_index, old_rules, new_rules, "independent INFO rule columns")

site_styles += '''

/* Compact, stylized support appeal after merchandise. */
.support-section {
  padding-block: clamp(30px, 4vw, 48px);
}

.support-strip {
  position: relative;
  width: min(600px, 100%);
  padding: clamp(24px, 3vw, 32px) clamp(18px, 3.2vw, 30px);
  border: 2px solid rgba(87, 44, 7, 0.58);
  background:
    linear-gradient(180deg, rgba(255, 248, 225, 0.3), rgba(255, 248, 225, 0.1)),
    rgba(223, 203, 166, 0.5);
  box-shadow:
    7px 7px 0 rgba(87, 44, 7, 0.13),
    inset 0 0 0 4px rgba(255, 239, 198, 0.18);
}

.support-strip::before,
.support-strip::after {
  position: absolute;
  top: 10px;
  color: rgba(145, 72, 0, 0.62);
  font-size: 0.72rem;
  line-height: 1;
}

.support-strip::before {
  content: "★";
  left: 12px;
}

.support-strip::after {
  content: "★";
  right: 12px;
}

.support-eyebrow {
  margin-bottom: 14px;
  font-size: clamp(0.92rem, 1.35vw, 1.08rem);
  letter-spacing: 0.12em;
  line-height: 1.18;
}

.support-money-button {
  max-width: min(100%, 480px);
}

.support-copy {
  max-width: 450px;
  margin-top: 17px;
}

@media (max-width: 520px) {
  .support-strip {
    width: min(100%, 440px);
    padding: 24px 14px;
  }

  .support-eyebrow {
    font-size: 0.9rem;
  }
}
'''

game_styles += '''

/* INFO rules use independent columns so short cards never inherit a taller row's whitespace. */
.info-rules {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  align-items: start;
}

.info-rule-column {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 10px;
  align-self: start;
}

.info-rule-column > p {
  flex: none;
  align-self: stretch;
}

@media (max-width: 720px) {
  .info-rules {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .info-rule-column {
    display: contents;
  }

  .info-rule-keep { order: 1; }
  .info-rule-popcorn { order: 2; }
  .info-rule-powerups { order: 3; }
  .info-rule-garbage { order: 4; }
  .info-rule-blast { order: 5; }
}

@media (max-height: 500px) and (orientation: landscape) and (min-width: 721px) {
  .info-rule-column {
    gap: 5px;
  }
}
'''

assert 'styles.css?v=20260904-support-panel-2' in site_index
assert 'game.css?v=20260904-info-layout-1' in game_index
assert 'class="info-rule-column"' in game_index
assert 'Garbage keeps getting faster and faster as the run goes on.' in game_index
assert 'width: min(600px, 100%);' in site_styles
assert 'font-size: clamp(0.92rem, 1.35vw, 1.08rem);' in site_styles
assert 'display: contents;' in game_styles

site_index_path.write_text(site_index, encoding="utf-8")
site_styles_path.write_text(site_styles, encoding="utf-8")
game_index_path.write_text(game_index, encoding="utf-8")
game_styles_path.write_text(game_styles, encoding="utf-8")
print("Support panel and INFO layout fix applied successfully.")
