import type { Edge, EdgeSide, GenericNode } from '@trbn/jsoncanvas';
import type {
  CanvasHistorySnapshot,
  CanvasState,
  NodeLayerOperation,
  ViewportState,
} from '../types';
import { reorderNodesByLayer } from '../utils/canvasLayers';
import {
  applySnapshot,
  createSnapshot,
  isValidViewport,
  pushHistory,
  removeNodesFromState,
  rewireEdge,
  withHistory,
} from './canvasState';

export type CanvasAction =
  | { type: 'UPDATE_NODES'; payload: GenericNode[] }
  | {
      type: 'START_CONNECT';
      payload: { fromNodeId: string; fromSide?: EdgeSide };
    }
  | { type: 'UPDATE_CONNECT_POS'; payload: { x: number; y: number } }
  | {
      type: 'UPDATE_CONNECT_HOVER';
      payload: {
        hoverTargetNodeId?: string | undefined;
        hoverToSide?: EdgeSide | undefined;
      };
    }
  | { type: 'CANCEL_CONNECT' }
  | { type: 'FINISH_CONNECT'; payload: Edge }
  | {
      type: 'FINISH_CONNECT_WITH_NODE';
      payload: { node: GenericNode; edge: Edge };
    }
  | { type: 'UPDATE_EDGES'; payload: Edge[] }
  | {
      type: 'UPDATE_EDGE';
      payload: { id: string; updates: Partial<Edge> };
    }
  | { type: 'REMOVE_EDGE'; payload: string }
  | { type: 'UPDATE_VIEWPORT'; payload: Partial<ViewportState> }
  | {
      type: 'SET_DRAGGING';
      payload: { isDragging: boolean; nodeId?: string | undefined };
    }
  | { type: 'SET_PANNING'; payload: boolean }
  | { type: 'SET_SPACE_PRESSED'; payload: boolean }
  | { type: 'ADD_NODE'; payload: GenericNode }
  | { type: 'REMOVE_NODE'; payload: string }
  | { type: 'REMOVE_NODES'; payload: string[] }
  | {
      type: 'REORDER_NODES';
      payload: {
        nodeIds: string[];
        operation: NodeLayerOperation;
        recordHistory?: boolean;
      };
    }
  | {
      type: 'UPDATE_NODE';
      payload: {
        id: string;
        updates: Partial<GenericNode>;
        recordHistory?: boolean;
      };
    }
  | {
      type: 'SELECT_NODE';
      payload: { nodeIds: string[]; primaryId: string | null };
    }
  | { type: 'SELECT_EDGE'; payload: string | null }
  | { type: 'SET_EDITING_EDGE'; payload: string | null }
  | { type: 'SET_ACTIVE_NODE'; payload: string | null }
  | { type: 'SET_EDITING_NODE'; payload: string | null }
  | {
      type: 'START_REWIRE';
      payload: {
        edgeId: string;
        movingEnd: 'from' | 'to';
        fixedNodeId: string;
        fixedSide?: EdgeSide;
      };
    }
  | { type: 'UPDATE_REWIRE_POS'; payload: { x: number; y: number } }
  | {
      type: 'UPDATE_REWIRE_HOVER';
      payload: {
        hoverTargetNodeId?: string | undefined;
        hoverToSide?: EdgeSide | undefined;
      };
    }
  | { type: 'FINISH_REWIRE' }
  | { type: 'CANCEL_REWIRE' }
  | {
      type: 'BATCH_UPDATE_NODES';
      payload: {
        patches: { id: string; updates: Partial<GenericNode> }[];
        recordHistory?: boolean;
      };
    }
  | {
      type: 'PASTE_DOCUMENT';
      payload: {
        nodes: GenericNode[];
        edges: Edge[];
        selectedNodeIds: string[];
        selectedNodeId: string | null;
      };
    }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'PUSH_HISTORY'; payload: CanvasHistorySnapshot };

