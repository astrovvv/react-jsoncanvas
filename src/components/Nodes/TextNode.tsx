import { useEffect, useRef } from 'react';
import { TextNode as TextNodeType } from '@trbn/jsoncanvas';
import { BaseNode } from './BaseNode';
import { NodeComponentProps } from '../../types';
import { useCanvas } from '../../hooks/useCanvas';
import { htmlToMarkdown } from '../../utils/serialization';

interface TextNodeProps extends NodeComponentProps {
  node: TextNodeType;
}

export function TextNode(props: TextNodeProps) {
  const { node, isEditing } = props;
  const { updateNode, setEditingNode } = useCanvas();
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isEditing || !contentRef.current) return;

    const element = contentRef.current;
    element.focus();

    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, [isEditing]);

  const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    const nextText = htmlToMarkdown(event.currentTarget.innerHTML);
    if (nextText !== node.text) {
      updateNode(node.id, { text: nextText } as Partial<TextNodeType>);
    }
    setEditingNode(null);
  };

  return (
    <BaseNode {...props} className="react-jsoncanvas-text-node">
      <div
        ref={contentRef}
        className="react-jsoncanvas-text-content"
        contentEditable={isEditing}
        suppressContentEditableWarning
        onBlur={handleBlur}
        dangerouslySetInnerHTML={{ __html: node.text }}
      />
    </BaseNode>
  );
}
