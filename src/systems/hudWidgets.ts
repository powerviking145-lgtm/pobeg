import Phaser from "phaser";
import { GAME_W } from "../config";
import {
  HUD_COLORS,
  HUD_DEPTH,
  HUD_FONT,
  HUD_FONT_FAMILY,
  HUD_TEXT_STROKE,
} from "./uiTheme";
import { sharpenText } from "./ui";
import type { QuestType } from "../types";

const QUEST_ICONS: Record<QuestType, string> = {
  eat: "🍎",
  kill: "👾",
  smash: "📦",
  noDamage: "🛡",
};

export function formatRunTime(ms: number): string {
  const totalSec = ms / 1000;
  const min = Math.floor(totalSec / 60);
  const sec = Math.floor(totalSec % 60);
  const dec = Math.floor((totalSec % 1) * 10);
  if (min > 0) return `${min}:${String(sec).padStart(2, "0")}.${dec}`;
  return `${sec}.${dec}`;
}

export interface TimerWidget {
  container: Phaser.GameObjects.Container;
  update: (runTimeMs: number, bestTimeMs: number | null | undefined) => void;
}

export function createTimerWidget(scene: Phaser.Scene, x: number, y: number): TimerWidget {
  const bg = scene.add.graphics();
  const text = sharpenText(
    scene.add
      .text(0, 0, "0.0", {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: HUD_FONT.lg,
        color: HUD_COLORS.primary,
        fontStyle: "bold",
        stroke: HUD_TEXT_STROKE.color,
        strokeThickness: HUD_TEXT_STROKE.thickness,
      })
      .setOrigin(0.5)
  );

  const container = scene.add
    .container(x, y, [bg, text])
    .setScrollFactor(0)
    .setDepth(HUD_DEPTH.hudText);

  const drawBg = (accent = false) => {
    bg.clear();
    const w = Math.max(120, text.width + 40);
    const h = 46;
    bg.fillStyle(0x0e1726, 0.94);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 18);
    bg.lineStyle(3, accent ? 0xffd23f : 0x5a6a82, 1);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 18);
  };
  drawBg();

  return {
    container,
    update(runTimeMs, bestTimeMs) {
      text.setText(formatRunTime(runTimeMs));
      const nearRecord =
        bestTimeMs != null && runTimeMs < bestTimeMs && runTimeMs > bestTimeMs * 0.88;
      text.setColor(nearRecord ? HUD_COLORS.accent : HUD_COLORS.primary);
      drawBg(nearRecord);
    },
  };
}

export interface QuestCard {
  container: Phaser.GameObjects.Container;
  update: (data: {
    title: string;
    progress: number;
    target: number;
    claimed: boolean;
    type?: QuestType;
  }) => void;
  pulse: () => void;
}

function shortQuestTitle(title: string): string {
  if (title.length <= 18) return title;
  return `${title.slice(0, 16)}…`;
}

export function createQuestCard(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number
): QuestCard {
  const bg = scene.add.graphics();
  const icon = sharpenText(
    scene.add
      .text(-width / 2 + 16, -4, "•", {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: HUD_FONT.sm,
      })
      .setOrigin(0, 0.5)
  );
  const label = sharpenText(
    scene.add
      .text(-width / 2 + 52, -4, "", {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: HUD_FONT.xs,
        color: HUD_COLORS.primary,
        fontStyle: "bold",
        stroke: HUD_TEXT_STROKE.color,
        strokeThickness: 5,
      })
      .setOrigin(0, 0.5)
  );
  const progText = sharpenText(
    scene.add
      .text(width / 2 - 14, -4, "", {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: HUD_FONT.sm,
        color: HUD_COLORS.accent,
        fontStyle: "bold",
        stroke: HUD_TEXT_STROKE.color,
        strokeThickness: 5,
      })
      .setOrigin(1, 0.5)
  );
  const barBg = scene.add.graphics();
  const barFill = scene.add.graphics();

  const container = scene.add
    .container(x, y, [bg, barBg, barFill, icon, label, progText])
    .setScrollFactor(0)
    .setDepth(HUD_DEPTH.hudText);

  const cardH = 44;
  const barW = width - 28;
  const barY = 14;

  const drawCard = (ratio: number, done: boolean) => {
    bg.clear();
    bg.fillStyle(0x16223c, done ? 0.95 : 0.88);
    bg.fillRoundedRect(-width / 2, -cardH / 2, width, cardH, 10);
    bg.lineStyle(2, done ? 0x7ed957 : 0x4a5a72, 1);

    barBg.clear();
    barBg.fillStyle(0x000000, 0.5);
    barBg.fillRoundedRect(-barW / 2, barY, barW, 7, 4);

    barFill.clear();
    if (ratio > 0) {
      barFill.fillStyle(done ? 0x7ed957 : 0xffd23f, 1);
      barFill.fillRoundedRect(-barW / 2, barY, Math.max(8, barW * ratio), 7, 4);
    }
  };

  return {
    container,
    update(data) {
      const type = data.type ?? "eat";
      icon.setText(data.claimed ? "✓" : QUEST_ICONS[type]);
      label.setText(shortQuestTitle(data.title));
      progText.setText(data.claimed ? "✓" : `${data.progress}/${data.target}`);
      const ratio = data.claimed ? 1 : Math.min(1, data.progress / data.target);
      drawCard(ratio, data.claimed);
    },
    pulse() {
      scene.tweens.add({
        targets: container,
        scaleX: 1.03,
        scaleY: 1.05,
        duration: 120,
        yoyo: true,
        ease: "Back.out",
      });
    },
  };
}

export function createPuzzleBanner(scene: Phaser.Scene): {
  container: Phaser.GameObjects.Container;
  show: (text: string) => void;
  hide: () => void;
} {
  const bg = scene.add.graphics();
  const text = sharpenText(
    scene.add
      .text(0, 0, "", {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: HUD_FONT.md,
        color: HUD_COLORS.accent,
        fontStyle: "bold",
        align: "center",
        stroke: HUD_TEXT_STROKE.color,
        strokeThickness: HUD_TEXT_STROKE.thickness,
        wordWrap: { width: GAME_W - 48 },
      })
      .setOrigin(0.5)
  );

  const container = scene.add
    .container(GAME_W / 2, 136, [bg, text])
    .setScrollFactor(0)
    .setDepth(HUD_DEPTH.puzzleHint)
    .setAlpha(0);

  let hideTimer: Phaser.Time.TimerEvent | null = null;

  const redraw = () => {
    bg.clear();
    const w = Math.min(GAME_W - 24, text.width + 44);
    const h = text.height + 24;
    bg.fillStyle(0x0e1726, 0.96);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
    bg.lineStyle(3, 0xffd23f, 0.7);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
  };

  return {
    container,
    show(hint: string) {
      text.setText(hint);
      redraw();
      container.setAlpha(1);
      if (hideTimer) hideTimer.remove();
      hideTimer = scene.time.delayedCall(5000, () => container.setAlpha(0));
    },
    hide() {
      container.setAlpha(0);
      if (hideTimer) hideTimer.remove();
    },
  };
}
