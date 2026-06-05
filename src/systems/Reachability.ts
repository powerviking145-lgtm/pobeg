import { GRAVITY_Y, TILE } from "../config";
import { STAGES } from "./GrowthSystem";
import type { LevelObject } from "../types";

export const EMPTY = -1;

/** Максимальная высота прыжка в пикселях (без двойного прыжка). */
export function maxJumpHeightPx(jumpVelocity: number): number {
  return (jumpVelocity * jumpVelocity) / (2 * GRAVITY_Y);
}

export interface ReachOptions {
  /** Тайловые клетки, через которые можно пройти (открытые ворота). */
  openTiles?: Set<string>;
}

function tileKey(x: number, y: number): string {
  return `${x},${y}`;
}

function isSupporting(tile: number): boolean {
  return tile !== EMPTY && tile !== -1;
}

function isStandTile(tiles: number[][], x: number, y: number): boolean {
  if (y < 0 || y >= tiles.length - 1 || x < 0 || x >= tiles[0].length) return false;
  return tiles[y][x] === EMPTY && isSupporting(tiles[y + 1][x]);
}

function standables(
  tiles: number[][],
  W: number,
  H: number
): { x: number; y: number }[] {
  const res: { x: number; y: number }[] = [];
  for (let y = 0; y < H - 1; y++) {
    for (let x = 0; x < W; x++) {
      if (tiles[y][x] === EMPTY && isSupporting(tiles[y + 1][x])) {
        res.push({ x, y });
      }
    }
  }
  return res;
}

function nearestStandable(
  stands: { x: number; y: number }[],
  px: number,
  py: number
): { x: number; y: number } | null {
  const tx = Math.floor(px / TILE);
  const ty = Math.floor(py / TILE) - 1;
  let best: { x: number; y: number } | null = null;
  let bestD = 999;
  for (const s of stands) {
    const d = Math.abs(s.x - tx) + Math.abs(s.y - ty);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return bestD <= 14 ? best : null;
}

/** BFS по стоячим тайлам: ходьба, падение, прыжок вверх (1 прыжок). */
export function canReach(
  tiles: number[][],
  startPx: { x: number; y: number },
  goalPx: { x: number; y: number },
  jumpVelocity: number = STAGES[0].jumpVelocity,
  opts: ReachOptions = {}
): boolean {
  const H = tiles.length;
  const W = tiles[0].length;
  const stands = standables(tiles, W, H);
  const start = nearestStandable(stands, startPx.x, startPx.y);
  const goal = nearestStandable(stands, goalPx.x, goalPx.y);
  if (!start || !goal) return false;

  const openTiles = opts.openTiles ?? new Set<string>();
  const maxUp = Math.max(1, Math.ceil(maxJumpHeightPx(jumpVelocity) / TILE));
  const maxHoriz = 6;
  const key = (p: { x: number; y: number }) => `${p.x},${p.y}`;
  const standSet = new Set(stands.map((s) => key(s)));

  const canWalkAt = (x: number, y: number): boolean => {
    if (openTiles.has(tileKey(x, y))) return true;
    return tiles[y][x] === EMPTY;
  };

  const q: { x: number; y: number }[] = [start];
  const seen = new Set<string>([key(start)]);

  while (q.length) {
    const cur = q.shift()!;
    if (cur.x === goal.x && cur.y === goal.y) return true;

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
      if (isStandTile(tiles, cur.x, ny)) {
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
        if (!isStandTile(tiles, nx, ny)) continue;
        const n = { x: nx, y: ny };
        const k = key(n);
        if (!seen.has(k) && standSet.has(k)) {
          seen.add(k);
          q.push(n);
        }
      }
    }
  }
  return false;
}

/** Тайлы ворот, которые открываются при решении пазла. */
export function gateOpenTiles(objects: LevelObject[], linkId: string): Set<string> {
  const open = new Set<string>();
  const gate = objects.find(
    (o) => o.kind === "gate" && String(o.meta?.linkId) === linkId
  );
  if (!gate) return open;
  const tx = Math.floor(gate.x / TILE);
  const ty = Math.floor(gate.y / TILE) - 1;
  open.add(tileKey(tx, ty));
  open.add(tileKey(tx, ty - 1));
  return open;
}

/**
 * Полная проверка маршрута: старт → плита → ключ (ворота открыты) → выход.
 */
export function canReachWithPuzzles(
  tiles: number[][],
  objects: LevelObject[],
  startPx: { x: number; y: number },
  jumpVelocity: number = STAGES[0].jumpVelocity
): boolean {
  const keyObj = objects.find((o) => o.kind === "key");
  const exitObj = objects.find((o) => o.kind === "exit");
  const plate = objects.find(
    (o) => o.kind === "pressurePlate" && o.meta?.mode !== "crate"
  );
  if (!keyObj || !exitObj || !plate) return false;

  const linkId = String(plate.meta?.linkId ?? "");
  const openGate = gateOpenTiles(objects, linkId);

  if (!canReach(tiles, startPx, { x: plate.x, y: plate.y }, jumpVelocity)) return false;
  if (
    !canReach(
      tiles,
      { x: plate.x, y: plate.y },
      { x: keyObj.x, y: keyObj.y },
      jumpVelocity,
      { openTiles: openGate }
    )
  ) {
    return false;
  }
  if (
    !canReach(
      tiles,
      { x: keyObj.x, y: keyObj.y },
      { x: exitObj.x, y: exitObj.y },
      jumpVelocity
    )
  ) {
    return false;
  }
  return true;
}
