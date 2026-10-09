import {
  createContext,
  useReducer,
  ReactNode,
  useRef,
  useCallback,
} from 'react';
import {
  CanvasState,
  CanvasConfig,
  ViewportState,
  CanvasEvents,
  CanvasHistorySnapshot,
  NodeLayerOperation,
} from '../types';
import type { GenericNode, Edge, EdgeSide } from '@trbn/jsoncanvas';
import {
  createInitialCanvasState,
  createSnapshot,
  defaultCanvasConfig,
} from './canvasState';
import { canvasReducer } from './canvasReducer';
import { createEdgeActions } from './edgeActions';
import { useCanvasScheduling } from '../hooks/useCanvasScheduling';
import { useCanvasClipboard } from '../hooks/useCanvasClipboard';
import {
  useViewportAnimation,
  ViewportAnimationContext,
} from '../hooks/useViewportAnimation';
import { reorderNodesByLayer } from '../utils/canvasLayers';

export { canvasReducer } from './canvasReducer';

export { createInitialCanvasState } from './canvasState';

export interface CanvasContextType {
  state: CanvasState;
  config: CanvasConfig;
  events: CanvasEvents;
  updateNodes: (nodes: GenericNode[]) => void;
  updateEdges: (edges: Edge[]) => void;
  updateEdge: (edgeId: string, updates: Partial<Edge>) => void;
  removeEdge: (edgeId: string) => void;
  updateViewport: (viewport: Partial<ViewportState>) => void;
  setDragging: (isDragging: boolean, nodeId?: string) => void;
  setPanning: (isPanning: boolean) => void;
  setSpacePressed: (isPressed: boolean) => void;
  addNode: (node: GenericNode) => void;
  removeNode: (nodeId: string) => void;
  updateNode: (
    nodeId: string,
    updates: Partial<GenericNode>,
    options?: { recordHistory?: boolean }
  ) => void;
  selectNode: (
    nodeId: string | null,
    options?: { append?: boolean; toggle?: boolean }
  ) => void;
  selectNodes: (nodeIds: string[], primaryId?: string | null) => void;
  clearSelection: () => void;
  selectEdge: (edgeId: string | null) => void;
  setEditingEdge: (edgeId: string | null) => void;
  setActiveNode: (nodeId: string | null) => void;
  setEditingNode: (nodeId: string | null) => void;
  removeNodes: (nodeIds: string[]) => void;
  removeSelectedNodes: () => void;
  getNodeById: (id: string) => GenericNode | undefined;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  copySelectedNodes: () => boolean;
  pasteCopiedNodes: () => boolean;
  duplicateSelectedNodes: () => boolean;
  reorderNodes: (
    nodeIds: string[],
    operation: NodeLayerOperation,
    options?: { recordHistory?: boolean }
  ) => boolean;
  bringNodesToFront: (
    nodeIds: string[],
    options?: { recordHistory?: boolean }
  ) => boolean;
  bringNodesForward: (
    nodeIds: string[],
    options?: { recordHistory?: boolean }
  ) => boolean;
  sendNodesBackward: (
    nodeIds: string[],
    options?: { recordHistory?: boolean }
  ) => boolean;
  sendNodesToBack: (
    nodeIds: string[],
    options?: { recordHistory?: boolean }
  ) => boolean;
  beginHistoryEntry: () => CanvasHistorySnapshot;
  commitHistoryEntry: (snapshot: CanvasHistorySnapshot) => void;
  startConnect: (fromNodeId: string, fromSide?: EdgeSide) => void;
  updateConnectPosition: (x: number, y: number) => void;
  updateConnectHover: (
    hoverTargetNodeId?: string | undefined,
    hoverToSide?: EdgeSide | undefined
  ) => void;
  cancelConnect: () => void;
  finishConnect: (edge: Edge) => void;
  finishConnectWithNode: (node: GenericNode, edge: Edge) => void;
  // shared container ref for viewport so multiple hooks see same element
  containerRef: React.RefObject<HTMLDivElement>;
  edgeHitTestRef: React.MutableRefObject<
    ((clientX: number, clientY: number) => string | null) | null
  >;
  // edge rewiring API
  startRewire: (edgeId: string, movingEnd: 'from' | 'to') => void;
  updateRewirePosition: (x: number, y: number) => void;
  updateRewireHover: (
    hoverTargetNodeId?: string,
    hoverToSide?: EdgeSide
  ) => void;
  finishRewire: () => void;
  cancelRewire: () => void;
  scheduleNodeUpdate: (nodeId: string, updates: Partial<GenericNode>) => void;
}

export const CanvasContext = createContext<CanvasContextType | undefined>(undefined);

interface CanvasProviderProps {
  children: ReactNode;
  initialNodes?: GenericNode[];
  initialEdges?: Edge[];
  config?: Partial<CanvasConfig>;
  events?: CanvasEvents;
}

