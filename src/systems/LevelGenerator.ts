import { ROOM_W, ROOM_H, GRID_X, GRID_Y, TILE, SHAFT_PLATFORM_STEP } from "../config";
import type { GeneratedLevel, LevelObject, PuzzleHint, RoomTheme } from "../types";
import {
  pickBlueprint,
  blueprintMainEdges,
  isVerticalLink,
  cellKey,
  type RoomCell,
  type ShaftKind,
} from "../levels/MainPathBlueprints";
import { RNG } from "./rng";
import { canReachWithPuzzles } from "./Reachability";
import { STAGES } from "./GrowthSystem";

export const EMPTY = -1;
export const SOLID = 0;
export const PLATFORM = 1;

const THEMES: RoomTheme[] = ["aisle", "produce", "dairy", "checkout"];
const MAX_BRANCHES = 6;

export class LevelGenerator {
  static generate(seed: number): GeneratedLevel {
    const jv = STAGES[0].jumpVelocity;
    for (let attempt = 0; attempt < 32; attempt++) {
      const level = this.build(seed + attempt);
      if (canReachWithPuzzles(level.tiles, level.objects, level.start, jv)) {
        return level;
      }
    }
    return this.build(seed);
  }

  private static build(seed: number): GeneratedLevel {
    const rng = new RNG(seed);
    const blueprint = pickBlueprint(seed);
    const W = GRID_X * ROOM_W;
    const H = GRID_Y * ROOM_H;

    const tiles: number[][] = Array.from({ length: H }, () =>
      Array.from({ length: W }, () => SOLID)
    );

    const set = (x: number, y: number, v: number) => {
      if (x >= 0 && x < W && y >= 0 && y < H) tiles[y][x] = v;
    };
    const get = (x: number, y: number): number => {
      if (x < 0 || x >= W || y < 0 || y >= H) return SOLID;
      return tiles[y][x];
    };

    const roomThemes: RoomTheme[][] = Array.from({ length: GRID_Y }, () =>
      Array.from({ length: GRID_X }, () => rng.pick(THEMES))
    );
    const roomVariants: number[][] = Array.from({ length: GRID_Y }, (_, ry) =>
      Array.from({ length: GRID_X }, (_, rx) => this.themeVariant(roomThemes[ry][rx]))
    );

    for (let ry = 0; ry < GRID_Y; ry++) {
      for (let rx = 0; rx < GRID_X; rx++) {
        this.carveRoom(set, rx, ry, roomVariants[ry][rx]);
      }
    }

    const mainPath = blueprint.path;
    const mainSet = new Set(mainPath.map((c) => cellKey(c)));
    const mainEdges = blueprintMainEdges(blueprint);
    const branchEdges = this.limitedBranchEdges(rng, mainSet, MAX_BRANCHES);

    const allEdges = [...mainEdges, ...branchEdges];
    for (const [a, b] of allEdges) {
      if (a.ry === b.ry) {
        this.carveHorizontalDoor(set, a, b);
      } else {
        const link = isVerticalLink(a, b, blueprint.verticalLinks);
        const kind: ShaftKind = link?.kind ?? "ori_steps";
        const host = link ? link.from.ry < link.to.ry ? link.from : link.to : a;
        this.carveVerticalShaft(set, a, b, kind, host.rx);
      }
    }

    for (let ry = 0; ry < GRID_Y; ry++) {
      for (let rx = 0; rx < GRID_X; rx++) {
        if (!mainSet.has(`${rx},${ry}`)) {
          this.carveRoomPlatforms(set, rx, ry, rng, roomVariants[ry][rx]);
        }
      }
    }

    const objects: LevelObject[] = [];
    const puzzleHints: PuzzleHint[] = [];

    const start = this.roomFloorPixel(blueprint.startCell, Math.floor(ROOM_W / 2));
    const exitPos = this.roomFloorPixel(blueprint.exitCell, Math.floor(ROOM_W / 2));
    objects.push({
      x: exitPos.x,
      y: exitPos.y,
      kind: "exit",
      meta: { locked: true },
    });

    this.placeKeyPuzzle(blueprint.keyCell, objects, rng, puzzleHints);
    this.placeOptionalStartLever(blueprint.startCell, objects, rng);

    const sideRooms = this.sideRooms(mainSet);
    const deadEnds = this.deadEndRooms(mainSet, allEdges, blueprint.startCell, blueprint.exitCell);
    this.placeSidePuzzles(sideRooms, deadEnds, objects, rng, puzzleHints, get);

    this.placeBonusZones(set, objects, rng, deadEnds);

    this.placeDecor(objects, rng, roomVariants, roomThemes, mainSet);

    const standables = this.findStandables(get, W, H);
    const free = rng
      .shuffle(standables)
      .filter(
        (p) =>
          !mainSet.has(`${this.pixelToCell(p.x, p.y).rx},${this.pixelToCell(p.x, p.y).ry}`) &&
          !objects.some((o) => Math.hypot(o.x - p.x, o.y - p.y) < TILE * 2)
      );
    let fi = 0;
    const nextSpot = () => (fi < free.length ? free[fi++] : null);

    for (let i = 0; i < 6; i++) {
      const s = nextSpot();
      if (!s) break;
      objects.push({ x: s.x, y: s.y, kind: "food" });
    }

    for (let i = 0; i < 4; i++) {
      const s = nextSpot();
      if (!s) break;
      objects.push({ x: s.x, y: s.y, kind: "enemy" });
    }

    for (let i = 0; i < 2; i++) {
      const s = nextSpot();
      if (!s) break;
      objects.push({ x: s.x, y: s.y, kind: "crate", meta: { puzzle: false } });
    }

    return {
      seed,
      widthTiles: W,
      heightTiles: H,
      tiles,
      roomVariants,
      roomThemes,
      mainPathRooms: [...mainSet],
      puzzleHints,
      start,
      objects,
    };
  }

