# React JSONCanvas

[![CI](https://github.com/astrovvv/react-jsoncanvas/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/astrovvv/react-jsoncanvas/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/astrovvv/react-jsoncanvas/branch/main/graph/badge.svg)](https://codecov.io/gh/astrovvv/react-jsoncanvas)
[![npm version](https://img.shields.io/npm/v/%40astrov%2Freact-jsoncanvas)](https://www.npmjs.com/package/@astrov/react-jsoncanvas)
[![Minified + gzip](https://img.shields.io/bundlephobia/minzip/%40astrov%2Freact-jsoncanvas)](https://bundlephobia.com/package/@astrov/react-jsoncanvas)
[![License: MIT](https://img.shields.io/github/license/astrovvv/react-jsoncanvas)](./LICENSE)

An interactive React canvas for text, links, groups, and custom nodes, using
the JSON Canvas document structure.

## Features

- 🎨 **Built-in Nodes** - Text, link, and group nodes with connecting edges
- 🔍 **Interactive Zoom & Pan** - Ctrl/Cmd + wheel zoom, keyboard shortcuts, touch pan and pinch zoom
- 🖱️ **Drag & Drop** - Move nodes around the canvas with a mouse
- 🧭 **Selection & Editing** - Marquee and multi-selection, resize, copy/paste, and delete
- ↩️ **History** - Undo and redo editor mutations
- 🗂️ **Deterministic Layers** - Persistent node ordering with undoable z-order commands
- 🔗 **Edge Editing** - Select, label, recolor, delete, create, and rewire connections
- ⚡ **Viewport Culling** - Skips off-screen nodes and edges on larger canvases
- ⌨️ **Keyboard Shortcuts** - Space for panning, Ctrl+scroll for zoom
- 🎯 **TypeScript** - Included type declarations
- 🎛️ **Custom Nodes** - Register your own React components with `nodeRenderers`

## JSON Canvas compatibility

The library supports part of the [JSON Canvas 1.0 specification](https://jsoncanvas.org/spec/1.0/).
Built-in renderers cover `text`, `link`, and `group` nodes. Current limitations:

- There is no built-in `file` renderer. Register one through `nodeRenderers`
  to display images, attachments, or other file content; your application must
  resolve file paths and subpaths.
- The built-in text renderer inserts `text` as HTML, without sanitization. It
  does not parse the specification's Markdown syntax. Use trusted or sanitized
  content, or register a separate custom node type for your own text renderer.
- Node and edge colors support the six preset values (`"1"`–`"6"`), not hex colors.
- Edges render an end arrow only when `toEnd: 'arrow'` is explicit. The
  specification's default end arrow and `fromEnd` arrows are not implemented.

Custom components can add missing node content renderers. The built-in names
`text`, `link`, and `group` cannot be overridden through `nodeRenderers`; a custom
Markdown renderer needs its own node type and application-side conversion when
importing or exporting standard text nodes. Custom node renderers do not change
Canvas's edge rendering or interaction handling.

## Installation

```bash
npm install @astrov/react-jsoncanvas
```

## Interactive examples

The gallery lives in this repository, not in the installed npm package. To run it:

```bash
git clone https://github.com/astrovvv/react-jsoncanvas.git
cd react-jsoncanvas
npm ci
npm run dev:example
```

Open the local URL printed by Vite. The sidebar links to
separate scenes for text, links, custom nodes, all six node colors, groups and
background styles, edge anchors and endings, optional controls, a 1200-node
document with automatic panning, and three other animated performance scenarios.
The FPS panel can pause playback; switching scenes stops the previous animation.

Run `npm run build:example` to build the same gallery for deployment.

## Basic Usage

```tsx
import React from 'react';
import {
  Canvas,
  type GenericNode,
  type JSONCanvasEdge,
} from '@astrov/react-jsoncanvas';
import '@astrov/react-jsoncanvas/styles';

const nodes: GenericNode[] = [
  {
    id: 'node1',
    type: 'text',
    text: 'Hello World!',
    x: 100,
    y: 100,
    width: 200,
    height: 100,
  },
  {
    id: 'node2',
    type: 'text',
    text: 'Another node',
    x: 400,
    y: 200,
    width: 180,
    height: 80,
  },
];

const edges: JSONCanvasEdge[] = [
  {
    id: 'edge1',
    fromNode: 'node1',
    fromSide: 'right',
    toNode: 'node2',
    toSide: 'left',
    toEnd: 'arrow',
  },
];

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas nodes={nodes} edges={edges} />
    </div>
  );
}
```

`nodes` and `edges` initialize the editor document. Canvas owns subsequent
changes internally. To replace the whole document, remount it with a new key:

```tsx
<Canvas key={documentId} nodes={nodes} edges={edges} />
```

### Node Layer Order

The `nodes` array is ordered from back to front: the first node is the lowest
layer and the last node is the highest. Dragging one or more selected nodes
moves that group to the front while preserving its internal order. The layer
change and position change are stored as one undoable history entry.

Components rendered inside `Canvas` can use the layer commands from
`useCanvas()`:

```tsx
import { useCanvas } from '@astrov/react-jsoncanvas';

function BringForwardButton() {
  const { state, bringNodesForward } = useCanvas();

  return (
    <button onClick={() => bringNodesForward(state.selectedNodeIds)}>
      Bring forward
    </button>
  );
}
```

Other layer commands are `bringNodesToFront`, `sendNodesBackward`, and
`sendNodesToBack`; each accepts an array of node IDs.

Edges remain below nodes. Within the edge SVG, connections follow the layer of
their highest endpoint, and connections to selected nodes render last.

### Edge Editing

Click an edge to select it and show its editing toolbar. The toolbar can delete
the edge, choose a JSONCanvas color, or edit its label. Clicking an already
selected edge also switches its label directly into editing mode.

Dragging an edge starts endpoint rewiring only after the pointer moves beyond
the click threshold. A click without movement never detaches the edge.

### Custom Nodes

Register custom node content with `nodeRenderers`. Canvas keeps ownership of
the wrapper, so custom nodes automatically participate in selection, dragging,
resizing, layer ordering, and edge creation.

```tsx
import {
  Canvas,
  defineCustomNode,
  type CustomNodeRendererProps,
  type GenericNode,
} from '@astrov/react-jsoncanvas';

interface StatusNode extends GenericNode {
  type: 'status';
  label: string;
  status: 'todo' | 'done';
}

function StatusContent({
  node,
  isEditing,
  updateNode,
  setEditing,
}: CustomNodeRendererProps<StatusNode>) {
  if (isEditing) {
    return (
      <input
        autoFocus
        defaultValue={node.label}
        onBlur={event => {
          updateNode({ label: event.currentTarget.value });
          setEditing(false);
        }}
      />
    );
  }

  return <strong>{node.status}: {node.label}</strong>;
}

const nodeRenderers = {
  status: defineCustomNode<StatusNode>({
    component: StatusContent,
    editable: true,
    className: 'status-node',
  }),
};

<Canvas nodes={nodes} edges={edges} nodeRenderers={nodeRenderers} />;
```

The `text`, `link`, and `group` type names are reserved for built-ins. Missing
registrations continue to use the unknown-node fallback renderer.

To create a custom node when a connection is dropped on empty canvas space,
return the node from `onConnectDrop`. The callback receives the world-space
drop position and the side of the new node that must face the source anchor.
The mapping is `left -> right`, `right -> left`, `top -> bottom`, and
`bottom -> top`.

```tsx
import type { EdgeSide, Point } from '@astrov/react-jsoncanvas';

const NODE_WIDTH = 220;
const NODE_HEIGHT = 120;

function getNodePosition(position: Point, toSide: EdgeSide) {
  return {
    x:
      toSide === 'left'
        ? position.x
        : toSide === 'right'
          ? position.x - NODE_WIDTH
          : position.x - NODE_WIDTH / 2,
    y:
      toSide === 'top'
        ? position.y
        : toSide === 'bottom'
          ? position.y - NODE_HEIGHT
          : position.y - NODE_HEIGHT / 2,
  };
}

<Canvas
  nodes={nodes}
  edges={edges}
  nodeRenderers={nodeRenderers}
  onConnectDrop={({ position, toSide }) => ({
    id: crypto.randomUUID(),
    type: 'status',
    label: 'New status',
    status: 'todo',
    ...getNodePosition(position, toSide),
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
  })}
/>
```

The node and its connecting edge are added as one undoable document change.
Returning `null` or `undefined` keeps the default behavior and cancels the
unfinished connection.

## Advanced Usage

### With Controls

```tsx
import React from 'react';
import { 
  Canvas, 
  ZoomControls, 
  ViewportControls, 
  ExportControls 
} from '@astrov/react-jsoncanvas';

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas nodes={nodes} edges={edges}>
        {/* Controls positioned absolutely */}
        <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}>
          <ZoomControls showLabels />
        </div>
        <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 10 }}>
          <ViewportControls showLabels />
        </div>
        <div style={{ position: 'absolute', bottom: 16, right: 16, zIndex: 10 }}>
          <ExportControls showLabels />
        </div>
      </Canvas>
    </div>
  );
}
```

Each control button can be enabled independently when mounting its group:

```tsx
<Canvas nodes={nodes} edges={edges} theme="dark" showThemeToggle>
  <ZoomControls showZoomIn showZoomOut={false} />
  <ViewportControls showFitToScreen showResetView={false} />
  <ExportControls showJson showCopy={false} showDownload />
</Canvas>
```

The percentage between the zoom buttons resets zoom to 100% without moving
the viewport center. `theme` accepts `"light"` or `"dark"` and can be changed
by the optional theme button; `onThemeChange` reports button selections. With
no explicit theme or toggle, the canvas can inherit its host application's
theme. Controls remain optional children of `Canvas`.

### With Event Handlers

```tsx
import React from 'react';
import { Canvas, type Point, type ViewportState } from '@astrov/react-jsoncanvas';

function App() {
  const handleNodeMove = (nodeId: string, position: Point) => {
    console.log(`Node ${nodeId} moved to`, position);
  };

  const handleNodeSelect = (nodeId: string | null, nodeIds?: string[]) => {
    console.log('Selected node:', nodeId, 'Selection:', nodeIds);
  };

  const handleViewportChange = (viewport: ViewportState) => {
    console.log('Viewport changed:', viewport);
  };

  return (
    <Canvas
      nodes={nodes}
      edges={edges}
      onNodeMove={handleNodeMove}
      onNodeSelect={handleNodeSelect}
      onViewportChange={handleViewportChange}
    />
  );
}
```

### Custom Configuration

```tsx
import React from 'react';
import { Canvas } from '@astrov/react-jsoncanvas';

const config = {
  minScale: 0.1,
  maxScale: 3.0,
  zoomSpeed: 0.2,
  enableTouch: true,
  enableKeyboardShortcuts: true,
};

function App() {
  return (
    <Canvas
      nodes={nodes}
      edges={edges}
      config={config}
    />
  );
}
```

## API Reference

### Canvas Component

`nodes` and `edges` are required. All other props are optional. `JSONCanvasEdge`
is the exported edge data type; `Edge` is the React component.

| Prop | Type | Description |
|------|------|-------------|
| `nodes` | `GenericNode[]` | Initial nodes; changes after mount are not synchronized |
| `edges` | `JSONCanvasEdge[]` | Initial edges; changes after mount are not synchronized |
| `className` | `string` | Additional CSS class |
| `style` | `React.CSSProperties` | Inline styles |
| `config` | `Partial<CanvasConfig>` | Configuration options |
| `nodeRenderers` | `CustomNodeRenderers` | Custom content renderers keyed by node type |
| `theme` | `'light' \| 'dark'` | Sets the theme; the optional toggle can change it. When omitted, no explicit theme is applied |
| `showThemeToggle` | `boolean` | Shows a theme button; defaults to `false` |
| `onThemeChange` | `(theme: 'light' \| 'dark') => void` | Called when the theme button is used |
| `children` | `React.ReactNode` | Controls or other components rendered inside the Canvas provider |
| `onNodeMove` | `(nodeId: string, position: Point) => void` | Called when a node is moved |
| `onNodeSelect` | `(nodeId: string \| null, nodeIds?: string[]) => void` | Reports the selected node and, when supplied, the full selection |
| `onViewportChange` | `(viewport: ViewportState) => void` | Called when viewport changes |
| `onCanvasChange` | `(nodes: GenericNode[], edges: JSONCanvasEdge[]) => void` | Reports document changes; use it to persist editor data |
| `onEdgeCreate` | `(edge: JSONCanvasEdge) => void` | Called when an edge is created |
| `onConnectDrop` | `(event: ConnectDropEvent) => GenericNode \| null \| undefined` | Creates and connects a node when an edge is dropped on empty space |

### Configuration Options

```typescript
interface CanvasConfig {
  minScale: number;           // Minimum zoom level (default: 0.25)
  maxScale: number;           // Maximum zoom level (default: 3)
  zoomSpeed: number;          // Zoom step size (default: 0.3)
  touchThreshold: number;     // Touch drag activation threshold; movement is not yet implemented (default: 10)
  curveTightness: number;     // Edge curve tightness (default: 0.75)
  enableKeyboardShortcuts: boolean; // Enable keyboard shortcuts (default: true)
  enableTouch: boolean;       // Enable current touch handlers: pan, pinch, node selection (default: true)
  snapToGrid: boolean;        // Snap mouse drag and resize to the grid (default: true)
  gridSize: number;           // Grid step in world units (default: 20)
}
```

### Control Components

All three controls accept `className?: string` and `showLabels?: boolean`
(`false` by default) and must be rendered inside `Canvas` or `CanvasProvider`.

| Component | Actions | Additional props |
|-----------|---------|------------------|
| `ZoomControls` | Zoom in/out; click the percentage to reset zoom to 100% | `showZoomIn`, `showZoomOut` (both default to `true`) |
| `ViewportControls` | Fit currently rendered nodes to the viewport; reset scale to 1 and pan offsets to 0 | `showFitToScreen`, `showResetView` (both default to `true`) |
| `ExportControls` | Show JSON, copy JSON to the system clipboard, download JSON | `showJson`, `showCopy`, `showDownload` (all default to `true`); `filename` (default: `'canvas.json'`) |

## Keyboard Shortcuts

- **Space + Drag** - Pan around the canvas
- **Ctrl/Cmd + Wheel** - Zoom in/out
- **Ctrl/Cmd + 0** - Reset zoom to 100%
- **Ctrl/Cmd + =** - Zoom in
- **Ctrl/Cmd + -** - Zoom out
- **Ctrl/Cmd + Z** - Undo
- **Ctrl/Cmd + Shift + Z** or **Ctrl/Cmd + Y** - Redo
- **Ctrl/Cmd + C / V / D** - Copy, paste, or duplicate selected nodes
- **Delete / Backspace** - Delete selected nodes or the selected edge

Node copy/paste uses an internal clipboard for each Canvas instance, not the
system clipboard. `ExportControls` can copy the document JSON to the system
clipboard separately.

## Touch Gestures

- **Single finger drag on the background** - Pan around the canvas
- **Pinch** - Zoom in/out
- **Tap a node** - Select it

Touch node dragging, resizing, and connection editing are not implemented.
These gestures do not provide the full desktop editing experience.

## TypeScript Support

The package includes TypeScript declarations and re-exports selected JSON Canvas
types, including `GenericNode`, `JSONCanvasEdge`, `EdgeSide`, `EdgeEnd`,
`JSONCanvasTextNode`, `JSONCanvasLinkNode`, and `JSONCanvasGroupNode`:

```typescript
import type {
  GenericNode, 
  JSONCanvasEdge,
  ViewportState,
  CanvasConfig 
} from '@astrov/react-jsoncanvas';
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
