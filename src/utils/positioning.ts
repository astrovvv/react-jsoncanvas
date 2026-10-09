import type { CSSProperties } from 'react';
import { UI_POSITIONING } from '../constants';

export interface PositionConfig {
  top?: boolean;
  bottom?: boolean;
  left?: boolean;
  right?: boolean;
  margin?: number;
  zIndex?: number;
}

/**
 * Generate absolute positioning styles for UI controls
 */
export function createPositionStyle(config: PositionConfig): CSSProperties {
  const {
    top,
    bottom,
    left,
    right,
    margin = UI_POSITIONING.CONTROL_MARGIN,
    zIndex = UI_POSITIONING.CONTROL_Z_INDEX,
  } = config;

  const style: CSSProperties = {
    position: 'absolute',
    zIndex,
  };

  if (top) style.top = margin;
  if (bottom) style.bottom = margin;
  if (left) style.left = margin;
  if (right) style.right = margin;

  return style;
}