  private static themeVariant(theme: RoomTheme): number {
    const map: Record<RoomTheme, number> = {
      aisle: 0,
      produce: 1,
      dairy: 2,
      checkout: 3,
    };
    return map[theme];
  }

  private static sideRooms(mainSet: Set<string>): RoomCell[] {
    const out: RoomCell[] = [];
    for (let ry = 0; ry < GRID_Y; ry++) {
      for (let rx = 0; rx < GRID_X; rx++) {
        if (!mainSet.has(`${rx},${ry}`)) out.push({ rx, ry });
      }
    }
    return out;
  }

  /** 2–4 боковые ветки от main path (предпочтение горизонтали). */
  private static limitedBranchEdges(
    rng: RNG,
    mainSet: Set<string>,
    maxBranches: number
  ): [RoomCell, RoomCell][] {
    const edges: [RoomCell, RoomCell][] = [];
    const connected = new Set(mainSet);
    const fringe = [...mainSet].map((k) => {
      const [rx, ry] = k.split(",").map(Number);
      return { rx, ry };
    });

    for (let i = 0; i < maxBranches && connected.size < GRID_X * GRID_Y; i++) {
      const from = rng.pick(fringe);
      const neighbors = this.roomNeighbors(from).filter(
        (n) => !connected.has(cellKey(n))
      );
      if (neighbors.length === 0) continue;
      const horiz = neighbors.filter((n) => n.ry === from.ry);
      const to = horiz.length ? rng.pick(horiz) : rng.pick(neighbors);
      edges.push([from, to]);
      connected.add(cellKey(to));
      fringe.push(to);
    }
    return edges;
  }

  private static roomNeighbors(c: RoomCell): RoomCell[] {
    const out: RoomCell[] = [];
    const cand = [
      { rx: c.rx + 1, ry: c.ry },
      { rx: c.rx - 1, ry: c.ry },
      { rx: c.rx, ry: c.ry + 1 },
      { rx: c.rx, ry: c.ry - 1 },
    ];
    for (const n of cand) {
      if (n.rx >= 0 && n.rx < GRID_X && n.ry >= 0 && n.ry < GRID_Y) out.push(n);
    }
    return out;
  }

