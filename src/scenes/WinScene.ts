import Phaser from "phaser";
import { GAME_W, GAME_H, TEX, COLORS } from "../config";
import { makeButton, drawSceneBackground } from "../systems/ui";
import { claimRunPromo, getPromosClaimedToday } from "../systems/PromoSystem";
import { GrowthSystem } from "../systems/GrowthSystem";
import { Quests } from "../systems/Quests";
import { Music } from "../systems/Music";
import { VfxSystem } from "../systems/VfxSystem";
import { saveSystem } from "../systems/SaveSystem";
import { formatRunTime } from "../systems/hudWidgets";
import {
  HUD_COLORS,
  HUD_FONT,
  HUD_FONT_FAMILY,
  MAX_PROMOS_PER_DAY,
} from "../systems/uiTheme";
import type { PromoRecord } from "../types";

/** @deprecated Используйте LevelClearScene. Оставлен для совместимости. */
export class WinScene extends Phaser.Scene {
  private timeMs = 0;

  constructor() {
    super("Win");
  }

  init(data: { timeMs?: number }): void {
    this.timeMs = data?.timeMs ?? 0;
  }

  create(): void {
    drawSceneBackground(this, 0x214d36, COLORS.sky, 0.5);
    Music.play("menu");
    this.cameras.main.fadeIn(250, 0, 0, 0);

    this.add
      .text(GAME_W / 2, 90, "ТЫ ДОБЕЖАЛ!", {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: HUD_FONT.xl,
        color: HUD_COLORS.success,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const exitImg = this.add.image(GAME_W / 2, 200, TEX.exit).setScale(1.1);
    this.tweens.add({
      targets: exitImg,
      scale: 1.18,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });

    new VfxSystem(this).confetti(50);

    const best = saveSystem.get().bestTimeMs;
    const bestLine =
      best !== null && best === this.timeMs
        ? "Новый рекорд!"
        : best !== null
          ? `Рекорд: ${formatRunTime(best)}`
          : "";

    this.add
      .text(GAME_W / 2, 300, formatRunTime(this.timeMs), {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: "28px",
        color: HUD_COLORS.accent,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    if (bestLine) {
      this.add
        .text(GAME_W / 2, 332, bestLine, {
          fontFamily: HUD_FONT_FAMILY,
          fontSize: HUD_FONT.md,
          color: HUD_COLORS.primary,
        })
        .setOrigin(0.5);
    }

    this.add
      .text(GAME_W / 2, 360, `Стадия: ${GrowthSystem.currentStage().name}`, {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: HUD_FONT.sm,
        color: HUD_COLORS.accent,
      })
      .setOrigin(0.5);

    const q = Quests.ensureToday();
    const done = q.items.filter((i) => i.claimed).length;
    this.add
      .text(GAME_W / 2, 386, `Задания дня: ${done}/${q.items.length}`, {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: HUD_FONT.sm,
        color: HUD_COLORS.success,
      })
      .setOrigin(0.5);

    this.showPromo(420);

    makeButton(this, GAME_W / 2, GAME_H - 180, "ЕЩЁ РАЗ", () => {
      this.scene.start("Game", { levelIndex: 1 });
    });
    makeButton(
      this,
      GAME_W / 2,
      GAME_H - 96,
      "В МЕНЮ",
      () => this.scene.start("Menu"),
      { fill: 0xffd23f }
    );
  }

  private showPromo(cardY: number): void {
    const result = claimRunPromo();
    const claimed = getPromosClaimedToday();

    if (result.granted && result.record) {
      this.renderPromoCard(cardY, result.record, MAX_PROMOS_PER_DAY - claimed);
      return;
    }

    this.add
      .text(
        GAME_W / 2,
        cardY,
        claimed >= MAX_PROMOS_PER_DAY
          ? `Промо на сегодня: ${MAX_PROMOS_PER_DAY}/${MAX_PROMOS_PER_DAY}`
          : "Промокод не выдан",
        {
          fontFamily: HUD_FONT_FAMILY,
          fontSize: HUD_FONT.sm,
          color: HUD_COLORS.secondary,
        }
      )
      .setOrigin(0.5, 0);
  }

  private renderPromoCard(y: number, record: PromoRecord, remaining: number): void {
    const g = this.add.graphics();
    const w = GAME_W - 56;
    const h = 110;
    g.fillStyle(0x16223c, 0.95);
    g.fillRoundedRect((GAME_W - w) / 2, y, w, h, 16);
    g.lineStyle(2, 0xffd23f, 0.7);
    g.strokeRoundedRect((GAME_W - w) / 2, y, w, h, 16);

    this.add
      .text(GAME_W / 2, y + 24, record.code, {
        fontFamily: "monospace",
        fontSize: "20px",
        color: HUD_COLORS.accent,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_W / 2, y + 54, record.reward, {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: HUD_FONT.sm,
        color: HUD_COLORS.primary,
        align: "center",
        wordWrap: { width: w - 32 },
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_W / 2, y + h + 8, `Осталось: ${remaining}/${MAX_PROMOS_PER_DAY}`, {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: "12px",
        color: HUD_COLORS.muted,
      })
      .setOrigin(0.5, 0);
  }
}
