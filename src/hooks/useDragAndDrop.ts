import { useCallback, useRef } from 'react';
import { useCanvas } from './useCanvas';
import { Point } from '../types';
import { MOUSE_BUTTON } from '../constants';
import { snapToGrid } from '../utils/geometry';

export function useDragAndDrop() {
  const {
    state,
    config,
    updateNode,
    scheduleNodeUpdate,
    setDragging,
    selectNode,
    selectNodes,
    bringNodesToFront,
    beginHistoryEntry,
    commitHistoryEntry,
  } = useCanvas();
  const dragStateRef = useRef({
    startX: 0,
    startY: 0,
    nodeIds: [] as string[],
    initialPositions: new Map<string, Point>(),
    historySnapshot: null as ReturnType<typeof beginHistoryEntry> | null,
    moved: false,
  });

  const applyNodeUpdate = useCallback(
    (nodeId: string, updates: Partial<Point>) => {
      // While actively dragging, prefer immediate updates so edges re-render
      // in the same React update cycle and stay visually in sync. When not
      // dragging, use scheduled (batched) updates for performance.
      if (dragStateRef.current.moved) {
        updateNode(nodeId, updates, { recordHistory: false });
      } else if (scheduleNodeUpdate) {
        scheduleNodeUpdate(nodeId, updates);
      } else {
        updateNode(nodeId, updates);
      }
    },
    [scheduleNodeUpdate, updateNode]
  );

  const startDrag = useCallback(
    (
      nodeId: string,
      clientX: number,
      clientY: number,
      nodePosition: Point,
      button?: number,
      selectedIdsOverride?: string[]
    ) => {
      // Only allow left mouse button for dragging
      if (button !== undefined && button !== MOUSE_BUTTON.LEFT) return false;

      const nodesToDrag =
        selectedIdsOverride && selectedIdsOverride.length
          ? selectedIdsOverride
          : state.selectedNodeIds.length
            ? state.selectedNodeIds
            : [nodeId];

      const initialPositions = new Map<string, Point>();
      const nodesLookup = new Map(state.nodes.map(n => [n.id, n] as const));
      nodesToDrag.forEach(id => {
        if (id === nodeId) {
          initialPositions.set(id, { ...nodePosition });
          return;
        }
        const found = nodesLookup.get(id);
        if (found) {
          initialPositions.set(id, { x: found.x, y: found.y });
        }
      });
      if (!initialPositions.has(nodeId)) {
        initialPositions.set(nodeId, { ...nodePosition });
      }

      dragStateRef.current = {
        startX: clientX,
        startY: clientY,
        nodeIds: Array.from(initialPositions.keys()),
        initialPositions,
        historySnapshot: beginHistoryEntry(),
        moved: false,
      };

      return true;
    },
    [beginHistoryEntry, state.selectedNodeIds, state.nodes]
  );

  const updateDrag = useCallback(
    (clientX: number, clientY: number) => {
      if (dragStateRef.current.nodeIds.length === 0)
        return;

      const dx = (clientX - dragStateRef.current.startX) / state.viewport.scale;
      const dy = (clientY - dragStateRef.current.startY) / state.viewport.scale;
      if (!dragStateRef.current.moved && (dx !== 0 || dy !== 0)) {
        dragStateRef.current.moved = true;
        setDragging(true, dragStateRef.current.nodeIds[0]);
        bringNodesToFront(dragStateRef.current.nodeIds, {
          recordHistory: false,
        });
      }

      dragStateRef.current.nodeIds.forEach(id => {
        const initial = dragStateRef.current.initialPositions.get(id);
        if (!initial) return;
        let newX = initial.x + dx;
        let newY = initial.y + dy;

        if (config.snapToGrid) {
          newX = snapToGrid(newX, config.gridSize);
          newY = snapToGrid(newY, config.gridSize);
        }

        applyNodeUpdate(id, { x: newX, y: newY });
      });
    },
    [
      applyNodeUpdate,
      bringNodesToFront,
      config.gridSize,
      config.snapToGrid,
      setDragging,
      state.viewport.scale,
    ]
  );

  const stopDrag = useCallback(() => {
    if (dragStateRef.current.nodeIds.length) {
      if (dragStateRef.current.moved && dragStateRef.current.historySnapshot) {
        commitHistoryEntry(dragStateRef.current.historySnapshot);
      }
      if (dragStateRef.current.moved) setDragging(false);
      dragStateRef.current = {
        startX: 0,
        startY: 0,
        nodeIds: [],
        initialPositions: new Map(),
        historySnapshot: null,
        moved: false,
      };
    }
  }, [commitHistoryEntry, setDragging]);

  const handleMouseDown = useCallback(
    (nodeId: string, e: React.MouseEvent, nodePosition: Point) => {
      // Only allow left mouse button for dragging
      if (e.button !== MOUSE_BUTTON.LEFT) return false;
      e.preventDefault();
      e.stopPropagation();
      const isMultiSelect = e.ctrlKey || e.metaKey;
      let targetSelection = state.selectedNodeIds;

      if (isMultiSelect) {
        const exists = state.selectedNodeIds.includes(nodeId);
        const next = exists
          ? state.selectedNodeIds.filter(id => id !== nodeId)
          : [...state.selectedNodeIds, nodeId];
        targetSelection = next;
        if (exists) {
          const nextPrimary = next.length ? next[next.length - 1] : null;
          selectNodes(next, nextPrimary);
        } else {
          selectNodes(next, nodeId);
        }
      } else if (!state.selectedNodeIds.includes(nodeId)) {
        targetSelection = [nodeId];
        selectNode(nodeId);
      }

      if (!targetSelection.includes(nodeId)) {
        return false;
      }

      return startDrag(
        nodeId,
        e.clientX,
        e.clientY,
        nodePosition,
        e.button,
        targetSelection
      );
    },
    [selectNode, selectNodes, startDrag, state.selectedNodeIds]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (dragStateRef.current.nodeIds.length) {
        updateDrag(e.clientX, e.clientY);
        if (dragStateRef.current.moved) e.preventDefault();
      }
    },
    [updateDrag]
  );

  const handleMouseUp = useCallback(() => {
    stopDrag();
  }, [stopDrag]);

  return {
    isDragging: state.isDragging,
    selectedNodeId: state.selectedNodeId,
    selectedNodeIds: state.selectedNodeIds,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    startDrag,
    updateDrag,
    stopDrag,
  };
}
