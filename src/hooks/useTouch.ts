import { useCallback, useRef } from 'react';
import { useCanvas } from './useCanvas';
import { Point } from '../types';

export function useTouch() {
  const { state, config, updateViewport, setPanning, setDragging, selectNode } = useCanvas();
  const touchStateRef = useRef({
    isPanning: false,
    lastTouchX: 0,
    lastTouchY: 0,
    touchStartPanX: 0,
    touchStartPanY: 0,
    initialDistance: null as number | null,
    dragThresholdMet: false,
    dragStartX: 0,
    dragStartY: 0,
    selectedNodeId: '',
  });

  const startTouch = useCallback(
    (e: TouchEvent) => {
      if (!config.enableTouch) return;

      if (e.touches.length === 1) {
        // Single touch for panning
        const touch = e.touches[0]!;
        touchStateRef.current.isPanning = true;
        touchStateRef.current.touchStartPanX =
          touch.pageX - state.viewport.panOffsetX;
        touchStateRef.current.touchStartPanY =
          touch.pageY - state.viewport.panOffsetY;
        touchStateRef.current.lastTouchX = touch.pageX;
        touchStateRef.current.lastTouchY = touch.pageY;
      } else if (e.touches.length === 2) {
        // Two-finger touch for zooming
        e.preventDefault();
        const touch1 = e.touches[0]!;
        const touch2 = e.touches[1]!;
        touchStateRef.current.initialDistance = Math.sqrt(
          Math.pow(touch2.pageX - touch1.pageX, 2) +
            Math.pow(touch2.pageY - touch1.pageY, 2)
        );
      }
    },
    [config.enableTouch, state.viewport.panOffsetX, state.viewport.panOffsetY]
  );

  const moveTouch = useCallback(
    (e: TouchEvent) => {
      if (!config.enableTouch) return;

      if (e.touches.length === 1 && touchStateRef.current.isPanning) {
        const touch = e.touches[0]!;
        const dx = touch.pageX - touchStateRef.current.lastTouchX;
        const dy = touch.pageY - touchStateRef.current.lastTouchY;
        
        const newPanOffsetX = state.viewport.panOffsetX + dx;
        const newPanOffsetY = state.viewport.panOffsetY + dy;
        
        updateViewport({
          panOffsetX: newPanOffsetX,
          panOffsetY: newPanOffsetY,
        });
        
        touchStateRef.current.lastTouchX = touch.pageX;
        touchStateRef.current.lastTouchY = touch.pageY;
      } else if (e.touches.length === 2 && touchStateRef.current.initialDistance) {
        // Pinch zoom
        e.preventDefault();
        const touch1 = e.touches[0]!;
        const touch2 = e.touches[1]!;
        const distance = Math.sqrt(
          Math.pow(touch2.pageX - touch1.pageX, 2) +
            Math.pow(touch2.pageY - touch1.pageY, 2)
        );
        
        const scaleChange = distance / touchStateRef.current.initialDistance;
        const newScale = Math.min(
          Math.max(config.minScale, state.viewport.scale * scaleChange),
          config.maxScale
        );
        
        updateViewport({ scale: newScale });
        touchStateRef.current.initialDistance = distance;
      }
    },
    [
      config.enableTouch,
      config.minScale,
      config.maxScale,
      state.viewport.scale,
      state.viewport.panOffsetX,
      state.viewport.panOffsetY,
      updateViewport,
    ]
  );

  const endTouch = useCallback(
    (e: TouchEvent) => {
      if (!config.enableTouch) return;

      if (touchStateRef.current.isPanning) {
        touchStateRef.current.isPanning = false;
        setPanning(false);
      }
      
      if (e.touches.length < 2) {
        touchStateRef.current.initialDistance = null;
      }
    },
    [config.enableTouch, setPanning]
  );

  const handleNodeTouchStart = useCallback(
    (nodeId: string, e: React.TouchEvent, _nodePosition: Point) => {
      if (!config.enableTouch) return;

      e.stopPropagation();
      const touch = e.touches[0]!;
      
      touchStateRef.current.dragThresholdMet = false;
      touchStateRef.current.dragStartX = touch.pageX;
      touchStateRef.current.dragStartY = touch.pageY;
      touchStateRef.current.selectedNodeId = nodeId;
      selectNode(nodeId);
    },
    [config.enableTouch, selectNode]
  );

  const handleNodeTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!config.enableTouch || !touchStateRef.current.selectedNodeId) return;

      const touch = e.touches[0]!;
      const dx = Math.abs(touch.pageX - touchStateRef.current.dragStartX);
      const dy = Math.abs(touch.pageY - touchStateRef.current.dragStartY);

      if (!touchStateRef.current.dragThresholdMet) {
        if (dx > config.touchThreshold || dy > config.touchThreshold) {
          touchStateRef.current.dragThresholdMet = true;
          setDragging(true, touchStateRef.current.selectedNodeId);
        }
      }

      if (touchStateRef.current.dragThresholdMet && state.isDragging) {
        e.preventDefault();
        // Touch drag logic would be handled by the drag hook
      }
    },
    [config.enableTouch, config.touchThreshold, state.isDragging, setDragging]
  );

  const handleNodeTouchEnd = useCallback(() => {
    if (state.isDragging) {
      setDragging(false);
    }
    touchStateRef.current.selectedNodeId = '';
    touchStateRef.current.dragThresholdMet = false;
  }, [state.isDragging, setDragging]);

  return {
    startTouch,
    moveTouch,
    endTouch,
    handleNodeTouchStart,
    handleNodeTouchMove,
    handleNodeTouchEnd,
  };
}
