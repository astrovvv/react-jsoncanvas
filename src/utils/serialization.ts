import { GenericNode, Edge } from '@trbn/jsoncanvas';

type SerializableTextNode = GenericNode & { type: 'text'; text: string };

function isTextNode(node: GenericNode): node is SerializableTextNode {
  return 'type' in node && node.type === 'text' && 'text' in node;
}

export function htmlToMarkdown(html: string): string {
  let markdown = html.replace(/<br\s*[/]?>/gi, '\n');
  markdown = markdown
    .replace(/<\/(div|p|h[1-6])>/gi, '\n')
    .replace(/<(div|p|h[1-6])[^>]*>/gi, '');
  markdown = markdown.replace(/<a href="([^"]+)">([^<]+)<\/a>/gi, '[$2]($1)');
  markdown = markdown
    .replace(/<ul>/gi, '\n\n')
    .replace(/<\/ul>/gi, '\n\n')
    .replace(/<li>/gi, '- ')
    .replace(/<\/li>/gi, '\n');
  markdown = markdown.replace(/<[^>]+>/g, '');
  markdown = markdown.replace(/\n\s*-\s+/g, '\n- ');
  markdown = markdown.trim().replace(/\n{3,}/g, '\n\n');
  return markdown;
}

export function prepareLinksForSerialization(container: HTMLElement): void {
  container.querySelectorAll('a').forEach(link => {
    if (link.hasAttribute('target') && link.target === '_blank') {
      link.removeAttribute('target');
      link.removeAttribute('rel');
    }
  });
}

export function serializeCanvas(
  nodes: GenericNode[],
  edges: Edge[],
  containerElement?: HTMLElement
): string {
  // Preserve the legacy DOM-aware export without mutating the live canvas.
  // The built-in ExportControls does not pass a container and serializes state.
  const serializationRoot = containerElement
    ? (containerElement.cloneNode(true) as HTMLElement)
    : undefined;
  if (serializationRoot) prepareLinksForSerialization(serializationRoot);

  const serializedNodes = nodes.map(node => {
    const nodeElement = serializationRoot?.querySelector(
      `[data-node-id="${CSS.escape(node.id)}"]`
    );
    if (isTextNode(node) && nodeElement) {
      const textContent = nodeElement.querySelector(
        '.react-jsoncanvas-node-content'
      );
      if (textContent) {
        return {
          ...node,
          text: htmlToMarkdown(textContent.innerHTML),
        };
      }
    }

    return { ...node };
  });

  return JSON.stringify(
    {
      nodes: serializedNodes,
      edges,
    },
    null,
    2
  );
}

export function downloadCanvas(
  canvasData: string,
  filename: string = 'canvas.json'
): void {
  const blob = new Blob([canvasData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Error copying to clipboard: ', err);
    return false;
  }
}
