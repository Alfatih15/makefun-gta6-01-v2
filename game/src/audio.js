// Synthesised WebAudio: every sound is built from oscillators and noise,
// no audio files. A quiet bass-and-pad loop plays under the game.

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.musicTimer = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.musicStep = 0;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    this.startMusic();
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.5;
  }

  now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  blip(freq, duration, type, volume, slideTo) {
    if (!this.ctx || this.muted) return;
    const t = this.now();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + duration);
    gain.gain.setValueAtTime(volume || 0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  noiseBurst(duration, volume, lowpass) {
    if (!this.ctx || this.muted) return;
    const t = this.now();
    const length = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass || 1200;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume || 0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t);
  }

  shot() {
    this.noiseBurst(0.12, 0.4, 2400);
    this.blip(160, 0.08, 'square', 0.12, 60);
  }

  enemyShot() {
    this.noiseBurst(0.1, 0.18, 1800);
  }

  pickup() {
    this.blip(660, 0.09, 'sine', 0.2);
    setTimeout(() => this.blip(990, 0.12, 'sine', 0.2), 70);
  }

  cash() {
    this.blip(880, 0.08, 'triangle', 0.2);
    setTimeout(() => this.blip(1320, 0.14, 'triangle', 0.2), 80);
  }

  missionStart() {
    [523, 659, 784].forEach((f, i) => setTimeout(() => this.blip(f, 0.16, 'triangle', 0.22), i * 110));
  }

  missionDone() {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.blip(f, 0.2, 'triangle', 0.22), i * 120));
  }

  busted() {
    [392, 330, 262].forEach((f, i) => setTimeout(() => this.blip(f, 0.3, 'sawtooth', 0.14), i * 180));
  }

  engine(on, speedRatio) {
    if (!this.ctx) return;
    if (on && !this.engineOsc) {
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 60;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0.0;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 500;
      this.engineOsc.connect(filter);
      filter.connect(this.engineGain);
      this.engineGain.connect(this.master);
      this.engineOsc.start();
    }
    if (this.engineOsc) {
      const target = on ? 0.05 + 0.05 * (speedRatio || 0) : 0;
      this.engineGain.gain.setTargetAtTime(target, this.now(), 0.1);
      this.engineOsc.frequency.setTargetAtTime(55 + 110 * (speedRatio || 0), this.now(), 0.1);
    }
  }

  siren(on) {
    if (!this.ctx) return;
    if (on && !this.sirenOsc) {
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = 'sine';
      this.sirenOsc.frequency.value = 700;
      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.value = 0.0;
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.9;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 220;
      lfo.connect(lfoGain);
      lfoGain.connect(this.sirenOsc.frequency);
      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.master);
      this.sirenOsc.start();
      lfo.start();
      this.sirenGain.gain.setTargetAtTime(0.045, this.now(), 0.2);
    } else if (!on && this.sirenOsc) {
      const osc = this.sirenOsc;
      const gain = this.sirenGain;
      gain.gain.setTargetAtTime(0, this.now(), 0.1);
      setTimeout(() => { try { osc.stop(); } catch (e) { /* already stopped */ } }, 600);
      this.sirenOsc = null;
      this.sirenGain = null;
    }
  }

  // A slow two-chord pad with a walking bass, scheduled a bar at a time.
  startMusic() {
    if (!this.ctx || this.musicTimer) return;
    const roots = [55, 55, 65.4, 49]; // A1 A1 C2 G1
    const chords = [[220, 261.6, 329.6], [220, 261.6, 329.6], [196, 246.9, 293.7], [196, 246.9, 293.7]];
    this.musicTimer = setInterval(() => {
      if (!this.ctx || this.muted) return;
      const step = this.musicStep % 4;
      this.musicStep += 1;
      const t = this.now() + 0.05;
      const bass = this.ctx.createOscillator();
      bass.type = 'triangle';
      bass.frequency.value = roots[step];
      const bassGain = this.ctx.createGain();
      bassGain.gain.setValueAtTime(0.0001, t);
      bassGain.gain.linearRampToValueAtTime(0.11, t + 0.4);
      bassGain.gain.linearRampToValueAtTime(0.0001, t + 1.9);
      bass.connect(bassGain);
      bassGain.connect(this.master);
      bass.start(t);
      bass.stop(t + 2);
      chords[step].forEach((freq) => {
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(0.035, t + 0.5);
        gain.gain.linearRampToValueAtTime(0.0001, t + 1.9);
        osc.connect(gain);
        gain.connect(this.master);
        osc.start(t);
        osc.stop(t + 2);
      });
    }, 2000);
  }
}
