import type { Edge, GenericNode } from '@trbn/jsoncanvas';

const PASTE_OFFSET = 40;

export interface CanvasClipboardPayload {
  nodes: GenericNode[];
  edges: Edge[];
  pasteCount: number;
}

export interface CanvasPasteResult {
  pastedNodes: GenericNode[];
  pastedEdges: Edge[];
  selectedNodeIds: string[];
  selectedNodeId: string | null;
  clipboard: CanvasClipboardPayload;
}

export function createClipboardPayload(
  nodes: GenericNode[],
  edges: Edge[],
  selectedNodeIds: string[]
): CanvasClipboardPayload | null {
  const selectedIds = new Set(selectedNodeIds);
  if (!selectedIds.size) return null;
  const selectedNodes = nodes.filter(node => selectedIds.has(node.id));
  if (!selectedNodes.length) return null;
  return {
    nodes: selectedNodes,
    edges: edges.filter(
      edge => selectedIds.has(edge.fromNode) && selectedIds.has(edge.toNode)
    ),
    pasteCount: 0,
  };
}

export function createPasteResult(
  payload: CanvasClipboardPayload
): CanvasPasteResult | null {
  if (!payload.nodes.length) return null;
  const pasteCount = payload.pasteCount + 1;
  const offset = PASTE_OFFSET * pasteCount;
  const idMap = new Map<string, string>();
  const copiedNodes = payload.nodes.map(node => {
    const id = crypto.randomUUID();
    idMap.set(node.id, id);
    return { ...node, id, x: node.x + offset, y: node.y + offset };
  });
  const copiedEdges = payload.edges.flatMap(edge => {
    const fromNode = idMap.get(edge.fromNode);
    const toNode = idMap.get(edge.toNode);
    return fromNode && toNode
      ? [
          {
            ...edge,
            id: crypto.randomUUID(),
            fromNode,
            toNode,
          },
        ]
      : [];
  });
  const selectedNodeIds = copiedNodes.map(node => node.id);
  return {
    pastedNodes: copiedNodes,
    pastedEdges: copiedEdges,
    selectedNodeIds,
    selectedNodeId: selectedNodeIds[selectedNodeIds.length - 1] ?? null,
    clipboard: { nodes: payload.nodes, edges: payload.edges, pasteCount },
  };
}
