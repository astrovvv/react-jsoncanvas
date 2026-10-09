import { Scan, LocateFixed } from 'lucide-react';
import { useViewport } from '../../hooks/useViewport';

interface ViewportControlsProps {
  className?: string;
  showLabels?: boolean;
  showFitToScreen?: boolean;
  showResetView?: boolean;
}

export function ViewportControls({
  className = '',
  showLabels = false,
  showFitToScreen = true,
  showResetView = true,
}: ViewportControlsProps) {
  const { adjustToViewport, resetViewport } = useViewport();

  const handleFitToScreen = () => {
    adjustToViewport();
  };

  const handleResetViewport = () => {
    resetViewport();
  };

  if (!showFitToScreen && !showResetView) return null;

  return (
    <div className={`react-jsoncanvas-viewport-controls ${className}`}>
      {showFitToScreen && (
        <button
          type="button"
          onClick={handleFitToScreen}
          className="react-jsoncanvas-fit-to-screen"
          title="Fit to Screen"
          aria-label="Fit to screen"
        >
          <Scan size={16} aria-hidden="true" />
          {showLabels && 'Fit to Screen'}
        </button>
      )}

      {showResetView && (
        <button
          type="button"
          onClick={handleResetViewport}
          className="react-jsoncanvas-reset-viewport"
          title="Reset View"
          aria-label="Reset view"
        >
          <LocateFixed size={16} aria-hidden="true" />
          {showLabels && 'Reset View'}
        </button>
      )}
    </div>
  );
}
