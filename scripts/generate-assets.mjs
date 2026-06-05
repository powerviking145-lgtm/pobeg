/**
 * Генерация PNG-ассетов для гибридной графики.
 * Запуск: node scripts/generate-assets.mjs
 */
import fs from "fs";
import path from "path";
import { PNG } from "pngjs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "src", "assets");

const C = {
  skyTop: [36, 64, 110],
  sky: [27, 42, 74],
  green: [58, 209, 122],
  greenDark: [31, 138, 76],
  gold: [255, 210, 63],
  skin: [255, 212, 168],
  pants: [44, 74, 110],
  hair: [74, 48, 32],
  white: [255, 255, 255],
  dark: [26, 37, 53],
  red: [224, 90, 71],
  gray: [138, 144, 156],
  grayDark: [58, 64, 72],
  apple: [200, 40, 40],
  building: [38, 48, 68],
  buildingHi: [52, 62, 82],
  window: [120, 180, 220],
  windowLit: [255, 230, 140],
  roof: [32, 40, 56],
};

function ensureDir() {
  fs.mkdirSync(OUT, { recursive: true });
}

function setPx(png, x, y, [r, g, b, a = 255]) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const i = (png.width * y + x) << 2;
  png.data[i] = r;
  png.data[i + 1] = g;
  png.data[i + 2] = b;
  png.data[i + 3] = a;
}

function fillRect(png, x, y, w, h, color) {
  for (let py = y; py < y + h; py++)
    for (let px = x; px < x + w; px++) setPx(png, px, py, color);
}

function fillCircle(png, cx, cy, r, color) {
  for (let y = cy - r; y <= cy + r; y++)
    for (let x = cx - r; x <= cx + r; x++)
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) setPx(png, x, y, color);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpColor(c1, c2, t) {
  return [
    Math.round(lerp(c1[0], c2[0], t)),
    Math.round(lerp(c1[1], c2[1], t)),
    Math.round(lerp(c1[2], c2[2], t)),
  ];
}

function writePng(name, png) {
  const file = path.join(OUT, name);
  return new Promise((resolve, reject) => {
    png
      .pack()
      .pipe(fs.createWriteStream(file))
      .on("finish", () => {
        console.log("wrote", file);
        resolve();
      })
      .on("error", reject);
  });
}

function drawSkyGradient(png) {
  for (let y = 0; y < png.height; y++) {
    const t = y / png.height;
    const col = lerpColor(C.skyTop, C.sky, t);
    for (let x = 0; x < png.width; x++) setPx(png, x, y, col);
  }
}

function drawCitySilhouette(png, baseY, scale = 1) {
  for (let i = 0; i < 11; i++) {
    const bw = Math.round((34 + (i % 4) * 18) * scale);
    const bh = Math.round((100 + (i % 5) * 40) * scale);
    const bx = Math.round(10 + i * 48 * scale);
    const col = i % 2 === 0 ? C.building : C.buildingHi;
    fillRect(png, bx, baseY - bh, bw, bh, col);
    for (let wy = baseY - bh + 10; wy < baseY - 16; wy += 16)
      for (let wx = bx + 5; wx < bx + bw - 8; wx += 12) {
        const lit = (wx * 7 + wy * 3 + i) % 5 === 0;
        fillRect(png, wx, wy, 7, 9, lit ? C.windowLit : C.window);
      }
  }
}

function drawPerekSign(png, x, y, w, h) {
  fillRect(png, x, y, w, h, C.greenDark);
  fillRect(png, x + 4, y + 4, w - 8, h - 8, C.green);
  fillRect(png, x + 12, y + 10, w - 24, 14, C.gold);
  fillRect(png, x + 18, y + 12, 10, 10, C.dark);
  fillRect(png, x + 32, y + 12, 36, 10, C.dark);
  fillRect(png, x + 72, y + 12, 10, 10, C.dark);
}

