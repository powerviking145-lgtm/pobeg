import { LevelGenerator } from "../src/systems/LevelGenerator.ts";
import { canReach } from "../src/systems/Reachability.ts";
import { STAGES } from "../src/systems/GrowthSystem.ts";
import { ROOM_W, ROOM_H, TILE } from "../src/config.ts";

const jv = STAGES[0].jumpVelocity;
const l = LevelGenerator.generate(1);
const t = l.tiles;

const pts = [
  ["start", l.start],
  ["mid_1_2", { x: (1 * ROOM_W + 8 + 0.5) * TILE, y: (2 * ROOM_H + ROOM_H - 2) * TILE }],
  ["shaft_1_2", { x: (1 * ROOM_W + 8 + 0.5) * TILE, y: (2 * ROOM_H + ROOM_H - 2) * TILE }],
  ["shaft_entry", { x: (1 * ROOM_W + Math.floor(ROOM_W / 2) + 0.5) * TILE, y: (2 * ROOM_H + ROOM_H - 2) * TILE }],
  ["plate", l.objects.find((o) => o.kind === "pressurePlate" && o.meta?.mode !== "crate")],
  ["key", l.objects.find((o) => o.kind === "key")],
  ["exit", l.objects.find((o) => o.kind === "exit")],
];

for (let i = 0; i < pts.length; i++) {
  for (let j = i + 1; j < pts.length; j++) {
    const [a, pa] = pts[i];
    const [b, pb] = pts[j];
    if (!pa || !pb) continue;
    const ok = canReach(t, pa, pb, jv);
    if (ok) console.log(`${a} -> ${b}: OK`);
  }
}

// BFS size from start
const EMPTY = -1;
const H = t.length, W = t[0].length;
function isSupporting(tile) { return tile !== EMPTY && tile !== -1; }
const stands = [];
for (let y = 0; y < H - 1; y++) {
  for (let x = 0; x < W; x++) {
    if (t[y][x] === EMPTY && isSupporting(t[y + 1][x])) stands.push({ x, y });
  }
}
const stx = Math.floor(l.start.x / TILE);
const sty = Math.floor(l.start.y / TILE) - 1;
let startStand = null;
let bestD = 999;
for (const s of stands) {
  const d = Math.abs(s.x - stx) + Math.abs(s.y - sty);
  if (d < bestD) { bestD = d; startStand = s; }
}
console.log("nearest start stand", startStand, "dist", bestD, "total stands", stands.length);
