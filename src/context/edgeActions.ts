import type { Dispatch, MutableRefObject } from 'react';
import type { Edge, EdgeSide, GenericNode } from '@trbn/jsoncanvas';
import type { CanvasEvents, CanvasState } from '../types';
import type { CanvasAction } from './canvasReducer';
import { rewireEdge } from './canvasState';

interface EdgeActionDependencies {
  state: CanvasState;
  stateRef: MutableRefObject<CanvasState>;
  dispatch: Dispatch<CanvasAction>;
  events: CanvasEvents;
}

/** Coordinates edge interactions, keeping reducer updates and callbacks together. */
export function createEdgeActions({
  state,
  stateRef,
  dispatch,
  events,
}: EdgeActionDependencies) {
  return {
    updateEdge(id: string, updates: Partial<Edge>) {
      const current = stateRef.current;
      if (!current.edges.some(edge => edge.id === id)) return;
      const edges = current.edges.map(edge =>
        edge.id === id ? { ...edge, ...updates } : edge
      );
      stateRef.current = { ...current, edges };
      dispatch({ type: 'UPDATE_EDGE', payload: { id, updates } });
      events.onCanvasChange?.(current.nodes, edges);
    },
    removeEdge(id: string) {
      const current = stateRef.current;
      if (!current.edges.some(edge => edge.id === id)) return;
      const edges = current.edges.filter(edge => edge.id !== id);
      stateRef.current = {
        ...current,
        edges,
        selectedEdgeId:
          current.selectedEdgeId === id ? null : current.selectedEdgeId,
        editingEdgeId:
          current.editingEdgeId === id ? null : current.editingEdgeId,
      };
      dispatch({ type: 'REMOVE_EDGE', payload: id });
      events.onCanvasChange?.(current.nodes, edges);
    },
    selectEdge(edgeId: string | null) {
      dispatch({ type: 'SELECT_EDGE', payload: edgeId });
      events.onNodeSelect?.(null, []);
    },
    setEditingEdge(edgeId: string | null) {
      dispatch({ type: 'SET_EDITING_EDGE', payload: edgeId });
    },
    startConnect(fromNodeId: string, fromSide?: EdgeSide) {
      const payload: { fromNodeId: string; fromSide?: EdgeSide } = {
        fromNodeId,
      };
      if (fromSide) payload.fromSide = fromSide;
      dispatch({ type: 'START_CONNECT', payload });
    },
    updateConnectPosition(x: number, y: number) {
      dispatch({ type: 'UPDATE_CONNECT_POS', payload: { x, y } });
    },
    updateConnectHover(hoverTargetNodeId?: string, hoverToSide?: EdgeSide) {
      dispatch({
        type: 'UPDATE_CONNECT_HOVER',
        payload: { hoverTargetNodeId, hoverToSide },
      });
    },
    cancelConnect() {
      dispatch({ type: 'CANCEL_CONNECT' });
    },
    finishConnect(edge: Edge) {
      dispatch({ type: 'FINISH_CONNECT', payload: edge });
      events.onEdgeCreate?.(edge);
      events.onCanvasChange?.(state.nodes, [...state.edges, edge]);
    },
    finishConnectWithNode(node: GenericNode, edge: Edge) {
      const current = stateRef.current;
      const existingIds = new Set([
        ...current.nodes.map(item => item.id),
        ...current.edges.map(item => item.id),
      ]);
      if (
        existingIds.has(node.id) ||
        existingIds.has(edge.id) ||
        node.id === edge.id
      ) {
        dispatch({ type: 'CANCEL_CONNECT' });
        return;
      }

      const nodes = [...current.nodes, node];
      const edges = [...current.edges, edge];
      stateRef.current = { ...current, nodes, edges, connecting: null };
      dispatch({ type: 'FINISH_CONNECT_WITH_NODE', payload: { node, edge } });
      events.onEdgeCreate?.(edge);
      events.onCanvasChange?.(nodes, edges);
    },
    startRewire(edgeId: string, movingEnd: 'from' | 'to') {
      const current = stateRef.current;
      const edge = current.edges.find(item => item.id === edgeId);
      if (!edge) return;
      const fixedNodeId = movingEnd === 'from' ? edge.toNode : edge.fromNode;
      const fixedSide = movingEnd === 'from' ? edge.toSide : edge.fromSide;
      const payload: {
        edgeId: string;
        movingEnd: 'from' | 'to';
        fixedNodeId: string;
        fixedSide?: EdgeSide;
      } = { edgeId, movingEnd, fixedNodeId };
      if (fixedSide) payload.fixedSide = fixedSide;
      stateRef.current = { ...current, rewiring: payload, editingEdgeId: null };
      dispatch({ type: 'START_REWIRE', payload });
    },
    updateRewirePosition(x: number, y: number) {
      const current = stateRef.current;
      if (current.rewiring) {
        stateRef.current = {
          ...current,
          rewiring: {
            ...current.rewiring,
            movingCurrentX: x,
            movingCurrentY: y,
          },
        };
      }
      dispatch({ type: 'UPDATE_REWIRE_POS', payload: { x, y } });
    },
    updateRewireHover(hoverTargetNodeId?: string, hoverToSide?: EdgeSide) {
      const current = stateRef.current;
      if (current.rewiring) {
        stateRef.current = {
          ...current,
          rewiring: { ...current.rewiring, hoverTargetNodeId, hoverToSide },
        };
      }
      dispatch({
        type: 'UPDATE_REWIRE_HOVER',
        payload: { hoverTargetNodeId, hoverToSide },
      });
    },
    finishRewire() {
      const current = stateRef.current;
      const rewiring = current.rewiring;
      if (!rewiring) return;
      let newEdges = [...current.edges];
      const index = newEdges.findIndex(edge => edge.id === rewiring.edgeId);
      if (index !== -1) {
        if (!rewiring.hoverTargetNodeId) {
          newEdges = newEdges.filter(edge => edge.id !== rewiring.edgeId);
        } else {
          newEdges[index] = rewireEdge(
            newEdges[index]!,
            rewiring.movingEnd,
            rewiring.hoverTargetNodeId,
            rewiring.hoverToSide
          );
        }
      }
      stateRef.current = {
        ...current,
        edges: newEdges,
        rewiring: null,
        selectedEdgeId: rewiring.hoverTargetNodeId
          ? current.selectedEdgeId
          : null,
        editingEdgeId: null,
      };
      dispatch({ type: 'FINISH_REWIRE' });
      events.onCanvasChange?.(current.nodes, newEdges);
    },
    cancelRewire() {
      dispatch({ type: 'CANCEL_REWIRE' });
    },
  };
}
