import React, { useRef, useEffect, useState } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import { screenToWorld } from '../../utils/geometry';

export const GridLayer: React.FC = () => {
  const { state, config, containerRef } = useCanvas();
  const { viewport } = state;
  const { gridSize, snapToGrid } = config;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [{ width, height }, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const nextWidth = container.clientWidth;
      const nextHeight = container.clientHeight;
      setSize(current =>
        current.width === nextWidth && current.height === nextHeight
          ? current
          : { width: nextWidth, height: nextHeight }
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !snapToGrid) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawGrid = () => {
      let scaledGridSize = gridSize * viewport.scale;
      if (!Number.isFinite(scaledGridSize) || scaledGridSize <= 0) return;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      let gridStep = gridSize;
      while (scaledGridSize < 15) {
        scaledGridSize *= 2;
        gridStep *= 2;
      }

      const worldTopLeft = screenToWorld(0, 0, viewport);
      const startX = Math.floor(worldTopLeft.x / gridStep) * gridStep;
      const startY = Math.floor(worldTopLeft.y / gridStep) * gridStep;
      const offsetX = (startX - worldTopLeft.x) * viewport.scale;
      const offsetY = (startY - worldTopLeft.y) * viewport.scale;
      const numLinesX = Math.ceil(width / scaledGridSize) + 1;
      const numLinesY = Math.ceil(height / scaledGridSize) + 1;

      ctx.fillStyle =
        getComputedStyle(canvas)
          .getPropertyValue('--canvas-dot-pattern')
          .trim() || '#e4e4e4';

      for (let i = 0; i < numLinesX; i++) {
        for (let j = 0; j < numLinesY; j++) {
          const x = offsetX + i * scaledGridSize;
          const y = offsetY + j * scaledGridSize;
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    drawGrid();
    const root = canvas.closest('.react-jsoncanvas');
    const observer = new MutationObserver(drawGrid);
    let themeElement: Element | null = root;
    while (themeElement) {
      observer.observe(themeElement, {
        attributes: true,
        attributeFilter: ['class', 'data-theme'],
      });
      themeElement = themeElement.parentElement;
    }

    return () => observer.disconnect();
  }, [width, height, viewport, gridSize, snapToGrid]);

  if (!snapToGrid) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      className="react-jsoncanvas-background"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: `${width}px`,
        height: `${height}px`,
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
};
