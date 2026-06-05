import Phaser from "phaser";
import {
  TEX,
  PLAYER_FW,
  PLAYER_FH,
  PLAYER_FRAMES_PER_STAGE,
  ENEMY_FW,
  ENEMY_FH,
  playerStageFrameBase,
} from "../config";

// Регистрация анимаций для PNG-спрайтшитов (с fallback на статичные текстуры).
export function registerAnimations(scene: Phaser.Scene): void {
  if (scene.textures.exists(TEX.player_sheet)) {
    for (let stage = 0; stage < 4; stage++) {
      const base = playerStageFrameBase(stage);
      const prefix = `p${stage}`;
      createAnim(scene, `${prefix}_idle`, TEX.player_sheet, [base, base + 1], 4, -1);
      createAnim(scene, `${prefix}_run`, TEX.player_sheet, [base, base + 1, base + 2, base + 3], 10, -1);
      createAnim(scene, `${prefix}_jump`, TEX.player_sheet, [base + 4], 1, 0);
      createAnim(scene, `${prefix}_attack`, TEX.player_sheet, [base + 5], 1, 0);
    }
  }

  if (scene.textures.exists(TEX.enemy)) {
    const enemyTex = scene.textures.get(TEX.enemy);
    const frames = enemyTex.frameTotal;
    if (frames > 1 && !scene.anims.exists("enemy_roll")) {
      const last = Math.min(3, frames - 1);
      scene.anims.create({
        key: "enemy_roll",
        frames: scene.anims.generateFrameNumbers(TEX.enemy, { start: 0, end: last }),
        frameRate: 8,
        repeat: -1,
      });
    }
    if (frames > 4 && !scene.anims.exists("enemy_hurt")) {
      scene.anims.create({
        key: "enemy_hurt",
        frames: [{ key: TEX.enemy, frame: 4 }],
        frameRate: 1,
        repeat: 0,
      });
    }
  }
}

function createAnim(
  scene: Phaser.Scene,
  key: string,
  texture: string,
  frames: number[],
  frameRate: number,
  repeat: number
): void {
  if (scene.anims.exists(key)) return;
  scene.anims.create({
    key,
    frames: frames.map((f) => ({ key: texture, frame: f })),
    frameRate,
    repeat,
  });
}

export function playerAnimKey(stageId: number, state: "idle" | "run" | "jump" | "attack"): string {
  return `p${Math.min(stageId, 3)}_${state}`;
}

export function hasPlayerSheet(scene: Phaser.Scene): boolean {
  return scene.textures.exists(TEX.player_sheet);
}

export { PLAYER_FW, PLAYER_FH, ENEMY_FW, ENEMY_FH, PLAYER_FRAMES_PER_STAGE };