export function canvasReducer(
  state: CanvasState,
  action: CanvasAction
): CanvasState {
  switch (action.type) {
    case 'UPDATE_NODES':
      return withHistory(state, { nodes: action.payload });
    case 'UPDATE_EDGES':
      return withHistory(state, { edges: action.payload });
    case 'UPDATE_EDGE': {
      if (!state.edges.some(edge => edge.id === action.payload.id))
        return state;
      return withHistory(state, {
        edges: state.edges.map(edge =>
          edge.id === action.payload.id
            ? { ...edge, ...action.payload.updates }
            : edge
        ),
      });
    }
    case 'REMOVE_EDGE': {
      if (!state.edges.some(edge => edge.id === action.payload)) return state;
      return withHistory(state, {
        edges: state.edges.filter(edge => edge.id !== action.payload),
        selectedEdgeId:
          state.selectedEdgeId === action.payload ? null : state.selectedEdgeId,
        editingEdgeId:
          state.editingEdgeId === action.payload ? null : state.editingEdgeId,
      });
    }
    case 'UPDATE_VIEWPORT': {
      const viewport = { ...state.viewport, ...action.payload };
      return isValidViewport(viewport) ? { ...state, viewport } : state;
    }
    case 'SET_DRAGGING':
      return {
        ...state,
        isDragging: action.payload.isDragging,
      };
    case 'SET_PANNING':
      return { ...state, isPanning: action.payload };
    case 'SET_SPACE_PRESSED':
      return { ...state, isSpacePressed: action.payload };
    case 'ADD_NODE':
      return withHistory(state, { nodes: [...state.nodes, action.payload] });
    case 'REMOVE_NODE':
      return withHistory(state, removeNodesFromState(state, [action.payload]));
    case 'REMOVE_NODES':
      return withHistory(state, removeNodesFromState(state, action.payload));
    case 'REORDER_NODES': {
      const nodes = reorderNodesByLayer(
        state.nodes,
        action.payload.nodeIds,
        action.payload.operation
      );
      if (nodes === state.nodes) return state;
      return withHistory(
        state,
        { nodes },
        action.payload.recordHistory ?? true
      );
    }
    case 'START_CONNECT': {
      const { fromNodeId, fromSide } = action.payload;
      return {
        ...state,
        connecting: { fromNodeId, ...(fromSide && { fromSide }) },
      };
    }
    case 'UPDATE_CONNECT_POS':
      return state.connecting
        ? {
            ...state,
            connecting: {
              ...state.connecting,
              startWorldX: state.connecting.startWorldX ?? action.payload.x,
              startWorldY: state.connecting.startWorldY ?? action.payload.y,
              toLocalX: action.payload.x,
              toLocalY: action.payload.y,
            },
          }
        : state;
    case 'UPDATE_CONNECT_HOVER':
      return state.connecting
        ? {
            ...state,
            connecting: {
              ...state.connecting,
              hoverTargetNodeId: action.payload.hoverTargetNodeId,
              hoverToSide: action.payload.hoverToSide,
            },
          }
        : state;
    case 'CANCEL_CONNECT':
      return { ...state, connecting: null };
    case 'FINISH_CONNECT':
      return withHistory(state, {
        connecting: null,
        edges: [...state.edges, action.payload],
      });
    case 'FINISH_CONNECT_WITH_NODE':
      return withHistory(state, {
        connecting: null,
        nodes: [...state.nodes, action.payload.node],
        edges: [...state.edges, action.payload.edge],
      });
    case 'START_REWIRE': {
      const { edgeId, movingEnd, fixedNodeId, fixedSide } = action.payload;
      return {
        ...state,
        rewiring: {
          edgeId,
          movingEnd,
          fixedNodeId,
          ...(fixedSide && { fixedSide }),
        },
        editingEdgeId: null,
      };
    }
    case 'UPDATE_REWIRE_POS':
      return state.rewiring
        ? {
            ...state,
            rewiring: {
              ...state.rewiring,
              movingCurrentX: action.payload.x,
              movingCurrentY: action.payload.y,
            },
          }
        : state;
    case 'UPDATE_REWIRE_HOVER':
      return state.rewiring
        ? {
            ...state,
            rewiring: {
              ...state.rewiring,
              hoverTargetNodeId: action.payload.hoverTargetNodeId,
              hoverToSide: action.payload.hoverToSide,
            },
          }
        : state;
    case 'FINISH_REWIRE': {
      if (!state.rewiring) return { ...state, rewiring: null };
      const idx = state.edges.findIndex(e => e.id === state.rewiring!.edgeId);
      if (idx === -1) return { ...state, rewiring: null };

      // If пользователь отпустил не над якорем – удаляем ребро
      if (!state.rewiring.hoverTargetNodeId) {
        const newEdges = state.edges.filter(
          e => e.id !== state.rewiring!.edgeId
        );
        return withHistory(state, {
          rewiring: null,
          edges: newEdges,
          selectedEdgeId: null,
          editingEdgeId: null,
        });
      }

      // Иначе обновляем конец
      const edge = rewireEdge(
        state.edges[idx]!,
        state.rewiring.movingEnd,
        state.rewiring.hoverTargetNodeId,
        state.rewiring.hoverToSide
      );
      const newEdges = [...state.edges];
      newEdges[idx] = edge;
      return withHistory(state, { rewiring: null, edges: newEdges });
    }
    case 'CANCEL_REWIRE':
      return { ...state, rewiring: null };
    case 'UPDATE_NODE':
      return withHistory(
        state,
        {
          nodes: state.nodes.map(node =>
            node.id === action.payload.id
              ? { ...node, ...action.payload.updates }
              : node
          ),
        },
        action.payload.recordHistory ?? true
      );
    case 'BATCH_UPDATE_NODES': {
      if (!action.payload.patches.length) return state;
      const patches = action.payload.patches;
      return withHistory(
        state,
        {
          nodes: state.nodes.map(node => {
            const found = patches.find(p => p.id === node.id);
            return found ? { ...node, ...found.updates } : node;
          }),
        },
        action.payload.recordHistory ?? false
      );
    }
    case 'PASTE_DOCUMENT':
      return withHistory(state, {
        nodes: [...state.nodes, ...action.payload.nodes],
        edges: [...state.edges, ...action.payload.edges],
        selectedNodeIds: action.payload.selectedNodeIds,
        selectedNodeId: action.payload.selectedNodeId,
        activeNodeId: null,
        editingNodeId: null,
        selectedEdgeId: null,
        editingEdgeId: null,
        connecting: null,
        rewiring: null,
      });
    case 'UNDO': {
      const previous = state.history.past[state.history.past.length - 1];
      if (!previous) return state;
      return applySnapshot(state, previous, {
        past: state.history.past.slice(0, -1),
        future: [createSnapshot(state), ...state.history.future],
      });
    }
    case 'REDO': {
      const next = state.history.future[0];
      if (!next) return state;
      return applySnapshot(state, next, {
        past: pushHistory(
          { past: state.history.past, future: [] },
          createSnapshot(state)
        ).past,
        future: state.history.future.slice(1),
      });
    }
    case 'PUSH_HISTORY': {
      return {
        ...state,
        history: pushHistory(state.history, action.payload),
      };
    }
    case 'SELECT_NODE': {
      const selected = new Set(action.payload.nodeIds);
      return {
        ...state,
        selectedNodeId: action.payload.primaryId,
        selectedNodeIds: action.payload.nodeIds,
        activeNodeId:
          state.activeNodeId && selected.has(state.activeNodeId)
            ? state.activeNodeId
            : null,
        editingNodeId:
          state.editingNodeId && selected.has(state.editingNodeId)
            ? state.editingNodeId
            : null,
        selectedEdgeId: null,
        editingEdgeId: null,
      };
    }
    case 'SELECT_EDGE':
      return {
        ...state,
        selectedNodeId: null,
        selectedNodeIds: [],
        activeNodeId: null,
        editingNodeId: null,
        selectedEdgeId: action.payload,
        editingEdgeId: null,
      };
    case 'SET_EDITING_EDGE':
      return {
        ...state,
        editingEdgeId:
          action.payload === state.selectedEdgeId ? action.payload : null,
      };
    case 'SET_ACTIVE_NODE':
      return {
        ...state,
        activeNodeId: action.payload,
        editingNodeId:
          action.payload === null || action.payload !== state.editingNodeId
            ? null
            : state.editingNodeId,
      };
    case 'SET_EDITING_NODE':
      return {
        ...state,
        activeNodeId: action.payload ?? state.activeNodeId,
        editingNodeId: action.payload,
      };
    default:
      return state;
  }
}
