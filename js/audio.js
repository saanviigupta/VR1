/**
 * 🛒 Shop for Future Self — Audio
 * audio.js
 *
 * 100% procedural WebAudio, same technique as the old bakery project's
 * audio.js but trimmed to just what this game needs. No files to host,
 * nothing to worry about in the Quest browser.
 *
 * Unlocked on the first user gesture (click / keydown / touch / entering VR).
 */

class ShopAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.started = false;
    this._tmpPos = null;
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
    this._startAmbience();
    this.play('start');
  }

  _tone(freq, dur, type, vol, when, slideTo) {
    const t = this.ctx.currentTime + (when || 0);
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  _noise(dur, vol, when, filterFreq) {
    const t = this.ctx.currentTime + (when || 0);
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = filterFreq || 900;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
  }

  play(name) {
    if (!this._ensure()) return;
    switch (name) {
      case 'pickup':
        this._tone(500, 0.08, 'sine', 0.16, 0, 760);
        break;
      case 'correct':
        this._tone(523, 0.18, 'sine', 0.16, 0);
        this._tone(659, 0.18, 'sine', 0.16, 0.08);
        this._tone(784, 0.24, 'sine', 0.14, 0.16);
        break;
      case 'wrong':
        this._tone(190, 0.12, 'square', 0.07, 0);
        this._tone(160, 0.14, 'square', 0.07, 0.13);
        break;
      case 'click':
        this._tone(850, 0.045, 'sine', 0.12, 0);
        break;
      case 'start':
        this._tone(392, 0.14, 'sine', 0.1, 0);
        this._tone(523, 0.14, 'sine', 0.1, 0.11);
        break;
      case 'complete':
        [523, 659, 784, 1046, 784, 1046].forEach((f, i) => {
          this._tone(f, 0.22, 'sine', 0.15, i * 0.12);
        });
        this._noise(0.5, 0.05, 0.6, 4000);
        break;
    }
  }

  _startAmbience() {
    const amb = this.ctx.createGain();
    amb.gain.value = 0.03;
    amb.connect(this.master);
    const len = this.ctx.sampleRate * 3;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.2;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 500;
    src.connect(lp).connect(amb);
    src.start();
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
