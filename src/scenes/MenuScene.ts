import Phaser from "phaser";
import { GAME_W, COLORS, TEX, playerTexForStage, playerStageFrameBase } from "../config";
import { hasPlayerSheet, playerAnimKey } from "../systems/AnimationSystem";
import {
  makeButton,
  drawSceneBackground,
  makeMuteButton,
  makeReadableText,
} from "../systems/ui";
import {
  HUD_BUTTON,
  HUD_COLORS,
  HUD_FONT,
  MAX_PROMOS_PER_DAY,
} from "../systems/uiTheme";
import { Music } from "../systems/Music";
import { GrowthSystem } from "../systems/GrowthSystem";
import { saveSystem } from "../systems/SaveSystem";
import { canClaimRunPromo, getPromosClaimedToday } from "../systems/PromoSystem";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("Menu");
  }

  create(): void {
    drawSceneBackground(this, COLORS.skyTop, COLORS.sky, 0.62);
    Music.play("menu");
    this.cameras.main.fadeIn(250, 0, 0, 0);
    makeMuteButton(this, 40, 52);

    const panel = this.add.graphics().setDepth(1);
    panel.fillStyle(0x0e1726, 0.9);
    panel.fillRoundedRect(16, 48, GAME_W - 32, 200, 18);

    makeReadableText(this, GAME_W / 2, 98, "ПОБЕГ В", {
      fontSize: HUD_FONT.title,
    }).setOrigin(0.5);

    makeReadableText(this, GAME_W / 2, 162, "ПЕРЕКРЁСТОК", {
      fontSize: HUD_FONT.xl,
      color: HUD_COLORS.success,
    }).setOrigin(0.5);

    makeReadableText(this, GAME_W / 2, 218, "мобилка · жесты", {
      fontSize: HUD_FONT.sm,
      color: HUD_COLORS.secondary,
    }).setOrigin(0.5);

    const stage = GrowthSystem.currentStage();
    const sheet = hasPlayerSheet(this);
    const tex = sheet ? TEX.player_sheet : playerTexForStage(stage.id);
    const preview = this.add
      .sprite(GAME_W / 2, 370, tex, sheet ? playerStageFrameBase(stage.id) : 0)
      .setOrigin(0.5, 1)
      .setScale(1.4)
      .setDepth(2);
    const runKey = playerAnimKey(stage.id, "run");
    if (this.anims.exists(runKey)) preview.play(runKey);
    else {
      this.tweens.add({
        targets: preview,
        y: 354,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: "Sine.inOut",
      });
    }

    makeReadableText(this, GAME_W / 2, 400, stage.name, {
      fontSize: HUD_FONT.md,
      color: HUD_COLORS.accent,
    }).setOrigin(0.5);

    this.drawGrowthBar(GAME_W / 2, 438);

    makeButton(this, GAME_W / 2, 540, "ИГРАТЬ", () => {
      this.scene.start("Game");
    });

    const promoCount = saveSystem.get().promos.length;
    makeButton(
      this,
      GAME_W / 2,
      644,
      promoCount > 0 ? `ПРОМОКОДЫ (${promoCount})` : "ПРОМОКОДЫ",
      () => this.scene.start("Promo", { from: "Menu" }),
      { fill: 0xffd23f, height: 76, fontSize: 34 }
    );

    makeButton(
      this,
      GAME_W - 52,
      52,
      "?",
      () => {
        this.registry.set("forceTutorial", true);
        this.scene.start("Game");
      },
      { width: 56, height: 56, fontSize: HUD_BUTTON.smallFontSize, fill: 0x16223c, textColor: "#ffffff" }
    );

    const claimable = canClaimRunPromo();
    const promosToday = getPromosClaimedToday();
    const footer = this.add.graphics().setDepth(1);
    footer.fillStyle(0x0e1726, 0.94);
    footer.fillRect(0, 820, GAME_W, 140);

    makeReadableText(
      this,
      GAME_W / 2,
      848,
      claimable
        ? `Промо: ${promosToday}/${MAX_PROMOS_PER_DAY} сегодня`
        : "Промо на сегодня получены",
      {
        fontSize: HUD_FONT.sm,
        color: claimable ? HUD_COLORS.success : HUD_COLORS.muted,
      }
    ).setOrigin(0.5, 0);

    makeReadableText(this, GAME_W / 2, 910, "1 палец — бег\n2-й палец — ↑ прыжок", {
      fontSize: HUD_FONT.sm,
      color: HUD_COLORS.secondary,
      align: "center",
      lineSpacing: 8,
    }).setOrigin(0.5, 0);
  }

  private drawGrowthBar(cx: number, cy: number): void {
    const w = 320;
    const h = 18;
    const { ratio, next } = GrowthSystem.progressToNext();
    const g = this.add.graphics().setDepth(2);
    g.fillStyle(0x000000, 0.5);
    g.fillRoundedRect(cx - w / 2, cy, w, h, 9);
    g.fillStyle(0x7ed957, 1);
    g.fillRoundedRect(cx - w / 2, cy, Math.max(12, w * ratio), h, 9);
    if (next) {
      makeReadableText(this, cx, cy + h + 12, `→ ${next.name}`, {
        fontSize: HUD_FONT.xs,
        color: HUD_COLORS.muted,
      }).setOrigin(0.5, 0);
    }
  }
}
