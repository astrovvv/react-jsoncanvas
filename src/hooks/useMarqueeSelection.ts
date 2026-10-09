import { useCallback, useEffect, useRef, useState } from 'react';
import { useCanvas } from './useCanvas';
import { screenToWorld } from '../utils/geometry';

interface MarqueeRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

const MOVEMENT_THRESHOLD_SQUARED = 16; // 4px threshold before activating selection

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function mergeUnique(base: string[], additions: string[]): string[] {
  if (!additions.length) return [...base];
  const result = [...base];
  const seen = new Set(base);
  for (const id of additions) {
    if (!seen.has(id)) {
      seen.add(id);
      result.push(id);
    }
  }
  return result;
}

export function useMarqueeSelection() {
  const { state, selectNodes, clearSelection, containerRef, edgeHitTestRef } =
    useCanvas();
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const marqueeRef = useRef({
    active: false,
    append: false,
    startScreen: { x: 0, y: 0 },
    startWorld: { x: 0, y: 0 },
    initialSelection: [] as string[],
    moved: false,
    lastSelection: state.selectedNodeIds,
  });

  const [marqueeRect, setMarqueeRect] = useState<MarqueeRect | null>(null);

  const resetMarquee = useCallback(() => {
    const ref = marqueeRef.current;
    ref.active = false;
    ref.append = false;
    ref.initialSelection = [];
    ref.moved = false;
    ref.lastSelection = stateRef.current.selectedNodeIds;
    setMarqueeRect(null);
  }, []);

  const updateSelection = useCallback(
    (nextSelection: string[]) => {
      const ref = marqueeRef.current;
      if (!arraysEqual(ref.lastSelection, nextSelection)) {
        selectNodes(nextSelection);
        ref.lastSelection = nextSelection;
      }
    },
    [selectNodes]
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      const marquee = marqueeRef.current;
      if (!marquee.active || !containerRef.current) return;

      event.preventDefault();

      const rect = containerRef.current.getBoundingClientRect();
      const localX = event.clientX - rect.left;
      const localY = event.clientY - rect.top;

      const dx = localX - marquee.startScreen.x;
      const dy = localY - marquee.startScreen.y;

      if (!marquee.moved && dx * dx + dy * dy >= MOVEMENT_THRESHOLD_SQUARED) {
        marquee.moved = true;
      }

      const viewport = stateRef.current.viewport;
      const currentWorld = screenToWorld(localX, localY, viewport);
      const startWorld = marquee.startWorld;

      const minX = Math.min(startWorld.x, currentWorld.x);
      const maxX = Math.max(startWorld.x, currentWorld.x);
      const minY = Math.min(startWorld.y, currentWorld.y);
      const maxY = Math.max(startWorld.y, currentWorld.y);

      setMarqueeRect({
        left: minX,
        top: minY,
        width: maxX - minX,
        height: maxY - minY,
      });

      if (!marquee.moved) {
        return;
      }

      const selectedWithin = stateRef.current.nodes
        .filter(node => {
          const width = node.width;
          const height = node.height;
          const nodeMinX = node.x;
          const nodeMaxX = node.x + width;
          const nodeMinY = node.y;
          const nodeMaxY = node.y + height;

          const intersects =
            nodeMaxX >= minX &&
            nodeMinX <= maxX &&
            nodeMaxY >= minY &&
            nodeMinY <= maxY;

          return intersects;
        })
        .map(node => node.id);

      const nextSelection = marquee.append
        ? mergeUnique(marquee.initialSelection, selectedWithin)
        : selectedWithin;

      updateSelection(nextSelection);
    },
    [containerRef, updateSelection]
  );

  const handleMouseUp = useCallback(
    (event: MouseEvent) => {
      const marquee = marqueeRef.current;
      if (!marquee.active) return;

      event.preventDefault();

      if (!marquee.moved) {
        if (!marquee.append) {
          clearSelection();
        }
        resetMarquee();
        return;
      }

      if (
        !marquee.append &&
        !marquee.initialSelection.length &&
        marquee.moved
      ) {
        const currentSelection = stateRef.current.selectedNodeIds;
        if (!currentSelection.length) {
          updateSelection([]);
        }
      }

      resetMarquee();
    },
    [clearSelection, resetMarquee, updateSelection]
  );

  const handleMouseMoveRef = useRef(handleMouseMove);
  const handleMouseUpRef = useRef(handleMouseUp);
  handleMouseMoveRef.current = handleMouseMove;
  handleMouseUpRef.current = handleMouseUp;

  const handleWindowMouseMove = useCallback((event: MouseEvent) => {
    handleMouseMoveRef.current(event);
  }, []);

  const handleWindowMouseUp = useCallback((event: MouseEvent) => {
    handleMouseUpRef.current(event);
  }, []);

  const startSelection = useCallback(
    (event: MouseEvent) => {
      if (event.button !== 0) {
        return false;
      }

      if (!containerRef.current) {
        return false;
      }

      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.closest('.react-jsoncanvas-node') ||
          target.closest('.react-jsoncanvas-edge') ||
          target.closest('.react-jsoncanvas-edge-editor'))
      ) {
        return false;
      }
      if (edgeHitTestRef.current?.(event.clientX, event.clientY)) {
        return false;
      }

      const { isDragging, isPanning } = stateRef.current;
      if (isDragging || isPanning) {
        return false;
      }

      event.preventDefault();

      const rect = containerRef.current.getBoundingClientRect();
      const localX = event.clientX - rect.left;
      const localY = event.clientY - rect.top;

      const viewport = stateRef.current.viewport;
      const startWorld = screenToWorld(localX, localY, viewport);

      const append = event.ctrlKey || event.metaKey;

      const marquee = marqueeRef.current;
      marquee.active = true;
      marquee.append = append;
      marquee.startScreen = { x: localX, y: localY };
      marquee.startWorld = startWorld;
      marquee.initialSelection = append
        ? [...stateRef.current.selectedNodeIds]
        : [];
      marquee.lastSelection = [...stateRef.current.selectedNodeIds];
      marquee.moved = false;

      setMarqueeRect({
        left: startWorld.x,
        top: startWorld.y,
        width: 0,
        height: 0,
      });

      return true;
    },
    [containerRef, edgeHitTestRef]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onMouseDown = (event: MouseEvent) => {
      startSelection(event);
    };

    container.addEventListener('mousedown', onMouseDown, true);

    return () => {
      container.removeEventListener('mousedown', onMouseDown, true);
    };
  }, [containerRef, startSelection]);

  useEffect(() => {
    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [handleWindowMouseMove, handleWindowMouseUp]);

  return {
    marqueeRect,
    isSelecting: marqueeRef.current.active && marqueeRef.current.moved,
  };
}
