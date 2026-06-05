import type { PromoRecord } from "../types";
import { saveSystem } from "./SaveSystem";
import { MAX_PROMOS_PER_DAY } from "./uiTheme";

// Локальная дата в формате YYYY-MM-DD (по часовому поясу устройства).
export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Источник промокодов. Абстракция, чтобы позже подменить генерацию на реальный пул
// (например, чтение public/promo-pool.json) без правок остального кода.
export interface PromoProvider {
  nextPromo(date: string): { code: string; reward: string };
}

const REWARDS = [
  "Скидка 10% на весь чек",
  "Скидка 15% на молочку",
  "−20% на любимый товар",
  "200 бонусов на карту",
  "Кофе в подарок",
  "Скидка 25% на овощи и фрукты",
];

function randomBlock(rng: () => number, len: number): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // без похожих символов
  let s = "";
  for (let i = 0; i < len; i++) {
    s += chars[Math.floor(rng() * chars.length)];
  }
  return s;
}

// Простой генератор демо-кодов формата PEREK-XXXX-XXXX.
export class GeneratedProvider implements PromoProvider {
  nextPromo(_date: string): { code: string; reward: string } {
    const rng = Math.random;
    const code = `PEREK-${randomBlock(rng, 4)}-${randomBlock(rng, 4)}`;
    const reward = REWARDS[Math.floor(rng() * REWARDS.length)];
    return { code, reward };
  }
}

// Заготовка для будущего реального пула кодов.
export class PoolProvider implements PromoProvider {
  private pool: { code: string; reward: string }[];
  constructor(pool: { code: string; reward: string }[]) {
    this.pool = pool;
  }
  nextPromo(_date: string): { code: string; reward: string } {
    const item = this.pool.shift();
    if (!item) {
      return { code: "PEREK-OUT-OF-CODES", reward: "Коды закончились" };
    }
    return item;
  }
}

let activeProvider: PromoProvider = new GeneratedProvider();

export function setPromoProvider(provider: PromoProvider): void {
  activeProvider = provider;
}

export interface ClaimResult {
  granted: boolean;
  record?: PromoRecord;
  reason?: "already-claimed-today" | "daily-cap";
  nextAvailable?: string;
  remainingToday?: number;
}

export function getPromosClaimedToday(date: string = todayKey()): number {
  saveSystem.resetPromoDayIfNeeded(date);
  return saveSystem.getPromosClaimedToday();
}

export function canClaimRunPromo(date: string = todayKey()): boolean {
  saveSystem.resetPromoDayIfNeeded(date);
  return saveSystem.getPromosClaimedToday() < MAX_PROMOS_PER_DAY;
}

/** @deprecated используйте canClaimRunPromo */
export function canClaimToday(date: string = todayKey()): boolean {
  return canClaimRunPromo(date);
}

// Промокод за прохождение уровня (до MAX_PROMOS_PER_DAY в сутки).
export function claimRunPromo(date: string = todayKey()): ClaimResult {
  saveSystem.resetPromoDayIfNeeded(date);
  const claimed = saveSystem.getPromosClaimedToday();
  if (claimed >= MAX_PROMOS_PER_DAY) {
    return {
      granted: false,
      reason: "daily-cap",
      nextAvailable: "завтра",
      remainingToday: 0,
    };
  }
  const { code, reward } = activeProvider.nextPromo(date);
  const record: PromoRecord = {
    code,
    date,
    reward,
    usedInStore: false,
  };
  saveSystem.addPromo(record);
  saveSystem.setLastPromoDate(date);
  const count = saveSystem.incrementPromosToday();
  return {
    granted: true,
    record,
    remainingToday: MAX_PROMOS_PER_DAY - count,
  };
}

/** @deprecated используйте claimRunPromo */
export function claimDailyPromo(date: string = todayKey()): ClaimResult {
  return claimRunPromo(date);
}
