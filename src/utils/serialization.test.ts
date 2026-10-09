import { describe, expect, it } from 'vitest';
import { htmlToMarkdown, serializeCanvas } from './serialization';

describe('serialization utilities', () => {
  it('converts supported HTML fragments to Markdown', () => {
    expect(
      htmlToMarkdown(
        'First<br>Second<ul><li>One</li><li><a href="https://example.com">Two</a></li></ul>'
      )
    ).toBe('First\nSecond\n- One\n- [Two](https://example.com)');
  });

  it('preserves contenteditable block line breaks', () => {
    expect(htmlToMarkdown('<div>First</div><div>Second<br>Third</div>')).toBe(
      'First\nSecond\nThird'
    );
  });

  it('serializes state without requiring rendered DOM', () => {
    const nodes = [
      { id: 'a', type: 'text', text: 'Hello', x: 1, y: 2, width: 3, height: 4 },
    ];
    const edges = [{ id: 'edge-a', fromNode: 'a', toNode: 'a' }];

    expect(JSON.parse(serializeCanvas(nodes, edges))).toEqual({ nodes, edges });
  });
});
