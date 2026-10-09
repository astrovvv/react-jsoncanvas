import type { CanvasColor } from '@trbn/jsoncanvas';
import type {
  GenericNode,
  JSONCanvasEdge,
  JSONCanvasGroupNode,
  JSONCanvasLinkNode,
  JSONCanvasTextNode,
} from '../src';

const COLORS: CanvasColor[] = [1, 2, 3, 4, 5, 6];
const EDGE_COLORS: CanvasColor[] = [1, 2, 4, 6];
const MOTION_COLORS: CanvasColor[] = [5, 6, 4];
const STRESS_COLORS: CanvasColor[] = [1, 4, 5, 6];

export type MotionKind = 'viewport' | 'nodes' | 'combined';

export interface DemoScene {
  id: string;
  title: string;
  category: 'Обзор' | 'Производительность';
  description: string;
  tip: string;
  nodes: GenericNode[];
  edges: JSONCanvasEdge[];
  motion?: MotionKind;
}

export interface CounterNodeData extends GenericNode {
  type: 'counter';
  label: string;
  value: number;
}

function text(
  id: string,
  content: string,
  x: number,
  y: number,
  width = 200,
  height = 120,
  color?: CanvasColor
): JSONCanvasTextNode {
  return {
    id,
    type: 'text',
    text: content,
    x,
    y,
    width,
    height,
    ...(color !== undefined && { color }),
  };
}

function link(
  id: string,
  url: string,
  x: number,
  y: number,
  color?: CanvasColor
): JSONCanvasLinkNode {
  return {
    id,
    type: 'link',
    url,
    x,
    y,
    width: 250,
    height: 100,
    ...(color !== undefined && { color }),
  };
}

function group(
  id: string,
  label: string | undefined,
  x: number,
  y: number,
  width: number,
  height: number,
  options: Pick<JSONCanvasGroupNode, 'background' | 'backgroundStyle'> &
    Pick<GenericNode, 'color'> = {}
): JSONCanvasGroupNode & GenericNode {
  return {
    id,
    type: 'group',
    ...(label !== undefined && { label }),
    x,
    y,
    width,
    height,
    ...options,
  };
}

const coverImage =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="280"><rect width="480" height="280" fill="#223866"/><circle cx="340" cy="85" r="65" fill="#7852ee"/><path d="M0 250L140 95L270 230L390 130L480 225V280H0Z" fill="#29a6ad"/></svg>'
  );
const patternImage =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" fill="#e7dcfa"/><circle cx="24" cy="24" r="8" fill="#a882ff"/></svg>'
  );

const counterNode: CounterNodeData = {
  id: 'counter',
  type: 'counter',
  label: 'Свой тип узла',
  value: 67,
  x: 60,
  y: 540,
  width: 220,
  height: 150,
};

const showcaseNodes: GenericNode[] = [
  text('short', 'Короткий текст', 60, 80),
  text(
    'multiline',
    'Текст в несколько строк\nВторая строка\nТретья строка',
    310,
    80,
    260,
    140
  ),
  text('empty', '', 620, 80, 190, 120),
  text(
    'long',
    'Длинная карточка: текстовые узлы можно выбирать, перемещать, менять размер и редактировать повторным нажатием.',
    60,
    280,
    310,
    190
  ),
  link('external', 'https://obsidian.md/canvas', 420, 290),
  link('local', 'https://jsoncanvas.org/', 720, 290, 5),
  counterNode,
  ...COLORS.map((color, index) =>
    text(
      `color-${index}`,
      `Цвет ${index + 1}`,
      320 + (index % 3) * 230,
      540 + Math.floor(index / 3) * 165,
      190,
      120,
      color
    )
  ),
];

const groupNodes: GenericNode[] = [
  group('plain-group', 'Группа без изображения', 60, 80, 470, 330),
  text('inside-plain', 'Карточка внутри группы', 105, 170, 210, 110, 4),
  link('inside-link', 'https://jsoncanvas.org/', 340, 170),
  group('colored-group', 'Цветная группа', 600, 80, 420, 330, {
    color: 6,
  }),
  text('inside-colored', 'Вложенный текст', 650, 170),
  group('unlabeled-group', undefined, 1080, 80, 290, 220),
  group('cover-group', 'Фон · cover', 60, 480, 290, 220, {
    background: coverImage,
    backgroundStyle: 'cover',
  }),
  group('ratio-group', 'Фон · ratio', 400, 480, 290, 220, {
    background: coverImage,
    backgroundStyle: 'ratio',
  }),
  group('repeat-group', 'Фон · repeat', 740, 480, 290, 220, {
    background: patternImage,
    backgroundStyle: 'repeat',
  }),
  group('default-background', 'Фон без указания стиля', 1080, 480, 290, 220, {
    background: coverImage,
  }),
];

const sides = ['top', 'right', 'bottom', 'left'] as const;
const edgeNodes: GenericNode[] = [
  text('target', 'Центр соединений', 440, 330, 210, 130),
  text('top', 'Сверху', 455, 60),
  text('right', 'Справа', 840, 340),
  text('bottom', 'Снизу', 455, 680),
  text('left', 'Слева', 50, 340),
  text('plain', 'Без стрелки', 70, 700),
];
const edgeEdges: JSONCanvasEdge[] = sides.map((side, index) => ({
  id: `edge-${side}`,
  fromNode: side,
  toNode: 'target',
  fromSide: (
    { top: 'bottom', right: 'left', bottom: 'top', left: 'right' } as const
  )[side],
  toSide: side,
  fromEnd: index === 2 ? 'arrow' : 'none',
  toEnd: 'arrow',
  label: `${side} · подпись`,
  color: EDGE_COLORS[index]!,
}));
edgeEdges.push({
  id: 'edge-plain',
  fromNode: 'plain',
  toNode: 'target',
  fromSide: 'right',
  toSide: 'bottom',
  toEnd: 'none',
});