export function CanvasProvider({
  children,
  initialNodes = [],
  initialEdges = [],
  config = {},
  events = {},
}: CanvasProviderProps) {
  const [state, dispatch] = useReducer(
    canvasReducer,
    createInitialCanvasState(initialNodes, initialEdges)
  );

  const mergedConfig = { ...defaultCanvasConfig, ...config };

  const containerRef = useRef<HTMLDivElement>(null);
  const edgeHitTestRef = useRef<
    ((clientX: number, clientY: number) => string | null) | null
  >(null);
  const nodesMapRef = useRef<Map<string, GenericNode>>(new Map());
  nodesMapRef.current = new Map(state.nodes.map(node => [node.id, node]));

  const { stateRef, scheduleViewport, scheduleNodeUpdate } =
    useCanvasScheduling(state, dispatch, events);
  const viewportAnimation = useViewportAnimation(
    state.viewport,
    scheduleViewport
  );
  const { copySelectedNodes, pasteCopiedNodes, duplicateSelectedNodes } =
    useCanvasClipboard(stateRef, dispatch, events);

  const applySelection = useCallback(
    (nodeIds: string[], primaryId: string | null) => {
      const uniqueIds = Array.from(new Set(nodeIds));
      dispatch({
        type: 'SELECT_NODE',
        payload: { nodeIds: uniqueIds, primaryId },
      });
      events.onNodeSelect?.(primaryId, uniqueIds);
    },
    [dispatch, events]
  );

  const selectNodes = useCallback(
    (nodeIds: string[], primaryId?: string | null) => {
      const uniqueIds = Array.from(new Set(nodeIds));
      const resolvedPrimary =
        primaryId !== undefined
          ? primaryId
          : uniqueIds.length
            ? uniqueIds[uniqueIds.length - 1]
            : null;
      applySelection(uniqueIds, resolvedPrimary ?? null);
    },
    [applySelection]
  );

  const selectNode = useCallback(
    (
      nodeId: string | null,
      options?: { append?: boolean; toggle?: boolean }
    ) => {
      if (nodeId == null) {
        applySelection([], null);
        return;
      }

      const { append = false, toggle = false } = options || {};
      const current = state.selectedNodeIds;

      if (toggle) {
        const exists = current.includes(nodeId);
        const next = exists
          ? current.filter(id => id !== nodeId)
          : [...current, nodeId];
        const nextPrimary = exists
          ? next.length
            ? next[next.length - 1]!
            : null
          : nodeId;
        applySelection(next, nextPrimary);
        return;
      }

      if (append) {
        const withoutTarget = current.filter(id => id !== nodeId);
        const next = [...withoutTarget, nodeId];
        applySelection(next, nodeId);
        return;
      }

      applySelection([nodeId], nodeId);
    },
    [applySelection, state.selectedNodeIds]
  );

  const clearSelection = useCallback(() => {
    applySelection([], null);
  }, [applySelection]);

  const setActiveNode = useCallback((nodeId: string | null) => {
    dispatch({ type: 'SET_ACTIVE_NODE', payload: nodeId });
  }, []);

  const setEditingNode = useCallback((nodeId: string | null) => {
    dispatch({ type: 'SET_EDITING_NODE', payload: nodeId });
  }, []);

  const removeNodes = useCallback(
    (nodeIds: string[]) => {
      const uniqueIds = Array.from(new Set(nodeIds));
      if (!uniqueIds.length) return;

      dispatch({ type: 'REMOVE_NODES', payload: uniqueIds });

      const toRemove = new Set(uniqueIds);
      const newNodes = state.nodes.filter(node => !toRemove.has(node.id));
      const newEdges = state.edges.filter(
        edge => !toRemove.has(edge.fromNode) && !toRemove.has(edge.toNode)
      );
      const remainingSelectedIds = state.selectedNodeIds.filter(
        id => !toRemove.has(id)
      );
      const nextPrimary = remainingSelectedIds.length
        ? remainingSelectedIds[remainingSelectedIds.length - 1]!
        : null;

      events.onCanvasChange?.(newNodes, newEdges);
      events.onNodeSelect?.(nextPrimary, remainingSelectedIds);
    },
    [dispatch, events, state.edges, state.nodes, state.selectedNodeIds]
  );

  const removeSelectedNodes = useCallback(() => {
    if (!state.selectedNodeIds.length) return;
    removeNodes(state.selectedNodeIds);
  }, [removeNodes, state.selectedNodeIds]);

  const beginHistoryEntry = useCallback(() => {
    return createSnapshot(stateRef.current || state);
  }, [state, stateRef]);

  const commitHistoryEntry = useCallback(
    (snapshot: CanvasHistorySnapshot) => {
      dispatch({ type: 'PUSH_HISTORY', payload: snapshot });
    },
    [dispatch]
  );

  const undo = useCallback(() => {
    const previous = state.history.past[state.history.past.length - 1];
    if (!previous) return;
    dispatch({ type: 'UNDO' });
    events.onCanvasChange?.(previous.nodes, previous.edges);
    events.onNodeSelect?.(previous.selectedNodeId, previous.selectedNodeIds);
  }, [events, state.history.past]);

  const redo = useCallback(() => {
    const next = state.history.future[0];
    if (!next) return;
    dispatch({ type: 'REDO' });
    events.onCanvasChange?.(next.nodes, next.edges);
    events.onNodeSelect?.(next.selectedNodeId, next.selectedNodeIds);
  }, [events, state.history.future]);

  const reorderNodes = useCallback(
    (
      nodeIds: string[],
      operation: NodeLayerOperation,
      options?: { recordHistory?: boolean }
    ) => {
      const current = stateRef.current;
      const nodes = reorderNodesByLayer(current.nodes, nodeIds, operation);
      if (nodes === current.nodes) return false;

      stateRef.current = { ...current, nodes };
      const payload: {
        nodeIds: string[];
        operation: NodeLayerOperation;
        recordHistory?: boolean;
      } = { nodeIds, operation };
      if (options?.recordHistory !== undefined) {
        payload.recordHistory = options.recordHistory;
      }
      dispatch({ type: 'REORDER_NODES', payload });
      events.onCanvasChange?.(nodes, current.edges);
      return true;
    },
    [events, stateRef]
  );

  const bringNodesToFront = useCallback(
    (nodeIds: string[], options?: { recordHistory?: boolean }) =>
      reorderNodes(nodeIds, 'bring-to-front', options),
    [reorderNodes]
  );

  const bringNodesForward = useCallback(
    (nodeIds: string[], options?: { recordHistory?: boolean }) =>
      reorderNodes(nodeIds, 'bring-forward', options),
    [reorderNodes]
  );

  const sendNodesBackward = useCallback(
    (nodeIds: string[], options?: { recordHistory?: boolean }) =>
      reorderNodes(nodeIds, 'send-backward', options),
    [reorderNodes]
  );

  const sendNodesToBack = useCallback(
    (nodeIds: string[], options?: { recordHistory?: boolean }) =>
      reorderNodes(nodeIds, 'send-to-back', options),
    [reorderNodes]
  );

  const edgeActions = createEdgeActions({ state, stateRef, dispatch, events });

  const contextValue: CanvasContextType = {
    state,
    config: mergedConfig,
    events,
    updateNodes: (nodes: GenericNode[]) => {
      dispatch({ type: 'UPDATE_NODES', payload: nodes });
      events.onCanvasChange?.(nodes, state.edges);
    },
    updateEdges: (edges: Edge[]) => {
      dispatch({ type: 'UPDATE_EDGES', payload: edges });
      events.onCanvasChange?.(state.nodes, edges);
    },
    ...edgeActions,
    // schedule viewport updates (batched via requestAnimationFrame)
    updateViewport: viewportAnimation.updateViewport,
    setDragging: (isDragging: boolean, nodeId?: string) =>
      dispatch({ type: 'SET_DRAGGING', payload: { isDragging, nodeId } }),
    setPanning: (isPanning: boolean) => {
      if (isPanning) viewportAnimation.updateViewport(stateRef.current.viewport);
      dispatch({ type: 'SET_PANNING', payload: isPanning });
    },
    setSpacePressed: (isPressed: boolean) =>
      dispatch({ type: 'SET_SPACE_PRESSED', payload: isPressed }),
    addNode: (node: GenericNode) => {
      dispatch({ type: 'ADD_NODE', payload: node });
      events.onCanvasChange?.([...state.nodes, node], state.edges);
    },
    removeNode: (nodeId: string) => {
      removeNodes([nodeId]);
    },
    removeNodes,
    removeSelectedNodes,
    getNodeById: id => nodesMapRef.current.get(id),
    undo,
    redo,
    canUndo: state.history.past.length > 0,
    canRedo: state.history.future.length > 0,
    copySelectedNodes,
    pasteCopiedNodes,
    duplicateSelectedNodes,
    reorderNodes,
    bringNodesToFront,
    bringNodesForward,
    sendNodesBackward,
    sendNodesToBack,
    beginHistoryEntry,
    commitHistoryEntry,
    updateNode: (
      id: string,
      updates: Partial<GenericNode>,
      options?: { recordHistory?: boolean }
    ) => {
      const payload: {
        id: string;
        updates: Partial<GenericNode>;
        recordHistory?: boolean;
      } = { id, updates };
      if (options?.recordHistory !== undefined) {
        payload.recordHistory = options.recordHistory;
      }
      const current = stateRef.current;
      const newNodes = current.nodes.map(node =>
        node.id === id ? { ...node, ...updates } : node
      );
      stateRef.current = { ...current, nodes: newNodes };
      dispatch({
        type: 'UPDATE_NODE',
        payload,
      });
      events.onCanvasChange?.(newNodes, current.edges);
      if (updates.x !== undefined || updates.y !== undefined) {
        events.onNodeMove?.(id, { x: updates.x ?? 0, y: updates.y ?? 0 });
      }
    },
    selectNode,
    selectNodes,
    clearSelection,
    setActiveNode,
    setEditingNode,
    containerRef,
    edgeHitTestRef,
    scheduleNodeUpdate,
  };

  return (
    <CanvasContext.Provider value={contextValue}>
      <ViewportAnimationContext.Provider value={viewportAnimation}>
        {children}
      </ViewportAnimationContext.Provider>
    </CanvasContext.Provider>
  );
}
