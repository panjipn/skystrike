# Bonus Case Study — Best AI-Powered Workflow Story

**Project:** SKYSTRIKE — 60-Second Aim Arena (Cloud9 × JetBrains Hackathon 2026, Category 3: Event Mini Game)
**Tools:** WebStorm 2026.3 + Junie (JetBrains AI coding agent)

## How AI accelerated the build

The game's *Frenzy Finish* feature — in the final 10 seconds of a round, all
points double and a FRENZY ×2 banner appears — was implemented end-to-end by
**Junie**, the JetBrains AI coding agent, working inside WebStorm from a
written task brief.

Instead of describing the feature loosely, the brief was written like a mini
spec:

- **Exact trigger condition:** frenzy is active when `roundEndsAt - now <= 10000`
  while the game state is `playing`.
- **Exact integration points:** an `isFrenzy(now)` helper, the points
  calculation in the click handler, the banner rendering in the frame loop,
  a one-shot sound trigger when frenzy starts, and a per-round reset in
  `startRound()`.
- **Acceptance check:** the production build (`npm run build`) must pass.

Junie completed the feature in one pass — see the commit
**"Add Frenzy Finish via Junie"** in this repository's history — and even
flagged a thoughtful edge case on its own: rounds shorter than 10 seconds
trigger Frenzy immediately, which follows directly from the spec's arithmetic.

## What changed in the workflow

The human role shifted from typing code to:

1. Writing a precise brief (conditions, integration points, acceptance check).
2. Reviewing Junie's diff line by line before accepting it.
3. Playtesting the result and verifying the feature in the live build.

A feature that would normally take about half an hour of focused coding was
done in a few minutes of supervised work, with the same review discipline as
any human-written pull request. The rest of the project was developed in and
run from WebStorm (npm run configurations, TypeScript inspections, integrated
Git client), with other editors used alongside as the hackathon rules allow.
