// @vitest-environment jsdom
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { CanvasProvider } from '../context/CanvasContext';
import { useCanvas } from './useCanvas';
import { useZoom } from './useZoom';

function ZoomProbe() {
  const { state, updateViewport } = useCanvas();
  const { setZoom } = useZoom();
  return (
    <div>
      <output data-scale={state.viewport.scale} />
      <button type="button" onClick={() => updateViewport({ scale: 0.25 })}>
        Minimum
      </button>
      <button type="button" onClick={() => setZoom(1)}>
        Reset
      </button>
      <button type="button" onClick={() => updateViewport({ scale: 3 })}>
        Maximum
      </button>
    </div>
  );
}

describe('zoom animation', () => {
  let root: Root;
  let container: HTMLDivElement;
  let nextId = 0;
  const frames = new Map<number, FrameRequestCallback>();

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    class ResizeObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    globalThis.ResizeObserver =
      ResizeObserverStub as unknown as typeof ResizeObserver;
    vi.spyOn(performance, 'now').mockReturnValue(1000);
    window.matchMedia = () => ({ matches: false }) as MediaQueryList;
    globalThis.requestAnimationFrame = callback => {
      const id = ++nextId;
      frames.set(id, callback);
      return id;
    };
    globalThis.cancelAnimationFrame = id => {
      frames.delete(id);
    };
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() =>
      root.render(
        <CanvasProvider>
          <ZoomProbe />
        </CanvasProvider>
      )
    );
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    frames.clear();
    vi.restoreAllMocks();
  });

  function flush(time: number) {
    act(() => {
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach(callback => callback(time));
    });
  }

  it('does not extrapolate below the minimum when a frame timestamp precedes the click', () => {
    const buttons = container.querySelectorAll('button');
    act(() => buttons[0]!.click());
    flush(1000);
    expect(Number(container.querySelector('output')?.dataset.scale)).toBe(
      0.25
    );

    act(() => buttons[1]!.click());
    flush(950);
    flush(966);

    const scale = Number(container.querySelector('output')?.dataset.scale);
    expect(Number.isFinite(scale)).toBe(true);
    expect(scale).toBeGreaterThanOrEqual(0.25);
    expect(scale).toBeLessThanOrEqual(3);
  });

  it('keeps rapid resets from maximum zoom within bounds and settles at 100%', () => {
    const buttons = container.querySelectorAll('button');
    act(() => buttons[2]!.click());
    flush(1000);
    expect(Number(container.querySelector('output')?.dataset.scale)).toBe(3);

    act(() => buttons[1]!.click());
    flush(950);
    flush(966);
    act(() => buttons[1]!.click());

    for (let time = 982; time < 4500; time += 16) {
      flush(time);
      const scale = Number(container.querySelector('output')?.dataset.scale);
      expect(scale).toBeGreaterThanOrEqual(0.25);
      expect(scale).toBeLessThanOrEqual(3);
    }
    expect(Number(container.querySelector('output')?.dataset.scale)).toBe(1);
  });
});
