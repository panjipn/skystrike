# SKYSTRIKE — 60-Second Aim Arena

A fast, booth-ready **event mini game** built for the
[Cloud9 × JetBrains: Sky's The Limit Hackathon 2026](https://cloud9.devpost.com/)
(Category 3: Event Mini Game).

Pop the sky orbs, chain combos, chase the golden orb, and never click a bomb —
you have **60 seconds**. One round trains the exact skills competitive players
drill every day: aim, flick speed, and reaction time.

## Play it

**Live:** https://panjipn.github.io/skystrike/

Or run it locally (works fully offline after install — made for event booths):

```bash
npm install
npm run dev      # develop
npm run build    # production build in dist/
```

## How to play

- **Mouse only.** No tutorial, no keyboard, nothing to learn: click targets.
- **Sky orbs** score points — smaller and faster clicks score more.
- **Combos** raise your multiplier up to ×5. A miss breaks the combo.
- **Golden orbs (★)** are rare, fast, and worth triple points.
- **Bombs (✸)** cost 150 points and reset your combo. Let them fade instead.
- Difficulty ramps up: targets spawn faster, live shorter, and drift more.

After 60 seconds you get a score screen with your **score, accuracy, best
combo, and average reaction time (ms)**, plus a pilot grade from *Trainee* to
*Sky Champion*.

## Booth-ready by design

- **Complete loop:** attract screen → 60-second round → score screen →
  automatic reset to the attract screen after 15 s, so the next fan in line
  gets a clean start with no staff intervention.
- **Local live leaderboard:** the top-10 board is stored in `localStorage`
  and works **with no Wi-Fi at all** — exactly what a busy event floor needs.
- **Self-contained:** no external assets, fonts, or audio files. Sound
  effects are synthesized with WebAudio; every visual is drawn in code.
- **Reliable under sustained use:** fixed-size canvas arena, capped target
  count, and a clean state reset between players.

## Tech

- TypeScript + Vite, Canvas 2D rendering, WebAudio-synthesized SFX.
- `src/main.ts` — game engine (states, spawning, difficulty ramp, scoring).
- `src/storage.ts` — local leaderboard (localStorage, offline-first).
- `src/audio.ts` — synthesized sound effects.
- Testing aid: `?t=8` shortens the round to 8 seconds; `?debug=1` exposes a
  small `window.__skystrike` hook used by automated playtests.

## Tooling (JetBrains)

- **WebStorm** — project setup, npm run configurations for dev/build,
  TypeScript inspections, and debugging the game loop.
- **Junie** (JetBrains AI coding agent) — implemented the *Frenzy Finish*
  end-of-round mode from a written task brief inside the IDE.
- Other editors were used alongside, as the hackathon rules allow.

## License

Apache-2.0 — see [LICENSE](LICENSE).
