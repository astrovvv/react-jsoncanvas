import { describe, expect, it } from 'vitest';
import type { Edge, GenericNode } from '@trbn/jsoncanvas';
import { canvasReducer, createInitialCanvasState } from './CanvasContext';

const node = (id: string, x = 0): GenericNode => ({
  id,
  type: 'text',
  text: id,
  x,
  y: 0,
  width: 100,
  height: 60,
});

describe('canvasReducer', () => {
  it('rejects viewport updates that would make the scale or pan invalid', () => {
    const initial = createInitialCanvasState();
    for (const payload of [
      { scale: -1 },
      { scale: 0 },
      { scale: NaN },
      { scale: Infinity },
      { panOffsetX: Infinity },
      { panOffsetY: NaN },
    ]) {
      expect(canvasReducer(initial, { type: 'UPDATE_VIEWPORT', payload })).toBe(
        initial
      );
    }
  });

  it('selects an edge and clears node interaction state', () => {
    const edge: Edge = { id: 'ab', fromNode: 'a', toNode: 'b' };
    const selectedNode = canvasReducer(
      createInitialCanvasState([node('a'), node('b')], [edge]),
      { type: 'SELECT_NODE', payload: { nodeIds: ['a'], primaryId: 'a' } }
    );
    const editingNode = canvasReducer(selectedNode, {
      type: 'SET_EDITING_NODE',
      payload: 'a',
    });

    const selectedEdge = canvasReducer(editingNode, {
      type: 'SELECT_EDGE',
      payload: 'ab',
    });

    expect(selectedEdge.selectedEdgeId).toBe('ab');
    expect(selectedEdge.editingEdgeId).toBeNull();
    expect(selectedEdge.selectedNodeIds).toEqual([]);
    expect(selectedEdge.activeNodeId).toBeNull();
    expect(selectedEdge.editingNodeId).toBeNull();
    expect(selectedEdge.history.past).toEqual([]);
  });

  it('updates and removes a selected edge with undo history', () => {
    const edge: Edge = { id: 'ab', fromNode: 'a', toNode: 'b' };
    const selected = canvasReducer(
      createInitialCanvasState([node('a'), node('b')], [edge]),
      { type: 'SELECT_EDGE', payload: 'ab' }
    );
    const updated = canvasReducer(selected, {
      type: 'UPDATE_EDGE',
      payload: { id: 'ab', updates: { label: 'Depends on', color: 4 } },
    });

    expect(updated.edges[0]).toMatchObject({
      id: 'ab',
      label: 'Depends on',
      color: 4,
    });
    expect(updated.history.past).toHaveLength(1);

    const removed = canvasReducer(updated, {
      type: 'REMOVE_EDGE',
      payload: 'ab',
    });
    expect(removed.edges).toEqual([]);
    expect(removed.selectedEdgeId).toBeNull();
    expect(removed.editingEdgeId).toBeNull();
    expect(removed.history.past).toHaveLength(2);

    const restored = canvasReducer(removed, { type: 'UNDO' });
    expect(restored.edges[0]?.label).toBe('Depends on');
  });

  it('adds a connected node and edge as one undoable document change', () => {
    const initial = canvasReducer(createInitialCanvasState([node('a')]), {
      type: 'START_CONNECT',
      payload: { fromNodeId: 'a', fromSide: 'right' },
    });
    const connectedNode = node('b', 300);
    const edge: Edge = {
      id: 'a-b',
      fromNode: 'a',
      fromSide: 'right',
      toNode: 'b',
      toSide: 'left',
      toEnd: 'arrow',
    };

    const connected = canvasReducer(initial, {
      type: 'FINISH_CONNECT_WITH_NODE',
      payload: { node: connectedNode, edge },
    });

    expect(connected.nodes).toEqual([node('a'), connectedNode]);
    expect(connected.edges).toEqual([edge]);
    expect(connected.connecting).toBeNull();
    expect(connected.history.past).toHaveLength(1);

    const undone = canvasReducer(connected, { type: 'UNDO' });
    expect(undone.nodes).toEqual([node('a')]);
    expect(undone.edges).toEqual([]);
  });

  it('keeps the initial connection point while the pointer moves', () => {
    const started = canvasReducer(createInitialCanvasState([node('a')]), {
      type: 'START_CONNECT',
      payload: { fromNodeId: 'a', fromSide: 'right' },
    });
    const positioned = canvasReducer(started, {
      type: 'UPDATE_CONNECT_POS',
      payload: { x: 100, y: 50 },
    });
    const moved = canvasReducer(positioned, {
      type: 'UPDATE_CONNECT_POS',
      payload: { x: 180, y: 90 },
    });

    expect(moved.connecting).toMatchObject({
      startWorldX: 100,
      startWorldY: 50,
      toLocalX: 180,
      toLocalY: 90,
    });
  });

  it('records a node update and restores it with undo and redo', () => {
    const initial = createInitialCanvasState([node('a')]);
    const updated = canvasReducer(initial, {
      type: 'UPDATE_NODE',
      payload: { id: 'a', updates: { x: 80 } },
    });

    expect(updated.nodes[0]?.x).toBe(80);
    expect(updated.history.past).toHaveLength(1);

    const undone = canvasReducer(updated, { type: 'UNDO' });
    expect(undone.nodes[0]?.x).toBe(0);
    expect(undone.history.future).toHaveLength(1);

    const redone = canvasReducer(undone, { type: 'REDO' });
    expect(redone.nodes[0]?.x).toBe(80);
  });

  it('removes incident edges and clears node interaction state', () => {
    const edge: Edge = { id: 'ab', fromNode: 'a', toNode: 'b' };
    const selected = canvasReducer(
      createInitialCanvasState([node('a'), node('b')], [edge]),
      { type: 'SELECT_NODE', payload: { nodeIds: ['a'], primaryId: 'a' } }
    );
    const active = canvasReducer(selected, {
      type: 'SET_EDITING_NODE',
      payload: 'a',
    });
    const removed = canvasReducer(active, {
      type: 'REMOVE_NODE',
      payload: 'a',
    });

    expect(removed.nodes.map(item => item.id)).toEqual(['b']);
    expect(removed.edges).toEqual([]);
    expect(removed.selectedNodeIds).toEqual([]);
    expect(removed.activeNodeId).toBeNull();
    expect(removed.editingNodeId).toBeNull();
  });

  it('does not record transient batched drag updates', () => {
    const initial = createInitialCanvasState([node('a')]);
    const moved = canvasReducer(initial, {
      type: 'BATCH_UPDATE_NODES',
      payload: {
        patches: [{ id: 'a', updates: { x: 20 } }],
        recordHistory: false,
      },
    });

    expect(moved.nodes[0]?.x).toBe(20);
    expect(moved.history.past).toEqual([]);
  });

  it('does not restore active or editing state with document history', () => {
    const selected = canvasReducer(createInitialCanvasState([node('a')]), {
      type: 'SELECT_NODE',
      payload: { nodeIds: ['a'], primaryId: 'a' },
    });
    const editing = canvasReducer(selected, {
      type: 'SET_EDITING_NODE',
      payload: 'a',
    });
    const updated = canvasReducer(editing, {
      type: 'UPDATE_NODE',
      payload: { id: 'a', updates: { x: 40 } },
    });
    const blurred = canvasReducer(updated, {
      type: 'SET_EDITING_NODE',
      payload: null,
    });

    const undone = canvasReducer(blurred, { type: 'UNDO' });

    expect(undone.nodes[0]?.x).toBe(0);
    expect(undone.activeNodeId).toBeNull();
    expect(undone.editingNodeId).toBeNull();
  });

  it('appends consecutive paste actions to the current reducer state', () => {
    const initial = createInitialCanvasState([node('a')]);
    const first = canvasReducer(initial, {
      type: 'PASTE_DOCUMENT',
      payload: {
        nodes: [node('copy-1', 40)],
        edges: [],
        selectedNodeIds: ['copy-1'],
        selectedNodeId: 'copy-1',
      },
    });
    const second = canvasReducer(first, {
      type: 'PASTE_DOCUMENT',
      payload: {
        nodes: [node('copy-2', 80)],
        edges: [],
        selectedNodeIds: ['copy-2'],
        selectedNodeId: 'copy-2',
      },
    });

    expect(second.nodes.map(item => item.id)).toEqual([
      'a',
      'copy-1',
      'copy-2',
    ]);
    expect(second.history.past).toHaveLength(2);
  });

  it('records layer ordering and restores it with undo', () => {
    const initial = createInitialCanvasState([node('a'), node('b'), node('c')]);
    const reordered = canvasReducer(initial, {
      type: 'REORDER_NODES',
      payload: {
        nodeIds: ['a'],
        operation: 'bring-to-front',
      },
    });

    expect(reordered.nodes.map(item => item.id)).toEqual(['b', 'c', 'a']);
    expect(reordered.history.past).toHaveLength(1);

    const undone = canvasReducer(reordered, { type: 'UNDO' });
    expect(undone.nodes.map(item => item.id)).toEqual(['a', 'b', 'c']);
  });

  it('does not create a separate history entry for drag layer ordering', () => {
    const initial = createInitialCanvasState([node('a'), node('b')]);
    const reordered = canvasReducer(initial, {
      type: 'REORDER_NODES',
      payload: {
        nodeIds: ['a'],
        operation: 'bring-to-front',
        recordHistory: false,
      },
    });

    expect(reordered.nodes.map(item => item.id)).toEqual(['b', 'a']);
    expect(reordered.history.past).toEqual([]);
  });
});
