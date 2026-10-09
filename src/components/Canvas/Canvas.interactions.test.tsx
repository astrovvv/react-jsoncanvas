// @vitest-environment jsdom
import { act } from 'react';
import { readFileSync } from 'node:fs';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Canvas } from './Canvas';
import { ZoomControls } from '../Controls/ZoomControls';
import { ViewportControls } from '../Controls/ViewportControls';
import { useCanvas } from '../../hooks/useCanvas';

describe('canvas interaction continuity', () => {
  let api: ReturnType<typeof useCanvas>;
  let root: Root;
  let host: HTMLDivElement;
  let styles: HTMLStyleElement;
  let nextFrame = 0;
  let touchOnly = false;
  const frames = new Map<number, FrameRequestCallback>();

  function Probe() {
    api = useCanvas();
    return null;
  }

  function flush(time: number) {
    act(() => {
      const pending = [...frames.entries()];
      for (const [id, callback] of pending) {
        if (!frames.delete(id)) continue;
        callback(time);
      }
    });
  }

  function settle() {
    for (let time = 1048; time < 4000; time += 16) flush(time);
  }

  function mouse(target: EventTarget, type: string, x = 200, y = 50) {
    act(() => target.dispatchEvent(new MouseEvent(type, {
      bubbles: true, button: 0, clientX: x, clientY: y,
    })));
  }

  function mount() {
    act(() => root.render(
      <Canvas nodes={[
        { id: 'a', type: 'text', text: 'A', x: 0, y: 0, width: 100, height: 100 },
        { id: 'b', type: 'text', text: 'B', x: 300, y: 0, width: 100, height: 100 },
        { id: 'group', type: 'group', label: 'Group', x: 0, y: 200, width: 400, height: 200 },
      ]} edges={[{ id: 'ab', fromNode: 'a', fromSide: 'right', toNode: 'b', toSide: 'left' }]}>
        <Probe />
        <ZoomControls />
        <ViewportControls />
      </Canvas>
    ));
    flush(1000);
  }

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    touchOnly = false;
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.set(++nextFrame, callback);
      return nextFrame;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
    vi.spyOn(performance, 'now').mockReturnValue(1000);
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: touchOnly && query === '(hover: none)',
      addEventListener() {}, removeEventListener() {},
    }));
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    host = document.createElement('div');
    styles = document.createElement('style');
    styles.textContent = readFileSync('src/styles/nodes.css', 'utf8');
    document.head.appendChild(styles);
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    styles.remove();
    frames.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function wheelZoom() {
    act(() => api.containerRef.current!.dispatchEvent(new WheelEvent('wheel', {
      bubbles: true, ctrlKey: true, deltaY: -1, clientX: 200, clientY: 50,
    })));
    flush(1016);
    flush(1032);
  }

  it('keeps Reset view authoritative during wheel zoom', () => {
    mount();
    wheelZoom();
    act(() => host.querySelector<HTMLButtonElement>('[aria-label="Reset view"]')!.click());
    settle();
    expect(api.state.viewport).toEqual({ scale: 1, panOffsetX: 0, panOffsetY: 0 });
  });

  it('shares the zoom target between wheel and toolbar controls', () => {
    mount();
    wheelZoom();
    act(() => host.querySelector<HTMLButtonElement>('[aria-label="Zoom out"]')!.click());
    settle();
    expect(api.state.viewport.scale).toBeCloseTo(1);
  });

  it('preserves a later programmatic viewport command during zoom', () => {
    mount();
    wheelZoom();
    const next = { scale: 0.5, panOffsetX: 120, panOffsetY: 80 };
    act(() => api.updateViewport(next));
    settle();
    expect(api.state.viewport).toEqual(next);
  });

  it('stops zoom when panning begins', () => {
    mount();
    wheelZoom();
    const current = api.state.viewport;
    act(() => api.setPanning(true));
    settle();
    expect(api.state.viewport).toEqual(current);
  });

  it.each([false, true])('selects an edge with an intervening document update=%s', update => {
    mount();
    expect(api.edgeHitTestRef.current?.(200, 50)).toBe('ab');
    mouse(api.containerRef.current!, 'mousedown');
    if (update) act(() => api.updateNode('a', { text: 'changed' }));
    mouse(window, 'mouseup');
    expect(api.state.selectedEdgeId).toBe('ab');
  });

  it('starts rewiring after a document update during a held edge gesture', () => {
    mount();
    mouse(api.containerRef.current!, 'mousedown');
    act(() => api.updateNode('a', { text: 'changed' }));
    mouse(window, 'mousemove', 220, 60);
    expect(api.state.rewiring?.edgeId).toBe('ab');
    mouse(window, 'mouseup', 220, 60);
    expect(api.state.rewiring).toBeNull();
  });

  it('selects and drags a group using its label', () => {
    mount();
    const group = host.querySelector<HTMLElement>('[data-node-id="group"]')!;
    expect(getComputedStyle(group).pointerEvents).not.toBe('none');
    expect(getComputedStyle(group.querySelector('.react-jsoncanvas-group-label')!).pointerEvents).toBe('auto');
    vi.spyOn(group, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 200, 400, 200));
    mouse(group.querySelector('.react-jsoncanvas-group-label')!, 'mousedown', 50, 180);
    expect(api.state.selectedNodeId).toBe('group');
    mouse(window, 'mousemove', 80, 180);
    flush(1016);
    expect(api.state.nodes.find(node => node.id === 'group')?.x).toBe(40);
    mouse(window, 'mouseup', 80, 180);
  });

  it('renders all connection points on a device without hover', () => {
    touchOnly = true;
    mount();
    expect(host.querySelectorAll('[data-node-id="a"] .react-jsoncanvas-anchor')).toHaveLength(4);
  });
});
