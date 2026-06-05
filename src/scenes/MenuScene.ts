import Phaser from "phaser";
import { GAME_W, COLORS, TEX, playerTexForStage, playerStageFrameBase } from "../config";
import { hasPlayerSheet, playerAnimKey } from "../systems/AnimationSystem";
import { makeButton, drawSceneBackground, makeMuteButton } from "../systems/ui";
import { HUD_COLORS, HUD_FONT, HUD_FONT_FAMILY, MAX_PROMOS_PER_DAY } from "../systems/uiTheme";
import { Music } from "../systems/Music";
import { GrowthSystem } from "../systems/GrowthSystem";
import { saveSystem } from "../systems/SaveSystem";
import { canClaimRunPromo, getPromosClaimedToday } from "../systems/PromoSystem";
import { Quests } from "../systems/Quests";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("Menu");
  }

  create(): void {
    drawSceneBackground(this, COLORS.skyTop, COLORS.sky, 0.2);
    if (this.textures.exists(TEX.shelf_wall)) {
      this.add
        .image(GAME_W / 2, 500, TEX.shelf_wall)
        .setScale(2.2)
        .setAlpha(0.35)
        .setDepth(-1);
    }
    Music.play("menu");
    this.cameras.main.fadeIn(250, 0, 0, 0);
    makeMuteButton(this, 30, 44);

    this.add
      .text(GAME_W / 2, 110, "ПОБЕГ В", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "44px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.add
      .text(GAME_W / 2, 162, "ПЕРЕКРЁСТОК", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "48px",
        color: "#3ad17a",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.add
      .text(GAME_W / 2, 210, "мобилка: жесты · ПК: клавиатура", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "18px",
        color: "#c8d2e0",
      })
      .setOrigin(0.5);

    // Превью персонажа с текущей стадией роста (тамаготчи).
    const stage = GrowthSystem.currentStage();
    const sheet = hasPlayerSheet(this);
    const tex = sheet ? TEX.player_sheet : playerTexForStage(stage.id);
    const preview = this.add
      .sprite(GAME_W / 2, 380, tex, sheet ? playerStageFrameBase(stage.id) : 0)
      .setOrigin(0.5, 1)
      .setScale(1.35);
    const runKey = playerAnimKey(stage.id, "run");
    if (this.anims.exists(runKey)) preview.play(runKey);
    else {
      this.tweens.add({
        targets: preview,
        y: 364,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: "Sine.inOut",
      });
    }

    this.add
      .text(GAME_W / 2, 430, `Стадия: ${stage.name}`, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "22px",
        color: "#ffd23f",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.add
      .text(GAME_W / 2, 458, GrowthSystem.statLine(stage), {
        fontFamily: "system-ui, sans-serif",
        fontSize: "14px",
        color: "#9aa6b6",
      })
      .setOrigin(0.5);

    this.drawGrowthBar(GAME_W / 2, 478);

    // Кнопки.
    makeButton(this, GAME_W / 2, 580, "ИГРАТЬ", () => {
      this.scene.start("Game");
    });

    const promoCount = saveSystem.get().promos.length;
    makeButton(
      this,
      GAME_W / 2,
      668,
      `МОИ ПРОМОКОДЫ (${promoCount})`,
      () => this.scene.start("Promo", { from: "Menu" }),
      { fill: 0xffd23f }
    );

    // Маленькая кнопка повтора обучения.
    makeButton(
      this,
      GAME_W - 44,
      44,
      "?",
      () => {
        this.registry.set("forceTutorial", true);
        this.scene.start("Game");
      },
      { width: 52, height: 52, fontSize: 26, fill: 0x16223c, textColor: "#ffffff" }
    );

    // Подсказка о ежедневной награде.
    const claimable = canClaimRunPromo();
    const promosToday = getPromosClaimedToday();
    this.add
      .text(
        GAME_W / 2,
        726,
        claimable
          ? `Промо сегодня: ${promosToday}/${MAX_PROMOS_PER_DAY} — пройди уровень!`
          : `Все ${MAX_PROMOS_PER_DAY} промо на сегодня получены. Завтра снова!`,
        {
          fontFamily: "system-ui, sans-serif",
          fontSize: "15px",
          color: claimable ? "#7ed957" : "#9aa6b6",
          align: "center",
          wordWrap: { width: GAME_W - 80 },
        }
      )
      .setOrigin(0.5);

    this.drawQuestsCompact(748);

    this.add
      .text(GAME_W / 2, 900, "тач: 1 палец — бег, 2-й — ↑↓  |  ПК: A D · Space · F", {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: HUD_FONT.sm,
        color: HUD_COLORS.secondary,
        align: "center",
      })
      .setOrigin(0.5, 1);
  }

  private drawQuestsCompact(top: number): void {
    const quests = Quests.ensureToday();
    const lines = quests.items
      .slice(0, 2)
      .map((q) => {
        const mark = q.claimed ? "✓" : `${q.progress}/${q.target}`;
        return `${q.title} ${mark}`;
      })
      .join("  ·  ");
    this.add
      .text(GAME_W / 2, top, `Задания: ${lines}`, {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: HUD_FONT.sm,
        color: HUD_COLORS.accent,
        align: "center",
        wordWrap: { width: GAME_W - 48 },
      })
      .setOrigin(0.5);
  }

  private drawGrowthBar(cx: number, cy: number): void {
    const w = 280;
    const h = 16;
    const { ratio, next } = GrowthSystem.progressToNext();
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.3);
    g.fillRoundedRect(cx - w / 2, cy, w, h, 8);
    g.fillStyle(0x7ed957, 1);
    g.fillRoundedRect(cx - w / 2, cy, Math.max(8, w * ratio), h, 8);
    const label = next ? `до стадии «${next.name}»` : "максимальная стадия";
    this.add
      .text(cx, cy + h + 14, label, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "13px",
        color: "#9aa6b6",
      })
      .setOrigin(0.5);
  }
}
