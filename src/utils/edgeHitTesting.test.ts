import { describe, expect, it } from 'vitest';
import { calculateCubicCurve, getPointOnCubicCurve } from './geometry';
import { createEdgeHitIndex, distanceToCubicCurve } from './edgeHitTesting';

describe('edge hit testing', () => {
  it('hits a point inside the wide interaction stroke', () => {
    const curve = calculateCubicCurve({ x: 0, y: 0 }, { x: 100, y: 0 });
    const index = createEdgeHitIndex([{ id: 'edge', curve, hitWidth: 24 }]);

    expect(index.hitTest({ x: 50, y: 10 })).toBe('edge');
    expect(index.hitTest({ x: 50, y: 13 })).toBeNull();
  });

  it('uses reverse paint order for overlapping edges', () => {
    const curve = calculateCubicCurve({ x: 0, y: 0 }, { x: 100, y: 0 });
    const index = createEdgeHitIndex([
      { id: 'back', curve, hitWidth: 24 },
      { id: 'front', curve, hitWidth: 24 },
    ]);

    expect(index.hitTest({ x: 50, y: 0 })).toBe('front');
  });

  it('measures curved segments rather than only their endpoints', () => {
    const curve = calculateCubicCurve(
      { x: 0, y: 0 },
      { x: 100, y: 100 },
      0.75,
      'right',
      'top'
    );
    const midpoint = getPointOnCubicCurve(curve, 0.5);

    expect(distanceToCubicCurve(midpoint, curve)).toBeLessThan(0.1);
  });

  it('hit-tests very long diagonal edges without indexing their whole area', () => {
    const curve = calculateCubicCurve(
      { x: 0, y: 0 },
      { x: 1_000_000_000, y: 1_000_000_000 }
    );
    const midpoint = getPointOnCubicCurve(curve, 0.5);
    const index = createEdgeHitIndex([{ id: 'long', curve, hitWidth: 24 }]);

    expect(index.hitTest(midpoint)).toBe('long');
    expect(index.hitTest({ x: 0, y: 1_000_000_000 })).toBeNull();
  });

  it('preserves paint order between bounded and oversized edges', () => {
    const large = calculateCubicCurve(
      { x: 0, y: 0 },
      { x: 100_000, y: 100_000 }
    );
    const point = getPointOnCubicCurve(large, 0.5);
    const small = calculateCubicCurve(
      { x: point.x - 10, y: point.y },
      { x: point.x + 10, y: point.y }
    );
    const back = { id: 'long', curve: large, hitWidth: 24 };
    const front = { id: 'short', curve: small, hitWidth: 24 };

    expect(createEdgeHitIndex([back, front]).hitTest(point)).toBe('short');
    expect(createEdgeHitIndex([front, back]).hitTest(point)).toBe('long');
  });
});
