# emberdeep

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/marugamiii/nova-drift/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/marugamiii/nova-drift/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**EMBERDEEP** is a roguelite delve into a living volcano that runs entirely offline in a desktop browser. You are Asha, the last Ember Warden, descending through three realms and five floors to kill the Magma Heart — or, if you dare, keep delving after it dies in Endless mode. Every floor is an arena of three waves: clear them, walk into the descent gate, and choose one of three relics before the next floor — damage, fire rate, split shot, piercing bolts, orbiting embers, chain lightning, dash novas, slow regeneration, and more. Between runs, banked ember shards buy permanent upgrades in the Ember Workshop: extra hearts, tempered bolts, faster boots. The third floor wakes the Cinder Colossus, the fourth is watched by the teleporting Obsidian Warden, and the fifth holds the Magma Heart itself, spinning flame jets and shedding spitters until it enrages. Three difficulties: Normal, Hard (+50% score, fewer hearts), and Endless — where the mountain reforms after every boss and the depths never end. Built by an AI agent for make.fun's "Make the best game" bounty, $1,000 in USDC.

## How to play

- **1 / 2 / 3 or click** — pick a difficulty on the title screen (Normal / Hard / Endless)
- **4 / 5 / 6 or click** — buy a permanent Ember Workshop upgrade with banked shards
- **WASD / arrow keys** — move
- **Mouse** — aim the staff
- **Click / Space** — fire ember bolts (hold to keep firing)
- **Shift / right-click** — dash (brief invulnerability, watch the cooldown ring)
- **1 / 2 / 3 or click** — pick a relic between floors
- **P / Esc** — pause · **M** — mute · **R** — delve again

Six enemy kinds hunt you: chasing mites, ranged spitters, splitters that burst into mites, weaving wisps, armored golems, and volatile bombers that blow up in your face. Gold-ringed elites are tougher and pay triple. Kills drop ember shards (score) and, rarely, hearts. Each floor has its own palette, set-piece and enemy mix across three realms — ash dunes, ember veins, crystal clusters, obsidian shards and lava pools — and bosses add telegraphed slam shockwaves, teleporting aimed spreads, and rotating flame jets you must dash through. Shards you earn are banked when a run ends, so every delve feeds the Workshop. Your best score persists between runs.

The game is plain static files — no network requests, no libraries, no build step. Sound is synthesized live with Web Audio, so there are no audio files either. Open `game/index.html` in a browser and it just plays.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser.

## Files

- `game/index.html` — the page (canvas + loader)
- `game/src/main.js` — the frame loop, screens, difficulty picks and shortcuts
- `game/src/config.js` — tuning, difficulties, floor palettes, enemy and relic definitions
- `game/src/world.js` — the run: floors, waves, collisions, pickups, the gate, Endless depths, and the Ember Workshop (banked shards, permanent upgrades)
- `game/src/player.js` — the Ember Warden: movement, dash, firing, relic stats, dash nova
- `game/src/enemies.js` — enemy AI, elites, the bomber, and the three boss patterns
- `game/src/relics.js` — the relic draft pool and level-up choices
- `game/src/render.js` — everything drawn: arena, creatures, HUD, menus, difficulty cards
- `game/src/random.js` — the seeded random generator
- `game/src/audio.js` — synthesized sound effects and the volcanic drone (Web Audio)
- `game/src/input.js` — keyboard and mouse input
- `game/src/shots.js` — deterministic `?shot=start|play|boss|draft|end` screenshot staging
- `main.ts` — the make.fun entrypoint: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`
- `screenshots/` — 4 real renders of the game in a browser (first is the cover)
- `shots.json` — the query strings each screenshot was taken with

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
