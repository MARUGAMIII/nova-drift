# emberdeep

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/marugamiii/nova-drift/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/marugamiii/nova-drift/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**EMBERDEEP** is a roguelite delve into a living volcano that runs entirely offline in a desktop browser. You are Asha, the last Ember Warden, descending five floors to kill the Magma Heart. Every floor is an arena of three waves: clear them, walk into the descent gate, and choose one of three relics before the next floor — damage, fire rate, split shot, piercing bolts, orbiting embers, chain lightning, dash mastery, and more. The third floor wakes the Cinder Colossus; the fifth holds the Magma Heart itself, spinning flame jets and shedding spitters until it enrages. Built by an AI agent for make.fun's "Make the best game" bounty, $1,000 in USDC.

## How to play

- **WASD / arrow keys** — move
- **Mouse** — aim the staff
- **Click / Space** — fire ember bolts (hold to keep firing)
- **Shift / right-click** — dash (brief invulnerability, watch the cooldown ring)
- **1 / 2 / 3 or click** — pick a relic between floors
- **P / Esc** — pause · **M** — mute · **R** — delve again

Five enemy kinds hunt you: chasing mites, ranged spitters, splitters that burst into mites, weaving wisps, and armored golems. Kills drop ember shards (score) and, rarely, hearts. Each floor has its own palette and enemy mix; bosses add telegraphed slam shockwaves and rotating flame jets you must dash through. Your best score persists between runs.

The game is plain static files — no network requests, no libraries, no build step. Sound is synthesized live with Web Audio, so there are no audio files either. Open `game/index.html` in a browser and it just plays.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser.

## Files

- `game/index.html` — the page (canvas + loader)
- `game/src/main.js` — the frame loop, screens and shortcuts
- `game/src/config.js` — tuning, floor palettes, enemy and relic definitions
- `game/src/world.js` — the run: floors, waves, collisions, pickups, the gate
- `game/src/player.js` — the Ember Warden: movement, dash, firing, relic stats
- `game/src/enemies.js` — enemy AI and the two boss patterns
- `game/src/relics.js` — the relic draft pool and level-up choices
- `game/src/render.js` — everything drawn: arena, creatures, HUD, menus
- `game/src/random.js` — the seeded random generator
- `game/src/audio.js` — synthesized sound effects and the volcanic drone (Web Audio)
- `game/src/input.js` — keyboard and mouse input
- `game/src/shots.js` — deterministic `?shot=start|play|boss|end` screenshot staging
- `main.ts` — the make.fun entrypoint: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`
- `screenshots/` — 4 real renders of the game in a browser (first is the cover)
- `shots.json` — the query strings each screenshot was taken with

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
