import { defineCustomNode, type CustomNodeRendererProps } from '../src';
import type { CounterNodeData } from './scenes';

function CounterNodeContent({
  node,
  isEditing,
  updateNode,
  setEditing,
}: CustomNodeRendererProps<CounterNodeData>) {
  return (
    <div className="demo-counter">
      {isEditing ? (
        <input
          autoFocus
          aria-label="Название счётчика"
          defaultValue={node.label}
          onBlur={event => {
            updateNode({ label: event.currentTarget.value });
            setEditing(false);
          }}
          onKeyDown={event => {
            if (event.key === 'Enter') event.currentTarget.blur();
          }}
        />
      ) : (
        <strong>{node.label}</strong>
      )}
      <span className="demo-counter-value">{node.value}</span>
      <small>Повторный клик — редактирование</small>
    </div>
  );
}

export const nodeRenderers = {
  counter: defineCustomNode<CounterNodeData>({
    component: CounterNodeContent,
    editable: true,
    className: 'demo-counter-node',
  }),
};
