import { GAME_H, GAME_W } from "../config";

/**
 * Размеры шрифтов в координатах игры (540×960).
 * На экране ~800px высоты «28px» ≈ 23px — это минимум для мобилки.
 */
export const HUD_FONT = {
  xs: "28px",
  sm: "32px",
  md: "38px",
  lg: "46px",
  xl: "64px",
  title: "56px",
} as const;

export const HUD_COLORS = {
  primary: "#ffffff",
  secondary: "#dce4f0",
  accent: "#ffd23f",
  success: "#7ed957",
  panel: "#0e1726",
  panelAlpha: 0.92,
  danger: "#e05a47",
  muted: "#b8c4d8",
} as const;

export const HUD_TEXT_STROKE = {
  color: "#060a14",
  thickness: 6,
} as const;

export const HUD_DEPTH = {
  panel: 100,
  hudText: 101,
  vignette: 90,
  float: 60,
  puzzleHint: 102,
} as const;

export const HUD_LAYOUT = {
  topPanelH: 118,
  bottomPanelH: 52,
  questPanelH: 148,
  questCardW: GAME_W - 24,
  questCardGap: 46,
  questStartY: GAME_H - 178,
  topPadding: 10,
  sidePadding: 14,
} as const;

export const MAX_PROMOS_PER_DAY = 5;

export const HUD_FONT_FAMILY =
  'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';

/** Числовой размер для кнопок и разовых подписей. */
export function fontPx(px: number): string {
  return `${px}px`;
}

export const HUD_BUTTON = {
  width: 340,
  height: 84,
  fontSize: 38,
  smallFontSize: 30,
} as const;
