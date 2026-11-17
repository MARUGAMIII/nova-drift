// EMBERDEEP — synthesized sound effects (Web Audio, no audio files).
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
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { this.ctx = null; }
  },

  toggleMute() { this.muted = !this.muted; return this.muted; },

  blip(f0, f1, dur, type, vol) {
    if (!this.ctx || this.muted) return;
    try {
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g); g.connect(this.master);
      o.start(t); o.stop(t + dur + 0.02);
    } catch (e) {}
  },

  noise(dur, freq, vol) {
    if (!this.ctx || this.muted || !this.noiseBuf) return;
    try {
      const t = this.ctx.currentTime;
      const s = this.ctx.createBufferSource();
      s.buffer = this.noiseBuf; s.loop = true;
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(freq, t);
      f.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.2), t + dur);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      s.connect(f); f.connect(g); g.connect(this.master);
      s.start(t); s.stop(t + dur + 0.02);
    } catch (e) {}
  },

  // A low volcanic drone that hums under the whole run.
  startDrone() {
    if (!this.ctx || this.muted || this.drone) return;
    try {
      const o = this.ctx.createOscillator();
      const o2 = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sine'; o.frequency.value = 55;
      o2.type = 'sine'; o2.frequency.value = 55.7;
      g.gain.value = 0.045;
      o.connect(g); o2.connect(g); g.connect(this.master);
      o.start(); o2.start();
      this.drone = { o, o2, g };
    } catch (e) {}
  },

  shoot() { this.blip(880, 260, 0.08, 'square', 0.10); },
  hit() { this.blip(300, 140, 0.06, 'triangle', 0.12); },
  die() { this.noise(0.28, 700, 0.4); this.blip(180, 45, 0.25, 'sine', 0.3); },
  pickup() { this.blip(1150, 1750, 0.09, 'sine', 0.16); },
  heart() { this.blip(660, 990, 0.12, 'sine', 0.2); },
  dash() { this.noise(0.14, 2400, 0.22); },
  hurt() { this.noise(0.3, 1300, 0.5); this.blip(220, 55, 0.32, 'sawtooth', 0.32); },
  relic() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.blip(f, f, 0.15, 'triangle', 0.2), i * 95)); },
  floorClear() { [392, 523, 659, 784].forEach((f, i) => setTimeout(() => this.blip(f, f, 0.18, 'triangle', 0.2), i * 110)); },
  boss() { this.noise(0.7, 300, 0.6); this.blip(90, 38, 0.7, 'sawtooth', 0.4); },
  win() { [523, 659, 784, 1046, 1318].forEach((f, i) => setTimeout(() => this.blip(f, f, 0.3, 'triangle', 0.22), i * 140)); },
  lose() { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => this.blip(f, f * 0.94, 0.3, 'triangle', 0.22), i * 180)); },
  click() { this.blip(700, 920, 0.05, 'sine', 0.14); },
};
