import { useState, useEffect } from 'react';

type CanvasModuleType = typeof import('../index');

interface CanvasControls {
  ZoomControls: CanvasModuleType['ZoomControls'];
  ViewportControls: CanvasModuleType['ViewportControls'];
  ExportControls: CanvasModuleType['ExportControls'];
}

interface UseCanvasLoaderResult {
  CanvasComponent: CanvasModuleType['Canvas'] | null;
  controls: CanvasControls | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Reusable hook for loading Canvas component and controls
 */
export function useCanvasLoader(): UseCanvasLoaderResult {
  const [CanvasComponent, setCanvasComponent] = useState<
    CanvasModuleType['Canvas'] | null
  >(null);
  const [controls, setControls] = useState<CanvasControls | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadCanvas = async () => {
      try {
        const canvasModule: CanvasModuleType = await import('../index');

        if (!mounted) return;

        setCanvasComponent(() => canvasModule.Canvas);
        
        setControls({
          ZoomControls: canvasModule.ZoomControls,
          ViewportControls: canvasModule.ViewportControls,
          ExportControls: canvasModule.ExportControls,
        });

        setLoading(false);
      } catch (e) {
        console.error('Error loading Canvas:', e);
        setError(e as Error);
        setLoading(false);
      }
    };

    loadCanvas();

    return () => {
      mounted = false;
    };
  }, []);

  return {
    CanvasComponent,
    controls,
    loading,
    error,
  };
}
