import type { CanvasColor } from '@trbn/jsoncanvas';

const edgeColorMap: Record<CanvasColor, string> = {
  1: 'var(--canvas-color-1, var(--canvas-edge-color-red, #e93147))',
  2: 'var(--canvas-color-2, var(--canvas-edge-color-orange, #ec7500))',
  3: 'var(--canvas-color-3, var(--canvas-edge-color-yellow, #e0ac00))',
  4: 'var(--canvas-color-4, var(--canvas-edge-color-green, #08b94e))',
  5: 'var(--canvas-color-5, var(--canvas-edge-color-cyan, #00bfbc))',
  6: 'var(--canvas-color-6, var(--canvas-edge-color-purple, #7852ee))',
};

export function resolveEdgeColor(color?: CanvasColor): string {
  return color != null
    ? edgeColorMap[color]
    : 'var(--canvas-edge-color, var(--canvas-color-neutral, #c0c0c0))';
}
