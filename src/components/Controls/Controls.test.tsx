// @vitest-environment jsdom
import { act } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { CanvasProvider } from '../../context/CanvasContext';
import { useCanvas } from '../../hooks/useCanvas';
import { Canvas } from '../Canvas/Canvas';
import { ZoomControls } from './ZoomControls';
import { ViewportControls } from './ViewportControls';
import { ExportControls } from './ExportControls';

function ViewportProbe() {
  const { state, containerRef } = useCanvas();
  return (
    <div
      ref={containerRef}
      data-scale={state.viewport.scale}
      data-pan-x={state.viewport.panOffsetX}
      data-pan-y={state.viewport.panOffsetY}
    />
  );
}

describe('canvas controls', () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeAll(() => {
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
    globalThis.requestAnimationFrame = () => 1;
    globalThis.cancelAnimationFrame = () => {};
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () => null
    );
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function mount(children: React.ReactNode) {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(children));
  }

  it('shows only the requested action buttons and resets zoom on the percentage', () => {
    mount(
      <CanvasProvider>
        <ZoomControls showZoomIn={false} />
        <ViewportControls showFitToScreen={false} />
        <ExportControls
          showCopy={false}
          showJson={false}
          showDownload={false}
        />
      </CanvasProvider>
    );

    const labels = Array.from(container.querySelectorAll('button')).map(
      button => button.getAttribute('aria-label')
    );
    expect(labels).toEqual(['Reset zoom', 'Zoom out', 'Reset view']);
    expect(
      container.querySelector('.react-jsoncanvas-zoom-level')?.textContent
    ).toBe('100%');
    expect(
      container.querySelector('.react-jsoncanvas-export-controls')
    ).toBeNull();
  });

  it('applies a supplied theme and toggles it when requested', () => {
    const onThemeChange = vi.fn();
    mount(
      <Canvas
        nodes={[]}
        edges={[]}
        theme="dark"
        showThemeToggle
        onThemeChange={onThemeChange}
      />
    );
    const canvas = container.querySelector('.react-jsoncanvas')!;
    expect(canvas.getAttribute('data-theme')).toBe('dark');

    act(() => {
      container
        .querySelector<HTMLButtonElement>('.react-jsoncanvas-theme-toggle')!
        .click();
    });
    expect(canvas.getAttribute('data-theme')).toBe('light');
    expect(onThemeChange).toHaveBeenCalledWith('light');
  });

  it('inherits a dark host until the user chooses a theme', () => {
    const onThemeChange = vi.fn();
    mount(
      <div className="theme-dark">
        <Canvas
          nodes={[]}
          edges={[]}
          showThemeToggle
          onThemeChange={onThemeChange}
        />
      </div>
    );
    const canvas = container.querySelector('.react-jsoncanvas')!;
    expect(canvas.hasAttribute('data-theme')).toBe(false);
    const toggle = container.querySelector<HTMLButtonElement>(
      '.react-jsoncanvas-theme-toggle'
    )!;
    expect(toggle.getAttribute('aria-label')).toBe('Use light theme');

    act(() => toggle.click());
    expect(canvas.getAttribute('data-theme')).toBe('light');
    expect(onThemeChange).toHaveBeenCalledWith('light');
  });

  it('zooms around the canvas center with the buttons and percentage', async () => {
    globalThis.requestAnimationFrame = callback =>
      window.setTimeout(() => callback(performance.now()), 0);
    globalThis.cancelAnimationFrame = id => window.clearTimeout(id);
    window.matchMedia = () => ({ matches: true }) as MediaQueryList;
    mount(
      <CanvasProvider>
        <ViewportProbe />
        <ZoomControls />
      </CanvasProvider>
    );
    const viewport = container.querySelector<HTMLElement>('[data-scale]')!;
    Object.defineProperty(viewport, 'clientWidth', { value: 800 });
    Object.defineProperty(viewport, 'clientHeight', { value: 600 });

    await act(async () => {
      container.querySelector<HTMLButtonElement>('.react-jsoncanvas-zoom-in')!.click();
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    expect(Number(viewport.dataset.scale)).toBeCloseTo(1.3);
    expect(Number(viewport.dataset.panX)).toBeCloseTo(-120);
    expect(Number(viewport.dataset.panY)).toBeCloseTo(-90);

    await act(async () => {
      container.querySelector<HTMLButtonElement>('.react-jsoncanvas-zoom-level')!.click();
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    expect(Number(viewport.dataset.scale)).toBe(1);
    expect(Number(viewport.dataset.panX)).toBeCloseTo(0);
    expect(Number(viewport.dataset.panY)).toBeCloseTo(0);
  });
});
