// Базовые константы игры. Портретная ориентация, размеры в пикселях.
export const GAME_W = 540;
export const GAME_H = 960;

// Размер тайла мира.
export const TILE = 48;

// Размер комнаты в тайлах (16 = широкий Ori-style коридор).
export const ROOM_W = 16;
export const ROOM_H = 18;

// Размер сетки комнат (мир = GRID_X*ROOM_W на GRID_Y*ROOM_H тайлов).
export const GRID_X = 3;
export const GRID_Y = 3;

// Физика.
export const GRAVITY_Y = 1500;
export const MOVE_SPEED = 240;
export const JUMP_VELOCITY = 620;
export const DASH_SPEED = 620;
export const DASH_DURATION = 180; // мс
export const ACCEL = 1800;
export const DECEL = 2200;
export const COYOTE_MS = 100;
export const JUMP_BUFFER_MS = 120;

export const PLAYER_FW = 48;
export const PLAYER_FH = 56;
export const PLAYER_FRAMES_PER_STAGE = 6;
export const ENEMY_FW = 52;
export const ENEMY_FH = 46;

// Ключи texture/asset.
export const TEX = {
  player: "player",
  player_0: "player_0",
  player_1: "player_1",
  player_2: "player_2",
  player_3: "player_3",
  enemy: "enemy",
  tiles: "tiles",
  food: "food",
  key: "key",
  crate: "crate",
  lever: "lever",
  door: "door",
  exit: "exit",
  spike: "spike",
  bg: "bg",
  bg_mid: "bg_mid",
  player_sheet: "player_sheet",
  heart: "heart",
  gate: "gate",
  spark: "spark",
  slash: "slash",
  decor_sign: "decor_sign",
  pressure_plate: "pressure_plate",
  pressure_plate_on: "pressure_plate_on",
  shelf_wall: "shelf_wall",
  bg_fg: "bg_fg",
} as const;

/** Вертикальный шаг платформ в шахте (тайлы), из прыжка Крохи (jv=450). */
export function shaftPlatformStep(jumpVelocity: number = 450): number {
  const maxPx = (jumpVelocity * jumpVelocity) / (2 * GRAVITY_Y);
  return Math.max(1, Math.floor((maxPx * 0.88) / TILE));
}

export const SHAFT_PLATFORM_STEP = Math.max(2, shaftPlatformStep());

// Цвета палитры (мультяшная, сочная).
export const COLORS = {
  sky: 0x1b2a4a,
  skyTop: 0x24406e,
  wall: 0x3a2c4f,
  wallEdge: 0x55406f,
  ground: 0x6b4f3a,
  groundTop: 0x8a6a45,
  player: 0xffd23f,
  enemy: 0xe05a47,
  food: 0x7ed957,
  key: 0xffd23f,
  crate: 0xc08a4a,
  exit: 0x3ad17a,
  spike: 0xd6d6e0,
  hud: 0x0e1726,
  perekGreen: 0x3ad17a,
  perekDark: 0x1f8a4c,
  accent: 0xffd23f,
};

export function playerTexForStage(stageId: number): string {
  const keys = [TEX.player_0, TEX.player_1, TEX.player_2, TEX.player_3] as const;
  return keys[Math.min(stageId, keys.length - 1)];
}

export function playerStageFrameBase(stageId: number): number {
  return Math.min(stageId, 3) * PLAYER_FRAMES_PER_STAGE;
}
