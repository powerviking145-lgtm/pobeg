import Phaser from "phaser";
import { GAME_W, GAME_H, TEX } from "../config";
import { makeButton, makeMuteButton } from "../systems/ui";
import {
  createPuzzleBanner,
  createQuestCard,
  createTimerWidget,
  type QuestCard,
} from "../systems/hudWidgets";
import {
  HUD_COLORS,
  HUD_DEPTH,
  HUD_FONT,
  HUD_FONT_FAMILY,
  HUD_LAYOUT,
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
  private bottomPanel!: Phaser.GameObjects.Graphics;
  private stageText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private promoText!: Phaser.GameObjects.Text;
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
    const { topPanelH, bottomPanelH } = HUD_LAYOUT;

    this.topPanel = this.add
      .graphics()
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH.panel);
    this.topPanel.fillStyle(0x0e1726, HUD_COLORS.panelAlpha);
    this.topPanel.fillRect(0, 0, GAME_W, topPanelH);

    this.bottomPanel = this.add
      .graphics()
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH.panel);
    this.bottomPanel.fillStyle(0x0e1726, 0.45);
    this.bottomPanel.fillRect(0, GAME_H - bottomPanelH, GAME_W, bottomPanelH);

    this.hearts = [];
    for (let i = 0; i < 6; i++) {
      const h = this.add
        .image(HUD_LAYOUT.sidePadding + i * 28, 28, TEX.heart)
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setScale(0.85)
        .setDepth(HUD_DEPTH.hudText);
      this.hearts.push(h);
    }

    this.levelText = this.add
      .text(HUD_LAYOUT.sidePadding, 12, "Уровень 1", {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: HUD_FONT.sm,
        color: HUD_COLORS.accent,
        fontStyle: "bold",
      })
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH.hudText);

    this.add
      .text(GAME_W / 2, 12, "ЦЕЛЬ: ПЕРЕКРЁСТОК", {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: HUD_FONT.sm,
        color: HUD_COLORS.secondary,
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH.hudText);

    this.promoText = this.add
      .text(GAME_W - HUD_LAYOUT.sidePadding, 12, "", {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: "12px",
        color: HUD_COLORS.muted,
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH.hudText);

    this.timerWidget = createTimerWidget(this, GAME_W / 2, 40);

    this.stageText = this.add
      .text(HUD_LAYOUT.sidePadding, 52, "", {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: HUD_FONT.sm,
        color: HUD_COLORS.accent,
        fontStyle: "bold",
        wordWrap: { width: HUD_LAYOUT.questColumnX - HUD_LAYOUT.sidePadding - 8 },
      })
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH.hudText);

    this.growthBar = this.add.graphics().setScrollFactor(0).setDepth(HUD_DEPTH.hudText);
    this.dashBar = this.add.graphics().setScrollFactor(0).setDepth(HUD_DEPTH.hudText);

    this.keyIcon = this.add
      .image(GAME_W - 100, 28, TEX.key)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setScale(1.1)
      .setAlpha(0.3)
      .setDepth(HUD_DEPTH.hudText);

    makeButton(
      this,
      GAME_W - 44,
      28,
      "☰",
      () => {
        this.scene.stop("Game");
        this.scene.stop("UI");
        this.scene.start("Menu");
      },
      { width: 48, height: 40, fontSize: 22, fill: 0x1a2840, textColor: HUD_COLORS.primary }
    ).setDepth(HUD_DEPTH.hudText);

    makeButton(
      this,
      GAME_W - 44,
      72,
      "II",
      () => this.pauseGame(),
      { width: 48, height: 40, fontSize: 20, fill: 0x1a2840, textColor: HUD_COLORS.primary }
    ).setDepth(HUD_DEPTH.hudText);

    makeMuteButton(this, GAME_W - 44, 116).setDepth(HUD_DEPTH.hudText);

    const { questColumnX, questStartY, questCardGap, questColumnW } = HUD_LAYOUT;
    for (let i = 0; i < 3; i++) {
      this.questCards.push(
        createQuestCard(this, questColumnX, questStartY + i * questCardGap, questColumnW)
      );
    }

    this.puzzleBanner = createPuzzleBanner(this);

    this.controlsHint = this.add
      .text(GAME_W / 2, GAME_H - 10, "", {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: "12px",
        color: HUD_COLORS.muted,
      })
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH.hudText);

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

  private pauseGame(): void {
    if (this.scene.isPaused("Game")) return;
    this.scene.pause("Game");

    const overlay = this.add.container(0, 0).setDepth(HUD_DEPTH.panel + 10);
    const bg = this.add.graphics();
    bg.fillStyle(0x0e1726, 0.88);
    bg.fillRect(0, 0, GAME_W, GAME_H);
    const title = this.add
      .text(GAME_W / 2, GAME_H / 2 - 120, "ПАУЗА", {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: HUD_FONT.xl,
        color: HUD_COLORS.primary,
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    overlay.add([bg, title]);

    const resume = makeButton(this, GAME_W / 2, GAME_H / 2, "ПРОДОЛЖИТЬ", () => {
      overlay.destroy();
      this.scene.resume("Game");
    });
    const toMenu = makeButton(
      this,
      GAME_W / 2,
      GAME_H / 2 + 90,
      "В МЕНЮ",
      () => {
        overlay.destroy();
        this.scene.stop("Game");
        this.scene.stop("UI");
        this.scene.start("Menu");
      },
      { fill: 0xffd23f }
    );
    overlay.add([resume, toMenu]);
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
      h.setAlpha(filled ? 1 : 0.55);
    });

    if (hud.hp <= 2) {
      this.vignette.clear();
      this.vignette.fillStyle(0x880000, 0.1);
      this.vignette.fillRect(0, 0, GAME_W, GAME_H);
      this.vignette.setAlpha(1);
    } else if (this.vignette.alpha < 0.05) {
      this.vignette.clear();
    }

    const stageLine = hud.stageStats
      ? `${hud.stageName} · ${hud.stageStats}`
      : hud.stageName;
    this.stageText.setText(stageLine);

    this.levelText.setText(`Уровень ${hud.levelIndex ?? 1}`);
    const promos = hud.promosToday ?? 0;
    this.promoText.setText(`промо ${promos}/${MAX_PROMOS_PER_DAY}`);

    this.growthBar.clear();
    const bx = HUD_LAYOUT.sidePadding;
    const by = 88;
    const bw = 180;
    const bh = 12;
    this.growthBar.fillStyle(0x000000, 0.4);
    this.growthBar.fillRoundedRect(bx, by, bw, bh, 6);
    this.growthBar.fillStyle(0x7ed957, 1);
    this.growthBar.fillRoundedRect(bx, by, Math.max(6, bw * hud.growthRatio), bh, 6);

    this.dashBar.clear();
    if (hud.hasDash) {
      const dx = bx + bw + 12;
      const cd = hud.dashCooldown ?? 1;
      this.dashBar.fillStyle(0x000000, 0.4);
      this.dashBar.fillRoundedRect(dx, by, 56, bh, 6);
      this.dashBar.fillStyle(0xffd23f, 1);
      this.dashBar.fillRoundedRect(dx, by, Math.max(4, 56 * cd), bh, 6);
    }

    this.keyIcon.setAlpha(hud.hasKey ? 1 : 0.3);

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
      const mode = hud.controlMode ?? "touch";
      const hint =
        mode === "keyboard"
          ? "A D · Space · F · Shift"
          : mode === "both"
            ? "тач + клавиатура"
            : "1 палец — бег · 2-й — ↑↓ прыжок/рывок";
      this.controlsHint.setText(hint);
      this.controlsHint.setAlpha(1);
      this.bottomPanel.setAlpha(1);
    } else {
      this.controlsHint.setText("");
      this.controlsHint.setAlpha(0);
      this.bottomPanel.setAlpha(0.3);
    }
  }
}
