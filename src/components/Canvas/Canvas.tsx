import { useEffect, useRef, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { CanvasProvider } from '../../context/CanvasContext';
import { useCanvas } from '../../hooks/useCanvas';
import { CanvasContainer } from './CanvasContainer';
import { CanvasProps } from '../../types';
import { EdgesLayer } from './EdgesLayer';
import { NodesLayer } from './NodesLayer';
import { EdgeEditorOverlay } from '../Edges/EdgeEditorOverlay';

function getHostTheme(element: HTMLElement | null): 'light' | 'dark' {
  let ancestor: Element | null = element;
  while (ancestor) {
    const theme = ancestor.getAttribute('data-theme');
    if (theme === 'dark' || ancestor.classList.contains('theme-dark')) {
      return 'dark';
    }
    if (theme === 'light' || ancestor.classList.contains('theme-light')) {
      return 'light';
    }
    ancestor = ancestor.parentElement;
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export function Canvas({
  nodes,
  edges,
  className = '',
  style,
  config = {},
  nodeRenderers,
  theme,
  showThemeToggle = false,
  onThemeChange,
  children,
  onNodeMove,
  onNodeSelect,
  onViewportChange,
  onCanvasChange,
  onEdgeCreate,
  onConnectDrop,
}: CanvasProps) {
  const [activeTheme, setActiveTheme] = useState<'light' | 'dark' | undefined>(theme);
  const [inheritedTheme, setInheritedTheme] = useState<'light' | 'dark'>('light');
  const rootRef = useRef<HTMLDivElement>(null);
  const displayedTheme = activeTheme ?? inheritedTheme;

  useEffect(() => {
    setActiveTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (!showThemeToggle || activeTheme !== undefined || !rootRef.current) return;
    const root = rootRef.current;
    const update = () => setInheritedTheme(getHostTheme(root));
    update();

    const observer = new MutationObserver(update);
    for (let ancestor: Element | null = root; ancestor; ancestor = ancestor.parentElement) {
      observer.observe(ancestor, {
        attributes: true,
        attributeFilter: ['class', 'data-theme'],
      });
    }
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    media?.addEventListener?.('change', update);
    return () => {
      observer.disconnect();
      media?.removeEventListener?.('change', update);
    };
  }, [activeTheme, showThemeToggle]);

  const events = {
    onNodeMove,
    onNodeSelect,
    onViewportChange,
    onCanvasChange,
    onEdgeCreate,
    onConnectDrop,
  };

  return (
    <CanvasProvider
      initialNodes={nodes}
      initialEdges={edges}
      config={config}
      events={events}
    >
      <div
        ref={rootRef}
        className={`react-jsoncanvas ${className}`}
        style={style}
        data-theme={activeTheme}
      >
        <CanvasWrapper
          {...(nodeRenderers !== undefined && { nodeRenderers })}
        />
        {children}
        {showThemeToggle && (
          <button
            type="button"
            className="react-jsoncanvas-theme-toggle"
            title={displayedTheme === 'dark' ? 'Use light theme' : 'Use dark theme'}
            aria-label={
              displayedTheme === 'dark' ? 'Use light theme' : 'Use dark theme'
            }
            onClick={() => {
              const current = activeTheme ?? getHostTheme(rootRef.current);
              const next = current === 'dark' ? 'light' : 'dark';
              setActiveTheme(next);
              onThemeChange?.(next);
            }}
          >
            {displayedTheme === 'dark' ? (
              <Sun size={16} aria-hidden="true" />
            ) : (
              <Moon size={16} aria-hidden="true" />
            )}
          </button>
        )}
      </div>
    </CanvasProvider>
  );
}

const CanvasWrapper = ({
  nodeRenderers,
}: Pick<CanvasProps, 'nodeRenderers'>) => {
  const { state } = useCanvas();
  return (
    <CanvasContainer>
      <EdgesLayer edges={state.edges} />
      <NodesLayer
        nodes={state.nodes}
        {...(nodeRenderers !== undefined && { nodeRenderers })}
      />
      <EdgeEditorOverlay />
    </CanvasContainer>
  );
};
