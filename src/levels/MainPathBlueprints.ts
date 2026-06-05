import { GRID_X, GRID_Y } from "../config";

export interface RoomCell {
  rx: number;
  ry: number;
}

export type ShaftKind = "ori_wide" | "ori_steps";

export interface VerticalLink {
  from: RoomCell;
  to: RoomCell;
  kind: ShaftKind;
}

export interface MainPathBlueprint {
  id: string;
  name: string;
  path: RoomCell[];
  startCell: RoomCell;
  keyCell: RoomCell;
  exitCell: RoomCell;
  verticalLinks: VerticalLink[];
}

export function cellKey(c: RoomCell): string {
  return `${c.rx},${c.ry}`;
}

function pathEdges(path: RoomCell[]): [RoomCell, RoomCell][] {
  const edges: [RoomCell, RoomCell][] = [];
  for (let i = 0; i < path.length - 1; i++) edges.push([path[i], path[i + 1]]);
  return edges;
}

/** 3 Ori-style маршрута снизу вверх для сетки 3×3. */
export const MAIN_PATH_BLUEPRINTS: MainPathBlueprint[] = [
  {
    id: "spire",
    name: "Шпиль",
    path: [
      { rx: 1, ry: 2 },
      { rx: 1, ry: 1 },
      { rx: 1, ry: 0 },
    ],
    startCell: { rx: 1, ry: 2 },
    keyCell: { rx: 1, ry: 1 },
    exitCell: { rx: 1, ry: 0 },
    verticalLinks: [
      { from: { rx: 1, ry: 2 }, to: { rx: 1, ry: 1 }, kind: "ori_wide" },
      { from: { rx: 1, ry: 1 }, to: { rx: 1, ry: 0 }, kind: "ori_steps" },
    ],
  },
  {
    id: "zigzag",
    name: "Зигзаг",
    path: [
      { rx: 0, ry: 2 },
      { rx: 1, ry: 2 },
      { rx: 1, ry: 1 },
      { rx: 2, ry: 1 },
      { rx: 2, ry: 0 },
    ],
    startCell: { rx: 0, ry: 2 },
    keyCell: { rx: 1, ry: 1 },
    exitCell: { rx: 2, ry: 0 },
    verticalLinks: [
      { from: { rx: 1, ry: 2 }, to: { rx: 1, ry: 1 }, kind: "ori_wide" },
      { from: { rx: 2, ry: 1 }, to: { rx: 2, ry: 0 }, kind: "ori_steps" },
    ],
  },
  {
    id: "east_climb",
    name: "Восточный подъём",
    path: [
      { rx: 1, ry: 2 },
      { rx: 2, ry: 2 },
      { rx: 2, ry: 1 },
      { rx: 1, ry: 1 },
      { rx: 1, ry: 0 },
    ],
    startCell: { rx: 1, ry: 2 },
    keyCell: { rx: 1, ry: 1 },
    exitCell: { rx: 1, ry: 0 },
    verticalLinks: [
      { from: { rx: 2, ry: 2 }, to: { rx: 2, ry: 1 }, kind: "ori_wide" },
      { from: { rx: 1, ry: 1 }, to: { rx: 1, ry: 0 }, kind: "ori_steps" },
    ],
  },
];

export function pickBlueprint(seed: number): MainPathBlueprint {
  const idx = Math.abs(seed) % MAIN_PATH_BLUEPRINTS.length;
  return MAIN_PATH_BLUEPRINTS[idx];
}

export function blueprintMainEdges(bp: MainPathBlueprint): [RoomCell, RoomCell][] {
  return pathEdges(bp.path);
}

export function isVerticalLink(
  a: RoomCell,
  b: RoomCell,
  links: VerticalLink[]
): VerticalLink | undefined {
  return links.find(
    (l) =>
      (l.from.rx === a.rx &&
        l.from.ry === a.ry &&
        l.to.rx === b.rx &&
        l.to.ry === b.ry) ||
      (l.from.rx === b.rx &&
        l.from.ry === b.ry &&
        l.to.rx === a.rx &&
        l.to.ry === a.ry)
  );
}

export function allRoomCells(): RoomCell[] {
  const out: RoomCell[] = [];
  for (let ry = 0; ry < GRID_Y; ry++)
    for (let rx = 0; rx < GRID_X; rx++) out.push({ rx, ry });
  return out;
}
