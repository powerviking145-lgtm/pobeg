import Phaser from "phaser";
import { GAME_W } from "../config";
import { HUD_COLORS, HUD_DEPTH, HUD_FONT, HUD_FONT_FAMILY } from "./uiTheme";
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
  return `${sec}.${dec} с`;
}

export interface TimerWidget {
  container: Phaser.GameObjects.Container;
  update: (runTimeMs: number, bestTimeMs: number | null | undefined) => void;
}

export function createTimerWidget(scene: Phaser.Scene, x: number, y: number): TimerWidget {
  const bg = scene.add.graphics();
  const text = scene.add
    .text(0, 0, "0.0 с", {
      fontFamily: HUD_FONT_FAMILY,
      fontSize: HUD_FONT.lg,
      color: HUD_COLORS.primary,
      fontStyle: "bold",
    })
    .setOrigin(0.5);

  const container = scene.add
    .container(x, y, [bg, text])
    .setScrollFactor(0)
    .setDepth(HUD_DEPTH.hudText);

  const drawBg = (accent = false) => {
    bg.clear();
    const w = Math.max(88, text.width + 28);
    const h = 30;
    bg.fillStyle(0x0e1726, 0.55);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
    bg.lineStyle(2, accent ? 0xffd23f : 0x3a4a62, accent ? 0.9 : 0.6);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
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

export function createQuestCard(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number
): QuestCard {
  const bg = scene.add.graphics();
  const icon = scene.add
    .text(-width / 2 + 10, 0, "•", { fontSize: "14px" })
    .setOrigin(0, 0.5);
  const label = scene.add
    .text(-width / 2 + 30, -6, "", {
      fontFamily: HUD_FONT_FAMILY,
      fontSize: "11px",
      color: HUD_COLORS.secondary,
      wordWrap: { width: width - 58 },
    })
    .setOrigin(0, 0.5);
  const progText = scene.add
    .text(width / 2 - 8, -6, "", {
      fontFamily: HUD_FONT_FAMILY,
      fontSize: "11px",
      color: HUD_COLORS.primary,
    })
    .setOrigin(1, 0.5);
  const barBg = scene.add.graphics();
  const barFill = scene.add.graphics();

  const container = scene.add
    .container(x, y, [bg, barBg, barFill, icon, label, progText])
    .setScrollFactor(0)
    .setDepth(HUD_DEPTH.hudText);

  const cardH = 36;
  const barW = width - 16;
  const barY = 10;

  const drawCard = (ratio: number, done: boolean) => {
    bg.clear();
    bg.fillStyle(0x16223c, done ? 0.75 : 0.55);
    bg.fillRoundedRect(-width / 2, -cardH / 2, width, cardH, 8);
    bg.lineStyle(1, done ? 0x7ed957 : 0x2a3a52, 0.8);
    bg.strokeRoundedRect(-width / 2, -cardH / 2, width, cardH, 8);

    barBg.clear();
    barBg.fillStyle(0x000000, 0.35);
    barBg.fillRoundedRect(-barW / 2, barY, barW, 5, 3);

    barFill.clear();
    if (ratio > 0) {
      barFill.fillStyle(done ? 0x7ed957 : 0xffd23f, 1);
      barFill.fillRoundedRect(-barW / 2, barY, Math.max(4, barW * ratio), 5, 3);
    }
  };

  return {
    container,
    update(data) {
      const type = data.type ?? "eat";
      icon.setText(data.claimed ? "✓" : QUEST_ICONS[type]);
      const short =
        data.title.length > 22 ? `${data.title.slice(0, 20)}…` : data.title;
      label.setText(short);
      label.setColor(data.claimed ? HUD_COLORS.success : HUD_COLORS.secondary);
      progText.setText(data.claimed ? "✓" : `${data.progress}/${data.target}`);
      const ratio = data.claimed ? 1 : Math.min(1, data.progress / data.target);
      drawCard(ratio, data.claimed);
    },
    pulse() {
      scene.tweens.add({
        targets: container,
        scaleX: 1.06,
        scaleY: 1.08,
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
  const text = scene.add
    .text(0, 0, "", {
      fontFamily: HUD_FONT_FAMILY,
      fontSize: HUD_FONT.sm,
      color: HUD_COLORS.accent,
      fontStyle: "bold",
      align: "center",
      wordWrap: { width: GAME_W - 80 },
    })
    .setOrigin(0.5);

  const container = scene.add
    .container(GAME_W / 2, 118, [bg, text])
    .setScrollFactor(0)
    .setDepth(HUD_DEPTH.puzzleHint)
    .setAlpha(0);

  let hideTimer: Phaser.Time.TimerEvent | null = null;

  const redraw = () => {
    bg.clear();
    const w = Math.min(GAME_W - 40, text.width + 32);
    const h = text.height + 16;
    bg.fillStyle(0x0e1726, 0.82);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
    bg.lineStyle(2, 0xffd23f, 0.5);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
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
