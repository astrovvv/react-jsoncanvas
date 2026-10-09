import { describe, expect, it } from 'vitest';
import type { GenericNode } from '@trbn/jsoncanvas';
import type { CustomNodeRenderers } from '../types';
import {
  defineCustomNode,
  getCustomNodeDefinition,
  getNodeType,
} from './customNodes';

interface CustomNode extends GenericNode {
  type: 'custom';
  label: string;
}

const customNode: CustomNode = {
  id: 'custom-1',
  type: 'custom',
  label: 'Custom',
  x: 0,
  y: 0,
  width: 100,
  height: 60,
};

const definition = defineCustomNode<CustomNode>({
  component: ({ node }) => node.label,
  editable: true,
  className: 'custom-node',
});

const renderers: CustomNodeRenderers = { custom: definition };

describe('custom node utilities', () => {
  it('resolves a registered custom node definition', () => {
    expect(getNodeType(customNode)).toBe('custom');
    expect(getCustomNodeDefinition(customNode, renderers)).toBe(definition);
  });

  it('keeps built-in node types reserved', () => {
    const textNode: GenericNode = {
      ...customNode,
      id: 'text-1',
      type: 'text',
    };
    expect(
      getCustomNodeDefinition(textNode, { text: definition })
    ).toBeUndefined();
  });

  it('falls back when the type is missing or unregistered', () => {
    const untypedNode: GenericNode = {
      id: 'untyped',
      x: 0,
      y: 0,
      width: 100,
      height: 60,
    };
    expect(getCustomNodeDefinition(customNode, undefined)).toBeUndefined();
    expect(getCustomNodeDefinition(untypedNode, renderers)).toBeUndefined();
  });
});
