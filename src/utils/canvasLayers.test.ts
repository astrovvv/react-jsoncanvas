import { describe, expect, it } from 'vitest';
import type { Edge, GenericNode } from '@trbn/jsoncanvas';
import { orderEdgesByNodeLayer, reorderNodesByLayer } from './canvasLayers';

const nodes: GenericNode[] = ['a', 'b', 'c', 'd'].map((id, index) => ({
  id,
  x: index * 20,
  y: 0,
  width: 100,
  height: 60,
}));

const ids = (items: GenericNode[]) => items.map(item => item.id);

describe('canvas layers', () => {
  it('moves node groups while preserving their relative order', () => {
    expect(
      ids(reorderNodesByLayer(nodes, ['a', 'c'], 'bring-to-front'))
    ).toEqual(['b', 'd', 'a', 'c']);
    expect(ids(reorderNodesByLayer(nodes, ['b', 'd'], 'send-to-back'))).toEqual(
      ['b', 'd', 'a', 'c']
    );
  });

  it('moves selected layers one step without splitting adjacent groups', () => {
    expect(
      ids(reorderNodesByLayer(nodes, ['b', 'c'], 'bring-forward'))
    ).toEqual(['a', 'd', 'b', 'c']);
    expect(
      ids(reorderNodesByLayer(nodes, ['b', 'c'], 'send-backward'))
    ).toEqual(['b', 'c', 'a', 'd']);
  });

  it('returns the original array when an operation cannot change its order', () => {
    expect(reorderNodesByLayer(nodes, ['d'], 'bring-to-front')).toBe(nodes);
    expect(reorderNodesByLayer(nodes, ['missing'], 'send-to-back')).toBe(nodes);
  });

  it('orders edges by endpoint layer and renders selected connections last', () => {
    const edges: Edge[] = [
      { id: 'selected', fromNode: 'a', toNode: 'b' },
      { id: 'high', fromNode: 'c', toNode: 'd' },
      { id: 'middle', fromNode: 'b', toNode: 'c' },
    ];

    expect(
      orderEdgesByNodeLayer(edges, nodes, ['a']).map(edge => edge.id)
    ).toEqual(['middle', 'high', 'selected']);
  });
});
