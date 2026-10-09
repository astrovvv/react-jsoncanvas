import { LinkNode as LinkNodeType } from '@trbn/jsoncanvas';
import { BaseNode } from './BaseNode';
import { NodeComponentProps } from '../../types';

interface LinkNodeProps extends NodeComponentProps {
  node: LinkNodeType;
}

export function LinkNode(props: LinkNodeProps) {
  const { node } = props;

  return (
    <BaseNode {...props} className="react-jsoncanvas-link-node">
      <a
        href={node.url}
        target="_blank"
        rel="noopener noreferrer"
        className="react-jsoncanvas-link"
        onClick={(e) => e.stopPropagation()}
      >
        {node.url}
      </a>
    </BaseNode>
  );
}
