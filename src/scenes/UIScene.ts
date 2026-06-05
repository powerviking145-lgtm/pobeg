import Phaser from "phaser";
import { GAME_W, GAME_H, TEX } from "../config";
import { makeButton, makeMuteButton, sharpenText } from "../systems/ui";
import {
  createPuzzleBanner,
  createQuestCard,
  createTimerWidget,
  type QuestCard,
} from "../systems/hudWidgets";
import {
  HUD_BUTTON,
  HUD_COLORS,
  HUD_DEPTH,
  HUD_FONT,
  HUD_FONT_FAMILY,
  HUD_LAYOUT,
  HUD_TEXT_STROKE,
  MAX_PROMOS_PER_DAY,
} from "../systems/uiTheme";
import type { ControlMode } from "../systems/InputSystem";
import type { QuestType } from "../types";

interface QuestHud {
  id: string;
  title: string;
  progress: number;
  target: number;
  claimed: boolean;
  type?: QuestType;
}

interface HudData {
  hp: number;
  maxHp: number;
  stageName: string;
  stageStats?: string;
  puzzleHint?: string;
  growthRatio: number;
  hasKey: boolean;
  runTimeMs?: number;
  dashCooldown?: number;
  hasDash?: boolean;
  controlMode?: ControlMode;
  quests?: QuestHud[];
  bestTimeMs?: number | null;
  levelIndex?: number;
  promosToday?: number;
  showControlsHint?: boolean;
  questPulseId?: string | null;
}

export class UIScene extends Phaser.Scene {
  private hearts: Phaser.GameObjects.Image[] = [];
  private topPanel!: Phaser.GameObjects.Graphics;
  private questPanel!: Phaser.GameObjects.Graphics;
  private bottomPanel!: Phaser.GameObjects.Graphics;
  private metaText!: Phaser.GameObjects.Text;
  private growthBar!: Phaser.GameObjects.Graphics;
  private keyIcon!: Phaser.GameObjects.Image;
  private timerWidget!: ReturnType<typeof createTimerWidget>;
  private questCards: QuestCard[] = [];
  private dashBar!: Phaser.GameObjects.Graphics;
  private controlsHint!: Phaser.GameObjects.Text;
  private puzzleBanner!: ReturnType<typeof createPuzzleBanner>;
  private vignette!: Phaser.GameObjects.Graphics;
  private lastHp = 3;
  private lastPuzzleHint = "";
  private lastQuestPulseId: string | null = null;

  constructor() {
    super("UI");
  }