  private static deadEndRooms(
    mainSet: Set<string>,
    edges: [RoomCell, RoomCell][],
    start: RoomCell,
    exit: RoomCell
  ): RoomCell[] {
    const degree = new Map<string, number>();
    for (const [a, b] of edges) {
      const ka = cellKey(a);
      const kb = cellKey(b);
      degree.set(ka, (degree.get(ka) ?? 0) + 1);
      degree.set(kb, (degree.get(kb) ?? 0) + 1);
    }
    const dead: RoomCell[] = [];
    for (let ry = 0; ry < GRID_Y; ry++) {
      for (let rx = 0; rx < GRID_X; rx++) {
        const k = `${rx},${ry}`;
        if (mainSet.has(k)) continue;
        if ((degree.get(k) ?? 0) <= 1) dead.push({ rx, ry });
      }
    }
    return dead.filter(
      (c) =>
        !(c.rx === start.rx && c.ry === start.ry) &&
        !(c.rx === exit.rx && c.ry === exit.ry)
    );
  }

  private static carveRoom(
    set: (x: number, y: number, v: number) => void,
    rx: number,
    ry: number,
    variant: number
  ): void {
    const ox = rx * ROOM_W;
    const oy = ry * ROOM_H;
    const floorRow = oy + ROOM_H - 2;
    const solidTile = SOLID + variant * 2;

    for (let y = oy + 1; y <= oy + ROOM_H - 2; y++) {
      for (let x = ox + 1; x <= ox + ROOM_W - 2; x++) set(x, y, EMPTY);
    }
    for (let x = ox + 1; x <= ox + ROOM_W - 2; x++) set(x, floorRow, solidTile);
  }

  private static carveRoomPlatforms(
    set: (x: number, y: number, v: number) => void,
    rx: number,
    ry: number,
    rng: RNG,
    variant: number
  ): void {
    if (!rng.chance(0.5)) return;
    const ox = rx * ROOM_W;
    const oy = ry * ROOM_H;
    const platTile = PLATFORM + variant * 2;
    const py = oy + rng.int(5, ROOM_H - 7);
    const len = rng.int(4, 6);
    const px = ox + rng.int(2, ROOM_W - 2 - len);
    for (let k = 0; k < len; k++) set(px + k, py, platTile);
  }

  private static carveHorizontalDoor(
    set: (x: number, y: number, v: number) => void,
    a: RoomCell,
    b: RoomCell
  ): void {
    const left = a.rx < b.rx ? a : b;
    const ox = left.rx * ROOM_W;
    const oy = left.ry * ROOM_H;
    const floorRow = oy + ROOM_H - 2;
    const wallColR = ox + ROOM_W - 1;
    const wallColL = ox + ROOM_W;
    for (let dy = 1; dy <= 4; dy++) {
      set(wallColR, floorRow - dy, EMPTY);
      set(wallColL, floorRow - dy, EMPTY);
    }
    set(wallColR, floorRow, SOLID);
    set(wallColL, floorRow, SOLID);
  }

