// NOVA DRIFT — the entrypoint for make.fun's best-game-01 (Node 22+, stdlib only).
//
// What it does, in order:
//   1. Checks the entry is really here (game/index.html must exist).
//   2. Copies this directory's game/ and screenshots/ into the output dir.
//   3. Writes output/dossier.json with buildDossier from vendor/makefun-game.ts.
//
// The grader runs it as `node main.ts` and reads /output. Outside the
// grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Play the game locally first with `node serve.ts`, then open
// http://localhost:8080 in a desktop browser.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The caps the bounty scores against (reference/gate.json): the text cap
// shapes the dossier's bytes; the rest refuse an entry the scorer would
// refuse outright (too many or too big screenshots, too many game files,
// game/ over 48 MiB, or a game path over 1000 bytes).
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function countEntries(dir) {
  let files = 0;
  let bytes = 0;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const info = statSync(path);
    if (info.isDirectory()) {
      const sub = countEntries(path);
      files += sub.files;
      bytes += sub.bytes;
    } else if (info.isFile()) {
      files += 1;
      bytes += info.size;
    }
  }
  return { files, bytes };
}

function main() {
  const here = fileURLToPath(new URL('.', import.meta.url));
  const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
  const gameDir = join(here, 'game');
  const shotsDir = join(here, 'screenshots');

  if (!existsSync(join(gameDir, 'index.html'))) {
    throw new Error('NOVA DRIFT: game/index.html is missing, nothing to hand in');
  }
  if (!existsSync(shotsDir)) {
    console.warn('NOVA DRIFT warning: no screenshots/ directory — the gate needs 3 or 4 screenshots');
  }

  mkdirSync(out, { recursive: true });
  cpSync(gameDir, join(out, 'game'), { recursive: true });
  mkdirSync(join(out, 'screenshots'), { recursive: true });
  if (existsSync(shotsDir)) {
    cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });
  }
  const shotCount = existsSync(join(out, 'screenshots')) ? readdirSync(join(out, 'screenshots')).length : 0;
  if (shotCount < 3) {
    console.warn(`NOVA DRIFT warning: only ${shotCount} screenshot(s) — the gate needs 3 or 4`);
  }

  const dossier = buildDossier(out, DOSSIER_CAPS);
  writeFileSync(join(out, 'dossier.json'), dossier);

  // Self-check: the dossier must be byte for byte what the library writes
  // from this exact output, the way the gate rebuilds it. If it ever
  // differs, the hand-in is broken and this run must fail loudly.
  // (buildDossier returns a Uint8Array, so compare through Buffers.)
  const rebuilt = buildDossier(out, DOSSIER_CAPS);
  if (!Buffer.from(dossier).equals(Buffer.from(rebuilt))) {
    throw new Error('NOVA DRIFT: dossier.json does not round-trip — refusing to hand in');
  }

  const game = countEntries(join(out, 'game'));
  const shots = existsSync(join(out, 'screenshots')) ? countEntries(join(out, 'screenshots')) : { files: 0, bytes: 0 };
  console.log(`NOVA DRIFT handed in to ${out}`);
  console.log(`  game/: ${game.files} files, ${game.bytes} bytes`);
  console.log(`  screenshots/: ${shots.files} files, ${shots.bytes} bytes`);
  console.log(`  dossier.json: ${dossier.length} bytes`);
}

main();
