import Phaser from "phaser";
import { TILE, TEX, COLORS } from "../config";

// Программные мультяшные спрайты в стиле «Перекрёсток» — без внешних PNG.
// Если ключ уже загружен (реальный ассет), плейсхолдер не перезаписывается.
export function createPlaceholderTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);

  const gen = (
    key: string,
    w: number,
    h: number,
    draw: (g: Phaser.GameObjects.Graphics) => void
  ) => {
    if (scene.textures.exists(key)) return;
    g.clear();
    draw(g);
    g.generateTexture(key, w, h);
  };

  gen(TEX.tiles, TILE * 8, TILE, drawTileset);
  gen(TEX.player_0, 44, 48, (g) => drawPlayerStage(g, 0));
  gen(TEX.player_1, 46, 54, (g) => drawPlayerStage(g, 1));
  gen(TEX.player_2, 48, 58, (g) => drawPlayerStage(g, 2));
  gen(TEX.player_3, 52, 64, (g) => drawPlayerStage(g, 3));
  gen(TEX.player, 44, 48, (g) => drawPlayerStage(g, 0));
  gen(TEX.enemy, 52, 46, drawShoppingCart);
  gen(TEX.food, 36, 38, drawApple);
  gen(TEX.key, 38, 22, drawKey);
  gen(TEX.crate, 44, 44, drawCrate);
  gen(TEX.lever, 36, 48, drawLever);
  gen(TEX.gate, TILE, TILE * 2, drawGate);
  gen(TEX.exit, 128, 128, drawStoreExit);
  gen(TEX.spike, TILE, 22, drawSpikes);
  gen(TEX.spark, 16, 16, drawSpark);
  gen(TEX.heart, 30, 28, drawHeart);
  gen(TEX.slash, 40, 32, drawSlash);
  gen(TEX.decor_sign, 40, 48, drawDecorSign);
  gen(TEX.pressure_plate, TILE, 12, (g) => drawPressurePlate(g, false));
  gen(TEX.pressure_plate_on, TILE, 12, (g) => drawPressurePlate(g, true));
  gen(TEX.shelf_wall, TILE, TILE, drawShelfWall);

  g.destroy();
}

function drawPressurePlate(g: Phaser.GameObjects.Graphics, on: boolean): void {
  g.fillStyle(on ? 0x3ad17a : 0x4a5568, 1);
  g.fillRoundedRect(2, 2, TILE - 4, 8, 3);
  g.lineStyle(2, on ? 0xffd23f : 0x2a3544, 1);
  g.strokeRoundedRect(2, 2, TILE - 4, 8, 3);
  if (on) {
    g.fillStyle(0xffd23f, 0.6);
    g.fillCircle(TILE / 2, 6, 4);
  }
}

function drawShelfWall(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(0x4a3a2a, 1);
  g.fillRect(0, 0, TILE, TILE);
  g.fillStyle(0x6b4f3a, 1);
  for (let i = 0; i < 4; i++) {
    g.fillRect(3, 6 + i * 11, TILE - 6, 9);
    g.lineStyle(1, 0x3a2a1a, 0.6);
    g.strokeRect(3, 6 + i * 11, TILE - 6, 9);
    g.fillStyle(COLORS.food, 0.85);
    g.fillRoundedRect(7, 8 + i * 11, 12, 6, 2);
    g.fillStyle(0xffd23f, 0.85);
    g.fillRoundedRect(24, 8 + i * 11, 10, 6, 2);
    g.fillStyle(0x6b4f3a, 1);
  }
}

// --- Утилиты рисования ---

function shadowEllipse(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  alpha = 0.22
): void {
  g.fillStyle(0x000000, alpha);
  g.fillEllipse(cx, cy, rx, ry);
}

function glossCircle(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  r: number
): void {
  g.fillStyle(0xffffff, 0.45);
  g.fillEllipse(x, y, r * 0.55, r * 0.35);
}

// --- Тайлсет: 4 варианта пола + 4 платформы ---

const FLOOR_PALETTES = [
  { base: 0x4a5568, alt: 0x5c6b7a, edge: COLORS.perekGreen }, // aisle
  { base: 0x3d5a38, alt: 0x4d6a42, edge: 0x7ed957 }, // produce
  { base: 0x3a4a62, alt: 0x4a5a72, edge: 0xa8d8f0 }, // dairy
  { base: 0x5a5238, alt: 0x6a6248, edge: COLORS.accent }, // checkout
];

