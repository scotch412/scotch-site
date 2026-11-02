/**
 * STRATA — Generative Ambient Synthesizer
 * Uses native Web Audio API to create a gentle, warm cinematic drone
 * No external audio files or network requests required.
 */

class AmbientSoundscape {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.masterGain = null;
    this.oscillators = [];
    this.filter = null;
  }

  initAudio() {
    if (this.ctx) return;

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

    // Warm Lowpass Filter
    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.setValueAtTime(420, this.ctx.currentTime);
    this.filter.Q.setValueAtTime(2.5, this.ctx.currentTime);

    // Connect to destination
    this.masterGain.connect(this.filter);
    this.filter.connect(this.ctx.destination);

    // Harmonic chord frequencies (Warm minor 9th / ambient drone: D2, A2, F3, C4, E4)
    const freqs = [73.42, 110.00, 174.61, 261.63, 329.63];

    freqs.forEach((freq, index) => {
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();

      osc.type = index % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      // Subtle detune for natural warmth & phase movement
      osc.detune.setValueAtTime((index - 2) * 4, this.ctx.currentTime);

      // Low individual gains so it's gentle and unobtrusive
      const individualVolume = (0.04 / (index + 1)) * 0.8;
      oscGain.gain.setValueAtTime(individualVolume, this.ctx.currentTime);

      // LFO modulation for organic breath
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(0.08 + (index * 0.03), this.ctx.currentTime);
      lfoGain.gain.setValueAtTime(4, this.ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.detune);

      osc.connect(oscGain);
      oscGain.connect(this.masterGain);

      osc.start();
      lfo.start();

      this.oscillators.push({ osc, oscGain, lfo });
    });
  }

  toggle() {
    if (!this.ctx) {
      this.initAudio();
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    if (!this.isPlaying) {
      // Fade in
      this.isPlaying = true;
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.ctx.currentTime);
      this.masterGain.gain.exponentialRampToValueAtTime(0.4, this.ctx.currentTime + 2.5);
    } else {
      // Fade out
      this.isPlaying = false;
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.ctx.currentTime);
      this.masterGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 1.2);
    }

    return this.isPlaying;
  }
}

window.AmbientSoundscape = AmbientSoundscape;
