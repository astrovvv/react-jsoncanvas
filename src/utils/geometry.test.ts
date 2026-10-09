import { describe, expect, it } from 'vitest';
import {
  calculateEdgeGeometry,
  calculateCubicCurve,
  distance,
  fitBoundsToViewport,
  generateCurvePath,
  getAnchorPointFromNode,
  getNodeEdgeGeometry,
  getPointOnCubicCurve,
  screenToWorld,
  snapToGrid,
  splitCubicCurve,
  worldToScreen,
  zoomViewportAround,
} from './geometry';
import {
  EDGE_VISUAL_LIMITS,
  getEdgeVisualMetrics,
  quantizeEdgeScale,
} from './edgeVisualMetrics';

describe('geometry utilities', () => {
  it('keeps the viewport center fixed when resetting from 300% zoom', () => {
    const viewport = { scale: 3, panOffsetX: -700, panOffsetY: -300 };
    const center = { x: 400, y: 300 };
    const worldAtCenter = screenToWorld(center.x, center.y, viewport);

    const reset = zoomViewportAround(viewport, 1, center);

    expect(screenToWorld(center.x, center.y, reset)).toEqual(worldAtCenter);
    expect(reset.scale).toBe(1);
  });
  it('fits bounds into the given viewport while centering their offset', () => {
    expect(
      fitBoundsToViewport(
        { minX: 100, minY: 50, maxX: 300, maxY: 150, width: 200, height: 100 },
        560,
        360
      )
    ).toEqual({ scale: 1, panOffsetX: 80, panOffsetY: 80 });
  });

  it('derives drawing and hit-test geometry from the same edge anchors', () => {
    const from = { id: 'a', type: 'text', x: 0, y: 0, width: 100, height: 60 };
    const to = { id: 'b', type: 'text', x: 300, y: 0, width: 100, height: 60 };
    const edge = {
      id: 'ab',
      fromNode: 'a',
      toNode: 'b',
      fromSide: 'right' as const,
      toSide: 'left' as const,
      toEnd: 'arrow' as const,
    };
    const metrics = getEdgeVisualMetrics(1);

    expect(getNodeEdgeGeometry(edge, from, to, 0.75, metrics)).toEqual(
      calculateEdgeGeometry({ x: 100, y: 30 }, { x: 300, y: 30 }, {
        curveTightness: 0.75,
        visualMetrics: metrics,
        hasArrow: true,
        fromSide: 'right',
        toSide: 'left',
      })
    );
  });

  it('round-trips coordinates through a viewport transform', () => {
    const viewport = { scale: 1.5, panOffsetX: 40, panOffsetY: -25 };
    const screen = worldToScreen(120, -30, viewport);

    expect(screenToWorld(screen.x, screen.y, viewport)).toEqual({
      x: 120,
      y: -30,
    });
  });

  it('calculates node anchors from world-space data', () => {
    const node = { x: 10, y: 20, width: 100, height: 60 };

    expect(getAnchorPointFromNode(node, 'top')).toEqual({ x: 60, y: 20 });
    expect(getAnchorPointFromNode(node, 'right')).toEqual({ x: 110, y: 50 });
    expect(getAnchorPointFromNode(node, 'bottom')).toEqual({ x: 60, y: 80 });
    expect(getAnchorPointFromNode(node, 'left')).toEqual({ x: 10, y: 50 });
  });

  it('produces stable paths for coincident and connected points', () => {
    expect(generateCurvePath({ x: 5, y: 7 }, { x: 5, y: 7 })).toBe('M 5 7');
    expect(
      generateCurvePath({ x: 0, y: 0 }, { x: 100, y: 0 }, 0.75, 'right', 'left')
    ).toBe('M 0 0 C 40 0, 60 0, 100 0');
  });

  it('aligns explicit source and target tangents with node side normals', () => {
    const metrics = getEdgeVisualMetrics(1);
    const geometry = calculateEdgeGeometry(
      { x: 0, y: 80 },
      { x: 120, y: 0 },
      {
        curveTightness: 0.75,
        fromSide: 'right',
        toSide: 'top',
        hasArrow: true,
        visualMetrics: metrics,
      }
    );

    expect(geometry.fullCurve.control1.y).toBe(80);
    expect(geometry.fullCurve.control1.x).toBeGreaterThan(0);
    expect(geometry.fullCurve.control2.x).toBe(120);
    expect(geometry.fullCurve.control2.y).toBeLessThan(0);
    expect(geometry.arrow?.direction.x).toBeCloseTo(0);
    expect(geometry.arrow?.direction.y).toBeCloseTo(1);
  });

  it('stops an arrow edge before its arrow base without trimming plain edges', () => {
    const metrics = getEdgeVisualMetrics(1);
    const arrowGeometry = calculateEdgeGeometry(
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      {
        fromSide: 'right',
        toSide: 'left',
        hasArrow: true,
        visualMetrics: metrics,
      }
    );
    const plainGeometry = calculateEdgeGeometry(
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      {
        fromSide: 'right',
        toSide: 'left',
        visualMetrics: metrics,
      }
    );

    expect(arrowGeometry.arrow).toBeDefined();
    expect(arrowGeometry.arrow?.baseCenter.x).toBeCloseTo(89.6);
    expect(arrowGeometry.shaftCurve.end.x).toBeCloseTo(88.1);
    expect(arrowGeometry.hoverCurve.end.x).toBeCloseTo(88);
    expect(100 - arrowGeometry.hoverCurve.end.x).toBeCloseTo(
      metrics.hitTargetWidth / 2
    );
    expect(arrowGeometry.shaftCurve.end.x).toBeLessThan(
      arrowGeometry.arrow?.baseCenter.x ?? 0
    );
    expect(plainGeometry.shaftCurve.end).toEqual({ x: 100, y: 0 });
  });

  it('keeps close and reversed edge geometry finite', () => {
    const geometry = calculateEdgeGeometry(
      { x: 10, y: 10 },
      { x: 0, y: 10 },
      {
        fromSide: 'right',
        toSide: 'right',
        hasArrow: true,
        visualMetrics: getEdgeVisualMetrics(0.1),
      }
    );
    const coordinates = [
      geometry.fullCurve.control1.x,
      geometry.fullCurve.control1.y,
      geometry.fullCurve.control2.x,
      geometry.fullCurve.control2.y,
      geometry.shaftCurve.end.x,
      geometry.shaftCurve.end.y,
    ];

    expect(coordinates.every(Number.isFinite)).toBe(true);
    expect(geometry.fullCurve.control2.x).toBeGreaterThan(
      geometry.fullCurve.end.x
    );
    expect(geometry.shaftCurve.path).not.toContain('NaN');
  });

  it('keeps arrow dimensions independent from edge length', () => {
    const visualMetrics = getEdgeVisualMetrics(0.1);
    const shortEdge = calculateEdgeGeometry(
      { x: 0, y: 0 },
      { x: 40, y: 0 },
      { hasArrow: true, visualMetrics }
    );
    const longEdge = calculateEdgeGeometry(
      { x: 0, y: 0 },
      { x: 400, y: 0 },
      { hasArrow: true, visualMetrics }
    );

    expect(shortEdge.arrow?.length).toBe(longEdge.arrow?.length);
    expect(shortEdge.arrow?.width).toBe(longEdge.arrow?.width);
    expect(shortEdge.arrow?.length).toBe(
      EDGE_VISUAL_LIMITS.maxWorldArrowLength
    );
  });

  it('splits a curve without changing its shape', () => {
    const curve = calculateCubicCurve(
      { x: 10, y: 80 },
      { x: 170, y: 20 },
      0.75,
      'right',
      'top'
    );
    const splitAt = 0.63;
    const { left } = splitCubicCurve(curve, splitAt);

    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      const splitPoint = getPointOnCubicCurve(left, t);
      const originalPoint = getPointOnCubicCurve(curve, t * splitAt);

      expect(splitPoint.x).toBeCloseTo(originalPoint.x, 8);
      expect(splitPoint.y).toBeCloseTo(originalPoint.y, 8);
    }
  });

  it('builds the same full curve for opposite directions', () => {
    const visualMetrics = getEdgeVisualMetrics(0.25);
    const forward = calculateEdgeGeometry(
      { x: 0, y: 80 },
      { x: 160, y: 0 },
      {
        fromSide: 'right',
        toSide: 'top',
        hasArrow: true,
        visualMetrics,
      }
    );
    const reverse = calculateEdgeGeometry(
      { x: 160, y: 0 },
      { x: 0, y: 80 },
      {
        fromSide: 'top',
        toSide: 'right',
        hasArrow: true,
        visualMetrics,
      }
    );

    expect(forward.fullCurve.start).toEqual(reverse.fullCurve.end);
    expect(forward.fullCurve.control1).toEqual(reverse.fullCurve.control2);
    expect(forward.fullCurve.control2).toEqual(reverse.fullCurve.control1);
    expect(forward.fullCurve.end).toEqual(reverse.fullCurve.start);
  });

  it('calculates distance and grid snapping', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(snapToGrid(29, 20)).toBe(20);
    expect(snapToGrid(31, 20)).toBe(40);
  });
});

