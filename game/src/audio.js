// NOVA DRIFT — synthesized sound effects (Web Audio, no audio files).
//
// Every effect is built from oscillators and filtered noise at run time, so
// the game ships no audio assets at all. The context is created lazily on the
// first user gesture (browsers require that), and every call is a no-op while
// muted or before the context exists.

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.noiseBuffer = null;
    this.muted = false;
  }

  // Call from a user gesture (click / keydown). Safe to call repeatedly.
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext ?? window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
      const length = Math.floor(this.ctx.sampleRate * 0.5);
      this.noiseBuffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    } catch {
      this.ctx = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  // A short oscillator blip that slides from freqA to freqB.
  blip(freqA, freqB, seconds, type, volume) {
    if (!this.ctx || this.muted) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freqA, t);
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqB), t + seconds);
      gain.gain.setValueAtTime(volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + seconds);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t);
      osc.stop(t + seconds + 0.02);
    } catch {
      // Sound is garnish: never let it break the game.
    }
  }

  // A burst of filtered noise, for explosions and hits.
  noise(seconds, filterFreq, volume) {
    if (!this.ctx || this.muted || !this.noiseBuffer) return;
    try {
      const t = this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      src.loop = true;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(filterFreq, t);
      filter.frequency.exponentialRampToValueAtTime(Math.max(40, filterFreq * 0.2), t + seconds);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + seconds);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      src.start(t);
      src.stop(t + seconds + 0.02);
    } catch {
      // Sound is garnish: never let it break the game.
    }
  }

  shoot() {
    this.blip(920, 240, 0.09, 'square', 0.12);
  }

  explosion(size) {
    // Bigger rocks get a deeper, longer boom.
    const scale = size === 'large' ? 1 : size === 'medium' ? 0.7 : 0.45;
    this.noise(0.35 * scale + 0.1, 900 * scale + 200, 0.5);
    this.blip(160 * scale + 40, 40, 0.3 * scale + 0.08, 'sine', 0.4);
  }

  pickup() {
    this.blip(1180, 1760, 0.09, 'sine', 0.18);
  }

  powerup() {
    this.blip(520, 780, 0.1, 'triangle', 0.2);
    setTimeout(() => this.blip(780, 1180, 0.12, 'triangle', 0.2), 90);
  }

  hit() {
    this.noise(0.3, 1400, 0.55);
    this.blip(220, 55, 0.35, 'sawtooth', 0.35);
  }

  waveClear() {
    [523, 659, 784].forEach((freq, i) => {
      setTimeout(() => this.blip(freq, freq, 0.16, 'triangle', 0.22), i * 110);
    });
  }

  gameOver() {
    [392, 311, 233, 175].forEach((freq, i) => {
      setTimeout(() => this.blip(freq, freq * 0.94, 0.28, 'triangle', 0.22), i * 170);
    });
  }

  click() {
    this.blip(700, 900, 0.05, 'sine', 0.14);
  }
}
