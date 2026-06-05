import { LevelGenerator, EMPTY, SOLID, PLATFORM } from "../src/systems/LevelGenerator.ts";
import { canReach } from "../src/systems/Reachability.ts";
import { STAGES } from "../src/systems/GrowthSystem.ts";
import { ROOM_W, ROOM_H, TILE } from "../src/config.ts";
import { pickBlueprint } from "../src/levels/MainPathBlueprints.ts";

const jv = STAGES[0].jumpVelocity;
const seed = 1;
const l = LevelGenerator.generate(seed);
const bp = pickBlueprint(seed);
const t = l.tiles;
const label = (v) => (v === EMPTY ? "." : v === SOLID ? "#" : v >= PLATFORM ? "=" : "?");

console.log("blueprint", bp.id, "path", bp.path.map((c) => `${c.rx},${c.ry}`).join(" -> "));
console.log("start", bp.startCell, "key", bp.keyCell, "exit", bp.exitCell);

const plate = l.objects.find((o) => o.kind === "pressurePlate" && o.meta?.mode !== "crate");
console.log("start px", l.start, "plate px", plate);

// standables near start
const H = t.length, W = t[0].length;
const stands = [];
for (let y = 0; y < H - 1; y++) {
  for (let x = 0; x < W; x++) {
    if (t[y][x] === EMPTY && t[y + 1][x] !== EMPTY && t[y + 1][x] !== -1) stands.push({ x, y });
  }
}
const stx = Math.floor(l.start.x / TILE);
const sty = Math.floor(l.start.y / TILE) - 1;
console.log("start tile", stx, sty, "tile below", t[sty + 1]?.[stx], "at start", t[sty]?.[stx]);

// dump horizontal door between first two path rooms if adjacent horizontally
for (let i = 0; i < bp.path.length - 1; i++) {
  const a = bp.path[i], b = bp.path[i + 1];
  if (a.ry === b.ry) {
    const left = a.rx < b.rx ? a : b;
    const ox = left.rx * ROOM_W;
    const oy = left.ry * ROOM_H;
    const fr = oy + ROOM_H - 2;
    const wR = ox + ROOM_W - 1;
    const wL = ox + ROOM_W;
    console.log(`horiz door ${a.rx},${a.ry}-${b.rx},${b.ry} floorRow=${fr}`);
    for (let dy = 0; dy <= 4; dy++) {
      console.log(`  y=${fr - dy}: R=${label(t[fr - dy][wR])} L=${label(t[fr - dy][wL])}`);
    }
  } else {
    const upper = a.ry < b.ry ? a : b;
    const lower = a.ry < b.ry ? b : a;
    const cx = upper.rx * ROOM_W + Math.floor(ROOM_W / 2);
    const ufr = upper.ry * ROOM_H + ROOM_H - 2;
    const lfr = lower.ry * ROOM_H + ROOM_H - 2;
    console.log(`vert shaft ${a.rx},${a.ry}-${b.rx},${b.ry} cx=${cx} floors ${ufr}->${lfr}`);
    for (let y = ufr; y <= lfr; y++) {
      if (t[y][cx] !== SOLID) console.log(`  y=${y}: ${label(t[y][cx])}`);
    }
  }
}

console.log("canReach start->plate", canReach(t, l.start, plate, jv));
