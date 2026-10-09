import { useEffect, useState } from 'react';
import { PanelsTopLeft } from 'lucide-react';
import {
  Canvas,
  ExportControls,
  PositionedControl,
  ViewportControls,
  ZoomControls,
} from './src';
import { nodeRenderers } from './example/CounterNode';
import { MotionDemo } from './example/MotionDemo';
import { sceneFromHash, scenes } from './example/scenes';
import './example/styles.css';

function App() {
  const [scene, setScene] = useState(() => sceneFromHash(window.location.hash));
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const onHashChange = () => setScene(sceneFromHash(window.location.hash));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return (
    <div className={`demo-layout ${theme === 'dark' ? 'is-dark' : ''}`}>
      <aside className="demo-sidebar">
        <div className="demo-brand">
          <PanelsTopLeft
            className="demo-brand-mark"
            size={25}
            aria-hidden="true"
          />
          <div>
            <strong>JSONCanvas Lab</strong>
            <small>Примеры и производительность</small>
          </div>
        </div>
        <nav aria-label="Примеры Canvas" className="demo-navigation">
          {(['Обзор', 'Производительность'] as const).map(category => (
            <div className="demo-nav-section" key={category}>
              <h2>{category}</h2>
              {scenes
                .filter(item => item.category === category)
                .map(item => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    aria-current={scene.id === item.id ? 'page' : undefined}
                    className={
                      scene.id === item.id
                        ? 'demo-nav-link is-active'
                        : 'demo-nav-link'
                    }
                  >
                    <span>{item.title}</span>
                    <small>{item.nodes.length} узлов</small>
                  </a>
                ))}
            </div>
          ))}
        </nav>
        <p className="demo-sidebar-note">
          Выберите сценарий, чтобы открыть отдельное полотно. Анимация
          останавливается при переходе.
        </p>
      </aside>

      <main className="demo-main">
        <header className="demo-header">
          <div>
            <p className="demo-eyebrow">
              {scene.category} / {scene.id}
            </p>
            <h1>{scene.title}</h1>
            <p>{scene.description}</p>
          </div>
          <div className="demo-stats" aria-label="Размер сцены">
            <span>
              <strong>{scene.nodes.length}</strong> узлов
            </span>
            <span>
              <strong>{scene.edges.length}</strong> рёбер
            </span>
          </div>
        </header>

        <section className="demo-stage" aria-label={`Полотно: ${scene.title}`}>
          <Canvas
            key={scene.id}
            nodes={scene.nodes}
            edges={scene.edges}
            nodeRenderers={nodeRenderers}
            theme={theme}
            onThemeChange={setTheme}
            showThemeToggle
          >
            <PositionedControl
              position={{ top: true, right: true }}
              className="demo-controls"
            >
              <ZoomControls showZoomOut={scene.id !== 'controls'} />
              <ViewportControls showResetView={scene.id !== 'controls'} />
              <ExportControls
                showCopy={scene.id !== 'controls'}
                showDownload={scene.id !== 'controls'}
              />
            </PositionedControl>
            {scene.motion && (
              <MotionDemo kind={scene.motion} nodes={scene.nodes} />
            )}
          </Canvas>
        </section>
        <footer className="demo-tip">{scene.tip}</footer>
      </main>
    </div>
  );
}

export default App;
