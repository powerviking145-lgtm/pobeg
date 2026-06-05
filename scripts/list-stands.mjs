import { LevelGenerator, EMPTY } from "../src/systems/LevelGenerator.ts";

const l = LevelGenerator.generate(1);
const t = l.tiles;
const stands = [];
for (let y = 0; y < t.length - 1; y++) {
  for (let x = 0; x < t[0].length; x++) {
    if (t[y][x] === EMPTY && t[y + 1][x] !== EMPTY && t[y + 1][x] !== -1) stands.push({ x, y });
  }
}
for (const s of stands.filter((s) => s.y >= 33 && s.y <= 40 && s.x >= 18 && s.x <= 30)) {
  console.log(s, "below=", t[s.y + 1][s.x]);
}
