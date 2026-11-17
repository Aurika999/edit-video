// Sunetul: amesteca sunetul video-ului cu muzica aleasa,
// atat pentru ascultare cat si pentru fisierul salvat.

export class AudioEngine {
  constructor(video, music) {
    this.video = video;
    this.music = music;
    this.ctx = null;
    this.videoVolume = 1;
  }

  ensure() {
    if (!this.ctx) {
      const ctx = (this.ctx = new AudioContext());
      this.videoGain = ctx.createGain();
      this.musicGain = ctx.createGain();
      this.monitor = ctx.createGain();
      this.rec = ctx.createMediaStreamDestination();
      ctx.createMediaElementSource(this.video).connect(this.videoGain);
      ctx.createMediaElementSource(this.music).connect(this.musicGain);
      for (const g of [this.videoGain, this.musicGain]) {
        g.connect(this.monitor); // la difuzoare
        g.connect(this.rec); // in fisierul salvat
      }
      this.monitor.connect(ctx.destination);
      this.videoGain.gain.value = this.videoVolume;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  get recordStream() {
    this.ensure();
    return this.rec.stream;
  }

  setMonitor(on) {
    if (this.monitor) this.monitor.gain.value = on ? 1 : 0;
  }

  setVideoVolume(v) {
    this.videoVolume = v;
    if (this.videoGain) this.videoGain.gain.value = v;
  }

  setMusicGain(v) {
    if (this.musicGain) this.musicGain.gain.value = v;
  }
}

/** Unde trebuie sa fie melodia (in secunde) cand video-ul e la secunda t; null = muzica tace. */
export function musicTarget(m, t, songDuration) {
  if (!m || !songDuration || !isFinite(songDuration)) return null;
  const into = t - m.at;
  if (into < 0) return null;
  const span = songDuration - m.from;
  if (span <= 0.05) return null;
  if (into >= span && !m.loop) return null;
  return m.from + (into % span);
}

export function musicGainAt(m, t, videoDuration) {
  let g = m.volume;
  if (m.fadeIn) g *= Math.min(1, Math.max(0, (t - m.at) / 1));
  if (m.fadeOut) g *= Math.min(1, Math.max(0, (videoDuration - t) / 2));
  return g;
}

/** Tine melodia sincronizata cu video-ul. Se apeleaza la fiecare cadru. */
export function syncMusic(engine, el, m, t, playing, videoDuration) {
  const target = m ? musicTarget(m, t, el.duration) : null;
  if (!playing || target === null) {
    if (!el.paused) el.pause();
    return;
  }
  if (Math.abs(el.currentTime - target) > 0.25) el.currentTime = target;
  if (el.paused) el.play().catch(() => {});
  engine.setMusicGain(musicGainAt(m, t, videoDuration));
}
