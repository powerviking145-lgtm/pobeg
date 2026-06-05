/** Единая тема HUD и UI-текста. */
export const HUD_FONT = {
  sm: "14px",
  md: "16px",
  lg: "20px",
  xl: "44px",
} as const;

export const HUD_COLORS = {
  primary: "#ffffff",
  secondary: "#9aa6b6",
  accent: "#ffd23f",
  success: "#7ed957",
  panel: "#0e1726",
  panelAlpha: 0.72,
  danger: "#e05a47",
  muted: "#7a8494",
} as const;

export const HUD_DEPTH = {
  panel: 100,
  hudText: 101,
  vignette: 90,
  float: 60,
  puzzleHint: 102,
} as const;

export const HUD_LAYOUT = {
  topPanelH: 112,
  bottomPanelH: 36,
  questColumnW: 168,
  questColumnX: 372,
  questStartY: 118,
  questCardGap: 40,
  topPadding: 12,
  sidePadding: 20,
} as const;

export const MAX_PROMOS_PER_DAY = 5;

export const HUD_FONT_FAMILY = "system-ui, sans-serif";
