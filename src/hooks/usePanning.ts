import { useCallback, useEffect, useRef } from 'react';
import { useCanvas } from './useCanvas';
import { MOUSE_BUTTON } from '../constants';

export function usePanning() {
  const { state, updateViewport, setPanning } = useCanvas();
  const panStartRef = useRef({ x: 0, y: 0 });
  // track last mousedown button to suppress contextmenu for left-click when requested
  const lastMouseButtonRef = useRef<number | null>(null);

  const startPanning = useCallback(
    (clientX: number, clientY: number) => {
      setPanning(true);
      panStartRef.current = {
        x: clientX - state.viewport.panOffsetX,
        y: clientY - state.viewport.panOffsetY,
      };
    },
    [setPanning, state.viewport.panOffsetX, state.viewport.panOffsetY]
  );

  const updatePanning = useCallback(
    (clientX: number, clientY: number) => {
      if (!state.isPanning) return;

      const panOffsetX = clientX - panStartRef.current.x;
      const panOffsetY = clientY - panStartRef.current.y;

      updateViewport({ panOffsetX, panOffsetY });
    },
    [state.isPanning, updateViewport]
  );

  const stopPanning = useCallback(() => {
    setPanning(false);
  }, [setPanning]);

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      // record last mouse button for contextmenu suppression
      lastMouseButtonRef.current = e.button;

      // Start panning with right mouse button
      if (e.button === MOUSE_BUTTON.RIGHT && !state.isDragging) {
        e.preventDefault();
        startPanning(e.clientX, e.clientY);
        document.body.style.cursor = 'grabbing';
      }
    },
    [state.isDragging, startPanning]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (state.isPanning) {
        updatePanning(e.clientX, e.clientY);
      }
    },
    [state.isPanning, updatePanning]
  );

  const handleMouseUp = useCallback(() => {
    if (state.isPanning) {
      stopPanning();
      document.body.style.cursor = '';
    }
  }, [state.isPanning, stopPanning]);

  useEffect(() => {
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    // Prevent context menu while actively panning or when last mousedown was left button
    const handleContextMenu = (e: MouseEvent) => {
        e.preventDefault();
    };
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    state.isPanning,
  ]);

  return {
    isPanning: state.isPanning,
    isSpacePressed: state.isSpacePressed,
    startPanning,
    updatePanning,
    stopPanning,
  };
}
