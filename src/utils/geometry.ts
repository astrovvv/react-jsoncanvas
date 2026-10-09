import type {
  BoundingBox,
  EdgeVisualMetrics,
  Point,
  ViewportState,
} from '../types';
import type { Edge, EdgeSide, GenericNode } from '@trbn/jsoncanvas';

export interface CubicCurveGeometry {
  start: Point;
  control1: Point;
  control2: Point;
  end: Point;
  path: string;
}

export interface SplitCubicCurveGeometry {
  left: CubicCurveGeometry;
  right: CubicCurveGeometry;
}

export interface EdgeArrowGeometry {
  tip: Point;
  baseCenter: Point;
  direction: Point;
  length: number;
  width: number;
  rotationDegrees: number;
}

export interface RenderedEdgeGeometry {
  fullCurve: CubicCurveGeometry;
  shaftCurve: CubicCurveGeometry;
  hoverCurve: CubicCurveGeometry;
  hoverStrokeWidth: number;
  labelPoint: Point;
  arrow?: EdgeArrowGeometry;
}

export interface EdgeGeometryOptions {
  curveTightness?: number;
  fromSide?: EdgeSide;
  toSide?: EdgeSide;
  hasArrow?: boolean;
  visualMetrics: EdgeVisualMetrics;
}

const SIDE_NORMALS: Record<EdgeSide, Point> = {
  top: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  bottom: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
};

export function calculateBoundingBox(elements: HTMLElement[]): BoundingBox {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  elements.forEach(element => {
    const x = parseInt(element.style.left || '0', 10);
    const y = parseInt(element.style.top || '0', 10);
    const width = element.offsetWidth;
    const height = element.offsetHeight;

    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x + width);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y + height);
  });

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function getAnchorPoint(element: HTMLElement, side?: EdgeSide): Point {
  const x = parseInt(element.style.left || '0', 10);
  const y = parseInt(element.style.top || '0', 10);
  const width = element.offsetWidth;
  const height = element.offsetHeight;

  return anchorPoint({ x, y, width, height }, side);
}

function anchorPoint(
  bounds: { x: number; y: number; width: number; height: number },
  side?: EdgeSide
): Point {
  const { x, y, width, height } = bounds;
  switch (side) {
    case 'top':
      return { x: x + width / 2, y };
    case 'right':
      return { x: x + width, y: y + height / 2 };
    case 'bottom':
      return { x: x + width / 2, y: y + height };
    case 'left':
      return { x, y: y + height / 2 };
    default: // center or unspecified case
      return { x: x + width / 2, y: y + height / 2 };
  }
}

// Compute anchor point from node data (world coordinates) instead of DOM element.
export function getAnchorPointFromNode(
  node: { x: number; y: number; width?: number; height?: number },
  side?: EdgeSide
): Point {
  return anchorPoint(
    { x: node.x, y: node.y, width: node.width ?? 0, height: node.height ?? 0 },
    side
  );
}

export function fitBoundsToViewport(
  bounds: BoundingBox,
  viewportWidth: number,
  viewportHeight: number
): ViewportState {
  const scaleX = viewportWidth / (bounds.width + 80);
  const scaleY = viewportHeight / (bounds.height + 80);
  const scale = Math.min(scaleX, scaleY, 1);

  return {
    scale,
    panOffsetX: (viewportWidth - bounds.width * scale) / 2 - bounds.minX * scale,
    panOffsetY: (viewportHeight - bounds.height * scale) / 2 - bounds.minY * scale,
  };
}

export function adjustCanvasToViewport(
  containerElement: HTMLElement
): { scale: number; panOffsetX: number; panOffsetY: number } | null {
  const nodes = containerElement.querySelectorAll('.react-jsoncanvas-node');
  if (nodes.length === 0) return null;

  const boundingBox = calculateBoundingBox(Array.from(nodes) as HTMLElement[]);

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  return fitBoundsToViewport(boundingBox, viewportWidth, viewportHeight);
}

function curvePath(
  start: Point,
  control1: Point,
  control2: Point,
  end: Point
): string {
  if (start.x === end.x && start.y === end.y) {
    return `M ${start.x} ${start.y}`;
  }

  return `M ${start.x} ${start.y} C ${control1.x} ${control1.y}, ${control2.x} ${control2.y}, ${end.x} ${end.y}`;
}

function normalize(vector: Point, fallback: Point = { x: 1, y: 0 }): Point {
  const length = Math.hypot(vector.x, vector.y);
  if (length === 0 || !Number.isFinite(length)) return fallback;

  return { x: vector.x / length, y: vector.y / length };
}

function interpolatePoint(from: Point, to: Point, t: number): Point {
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
  };
}

function createCubicCurve(
  start: Point,
  control1: Point,
  control2: Point,
  end: Point
): CubicCurveGeometry {
  return {
    start,
    control1,
    control2,
    end,
    path: curvePath(start, control1, control2, end),
  };
}

