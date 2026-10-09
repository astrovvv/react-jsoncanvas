import { getAnchorPointFromNode } from '../../utils/geometry';
import { EdgeComponentProps } from '../../types';
import { useCanvas } from '../../hooks/useCanvas';
import { EdgeVisual } from './EdgeVisual';
import { getEdgeVisualMetrics } from '../../utils/edgeVisualMetrics';
import { resolveEdgeColor } from './edgeColors';

interface EdgePathProps extends EdgeComponentProps {
  parts?: 'path' | 'arrow';
  isHovered?: boolean;
}

export function EdgePath({
  edge,
  fromNode,
  toNode,
  visualMetrics,
  parts = 'path',
  isHovered = false,
}: EdgePathProps) {
  const { state, config } = useCanvas();
  if (!fromNode || !toNode) return null;

  const fromPoint = getAnchorPointFromNode(fromNode, edge.fromSide);
  const toPoint = getAnchorPointFromNode(toNode, edge.toSide);
  const strokeColor = resolveEdgeColor(edge.color);
  const resolvedVisualMetrics =
    visualMetrics ?? getEdgeVisualMetrics(state.viewport.scale);
  const isSelected = state.selectedEdgeId === edge.id;
  const isEditing = state.editingEdgeId === edge.id;

  return (
    <g
      className={`react-jsoncanvas-edge ${
        isSelected ? 'react-jsoncanvas-edge--selected' : ''
      } ${isHovered ? 'react-jsoncanvas-edge--hovered' : ''}`}
      data-edge-id={edge.id}
    >
      <EdgeVisual
        fromPoint={fromPoint}
        toPoint={toPoint}
        visualMetrics={resolvedVisualMetrics}
        curveTightness={config.curveTightness}
        {...(edge.fromSide ? { fromSide: edge.fromSide } : {})}
        {...(edge.toSide ? { toSide: edge.toSide } : {})}
        hasArrow={edge.toEnd === 'arrow'}
        strokeColor={strokeColor}
        {...(edge.label && !isEditing ? { label: edge.label } : {})}
        highlighted={parts === 'path' && (isHovered || isSelected)}
        parts={parts}
      />
    </g>
  );
}
