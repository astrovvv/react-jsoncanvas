import { describe, expect, it } from 'vitest';
import {
  createEdgeId,
  getConnectDropEvent,
  getEdgeDropTarget,
  getOppositeEdgeSide,
  hasExceededEdgeDragThreshold,
} from './edgeInteraction';

function nodeElement(id: string, rect: Partial<DOMRect>): HTMLElement {
  return {
    id,
    dataset: { nodeId: id },
    getBoundingClientRect: () =>
      ({ left: 0, top: 0, right: 100, bottom: 80, ...rect }) as DOMRect,
  } as unknown as HTMLElement;
}

function containerWith(elements: HTMLElement[]): ParentNode {
  return {
    querySelectorAll: () => elements,
  } as unknown as ParentNode;
}

describe('hasExceededEdgeDragThreshold', () => {
  it('keeps a click below the drag threshold and starts a drag at the threshold', () => {
    const start = { x: 10, y: 20 };

    expect(hasExceededEdgeDragThreshold(start, { x: 12, y: 23 })).toBe(false);
    expect(hasExceededEdgeDragThreshold(start, { x: 14, y: 20 })).toBe(true);
  });
});

describe('getEdgeDropTarget', () => {
  it('finds the nearest side of a node under the pointer', () => {
    const container = containerWith([nodeElement('target', {})]);

    expect(getEdgeDropTarget(container, { x: 96, y: 40 })).toEqual({
      nodeId: 'target',
      side: 'right',
    });
  });

  it('does not resolve the fixed endpoint as a drop target', () => {
    const container = containerWith([nodeElement('fixed', {})]);

    expect(getEdgeDropTarget(container, { x: 96, y: 40 }, 'fixed')).toEqual({});
  });
});

describe('getOppositeEdgeSide', () => {
  it.each([
    ['left', 'right'],
    ['right', 'left'],
    ['top', 'bottom'],
    ['bottom', 'top'],
  ] as const)('maps %s to %s', (fromSide, toSide) => {
    expect(getOppositeEdgeSide(fromSide)).toBe(toSide);
  });
});

describe('createEdgeId', () => {
  it('does not return an existing document id', () => {
    const first = createEdgeId([]);

    expect(createEdgeId([first])).not.toBe(first);
  });
});

describe('getConnectDropEvent', () => {
  it('returns the final position and opposite node side after a drag', () => {
    expect(
      getConnectDropEvent(
        {
          fromNodeId: 'source',
          fromSide: 'left',
          startWorldX: 10,
          startWorldY: 20,
        },
        { x: 30, y: 40 },
        1
      )
    ).toEqual({
      fromNodeId: 'source',
      fromSide: 'left',
      position: { x: 30, y: 40 },
      toSide: 'right',
    });
  });

  it('ignores a pointer release below the drag threshold', () => {
    expect(
      getConnectDropEvent(
        {
          fromNodeId: 'source',
          fromSide: 'bottom',
          startWorldX: 10,
          startWorldY: 20,
        },
        { x: 12, y: 21 },
        1
      )
    ).toBeNull();
  });
});
