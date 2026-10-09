import './styles/index.css';

// Types
export type {
  ViewportState,
  CanvasState,
  CanvasConfig,
  CanvasProps,
  CanvasEvents,
  CanvasHistorySnapshot,
  CanvasHistoryState,
  DragState,
  TouchState,
  ResizeHandle,
  NodeLayerOperation,
  Point,
  EdgeVisualMetrics,
  BoundingBox,
  NodeRef,
  ConnectDropEvent,
  NodeComponentProps,
  EdgeComponentProps,
  CustomNodeRendererProps,
  CustomNodeDefinition,
  CustomNodeRenderers,
} from './types';

// Context
export { CanvasProvider } from './context/CanvasContext';
export { useCanvas } from './hooks/useCanvas';

// Hooks
export { useViewport } from './hooks/useViewport';
export { useZoom } from './hooks/useZoom';
export { usePanning } from './hooks/usePanning';
export { useDragAndDrop } from './hooks/useDragAndDrop';
export { useTouch } from './hooks/useTouch';
export { useEdges } from './hooks/useEdges';
export { useCanvasLoader } from './hooks/useCanvasLoader';
export { useEdgeVisualMetrics } from './hooks/useEdgeVisualMetrics';

// Components
export { Canvas } from './components/Canvas';
export { CanvasContainer } from './components/Canvas/CanvasContainer';
export { NodesLayer } from './components/Canvas/NodesLayer';
export { EdgesLayer } from './components/Canvas/EdgesLayer';

export { BaseNode } from './components/Nodes/BaseNode';
export { TextNode } from './components/Nodes/TextNode';
export { LinkNode } from './components/Nodes/LinkNode';
export { GroupNode } from './components/Nodes/GroupNode';

export { Edge } from './components/Edges/Edge';
export { EdgePath } from './components/Edges/EdgePath';

// UI Components
export {
  LoadingState,
  ErrorState,
  ComponentNotLoaded,
} from './components/UI/LoadingStates';

// Controls
export { ZoomControls } from './components/Controls/ZoomControls';
export { ViewportControls } from './components/Controls/ViewportControls';
export { ExportControls } from './components/Controls/ExportControls';

// Utils
export {
  calculateBoundingBox,
  getAnchorPoint,
  adjustCanvasToViewport,
  screenToWorld,
  worldToScreen,
  getContainerCoordinates,
  calculateCubicCurve,
  calculateEdgeGeometry,
  getPointOnCubicCurve,
  splitCubicCurve,
  trimCubicCurveEnd,
} from './utils/geometry';

export {
  EDGE_VISUAL_LIMITS,
  getEdgeVisualMetrics,
  quantizeEdgeScale,
} from './utils/edgeVisualMetrics';

export type {
  CubicCurveGeometry,
  EdgeArrowGeometry,
  EdgeGeometryOptions,
  RenderedEdgeGeometry,
  SplitCubicCurveGeometry,
} from './utils/geometry';

export {
  serializeCanvas,
  htmlToMarkdown,
  prepareLinksForSerialization,
} from './utils/serialization';

export { createPositionStyle } from './utils/positioning';
export { PositionedControl } from './components/Controls/PositionedControl';

export {
  defineCustomNode,
  getCustomNodeDefinition,
  getNodeType,
} from './utils/customNodes';

// Constants
export {
  MOUSE_BUTTON,
  INTERACTION_THRESHOLDS,
  UI_POSITIONING,
  ZOOM_CONSTANTS,
} from './constants';

// Re-export from @trbn/jsoncanvas for convenience
export type {
  Edge as JSONCanvasEdge,
  EdgeEnd,
  EdgeSide,
  GenericNode,
  GroupNode as JSONCanvasGroupNode,
  LinkNode as JSONCanvasLinkNode,
  TextNode as JSONCanvasTextNode,
} from '@trbn/jsoncanvas';

export { JSONCanvas } from '@trbn/jsoncanvas';
