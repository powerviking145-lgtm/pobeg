import { LevelGenerator } from "../src/systems/LevelGenerator.ts";
import { canReachWithPuzzles, canReach } from "../src/systems/Reachability.ts";
import { STAGES } from "../src/systems/GrowthSystem.ts";

const jv = STAGES[0].jumpVelocity;
let ok = 0;
for (let seed = 0; seed < 20; seed++) {
  const l = LevelGenerator.generate(seed);
  if (canReachWithPuzzles(l.tiles, l.objects, l.start, jv)) ok++;
}
console.log(`valid: ${ok}/20`);

const l = LevelGenerator.generate(1);
const plate = l.objects.find((o) => o.kind === "pressurePlate" && o.meta?.mode !== "crate");
const key = l.objects.find((o) => o.kind === "key");
const exit = l.objects.find((o) => o.kind === "exit");
console.log("start->plate", canReach(l.tiles, l.start, plate, jv));
console.log("start->exit", canReach(l.tiles, l.start, exit, jv));
console.log("plate->key", key && plate ? canReach(l.tiles, plate, key, jv) : "n/a");