function drawBgCity(png, layer) {
  drawSkyGradient(png);

  if (layer === "far") {
    drawCitySilhouette(png, 620, 0.85);
    drawPerekSign(png, 120, 48, 300, 72);
    fillRect(png, 80, 130, 380, 120, [168, 216, 240, 200]);
    fillRect(png, 210, 140, 70, 100, C.white);
    fillRect(png, 90, 140, 80, 55, C.green);
    fillRect(png, 330, 140, 80, 55, C.gold);
    for (let i = 0; i < 8; i++) {
      fillCircle(png, 60 + i * 58, 300, 2, C.windowLit);
    }
    fillRect(png, 40, 260, 460, 6, C.gold);
    return;
  }

  if (layer === "mid") {
    for (let i = 0; i < 6; i++) {
      const sx = 20 + i * 88;
      drawPerekSign(png, sx, 240 + (i % 2) * 20, 72, 28);
    }
    for (let i = 0; i < 12; i++) {
      fillCircle(png, 30 + i * 42, 400 + (i % 3) * 8, 3, C.windowLit);
    }
    return;
  }

  // foreground rooftops
  for (let i = 0; i < 7; i++) {
    const rw = 70 + (i % 3) * 20;
    const rx = -10 + i * 78;
    const ry = 700 + (i % 2) * 12;
    fillRect(png, rx, ry, rw, 28, C.roof);
    fillRect(png, rx + 8, ry + 4, rw - 16, 6, C.grayDark);
    fillRect(png, rx + 4, ry + 20, rw - 8, 40, C.building);
  }
  fillRect(png, 0, 820, png.width, 140, [14, 22, 38, 220]);
}

function strokeOutline(png, ox, oy, w, h, color) {
  for (let x = ox; x < ox + w; x++) {
    setPx(png, x, oy, color);
    setPx(png, x, oy + h - 1, color);
  }
  for (let y = oy; y < oy + h; y++) {
    setPx(png, ox, y, color);
    setPx(png, ox + w - 1, y, color);
  }
}

function drawPlayerFrame(png, ox, oy, stage, frame) {
  const cx = ox + 24;
  const bob = frame === 1 ? 1 : frame === 3 ? -1 : 0;
  const legOff = frame === 2 ? 3 : frame === 3 ? -3 : 0;
  const bodyY = oy + 14 + bob;

  fillRect(png, cx - 14, oy + 8, 28, 46, [0, 0, 0, 40]);
  fillRect(png, cx - 12, oy + 52, 24, 4, [0, 0, 0, 80]);

  fillRect(png, cx - 10 + legOff, bodyY + 28, 8, 12, C.pants);
  fillRect(png, cx + 2 - legOff, bodyY + 28, 8, 12, C.pants);
  fillRect(png, cx - 11 + legOff, bodyY + 38, 10, 4, C.dark);
  fillRect(png, cx + 1 - legOff, bodyY + 38, 10, 4, C.dark);

  const shirt = stage < 2 ? C.green : C.greenDark;
  fillRect(png, cx - 12, bodyY + 6, 24, 24, shirt);
  strokeOutline(png, cx - 12, bodyY + 6, 24, 24, C.dark);
  fillRect(png, cx - 10, bodyY + 14, 20, 5, C.gold);
  fillRect(png, cx - 8, bodyY + 15, 8, 3, C.green);

  const armSwing = frame === 2 ? 2 : frame === 3 ? -2 : 0;
  fillRect(png, cx - 18, bodyY + 8 + armSwing, 7, 14, shirt);
  fillRect(png, cx + 11, bodyY + 8 - armSwing, 7, 14, shirt);
  fillCircle(png, cx - 14, bodyY + 24, 4, C.skin);
  fillCircle(png, cx + 14, bodyY + 24, 4, C.skin);

  const headR = Math.round(10 + stage * 1.2);
  fillCircle(png, cx, bodyY - 2, headR + 1, C.dark);
  fillCircle(png, cx, bodyY - 2, headR, C.skin);
  if (stage === 3) {
    fillRect(png, cx - headR - 2, bodyY - 8, headR * 2 + 4, 8, C.green);
    fillRect(png, cx + headR - 4, bodyY - 4, 4, 4, C.gold);
  } else {
    fillRect(png, cx - headR, bodyY - headR - 4, headR * 2, 8, C.hair);
  }

  fillCircle(png, cx - 5, bodyY, 3, C.white);
  fillCircle(png, cx + 5, bodyY, 3, C.white);
  fillCircle(png, cx - 4, bodyY + 1, 2, C.dark);
  fillCircle(png, cx + 6, bodyY + 1, 2, C.dark);

  if (frame === 5) {
    fillRect(png, cx + 12, bodyY + 10, 18, 6, C.skin);
    fillRect(png, cx + 28, bodyY + 8, 6, 10, C.gold);
  }
  if (frame === 4) {
    fillRect(png, cx - 14, bodyY + 30, 28, 6, shirt);
  }
}

