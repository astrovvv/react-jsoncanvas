import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

/** Schedules viewport culling and skips updates when the visible IDs are unchanged. */
export function useVisibleIds(
  containerRef: RefObject<HTMLElement>,
  calculate: (width: number, height: number) => Set<string>
): Set<string> {
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());
  const lastRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const container = containerRef.current;
      const width = container ? container.clientWidth : window.innerWidth;
      const height = container ? container.clientHeight : window.innerHeight;
      const next = calculate(width, height);
      const previous = lastRef.current;
      if (
        next.size === previous.size &&
        [...next].every(id => previous.has(id))
      ) {
        return;
      }

      lastRef.current = next;
      setVisibleIds(next);
    });

    return () => cancelAnimationFrame(raf);
  }, [containerRef, calculate]);

  return visibleIds;
}
