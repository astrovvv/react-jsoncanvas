import { useCallback, useRef } from 'react';
import type { Dispatch, MutableRefObject } from 'react';
import type { CanvasEvents, CanvasState } from '../types';
import type { CanvasAction } from '../context/canvasReducer';
import {
  CanvasClipboardPayload,
  createClipboardPayload,
  createPasteResult,
} from '../context/canvasClipboard';

/** Keeps the editor clipboard and consecutive paste operations in one place. */
export function useCanvasClipboard(
  stateRef: MutableRefObject<CanvasState>,
  dispatch: Dispatch<CanvasAction>,
  events: CanvasEvents
) {
  const clipboardRef = useRef<CanvasClipboardPayload | null>(null);

  const copySelectedNodes = useCallback(() => {
    const current = stateRef.current;
    const payload = createClipboardPayload(
      current.nodes,
      current.edges,
      current.selectedNodeIds
    );
    if (!payload) return false;
    clipboardRef.current = payload;
    return true;
  }, [stateRef]);

  const pasteClipboardPayload = useCallback(
    (payload: CanvasClipboardPayload | null) => {
      if (!payload) return false;
      const result = createPasteResult(payload);
      if (!result) return false;
      const { pastedNodes, pastedEdges, selectedNodeIds, selectedNodeId } =
        result;
      const current = stateRef.current;
      const nodes = [...current.nodes, ...pastedNodes];
      const edges = [...current.edges, ...pastedEdges];
      clipboardRef.current = result.clipboard;

      // Keep imperative clipboard operations composable before React renders.
      stateRef.current = {
        ...current,
        nodes,
        edges,
        selectedNodeIds,
        selectedNodeId,
        activeNodeId: null,
        editingNodeId: null,
        selectedEdgeId: null,
        editingEdgeId: null,
        connecting: null,
        rewiring: null,
      };

      dispatch({
        type: 'PASTE_DOCUMENT',
        payload: {
          nodes: pastedNodes,
          edges: pastedEdges,
          selectedNodeIds,
          selectedNodeId,
        },
      });
      events.onCanvasChange?.(nodes, edges);
      events.onNodeSelect?.(selectedNodeId, selectedNodeIds);
      return true;
    },
    [dispatch, events, stateRef]
  );

  const pasteCopiedNodes = useCallback(() => {
    return pasteClipboardPayload(clipboardRef.current);
  }, [pasteClipboardPayload]);

  const duplicateSelectedNodes = useCallback(() => {
    if (!copySelectedNodes()) return false;
    return pasteClipboardPayload(clipboardRef.current);
  }, [copySelectedNodes, pasteClipboardPayload]);

  return { copySelectedNodes, pasteCopiedNodes, duplicateSelectedNodes };
}
