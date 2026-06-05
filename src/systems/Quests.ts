import type { DailyQuests, QuestState, QuestType } from "../types";
import { saveSystem } from "./SaveSystem";
import { todayKey } from "./PromoSystem";
import { RNG } from "./rng";

// Детерминированный seed из строки даты.
function dateSeed(date: string): number {
  let h = 2166136261;
  for (let i = 0; i < date.length; i++) {
    h = Math.imul(h ^ date.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

interface QuestTemplate {
  type: QuestType;
  title: (n: number) => string;
  min: number;
  max: number;
  reward: number;
}

const TEMPLATES: QuestTemplate[] = [
  { type: "eat", title: (n) => `Съешь ${n} продуктов`, min: 12, max: 22, reward: 10 },
  { type: "kill", title: (n) => `Победи ${n} врагов`, min: 6, max: 12, reward: 12 },
  { type: "smash", title: (n) => `Разбей ${n} ящиков`, min: 3, max: 6, reward: 8 },
  { type: "noDamage", title: () => `Пройди забег без урона`, min: 1, max: 1, reward: 15 },
];

// Ежедневные задания. Хранятся в сейве, сбрасываются по дате.
// Награда — очки роста (ускоряет тамаготчи). Промокод остаётся отдельной
// наградой «раз в сутки за прохождение».
export class Quests {
  static ensureToday(): DailyQuests {
    const today = todayKey();
    const cur = saveSystem.get().quests;
    if (cur && cur.date === today) return cur;
    const generated = this.generate(today);
    saveSystem.setQuests(generated);
    return generated;
  }

  private static generate(date: string): DailyQuests {
    const rng = new RNG(dateSeed(date));
    const pool = rng.shuffle(TEMPLATES).slice(0, 3);
    const items: QuestState[] = pool.map((tpl, idx) => {
      const target = rng.int(tpl.min, tpl.max);
      return {
        id: `${date}_${tpl.type}_${idx}`,
        type: tpl.type,
        title: tpl.title(target),
        target,
        progress: 0,
        reward: tpl.reward,
        claimed: false,
      };
    });
    return { date, items };
  }

  // Добавить прогресс по типу. Возвращает выполненные задания (для награды/тоста).
  static addProgress(type: QuestType, amount = 1): QuestState[] {
    const q = this.ensureToday();
    const completed: QuestState[] = [];
    for (const it of q.items) {
      if (it.type === type && !it.claimed) {
        it.progress = Math.min(it.target, it.progress + amount);
        if (it.progress >= it.target) {
          it.claimed = true;
          completed.push(it);
        }
      }
    }
    saveSystem.setQuests(q);
    return completed;
  }
}
