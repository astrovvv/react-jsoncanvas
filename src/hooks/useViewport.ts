import { useCallback, useLayoutEffect, useState } from 'react';
import { useCanvas } from './useCanvas';
import { ViewportState } from '../types';
import { calculateBoundingBox, fitBoundsToViewport } from '../utils/geometry';

export function useViewport() {
  const { state, updateViewport, containerRef } = useCanvas();
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        setWidth(containerRef.current.offsetWidth);
        setHeight(containerRef.current.offsetHeight);
      }
    };
    measure();
    const resizeObserver = new ResizeObserver(measure);
    const container = containerRef.current;
    if (container) {
      resizeObserver.observe(container);
    }
    return () => {
      if (container) {
        resizeObserver.unobserve(container);
      }
    };
  }, [containerRef]);

  const applyViewport = useCallback(
    (viewport: ViewportState) => updateViewport(viewport),
    [updateViewport]
  );

  const adjustToViewport = useCallback(() => {
    if (!containerRef.current) return;

    const nodes = containerRef.current.querySelectorAll('.react-jsoncanvas-node');
    if (nodes.length === 0) return;

    const boundingBox = calculateBoundingBox(
      Array.from(nodes) as HTMLElement[]
    );

    const viewportWidth = width || window.innerWidth;
    const viewportHeight = height || window.innerHeight;

    updateViewport(fitBoundsToViewport(boundingBox, viewportWidth, viewportHeight));
  }, [containerRef, updateViewport, width, height]);

  const resetViewport = useCallback(() => {
    updateViewport({
      scale: 1,
      panOffsetX: 0,
      panOffsetY: 0,
    });
  }, [updateViewport]);

  return {
    containerRef,
    viewport: state.viewport,
    width,
    height,
    updateViewport,
    adjustToViewport,
    resetViewport,
    applyViewport,
  };
}
