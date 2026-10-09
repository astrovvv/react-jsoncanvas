# React JSONCanvas

[![CI](https://github.com/astrovvv/react-jsoncanvas/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/astrovvv/react-jsoncanvas/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/astrovvv/react-jsoncanvas/branch/main/graph/badge.svg)](https://codecov.io/gh/astrovvv/react-jsoncanvas)
[![npm version](https://img.shields.io/npm/v/%40astrov%2Freact-jsoncanvas)](https://www.npmjs.com/package/@astrov/react-jsoncanvas)
[![Minified + gzip](https://img.shields.io/bundlephobia/minzip/%40astrov%2Freact-jsoncanvas)](https://bundlephobia.com/package/@astrov/react-jsoncanvas)
[![License: MIT](https://img.shields.io/github/license/astrovvv/react-jsoncanvas)](./LICENSE)

A React implementation of the JSONCanvas format renderer with interactive features including zoom, pan, drag-and-drop, and touch support.

## Features

- 🎨 **Full JSONCanvas Support** - Renders text, link, and group nodes with edges
- 🔍 **Interactive Zoom & Pan** - Mouse wheel zoom, keyboard shortcuts, touch gestures
- 🖱️ **Drag & Drop** - Move nodes around the canvas with mouse or touch
- 🧭 **Selection & Editing** - Marquee and multi-selection, resize, copy/paste, and delete
- ↩️ **History** - Undo and redo editor mutations
- 🗂️ **Deterministic Layers** - Persistent node ordering with undoable z-order commands
- 🔗 **Edge Editing** - Select, label, recolor, delete, create, and rewire connections
- ⚡ **Viewport Culling** - Skips off-screen nodes and edges on larger canvases
- 📱 **Touch Support** - Full mobile and tablet support with gestures
- ⌨️ **Keyboard Shortcuts** - Space for panning, Ctrl+scroll for zoom
- 🎯 **TypeScript** - Fully typed with comprehensive type definitions
- 🎛️ **Customizable** - Configurable colors, styles, and behavior
- 📦 **Lightweight** - Minimal dependencies, optimized bundle size

## Installation

```bash
npm install @astrov/react-jsoncanvas
```

## Interactive examples

Run `npm run dev:example` and open the local Vite page. The sidebar links to
separate scenes for text, links, custom nodes, all six node colors, groups and
background styles, edge anchors and endings, optional controls, a 1200-node
document with automatic panning, and three other animated performance scenarios.
The FPS panel can pause playback; switching scenes stops the previous animation.

Run `npm run build:example` to build the same gallery for deployment.

## Basic Usage

```tsx
import React from 'react';
import { Canvas } from '@astrov/react-jsoncanvas';
import { GenericNode, Edge } from '@trbn/jsoncanvas';
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

const edges: Edge[] = [
  {
    id: 'edge1',
    fromNode: 'node1',
    toNode: 'node2',
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

const {
  state,
  bringNodesToFront,
  bringNodesForward,
  sendNodesBackward,
  sendNodesToBack,
} = useCanvas();

bringNodesForward(state.selectedNodeIds);
```

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
import { Canvas } from '@astrov/react-jsoncanvas';

function App() {
  const handleNodeMove = (nodeId: string, position: { x: number; y: number }) => {
    console.log(`Node ${nodeId} moved to`, position);
  };

  const handleNodeSelect = (nodeId: string | null) => {
    console.log('Selected node:', nodeId);
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

| Prop | Type | Description |
|------|------|-------------|
| `nodes` | `GenericNode[]` | Initial nodes; changes after mount are not synchronized |
| `edges` | `Edge[]` | Initial edges; changes after mount are not synchronized |
| `className` | `string` | Additional CSS class |
| `style` | `React.CSSProperties` | Inline styles |
| `config` | `Partial<CanvasConfig>` | Configuration options |
| `nodeRenderers` | `CustomNodeRenderers` | Custom content renderers keyed by node type |
| `onNodeMove` | `(nodeId: string, position: Point) => void` | Called when a node is moved |
| `onNodeSelect` | `(nodeId: string \| null) => void` | Called when a node is selected |
| `onViewportChange` | `(viewport: ViewportState) => void` | Called when viewport changes |
| `onCanvasChange` | `(nodes: GenericNode[], edges: Edge[]) => void` | Called when canvas data changes |
| `onEdgeCreate` | `(edge: Edge) => void` | Called when an edge is created |
| `onConnectDrop` | `(event: ConnectDropEvent) => GenericNode \| null \| undefined` | Creates and connects a node when an edge is dropped on empty space |

### Configuration Options

```typescript
interface CanvasConfig {
  minScale: number;           // Minimum zoom level (default: 0.25)
  maxScale: number;           // Maximum zoom level (default: 3)
  zoomSpeed: number;          // Zoom step size (default: 0.3)
  touchThreshold: number;     // Touch drag threshold (default: 10)
  curveTightness: number;     // Edge curve tightness (default: 0.75)
  enableKeyboardShortcuts: boolean; // Enable keyboard shortcuts (default: true)
  enableTouch: boolean;       // Enable touch support (default: true)
  snapToGrid: boolean;        // Snap node changes to the grid (default: true)
  gridSize: number;           // Grid step in world units (default: 20)
}
```

### Control Components

- `ZoomControls` - Zoom in/out buttons with current zoom level
- `ViewportControls` - Fit to screen, reset zoom, reset viewport buttons  
- `ExportControls` - Export canvas data as JSON

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

## Touch Gestures

- **Single finger drag** - Pan around the canvas
- **Pinch** - Zoom in/out
- **Tap and drag node** - Move nodes around

## Styling

The library includes default styles, but you can customize the appearance using CSS custom properties:

```css
:root {
  /* Node colors */
  --canvas-color-red: #ff6b6b;
  --canvas-color-orange: #ffa726;
  --canvas-color-yellow: #ffeb3b;
  --canvas-color-green: #66bb6a;
  --canvas-color-cyan: #26c6da;
  --canvas-color-purple: #ab47bc;
  
  /* Edge styles */
  --canvas-edge-color: #000000;
  --canvas-edge-width: 2;
  
  /* Node styles */
  --canvas-node-border-radius: 8px;
  --canvas-node-background: #ffffff;
  --canvas-node-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
```

## TypeScript Support

This library is written in TypeScript and provides comprehensive type definitions. All JSONCanvas types are re-exported for convenience:

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


## Planned work

- render node header
- edge style improvements
- overall style enhancements
- smooth LERP zoom