  private static carveVerticalShaft(
    set: (x: number, y: number, v: number) => void,
    a: RoomCell,
    b: RoomCell,
    kind: ShaftKind,
    shaftRx: number
  ): void {
    const upper = a.ry < b.ry ? a : b;
    const lower = a.ry < b.ry ? b : a;
    const ox = shaftRx * ROOM_W;
    const cx = ox + Math.floor(ROOM_W / 2);

    const upperOy = upper.ry * ROOM_H;
    const lowerOy = lower.ry * ROOM_H;
    const upperFloor = upperOy + ROOM_H - 2;
    const lowerFloor = lowerOy + ROOM_H - 2;

    const shaftW = kind === "ori_wide" ? 2 : 1;
    const upperOx = upper.rx * ROOM_W;

    // Воздушная колонна только под полом верхней комнаты — пол остаётся цельным.
    for (let y = upperFloor + 1; y < lowerFloor; y++) {
      for (let dx = -shaftW; dx <= shaftW; dx++) set(cx + dx, y, EMPTY);
    }

    const step = SHAFT_PLATFORM_STEP;
    const platW = kind === "ori_wide" ? 6 : 4;
    let side = -1;
    for (let y = lowerFloor - step; y > upperFloor; y -= step) {
      const baseX = side < 0 ? cx - platW + 1 : cx;
      for (let k = 0; k < platW; k++) set(baseX + k, y, PLATFORM);
      side = -side;
    }

    // Восстановить пол верхней комнаты (мог быть затёрт при соседних проходах).
    for (let x = upperOx + 1; x <= upperOx + ROOM_W - 2; x++) {
      set(x, upperFloor, SOLID);
    }

    // Выход шахты в верхнюю комнату: проём в полу над верхней платформой (1 прыжок до пола).
    for (let dx = -shaftW; dx <= shaftW; dx++) {
      set(cx + dx, upperFloor, EMPTY);
    }
  }

  private static placeKeyPuzzle(
    room: RoomCell,
    objects: LevelObject[],
    rng: RNG,
    hints: PuzzleHint[]
  ): void {
    const ox = room.rx * ROOM_W;
    const oy = room.ry * ROOM_H;
    const floorRow = oy + ROOM_H - 2;
    const linkId = `keygate_${rng.int(1000, 9999)}`;

    objects.push({
      x: (ox + ROOM_W - 5 + 0.5) * TILE,
      y: (floorRow - 1 + 1) * TILE,
      kind: "gate",
      meta: { linkId, onMainPath: true, mode: "hold" },
    });
    objects.push({
      x: (ox + ROOM_W - 3 + 0.5) * TILE,
      y: floorRow * TILE,
      kind: "key",
      meta: { behindGate: linkId },
    });
    objects.push({
      x: (ox + 4 + 0.5) * TILE,
      y: floorRow * TILE,
      kind: "pressurePlate",
      meta: { linkId, mode: "hold" },
    });
    hints.push({
      rx: room.rx,
      ry: room.ry,
      type: "plate",
      text: "Встань на плиту — откроется путь к ключу",
    });
  }

  private static placeOptionalStartLever(
    cell: RoomCell,
    objects: LevelObject[],
    rng: RNG
  ): void {
    const ox = cell.rx * ROOM_W;
    const oy = cell.ry * ROOM_H;
    const floorRow = oy + ROOM_H - 2;
    const id = `lever_${rng.int(1000, 9999)}`;
    objects.push({
      x: (ox + ROOM_W - 6 + 0.5) * TILE,
      y: (floorRow - 1 + 1) * TILE,
      kind: "gate",
      meta: { linkId: id },
    });
    objects.push({
      x: (ox + ROOM_W - 4 + 0.5) * TILE,
      y: floorRow * TILE,
      kind: "food",
    });
    objects.push({
      x: (ox + 3 + 0.5) * TILE,
      y: floorRow * TILE,
      kind: "lever",
      meta: { linkId: id },
    });
  }

  private static placeSidePuzzles(
    sideRooms: RoomCell[],
    deadEnds: RoomCell[],
    objects: LevelObject[],
    rng: RNG,
    hints: PuzzleHint[],
    get: (x: number, y: number) => number
  ): void {
    if (sideRooms.length === 0) return;

    const used = new Set<string>();
    const leverTargets = rng.shuffle([...deadEnds]);

    let leverCount = 0;
    for (const cell of leverTargets) {
      if (leverCount >= 3) break;
      const k = cellKey(cell);
      if (used.has(k)) continue;
      const n = objects.length;
      this.placeLeverPuzzle(cell, objects, rng, hints, get);
      if (objects.length > n) {
        used.add(k);
        leverCount++;
      }
    }

    const crateCandidates = sideRooms.filter((c) => !used.has(cellKey(c)));
    if (crateCandidates.length) {
      const room = rng.pick(crateCandidates);
      const n = objects.length;
      this.placeCratePuzzle(room, objects, rng, hints, get);
      if (objects.length > n) used.add(cellKey(room));
    }

    for (const cell of deadEnds) {
      const k = cellKey(cell);
      if (used.has(k)) continue;
      this.placeGatedDeadEnd(cell, objects, rng, hints, get);
    }
  }