  create(): void {
    const { topPanelH, bottomPanelH, questPanelH, sidePadding } = HUD_LAYOUT;

    this.topPanel = this.add.graphics().setScrollFactor(0).setDepth(HUD_DEPTH.panel);
    this.topPanel.fillStyle(0x0e1726, HUD_COLORS.panelAlpha);
    this.topPanel.fillRect(0, 0, GAME_W, topPanelH);

    this.questPanel = this.add.graphics().setScrollFactor(0).setDepth(HUD_DEPTH.panel);
    this.questPanel.fillStyle(0x0e1726, 0.9);
    this.questPanel.fillRect(0, GAME_H - questPanelH - bottomPanelH, GAME_W, questPanelH);

    this.bottomPanel = this.add.graphics().setScrollFactor(0).setDepth(HUD_DEPTH.panel);
    this.bottomPanel.fillStyle(0x0e1726, 0.96);
    this.bottomPanel.fillRect(0, GAME_H - bottomPanelH, GAME_W, bottomPanelH);

    this.hearts = [];
    for (let i = 0; i < 6; i++) {
      const h = this.add
        .image(sidePadding + i * 34, 34, TEX.heart)
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setScale(1.15)
        .setDepth(HUD_DEPTH.hudText);
      this.hearts.push(h);
    }

    this.timerWidget = createTimerWidget(this, GAME_W / 2, 36);

    this.metaText = sharpenText(
      this.add
        .text(sidePadding, 68, "", {
          fontFamily: HUD_FONT_FAMILY,
          fontSize: HUD_FONT.sm,
          color: HUD_COLORS.primary,
          fontStyle: "bold",
          stroke: HUD_TEXT_STROKE.color,
          strokeThickness: 5,
        })
        .setScrollFactor(0)
        .setDepth(HUD_DEPTH.hudText)
    );

    this.growthBar = this.add.graphics().setScrollFactor(0).setDepth(HUD_DEPTH.hudText);
    this.dashBar = this.add.graphics().setScrollFactor(0).setDepth(HUD_DEPTH.hudText);

    this.keyIcon = this.add
      .image(GAME_W - sidePadding - 58, 34, TEX.key)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setScale(1.25)
      .setAlpha(0.35)
      .setDepth(HUD_DEPTH.hudText);

    makeButton(
      this,
      GAME_W - sidePadding - 6,
      34,
      "☰",
      () => {
        this.scene.stop("Game");
        this.scene.stop("UI");
        this.scene.start("Menu");
      },
      { width: 50, height: 44, fontSize: HUD_BUTTON.smallFontSize, fill: 0x1a2840, textColor: HUD_COLORS.primary }
    ).setDepth(HUD_DEPTH.hudText);

    makeMuteButton(this, GAME_W - sidePadding - 6, 88).setDepth(HUD_DEPTH.hudText);

    const { questCardW, questStartY, questCardGap } = HUD_LAYOUT;
    for (let i = 0; i < 3; i++) {
      this.questCards.push(
        createQuestCard(this, GAME_W / 2, questStartY + i * questCardGap, questCardW)
      );
    }

    this.puzzleBanner = createPuzzleBanner(this);

    this.controlsHint = sharpenText(
      this.add
        .text(GAME_W / 2, GAME_H - 6, "1 палец — бег · 2-й — ↑", {
          fontFamily: HUD_FONT_FAMILY,
          fontSize: HUD_FONT.xs,
          color: HUD_COLORS.secondary,
          stroke: HUD_TEXT_STROKE.color,
          strokeThickness: 5,
        })
        .setOrigin(0.5, 1)
        .setScrollFactor(0)
        .setDepth(HUD_DEPTH.hudText)
    );

    this.vignette = this.add
      .graphics()
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH.vignette)
      .setAlpha(0);
  }

  private flashDamage(): void {
    this.vignette.clear();
    this.vignette.fillStyle(0x880000, 0.35);
    this.vignette.fillRect(0, 0, GAME_W, GAME_H);
    this.vignette.setAlpha(1);
    this.tweens.add({ targets: this.vignette, alpha: 0, duration: 400 });
  }

  update(): void {
    const hud = this.registry.get("hud") as HudData | undefined;
    if (!hud) return;

    if (hud.hp < this.lastHp) this.flashDamage();
    this.lastHp = hud.hp;

    this.hearts.forEach((h, i) => {
      const filled = i < hud.hp;
      h.setVisible(i < hud.maxHp);
      h.setTint(filled ? 0xffffff : 0x404a5e);
      h.setAlpha(filled ? 1 : 0.5);
    });

    if (hud.hp <= 2) {
      this.vignette.clear();
      this.vignette.fillStyle(0x880000, 0.12);
      this.vignette.fillRect(0, 0, GAME_W, GAME_H);
      this.vignette.setAlpha(1);
    } else if (this.vignette.alpha < 0.05) {
      this.vignette.clear();
    }

    const promos = hud.promosToday ?? 0;
    this.metaText.setText(
      `Ур.${hud.levelIndex ?? 1}  ·  ${hud.stageName}  ·  промо ${promos}/${MAX_PROMOS_PER_DAY}`
    );

    const bx = HUD_LAYOUT.sidePadding;
    const by = 96;
    const bw = GAME_W - bx * 2 - 80;
    const bh = 10;
    this.growthBar.clear();
    this.growthBar.fillStyle(0x000000, 0.55);
    this.growthBar.fillRoundedRect(bx, by, bw, bh, 5);
    this.growthBar.fillStyle(0x7ed957, 1);
    this.growthBar.fillRoundedRect(bx, by, Math.max(10, bw * hud.growthRatio), bh, 5);

    this.dashBar.clear();
    if (hud.hasDash) {
      const dx = bx + bw + 10;
      const cd = hud.dashCooldown ?? 1;
      this.dashBar.fillStyle(0x000000, 0.55);
      this.dashBar.fillRoundedRect(dx, by, 58, bh, 5);
      this.dashBar.fillStyle(0xffd23f, 1);
      this.dashBar.fillRoundedRect(dx, by, Math.max(8, 58 * cd), bh, 5);
    }

    this.keyIcon.setAlpha(hud.hasKey ? 1 : 0.35);

    if (hud.runTimeMs !== undefined) {
      this.timerWidget.update(hud.runTimeMs, hud.bestTimeMs);
    }

    const quests = hud.quests ?? [];
    for (let i = 0; i < 3; i++) {
      const card = this.questCards[i];
      const q = quests[i];
      if (q) {
        card.container.setVisible(true);
        card.update(q);
      } else {
        card.container.setVisible(false);
      }
    }

    if (hud.questPulseId && hud.questPulseId !== this.lastQuestPulseId) {
      const idx = quests.findIndex((q) => q.id === hud.questPulseId);
      if (idx >= 0 && idx < 3) this.questCards[idx].pulse();
      this.lastQuestPulseId = hud.questPulseId;
    }

    const ph = hud.puzzleHint?.trim() ?? "";
    if (ph && ph !== this.lastPuzzleHint) {
      this.puzzleBanner.show(ph);
      this.lastPuzzleHint = ph;
    } else if (!ph) {
      this.lastPuzzleHint = "";
      this.puzzleBanner.hide();
    }

    if (hud.showControlsHint) {
      this.controlsHint.setAlpha(1);
      this.bottomPanel.setAlpha(1);
    } else {
      this.controlsHint.setAlpha(0);
      this.bottomPanel.setAlpha(0);
    }
  }
}
