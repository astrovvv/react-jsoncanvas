import React, { useEffect } from 'react';
import type {
  GenericNode,
  GroupNode as GroupNodeData,
  LinkNode as LinkNodeData,
  TextNode as TextNodeData,
} from '@trbn/jsoncanvas';
import { useDragAndDrop } from '../../hooks/useDragAndDrop';
import { useTouch } from '../../hooks/useTouch';
import { useMarqueeSelection } from '../../hooks/useMarqueeSelection';
import { useViewport } from '../../hooks/useViewport';
import { useVisibleNodeIds } from '../../hooks/useVisibleNodeIds';
import { TextNode } from '../Nodes/TextNode';
import { LinkNode } from '../Nodes/LinkNode';
import { GroupNode } from '../Nodes/GroupNode';
import { BaseNode } from '../Nodes/BaseNode';
import { useCanvas } from '../../hooks/useCanvas';
import type { CustomNodeRenderers } from '../../types';
import { getCustomNodeDefinition, getNodeType } from '../../utils/customNodes';

interface NodesLayerProps {
  nodes: GenericNode[];
  nodeRenderers?: CustomNodeRenderers;
  className?: string;
}

type RenderableTextNode = GenericNode & TextNodeData;
type RenderableLinkNode = GenericNode & LinkNodeData;
type RenderableGroupNode = GenericNode & GroupNodeData;

export function NodesLayer({
  nodes,
  nodeRenderers,
  className = '',
}: NodesLayerProps) {
  const { state, updateNode, setEditingNode } = useCanvas();
  const {
    selectedNodeIds,
    isDragging,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  } = useDragAndDrop();

  const { handleNodeTouchStart, handleNodeTouchMove, handleNodeTouchEnd } =
    useTouch();
  const { marqueeRect } = useMarqueeSelection();
  const { containerRef, viewport } = useViewport();

  // compute visible nodes synchronously from viewport (fast, works while panning)
  const visibleSet = useVisibleNodeIds(nodes, viewport, containerRef, 400);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const renderNode = (node: GenericNode, layerIndex: number) => {
    const forced =
      selectedNodeIds.includes(node.id) ||
      (isDragging && selectedNodeIds.includes(node.id));
    const isVisible = forced || visibleSet.has(node.id);

    // If not visible and not forced, skip rendering entirely (no placeholder)
    if (!isVisible) return null;

    const commonProps = {
      isSelected: selectedNodeIds.includes(node.id),
      isActive: state.activeNodeId === node.id,
      isEditing: state.editingNodeId === node.id,
      isDragging: isDragging && selectedNodeIds.includes(node.id),
      layerIndex,
      layerCount: nodes.length,
      onMouseDown: (e: React.MouseEvent) =>
        handleMouseDown(node.id, e, { x: node.x, y: node.y }),
      onTouchStart: (e: React.TouchEvent) =>
        handleNodeTouchStart(node.id, e, { x: node.x, y: node.y }),
    };

    const nodeType = getNodeType(node);
    switch (nodeType) {
      case 'text':
        return <TextNode key={node.id} {...commonProps} node={node as RenderableTextNode} />;
      case 'link':
        return <LinkNode key={node.id} {...commonProps} node={node as RenderableLinkNode} />;
      case 'group':
        return (
          <GroupNode key={node.id} {...commonProps} node={node as RenderableGroupNode} />
        );
      default: {
        const customDefinition = getCustomNodeDefinition(node, nodeRenderers);
        if (!customDefinition) {
          return (
            <BaseNode key={node.id} {...commonProps} node={node}>
              <div>Unknown node type: {nodeType ?? 'undefined'}</div>
            </BaseNode>
          );
        }

        const CustomNodeComponent = customDefinition.component;
        return (
          <BaseNode
            key={node.id}
            {...commonProps}
            node={node}
            {...(customDefinition.editable !== undefined && {
              editable: customDefinition.editable,
            })}
            {...(customDefinition.className !== undefined && {
              className: customDefinition.className,
            })}
          >
            <CustomNodeComponent
              node={node}
              isSelected={commonProps.isSelected}
              isActive={commonProps.isActive}
              isEditing={commonProps.isEditing}
              isDragging={commonProps.isDragging}
              updateNode={(updates, options) =>
                updateNode(node.id, updates, options)
              }
              setEditing={isEditing =>
                setEditingNode(isEditing ? node.id : null)
              }
            />
          </BaseNode>
        );
      }
    }
  };

  return (
    <div
      className={`react-jsoncanvas-nodes-layer ${className}`}
      onTouchMove={handleNodeTouchMove}
      onTouchEnd={handleNodeTouchEnd}
    >
      {nodes.map(renderNode)}
      {marqueeRect && (
        <div
          className="react-jsoncanvas-marquee"
          style={{
            left: `${marqueeRect.left}px`,
            top: `${marqueeRect.top}px`,
            width: `${marqueeRect.width}px`,
            height: `${marqueeRect.height}px`,
          }}
        />
      )}
    </div>
  );
}
