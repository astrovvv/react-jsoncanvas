import { useCallback, useContext, useEffect } from 'react';
import { useCanvas } from './useCanvas';
import { useViewport } from './useViewport';
import { zoomViewportAround } from '../utils/geometry';
import { ViewportAnimationContext } from './useViewportAnimation';

interface UseZoomOptions {
  handleKeyboard?: boolean;
}

export function useZoom({ handleKeyboard = false }: UseZoomOptions = {}) {
  const { state, config } = useCanvas();
  const { containerRef } = useViewport();
  const animation = useContext(ViewportAnimationContext);
  if (!animation) throw new Error('useZoom must be used within a CanvasProvider');

  // Helper: compute clamped scale
  const clampScale = useCallback(
    (s: number) => Math.min(Math.max(s, config.minScale), config.maxScale),
    [config.minScale, config.maxScale]
  );

  // Keep the world point under the pointer fixed throughout the animation.
  const zoomTo = useCallback(
    (targetScale: number, clientX?: number, clientY?: number) => {
      if (!Number.isFinite(targetScale)) return;
      const current = animation.getTarget();
      const newScale = clampScale(targetScale);

      const container = containerRef.current;
      const rect = container?.getBoundingClientRect();
      const anchor =
        clientX !== undefined && clientY !== undefined
          ? { x: clientX - (rect?.left ?? 0), y: clientY - (rect?.top ?? 0) }
          : {
              x: (container?.clientWidth ?? window.innerWidth) / 2,
              y: (container?.clientHeight ?? window.innerHeight) / 2,
            };

      animation.animateTo(zoomViewportAround(current, newScale, anchor));
    },
    [animation, clampScale, containerRef]
  );

  const zoomIn = useCallback(() => {
    zoomTo(animation.getTarget().scale + config.zoomSpeed);
  }, [animation, config.zoomSpeed, zoomTo]);

  const zoomOut = useCallback(() => {
    zoomTo(animation.getTarget().scale - config.zoomSpeed);
  }, [animation, config.zoomSpeed, zoomTo]);

  const setZoom = useCallback(
    (scale: number) => {
      zoomTo(scale);
    },
    [zoomTo]
  );

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        // Determine target scale and zoom around mouse cursor
        const direction = e.deltaY > 0 ? -1 : 1;
        const step = config.zoomSpeed * direction;
        const targetScale = animation.getTarget().scale + step;
        zoomTo(targetScale, e.clientX, e.clientY);
      }
    },
    [animation, config.zoomSpeed, zoomTo]
  );

  useEffect(() => {
    if (!handleKeyboard || !config.enableKeyboardShortcuts) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isModifierPressed = e.ctrlKey || e.metaKey;
      const isPlusKey =
        e.code === 'Equal' || e.code === 'NumpadAdd' || e.key === '+';
      const isMinusKey =
        e.code === 'Minus' || e.code === 'NumpadSubtract' || e.key === '-';

      if (isModifierPressed && e.code === 'Digit0') {
        e.preventDefault();
        setZoom(1);
      } else if (isModifierPressed && isPlusKey) {
        e.preventDefault();
        zoomIn();
      } else if (isModifierPressed && isMinusKey) {
        e.preventDefault();
        zoomOut();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    config.enableKeyboardShortcuts,
    handleKeyboard,
    setZoom,
    zoomIn,
    zoomOut,
  ]);

  return {
    scale: state.viewport.scale,
    zoomIn,
    zoomOut,
    setZoom,
    handleWheel,
    canZoomIn: state.viewport.scale < config.maxScale,
    canZoomOut: state.viewport.scale > config.minScale,
  };
}
