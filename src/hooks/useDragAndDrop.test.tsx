// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { CanvasProvider } from '../context/CanvasContext';
import { TextNode } from '../components/Nodes/TextNode';
import type { TextNode as TextNodeData } from '@trbn/jsoncanvas';
import { useCanvas } from './useCanvas';
import { useDragAndDrop } from './useDragAndDrop';

function DragProbe() {
  const { state } = useCanvas();
  const { handleMouseDown, handleMouseUp, handleMouseMove } = useDragAndDrop();
  return (
    <button
      data-dragging={state.isDragging}
      onMouseDown={event => handleMouseDown('node', event, { x: 0, y: 0 })}
      onMouseUp={handleMouseUp}
      onMouseMove={event =>
        handleMouseMove(event.nativeEvent as unknown as MouseEvent)
      }
    >
      Node
    </button>
  );
}

function EditableNodeProbe() {
  const { state } = useCanvas();
  const { handleMouseDown, handleMouseUp } = useDragAndDrop();
  const node = state.nodes[0] as TextNodeData;
  return (
    <div onMouseUp={handleMouseUp} data-text={node.text}>
      <TextNode
        node={node}
        isSelected={state.selectedNodeId === node.id}
        isActive={state.activeNodeId === node.id}
        isEditing={state.editingNodeId === node.id}
        isDragging={state.isDragging}
        onMouseDown={event =>
          handleMouseDown(node.id, event, { x: node.x, y: node.y })
        }
        onTouchStart={() => {}}
      />
    </div>
  );
}

describe('node editing gesture', () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeAll(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    container?.remove();
  });

  it('does not enter dragging mode on a stationary click', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root.render(
        <CanvasProvider
          initialNodes={[
            {
              id: 'node',
              type: 'text',
              text: 'edit me',
              x: 0,
              y: 0,
              width: 100,
              height: 60,
            },
          ]}
        >
          <DragProbe />
        </CanvasProvider>
      );
    });

    const button = container.querySelector('button')!;
    act(() => {
      button.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, button: 0 })
      );
    });
    expect(button.dataset.dragging).toBe('false');
    act(() => {
      button.dispatchEvent(
        new MouseEvent('mouseup', { bubbles: true, button: 0 })
      );
    });
    expect(button.dataset.dragging).toBe('false');
  });

  it('starts dragging after the pointer moves', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root.render(
        <CanvasProvider
          initialNodes={[
            {
              id: 'node',
              type: 'text',
              text: 'edit me',
              x: 0,
              y: 0,
              width: 100,
              height: 60,
            },
          ]}
        >
          <DragProbe />
        </CanvasProvider>
      );
    });
    const button = container.querySelector('button')!;

    act(() => {
      button.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, button: 0 })
      );
    });
    act(() => {
      button.dispatchEvent(
        new MouseEvent('mousemove', { bubbles: true, clientX: 20 })
      );
    });
    expect(button.dataset.dragging).toBe('true');
    act(() => {
      button.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    });
    expect(button.dataset.dragging).toBe('false');
  });

  it('enters text editing when a selected node is clicked again', () => {
    class ResizeObserverStub {
      observe() {}
      unobserve() {}
    }
    globalThis.ResizeObserver =
      ResizeObserverStub as unknown as typeof ResizeObserver;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root.render(
        <CanvasProvider
          initialNodes={[
            {
              id: 'node',
              type: 'text',
              text: 'edit me',
              x: 0,
              y: 0,
              width: 100,
              height: 60,
            },
          ]}
        >
          <EditableNodeProbe />
        </CanvasProvider>
      );
    });

    const content = container.querySelector('.react-jsoncanvas-node-content')!;
    const node = container.querySelector('.react-jsoncanvas-node')!;
    node.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        right: 100,
        bottom: 60,
        width: 100,
        height: 60,
      }) as DOMRect;
    const click = () =>
      act(() => {
        const options = { bubbles: true, button: 0, clientX: 50, clientY: 30 };
        content.dispatchEvent(new MouseEvent('mousedown', options));
        content.dispatchEvent(new MouseEvent('mouseup', options));
        content.dispatchEvent(new MouseEvent('click', options));
      });

    click();
    click();

    expect(
      container
        .querySelector('.react-jsoncanvas-text-content')
        ?.getAttribute('contenteditable')
    ).toBe('true');

    const editor = container.querySelector('.react-jsoncanvas-text-content')!;
    act(() => {
      editor.innerHTML = 'updated text';
      editor.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    });
    expect(container.querySelector('[data-text]')?.getAttribute('data-text')).toBe(
      'updated text'
    );
  });
});
