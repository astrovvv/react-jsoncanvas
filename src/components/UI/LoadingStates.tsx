import React from 'react';

export interface LoadingStateProps {
  message?: string;
  style?: React.CSSProperties;
}

/**
 * Reusable loading state component
 */
export function LoadingState({ message = 'Loading Canvas component...', style }: LoadingStateProps) {
  return (
    <div style={{ padding: '20px', fontSize: '24px', ...style }}>
      {message}
    </div>
  );
}

export interface ErrorStateProps {
  error: Error;
  title?: string;
  style?: React.CSSProperties;
}

/**
 * Reusable error state component
 */
export function ErrorState({ error, title = 'Error loading Canvas:', style }: ErrorStateProps) {
  return (
    <div style={{ padding: '20px', background: '#ffe6e6', ...style }}>
      <h1>{title}</h1>
      <pre style={{ 
        background: '#fff', 
        padding: '10px', 
        overflow: 'auto', 
        fontSize: '12px' 
      }}>
        {error.toString()}
        {error.stack && '\n\nStack:\n' + error.stack}
      </pre>
    </div>
  );
}

export interface ComponentNotLoadedProps {
  componentName?: string;
  style?: React.CSSProperties;
}

/**
 * Reusable component not loaded state
 */
export function ComponentNotLoaded({ 
  componentName = 'Canvas component', 
  style 
}: ComponentNotLoadedProps) {
  return (
    <div style={{ padding: '20px', ...style }}>
      <h1>{componentName} not loaded</h1>
    </div>
  );
}