export function calculateCubicCurve(
  fromPoint: Point,
  toPoint: Point,
  curveTightness: number = 0.75,
  fromSide?: EdgeSide,
  toSide?: EdgeSide,
  minimumEndpointHandle: number = 0
): CubicCurveGeometry {
  if (fromPoint.x === toPoint.x && fromPoint.y === toPoint.y) {
    return {
      start: fromPoint,
      control1: fromPoint,
      control2: toPoint,
      end: toPoint,
      path: curvePath(fromPoint, fromPoint, toPoint, toPoint),
    };
  }

  const dx = toPoint.x - fromPoint.x;
  const dy = toPoint.y - fromPoint.y;
  const dist = Math.hypot(dx, dy);

  // Close nodes get shorter handles, while ordinary edges preserve a useful
  // straight lead-in. This avoids control points flipping past one another.
  const closeNodeMinimum = Math.min(40, dist * 0.5);
  const handle = Math.min(
    160,
    Math.max(closeNodeMinimum, dist * curveTightness * 0.5)
  );
  // Both endpoint handles use the same length. Besides making the lead-in
  // predictable, this makes A -> B and B -> A the same geometric curve when
  // their sides are swapped.
  const endpointHandle = Math.max(handle, minimumEndpointHandle);

  const unit = normalize({ x: dx, y: dy });

  const fromNormal = fromSide ? SIDE_NORMALS[fromSide] : unit;
  const toNormal = toSide ? SIDE_NORMALS[toSide] : { x: -unit.x, y: -unit.y };

  const control1 = {
    x: fromPoint.x + fromNormal.x * endpointHandle,
    y: fromPoint.y + fromNormal.y * endpointHandle,
  };
  const control2 = {
    x: toPoint.x + toNormal.x * endpointHandle,
    y: toPoint.y + toNormal.y * endpointHandle,
  };

  return createCubicCurve(fromPoint, control1, control2, toPoint);
}

export function generateCurvePath(
  fromPoint: Point,
  toPoint: Point,
  curveTightness: number = 0.75,
  fromSide?: EdgeSide,
  toSide?: EdgeSide
): string {
  return calculateCubicCurve(
    fromPoint,
    toPoint,
    curveTightness,
    fromSide,
    toSide
  ).path;
}

export function getPointOnCubicCurve(
  curve: CubicCurveGeometry,
  t: number
): Point {
  const clampedT = Math.min(1, Math.max(0, t));
  const inverseT = 1 - clampedT;
  const startWeight = inverseT ** 3;
  const control1Weight = 3 * inverseT ** 2 * clampedT;
  const control2Weight = 3 * inverseT * clampedT ** 2;
  const endWeight = clampedT ** 3;

  return {
    x:
      curve.start.x * startWeight +
      curve.control1.x * control1Weight +
      curve.control2.x * control2Weight +
      curve.end.x * endWeight,
    y:
      curve.start.y * startWeight +
      curve.control1.y * control1Weight +
      curve.control2.y * control2Weight +
      curve.end.y * endWeight,
  };
}

/** Splits a cubic Bézier without changing either resulting curve's shape. */
export function splitCubicCurve(
  curve: CubicCurveGeometry,
  t: number
): SplitCubicCurveGeometry {
  const splitAt = Math.min(1, Math.max(0, t));
  const startControl = interpolatePoint(curve.start, curve.control1, splitAt);
  const middleControl = interpolatePoint(
    curve.control1,
    curve.control2,
    splitAt
  );
  const endControl = interpolatePoint(curve.control2, curve.end, splitAt);
  const leftControl2 = interpolatePoint(startControl, middleControl, splitAt);
  const rightControl1 = interpolatePoint(middleControl, endControl, splitAt);
  const splitPoint = interpolatePoint(leftControl2, rightControl1, splitAt);

  return {
    left: createCubicCurve(curve.start, startControl, leftControl2, splitPoint),
    right: createCubicCurve(splitPoint, rightControl1, endControl, curve.end),
  };
}

/**
 * Trims the terminal portion while preserving the exact Bézier shape. The
 * inset is measured as the straight-line distance from the original endpoint;
 * explicit side tangents keep this terminal section close to linear.
 */
export function trimCubicCurveEnd(
  curve: CubicCurveGeometry,
  endpointInset: number
): CubicCurveGeometry {
  if (endpointInset <= 0) return curve;

  const searchSteps = 64;
  let fartherT: number | undefined;
  let nearerT = 1;

  // Walk backwards from the endpoint to find the first local bracket. This
  // remains stable even if an extreme close-node curve bends back later on.
  for (let step = 1; step <= searchSteps; step += 1) {
    const candidateT = 1 - step / searchSteps;
    const candidate = getPointOnCubicCurve(curve, candidateT);
    if (distance(candidate, curve.end) >= endpointInset) {
      fartherT = candidateT;
      break;
    }
    nearerT = candidateT;
  }

  if (fartherT == null) return splitCubicCurve(curve, 0).left;
  let resolvedFartherT = fartherT;

  for (let iteration = 0; iteration < 24; iteration += 1) {
    const candidateT: number = (resolvedFartherT + nearerT) / 2;
    const candidate = getPointOnCubicCurve(curve, candidateT);

    if (distance(candidate, curve.end) >= endpointInset) {
      resolvedFartherT = candidateT;
    } else {
      nearerT = candidateT;
    }
  }

  return splitCubicCurve(curve, (resolvedFartherT + nearerT) / 2).left;
}