function drawEnemyFrame(png, ox, oy, frame) {
  const hurt = frame === 4;
  const body = hurt ? C.red : C.gray;
  fillRect(png, ox + 2, oy + 8, 48, 32, C.dark);
  fillRect(png, ox + 4, oy + 10, 44, 28, body);
  strokeOutline(png, ox + 4, oy + 10, 44, 28, C.dark);
  fillRect(png, ox + 8, oy + 14, 36, 12, [184, 190, 200]);
  fillRect(png, ox + 40, oy + 8, 10, 4, C.grayDark);
  const wheelX = frame % 2 === 0 ? 0 : 2;
  fillCircle(png, ox + 14 + wheelX, oy + 40, 8, C.dark);
  fillCircle(png, ox + 38 - wheelX, oy + 40, 8, C.dark);
  fillCircle(png, ox + 26, oy + 22, 13, C.red);
  fillCircle(png, ox + 20, oy + 20, 4, C.white);
  fillCircle(png, ox + 32, oy + 20, 4, C.white);
  fillCircle(png, ox + 21, oy + 21, 2, C.dark);
  fillCircle(png, ox + 33, oy + 21, 2, C.dark);
}

function drawPlate(png, on) {
  const base = on ? C.green : C.grayDark;
  fillRect(png, 4, 2, 40, 8, base);
  strokeOutline(png, 4, 2, 40, 8, on ? C.gold : C.dark);
  if (on) fillCircle(png, 24, 6, 3, C.gold);
}

async function main() {
  ensureDir();

  const bg = new PNG({ width: 540, height: 960 });
  drawBgCity(bg, "far");
  await writePng("bg_city.png", bg);

  const bgMid = new PNG({ width: 540, height: 960 });
  drawBgCity(bgMid, "mid");
  await writePng("bg_city_mid.png", bgMid);

  const bgFg = new PNG({ width: 540, height: 480 });
  drawBgCity(bgFg, "fg");
  await writePng("bg_city_fg.png", bgFg);

  const FW = 48;
  const FH = 56;
  const sheet = new PNG({ width: FW * 6, height: FH * 4 });
  for (let stage = 0; stage < 4; stage++) {
    for (let f = 0; f < 6; f++) {
      drawPlayerFrame(sheet, f * FW, stage * FH, stage, f);
    }
  }
  await writePng("player_sheet.png", sheet);

  const EW = 52;
  const EH = 46;
  const enemy = new PNG({ width: EW * 5, height: EH });
  for (let f = 0; f < 5; f++) drawEnemyFrame(enemy, f * EW, 0, f);
  await writePng("enemy_cart.png", enemy);

  const plateOff = new PNG({ width: 48, height: 12 });
  drawPlate(plateOff, false);
  await writePng("plate_off.png", plateOff);

  const plateOn = new PNG({ width: 48, height: 12 });
  drawPlate(plateOn, true);
  await writePng("plate_on.png", plateOn);

  console.log("Assets generated.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
