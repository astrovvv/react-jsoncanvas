import { describe, expect, it } from 'vitest';
import type { Edge, GenericNode } from '@trbn/jsoncanvas';
import { createClipboardPayload, createPasteResult } from './canvasClipboard';

const node = (id: string): GenericNode => ({
  id,
  x: 0,
  y: 0,
  width: 100,
  height: 60,
});

describe('canvas clipboard', () => {
  it('creates UUID ids for consecutive pastes', () => {
    const edge: Edge = { id: 'ab', fromNode: 'a', toNode: 'b' };
    const payload = createClipboardPayload(
      [node('a'), node('b')],
      [edge],
      ['a', 'b']
    );
    expect(payload).not.toBeNull();

    const first = createPasteResult(payload!);
    const second = createPasteResult(payload!);
    const continued = createPasteResult(first!.clipboard);

    expect(first!.pastedNodes.map(item => item.id)).not.toEqual(
      second!.pastedNodes.map(item => item.id)
    );
    expect(first!.pastedEdges[0]?.id).not.toBe(second!.pastedEdges[0]?.id);
    expect(continued!.pastedNodes[0]?.x).toBe(80);
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(first!.pastedNodes.every(item => uuid.test(item.id))).toBe(true);
    expect(first!.pastedEdges.every(item => uuid.test(item.id))).toBe(true);
  });
});
