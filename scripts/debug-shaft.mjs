import { LevelGenerator, EMPTY, SOLID } from "../src/systems/LevelGenerator.ts";
import { canReach } from "../src/systems/Reachability.ts";
import { STAGES } from "../src/systems/GrowthSystem.ts";
import { ROOM_W, ROOM_H, TILE } from "../src/config.ts";

const jv = STAGES[0].jumpVelocity;
const l = LevelGenerator.generate(1);
const t = l.tiles;
const fr = 2 * ROOM_H + ROOM_H - 2;
const label = (v) => (v === EMPTY ? "." : v === SOLID ? "#" : v >= 1 ? "=" : "?");

for (let x = 16; x <= 30; x++) console.log(`x ${x} y51 ${label(t[fr - 1][x])} y52 ${label(t[fr][x])}`);

const floor2 = fr * TILE;
for (let x = 17; x <= 26; x++) {
  const p = { x: (x + 0.5) * TILE, y: floor2 };
  console.log(`start->x${x}`, canReach(t, l.start, p, jv));
}

const cx = 1 * ROOM_W + Math.floor(ROOM_W / 2);
console.log("cx", cx);
for (let y = fr - 5; y <= fr; y++) {
  let row = "";
  for (let x = cx - 3; x <= cx + 3; x++) row += label(t[y][x]);
  console.log(`y${y}`, row);
}

// climb test: bottom of shaft to plate room
const plate = l.objects.find((o) => o.kind === "pressurePlate" && o.meta?.mode !== "crate");
const shaftBottom = { x: (cx + 0.5) * TILE, y: floor2 };
console.log("shaftBottom->plate", canReach(t, shaftBottom, plate, jv));
