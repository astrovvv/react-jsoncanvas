import { useEffect, useRef, useState } from 'react';
import { Palette, Trash2, Type } from 'lucide-react';
import type { CanvasColor } from '@trbn/jsoncanvas';
import { useCanvas } from '../../hooks/useCanvas';
import { getNodeEdgeGeometry } from '../../utils/geometry';
import { getEdgeVisualMetrics } from '../../utils/edgeVisualMetrics';
import { resolveEdgeColor } from './edgeColors';

const EDGE_COLORS: CanvasColor[] = [1, 2, 3, 4, 5, 6];

interface EdgeLabelEditorProps {
  initialValue: string;
  onCancel: () => void;
  onCommit: (label: string) => void;
}

function EdgeLabelEditor({
  initialValue,
  onCancel,
  onCommit,
}: EdgeLabelEditorProps) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  return (
    <input
      ref={inputRef}
      className="react-jsoncanvas-edge-label-input"
      value={value}
      aria-label="Edge label"
      onChange={event => setValue(event.target.value)}
      onMouseDown={event => event.stopPropagation()}
      onBlur={() => {
        if (!cancelledRef.current) onCommit(value);
      }}
      onKeyDown={event => {
        if (event.key === 'Enter') {
          event.currentTarget.blur();
        } else if (event.key === 'Escape') {
          cancelledRef.current = true;
          onCancel();
        }
      }}
    />
  );
}

export function EdgeEditorOverlay() {
  const { state, config, getNodeById, updateEdge, removeEdge, setEditingEdge } =
    useCanvas();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const edge = state.edges.find(item => item.id === state.selectedEdgeId);

  useEffect(() => {
    setPaletteOpen(false);
  }, [state.selectedEdgeId]);

  if (!edge || state.rewiring?.edgeId === edge.id) return null;

  const fromNode = getNodeById(edge.fromNode);
  const toNode = getNodeById(edge.toNode);
  if (!fromNode || !toNode) return null;

  const visualMetrics = getEdgeVisualMetrics(state.viewport.scale);
  const geometry = getNodeEdgeGeometry(
    edge,
    fromNode,
    toNode,
    config.curveTightness,
    visualMetrics
  );
  const editing = state.editingEdgeId === edge.id;
  const overlayStyle = {
    left: `${geometry.labelPoint.x}px`,
    top: `${geometry.labelPoint.y}px`,
    '--edge-editor-inverse-scale': 1 / state.viewport.scale,
    '--canvas-color': resolveEdgeColor(edge.color),
  } as React.CSSProperties;

  return (
    <div
      className={`react-jsoncanvas-edge-editor ${
        editing ? 'react-jsoncanvas-edge-editor--editing' : ''
      }`}
      style={overlayStyle}
      data-edge-editor-id={edge.id}
      onMouseDown={event => event.stopPropagation()}
    >
      {editing ? (
        <EdgeLabelEditor
          initialValue={edge.label ?? ''}
          onCancel={() => setEditingEdge(null)}
          onCommit={label => {
            if (label !== (edge.label ?? '')) updateEdge(edge.id, { label });
            setEditingEdge(null);
          }}
        />
      ) : (
        <div
          className="react-jsoncanvas-edge-toolbar"
          role="toolbar"
          aria-label="Edge actions"
        >
          {paletteOpen && (
            <div
              className="react-jsoncanvas-edge-palette"
              aria-label="Edge color"
            >
              {EDGE_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  className="react-jsoncanvas-edge-color"
                  style={{
                    backgroundColor: resolveEdgeColor(color),
                    color: resolveEdgeColor(color),
                  }}
                  aria-label={`Set edge color ${color}`}
                  aria-pressed={edge.color === color}
                  onClick={() => {
                    if (edge.color !== color) updateEdge(edge.id, { color });
                    setPaletteOpen(false);
                  }}
                />
              ))}
            </div>
          )}
          <button
            type="button"
            aria-label="Delete edge"
            title="Delete edge"
            onClick={() => removeEdge(edge.id)}
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Choose edge color"
            title="Choose edge color"
            aria-expanded={paletteOpen}
            onClick={() => setPaletteOpen(open => !open)}
          >
            <Palette size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Edit edge label"
            title="Edit edge label"
            onClick={() => setEditingEdge(edge.id)}
          >
            <Type size={16} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