  private static placeGatedDeadEnd(
    cell: RoomCell,
    objects: LevelObject[],
    rng: RNG,
    hints: PuzzleHint[],
    get: (x: number, y: number) => number
  ): void {
    const ox = cell.rx * ROOM_W;
    const oy = cell.ry * ROOM_H;
    const floorRow = oy + ROOM_H - 2;
    const gateCol = ox + ROOM_W - 4;
    if (get(gateCol, floorRow - 1) !== EMPTY) return;

    const id = `dead_${rng.int(1000, 9999)}`;
    objects.push({
      x: (gateCol + 0.5) * TILE,
      y: (floorRow - 1 + 1) * TILE,
      kind: "gate",
      meta: { linkId: id },
    });
    objects.push({
      x: (ox + 3 + 0.5) * TILE,
      y: floorRow * TILE,
      kind: "lever",
      meta: { linkId: id },
    });
    const bonus = rng.chance(0.45) ? "doubleJump" : "dash";
    objects.push({
      x: (gateCol + 2 + 0.5) * TILE,
      y: floorRow * TILE,
      kind: "food",
      meta: { bonus, onMainPath: false },
    });
    hints.push({
      rx: cell.rx,
      ry: cell.ry,
      type: "lever",
      text: "Закрытая комната — рычаг откроет ворота",
    });
  }

  private static placeLeverPuzzle(
    cell: RoomCell,
    objects: LevelObject[],
    rng: RNG,
    hints: PuzzleHint[],
    get: (x: number, y: number) => number
  ): void {
    const ox = cell.rx * ROOM_W;
    const oy = cell.ry * ROOM_H;
    const floorRow = oy + ROOM_H - 2;
    const gateCol = ox + ROOM_W - 5;
    if (get(gateCol, floorRow - 1) !== EMPTY) return;

    const id = `lever_${rng.int(1000, 9999)}`;
    objects.push({
      x: (gateCol + 0.5) * TILE,
      y: (floorRow - 1 + 1) * TILE,
      kind: "gate",
      meta: { linkId: id },
    });
    objects.push({
      x: (gateCol + 2 + 0.5) * TILE,
      y: floorRow * TILE,
      kind: "food",
    });
    objects.push({
      x: (ox + 3 + 0.5) * TILE,
      y: floorRow * TILE,
      kind: "lever",
      meta: { linkId: id },
    });
    hints.push({
      rx: cell.rx,
      ry: cell.ry,
      type: "lever",
      text: "Нажми рычаг — откроются ворота к еде",
    });
  }

  private static placeCratePuzzle(
    cell: RoomCell,
    objects: LevelObject[],
    rng: RNG,
    hints: PuzzleHint[],
    get: (x: number, y: number) => number
  ): void {
    const ox = cell.rx * ROOM_W;
    const oy = cell.ry * ROOM_H;
    const floorRow = oy + ROOM_H - 2;
    const gateCol = ox + 5;
    if (get(gateCol, floorRow - 1) !== EMPTY) return;

    const id = `crate_${rng.int(1000, 9999)}`;
    objects.push({
      x: (gateCol + 0.5) * TILE,
      y: (floorRow - 1 + 1) * TILE,
      kind: "gate",
      meta: { linkId: id, mode: "crate" },
    });
    objects.push({
      x: (gateCol + 3 + 0.5) * TILE,
      y: floorRow * TILE,
      kind: "food",
    });
    objects.push({
      x: (ox + 4 + 0.5) * TILE,
      y: floorRow * TILE,
      kind: "pressurePlate",
      meta: { linkId: id, mode: "crate" },
    });
    objects.push({
      x: (ox + 8 + 0.5) * TILE,
      y: floorRow * TILE,
      kind: "crate",
      meta: { linkId: id, puzzle: true },
    });
    hints.push({
      rx: cell.rx,
      ry: cell.ry,
      type: "crate",
      text: "Толкни ящик на плиту",
    });
  }

