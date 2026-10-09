import type { CSSProperties, ReactNode } from 'react';
import { createPositionStyle } from '../../utils/positioning';
import type { PositionConfig } from '../../utils/positioning';

export interface PositionedControlProps {
  children: ReactNode;
  position: PositionConfig;
  className?: string;
  style?: CSSProperties;
}

/** Wrapper for absolutely positioned UI controls. */
export function PositionedControl({
  children,
  position,
  className,
  style: additionalStyle,
}: PositionedControlProps) {
  const positionStyle = createPositionStyle(position);
  const combinedStyle = { ...positionStyle, ...additionalStyle };

  return (
    <div className={className} style={combinedStyle}>
      {children}
    </div>
  );
}
