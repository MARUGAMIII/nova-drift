// EMBERDEEP v3 — synthesized sound effects (Web Audio, no audio files).
// One job: every sound the game makes, built from oscillators and filtered
// noise at run time. The context starts lazily on the first user gesture.

const ED_Sound = {
  ctx: null,
  master: null,
  noiseBuf: null,
  muted: false,
  drone: null,

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.32;
      this.master.connect(this.ctx.destination);
      const len = Math.floor(this.ctx.sampleRate * 0.5);
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    } catch (e) {
      this.ctx = null;
    }
  },

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  },

  blip(f0, f1, dur, type, vol) {
    if (!this.ctx || this.muted) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(f0, t);
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    } catch (e) {}
  },

  noise(dur, freq, vol) {
    if (!this.ctx || this.muted || !this.noiseBuf) return;
    try {
      const t = this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      src.loop = true;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(freq, t);
      filter.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.2), t + dur);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(vol, t);
      gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      src.start(t);
      src.stop(t + dur + 0.02);
    } catch (e) {}
  },

  // A low volcanic drone that hums under the whole run.
  startDrone() {
    if (!this.ctx || this.muted || this.drone) return;
    try {
      const o1 = this.ctx.createOscillator();
      const o2 = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o1.type = 'sine';
      o1.frequency.value = 55;
      o2.type = 'sine';
      o2.frequency.value = 55.7;
      g.gain.value = 0.045;
      o1.connect(g);
      o2.connect(g);
      g.connect(this.master);
      o1.start();
      o2.start();
      this.drone = { o1, o2, g };
    } catch (e) {}
  },

  arp(notes, step, dur, type, vol) {
    notes.forEach((f, i) => {
      setTimeout(() => this.blip(f, f, dur, type, vol), i * step);
    });
  },

  shoot() { this.blip(880, 260, 0.08, 'square', 0.10); },
  hit() { this.blip(300, 140, 0.06, 'triangle', 0.12); },
  die() { this.noise(0.28, 700, 0.4); this.blip(180, 45, 0.25, 'sine', 0.3); },
  pickup() { this.blip(1150, 1750, 0.09, 'sine', 0.16); },
  heart() { this.blip(660, 990, 0.12, 'sine', 0.2); },
  dash() { this.noise(0.14, 2400, 0.22); },
  hurt() { this.noise(0.3, 1300, 0.5); this.blip(220, 55, 0.32, 'sawtooth', 0.32); },
  relic() { this.arp([523, 659, 784, 1046], 95, 0.15, 'triangle', 0.2); },
  floorClear() { this.arp([392, 523, 659, 784], 110, 0.18, 'triangle', 0.2); },
  boss() { this.noise(0.7, 300, 0.6); this.blip(90, 38, 0.7, 'sawtooth', 0.4); },
  win() { this.arp([523, 659, 784, 1046, 1318], 140, 0.3, 'triangle', 0.22); },
  lose() { this.arp([392, 330, 262, 196], 180, 0.3, 'triangle', 0.22); },
  click() { this.blip(700, 920, 0.05, 'sine', 0.14); },
  nova() { this.noise(0.35, 1800, 0.4); this.blip(520, 90, 0.3, 'sine', 0.3); },
  teleport() { this.blip(1200, 240, 0.22, 'sine', 0.18); this.noise(0.2, 3000, 0.2); },
  boom() { this.noise(0.45, 900, 0.55); this.blip(140, 40, 0.4, 'sawtooth', 0.4); },
};
