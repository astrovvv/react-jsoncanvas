// Mouse button constants
export const MOUSE_BUTTON = {
  LEFT: 0,
  MIDDLE: 1,
  RIGHT: 2,
} as const;

// Touch and interaction thresholds
export const INTERACTION_THRESHOLDS = {
  TOUCH_THRESHOLD: 10, // pixels
  DRAG_THRESHOLD: 5, // pixels
} as const;

// UI positioning constants
export const UI_POSITIONING = {
  CONTROL_MARGIN: 8,
  CONTROL_Z_INDEX: 20,
  HEADER_Z_INDEX: 1000,
} as const;

// Zoom and scale constants
export const ZOOM_CONSTANTS = {
  MIN_SCALE: 0.1,
  MAX_SCALE: 3,
  DEFAULT_SCALE: 1,
  ZOOM_SPEED: 0.1,
} as const;
