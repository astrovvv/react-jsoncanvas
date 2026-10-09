import type { CSSProperties } from 'react';
import type { EdgeSide } from '@trbn/jsoncanvas';
import type { EdgeVisualMetrics, Point } from '../../types';
import { calculateEdgeGeometry } from '../../utils/geometry';

interface EdgeVisualProps {
  fromPoint: Point;
  toPoint: Point;
  visualMetrics: EdgeVisualMetrics;
  curveTightness: number;
  fromSide?: EdgeSide;
  toSide?: EdgeSide;
  hasArrow?: boolean;
  strokeColor: string;
  label?: string;
  strokeDasharray?: string;
  highlighted?: boolean;
  className?: string;
  parts?: 'all' | 'path' | 'arrow';
}

export function EdgeVisual({
  fromPoint,
  toPoint,
  visualMetrics,
  curveTightness,
  fromSide,
  toSide,
  hasArrow = false,
  strokeColor,
  label,
  strokeDasharray,
  highlighted = false,
  className = '',
  parts = 'all',
}: EdgeVisualProps) {
  const overviewScale = Math.max(visualMetrics.scale, 0.625);
  const geometry = calculateEdgeGeometry(fromPoint, toPoint, {
    curveTightness,
    visualMetrics,
    hasArrow,
    ...(fromSide ? { fromSide } : {}),
    ...(toSide ? { toSide } : {}),
  });
  const visualStyle = {
    '--edge-stroke-width': `${visualMetrics.strokeWidth}px`,
    '--edge-hit-width': `${geometry.hoverStrokeWidth}px`,
    '--edge-hover-width': `${5.5 / overviewScale}px`,
    '--edge-zoom-multiplier': 1 / overviewScale,
    '--edge-arrow-scale-x': visualMetrics.arrowWidth / 13,
    '--edge-arrow-scale-y': visualMetrics.arrowLength / 10.4,
    '--canvas-color': strokeColor,
  } as CSSProperties;

  return (
    <g
      className={`react-jsoncanvas-edge-visual ${className}`}
      style={visualStyle}
    >
      {parts !== 'arrow' && highlighted && (
        <path
          d={geometry.hoverCurve.path}
          fill="none"
          className="react-jsoncanvas-edge-highlight"
        />
      )}
      {parts !== 'arrow' && (
        <path
          d={geometry.shaftCurve.path}
          stroke={strokeColor}
          fill="none"
          strokeDasharray={strokeDasharray}
          className="react-jsoncanvas-edge-path"
        />
      )}
      {parts !== 'path' && geometry.arrow && (
        <g
          className="react-jsoncanvas-edge-arrow"
          transform={`translate(${geometry.arrow.tip.x} ${geometry.arrow.tip.y}) rotate(${geometry.arrow.rotationDegrees + 90})`}
          pointerEvents="none"
        >
          <polygon
            className="react-jsoncanvas-edge-arrow-shape canvas-path-end"
            points="0,0 6.5,10.4 -6.5,10.4"
          />
        </g>
      )}
      {parts !== 'arrow' && label && (
        <foreignObject
          x={geometry.labelPoint.x}
          y={geometry.labelPoint.y}
          width="1"
          height="1"
          overflow="visible"
          className="react-jsoncanvas-edge-label-wrapper"
        >
          <div className="react-jsoncanvas-edge-label">{label}</div>
        </foreignObject>
      )}
    </g>
  );
}
