import type { Edge, GenericNode } from '@trbn/jsoncanvas';
import type { NodeLayerOperation } from '../types';

/**
 * Node array order is the document layer order: first is furthest back and
 * last is furthest forward.
 */
export function reorderNodesByLayer(
  nodes: GenericNode[],
  nodeIds: string[],
  operation: NodeLayerOperation
): GenericNode[] {
  const selectedIds = new Set(nodeIds);
  if (!selectedIds.size || !nodes.some(node => selectedIds.has(node.id))) {
    return nodes;
  }

  let reordered: GenericNode[];
  if (operation === 'bring-to-front' || operation === 'send-to-back') {
    const selected = nodes.filter(node => selectedIds.has(node.id));
    const unselected = nodes.filter(node => !selectedIds.has(node.id));
    reordered =
      operation === 'bring-to-front'
        ? [...unselected, ...selected]
        : [...selected, ...unselected];
  } else {
    reordered = [...nodes];
    if (operation === 'bring-forward') {
      for (let index = reordered.length - 2; index >= 0; index -= 1) {
        const current = reordered[index]!;
        const next = reordered[index + 1]!;
        if (selectedIds.has(current.id) && !selectedIds.has(next.id)) {
          reordered[index] = next;
          reordered[index + 1] = current;
        }
      }
    } else {
      for (let index = 1; index < reordered.length; index += 1) {
        const current = reordered[index]!;
        const previous = reordered[index - 1]!;
        if (selectedIds.has(current.id) && !selectedIds.has(previous.id)) {
          reordered[index] = previous;
          reordered[index - 1] = current;
        }
      }
    }
  }

  return reordered.every((node, index) => node === nodes[index])
    ? nodes
    : reordered;
}

/**
 * Edges connected to higher-layer nodes render later in the SVG. Edges
 * connected to the current selection render last while preserving a stable
 * order within equal ranks.
 */
export function orderEdgesByNodeLayer(
  edges: Edge[],
  nodes: GenericNode[],
  selectedNodeIds: string[]
): Edge[] {
  if (edges.length < 2) return edges;

  const nodeRanks = new Map(nodes.map((node, index) => [node.id, index]));
  const selectedIds = new Set(selectedNodeIds);
  const ranked = edges.map((edge, index) => ({
    edge,
    index,
    selected:
      selectedIds.has(edge.fromNode) || selectedIds.has(edge.toNode) ? 1 : 0,
    rank: Math.max(
      nodeRanks.get(edge.fromNode) ?? -1,
      nodeRanks.get(edge.toNode) ?? -1
    ),
  }));

  ranked.sort(
    (left, right) =>
      left.selected - right.selected ||
      left.rank - right.rank ||
      left.index - right.index
  );

  const ordered = ranked.map(item => item.edge);
  return ordered.every((edge, index) => edge === edges[index])
    ? edges
    : ordered;
}
