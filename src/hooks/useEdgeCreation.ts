import { useEffect } from 'react';
import type { EdgeSide } from '@trbn/jsoncanvas';
import { useCanvas } from './useCanvas';
import { screenToWorld, getContainerCoordinates } from '../utils/geometry';
import {
  createEdgeId,
  getConnectDropEvent,
  getEdgeDropTarget,
} from '../utils/edgeInteraction';

// Hook that manages interactive edge creation (drag from node anchor to target)
export function useEdgeCreation() {
  const {
    startConnect,
    updateConnectPosition,
    cancelConnect,
    finishConnect,
    finishConnectWithNode,
    updateConnectHover,
    updateRewirePosition,
    updateRewireHover,
    finishRewire,
    state,
    events,
    containerRef,
  } = useCanvas();

  useEffect(() => {
    if (!state.connecting && !state.rewiring) return;

    const onMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();

      // Convert screen coordinates to container-local coordinates
      const screenCoords = getContainerCoordinates(e, rect);

      // Convert to world coordinates used by nodes/edges
      const worldCoords = screenToWorld(
        screenCoords.x,
        screenCoords.y,
        state.viewport
      );

      if (state.connecting) {
        updateConnectPosition(worldCoords.x, worldCoords.y);
      } else if (state.rewiring) {
        updateRewirePosition(worldCoords.x, worldCoords.y);
      }

      // hover hit-test for snapping preview
      const skipNodeId = state.connecting
        ? state.connecting.fromNodeId
        : state.rewiring
          ? state.rewiring.fixedNodeId
          : undefined;
      const dropTarget = getEdgeDropTarget(
        container,
        { x: e.clientX, y: e.clientY },
        skipNodeId
      );
      if (state.connecting)
        updateConnectHover(dropTarget.nodeId, dropTarget.side);
      if (state.rewiring) updateRewireHover(dropTarget.nodeId, dropTarget.side);
    };

    const onMouseUp = (event: MouseEvent) => {
      if (state.connecting) {
        const container = containerRef.current;
        if (!container) {
          cancelConnect();
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
          return;
        }
        const rect = container.getBoundingClientRect();
        const screenPosition = getContainerCoordinates(event, rect);
        const position = screenToWorld(
          screenPosition.x,
          screenPosition.y,
          state.viewport
        );
        const dropTarget = getEdgeDropTarget(
          container,
          { x: event.clientX, y: event.clientY }
        );
        const documentIds = [
          ...state.nodes.map(node => node.id),
          ...state.edges.map(edge => edge.id),
        ];
        if (
          dropTarget.nodeId &&
          dropTarget.nodeId !== state.connecting.fromNodeId
        ) {
          const edge = {
            id: createEdgeId(documentIds),
            fromNode: state.connecting.fromNodeId,
            toNode: dropTarget.nodeId,
            toEnd: 'arrow',
            ...(state.connecting.fromSide && {
              fromSide: state.connecting.fromSide,
            }),
            ...(dropTarget.side && {
              toSide: dropTarget.side,
            }),
          } as const;
          finishConnect(edge);
        } else if (dropTarget.nodeId === state.connecting.fromNodeId) {
          cancelConnect();
        } else {
          const connectDrop = getConnectDropEvent(
            state.connecting,
            position,
            state.viewport.scale
          );

          if (connectDrop) {
            const node = events.onConnectDrop?.(connectDrop);
            if (node) {
              finishConnectWithNode(node, {
                id: createEdgeId([...documentIds, node.id]),
                fromNode: connectDrop.fromNodeId,
                fromSide: connectDrop.fromSide,
                toNode: node.id,
                toSide: connectDrop.toSide,
                toEnd: 'arrow',
              });
            } else {
              cancelConnect();
            }
          } else {
            cancelConnect();
          }
        }
      } else if (state.rewiring) {
        finishRewire();
      }
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [
    state.connecting,
    state.edges,
    state.nodes,
    state.rewiring,
    state.viewport,
    events,
    containerRef,
    updateConnectPosition,
    cancelConnect,
    finishConnect,
    finishConnectWithNode,
    updateConnectHover,
    updateRewirePosition,
    updateRewireHover,
    finishRewire,
  ]);

  return {
    startConnect: (fromNodeId: string, fromSide?: EdgeSide) =>
      startConnect(fromNodeId, fromSide),
    cancelConnect,
  };
}
