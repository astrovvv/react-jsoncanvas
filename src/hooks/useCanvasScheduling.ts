import { useCallback, useEffect, useRef } from 'react';
import type { Dispatch, MutableRefObject } from 'react';
import type { GenericNode } from '@trbn/jsoncanvas';
import type { CanvasEvents, CanvasState, ViewportState } from '../types';
import type { CanvasAction } from '../context/canvasReducer';
import { createInitialCanvasState, isValidViewport } from '../context/canvasState';

interface CanvasSchedulingResult {
  stateRef: MutableRefObject<CanvasState>;
  scheduleViewport: (viewport: Partial<ViewportState>) => void;
  scheduleNodeUpdate: (nodeId: string, updates: Partial<GenericNode>) => void;
}

export function useCanvasScheduling(
  state: CanvasState,
  dispatch: Dispatch<CanvasAction>,
  events: CanvasEvents
): CanvasSchedulingResult {
  const stateRef = useRef(state);
  const pendingViewportRef = useRef<Partial<ViewportState> | null>(null);
  const viewportRafRef = useRef<number | null>(null);
  const pendingNodeUpdatesRef = useRef<Map<string, Partial<GenericNode>> | null>(null);
  const nodeRafRef = useRef<number | null>(null);

  stateRef.current = state;

  const flushViewport = useCallback(() => {
    if (viewportRafRef.current != null) {
      cancelAnimationFrame(viewportRafRef.current);
      viewportRafRef.current = null;
    }
    const pending = pendingViewportRef.current;
    if (!pending) return;
    const appliedViewport = {
      ...(stateRef.current?.viewport ?? createInitialCanvasState().viewport),
      ...pending,
    };
    pendingViewportRef.current = null;
    if (!isValidViewport(appliedViewport)) return;
    dispatch({ type: 'UPDATE_VIEWPORT', payload: pending });
    events.onViewportChange?.(appliedViewport);
  }, [dispatch, events]);

  const scheduleViewport = useCallback((viewport: Partial<ViewportState>) => {
    pendingViewportRef.current = { ...pendingViewportRef.current, ...viewport };
    if (viewportRafRef.current == null) {
      viewportRafRef.current = requestAnimationFrame(flushViewport);
    }
  }, [flushViewport]);

  const flushNodeUpdates = useCallback(() => {
    if (nodeRafRef.current != null) {
      cancelAnimationFrame(nodeRafRef.current);
      nodeRafRef.current = null;
    }
    const pending = pendingNodeUpdatesRef.current;
    if (!pending?.size) return;
    const patches = Array.from(pending, ([id, updates]) => ({ id, updates }));
    pendingNodeUpdatesRef.current = null;
    dispatch({ type: 'BATCH_UPDATE_NODES', payload: { patches, recordHistory: false } });
    const current = stateRef.current;
    const nodes = current.nodes.map(node => {
      const patch = pending.get(node.id);
      return patch ? { ...node, ...patch } : node;
    });
    events.onCanvasChange?.(nodes, current.edges);
    patches.forEach(({ id, updates }) => {
      if (updates.x !== undefined || updates.y !== undefined) {
        events.onNodeMove?.(id, { x: updates.x ?? 0, y: updates.y ?? 0 });
      }
    });
  }, [dispatch, events]);

  const scheduleNodeUpdate = useCallback((id: string, updates: Partial<GenericNode>) => {
    pendingNodeUpdatesRef.current ??= new Map();
    const previous = pendingNodeUpdatesRef.current.get(id) ?? {};
    pendingNodeUpdatesRef.current.set(id, { ...previous, ...updates });
    if (nodeRafRef.current == null) nodeRafRef.current = requestAnimationFrame(flushNodeUpdates);
  }, [flushNodeUpdates]);

  useEffect(() => () => {
    if (viewportRafRef.current != null) {
      cancelAnimationFrame(viewportRafRef.current);
      viewportRafRef.current = null;
    }
    if (nodeRafRef.current != null) {
      cancelAnimationFrame(nodeRafRef.current);
      nodeRafRef.current = null;
    }
    pendingViewportRef.current = null;
    pendingNodeUpdatesRef.current = null;
  }, []);

  return { stateRef, scheduleViewport, scheduleNodeUpdate };
}
