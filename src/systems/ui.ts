import Phaser from "phaser";
import { GAME_W, GAME_H, TEX } from "../config";
import { setMuted, isMuted } from "./Music";
import { HUD_COLORS, HUD_FONT, HUD_FONT_FAMILY } from "./uiTheme";

// Кнопка вкл/выкл звука (музыка + эффекты).
export function makeMuteButton(
  scene: Phaser.Scene,
  x: number,
  y: number
): Phaser.GameObjects.Text {
  const label = () => (isMuted() ? "🔇" : "🔊");
  const t = scene.add
    .text(x, y, label(), {
      fontFamily: "system-ui, sans-serif",
      fontSize: "26px",
      color: "#ffffff",
    })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(50)
    .setInteractive({ useHandCursor: true });
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

// Простая кнопка: скруглённый прямоугольник + текст, с реакцией на нажатие.
export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  opts: ButtonOptions = {}
): Phaser.GameObjects.Container {
  const w = opts.width ?? 320;
  const h = opts.height ?? 72;
  const fill = opts.fill ?? 0x3ad17a;
  const textColor = opts.textColor ?? "#0e1726";
  const fontSize = opts.fontSize ?? 28;

  const g = scene.add.graphics();
  g.fillStyle(fill, 1);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, 16);
  g.lineStyle(3, 0x000000, 0.18);
  g.strokeRoundedRect(-w / 2, -h / 2, w, h, 16);

  const text = scene.add
    .text(0, 0, label, {
      fontFamily: "system-ui, sans-serif",
      fontSize: `${fontSize}px`,
      color: textColor,
      fontStyle: "bold",
    })
    .setOrigin(0.5);

  const container = scene.add.container(x, y, [g, text]);
  container.setSize(w, h);
  // Небольшой запас хит-зоны для удобства попадания пальцем.
  const pad = 8;
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

  // Срабатываем только если нажатие НАЧАЛОСЬ на кнопке (надёжно на таче).
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

// Фон сцены: нарисованная картинка города с затемнением для читаемости,
// либо градиент как запасной вариант.
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

// Вертикальный градиентный фон.
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

/** Всплывающая подпись с обводкой — читаема на любом фоне. */
export function makeFloatingLabel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  msg: string,
  color: string = HUD_COLORS.success
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, msg, {
      fontFamily: HUD_FONT_FAMILY,
      fontSize: HUD_FONT.lg,
      color,
      fontStyle: "bold",
      stroke: HUD_COLORS.panel,
      strokeThickness: 4,
    })
    .setOrigin(0.5)
    .setDepth(60);
}