function drawTileset(g: Phaser.GameObjects.Graphics): void {
  for (let v = 0; v < 4; v++) {
    const ox = v * TILE * 2;
    const pal = FLOOR_PALETTES[v];
    drawFloorTile(g, ox, pal);
    drawShelfTile(g, ox + TILE, pal);
  }
}

function drawFloorTile(
  g: Phaser.GameObjects.Graphics,
  ox: number,
  pal: { base: number; alt: number; edge: number }
): void {
  g.fillStyle(pal.base, 1);
  g.fillRect(ox, 0, TILE, TILE);
  const tileSize = 12;
  for (let ty = 0; ty < TILE; ty += tileSize) {
    for (let tx = 0; tx < TILE; tx += tileSize) {
      const alt = ((tx / tileSize + ty / tileSize) % 2) === 0;
      g.fillStyle(alt ? pal.alt : pal.base, 1);
      g.fillRect(ox + tx + 1, ty + 1, tileSize - 2, tileSize - 2);
    }
  }
  g.fillStyle(pal.edge, 1);
  g.fillRect(ox, 0, TILE, 6);
}

function drawShelfTile(
  g: Phaser.GameObjects.Graphics,
  ox: number,
  pal: { base: number; alt: number; edge: number }
): void {
  g.fillStyle(pal.base, 1);
  g.fillRect(ox, 8, TILE, TILE - 8);
  g.fillStyle(pal.edge, 1);
  g.fillRect(ox, 8, TILE, 8);
  g.fillStyle(COLORS.food, 1);
  g.fillRoundedRect(ox + 8, 14, 10, 18, 3);
  g.fillStyle(COLORS.accent, 1);
  g.fillRoundedRect(ox + 24, 10, 10, 22, 3);
}

function drawSlash(g: Phaser.GameObjects.Graphics): void {
  g.lineStyle(6, COLORS.accent, 1);
  g.beginPath();
  g.arc(8, 24, 22, -0.8, 0.2);
  g.strokePath();
  g.lineStyle(3, 0xffffff, 0.7);
  g.beginPath();
  g.arc(8, 24, 18, -0.7, 0.15);
  g.strokePath();
}

function drawDecorSign(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(0x6b4f3a, 1);
  g.fillRect(16, 36, 8, 12);
  g.fillStyle(COLORS.accent, 1);
  g.fillRoundedRect(2, 4, 36, 32, 6);
  g.fillStyle(COLORS.perekGreen, 1);
  g.fillRect(8, 12, 24, 10);
  g.fillStyle(0xffffff, 1);
  g.fillRect(10, 14, 8, 6);
  g.fillRect(22, 14, 8, 6);
}

// --- Персонаж: 4 стадии роста ---

