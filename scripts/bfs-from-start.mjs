import { LevelGenerator, EMPTY } from "../src/systems/LevelGenerator.ts";
import { STAGES } from "../src/systems/GrowthSystem.ts";
import { TILE, GRAVITY_Y } from "../src/config.ts";

const jv = STAGES[0].jumpVelocity;
const maxUp = Math.max(1, Math.floor((jv * jv) / (2 * GRAVITY_Y) / TILE) - 1);
const maxHoriz = 6;

const l = LevelGenerator.generate(1);
const tiles = l.tiles;
const H = tiles.length;
const W = tiles[0].length;

function isSupporting(tile) {
  return tile !== EMPTY && tile !== -1;
}
function isStandTile(x, y) {
  return tiles[y][x] === EMPTY && isSupporting(tiles[y + 1][x]);
}
function canWalkAt(x, y) {
  return tiles[y][x] === EMPTY;
}
function key(p) {
  return `${p.x},${p.y}`;
}

const stands = [];
for (let y = 0; y < H - 1; y++) {
  for (let x = 0; x < W; x++) {
    if (isStandTile(x, y)) stands.push({ x, y });
  }
}
const standSet = new Set(stands.map(key));

const stx = Math.floor(l.start.x / TILE);
const sty = Math.floor(l.start.y / TILE) - 1;
let start = null;
let bestD = 999;
for (const s of stands) {
  const d = Math.abs(s.x - stx) + Math.abs(s.y - sty);
  if (d < bestD) {
    bestD = d;
    start = s;
  }
}

const q = [start];
const seen = new Set([key(start)]);
while (q.length) {
  const cur = q.shift();
  for (const dx of [-1, 1]) {
    const nx = cur.x + dx;
    if (!canWalkAt(nx, cur.y)) continue;
    if (!isSupporting(tiles[cur.y + 1][nx])) continue;
    const n = { x: nx, y: cur.y };
    const k = key(n);
    if (!seen.has(k) && standSet.has(k)) {
      seen.add(k);
      q.push(n);
    }
  }
  for (let ny = cur.y + 1; ny <= cur.y + 14 && ny < H - 1; ny++) {
    if (isStandTile(cur.x, ny)) {
      let clear = true;
      for (let y = cur.y + 1; y < ny; y++) {
        if (!canWalkAt(cur.x, y)) {
          clear = false;
          break;
        }
      }
      if (clear) {
        const n = { x: cur.x, y: ny };
        const k = key(n);
        if (!seen.has(k) && standSet.has(k)) {
          seen.add(k);
          q.push(n);
        }
      }
      break;
    }
    if (!canWalkAt(cur.x, ny)) break;
  }
  for (let dy = 1; dy <= maxUp; dy++) {
    const ny = cur.y - dy;
    if (ny < 0) break;
    for (let dx = -maxHoriz; dx <= maxHoriz; dx++) {
      const nx = cur.x + dx;
      if (nx < 0 || nx >= W) continue;
      if (!isStandTile(nx, ny)) continue;
      const n = { x: nx, y: ny };
      const k = key(n);
      if (!seen.has(k) && standSet.has(k)) {
        seen.add(k);
        q.push(n);
      }
    }
  }
}

console.log("reachable", seen.size, "maxUp", maxUp);
let minY = 999,
  maxY = 0;
for (const k of seen) {
  const y = Number(k.split(",")[1]);
  minY = Math.min(minY, y);
  maxY = Math.max(maxY, y);
}
console.log("y range", minY, maxY);

const plate = l.objects.find((o) => o.kind === "pressurePlate" && o.meta?.mode !== "crate");
const ptx = Math.floor(plate.x / TILE);
const pty = Math.floor(plate.y / TILE) - 1;
console.log("plate stand", ptx, pty, "reached", seen.has(`${ptx},${pty}`));

const shaftStands = stands.filter((s) => s.x >= 21 && s.x <= 27 && s.y >= 34 && s.y <= 51);
console.log("shaft stands", shaftStands.length);
for (const s of shaftStands) {
  console.log(s, seen.has(key(s)) ? "OK" : "NO");
}
