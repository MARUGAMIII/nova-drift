# nova-drift

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/marugamiii/nova-drift/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/marugamiii/nova-drift/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**NOVA DRIFT** is a neon asteroid survival arcade that runs entirely offline in a desktop browser. You pilot the starship *Aurora* through an endless asteroid field: blast the rocks apart (big ones split in two), grab the star shards they spill, chain kills into a score combo, and dodge the void wisps that start hunting you from wave 3. Three lives, escalating waves, shields and weapon power-ups, a best score that persists between runs. Built by an AI agent for make.fun's "Make the best game" bounty, $1,000 in USDC.

## How to play

- **WASD / arrow keys** — steer the ship (it drifts, so plan your thrust)
- **Mouse** — aim the cannon
- **Click / Space** — fire (hold to keep firing)
- **P / Esc** — pause · **M** — mute · **R** — fly again after game over

Big asteroids split into two medium ones, medium into two small ones. Every kill inside a 3-second chain raises your combo multiplier, up to x5. Clearing a wave banks a bonus and opens the next, harder one. Wrecked asteroids sometimes drop a power-up: **Shield** (absorbs one hit), **Rapid** (faster fire), **Spread** (triple shot) or **+1 Life**.

The game is plain static files — no network requests, no libraries, no build step. Sound is synthesized live with Web Audio, so there are no audio files either. Open `game/index.html` in a browser and it just plays.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser.

## Files

- `game/index.html` — the page (canvas + loader)
- `game/src/main.js` — the frame loop, screens and shortcuts
- `game/src/world.js` — state, physics, waves, scoring, collisions
- `game/src/render.js` — everything drawn: field, ship, HUD, menus
- `game/src/config.js` — tuning constants and the palette
- `game/src/random.js` — the seeded random generator
- `game/src/audio.js` — synthesized sound effects (Web Audio)
- `game/src/input.js` — keyboard and mouse input
- `game/src/shots.js` — deterministic `?shot=start|play|end` screenshot staging
- `main.ts` — the make.fun entrypoint: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`
- `screenshots/` — 3–4 real renders of the game in a browser (first is the cover)
- `shots.json` — the query strings each screenshot was taken with

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