function drawPlayerStage(g: Phaser.GameObjects.Graphics, stage: number): void {
  const cx = 22 + stage;
  const bodyH = 28 + stage * 4;
  const bodyY = 10 + (3 - stage) * 2;

  shadowEllipse(g, cx, 46 + stage * 2, 16 + stage, 5, 0.25);

  const skin = 0xffd4a8;
  const shirt = stage < 2 ? COLORS.perekGreen : COLORS.perekDark;
  const pants = 0x2c4a6e;

  // Ноги
  g.fillStyle(pants, 1);
  const legW = 8 + stage * 0.5;
  g.fillRoundedRect(cx - legW - 2, bodyY + bodyH - 4, legW, 10 + stage, 3);
  g.fillRoundedRect(cx + 2, bodyY + bodyH - 4, legW, 10 + stage, 3);
  g.fillStyle(0x1a2535, 1);
  g.fillRoundedRect(cx - legW - 3, bodyY + bodyH + 4, legW + 2, 4, 2);
  g.fillRoundedRect(cx + 1, bodyY + bodyH + 4, legW + 2, 4, 2);

  // Тело
  g.fillStyle(shirt, 1);
  g.fillRoundedRect(cx - 14 - stage, bodyY, 28 + stage * 2, bodyH, 10);
  g.fillStyle(0xffffff, 0.15);
  g.fillRect(cx - 10, bodyY + 4, 8, bodyH - 8);

  // Логотип-полоска Перекрёсток
  g.fillStyle(COLORS.accent, 1);
  g.fillRect(cx - 12 - stage, bodyY + 8, 24 + stage * 2, 5);
  g.fillStyle(COLORS.perekGreen, 1);
  g.fillRect(cx - 10 - stage, bodyY + 9, 8, 3);

  // Руки
  g.fillStyle(shirt, 1);
  g.fillRoundedRect(cx - 20 - stage, bodyY + 6, 8, 16 + stage, 4);
  g.fillRoundedRect(cx + 12 + stage, bodyY + 6, 8, 16 + stage, 4);
  g.fillStyle(skin, 1);
  g.fillCircle(cx - 16 - stage, bodyY + 24 + stage, 5);
  g.fillCircle(cx + 16 + stage, bodyY + 24 + stage, 5);

  // Голова
  const headR = 11 + stage * 1.5;
  const headY = bodyY - headR + 4;
  g.fillStyle(0x0e1726, 0.9);
  g.fillCircle(cx, headY, headR + 2);
  g.fillStyle(skin, 1);
  g.fillCircle(cx, headY, headR);
  g.lineStyle(2, 0x0e1726, 0.75);
  g.strokeCircle(cx, headY, headR + 1);
  glossCircle(g, cx - 3, headY - 4, headR * 0.4);

  // Волосы / кепка по стадии
  if (stage === 0) {
    g.fillStyle(0x5c3d2e, 1);
    g.fillEllipse(cx, headY - 6, headR + 2, 8);
  } else if (stage === 3) {
    g.fillStyle(COLORS.perekGreen, 1);
    g.fillEllipse(cx, headY - 8, headR + 4, 10);
    g.fillStyle(COLORS.perekDark, 1);
    g.fillRect(cx - headR - 2, headY - 4, (headR + 2) * 2, 5);
    g.fillStyle(COLORS.accent, 1);
    g.fillCircle(cx + headR - 2, headY - 2, 3);
  } else {
    g.fillStyle(0x4a3020, 1);
    g.fillEllipse(cx, headY - 7, headR + 2, 9);
  }

  // Глаза
  const eyeY = headY + 1;
  const eyeDx = 5 + stage * 0.3;
  g.fillStyle(0xffffff, 1);
  g.fillEllipse(cx - eyeDx, eyeY, 7, 8);
  g.fillEllipse(cx + eyeDx, eyeY, 7, 8);
  g.fillStyle(0x1a2535, 1);
  g.fillCircle(cx - eyeDx + 1, eyeY + 1, 3);
  g.fillCircle(cx + eyeDx + 1, eyeY + 1, 3);
  g.fillStyle(0xffffff, 0.9);
  g.fillCircle(cx - eyeDx + 2, eyeY, 1.5);
  g.fillCircle(cx + eyeDx + 2, eyeY, 1.5);

  // Улыбка
  g.lineStyle(2, 0xc47a50, 1);
  g.beginPath();
  g.arc(cx, headY + 5, 5 + stage * 0.3, 0.2 * Math.PI, 0.8 * Math.PI);
  g.strokePath();

  // Аксессуары по стадии
  if (stage === 1) {
    g.fillStyle(0xff8c42, 1);
    g.fillRoundedRect(cx - 18, bodyY + 10, 10, 12, 3);
    g.lineStyle(2, 0x8a5a20, 1);
    g.lineBetween(cx - 13, bodyY + 10, cx - 8, bodyY + 2);
  }
  if (stage === 2) {
    g.fillStyle(0xf0e6d8, 1);
    g.fillRoundedRect(cx + 14, bodyY + 14, 14, 16, 4);
    g.fillStyle(COLORS.perekGreen, 1);
    g.fillRect(cx + 16, bodyY + 18, 10, 4);
    g.lineStyle(2, 0x8a7a60, 1);
    g.lineBetween(cx + 14, bodyY + 18, cx + 6, bodyY + 12);
  }
  if (stage === 3) {
    g.fillStyle(0xf5f0e8, 1);
    g.fillRoundedRect(cx - 8, bodyY + bodyH - 6, 18, 8, 2);
    g.fillStyle(COLORS.perekGreen, 1);
    g.fillRect(cx - 6, bodyY + bodyH - 4, 6, 4);
  }
}

// --- Враг: злая тележка ---

