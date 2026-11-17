// EMBERDEEP — relics: the draft pool and the level-up choice.
// One job: pick three distinct relics the player does not own at max level,
// and apply the one they choose to the player.

function ED_draftRelics(rng, owned) {
  const pool = ED_RELICS.filter((r) => (owned[r.id] || 0) < r.max);
  const picks = [];
  const bag = pool.slice();
  while (bag.length > 0 && picks.length < 3) {
    const i = Math.floor(rng.next() * bag.length);
    picks.push(bag.splice(i, 1)[0]);
  }
  return picks;
}

function ED_applyRelic(player, relic) {
  player.relics[relic.id] = (player.relics[relic.id] || 0) + 1;
  relic.apply(player);
}

function ED_relicLevel(player, id) {
  return player.relics[id] || 0;
}
