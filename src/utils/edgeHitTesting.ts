import type { Point } from '../types';
import type { CubicCurveGeometry } from './geometry';
import { getPointOnCubicCurve } from './geometry';

export interface EdgeHitEntry {
  id: string;
  curve: CubicCurveGeometry;
  hitWidth: number;
}

const DEFAULT_CELL_SIZE = 256;
const MAX_CELLS_PER_EDGE = 256;

interface CellBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

function distanceToSegment(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0)
    return Math.hypot(point.x - start.x, point.y - start.y);
  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared
    )
  );
  return Math.hypot(point.x - (start.x + dx * t), point.y - (start.y + dy * t));
}

export function distanceToCubicCurve(
  point: Point,
  curve: CubicCurveGeometry,
  sampleCount = 24
): number {
  let closest = Number.POSITIVE_INFINITY;
  let previous = curve.start;
  for (let index = 1; index <= sampleCount; index += 1) {
    const current = getPointOnCubicCurve(curve, index / sampleCount);
    closest = Math.min(closest, distanceToSegment(point, previous, current));
    previous = current;
  }
  return closest;
}

function cellKey(x: number, y: number): string {
  return `${x}:${y}`;
}

export function createEdgeHitIndex(
  entries: EdgeHitEntry[],
  cellSize = DEFAULT_CELL_SIZE
) {
  if (!Number.isFinite(cellSize) || cellSize <= 0) {
    throw new RangeError('cellSize must be positive and finite');
  }
  const cells = new Map<string, number[]>();
  const overflow: number[] = [];
  const bounds: CellBounds[] = [];

  entries.forEach((entry, index) => {
    const points = [
      entry.curve.start,
      entry.curve.control1,
      entry.curve.control2,
      entry.curve.end,
    ];
    const radius = entry.hitWidth / 2;
    const minX = Math.floor(
      (Math.min(...points.map(point => point.x)) - radius) / cellSize
    );
    const maxX = Math.floor(
      (Math.max(...points.map(point => point.x)) + radius) / cellSize
    );
    const minY = Math.floor(
      (Math.min(...points.map(point => point.y)) - radius) / cellSize
    );
    const maxY = Math.floor(
      (Math.max(...points.map(point => point.y)) + radius) / cellSize
    );
    bounds.push({ minX, maxX, minY, maxY });

    const columns = maxX - minX + 1;
    const rows = maxY - minY + 1;
    if (
      ![minX, maxX, minY, maxY].every(Number.isSafeInteger) ||
      !Number.isSafeInteger(columns) ||
      !Number.isSafeInteger(rows) ||
      columns <= 0 ||
      rows <= 0 ||
      columns * rows > MAX_CELLS_PER_EDGE
    ) {
      // Check exceptionally large edges on demand rather than allocating
      // every cell in their control-point bounding rectangle.
      overflow.push(index);
      return;
    }

    for (let x = minX; x <= maxX; x += 1) {
      for (let y = minY; y <= maxY; y += 1) {
        const key = cellKey(x, y);
        const bucket = cells.get(key);
        if (bucket) bucket.push(index);
        else cells.set(key, [index]);
      }
    }
  });

  return {
    hitTest(point: Point): string | null {
      const x = Math.floor(point.x / cellSize);
      const y = Math.floor(point.y / cellSize);
      const candidates = cells.get(cellKey(x, y));

      // Reverse paint order matches SVG pointer targeting for overlapping edges.
      let indexedCursor = (candidates?.length ?? 0) - 1;
      let overflowCursor = overflow.length - 1;
      while (indexedCursor >= 0 || overflowCursor >= 0) {
        const indexed = candidates?.[indexedCursor] ?? -1;
        const unindexed = overflow[overflowCursor] ?? -1;
        const candidateIndex = Math.max(indexed, unindexed);
        if (indexed > unindexed) indexedCursor -= 1;
        else overflowCursor -= 1;

        const box = bounds[candidateIndex];
        if (
          !box ||
          x < box.minX ||
          x > box.maxX ||
          y < box.minY ||
          y > box.maxY
        ) {
          continue;
        }
        const entry = entries[candidateIndex];
        if (!entry) continue;
        const controlPolygonLength =
          Math.hypot(
            entry.curve.control1.x - entry.curve.start.x,
            entry.curve.control1.y - entry.curve.start.y
          ) +
          Math.hypot(
            entry.curve.control2.x - entry.curve.control1.x,
            entry.curve.control2.y - entry.curve.control1.y
          ) +
          Math.hypot(
            entry.curve.end.x - entry.curve.control2.x,
            entry.curve.end.y - entry.curve.control2.y
          );
        const sampleCount = Math.min(
          96,
          Math.max(
            24,
            Math.ceil(controlPolygonLength / Math.max(4, entry.hitWidth / 2))
          )
        );
        if (
          distanceToCubicCurve(point, entry.curve, sampleCount) <=
          entry.hitWidth / 2
        ) {
          return entry.id;
        }
      }
      return null;
    },
  };
}
