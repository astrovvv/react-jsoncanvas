import type { GenericNode } from '@trbn/jsoncanvas';
import type { CustomNodeDefinition, CustomNodeRenderers } from '../types';

const BUILT_IN_NODE_TYPES = new Set(['text', 'link', 'group']);

export function getNodeType(node: GenericNode): string | undefined {
  if (!('type' in node) || typeof node.type !== 'string') return undefined;
  return node.type;
}

export function getCustomNodeDefinition(
  node: GenericNode,
  nodeRenderers: CustomNodeRenderers | undefined
): CustomNodeDefinition | undefined {
  const nodeType = getNodeType(node);
  if (!nodeType || BUILT_IN_NODE_TYPES.has(nodeType)) return undefined;
  return nodeRenderers?.[nodeType];
}

/**
 * Preserves a custom node's concrete type while erasing it for registry
 * storage. Runtime dispatch restores the definition by the node's `type`.
 */
export function defineCustomNode<TNode extends GenericNode>(
  definition: CustomNodeDefinition<TNode>
): CustomNodeDefinition {
  return definition as unknown as CustomNodeDefinition;
}
