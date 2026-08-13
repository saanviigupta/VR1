/**
 * 🛒 Shop for Future Self — Audio
 * audio.js
 *
 * 100% procedural WebAudio. No files to host. Replaces the old eerie
 * ambient-drone approach with a bright, upbeat house-ish loop (four-on-the-
 * floor kick + off-beat hats + a bouncy little arpeggio) so the store feels
 * energetic rather than scary.
 *
 * Unlocked on the first user gesture (click / keydown / touch / entering VR).
 */

class ShopAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.started = false;
    this._tmpPos = null;
    this._beatTimer = null;
    this._beat = 0;
    this.bpm = 124;
  }

  _ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.85;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return true;
  }

  start() {
    if (!this._ensure()) return;
    if (this.started) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    this.started = true;
    this._startBeat();
    this.play('start');
  }

  _tone(freq, dur, type, vol, when, slideTo, dest) {
    const t = this.ctx.currentTime + (when || 0);
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(dest || this.master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  _noise(dur, vol, when, filterFreq, filterType, dest) {
    const t = this.ctx.currentTime + (when || 0);
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = filterType || 'lowpass';
    f.frequency.value = filterFreq || 900;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(f).connect(g).connect(dest || this.master);
    src.start(t);
  }

  // ── SFX ──────────────────────────────────────────────────────
  play(name) {
    if (!this._ensure()) return;
    switch (name) {
      case 'pickup':
        this._tone(660, 0.08, 'triangle', 0.18, 0, 900);
        break;
      case 'correct':
        this._tone(523, 0.16, 'triangle', 0.18, 0);
        this._tone(659, 0.16, 'triangle', 0.18, 0.07);
        this._tone(880, 0.22, 'triangle', 0.16, 0.14);
        break;
      case 'wrong':
        this._tone(220, 0.1, 'square', 0.08, 0);
        this._tone(180, 0.12, 'square', 0.08, 0.11);
        break;
      case 'click':
        this._tone(900, 0.045, 'sine', 0.12, 0);
        break;
      case 'start':
        this._tone(392, 0.12, 'triangle', 0.12, 0);
        this._tone(523, 0.12, 'triangle', 0.12, 0.1);
        this._tone(659, 0.16, 'triangle', 0.12, 0.2);
        break;
      case 'complete':
        [523, 659, 784, 1046, 1318].forEach((f, i) => {
          this._tone(f, 0.2, 'triangle', 0.16, i * 0.1);
        });
        this._noise(0.4, 0.05, 0.5, 5000, 'highpass');
        break;
    }
  }

  // ── Upbeat house-style loop: kick + off-beat hat + bright arp ──
  _startBeat() {
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.16;
    this.musicGain.connect(this.master);

    const secPerBeat = 60 / this.bpm;      // quarter note
    const secPer8th = secPerBeat / 2;

    // Cheerful major-ish arpeggio riff, one note per 8th, 8-step pattern.
    const arp = [523.25, 659.25, 783.99, 659.25, 587.33, 739.99, 880.0, 739.99]; // C E G E D F# A F#

    const scheduleBar = () => {
      if (!this.ctx) return;
      for (let i = 0; i < 8; i++) {
        const when = i * secPer8th;
        // Kick on every quarter note (steps 0, 2, 4, 6)
        if (i % 2 === 0) this._kick(when);
        // Closed hat on the off-beat 8ths (steps 1, 3, 5, 7)
        else this._hat(when);
        // Arp note every 8th, quieter, sits on top
        this._tone(arp[i], secPer8th * 0.85, 'triangle', 0.07, when, null, this.musicGain);
      }
      this._beatTimer = setTimeout(scheduleBar, secPer8th * 8 * 1000);
    };
    scheduleBar();
  }

  _kick(when) {
    const t = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.11);
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    osc.connect(g).connect(this.musicGain);
    osc.start(t);
    osc.stop(t + 0.18);
  }

  _hat(when) {
    const t = this.ctx.currentTime + when;
    const len = Math.floor(this.ctx.sampleRate * 0.045);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 7000;
    const g = this.ctx.createGain();
    g.gain.value = 0.12;
    src.connect(f).connect(g).connect(this.musicGain);
    src.start(t);
  }

  updateListener(camObj3D) {
    if (!this.ctx || !this.started || !camObj3D) return;
    if (!this._tmpPos) {
      this._tmpPos = new THREE.Vector3();
      this._tmpFwd = new THREE.Vector3();
    }
    camObj3D.getWorldPosition(this._tmpPos);
    this._tmpFwd.set(0, 0, -1).applyQuaternion(camObj3D.getWorldQuaternion(new THREE.Quaternion()));
    const L = this.ctx.listener;
    if (L.positionX) {
      const t = this.ctx.currentTime;
      L.positionX.setValueAtTime(this._tmpPos.x, t);
      L.positionY.setValueAtTime(this._tmpPos.y, t);
      L.positionZ.setValueAtTime(this._tmpPos.z, t);
      L.forwardX.setValueAtTime(this._tmpFwd.x, t);
      L.forwardY.setValueAtTime(this._tmpFwd.y, t);
      L.forwardZ.setValueAtTime(this._tmpFwd.z, t);
      L.upX.setValueAtTime(0, t); L.upY.setValueAtTime(1, t); L.upZ.setValueAtTime(0, t);
    } else if (L.setPosition) {
      L.setPosition(this._tmpPos.x, this._tmpPos.y, this._tmpPos.z);
      L.setOrientation(this._tmpFwd.x, this._tmpFwd.y, this._tmpFwd.z, 0, 1, 0);
    }
  }
}

window.shopAudio = new ShopAudio();

(function () {
  const kick = () => window.shopAudio.start();
  window.addEventListener('click', kick, { once: false });
  window.addEventListener('keydown', kick, { once: false });
  window.addEventListener('touchstart', kick, { once: false });
  const hook = () => {
    const s = document.querySelector('a-scene');
    if (s) s.addEventListener('enter-vr', kick);
  };
  if (document.querySelector('a-scene')) hook();
  else window.addEventListener('DOMContentLoaded', hook);
})();
