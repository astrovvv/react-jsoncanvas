import type { EdgeVisualMetrics } from '../types';

const MIN_METRIC_SCALE = 0.1;
const MAX_METRIC_SCALE = 3;
const SCALE_STEP = 0.05;

export const EDGE_VISUAL_LIMITS = {
  maxWorldStrokeWidth: 3.2,
  maxWorldArrowLength: 18,
  maxWorldArrowWidth: 22,
  maxWorldEndpointGap: 4,
  maxWorldHitTargetWidth: 38.4,
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function quantizeEdgeScale(scale: number): number {
  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  const clampedScale = clamp(safeScale, MIN_METRIC_SCALE, MAX_METRIC_SCALE);

  return Math.round(clampedScale / SCALE_STEP) * SCALE_STEP;
}

/**
 * Keeps edge visuals approximately constant in screen space through the
 * ordinary zoom range. World-space caps let them shrink with the graph at
 * overview scales. Values are expressed in world units because the edge SVG
 * lives inside the scaled viewport.
 */
export function getEdgeVisualMetrics(scale: number): EdgeVisualMetrics {
  const metricScale = quantizeEdgeScale(scale);

  return {
    scale: metricScale,
    strokeWidth: Math.min(
      2 / metricScale,
      EDGE_VISUAL_LIMITS.maxWorldStrokeWidth
    ),
    arrowLength: Math.min(
      10.4 / metricScale,
      EDGE_VISUAL_LIMITS.maxWorldArrowLength
    ),
    arrowWidth: Math.min(
      13 / metricScale,
      EDGE_VISUAL_LIMITS.maxWorldArrowWidth
    ),
    endpointGap: Math.min(
      1.5 / metricScale,
      EDGE_VISUAL_LIMITS.maxWorldEndpointGap
    ),
    hitTargetWidth: Math.min(
      24 / metricScale,
      EDGE_VISUAL_LIMITS.maxWorldHitTargetWidth
    ),
  };
}
