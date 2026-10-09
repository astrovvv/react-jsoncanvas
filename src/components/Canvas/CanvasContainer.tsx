import React, { useEffect } from 'react';
import { useViewport } from '../../hooks/useViewport';
import { useZoom } from '../../hooks/useZoom';
import { usePanning } from '../../hooks/usePanning';
import { useTouch } from '../../hooks/useTouch';
import { useEdgeCreation } from '../../hooks/useEdgeCreation';
import { useCanvas } from '../../hooks/useCanvas';
import { GridLayer } from './GridLayer';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

interface CanvasContainerProps {
  className?: string;
  children?: React.ReactNode;
}

export function CanvasContainer({
  className = '',
  children,
}: CanvasContainerProps) {
  const { state, config } = useCanvas();
  const { containerRef } = useViewport();
  const { handleWheel } = useZoom({ handleKeyboard: true });
  const { startTouch, moveTouch, endTouch } = useTouch();
  useKeyboardShortcuts();

  useEdgeCreation();

  usePanning(); // Initialize panning handlers

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Wheel event for zoom
    container.addEventListener('wheel', handleWheel, { passive: false });

    // Touch events
    if (config.enableTouch) {
      container.addEventListener('touchstart', startTouch, { passive: false });
      container.addEventListener('touchmove', moveTouch, { passive: false });
      container.addEventListener('touchend', endTouch);
    }

    // Prevent default gesture events
    const preventGesture = (e: Event) => e.preventDefault();
    document.addEventListener('gesturestart', preventGesture);
    document.addEventListener('gesturechange', preventGesture);

    return () => {
      container.removeEventListener('wheel', handleWheel);
      if (config.enableTouch) {
        container.removeEventListener('touchstart', startTouch);
        container.removeEventListener('touchmove', moveTouch);
        container.removeEventListener('touchend', endTouch);
      }
      document.removeEventListener('gesturestart', preventGesture);
      document.removeEventListener('gesturechange', preventGesture);
    };
  }, [
    containerRef,
    handleWheel,
    startTouch,
    moveTouch,
    endTouch,
    config.enableTouch,
  ]);

  const containerClasses = [
    'react-jsoncanvas-container',
    className,
    state.isPanning && 'react-jsoncanvas-panning',
    state.isDragging && 'react-jsoncanvas-dragging',
    (state.connecting || state.rewiring) && 'react-jsoncanvas-connecting',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={containerRef}
      className={containerClasses}
      style={
        {
          '--scale': state.viewport.scale,
          '--zoom-multiplier': 1 / state.viewport.scale,
        } as React.CSSProperties
      }
    >
      <GridLayer />
      <div
        className="react-jsoncanvas-viewport"
        style={{
          transform: `translate(${state.viewport.panOffsetX}px, ${state.viewport.panOffsetY}px) scale(${state.viewport.scale})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
