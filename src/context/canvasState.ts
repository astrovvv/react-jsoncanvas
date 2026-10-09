import type { Edge, EdgeSide, GenericNode } from '@trbn/jsoncanvas';
import type {
  CanvasConfig,
  CanvasHistorySnapshot,
  CanvasState,
  ViewportState,
} from '../types';

const HISTORY_LIMIT = 100;

export function isValidViewport(viewport: ViewportState): boolean {
  return (
    Number.isFinite(viewport.scale) &&
    viewport.scale > 0 &&
    Number.isFinite(viewport.panOffsetX) &&
    Number.isFinite(viewport.panOffsetY)
  );
}

export const defaultCanvasConfig: CanvasConfig = {
  minScale: 0.25,
  maxScale: 3,
  zoomSpeed: 0.3,
  touchThreshold: 10,
  curveTightness: 0.75,
  enableKeyboardShortcuts: true,
  enableTouch: true,
  snapToGrid: true,
  gridSize: 20,
};

export function createInitialCanvasState(
  nodes: GenericNode[] = [],
  edges: Edge[] = []
): CanvasState {
  return {
    nodes,
    edges,
    history: { past: [], future: [] },
    viewport: { scale: 1, panOffsetX: 0, panOffsetY: 0 },
    isDragging: false,
    isPanning: false,
    selectedNodeId: null,
    selectedNodeIds: [],
    activeNodeId: null,
    editingNodeId: null,
    selectedEdgeId: null,
    editingEdgeId: null,
    isSpacePressed: false,
    connecting: null,
    rewiring: null,
  };
}

export function createSnapshot(state: CanvasState): CanvasHistorySnapshot {
  return {
    nodes: state.nodes,
    edges: state.edges,
    selectedNodeId: state.selectedNodeId,
    selectedNodeIds: state.selectedNodeIds,
  };
}

export function pushHistory(
  history: CanvasState['history'],
  snapshot: CanvasHistorySnapshot
): CanvasState['history'] {
  return {
    past: [...history.past, snapshot].slice(-HISTORY_LIMIT),
    future: [],
  };
}

export function withHistory(
  state: CanvasState,
  updates: Partial<CanvasState>,
  recordHistory = true
): CanvasState {
  return {
    ...state,
    ...updates,
    history: recordHistory
      ? pushHistory(state.history, createSnapshot(state))
      : state.history,
  };
}

export function applySnapshot(
  state: CanvasState,
  snapshot: CanvasHistorySnapshot,
  history: CanvasState['history']
): CanvasState {
  return {
    ...state,
    nodes: snapshot.nodes,
    edges: snapshot.edges,
    selectedNodeId: snapshot.selectedNodeId,
    selectedNodeIds: snapshot.selectedNodeIds,
    activeNodeId: null,
    editingNodeId: null,
    selectedEdgeId: null,
    editingEdgeId: null,
    connecting: null,
    rewiring: null,
    isDragging: false,
    history,
  };
}

export function removeNodesFromState(
  state: CanvasState,
  nodeIds: string[]
): CanvasState {
  if (!nodeIds.length) return state;
  const toRemove = new Set(nodeIds);
  const remainingSelectedIds = state.selectedNodeIds.filter(
    id => !toRemove.has(id)
  );
  const selectedEdgeRemoved = state.edges.some(
    edge =>
      edge.id === state.selectedEdgeId &&
      (toRemove.has(edge.fromNode) || toRemove.has(edge.toNode))
  );

  return {
    ...state,
    nodes: state.nodes.filter(node => !toRemove.has(node.id)),
    edges: state.edges.filter(
      edge => !toRemove.has(edge.fromNode) && !toRemove.has(edge.toNode)
    ),
    selectedNodeIds: remainingSelectedIds,
    selectedNodeId: remainingSelectedIds.length
      ? remainingSelectedIds[remainingSelectedIds.length - 1]!
      : null,
    activeNodeId:
      state.activeNodeId && !toRemove.has(state.activeNodeId)
        ? state.activeNodeId
        : null,
    editingNodeId:
      state.editingNodeId && !toRemove.has(state.editingNodeId)
        ? state.editingNodeId
        : null,
    selectedEdgeId: selectedEdgeRemoved ? null : state.selectedEdgeId,
    editingEdgeId: selectedEdgeRemoved ? null : state.editingEdgeId,
    connecting:
      state.connecting && toRemove.has(state.connecting.fromNodeId)
        ? null
        : state.connecting,
    rewiring:
      state.rewiring &&
      (toRemove.has(state.rewiring.fixedNodeId) ||
        (state.rewiring.hoverTargetNodeId &&
          toRemove.has(state.rewiring.hoverTargetNodeId)))
        ? null
        : state.rewiring,
    isDragging: false,
  };
}

export function rewireEdge(
  edge: Edge,
  movingEnd: 'from' | 'to',
  nodeId: string,
  side?: EdgeSide
): Edge {
  const updatedEdge = { ...edge };
  if (movingEnd === 'from') {
    updatedEdge.fromNode = nodeId;
    if (side) updatedEdge.fromSide = side;
    else delete updatedEdge.fromSide;
  } else {
    updatedEdge.toNode = nodeId;
    if (side) updatedEdge.toSide = side;
    else delete updatedEdge.toSide;
  }
  return updatedEdge;
}
