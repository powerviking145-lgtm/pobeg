import { LevelGenerator, EMPTY } from "../src/systems/LevelGenerator.ts";
import { ROOM_W, ROOM_H } from "../src/config.ts";

const l = LevelGenerator.generate(1);
const t = l.tiles;
const cx = 1 * ROOM_W + Math.floor(ROOM_W / 2);
const label = (v) => (v === EMPTY ? "." : v >= 0 ? "#" : "?");

const stands = [];
for (let y = 0; y < t.length - 1; y++) {
  for (let x = 0; x < t[0].length; x++) {
    if (t[y][x] === EMPTY && t[y + 1][x] !== EMPTY && t[y + 1][x] !== -1) stands.push({ x, y });
  }
}

console.log("stands y=33..37 near shaft:");
for (const s of stands.filter((s) => s.y >= 33 && s.y <= 37 && s.x >= 17 && s.x <= 31)) {
  console.log(s);
}

const ufr = 1 * ROOM_H + ROOM_H - 2;
console.log("room (1,1) floor row", ufr);
for (let y = ufr - 3; y <= ufr; y++) {
  let row = "";
  for (let x = 17; x <= 31; x++) row += y === ufr ? label(t[y][x]) : t[y][x] === EMPTY ? "." : "=";
  console.log(`y${y}`, row);
}

const L = (v) => (v === EMPTY ? "." : v >= 1 ? "=" : "#");
for (let y = 33; y <= 40; y++) {
  let r = "";
  for (let x = 19; x <= 29; x++) r += L(t[y][x]);
  console.log(`shaft y${y}`, r);
}
