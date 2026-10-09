import React, { useRef, useState } from 'react';
import { NodeComponentProps, ResizeHandle } from '../../types';
import { useCanvas } from '../../hooks/useCanvas';
import {
  screenToWorld,
  getContainerCoordinates,
  snapToGrid,
} from '../../utils/geometry';
import type { CanvasColor, EdgeSide } from '@trbn/jsoncanvas';

interface BaseNodeProps extends NodeComponentProps {
  children: React.ReactNode;
  className?: string;
  label?: React.ReactNode;
}

const CLICK_EDIT_THRESHOLD_SQUARED = 16;
const ANCHOR_PROXIMITY_PX = 28;
const RESIZE_PROXIMITY_PX = 10;

function getResizeHandle(
  clientX: number,
  clientY: number,
  rect: DOMRect
): ResizeHandle | null {
  const nearLeft = Math.abs(clientX - rect.left) <= RESIZE_PROXIMITY_PX;
  const nearRight = Math.abs(clientX - rect.right) <= RESIZE_PROXIMITY_PX;
  const nearTop = Math.abs(clientY - rect.top) <= RESIZE_PROXIMITY_PX;
  const nearBottom = Math.abs(clientY - rect.bottom) <= RESIZE_PROXIMITY_PX;

  if (nearTop) return nearLeft ? 'nw' : nearRight ? 'ne' : 'n';
  if (nearBottom) return nearLeft ? 'sw' : nearRight ? 'se' : 's';
  if (nearLeft) return 'w';
  if (nearRight) return 'e';
  return null;
}

const colorMap: Record<CanvasColor, string> = {
  1: 'var(--canvas-color-1, var(--canvas-color-red, #e93147))',
  2: 'var(--canvas-color-2, var(--canvas-color-orange, #ec7500))',
  3: 'var(--canvas-color-3, var(--canvas-color-yellow, #e0ac00))',
  4: 'var(--canvas-color-4, var(--canvas-color-green, #08b94e))',
  5: 'var(--canvas-color-5, var(--canvas-color-cyan, #00bfbc))',
  6: 'var(--canvas-color-6, var(--canvas-color-purple, #7852ee))',
};

function getNodeType(node: NodeComponentProps['node']): string | undefined {
  if (!('type' in node) || typeof node.type !== 'string') return undefined;
  return node.type;
}

function computeAxisResize(params: {
  direction: -1 | 0 | 1; // -1 = negative (w/n), 1 = positive (e/s), 0 = none
  delta: number; // movement delta (dx or dy) already scaled
  startPos: number; // starting x or y (left/top)
  startSize: number; // starting width or height
  minSize: number;
  snap: boolean;
  gridSize: number;
}): { pos: number; size: number } {
  const { direction, delta, startPos, startSize, minSize, snap, gridSize } =
    params;

  // No resize on this axis
  if (direction === 0) {
    return { pos: startPos, size: startSize };
  }

  // Positive direction (east or south) grows size only
  if (direction === 1) {
    return {
      pos: startPos,
      size: Math.max(minSize, startSize + delta),
    };
  }

  // Negative direction (west or north) moves origin and shrinks/grows
  const proposedSize = startSize - delta;
  const proposedPos = startPos + delta;

  if (snap) {
    const snappedPos = snapToGrid(proposedPos, gridSize);
    const deltaPos = snappedPos - startPos;
    let size = startSize - deltaPos;
    let pos = snappedPos;
    if (size < minSize) {
      size = minSize;
      pos = startPos + startSize - minSize;
    }
    return { pos, size };
  }

  let size = proposedSize;
  let pos = proposedPos;
  if (size < minSize) {
    size = minSize;
    pos = startPos + startSize - minSize;
  }
  return { pos, size };
}

