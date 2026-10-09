import { ZoomIn, ZoomOut } from 'lucide-react';
import { useZoom } from '../../hooks/useZoom';

interface ZoomControlsProps {
  className?: string;
  showLabels?: boolean;
  showZoomIn?: boolean;
  showZoomOut?: boolean;
}

export function ZoomControls({
  className = '',
  showLabels = false,
  showZoomIn = true,
  showZoomOut = true,
}: ZoomControlsProps) {
  const { scale, zoomIn, zoomOut, setZoom, canZoomIn, canZoomOut } = useZoom();

  return (
    <div className={`react-jsoncanvas-zoom-controls ${className}`}>
      {showZoomIn && (
        <button
          type="button"
          onClick={zoomIn}
          disabled={!canZoomIn}
          className="react-jsoncanvas-zoom-in"
          title="Zoom In"
          aria-label="Zoom in"
        >
          <ZoomIn size={16} aria-hidden="true" />
          {showLabels && 'Zoom In'}
        </button>
      )}

      <button
        type="button"
        className="react-jsoncanvas-zoom-level"
        onClick={() => setZoom(1)}
        title="Reset Zoom"
        aria-label="Reset zoom"
      >
        {Math.round(scale * 100)}%
      </button>

      {showZoomOut && (
        <button
          type="button"
          onClick={zoomOut}
          disabled={!canZoomOut}
          className="react-jsoncanvas-zoom-out"
          title="Zoom Out"
          aria-label="Zoom out"
        >
          <ZoomOut size={16} aria-hidden="true" />
          {showLabels && 'Zoom Out'}
        </button>
      )}
    </div>
  );
}