function drawShoppingCart(g: Phaser.GameObjects.Graphics): void {
  shadowEllipse(g, 26, 42, 22, 5);

  g.fillStyle(0x8a909c, 1);
  g.fillRoundedRect(4, 8, 44, 28, 6);
  g.lineStyle(3, 0x5a606c, 1);
  g.strokeRoundedRect(4, 8, 44, 28, 6);

  g.fillStyle(0xb8bec8, 0.5);
  g.fillRect(8, 12, 36, 12);

  // Ручка
  g.lineStyle(4, 0x6a7078, 1);
  g.lineBetween(44, 14, 50, 4);
  g.lineBetween(50, 4, 48, 2);

  // Колёса
  g.fillStyle(0x2a2a32, 1);
  g.fillCircle(14, 38, 7);
  g.fillCircle(38, 38, 7);
  g.fillStyle(0x5a5a64, 1);
  g.fillCircle(14, 38, 4);
  g.fillCircle(38, 38, 4);

  // Злое лицо на корзине
  g.fillStyle(COLORS.enemy, 1);
  g.fillEllipse(26, 22, 28, 18);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(18, 20, 6);
  g.fillCircle(34, 20, 6);
  g.fillStyle(0x1a1010, 1);
  g.fillCircle(19, 21, 3);
  g.fillCircle(35, 21, 3);
  g.lineStyle(3, 0x6b1010, 1);
  g.lineBetween(10, 14, 20, 18);
  g.lineBetween(42, 14, 32, 18);
  g.beginPath();
  g.arc(26, 28, 6, 0.1 * Math.PI, 0.9 * Math.PI, true);
  g.strokePath();
}

// --- Еда: сочное яблоко ---

function drawApple(g: Phaser.GameObjects.Graphics): void {
  shadowEllipse(g, 18, 34, 12, 4);

  g.fillStyle(0x4a7a32, 1);
  g.fillEllipse(22, 8, 12, 7);
  g.lineStyle(3, 0x5c3d20, 1);
  g.lineBetween(18, 10, 18, 4);

  g.fillStyle(0xc82828, 1);
  g.fillCircle(18, 22, 14);
  g.fillStyle(0xe84848, 1);
  g.fillCircle(14, 18, 8);
  glossCircle(g, 12, 16, 5);
  g.fillStyle(0xff6b6b, 0.4);
  g.fillEllipse(22, 24, 8, 10);
}

// --- Ключ ---

function drawKey(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(0xc9a020, 1);
  g.fillCircle(10, 10, 9);
  g.fillStyle(0xffe566, 1);
  g.fillCircle(10, 10, 6);
  g.fillStyle(0x8a6010, 1);
  g.fillCircle(10, 10, 3);
  glossCircle(g, 7, 7, 3);

  g.fillStyle(0xffd23f, 1);
  g.fillRect(10, 8, 24, 5);
  g.fillRect(30, 8, 4, 10);
  g.fillRect(24, 8, 3, 8);
  g.lineStyle(1, 0xb08010, 0.6);
  g.strokeRect(10, 8, 24, 5);
}

// --- Ящик с товаром ---

function drawCrate(g: Phaser.GameObjects.Graphics): void {
  shadowEllipse(g, 22, 42, 18, 4);

  g.fillStyle(0xd4a86a, 1);
  g.fillRect(2, 4, 40, 36);
  g.fillStyle(0xc09050, 1);
  g.fillRect(2, 4, 40, 8);
  g.lineStyle(3, 0x8a6030, 1);
  g.strokeRect(3, 5, 38, 34);
  g.lineStyle(2, 0x9a7040, 0.8);
  g.lineBetween(4, 6, 40, 38);
  g.lineBetween(40, 6, 4, 38);

  g.fillStyle(COLORS.perekGreen, 1);
  g.fillRect(8, 14, 28, 8);
  g.fillStyle(COLORS.accent, 1);
  g.fillRect(10, 16, 10, 4);

  g.fillStyle(0xe8d8b8, 0.6);
  g.fillRect(6, 26, 32, 2);
  g.fillRect(6, 30, 32, 2);
}

// --- Рычаг ---

function drawLever(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(0x3a3f48, 1);
  g.fillRoundedRect(4, 34, 28, 12, 4);
  g.fillStyle(0x5a6068, 1);
  g.fillRect(10, 38, 16, 4);

  g.lineStyle(6, 0x7a8088, 1);
  g.lineBetween(18, 38, 28, 10);
  g.fillStyle(COLORS.perekGreen, 1);
  g.fillCircle(28, 10, 8);
  g.fillStyle(COLORS.perekDark, 1);
  g.fillCircle(28, 10, 4);
  glossCircle(g, 25, 7, 3);
}

