import { useCallback } from 'react';
import type { RefObject } from 'react';
import type { GenericNode } from '@trbn/jsoncanvas';
import type { ViewportState } from '../types';
import { worldToScreen } from '../utils/geometry';
import { useVisibleIds } from './useVisibleIds';

export function useVisibleNodeIds(
  nodes: GenericNode[],
  viewport: ViewportState,
  containerRef: RefObject<HTMLElement>,
  margin = 400
) {
  const calculate = useCallback(
    (width: number, height: number) => {
      const next = new Set<string>();
      for (const node of nodes) {
        const screen = worldToScreen(node.x, node.y, viewport);
        const scaledWidth = node.width * viewport.scale;
        const scaledHeight = node.height * viewport.scale;
        if (
          screen.x + scaledWidth >= -margin &&
          screen.x <= width + margin &&
          screen.y + scaledHeight >= -margin &&
          screen.y <= height + margin
        ) {
          next.add(node.id);
        }
      }
      return next;
    },
    [nodes, viewport, margin]
  );

  return useVisibleIds(containerRef, calculate);
}
