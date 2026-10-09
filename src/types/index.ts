import type { GenericNode, Edge, EdgeSide } from '@trbn/jsoncanvas';

export type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se';

export type NodeLayerOperation =
  | 'bring-to-front'
  | 'bring-forward'
  | 'send-backward'
  | 'send-to-back';

export interface ViewportState {
  scale: number;
  panOffsetX: number;
  panOffsetY: number;
}

export interface CanvasHistorySnapshot {
  nodes: GenericNode[];
  edges: Edge[];
  selectedNodeId: string | null;
  selectedNodeIds: string[];
}

export interface CanvasHistoryState {
  past: CanvasHistorySnapshot[];
  future: CanvasHistorySnapshot[];
}

export interface CanvasState {
  nodes: GenericNode[];
  edges: Edge[];
  history: CanvasHistoryState;
  viewport: ViewportState;
  isDragging: boolean;
  isPanning: boolean;
  selectedNodeId: string | null;
  selectedNodeIds: string[];
  activeNodeId: string | null;
  editingNodeId: string | null;
  selectedEdgeId: string | null;
  editingEdgeId: string | null;
  isSpacePressed: boolean;
  // Temporary state while user is interactively creating an edge
  connecting: {
    fromNodeId: string;
    fromSide?: EdgeSide;
    // initial and current world-space pointer positions
    startWorldX?: number;
    startWorldY?: number;
    // current world-space point while dragging
    toLocalX?: number;
    toLocalY?: number;
    // live hover snap target (if pointer currently over another node)
    hoverTargetNodeId?: string | undefined;
    hoverToSide?: EdgeSide | undefined;
  } | null;
  // edge rewiring (detach & reattach one endpoint)
  rewiring: {
    edgeId: string;
    movingEnd: 'from' | 'to';
    fixedNodeId: string;
    fixedSide?: EdgeSide;
    movingCurrentX?: number;
    movingCurrentY?: number;
    hoverTargetNodeId?: string | undefined;
    hoverToSide?: EdgeSide | undefined;
  } | null;
}

export interface CanvasConfig {
  minScale: number;
  maxScale: number;
  zoomSpeed: number;
  touchThreshold: number;
  curveTightness: number;
  enableKeyboardShortcuts: boolean;
  enableTouch: boolean;
  snapToGrid: boolean;
  gridSize: number;
}

export interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  selectedElement: HTMLElement | null;
}

export interface TouchState {
  isPanning: boolean;
  lastTouchX: number;
  lastTouchY: number;
  touchStartPanX: number;
  touchStartPanY: number;
  initialDistance: number | null;
}

export interface Point {
  x: number;
  y: number;
}

export interface EdgeVisualMetrics {
  /** Quantized viewport scale used to derive the remaining values. */
  scale: number;
  /** Visible edge width in world-space units. */
  strokeWidth: number;
  /** Arrow dimensions in world-space units. */
  arrowLength: number;
  arrowWidth: number;
  /** Clear space between the edge shaft and the arrow base. */
  endpointGap: number;
  /** Interactive edge target width in world-space units. */
  hitTargetWidth: number;
}

export interface BoundingBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
}

export interface NodeRef {
  id: string;
  element: HTMLElement;
}

export interface ConnectDropEvent {
  fromNodeId: string;
  fromSide: EdgeSide;
  position: Point;
  /** Side on the new node that faces the source anchor. */
  toSide: EdgeSide;
}

export interface CanvasEvents {
  onNodeMove?: ((nodeId: string, position: Point) => void) | undefined;
  onNodeSelect?:
    | ((nodeId: string | null, nodeIds?: string[]) => void)
    | undefined;
  onViewportChange?: ((viewport: ViewportState) => void) | undefined;
  onCanvasChange?: ((nodes: GenericNode[], edges: Edge[]) => void) | undefined;
  onEdgeCreate?: ((edge: Edge) => void) | undefined;
  /** Return a node to create it and connect it at an empty drop position. */
  onConnectDrop?:
    | ((connection: ConnectDropEvent) => GenericNode | null | undefined)
    | undefined;
}

export interface CustomNodeRendererProps<
  TNode extends GenericNode = GenericNode,
> {
  node: TNode;
  isSelected: boolean;
  isActive: boolean;
  isEditing: boolean;
  isDragging: boolean;
  updateNode: (
    updates: Partial<TNode>,
    options?: { recordHistory?: boolean }
  ) => void;
  setEditing: (isEditing: boolean) => void;
}

export interface CustomNodeDefinition<TNode extends GenericNode = GenericNode> {
  component: React.ComponentType<CustomNodeRendererProps<TNode>>;
  /** Whether clicking the selected node again enters editing mode. */
  editable?: boolean;
  /** Optional class applied to the BaseNode wrapper. */
  className?: string;
}

export type CustomNodeRenderers = Record<string, CustomNodeDefinition>;

export interface CanvasProps extends CanvasEvents {
  /**
   * Initial nodes for the canvas. The provider owns subsequent editor state;
   * changing this array after mount does not replace the current document.
   * Remount Canvas (for example with a different `key`) to load another document.
   */
  nodes: GenericNode[];
  /** Initial edges; follows the same initialization-only contract as `nodes`. */
  edges: Edge[];
  className?: string;
  style?: React.CSSProperties;
  config?: Partial<CanvasConfig>;
  /** Content renderers keyed by custom node `type`. Built-in types are reserved. */
  nodeRenderers?: CustomNodeRenderers;
  /** Canvas theme; when omitted, inherits the surrounding theme. */
  theme?: 'light' | 'dark';
  /** Show a theme toggle in the bottom-right corner. */
  showThemeToggle?: boolean;
  onThemeChange?: (theme: 'light' | 'dark') => void;
  children?: React.ReactNode;
}

export interface NodeComponentProps {
  node: GenericNode;
  isSelected: boolean;
  isActive: boolean;
  isEditing: boolean;
  isDragging: boolean;
  /** Zero-based position in the document's back-to-front node order. */
  layerIndex?: number;
  /** Total node count, used to place selected and dragged nodes above peers. */
  layerCount?: number;
  /** Overrides whether a second click enters editing mode. */
  editable?: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
}

export interface EdgeComponentProps {
  edge: Edge;
  fromNode: GenericNode | undefined;
  toNode: GenericNode | undefined;
  visualMetrics?: EdgeVisualMetrics;
}
