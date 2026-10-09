import { Edge as EdgeType } from '@trbn/jsoncanvas';
import { EdgePath } from './EdgePath';
import { useCanvas } from '../../hooks/useCanvas';
import type { EdgeVisualMetrics } from '../../types';

interface EdgeProps {
  edge: EdgeType;
  visualMetrics?: EdgeVisualMetrics;
  parts?: 'path' | 'arrow';
  isHovered?: boolean;
}

export function Edge({
  edge,
  visualMetrics,
  parts = 'path',
  isHovered = false,
}: EdgeProps) {
  const { getNodeById } = useCanvas();

  const fromNode = getNodeById(edge.fromNode);
  const toNode = getNodeById(edge.toNode);

  return (
    <EdgePath
      edge={edge}
      fromNode={fromNode}
      toNode={toNode}
      parts={parts}
      isHovered={isHovered}
      {...(visualMetrics ? { visualMetrics } : {})}
    />
  );
}
