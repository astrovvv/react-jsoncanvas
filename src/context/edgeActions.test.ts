import { describe, expect, it, vi } from 'vitest';
import type { Edge, GenericNode } from '@trbn/jsoncanvas';
import { createEdgeActions } from './edgeActions';
import { createInitialCanvasState } from './canvasState';
import type { CanvasAction } from './canvasReducer';

const node = (id: string): GenericNode => ({
  id,
  type: 'text',
  text: id,
  x: 0,
  y: 0,
  width: 100,
  height: 60,
});

describe('edge actions', () => {
  it('creates a connected node once and reports the complete document', () => {
    const initial = createInitialCanvasState([node('a')]);
    const stateRef = { current: initial };
    const dispatch = vi.fn<(action: CanvasAction) => void>();
    const onCanvasChange = vi.fn();
    const onEdgeCreate = vi.fn();
    const actions = createEdgeActions({
      state: initial,
      stateRef,
      dispatch,
      events: { onCanvasChange, onEdgeCreate },
    });
    const edge: Edge = { id: 'ab', fromNode: 'a', toNode: 'b' };

    actions.finishConnectWithNode(node('b'), edge);
    actions.finishConnectWithNode(node('b'), edge);

    expect(dispatch).toHaveBeenCalledWith({
      type: 'FINISH_CONNECT_WITH_NODE',
      payload: { node: node('b'), edge },
    });
    expect(dispatch).toHaveBeenLastCalledWith({ type: 'CANCEL_CONNECT' });
    expect(onEdgeCreate).toHaveBeenCalledOnce();
    expect(onCanvasChange).toHaveBeenCalledOnce();
    expect(onCanvasChange).toHaveBeenCalledWith([node('a'), node('b')], [edge]);
  });

  it('rewires an endpoint and reports the updated edge', () => {
    const edge: Edge = {
      id: 'ab',
      fromNode: 'a',
      toNode: 'b',
      fromSide: 'right',
      label: 'link',
    };
    const initial = createInitialCanvasState(
      [node('a'), node('b'), node('c')],
      [edge]
    );
    const stateRef = { current: initial };
    const dispatch = vi.fn<(action: CanvasAction) => void>();
    const onCanvasChange = vi.fn();
    const actions = createEdgeActions({
      state: initial,
      stateRef,
      dispatch,
      events: { onCanvasChange },
    });

    actions.startRewire('ab', 'to');
    actions.updateRewireHover('c', 'left');
    actions.finishRewire();

    expect(stateRef.current.edges).toEqual([
      { ...edge, toNode: 'c', toSide: 'left' },
    ]);
    expect(stateRef.current.rewiring).toBeNull();
    expect(dispatch).toHaveBeenLastCalledWith({ type: 'FINISH_REWIRE' });
    expect(onCanvasChange).toHaveBeenCalledWith(
      initial.nodes,
      stateRef.current.edges
    );
  });
});