const MOTION_COLUMNS = 12;
const motionNodes: GenericNode[] = Array.from({ length: 120 }, (_, index) =>
  text(
    `moving-${index}`,
    `#${index + 1}`,
    55 + (index % MOTION_COLUMNS) * 125,
    70 + Math.floor(index / MOTION_COLUMNS) * 100,
    100,
    70,
    MOTION_COLORS[index % MOTION_COLORS.length]
  )
);
const motionEdges: JSONCanvasEdge[] = motionNodes
  .slice(1)
  .map((node, index) => ({
    id: `moving-edge-${index}`,
    fromNode: motionNodes[index]!.id,
    toNode: node.id,
    fromSide: (index + 1) % MOTION_COLUMNS === 0 ? 'bottom' : 'right',
    toSide: (index + 1) % MOTION_COLUMNS === 0 ? 'top' : 'left',
    toEnd: 'arrow',
  }));

const STRESS_COLUMNS = 40;
const STRESS_ROWS = 30;
const stressNodes: GenericNode[] = Array.from(
  { length: STRESS_COLUMNS * STRESS_ROWS },
  (_, index) =>
    text(
      `stress-${index}`,
      `Узел ${index + 1}`,
      60 + (index % STRESS_COLUMNS) * 180,
      70 + Math.floor(index / STRESS_COLUMNS) * 120,
      145,
      85,
      STRESS_COLORS[index % STRESS_COLORS.length]
    )
);
const stressEdges: JSONCanvasEdge[] = stressNodes
  .slice(1)
  .map((node, index) => ({
    id: `stress-edge-${index}`,
    fromNode: stressNodes[index]!.id,
    toNode: node.id,
    fromSide: (index + 1) % STRESS_COLUMNS === 0 ? 'bottom' : 'right',
    toSide: (index + 1) % STRESS_COLUMNS === 0 ? 'top' : 'left',
    toEnd: 'arrow',
  }));

export const scenes: DemoScene[] = [
  {
    id: 'nodes',
    title: 'Все виды узлов',
    category: 'Обзор',
    description:
      'Текстовые карточки разных размеров и цветов, ссылки и редактируемый пользовательский узел.',
    tip: 'Нажмите на выбранную текстовую карточку ещё раз, чтобы её редактировать.',
    nodes: showcaseNodes,
    edges: [],
  },
  {
    id: 'groups',
    title: 'Группы и фоны',
    category: 'Обзор',
    description:
      'Обычная и цветная группы, карточки внутри группы, фоновые изображения cover, ratio и repeat.',
    tip: 'Перемещайте и изменяйте размер группы, затем сравните отображение фона.',
    nodes: groupNodes,
    edges: [],
  },
  {
    id: 'edges',
    title: 'Рёбра и соединения',
    category: 'Обзор',
    description:
      'Все стороны якорей, цветные и нейтральные рёбра, подписи и окончания со стрелкой и без.',
    tip: 'Нажмите на ребро для выбора, потяните для переподключения или соедините два якоря.',
    nodes: edgeNodes,
    edges: edgeEdges,
  },
  {
    id: 'controls',
    title: 'Управление и тема',
    category: 'Обзор',
    description:
      'Выбор темы, масштаб, viewport, экспорт JSON и демонстрация опциональных кнопок.',
    tip: 'Нажмите на процент между кнопками масштаба для возврата к 100%.',
    nodes: [
      text(
        'controls-intro',
        'Панели управления можно собрать из нужных действий.',
        110,
        120,
        320,
        160
      ),
      text(
        'controls-dark',
        'Переключите тему справа внизу.',
        540,
        300,
        290,
        130,
        6
      ),
    ],
    edges: [
      {
        id: 'controls-edge',
        fromNode: 'controls-intro',
        toNode: 'controls-dark',
        fromSide: 'right',
        toSide: 'left',
        toEnd: 'arrow',
      },
    ],
  },
  {
    id: 'stress',
    title: '1200 узлов',
    category: 'Производительность',
    description:
      '1200 карточек и 1199 соединений для проверки панорамирования большого документа.',
    tip: 'Остановите автопан для ручного перемещения и изменения масштаба.',
    nodes: stressNodes,
    edges: stressEdges,
    motion: 'viewport',
  },
  {
    id: 'moving-viewport',
    title: 'Движение полотна',
    category: 'Производительность',
    description:
      'Непрерывное панорамирование над 120 узлами и соединениями для измерения FPS.',
    tip: 'Приостановите анимацию, чтобы попробовать ручное управление.',
    nodes: motionNodes,
    edges: motionEdges,
    motion: 'viewport',
  },
  {
    id: 'moving-nodes',
    title: 'Движение узлов',
    category: 'Производительность',
    description:
      '120 узлов и их рёбра меняют позиции каждый кадр; изменения объединяются в один пакет.',
    tip: 'FPS показывает частоту кадров анимации, а история редактора не заполняется.',
    nodes: motionNodes,
    edges: motionEdges,
    motion: 'nodes',
  },
  {
    id: 'combined',
    title: 'Совместная анимация',
    category: 'Производительность',
    description: 'Одновременно движутся viewport, карточки и соединения.',
    tip: 'Сравните FPS с двумя предыдущими сценариями на одном устройстве.',
    nodes: motionNodes,
    edges: motionEdges,
    motion: 'combined',
  },
];

export function sceneFromHash(hash: string): DemoScene {
  return scenes.find(scene => `#${scene.id}` === hash) ?? scenes[0]!;
}
