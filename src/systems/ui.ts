import Phaser from "phaser";
import { GAME_W, GAME_H, TEX } from "../config";
import { setMuted, isMuted } from "./Music";
import {
  HUD_BUTTON,
  HUD_COLORS,
  HUD_FONT,
  HUD_FONT_FAMILY,
  HUD_TEXT_STROKE,
} from "./uiTheme";

/** Чёткий текст на Retina-экранах. */
export function sharpenText(text: Phaser.GameObjects.Text): Phaser.GameObjects.Text {
  const dpr =
    typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;
  text.setResolution(dpr);
  return text;
}

/** Текст с обводкой — читается на любом фоне. */
export function makeReadableText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  content: string,
  style: Phaser.Types.GameObjects.Text.TextStyle = {}
): Phaser.GameObjects.Text {
  const t = scene.add.text(x, y, content, {
    fontFamily: HUD_FONT_FAMILY,
    fontSize: HUD_FONT.md,
    color: HUD_COLORS.primary,
    fontStyle: "bold",
    stroke: HUD_TEXT_STROKE.color,
    strokeThickness: HUD_TEXT_STROKE.thickness,
    ...style,
  });
  return sharpenText(t);
}

export function makeMuteButton(
  scene: Phaser.Scene,
  x: number,
  y: number
): Phaser.GameObjects.Text {
  const label = () => (isMuted() ? "🔇" : "🔊");
  const t = sharpenText(
    scene.add
      .text(x, y, label(), {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: HUD_FONT.lg,
        color: HUD_COLORS.primary,
        stroke: HUD_TEXT_STROKE.color,
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(50)
      .setInteractive({ useHandCursor: true })
  );
  t.on(Phaser.Input.Events.POINTER_DOWN, () => {
    setMuted(!isMuted());
    t.setText(label());
  });
  return t;
}

export interface ButtonOptions {
  width?: number;
  height?: number;
  fill?: number;
  textColor?: string;
  fontSize?: number;
}

export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  opts: ButtonOptions = {}
): Phaser.GameObjects.Container {
  const w = opts.width ?? HUD_BUTTON.width;
  const h = opts.height ?? HUD_BUTTON.height;
  const fill = opts.fill ?? 0x3ad17a;
  const textColor = opts.textColor ?? "#0e1726";
  const fontSize = opts.fontSize ?? HUD_BUTTON.fontSize;

  const g = scene.add.graphics();
  g.fillStyle(fill, 1);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, 18);
  g.lineStyle(4, 0x000000, 0.2);
  g.strokeRoundedRect(-w / 2, -h / 2, w, h, 18);

  const text = sharpenText(
    scene.add
      .text(0, 0, label, {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: `${fontSize}px`,
        color: textColor,
        fontStyle: "bold",
        stroke: HUD_TEXT_STROKE.color,
        strokeThickness: 4,
      })
      .setOrigin(0.5)
  );

  const container = scene.add.container(x, y, [g, text]);
  container.setSize(w, h);
  const pad = 10;
  container.setInteractive({
    hitArea: new Phaser.Geom.Rectangle(
      -w / 2 - pad,
      -h / 2 - pad,
      w + pad * 2,
      h + pad * 2
    ),
    hitAreaCallback: Phaser.Geom.Rectangle.Contains,
    useHandCursor: true,
  });

  let pressed = false;
  container.on(Phaser.Input.Events.POINTER_DOWN, () => {
    pressed = true;
    container.setScale(0.96);
  });
  container.on(Phaser.Input.Events.POINTER_UP, () => {
    container.setScale(1);
    if (pressed) {
      pressed = false;
      onClick();
    }
  });
  container.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, () => {
    pressed = false;
    container.setScale(1);
  });
  container.on(Phaser.Input.Events.POINTER_OUT, () => {
    pressed = false;
    container.setScale(1);
  });

  return container;
}

export function drawSceneBackground(
  scene: Phaser.Scene,
  top: number,
  bottom: number,
  overlayAlpha = 0.45
): void {
  if (scene.textures.exists(TEX.bg)) {
    scene.add
      .image(0, 0, TEX.bg)
      .setOrigin(0)
      .setDisplaySize(GAME_W, GAME_H)
      .setScrollFactor(0)
      .setDepth(-100);
    const overlay = scene.add.graphics().setScrollFactor(0).setDepth(-99);
    overlay.fillStyle(0x0e1726, overlayAlpha);
    overlay.fillRect(0, 0, GAME_W, GAME_H);
  } else {
    drawBackground(scene, top, bottom);
  }
}

export function drawBackground(scene: Phaser.Scene, top: number, bottom: number): void {
  const { width, height } = scene.scale;
  const g = scene.add.graphics();
  const steps = 32;
  for (let i = 0; i < steps; i++) {
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.IntegerToColor(top),
      Phaser.Display.Color.IntegerToColor(bottom),
      steps - 1,
      i
    );
    const color = Phaser.Display.Color.GetColor(c.r, c.g, c.b);
    g.fillStyle(color, 1);
    g.fillRect(0, (height / steps) * i, width, height / steps + 1);
  }
  g.setScrollFactor(0);
}

export function makeFloatingLabel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  msg: string,
  color: string = HUD_COLORS.success
): Phaser.GameObjects.Text {
  return sharpenText(
    scene.add
      .text(x, y, msg, {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: HUD_FONT.lg,
        color,
        fontStyle: "bold",
        stroke: HUD_TEXT_STROKE.color,
        strokeThickness: HUD_TEXT_STROKE.thickness,
      })
      .setOrigin(0.5)
      .setDepth(60)
  );
}
