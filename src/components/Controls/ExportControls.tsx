import { useMemo, useState } from 'react';
import { Braces, Check, Copy, Download, X } from 'lucide-react';
import { useCanvas } from '../../hooks/useCanvas';
import {
  serializeCanvas,
  downloadCanvas,
  copyToClipboard,
} from '../../utils/serialization';

interface ExportControlsProps {
  className?: string;
  showLabels?: boolean;
  filename?: string;
  showDownload?: boolean;
  showJson?: boolean;
  showCopy?: boolean;
}

export function ExportControls({
  className = '',
  showLabels = false,
  filename = 'canvas.json',
  showDownload = true,
  showJson = true,
  showCopy = true,
}: ExportControlsProps) {
  const { state } = useCanvas();
  const [showOutput, setShowOutput] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const canvasData = useMemo(
    () =>
      showJson && showOutput ? serializeCanvas(state.nodes, state.edges) : null,
    [showJson, showOutput, state.nodes, state.edges]
  );

  const handleCopy = async () => {
    const success = await copyToClipboard(
      serializeCanvas(state.nodes, state.edges)
    );
    setCopySuccess(success);
    if (success) {
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleDownload = () => {
    downloadCanvas(serializeCanvas(state.nodes, state.edges), filename);
  };

  const handleToggleOutput = () => {
    setShowOutput(!showOutput);
  };

  if (!showJson && !showCopy && !showDownload) return null;

  return (
    <div className={`react-jsoncanvas-export-controls ${className}`}>
      {showJson && (
        <button
          type="button"
          onClick={handleToggleOutput}
          className="react-jsoncanvas-toggle-output"
          title="Show/Hide Output"
          aria-label="Show or hide canvas data"
        >
          <Braces size={16} aria-hidden="true" />
          {showLabels && 'Show Output'}
        </button>
      )}

      {showCopy && (
        <button
          type="button"
          onClick={handleCopy}
          className="react-jsoncanvas-copy"
          title="Copy to Clipboard"
          aria-label="Copy canvas data"
        >
          {copySuccess ? (
            <Check size={16} aria-hidden="true" />
          ) : (
            <Copy size={16} aria-hidden="true" />
          )}
          {showLabels && 'Copy'}
        </button>
      )}

      {showDownload && (
        <button
          type="button"
          onClick={handleDownload}
          className="react-jsoncanvas-download"
          title="Download JSON"
          aria-label="Download canvas data"
        >
          <Download size={16} aria-hidden="true" />
          {showLabels && 'Download'}
        </button>
      )}

      {canvasData !== null && (
        <div className="react-jsoncanvas-output-panel">
          <div className="react-jsoncanvas-output-header">
            <span>Canvas Data</span>
            <button
              type="button"
              onClick={handleToggleOutput}
              className="react-jsoncanvas-close-output"
              aria-label="Close canvas data"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
          <pre className="react-jsoncanvas-output">
            <code>{canvasData}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