describe('edge visual metrics', () => {
  it('keeps visible dimensions stable in the ordinary zoom range', () => {
    for (const scale of [1, 3]) {
      const metrics = getEdgeVisualMetrics(scale);

      expect(metrics.strokeWidth * metrics.scale).toBeCloseTo(2);
      expect(metrics.arrowLength * metrics.scale).toBeCloseTo(10.4);
      expect(metrics.arrowWidth * metrics.scale).toBeCloseTo(13);
      expect(metrics.hitTargetWidth * metrics.scale).toBeCloseTo(24);
    }
  });

  it('shrinks arrowheads at overview scales', () => {
    const metrics = getEdgeVisualMetrics(0.5);

    expect(metrics.strokeWidth * metrics.scale).toBeLessThan(2);
    expect(metrics.arrowLength * metrics.scale).toBeLessThan(10.4);
    expect(metrics.arrowWidth * metrics.scale).toBeLessThan(13);
    expect(metrics.hitTargetWidth * metrics.scale).toBeLessThan(24);
  });

  it('caps world-space dimensions at very small scales', () => {
    const metrics = getEdgeVisualMetrics(0.1);

    expect(metrics.strokeWidth).toBe(EDGE_VISUAL_LIMITS.maxWorldStrokeWidth);
    expect(metrics.arrowLength).toBe(EDGE_VISUAL_LIMITS.maxWorldArrowLength);
    expect(metrics.arrowWidth).toBe(EDGE_VISUAL_LIMITS.maxWorldArrowWidth);
    expect(metrics.endpointGap).toBe(EDGE_VISUAL_LIMITS.maxWorldEndpointGap);
    expect(metrics.hitTargetWidth).toBe(
      EDGE_VISUAL_LIMITS.maxWorldHitTargetWidth
    );
    expect(metrics.arrowLength * metrics.scale).toBeLessThan(10.4);
  });

  it('quantizes and clamps scale before recalculating metrics', () => {
    expect(quantizeEdgeScale(1.021)).toBe(1);
    expect(quantizeEdgeScale(1.029)).toBe(1.05);
    expect(quantizeEdgeScale(0)).toBe(1);
    expect(quantizeEdgeScale(10)).toBe(3);
  });
});