// --- Решётка-ворота ---

function drawGate(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(0x4a5060, 1);
  g.fillRect(0, 0, TILE, TILE * 2);
  g.fillStyle(0x6a7080, 1);
  for (let i = 0; i < 4; i++) {
    g.fillRect(4 + i * 11, 0, 5, TILE * 2);
  }
  g.fillStyle(0x8a9098, 1);
  g.fillRect(0, 4, TILE, 5);
  g.fillRect(0, TILE * 2 - 10, TILE, 5);
  g.fillStyle(COLORS.accent, 0.8);
  g.fillCircle(8, TILE - 4, 4);
  g.fillCircle(TILE - 8, TILE - 4, 4);
}

// --- Выход: витрина Перекрёстка ---

function drawStoreExit(g: Phaser.GameObjects.Graphics): void {
  shadowEllipse(g, 64, 120, 50, 8, 0.3);

  // Фасад
  g.fillStyle(0x1f8a4c, 1);
  g.fillRect(0, 20, 128, 108);
  g.fillStyle(COLORS.perekGreen, 1);
  g.fillRect(0, 0, 128, 32);
  g.fillStyle(0xffffff, 0.2);
  g.fillRect(4, 4, 120, 8);

  // Вывеска
  g.fillStyle(COLORS.accent, 1);
  g.fillRoundedRect(16, 6, 96, 20, 6);
  g.fillStyle(0x1a2535, 1);
  g.fillRect(24, 12, 8, 8);
  g.fillRect(36, 12, 8, 8);
  g.fillRect(52, 12, 40, 8);

  // Стеклянные двери
  g.fillStyle(0xa8d8f0, 0.7);
  g.fillRect(44, 48, 40, 72);
  g.fillStyle(0xffffff, 0.35);
  g.fillRect(48, 52, 8, 64);
  g.lineStyle(3, 0x2c5a40, 1);
  g.strokeRect(44, 48, 40, 72);

  // Витрины по бокам
  g.fillStyle(0x88c8e8, 0.55);
  g.fillRect(8, 52, 30, 36);
  g.fillRect(90, 52, 30, 36);
  g.fillStyle(COLORS.food, 0.8);
  g.fillCircle(23, 68, 10);
  g.fillStyle(0xffd23f, 0.8);
  g.fillRoundedRect(98, 60, 14, 18, 3);

  // Неоновая подсветка
  g.lineStyle(4, COLORS.perekGreen, 0.9);
  g.strokeRect(2, 18, 124, 106);
  g.fillStyle(COLORS.perekGreen, 0.25);
  g.fillRect(0, 44, 128, 6);
}

// --- Шипы / предупреждающая полоса ---

function drawSpikes(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(0x3a3f48, 1);
  g.fillRect(0, 14, TILE, 8);
  const n = Math.floor(TILE / 12);
  for (let i = 0; i < n; i++) {
    const x = i * 12;
    g.fillStyle(i % 2 === 0 ? 0xffd23f : 0x1a2535, 1);
    g.fillRect(x, 14, 12, 4);
    g.fillStyle(0xb8bcc8, 1);
    g.fillTriangle(x, 14, x + 6, 0, x + 12, 14);
    g.fillStyle(0xd8dce8, 1);
    g.fillTriangle(x + 2, 12, x + 6, 3, x + 8, 12);
  }
}

// --- Частица-искра ---

function drawSpark(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(0xffffff, 1);
  g.fillCircle(8, 8, 6);
  g.fillStyle(COLORS.accent, 0.9);
  g.fillCircle(8, 8, 3);
  g.lineStyle(2, 0xffffff, 0.8);
  g.lineBetween(8, 0, 8, 16);
  g.lineBetween(0, 8, 16, 8);
  g.lineBetween(2, 2, 14, 14);
  g.lineBetween(14, 2, 2, 14);
}

// --- Сердце HUD ---

function drawHeart(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(0xc02030, 1);
  g.fillCircle(8, 9, 8);
  g.fillCircle(22, 9, 8);
  g.fillTriangle(0, 11, 30, 11, 15, 27);
  g.fillStyle(0xff4060, 1);
  g.fillCircle(8, 9, 5);
  g.fillCircle(22, 9, 5);
  glossCircle(g, 6, 6, 4);
}
