// EMBERDEEP v3 — the entrypoint for make.fun's best-game-01 (Node 22+, stdlib only).
//
// What it does, in order:
//   1. Refuses to hand in a broken entry (game/index.html must exist, and the
//      screenshots must be real JPEG/PNG files under the 256 KiB cap).
//   2. Copies this directory's game/ and screenshots/ into the output dir.
//   3. Writes output/dossier.json with buildDossier from vendor/makefun-game.ts,
//      then rebuilds it and fails loudly if the two ever differ.
//
// The grader runs it as `node main.ts` and reads /output. Outside the
// grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Play the game locally first with `node serve.ts`, then open
// http://localhost:8080 in a desktop browser.

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The caps the bounty scores against (reference/gate.json): the text cap
// shapes the dossier's bytes; the rest refuse an entry the scorer would
// refuse outright (too many or too big screenshots, too many game files,
// game/ over 48 MiB, or a game path over 1000 bytes).
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function walk(dir) {
  let files = 0;
  let bytes = 0;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const info = statSync(path);
    if (info.isDirectory()) {
      const sub = walk(path);
      files += sub.files;
      bytes += sub.bytes;
    } else if (info.isFile()) {
      files += 1;
      bytes += info.size;
    }
  }
  return { files, bytes };
}

function checkGameFiles(dir) {
  // No single game file should be anywhere near a megabyte: the game is
  // hand-written code with no assets, so a huge file means junk slipped in.
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const info = statSync(path);
    if (info.isDirectory()) {
      checkGameFiles(path);
    } else if (info.isFile() && info.size > 1048576) {
      throw new Error(`EMBERDEEP: ${path} is ${info.size} bytes, over the 1 MiB per-file sanity cap`);
    }
  }
}

function checkShotList(repoRoot, shotsDir) {
  // shots.json is the record of how each screenshot was staged: every file
  // it names must actually be shipped, so a stale entry cannot slip in.
  const listPath = join(repoRoot, 'shots.json');
  if (!existsSync(listPath)) return;
  const wanted = JSON.parse(readFileSync(listPath, 'utf8'));
  for (const shot of wanted) {
    if (!existsSync(join(shotsDir, shot.name))) {
      throw new Error(`EMBERDEEP: shots.json names ${shot.name}, but it is not in screenshots/`);
    }
  }
}

function checkScreenshots(dir) {
  // The gate refuses a screenshot over 256 KiB or one that is not a whole
  // PNG or JPEG: catch that here, before anything is handed in.
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const info = statSync(path);
    if (!info.isFile()) continue;
    if (info.size > 262144) {
      throw new Error(`EMBERDEEP: screenshots/${name} is ${info.size} bytes, over the 256 KiB cap`);
    }
    const head = readFileSync(path).subarray(0, 4);
    const isJpeg = head[0] === 0xff && head[1] === 0xd8;
    const isPng = head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47;
    if (!isJpeg && !isPng) {
      throw new Error(`EMBERDEEP: screenshots/${name} is neither JPEG nor PNG`);
    }
  }
}

function main() {
  const here = fileURLToPath(new URL('.', import.meta.url));
  const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
  const gameDir = join(here, 'game');
  const shotsDir = join(here, 'screenshots');

  if (!existsSync(join(gameDir, 'index.html'))) {
    throw new Error('EMBERDEEP: game/index.html is missing, nothing to hand in');
  }
  checkGameFiles(gameDir);
  if (!existsSync(shotsDir)) {
    console.warn('EMBERDEEP warning: no screenshots/ directory — the gate needs 3 or 4 screenshots');
  }
  if (existsSync(shotsDir)) {
    checkScreenshots(shotsDir);
    checkShotList(here, shotsDir);
  }

  mkdirSync(out, { recursive: true });
  cpSync(gameDir, join(out, 'game'), { recursive: true });
  mkdirSync(join(out, 'screenshots'), { recursive: true });
  if (existsSync(shotsDir)) {
    cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });
  }
  const shotCount = existsSync(join(out, 'screenshots')) ? readdirSync(join(out, 'screenshots')).length : 0;
  if (shotCount < 3) {
    console.warn(`EMBERDEEP warning: only ${shotCount} screenshot(s) — the gate needs 3 or 4`);
  }

  const dossier = buildDossier(out, CAPS);
  writeFileSync(join(out, 'dossier.json'), dossier);

  // Self-check: the dossier must be byte for byte what the library writes
  // from this exact output, the way the gate rebuilds it. If it ever
  // differs, the hand-in is broken and this run must fail loudly.
  const rebuilt = buildDossier(out, CAPS);
  if (!Buffer.from(dossier).equals(Buffer.from(rebuilt))) {
    throw new Error('EMBERDEEP: dossier.json does not round-trip — refusing to hand in');
  }

  const game = walk(join(out, 'game'));
  const shots = existsSync(join(out, 'screenshots')) ? walk(join(out, 'screenshots')) : { files: 0, bytes: 0 };
  console.log(`EMBERDEEP handed in to ${out}`);
  console.log(`  game/: ${game.files} files, ${game.bytes} bytes`);
  console.log(`  screenshots/: ${shots.files} files, ${shots.bytes} bytes`);
  console.log(`  dossier.json: ${dossier.length} bytes`);
}

main();
