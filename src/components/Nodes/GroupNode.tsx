import React from 'react';
import { GroupNode as GroupNodeType } from '@trbn/jsoncanvas';
import { BaseNode } from './BaseNode';
import { NodeComponentProps } from '../../types';

interface GroupNodeProps extends NodeComponentProps {
  node: GroupNodeType & {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export function GroupNode(props: GroupNodeProps) {
  const { node } = props;

  const backgroundStyle: React.CSSProperties = node.background
    ? {
        backgroundImage: `url(${node.background})`,
        backgroundSize:
          node.backgroundStyle === 'ratio'
            ? 'contain'
            : node.backgroundStyle === 'repeat'
              ? 'auto'
              : 'cover',
        backgroundPosition: 'center',
        backgroundRepeat:
          node.backgroundStyle === 'repeat' ? 'repeat' : 'no-repeat',
      }
    : {};

  return (
    <BaseNode
      {...props}
      className="react-jsoncanvas-group-node"
      label={
        node.label ? (
          <div
            className="react-jsoncanvas-group-label"
            onMouseDown={props.onMouseDown}
            onTouchStart={props.onTouchStart}
          >
            {node.label}
          </div>
        ) : undefined
      }
    >
      <div
        className="react-jsoncanvas-group-background"
        style={backgroundStyle}
      />
    </BaseNode>
  );
}
