import { saveSystem } from "./SaveSystem";
import { Sfx } from "./Sound";

type Theme = "menu" | "game";

const THEMES: Record<Theme, { bass: number[]; lead: number[]; step: number }> = {
  menu: {
    bass: [130.8, 130.8, 174.6, 146.8],
    lead: [523, 659, 784, 659, 587, 494, 523, 0],
    step: 260,
  },
  game: {
    bass: [98, 98, 130.8, 116.5],
    lead: [392, 523, 494, 587, 523, 440, 392, 0],
    step: 200,
  },
};

class MusicEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private timer: number | null = null;
  private muted = false;
  private theme: Theme | null = null;
  private leadIdx = 0;
  private bassIdx = 0;
  private danger = false;

  init(): void {
    this.muted = saveSystem.get().muted;
  }

  private ensure(): AudioContext | null {
    if (!this.ctx) {
      try {
        const Ctor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.08;
        this.master.connect(this.ctx.destination);
      } catch {
        return null;
      }
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.08;
  }

  setDanger(on: boolean): void {
    if (this.danger === on) return;
    this.danger = on;
  }

  play(theme: Theme): void {
    if (this.theme === theme && this.timer !== null) return;
    this.stop();
    this.theme = theme;
    this.leadIdx = 0;
    this.bassIdx = 0;
    const ctx = this.ensure();
    if (!ctx) return;
    const cfg = THEMES[theme];
    this.timer = window.setInterval(() => this.tick(), cfg.step);
  }

  private tick(): void {
    if (!this.theme) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const cfg = THEMES[this.theme];

    const lead = cfg.lead[this.leadIdx % cfg.lead.length];
    if (lead > 0) {
      const freq = this.danger ? lead * 1.12 : lead;
      this.note(freq, cfg.step / 1000, this.danger ? "sawtooth" : "triangle", this.danger ? 1.1 : 0.9);
    }
    this.leadIdx++;

    if (this.leadIdx % 2 === 0) {
      const bass = cfg.bass[this.bassIdx % cfg.bass.length];
      if (bass > 0) this.note(bass, (cfg.step * 2) / 1000, "sawtooth", this.danger ? 0.7 : 0.5);
      this.bassIdx++;
    }
  }

  private note(freq: number, dur: number, type: OscillatorType, vol: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.theme = null;
    this.danger = false;
  }
}

export const Music = new MusicEngine();

export function setMuted(m: boolean): void {
  saveSystem.setMuted(m);
  Sfx.setMuted(m);
  Music.setMuted(m);
}

export function isMuted(): boolean {
  return saveSystem.get().muted;
}
