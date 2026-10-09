import { useCallback } from 'react';
import type { RefObject } from 'react';
import type { Edge, GenericNode } from '@trbn/jsoncanvas';
import type { ViewportState } from '../types';
import { getAnchorPointFromNode, worldToScreen } from '../utils/geometry';
import { useVisibleIds } from './useVisibleIds';

/** Conservatively shows edges with a visible endpoint or crossing the viewport. */
export function useVisibleEdgeIds(
  edges: Edge[],
  getNodeById: (id: string) => GenericNode | undefined,
  viewport: ViewportState,
  containerRef: RefObject<HTMLElement>,
  margin = 400
) {
  const calculate = useCallback(
    (width: number, height: number) => {
      const next = new Set<string>();
      for (const edge of edges) {
        const fromNode = getNodeById(edge.fromNode);
        const toNode = getNodeById(edge.toNode);
        // Missing endpoints should not hide the edge while the document changes.
        if (!fromNode || !toNode) {
          next.add(edge.id);
          continue;
        }

        const from = getAnchorPointFromNode(fromNode, edge.fromSide);
        const to = getAnchorPointFromNode(toNode, edge.toSide);
        const fromScreen = worldToScreen(from.x, from.y, viewport);
        const toScreen = worldToScreen(to.x, to.y, viewport);

        const endpointVisible =
          (fromScreen.x >= -margin &&
            fromScreen.x <= width + margin &&
            fromScreen.y >= -margin &&
            fromScreen.y <= height + margin) ||
          (toScreen.x >= -margin &&
            toScreen.x <= width + margin &&
            toScreen.y >= -margin &&
            toScreen.y <= height + margin);

        // Approximate the offscreen curve by the segment between its anchors.
        const crossesViewport =
          Math.max(fromScreen.x, toScreen.x) >= -margin &&
          Math.min(fromScreen.x, toScreen.x) <= width + margin &&
          Math.max(fromScreen.y, toScreen.y) >= -margin &&
          Math.min(fromScreen.y, toScreen.y) <= height + margin;

        if (endpointVisible || crossesViewport) next.add(edge.id);
      }
      return next;
    },
    [edges, getNodeById, viewport, margin]
  );

  return useVisibleIds(containerRef, calculate);
}
