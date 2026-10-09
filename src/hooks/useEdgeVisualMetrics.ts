import { useEffect, useMemo, useState } from 'react';
import {
  getEdgeVisualMetrics,
  quantizeEdgeScale,
} from '../utils/edgeVisualMetrics';

const EDGE_METRICS_DEBOUNCE_MS = 280;

export function useEdgeVisualMetrics(scale: number) {
  const quantizedScale = quantizeEdgeScale(scale);
  const [settledScale, setSettledScale] = useState(quantizedScale);

  useEffect(() => {
    if (quantizedScale === settledScale) return;

    const timeoutId = window.setTimeout(() => {
      setSettledScale(quantizedScale);
    }, EDGE_METRICS_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [quantizedScale, settledScale]);

  return useMemo(() => getEdgeVisualMetrics(settledScale), [settledScale]);
}
