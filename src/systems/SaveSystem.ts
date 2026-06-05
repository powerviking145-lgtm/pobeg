import type { SaveData, PromoRecord, DailyQuests } from "../types";

const STORAGE_KEY = "escape-perekrestok:save:v1";
const SAVE_VERSION = 1;

function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    growthPoints: 0,
    totalRuns: 0,
    lastPromoDate: null,
    promosClaimedToday: 0,
    promos: [],
    bestTimeMs: null,
    tutorialSeen: false,
    muted: false,
    quests: null,
  };
}

// Обёртка над localStorage. Полностью офлайн, без сервера.
// При желании позже PromoProvider можно перевести на серверный источник,
// не трогая остальной код.
export class SaveSystem {
  private data: SaveData;

  constructor() {
    this.data = this.load();
  }

  private load(): SaveData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultSave();
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      // Мягкая миграция: добиваем недостающие поля дефолтами.
      return { ...defaultSave(), ...parsed, version: SAVE_VERSION };
    } catch {
      return defaultSave();
    }
  }

  save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // localStorage может быть недоступен (приватный режим) — игра всё равно играбельна.
    }
  }

  get(): Readonly<SaveData> {
    return this.data;
  }

  addGrowthPoints(points: number): number {
    this.data.growthPoints += points;
    this.save();
    return this.data.growthPoints;
  }

  incrementRuns(): void {
    this.data.totalRuns += 1;
    this.save();
  }

  recordBestTime(ms: number): void {
    if (this.data.bestTimeMs === null || ms < this.data.bestTimeMs) {
      this.data.bestTimeMs = ms;
      this.save();
    }
  }

  setLastPromoDate(date: string): void {
    this.data.lastPromoDate = date;
    this.save();
  }

  resetPromoDayIfNeeded(date: string): void {
    if (this.data.lastPromoDate !== date) {
      this.data.lastPromoDate = date;
      this.data.promosClaimedToday = 0;
      this.save();
    }
  }

  incrementPromosToday(): number {
    this.data.promosClaimedToday += 1;
    this.save();
    return this.data.promosClaimedToday;
  }

  getPromosClaimedToday(): number {
    return this.data.promosClaimedToday;
  }

  addPromo(record: PromoRecord): void {
    this.data.promos.unshift(record);
    this.save();
  }

  markPromoUsed(code: string): void {
    const rec = this.data.promos.find((p) => p.code === code);
    if (rec) {
      rec.usedInStore = true;
      this.save();
    }
  }

  setTutorialSeen(seen: boolean): void {
    this.data.tutorialSeen = seen;
    this.save();
  }

  setMuted(muted: boolean): void {
    this.data.muted = muted;
    this.save();
  }

  setQuests(quests: DailyQuests): void {
    this.data.quests = quests;
    this.save();
  }

  reset(): void {
    this.data = defaultSave();
    this.save();
  }
}

// Единый экземпляр на всё приложение.
export const saveSystem = new SaveSystem();
