import { LevelGenerator, EMPTY, SOLID } from "../src/systems/LevelGenerator.ts";
import { canReach } from "../src/systems/Reachability.ts";
import { STAGES } from "../src/systems/GrowthSystem.ts";
import { ROOM_W, ROOM_H, TILE } from "../src/config.ts";

const jv = STAGES[0].jumpVelocity;
const l = LevelGenerator.generate(1);
const t = l.tiles;
const floor2 = (2 * ROOM_H + ROOM_H - 2) * TILE;

const pts = [
  ["start", l.start],
  ["x10", { x: (10 + 0.5) * TILE, y: floor2 }],
  ["x13", { x: (13 + 0.5) * TILE, y: floor2 }],
  ["x14", { x: (14 + 0.5) * TILE, y: floor2 }],
  ["x15", { x: (15 + 0.5) * TILE, y: floor2 }],
  ["x16", { x: (16 + 0.5) * TILE, y: floor2 }],
  ["x17", { x: (17 + 0.5) * TILE, y: floor2 }],
  ["x20", { x: (20 + 0.5) * TILE, y: floor2 }],
];

for (let i = 0; i < pts.length; i++) {
  for (let j = i + 1; j < pts.length; j++) {
    const [a, pa] = pts[i];
    const [b, pb] = pts[j];
    const ok = canReach(t, pa, pb, jv);
    console.log(`${a} -> ${b}: ${ok}`);
  }
}

// tile dump at door
const fr = 2 * ROOM_H + ROOM_H - 2;
for (let x = 12; x <= 18; x++) {
  const below = t[fr][x];
  const stand = t[fr - 1][x];
  console.log(`x=${x} stand=${stand} floor=${below}`);
}
