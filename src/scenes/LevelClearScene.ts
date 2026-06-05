import Phaser from "phaser";
import { GAME_W, GAME_H, TEX } from "../config";
import { makeButton, drawSceneBackground } from "../systems/ui";
import { claimRunPromo } from "../systems/PromoSystem";
import { GrowthSystem } from "../systems/GrowthSystem";
import { Quests } from "../systems/Quests";
import { Music } from "../systems/Music";
import { VfxSystem } from "../systems/VfxSystem";
import { formatRunTime } from "../systems/hudWidgets";
import {
  HUD_COLORS,
  HUD_FONT,
  HUD_FONT_FAMILY,
  MAX_PROMOS_PER_DAY,
} from "../systems/uiTheme";
import { saveSystem } from "../systems/SaveSystem";
import type { PromoRecord } from "../types";

export class LevelClearScene extends Phaser.Scene {
  private timeMs = 0;
  private levelIndex = 1;

  constructor() {
    super("LevelClear");
  }

  init(data: { timeMs?: number; levelIndex?: number }): void {
    this.timeMs = data?.timeMs ?? 0;
    this.levelIndex = data?.levelIndex ?? 1;
  }

  create(): void {
    drawSceneBackground(this, 0x214d36, 0x1b2a4a, 0.5);
    Music.play("menu");
    this.cameras.main.fadeIn(250, 0, 0, 0);

    this.add
      .text(GAME_W / 2, 72, `УРОВЕНЬ ${this.levelIndex} ПРОЙДЕН!`, {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: HUD_FONT.xl,
        color: HUD_COLORS.success,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const exitImg = this.add.image(GAME_W / 2, 168, TEX.exit).setScale(1.05);
    this.tweens.add({
      targets: exitImg,
      scale: 1.15,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });

    new VfxSystem(this).confetti(40);

    const best = saveSystem.get().bestTimeMs;
    const bestLine =
      best !== null && best === this.timeMs
        ? "Новый рекорд!"
        : best !== null
          ? `Рекорд: ${formatRunTime(best)}`
          : "";

    this.add
      .text(GAME_W / 2, 248, formatRunTime(this.timeMs), {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: "36px",
        color: HUD_COLORS.accent,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    if (bestLine) {
      this.add
        .text(GAME_W / 2, 286, bestLine, {
          fontFamily: HUD_FONT_FAMILY,
          fontSize: HUD_FONT.md,
          color: bestLine.startsWith("Новый") ? HUD_COLORS.accent : HUD_COLORS.secondary,
        })
        .setOrigin(0.5);
    }

    this.add
      .text(GAME_W / 2, 318, `Стадия: ${GrowthSystem.currentStage().name}`, {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: HUD_FONT.sm,
        color: HUD_COLORS.primary,
      })
      .setOrigin(0.5);

    const q = Quests.ensureToday();
    const done = q.items.filter((i) => i.claimed).length;
    this.add
      .text(GAME_W / 2, 344, `Задания дня: ${done}/${q.items.length}`, {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: HUD_FONT.sm,
        color: HUD_COLORS.success,
      })
      .setOrigin(0.5);

    const promoY = 420;
    this.showPromo(promoY);

    const nextSeed = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
    makeButton(this, GAME_W / 2, GAME_H - 188, "СЛЕДУЮЩИЙ УРОВЕНЬ", () => {
      this.scene.start("Game", {
        levelIndex: this.levelIndex + 1,
        chainSeed: nextSeed,
      });
    });

    makeButton(
      this,
      GAME_W / 2,
      GAME_H - 104,
      "В МЕНЮ",
      () => this.scene.start("Menu"),
      { fill: 0xffd23f }
    );
  }

  private showPromo(cardY: number): void {
    const result = claimRunPromo();

    if (result.granted && result.record) {
      this.renderPromoCard(cardY, result.record, result.remainingToday ?? 0);
      return;
    }

    const msg =
      result.reason === "daily-cap"
        ? `Промо на сегодня закончились (${MAX_PROMOS_PER_DAY}/${MAX_PROMOS_PER_DAY}).\nПродолжай за рост и задания!`
        : "Промокод не выдан — попробуй позже.";

    this.add
      .text(GAME_W / 2, cardY, msg, {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: HUD_FONT.sm,
        color: HUD_COLORS.secondary,
        align: "center",
        wordWrap: { width: GAME_W - 64 },
      })
      .setOrigin(0.5, 0);
  }

  private renderPromoCard(y: number, record: PromoRecord, remaining: number): void {
    const g = this.add.graphics();
    const w = GAME_W - 56;
    const h = 118;
    g.fillStyle(0x16223c, 0.95);
    g.fillRoundedRect((GAME_W - w) / 2, y, w, h, 16);
    g.lineStyle(2, 0xffd23f, 0.7);
    g.strokeRoundedRect((GAME_W - w) / 2, y, w, h, 16);

    this.add
      .text(GAME_W / 2, y + 22, "Твой промокод", {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: HUD_FONT.sm,
        color: HUD_COLORS.secondary,
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_W / 2, y + 52, record.code, {
        fontFamily: "monospace",
        fontSize: "22px",
        color: HUD_COLORS.accent,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_W / 2, y + 82, record.reward, {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: HUD_FONT.sm,
        color: HUD_COLORS.primary,
        align: "center",
        wordWrap: { width: w - 32 },
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_W / 2, y + h + 12, `Осталось сегодня: ${remaining}/${MAX_PROMOS_PER_DAY}`, {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: "12px",
        color: HUD_COLORS.muted,
      })
      .setOrigin(0.5, 0);
  }
}
