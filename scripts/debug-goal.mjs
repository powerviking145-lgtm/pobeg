import { LevelGenerator, EMPTY } from "../src/systems/LevelGenerator.ts";
import { TILE } from "../src/config.ts";

const l = LevelGenerator.generate(1);
const t = l.tiles;
const plate = l.objects.find((o) => o.kind === "pressurePlate" && o.meta?.mode !== "crate");

const tx = Math.floor(plate.x / TILE);
const ty = Math.floor(plate.y / TILE) - 1;
console.log("plate px", plate.x, plate.y, "-> tile ref", tx, ty);
console.log("tile at stand", t[ty][tx], "below", t[ty + 1][tx]);

const stands = [];
for (let y = 0; y < t.length - 1; y++) {
  for (let x = 0; x < t[0].length; x++) {
    if (t[y][x] === EMPTY && t[y + 1][x] !== EMPTY && t[y + 1][x] !== -1) stands.push({ x, y });
  }
}

let best = null,
  bestD = 999;
for (const s of stands) {
  const d = Math.abs(s.x - tx) + Math.abs(s.y - ty);
  if (d < bestD) {
    bestD = d;
    best = s;
  }
}
console.log("nearest stand to plate", best, "dist", bestD);

const stx = Math.floor(l.start.x / TILE);
const sty = Math.floor(l.start.y / TILE) - 1;
let bestS = null,
  bestDS = 999;
for (const s of stands) {
  const d = Math.abs(s.x - stx) + Math.abs(s.y - sty);
  if (d < bestDS) {
    bestDS = d;
    bestS = s;
  }
}
console.log("nearest stand to start", bestS, "dist", bestDS);
