import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EdgeVisual } from './EdgeVisual';
import { getEdgeVisualMetrics } from '../../utils/edgeVisualMetrics';

const baseProps = {
  fromPoint: { x: 0, y: 0 },
  toPoint: { x: 100, y: 0 },
  visualMetrics: getEdgeVisualMetrics(1),
  curveTightness: 0.5,
  hasArrow: true,
  strokeColor: '#000000',
};

describe('EdgeVisual layers', () => {
  it('renders paths without an arrow in the path layer', () => {
    const markup = renderToStaticMarkup(
      <svg>
        <EdgeVisual {...baseProps} parts="path" highlighted />
      </svg>
    );

    expect(markup).toContain('react-jsoncanvas-edge-path');
    expect(markup).not.toContain('<polygon');
  });

  it('does not render a hit-testing path for an idle edge', () => {
    const markup = renderToStaticMarkup(
      <svg>
        <EdgeVisual {...baseProps} parts="path" />
      </svg>
    );

    expect(markup).not.toContain('react-jsoncanvas-edge-highlight');
    expect(markup.match(/<path/g)).toHaveLength(1);
  });

  it('renders only the Obsidian polygon in the arrow layer', () => {
    const markup = renderToStaticMarkup(
      <svg>
        <EdgeVisual {...baseProps} parts="arrow" />
      </svg>
    );

    expect(markup).toContain('points="0,0 6.5,10.4 -6.5,10.4"');
    expect(markup).not.toContain('<path');
  });
});
