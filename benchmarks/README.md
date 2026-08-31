# Game performance benchmarks

The benchmark runner exercises both the steady work paid by every frame and the
paths that become most expensive during long, high-streak runs. It uses
deterministic scenes and writes every raw timing sample, summary percentiles,
transient and retained heap growth, scene counts, and canvas-operation counts to
JSON.

The suite covers idle and ordinary full updates, controller polling, stable and
changing HUD state, collectible updates, ordinary and crowded placement,
no-target projectile motion, busy and extreme projectile collisions, enemy
steering, target acquisition, hot sprite caches, the animated background, and
empty, early, typical, busy, and extreme complete renders.

Run the complete suite from the repository root:

```sh
node --expose-gc benchmarks/game-performance.js \
  --root . \
  --samples 31 \
  --warmups 9 \
  --label local \
  --output performance-results/local.json \
  --profile-dir performance-results/profiles-local
```

The profile directory is optional. When supplied, the runner also records CPU
profiles for idle updates, stable HUD work, extreme collisions, crowded
placement, background rendering, and typical and extreme complete renders.

Use `--scenario` with a comma-separated list for a focused run:

```sh
node --expose-gc benchmarks/game-performance.js \
  --root . \
  --scenario busy-render,extreme-render \
  --samples 15 \
  --warmups 6
```

Verify controller-menu thresholds, neutral re-arming, held-stick repeat timing,
stick springback rejection, and D-pad navigation:

```sh
node benchmarks/game-performance.js --verify-controller-menu
```

Compare `unitMedianMs` and the per-work-unit value derived from `p95Ms` between
runs. Canvas-operation and scene counts should remain stable when validating a
performance-only change that is intended to preserve High-quality output.
