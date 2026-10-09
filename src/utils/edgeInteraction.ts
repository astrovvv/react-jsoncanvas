import type { ConnectDropEvent, Point } from '../types';
import type { EdgeSide } from '@trbn/jsoncanvas';

const EDGE_DRAG_THRESHOLD = 4;
let edgeIdSequence = 0;

const OPPOSITE_EDGE_SIDE: Record<EdgeSide, EdgeSide> = {
  left: 'right',
  right: 'left',
  top: 'bottom',
  bottom: 'top',
};

export function getOppositeEdgeSide(side: EdgeSide): EdgeSide {
  return OPPOSITE_EDGE_SIDE[side];
}

export function createEdgeId(existingIds: Iterable<string>): string {
  const ids = new Set(existingIds);
  let id: string;
  do {
    id = `edge_${Date.now()}_${edgeIdSequence++}`;
  } while (ids.has(id));
  return id;
}

export function getConnectDropEvent(
  connection: {
    fromNodeId: string;
    fromSide?: EdgeSide;
    startWorldX?: number;
    startWorldY?: number;
  },
  position: Point,
  scale: number
): ConnectDropEvent | null {
  const { fromNodeId, fromSide, startWorldX, startWorldY } = connection;
  if (fromSide == null || startWorldX == null || startWorldY == null) {
    return null;
  }

  const dragged = hasExceededEdgeDragThreshold(
    { x: startWorldX * scale, y: startWorldY * scale },
    { x: position.x * scale, y: position.y * scale }
  );
  if (!dragged) return null;

  return {
    fromNodeId,
    fromSide,
    position,
    toSide: getOppositeEdgeSide(fromSide),
  };
}

export function hasExceededEdgeDragThreshold(
  start: Point,
  current: Point
): boolean {
  return (
    Math.hypot(current.x - start.x, current.y - start.y) >= EDGE_DRAG_THRESHOLD
  );
}

export function getEdgeDropTarget(
  container: ParentNode,
  pointer: Point,
  skipNodeId?: string
): { nodeId?: string; side?: EdgeSide } {
  const nodeElements = container.querySelectorAll<HTMLElement>(
    '.react-jsoncanvas-node'
  );

  for (const element of nodeElements) {
    const nodeId = element.dataset.nodeId || element.id;
    if (nodeId === skipNodeId) continue;

    const rect = element.getBoundingClientRect();
    if (
      pointer.x < rect.left ||
      pointer.x > rect.right ||
      pointer.y < rect.top ||
      pointer.y > rect.bottom
    ) {
      continue;
    }

    const dx = pointer.x - (rect.left + rect.right) / 2;
    const dy = pointer.y - (rect.top + rect.bottom) / 2;
    const side: EdgeSide =
      Math.abs(dx) > Math.abs(dy)
        ? dx > 0
          ? 'right'
          : 'left'
        : dy > 0
          ? 'bottom'
          : 'top';
    return { nodeId, side };
  }

  return {};
}
