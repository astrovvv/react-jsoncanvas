import { createContext, useCallback, useEffect, useMemo, useRef } from 'react';
import type { ViewportState } from '../types';
import { isValidViewport } from '../context/canvasState';

const FRAME_DURATION = 1000 / 60;
const ZOOM_LERP_FACTOR = 0.18;
const SCALE_EPSILON = 0.001;
const PAN_EPSILON = 0.1;

interface ViewportAnimation {
  getTarget: () => ViewportState;
  animateTo: (viewport: ViewportState) => void;
  updateViewport: (viewport: Partial<ViewportState>) => void;
}

// One animation owner per canvas, shared by wheel, keyboard and toolbar zoom.
export const ViewportAnimationContext =
  createContext<ViewportAnimation | null>(null);

export function useViewportAnimation(
  viewport: ViewportState,
  scheduleViewport: (viewport: Partial<ViewportState>) => void
): ViewportAnimation {
  const frameRef = useRef<number | null>(null);
  const currentRef = useRef(viewport);
  const targetRef = useRef(viewport);
  const lastTimeRef = useRef(0);
  const scheduleRef = useRef(scheduleViewport);
  scheduleRef.current = scheduleViewport;

  useEffect(() => {
    if (frameRef.current === null) {
      currentRef.current = viewport;
      targetRef.current = viewport;
    }
  }, [viewport]);

  const cancel = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
  }, []);
  useEffect(() => cancel, [cancel]);

  const updateViewport = useCallback(
    (updates: Partial<ViewportState>) => {
      const next = { ...currentRef.current, ...updates };
      if (!isValidViewport(next)) return;
      cancel();
      currentRef.current = next;
      targetRef.current = next;
      scheduleRef.current(next);
    },
    [cancel]
  );

  const animateFrame = useCallback((time: number) => {
    const current = currentRef.current;
    const target = targetRef.current;
    const elapsed = Math.max(
      0,
      Math.min(time - (lastTimeRef.current || time - FRAME_DURATION), 64)
    );
    const amount = 1 - Math.pow(1 - ZOOM_LERP_FACTOR, elapsed / FRAME_DURATION);
    const next = {
      scale: current.scale + (target.scale - current.scale) * amount,
      panOffsetX:
        current.panOffsetX + (target.panOffsetX - current.panOffsetX) * amount,
      panOffsetY:
        current.panOffsetY + (target.panOffsetY - current.panOffsetY) * amount,
    };
    const finished =
      Math.abs(next.scale - target.scale) < SCALE_EPSILON &&
      Math.abs(next.panOffsetX - target.panOffsetX) < PAN_EPSILON &&
      Math.abs(next.panOffsetY - target.panOffsetY) < PAN_EPSILON;
    lastTimeRef.current = time;
    currentRef.current = finished ? target : next;
    scheduleRef.current(currentRef.current);
    frameRef.current = finished ? null : requestAnimationFrame(animateFrame);
  }, []);

  const animateTo = useCallback(
    (target: ViewportState) => {
      if (!isValidViewport(target)) return;
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        updateViewport(target);
        return;
      }
      targetRef.current = target;
      if (frameRef.current === null) {
        lastTimeRef.current = performance.now();
        frameRef.current = requestAnimationFrame(animateFrame);
      }
    },
    [animateFrame, updateViewport]
  );

  return useMemo(
    () => ({
      getTarget: () => targetRef.current,
      animateTo,
      updateViewport,
    }),
    [animateTo, updateViewport]
  );
}
