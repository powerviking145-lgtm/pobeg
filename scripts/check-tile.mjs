import { LevelGenerator, EMPTY } from "../src/systems/LevelGenerator.ts";

const l = LevelGenerator.generate(1);
const t = l.tiles;
for (const [x, y] of [
  [27, 37],
  [20, 37],
  [27, 36],
  [27, 35],
  [27, 34],
  [20, 33],
]) {
  const below = t[y + 1]?.[x];
  console.log(
    `(${x},${y}) cell=${t[y][x]} below=${below} stand=${t[y][x] === EMPTY && below !== EMPTY && below !== -1}`
  );
}
