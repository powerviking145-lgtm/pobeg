import type { AbilityId, GrowthStage } from "../types";

import { saveSystem } from "./SaveSystem";



// Стадии роста: визуал почти не растёт, зато качаются прыжок, скорость и HP.

export const STAGES: GrowthStage[] = [

  {

    id: 0,

    name: "Кроха",

    minPoints: 0,

    scale: 0.38,

    jumpVelocity: 450,

    moveSpeed: 190,

    maxHp: 3,

    stompDamage: 1,

    ability: null,

  },

  {

    id: 1,

    name: "Малыш",

    minPoints: 8,

    scale: 0.44,

    jumpVelocity: 520,

    moveSpeed: 210,

    maxHp: 4,

    stompDamage: 1,

    ability: "doubleJump",

  },

  {

    id: 2,

    name: "Подросток",

    minPoints: 20,

    scale: 0.5,

    jumpVelocity: 590,

    moveSpeed: 230,

    maxHp: 5,

    stompDamage: 2,

    ability: "dash",

  },

  {

    id: 3,

    name: "Взрослый",

    minPoints: 40,

    scale: 0.56,

    jumpVelocity: 660,

    moveSpeed: 250,

    maxHp: 6,

    stompDamage: 2,

    ability: "smash",

  },

];



export class GrowthSystem {

  static stageForPoints(points: number): GrowthStage {

    let current = STAGES[0];

    for (const s of STAGES) {

      if (points >= s.minPoints) current = s;

    }

    return current;

  }



  static currentStage(): GrowthStage {

    return this.stageForPoints(saveSystem.get().growthPoints);

  }



  static unlockedAbilities(points: number = saveSystem.get().growthPoints): Set<AbilityId> {

    const set = new Set<AbilityId>();

    for (const s of STAGES) {

      if (points >= s.minPoints && s.ability) set.add(s.ability);

    }

    return set;

  }



  static progressToNext(points: number = saveSystem.get().growthPoints): {

    next: GrowthStage | null;

    ratio: number;

  } {

    const cur = this.stageForPoints(points);

    const nextIndex = cur.id + 1;

    if (nextIndex >= STAGES.length) return { next: null, ratio: 1 };

    const next = STAGES[nextIndex];

    const span = next.minPoints - cur.minPoints;

    const ratio = span > 0 ? (points - cur.minPoints) / span : 1;

    return { next, ratio: Math.max(0, Math.min(1, ratio)) };

  }



  /** Краткое описание бонусов стадии для HUD / тостов. */

  static statLine(stage: GrowthStage): string {

    const parts = [`↑${stage.jumpVelocity}`, `${stage.maxHp}❤`, `бег ${stage.moveSpeed}`];
    if (stage.stompDamage > 1) parts.push("топот ×2");

    return parts.join(" · ");

  }



  static addPoints(points: number): { newAbilities: AbilityId[]; leveledUp: boolean } {

    const before = saveSystem.get().growthPoints;

    const beforeAbilities = this.unlockedAbilities(before);

    const after = saveSystem.addGrowthPoints(points);

    const afterAbilities = this.unlockedAbilities(after);



    const newAbilities: AbilityId[] = [];

    for (const a of afterAbilities) {

      if (!beforeAbilities.has(a)) newAbilities.push(a);

    }

    const leveledUp = this.stageForPoints(after).id > this.stageForPoints(before).id;

    return { newAbilities, leveledUp };

  }

}