export function BaseNode({
  node,
  isSelected,
  isActive,
  isEditing,
  isDragging,
  layerIndex = 0,
  layerCount = 1,
  editable,
  onMouseDown,
  onTouchStart,
  children,
  className = '',
  label,
}: BaseNodeProps) {
  const [nearbyAnchor, setNearbyAnchor] = useState<EdgeSide | null>(null);
  const [nearbyResize, setNearbyResize] = useState<ResizeHandle | null>(null);
  const contentPointerRef = useRef({ x: 0, y: 0 });
  const wasSelectedOnPointerDownRef = useRef(false);
  const {
    startConnect,
    updateConnectPosition,
    state,
    config,
    scheduleNodeUpdate,
    beginHistoryEntry,
    commitHistoryEntry,
    setActiveNode,
    setEditingNode,
    containerRef,
  } = useCanvas();

  const canEdit = editable ?? getNodeType(node) === 'text';

  const handleContentMouseDown = (e: React.MouseEvent) => {
    wasSelectedOnPointerDownRef.current = isSelected;
    contentPointerRef.current = {
      x: e.clientX,
      y: e.clientY,
    };

    if (isEditing) {
      e.stopPropagation();
      return;
    }
    onMouseDown(e);
  };

  const handleContentClick = (e: React.MouseEvent) => {
    if (!wasSelectedOnPointerDownRef.current || isDragging) return;

    const dx = e.clientX - contentPointerRef.current.x;
    const dy = e.clientY - contentPointerRef.current.y;
    if (dx * dx + dy * dy >= CLICK_EDIT_THRESHOLD_SQUARED) {
      return;
    }

    setActiveNode(node.id);
    if (canEdit) {
      setEditingNode(node.id);
    }
  };

  const handleAnchorMouseDown = (e: React.MouseEvent, side: EdgeSide) => {
    // stop React synthetic propagation
    e.stopPropagation();
    e.preventDefault();
    startConnect(node.id, side);

    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const screenCoords = getContainerCoordinates(e, rect);
      const worldCoords = screenToWorld(
        screenCoords.x,
        screenCoords.y,
        state.viewport
      );
      updateConnectPosition(worldCoords.x, worldCoords.y);
    }
  };

  const handleNodeMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const anchors: Array<{ side: EdgeSide; x: number; y: number }> = [
      { side: 'left', x: rect.left, y: rect.top + rect.height / 2 },
      { side: 'right', x: rect.right, y: rect.top + rect.height / 2 },
      { side: 'top', x: rect.left + rect.width / 2, y: rect.top },
      { side: 'bottom', x: rect.left + rect.width / 2, y: rect.bottom },
    ];
    let closest: EdgeSide | null = null;
    let closestDistance = ANCHOR_PROXIMITY_PX;

    for (const anchor of anchors) {
      const distance = Math.hypot(
        event.clientX - anchor.x,
        event.clientY - anchor.y
      );
      if (distance <= closestDistance) {
        closest = anchor.side;
        closestDistance = distance;
      }
    }
    setNearbyAnchor(current => (current === closest ? current : closest));

    const resize = getResizeHandle(event.clientX, event.clientY, rect);
    setNearbyResize(current => (current === resize ? current : resize));
  };

  const handleResizeMouseDown = (e: React.MouseEvent, handle: ResizeHandle) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const { scale } = state.viewport;
    const startW = node.width;
    const startH = node.height;
    const startLeft = node.x;
    const startTop = node.y;
    const historySnapshot = beginHistoryEntry();
    let resized = false;

    const minSize = 120;

    const onMove = (ev: MouseEvent) => {
      const dx = (ev.clientX - startX) / scale;
      const dy = (ev.clientY - startY) / scale;
      if (dx !== 0 || dy !== 0) {
        resized = true;
      }

      const hor = handle.includes('e') ? 1 : handle.includes('w') ? -1 : 0;
      const ver = handle.includes('s') ? 1 : handle.includes('n') ? -1 : 0;

      // Horizontal axis
      const { pos: newXRaw, size: newWRaw } = computeAxisResize({
        direction: hor,
        delta: dx,
        startPos: startLeft,
        startSize: startW,
        minSize,
        snap: config.snapToGrid,
        gridSize: config.gridSize,
      });

      // Vertical axis
      const { pos: newYRaw, size: newHRaw } = computeAxisResize({
        direction: ver,
        delta: dy,
        startPos: startTop,
        startSize: startH,
        minSize,
        snap: config.snapToGrid,
        gridSize: config.gridSize,
      });

      // Additional snapping of size when resizing from positive sides (retain original behavior)
      let finalW = newWRaw;
      let finalH = newHRaw;
      if (config.snapToGrid) {
        if (hor !== -1) {
          finalW = snapToGrid(finalW, config.gridSize);
        }
        if (ver !== -1) {
          finalH = snapToGrid(finalH, config.gridSize);
        }
      }

      scheduleNodeUpdate(node.id, {
        x: newXRaw,
        y: newYRaw,
        width: finalW,
        height: finalH,
      });
    };

    const onUp = () => {
      if (resized && historySnapshot) {
        commitHistoryEntry(historySnapshot);
      }
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const nodeStyle: React.CSSProperties = {
    left: `${node.x}px`,
    top: `${node.y}px`,
    width: `${node.width}px`,
    height: `${node.height}px`,
    ...(node.color != null
      ? ({ '--canvas-color': colorMap[node.color] } as React.CSSProperties)
      : {}),
    zIndex:
      Math.max(layerCount, 1) * (isDragging ? 2 : isSelected ? 1 : 0) +
      layerIndex +
      1,
  };
  const nodeType = getNodeType(node);
  const nodeClasses = [
    'react-jsoncanvas-node',
    nodeType && `react-jsoncanvas-node--${nodeType}`,
    className,
    isSelected && 'react-jsoncanvas-node--selected',
    isActive && 'react-jsoncanvas-node--active',
    isEditing && 'react-jsoncanvas-node--editing',
    isDragging && 'react-jsoncanvas-node--dragging',
    node.color != null && 'react-jsoncanvas-node--themed',
    nearbyResize && `react-jsoncanvas-node--resize-${nearbyResize}`,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      id={node.id}
      className={nodeClasses}
      style={nodeStyle}
      data-node-type={nodeType}
      data-node-id={node.id}
      onMouseMove={handleNodeMouseMove}
      onMouseDownCapture={event => {
        const target = event.target as HTMLElement;
        if (
          isEditing ||
          target.closest(
            'a, button, input, textarea, select, [contenteditable="true"], .react-jsoncanvas-group-label'
          )
        ) {
          return;
        }
        const resize = getResizeHandle(
          event.clientX,
          event.clientY,
          event.currentTarget.getBoundingClientRect()
        );
        if (resize && !target.closest('.react-jsoncanvas-anchor')) {
          handleResizeMouseDown(event, resize);
        }
      }}
      onMouseLeave={() => {
        setNearbyAnchor(null);
        setNearbyResize(null);
      }}
    >
      {label}
      {(['left', 'right', 'top', 'bottom'] as const).map(side => (
        <div
          key={side}
          className={`react-jsoncanvas-anchor react-jsoncanvas-anchor-${side}${nearbyAnchor === side ? ' react-jsoncanvas-anchor--nearby' : ''}`}
          data-side={side}
          onMouseDown={e => handleAnchorMouseDown(e, side)}
        />
      ))}
      <div
        className="react-jsoncanvas-node-content"
        onMouseDown={handleContentMouseDown}
        onClickCapture={handleContentClick}
        onTouchStart={onTouchStart}
      >
        {children}
      </div>
    </div>
  );
}
