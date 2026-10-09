import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Edge as EdgeType } from '@trbn/jsoncanvas';
import { Edge } from '../Edges/Edge';
import { useCanvas } from '../../hooks/useCanvas';
import {
  getNodeEdgeGeometry,
  getAnchorPointFromNode,
  getContainerCoordinates,
  screenToWorld,
} from '../../utils/geometry';
import { useVisibleEdgeIds } from '../../hooks/useVisibleEdgeIds';
import type { Point } from '../../types';
import { orderEdgesByNodeLayer } from '../../utils/canvasLayers';
import { useEdgeVisualMetrics } from '../../hooks/useEdgeVisualMetrics';
import { EdgeVisual } from '../Edges/EdgeVisual';
import { resolveEdgeColor } from '../Edges/edgeColors';
import { createEdgeHitIndex } from '../../utils/edgeHitTesting';
import {
  getEdgeDropTarget,
  hasExceededEdgeDragThreshold,
} from '../../utils/edgeInteraction';

interface EdgesLayerProps {
  edges: EdgeType[];
  className?: string;
}

export function EdgesLayer({ edges, className = '' }: EdgesLayerProps) {
  const canvas = useCanvas();
  const canvasRef = useRef(canvas);
  canvasRef.current = canvas;
  const cleanupPendingGesture = useRef<(() => void) | null>(null);
  useEffect(() => () => cleanupPendingGesture.current?.(), []);
  const { state, config, getNodeById, containerRef, edgeHitTestRef } = canvas;
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const visualMetrics = useEdgeVisualMetrics(state.viewport.scale);

  // determine visible edges synchronously from viewport
  const visibleEdges = useVisibleEdgeIds(
    edges,
    getNodeById,
    state.viewport,
    containerRef,
    400
  );
  const orderedEdges = useMemo(() => {
    const ordered = orderEdgesByNodeLayer(
      edges,
      state.nodes,
      state.selectedNodeIds
    );
    const selectedEdge = ordered.find(edge => edge.id === state.selectedEdgeId);
    return selectedEdge
      ? [...ordered.filter(edge => edge.id !== selectedEdge.id), selectedEdge]
      : ordered;
  }, [edges, state.nodes, state.selectedEdgeId, state.selectedNodeIds]);
  const visibleOrderedEdges = useMemo(
    () =>
      orderedEdges.filter(edge => {
        if (state.rewiring?.edgeId === edge.id) return false;
        const connectedToSelected =
          state.selectedNodeIds.includes(edge.fromNode) ||
          state.selectedNodeIds.includes(edge.toNode);
        return (
          edge.id === state.selectedEdgeId ||
          connectedToSelected ||
          visibleEdges.has(edge.id)
        );
      }),
    [
      orderedEdges,
      state.rewiring?.edgeId,
      state.selectedEdgeId,
      state.selectedNodeIds,
      visibleEdges,
    ]
  );
  const edgeHitIndex = useMemo(
    () =>
      createEdgeHitIndex(
        visibleOrderedEdges.flatMap(edge => {
          const fromNode = getNodeById(edge.fromNode);
          const toNode = getNodeById(edge.toNode);
          if (!fromNode || !toNode) return [];
          const geometry = getNodeEdgeGeometry(
            edge,
            fromNode,
            toNode,
            config.curveTightness,
            visualMetrics
          );
          return [
            {
              id: edge.id,
              curve: geometry.hoverCurve,
              hitWidth: geometry.hoverStrokeWidth,
            },
          ];
        })
      ),
    [config.curveTightness, getNodeById, visibleOrderedEdges, visualMetrics]
  );
  const hitTestClientPoint = useCallback(
    (clientX: number, clientY: number) => {
      const container = containerRef.current;
      if (!container) return null;
      const rect = container.getBoundingClientRect();
      const local = { x: clientX - rect.left, y: clientY - rect.top };
      return edgeHitIndex.hitTest(
        screenToWorld(local.x, local.y, state.viewport)
      );
    },
    [containerRef, edgeHitIndex, state.viewport]
  );
  useEffect(() => {
    edgeHitTestRef.current = hitTestClientPoint;
    return () => {
      if (edgeHitTestRef.current === hitTestClientPoint) {
        edgeHitTestRef.current = null;
      }
    };
  }, [edgeHitTestRef, hitTestClientPoint]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isBlockedTarget = (target: EventTarget | null) =>
      target instanceof Element &&
      !!target.closest(
        '.react-jsoncanvas-node, .react-jsoncanvas-edge-editor, button, input, [contenteditable="true"]'
      );

    const onMouseMove = (event: MouseEvent) => {
      const nextId =
        state.connecting || state.rewiring || isBlockedTarget(event.target)
          ? null
          : hitTestClientPoint(event.clientX, event.clientY);
      setHoveredEdgeId(current => (current === nextId ? current : nextId));
    };

    const onMouseLeave = () => setHoveredEdgeId(null);

    const onMouseDown = (event: MouseEvent) => {
      if (event.button !== 0 || isBlockedTarget(event.target)) return;
      const edgeId = hitTestClientPoint(event.clientX, event.clientY);
      if (!edgeId) return;
      const edge = state.edges.find(item => item.id === edgeId);
      const fromNode = edge ? getNodeById(edge.fromNode) : undefined;
      const toNode = edge ? getNodeById(edge.toNode) : undefined;
      if (!edge || !fromNode || !toNode) return;

      event.preventDefault();
      event.stopPropagation();
      const fromPoint = getAnchorPointFromNode(fromNode, edge.fromSide);
      const toPoint = getAnchorPointFromNode(toNode, edge.toSide);
      const rect = container.getBoundingClientRect();
      const local = getContainerCoordinates(event, rect);
      const world = screenToWorld(local.x, local.y, state.viewport);
      const movingEnd: 'from' | 'to' =
        Math.hypot(world.x - fromPoint.x, world.y - fromPoint.y) <
        Math.hypot(world.x - toPoint.x, world.y - toPoint.y)
          ? 'from'
          : 'to';
      const start = { x: event.clientX, y: event.clientY };
      cleanupPendingGesture.current?.();

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (
          !hasExceededEdgeDragThreshold(start, {
            x: moveEvent.clientX,
            y: moveEvent.clientY,
          })
        ) {
          return;
        }
        cleanupPendingGesture.current?.();
        const current = canvasRef.current;
        if (!current.state.edges.some(item => item.id === edge.id)) return;
        current.startRewire(edge.id, movingEnd);
        const currentScreen = getContainerCoordinates(
          moveEvent,
          container.getBoundingClientRect()
        );
        const currentWorld = screenToWorld(
          currentScreen.x,
          currentScreen.y,
          current.state.viewport
        );
        const fixedNodeId = movingEnd === 'from' ? edge.toNode : edge.fromNode;
        const dropTarget = getEdgeDropTarget(
          container,
          { x: moveEvent.clientX, y: moveEvent.clientY },
          fixedNodeId
        );
        current.updateRewirePosition(currentWorld.x, currentWorld.y);
        current.updateRewireHover(dropTarget.nodeId, dropTarget.side);
      };
      const handleMouseUp = () => {
        cleanupPendingGesture.current?.();
        const current = canvasRef.current;
        if (!current.state.edges.some(item => item.id === edge.id)) return;
        if (current.state.selectedEdgeId === edge.id) {
          current.setEditingEdge(edge.id);
        } else {
          current.selectEdge(edge.id);
        }
      };

      cleanupPendingGesture.current = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        cleanupPendingGesture.current = null;
      };
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    };

    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mouseleave', onMouseLeave);
    container.addEventListener('mousedown', onMouseDown);
    return () => {
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('mouseleave', onMouseLeave);
      container.removeEventListener('mousedown', onMouseDown);
    };
  }, [
    containerRef,
    getNodeById,
    hitTestClientPoint,
    state.connecting,
    state.edges,
    state.rewiring,
    state.selectedEdgeId,
    state.viewport,
  ]);

  return (
    <div className={`react-jsoncanvas-edges-layer ${className}`}>
      <svg className="react-jsoncanvas-edges-svg">
        {visibleOrderedEdges.map(edge => (
          <Edge
            key={edge.id}
            edge={edge}
            visualMetrics={visualMetrics}
            parts="path"
            isHovered={hoveredEdgeId === edge.id}
          />
        ))}
        {state.connecting &&
          (() => {
            const fromNode = state.nodes.find(
              n => n.id === state.connecting?.fromNodeId
            );
            if (!fromNode) return null;
            const fromPoint = getAnchorPointFromNode(
              fromNode,
              state.connecting.fromSide
            );
            let toPoint: Point | undefined;
            if (state.connecting.hoverTargetNodeId) {
              const hoverNode = state.nodes.find(
                n => n.id === state.connecting?.hoverTargetNodeId
              );
              if (hoverNode) {
                toPoint = getAnchorPointFromNode(
                  hoverNode,
                  state.connecting.hoverToSide
                );
              }
            }
            if (!toPoint) {
              toPoint = {
                x: state.connecting.toLocalX ?? 0,
                y: state.connecting.toLocalY ?? 0,
              };
            }
            const hovering = !!state.connecting.hoverTargetNodeId;
            return (
              <EdgeVisual
                fromPoint={fromPoint}
                toPoint={toPoint}
                visualMetrics={visualMetrics}
                curveTightness={config.curveTightness}
                {...(state.connecting.fromSide
                  ? { fromSide: state.connecting.fromSide }
                  : {})}
                {...(hovering && state.connecting.hoverToSide
                  ? { toSide: state.connecting.hoverToSide }
                  : {})}
                hasArrow={hovering}
                strokeColor="var(--canvas-edge-color, var(--canvas-color-neutral, #c0c0c0))"
                {...(!hovering
                  ? {
                      strokeDasharray: `${6 / visualMetrics.scale} ${4 / visualMetrics.scale}`,
                    }
                  : {})}
                className="react-jsoncanvas-edge-preview"
              />
            );
          })()}
        {state.rewiring &&
          (() => {
            const edge = state.edges.find(e => e.id === state.rewiring?.edgeId);
            if (!edge) return null;
            const fixedNode = state.nodes.find(
              n => n.id === state.rewiring?.fixedNodeId
            );
            if (!fixedNode) return null;
            const fixedPoint = getAnchorPointFromNode(
              fixedNode,
              state.rewiring.fixedSide
            );

            // Determine original moving endpoint anchor so initial frame shows unchanged edge
            let movingOriginPoint: Point | undefined;
            if (state.rewiring.movingEnd === 'from') {
              const movingNode = state.nodes.find(n => n.id === edge.fromNode);
              if (movingNode)
                movingOriginPoint = getAnchorPointFromNode(
                  movingNode,
                  edge.fromSide
                );
            } else {
              const movingNode = state.nodes.find(n => n.id === edge.toNode);
              if (movingNode)
                movingOriginPoint = getAnchorPointFromNode(
                  movingNode,
                  edge.toSide
                );
            }

            let movingPoint: Point | undefined;
            if (state.rewiring.hoverTargetNodeId) {
              const hoverNode = state.nodes.find(
                n => n.id === state.rewiring?.hoverTargetNodeId
              );
              if (hoverNode)
                movingPoint = getAnchorPointFromNode(
                  hoverNode,
                  state.rewiring.hoverToSide
                );
            }
            if (!movingPoint) {
              if (
                state.rewiring.movingCurrentX != null &&
                state.rewiring.movingCurrentY != null
              ) {
                movingPoint = {
                  x: state.rewiring.movingCurrentX,
                  y: state.rewiring.movingCurrentY,
                };
              } else if (movingOriginPoint) {
                movingPoint = movingOriginPoint;
              } else {
                movingPoint = { x: fixedPoint.x, y: fixedPoint.y }; // fallback
              }
            }

            const fromPoint =
              state.rewiring.movingEnd === 'from' ? movingPoint : fixedPoint;
            const toPoint =
              state.rewiring.movingEnd === 'from' ? fixedPoint : movingPoint;
            const hovering = !!state.rewiring.hoverTargetNodeId;
            const usingOriginalMovingAnchor =
              !hovering &&
              state.rewiring.movingCurrentX == null &&
              state.rewiring.movingCurrentY == null &&
              movingOriginPoint != null;
            const fromSide =
              state.rewiring.movingEnd === 'from'
                ? hovering
                  ? state.rewiring.hoverToSide
                  : usingOriginalMovingAnchor
                    ? edge.fromSide
                    : undefined
                : edge.fromSide;
            const toSide =
              state.rewiring.movingEnd === 'from'
                ? edge.toSide
                : hovering
                  ? state.rewiring.hoverToSide
                  : usingOriginalMovingAnchor
                    ? edge.toSide
                    : undefined;
            return (
              <EdgeVisual
                fromPoint={fromPoint}
                toPoint={toPoint}
                visualMetrics={visualMetrics}
                curveTightness={config.curveTightness}
                {...(fromSide ? { fromSide } : {})}
                {...(toSide ? { toSide } : {})}
                hasArrow={edge.toEnd === 'arrow'}
                strokeColor={resolveEdgeColor(edge.color)}
                {...(!hovering
                  ? {
                      strokeDasharray: `${6 / visualMetrics.scale} ${4 / visualMetrics.scale}`,
                    }
                  : {})}
                className="react-jsoncanvas-edge-preview"
              />
            );
          })()}
      </svg>
      <svg className="react-jsoncanvas-edges-svg react-jsoncanvas-arrows-svg">
        {visibleOrderedEdges.map(edge => (
          <Edge
            key={edge.id}
            edge={edge}
            visualMetrics={visualMetrics}
            parts="arrow"
            isHovered={hoveredEdgeId === edge.id}
          />
        ))}
      </svg>
    </div>
  );
}