export function calculateEdgeGeometry(
  fromPoint: Point,
  toPoint: Point,
  options: EdgeGeometryOptions
): RenderedEdgeGeometry {
  const distanceBetweenPoints = distance(fromPoint, toPoint);
  const hasArrow = options.hasArrow === true && distanceBetweenPoints > 0;

  const arrowLength = hasArrow ? options.visualMetrics.arrowLength : 0;
  const arrowWidth = hasArrow ? options.visualMetrics.arrowWidth : 0;
  const endpointGap = hasArrow ? options.visualMetrics.endpointGap : 0;
  const terminalLead = hasArrow
    ? Math.min(
        Math.max(
          options.visualMetrics.strokeWidth * 2,
          4 / options.visualMetrics.scale
        ),
        distanceBetweenPoints * 0.12
      )
    : 0;
  const trimmedLength = arrowLength + endpointGap;

  const fullCurve = calculateCubicCurve(
    fromPoint,
    toPoint,
    options.curveTightness,
    options.fromSide,
    options.toSide,
    trimmedLength + terminalLead
  );
  const fallbackDirection = normalize({
    x: toPoint.x - fromPoint.x,
    y: toPoint.y - fromPoint.y,
  });
  const terminalDirection = normalize(
    {
      x: fullCurve.end.x - fullCurve.control2.x,
      y: fullCurve.end.y - fullCurve.control2.y,
    },
    fallbackDirection
  );
  const shaftCurve = hasArrow
    ? trimCubicCurveEnd(fullCurve, trimmedLength)
    : fullCurve;
  const hoverStrokeWidth = Math.min(
    options.visualMetrics.hitTargetWidth,
    distanceBetweenPoints * 0.4
  );
  const hoverEndpointInset = hoverStrokeWidth / 2;
  const hoverCurve = trimCubicCurveEnd(fullCurve, hoverEndpointInset);

  const geometry: RenderedEdgeGeometry = {
    fullCurve,
    shaftCurve,
    hoverCurve,
    hoverStrokeWidth,
    labelPoint: getPointOnCubicCurve(fullCurve, 0.5),
  };

  if (hasArrow) {
    geometry.arrow = {
      tip: toPoint,
      baseCenter: {
        x: toPoint.x - terminalDirection.x * arrowLength,
        y: toPoint.y - terminalDirection.y * arrowLength,
      },
      direction: terminalDirection,
      length: arrowLength,
      width: arrowWidth,
      rotationDegrees:
        (Math.atan2(terminalDirection.y, terminalDirection.x) * 180) / Math.PI,
    };
  }

  return geometry;
}

/** Uses the same anchors and curve options for drawing and hit testing. */
export function getNodeEdgeGeometry(
  edge: Edge,
  fromNode: GenericNode,
  toNode: GenericNode,
  curveTightness: number,
  visualMetrics: EdgeVisualMetrics
): RenderedEdgeGeometry {
  return calculateEdgeGeometry(
    getAnchorPointFromNode(fromNode, edge.fromSide),
    getAnchorPointFromNode(toNode, edge.toSide),
    {
      curveTightness,
      visualMetrics,
      hasArrow: edge.toEnd === 'arrow',
      ...(edge.fromSide ? { fromSide: edge.fromSide } : {}),
      ...(edge.toSide ? { toSide: edge.toSide } : {}),
    }
  );
}

export function distance(point1: Point, point2: Point): number {
  return Math.sqrt(
    Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2)
  );
}

/**
 * Converts screen coordinates to world coordinates
 * View transform: screen = scale * world + pan => world = (screen - pan) / scale
 */
export function screenToWorld(
  screenX: number,
  screenY: number,
  viewport: ViewportState
): Point {
  return {
    x: (screenX - viewport.panOffsetX) / viewport.scale,
    y: (screenY - viewport.panOffsetY) / viewport.scale,
  };
}

/**
 * Converts world coordinates to screen coordinates
 * View transform: screen = scale * world + pan
 */
export function worldToScreen(
  worldX: number,
  worldY: number,
  viewport: ViewportState
): Point {
  return {
    x: worldX * viewport.scale + viewport.panOffsetX,
    y: worldY * viewport.scale + viewport.panOffsetY,
  };
}

/** Change scale around a fixed point in container-local screen coordinates. */
export function zoomViewportAround(
  viewport: ViewportState,
  scale: number,
  anchor: Point
): ViewportState {
  const world = screenToWorld(anchor.x, anchor.y, viewport);
  return {
    scale,
    panOffsetX: anchor.x - world.x * scale,
    panOffsetY: anchor.y - world.y * scale,
  };
}

/**
 * Get screen coordinates relative to container from mouse event
 */
export function getContainerCoordinates(
  event: MouseEvent | React.MouseEvent,
  containerRect: DOMRect
): Point {
  return {
    x: event.clientX - containerRect.left,
    y: event.clientY - containerRect.top,
  };
}

export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}