  private static placeBonusZones(
    set: (x: number, y: number, v: number) => void,
    objects: LevelObject[],
    rng: RNG,
    deadEnds: RoomCell[]
  ): void {
    const pick = (): RoomCell | null => (deadEnds.length ? rng.pick(deadEnds) : null);

    const dj = pick();
    if (dj) {
      const ox = dj.rx * ROOM_W;
      const oy = dj.ry * ROOM_H;
      const py = oy + 4;
      const px = ox + 4;
      for (let k = 0; k < 4; k++) set(px + k, py, PLATFORM);
      objects.push({
        x: (px + 2 + 0.5) * TILE,
        y: (py + 1) * TILE,
        kind: "food",
        meta: { bonus: "doubleJump", onMainPath: false },
      });
    }

    const dash = pick();
    if (dash) {
      const ox = dash.rx * ROOM_W;
      const oy = dash.ry * ROOM_H;
      const floorRow = oy + ROOM_H - 2;
      const gapX = ox + 3;
      set(gapX, floorRow, EMPTY);
      objects.push({
        x: (gapX + 3 + 0.5) * TILE,
        y: (floorRow - 2) * TILE,
        kind: "food",
        meta: { bonus: "dash", onMainPath: false },
      });
    }
  }

  private static placeDecor(
    objects: LevelObject[],
    rng: RNG,
    roomVariants: number[][],
    roomThemes: RoomTheme[][],
    mainSet: Set<string>
  ): void {
    const signs: Record<RoomTheme, string> = {
      aisle: "-20%",
      produce: "Свежие овощи",
      dairy: "Молоко 2=1",
      checkout: "Касса",
    };
    for (let ry = 0; ry < GRID_Y; ry++) {
      for (let rx = 0; rx < GRID_X; rx++) {
        if (mainSet.has(`${rx},${ry}`)) continue;
        if (rng.chance(0.65)) {
          const theme = roomThemes[ry][rx];
          objects.push({
            x: (rx * ROOM_W + 4 + 0.5) * TILE,
            y: (ry * ROOM_H + 5 + 0.5) * TILE,
            kind: "decor",
            meta: { variant: roomVariants[ry][rx], theme, sign: signs[theme] },
          });
        }
      }
    }
  }

  private static findStandables(
    get: (x: number, y: number) => number,
    W: number,
    H: number
  ): { x: number; y: number }[] {
    const res: { x: number; y: number }[] = [];
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const here = get(x, y);
        const below = get(x, y + 1);
        if (here === EMPTY && below !== EMPTY && below !== -1) {
          res.push({ x: (x + 0.5) * TILE, y: (y + 1) * TILE });
        }
      }
    }
    return res;
  }

  private static roomFloorPixel(cell: RoomCell, colOffset: number): { x: number; y: number } {
    const ox = cell.rx * ROOM_W;
    const oy = cell.ry * ROOM_H;
    const floorRow = oy + ROOM_H - 2;
    return { x: (ox + colOffset + 0.5) * TILE, y: floorRow * TILE };
  }

  private static pixelToCell(px: number, py: number): RoomCell {
    const tx = Math.floor(px / TILE);
    const ty = Math.floor(py / TILE);
    return { rx: Math.floor(tx / ROOM_W), ry: Math.floor(ty / ROOM_H) };
  }
}
