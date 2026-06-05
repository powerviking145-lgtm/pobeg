// Лёгкие звуковые эффекты на WebAudio — синтез на лету, без аудиофайлов.
class SfxEngine {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private muted = false;

  setMuted(m: boolean): void {
    this.muted = m;
  }

  private ensure(): AudioContext | null {
    if (!this.enabled || this.muted) return null;
    if (!this.ctx) {
      try {
        const Ctor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        this.ctx = new Ctor();
      } catch {
        this.enabled = false;
        return null;
      }
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  private blip(
    freq: number,
    duration: number,
    type: OscillatorType = "square",
    volume = 0.12,
    slideTo?: number
  ): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(1, slideTo),
        ctx.currentTime + duration
      );
    }
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  private noiseBurst(duration: number, volume = 0.06): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start();
  }

  jump(): void {
    this.blip(420, 0.18, "square", 0.1, 720);
  }
  eat(): void {
    this.blip(660, 0.12, "triangle", 0.12, 990);
    setTimeout(() => this.blip(880, 0.08, "triangle", 0.08), 60);
  }
  hurt(): void {
    this.blip(140, 0.22, "sawtooth", 0.16, 50);
  }
  hitEnemy(): void {
    this.blip(220, 0.1, "square", 0.1, 120);
  }
  kill(): void {
    this.blip(180, 0.14, "sawtooth", 0.14, 60);
    setTimeout(() => this.blip(320, 0.1, "triangle", 0.1), 70);
  }
  smash(): void {
    this.noiseBurst(0.12, 0.1);
    this.blip(120, 0.16, "sawtooth", 0.12, 40);
  }
  dash(): void {
    this.blip(520, 0.1, "triangle", 0.1, 880);
  }
  /** @deprecated use hurt/hitEnemy/kill */
  hit(): void {
    this.hitEnemy();
  }
  attack(): void {
    this.blip(300, 0.08, "square", 0.08, 200);
    this.noiseBurst(0.04, 0.04);
  }
  key(): void {
    this.blip(880, 0.1, "triangle", 0.12);
    setTimeout(() => this.blip(1180, 0.14, "triangle", 0.12), 90);
  }
  lever(): void {
    this.blip(240, 0.07, "square", 0.1, 360);
  }
  levelUp(): void {
    this.blip(523, 0.12, "triangle", 0.12);
    setTimeout(() => this.blip(659, 0.12, "triangle", 0.12), 110);
    setTimeout(() => this.blip(784, 0.16, "triangle", 0.12), 220);
  }
  win(): void {
    const notes = [523, 659, 784, 1046];
    notes.forEach((n, i) =>
      setTimeout(() => this.blip(n, 0.18, "triangle", 0.14), i * 130)
    );
  }
}

export const Sfx = new SfxEngine();
