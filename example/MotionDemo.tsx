import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { useCanvas, type GenericNode } from '../src';
import type { MotionKind } from './scenes';

interface MotionDemoProps {
  kind: MotionKind;
  nodes: GenericNode[];
}

/** Runs only while its scene is mounted; editor history is untouched. */
export function MotionDemo({ kind, nodes }: MotionDemoProps) {
  const { updateViewport, scheduleNodeUpdate } = useCanvas();
  const updateViewportRef = useRef(updateViewport);
  const scheduleNodeUpdateRef = useRef(scheduleNodeUpdate);
  updateViewportRef.current = updateViewport;
  scheduleNodeUpdateRef.current = scheduleNodeUpdate;
  const elapsedRef = useRef(0);

  const [paused, setPaused] = useState(false);
  const [fps, setFps] = useState(0);

  useEffect(() => {
    if (paused) {
      setFps(0);
      return;
    }

    let frame = 0;
    let previousFrameAt: number | null = null;
    let measuredAt = 0;
    let framesMeasured = 0;

    const tick = (now: number) => {
      if (previousFrameAt === null) {
        previousFrameAt = now;
        measuredAt = now;
      }
      const delta = Math.min((now - previousFrameAt) / 1000, 0.05);
      previousFrameAt = now;
      if (!document.hidden) {
        elapsedRef.current += delta;
        const elapsed = elapsedRef.current;

        if (kind === 'viewport' || kind === 'combined') {
          updateViewportRef.current({
            panOffsetX: 90 + Math.sin(elapsed * 0.7) * 260,
            panOffsetY: 40 + Math.cos(elapsed * 0.55) * 130,
          });
        }

        if (kind === 'nodes' || kind === 'combined') {
          for (let index = 0; index < nodes.length; index++) {
            const node = nodes[index]!;
            const phase = elapsed * 1.6 + index * 0.35;
            scheduleNodeUpdateRef.current(node.id, {
              x: node.x + Math.sin(phase) * 25,
              y: node.y + Math.cos(phase * 0.8) * 18,
            });
          }
        }

        framesMeasured++;
        if (now - measuredAt >= 500) {
          setFps(Math.round((framesMeasured * 1000) / (now - measuredAt)));
          measuredAt = now;
          framesMeasured = 0;
        }
      } else {
        measuredAt = now;
        framesMeasured = 0;
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [kind, nodes, paused]);

  return (
    <div className="demo-motion-panel" role="status">
      <span className="demo-fps">{paused ? 'Пауза' : `${fps} FPS`}</span>
      <span>
        {kind === 'combined'
          ? 'Полотно + узлы'
          : kind === 'viewport'
            ? 'Полотно'
            : 'Узлы'}
      </span>
      <button
        type="button"
        onClick={() => setPaused(value => !value)}
        aria-label={paused ? 'Возобновить анимацию' : 'Приостановить анимацию'}
      >
        {paused ? (
          <Play size={16} aria-hidden="true" />
        ) : (
          <Pause size={16} aria-hidden="true" />
        )}
        {paused ? 'Продолжить' : 'Пауза'}
      </button>
    </div>
  );
}
