// ══════════════════════════════════════════════════════════════════
// GROUP 1 – BASIC
// ══════════════════════════════════════════════════════════════════
import type { Group } from './types';

export const basicGroup: Group = {
  name: '📐 Basic',
  categories: [
    {
      name: '⚙️ Environment',
      items: [
        {
          label: 'Board cơ bản (có trục)',
          code: `const board = JXG.JSXGraph.initBoard(BOARDID, {
  boundingbox: [-6, 6, 6, -6],
  keepaspectratio: true,
  showCopyright: false,
  showNavigation: true,
  axis: true,
});
board.options.point.label.fontSize = 18;
board.options.text.fontSize = 18; // Tăng cỡ chữ
board.options.text.useKatex = true;
board.options.point.label.autoPosition = true;
board.options.point.label.autoMaxDistance = 15;
`,
        },
        {
          label: 'Board không có trục',
          code: `const board = JXG.JSXGraph.initBoard(BOARDID, {
  boundingbox: [-8, 8, 8, -8],
  keepaspectratio: true,
  showCopyright: false,
  showNavigation: false,
  axis: false,
});
board.options.point.label.fontSize = 18;
board.options.text.fontSize = 18; // Tăng cỡ chữ
board.options.text.useKatex = true;
board.options.point.label.autoPosition = true;
board.options.point.label.autoMaxDistance = 15;
`,
        },
        {
          label: 'Board 3D (View3D)',
          code: `const board = JXG.JSXGraph.initBoard(BOARDID, {
  boundingbox: [-8, 8, 8, -8],
  keepaspectratio: true,
  showCopyright: false,
  showNavigation: true,
  axis: false,
});

const view = board.create('view3d', [
  [-6, -3], [8, 8],          // position & size in board coords
  [[-5, 5], [-5, 5], [-5, 5]], // x, y, z ranges
], {
  xPlaneRear: { visible: true, fillOpacity: 0.06 },
  yPlaneRear: { visible: true, fillOpacity: 0.06 },
  zPlaneRear: { visible: true, fillOpacity: 0.06 },
});
board.options.point.label.fontSize = 18;
board.options.text.fontSize = 18; // Tăng cỡ chữ
board.options.text.useKatex = true;
board.options.point.label.autoPosition = true;
board.options.point.label.autoMaxDistance = 15;
`,
        },
        {
          label: 'Board với lưới (grid)',
          code: `const board = JXG.JSXGraph.initBoard(BOARDID, {
  boundingbox: [-6, 6, 6, -6],
  keepaspectratio: true,
  showCopyright: false,
  showNavigation: true,
  axis: true,
  grid: true,
});
`,
        },
      ],
    },
    {
      name: '• Point',
      items: [
        {
          label: 'Free Point',
          code: `var A = board.create('point', [1, 2], {
  name: 'A', size: 4, strokeColor: '#1e3c96', label: {offset: [10, 10]}
});
`,
        },
        {
          label: 'Fixed Point (không kéo được)',
          code: `var A = board.create('point', [2, 3], {
  name: 'A', size: 4, fixed: true,
  strokeColor: '#555', label: {offset: [10, 10]}
});
`,
        },
        {
          label: 'Point on Object (Glider)',
          code: `// G trượt trên đối tượng obj (line, circle, curve…)
var obj = board.create('line', [[-4, 0], [4, 0]], { strokeColor: '#555' });
var G = board.create('glider', [1, 0, obj], {
  name: 'G', size: 5,
  strokeColor: '#c00', label: {offset: [10, 10]}
});
`,
        },
        {
          label: 'Midpoint',
          code: `var A = board.create('point', [-3, 0], { name: 'A' });
var B = board.create('point', [ 3, 0], { name: 'B' });
var M = board.create('midpoint', [A, B], {
  name: 'M', size: 4,
  strokeColor: '#090', label: {offset: [10, 10]}
});
`,
        },
        {
          label: 'Intersection of two lines',
          code: `var l1 = board.create('line', [[-3, -1], [3, 2]], { strokeColor: '#1e3c96' });
var l2 = board.create('line', [[-3,  2], [3, -1]], { strokeColor: '#c00' });
var I  = board.create('intersection', [l1, l2, 0], {
  name: 'I', size: 5,
  strokeColor: '#c80', fillColor: '#c80', label: {offset: [10, 10]}
});
`,
        },
        {
          label: 'Intersection of line & circle',
          code: `var l = board.create('line', [[-5, 0], [5, 1]], { strokeColor: '#555' });
var c = board.create('circle', [[0, 0], 3], { strokeColor: '#1e3c96' });
var I1 = board.create('intersection', [c, l, 0], { name: 'I₁', size: 4, fillColor: '#c83', label: {offset: [10, 10]} });
var I2 = board.create('intersection', [c, l, 1], { name: 'I₂', size: 4, fillColor: '#c83', label: {offset: [10, 10]} });
`,
        },
        {
          label: 'Circumcenter',
          code: `var A = board.create('point', [-3, -1], { name: 'A' });
var B = board.create('point', [ 3, -1], { name: 'B' });
var C = board.create('point', [ 0,  3], { name: 'C' });
var O = board.create('circumcenter', [A, B, C], {
  name: 'O', size: 5,
  strokeColor: '#c83c3c', label: {offset: [10, 10]}
});
`,
        },
        {
          label: 'Incenter',
          code: `var A = board.create('point', [-3, -1], { name: 'A' });
var B = board.create('point', [ 3, -1], { name: 'B' });
var C = board.create('point', [ 0,  3], { name: 'C' });
var I = board.create('incenter', [A, B, C], {
  name: 'I', size: 5,
  strokeColor: '#36a', label: {offset: [10, 10]}
});
`,
        },
        {
          label: 'Centroid',
          code: `var A = board.create('point', [-3, -1], { name: 'A' });
var B = board.create('point', [ 3, -1], { name: 'B' });
var C = board.create('point', [ 0,  3], { name: 'C' });
var G = board.create('centroid', [A, B, C], {
  name: 'G', size: 5,
  strokeColor: '#090', label: {offset: [10, 10]}
});
`,
        },
        {
          label: 'Orthocenter',
          code: `var A = board.create('point', [-3, -1], { name: 'A' });
var B = board.create('point', [ 3, -1], { name: 'B' });
var C = board.create('point', [ 0,  3], { name: 'C' });
var H = board.create('orthocenter', [A, B, C], {
  name: 'H', size: 5,
  strokeColor: '#a0a', label: {offset: [10, 10]}
});
`,
        },
        {
          label: 'Point inside Circle',
          code: `// Tạo đường tròn (O, I) trước, rồi tạo điểm P bên trong
var O = board.create('point', [0, 0], { name: 'O' });
var I = board.create('point', [3, 0], { name: 'I' });
var OI = board.create('segment', [O, I], { strokeColor: '#aaa', strokeWidth: 1 });
board.create('circle', [O, I], { strokeColor: '#1e3c96' });

function clampInsideCircle(point) {
  const radius = OI.L();
  const cx = O.X(), cy = O.Y();
  const dx = point.X() - cx, dy = point.Y() - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist >= radius) {
    const scale = (radius - 0.01) / dist;
    point.setPosition(JXG.COORDS_BY_USER, [cx + dx * scale, cy + dy * scale]);
    board.update();
  }
}

const P = board.create('point', [-1.8, 0.8], {
  name: 'P', strokeColor: 'red', size: 5,
  label: { offset: [0, -15] },
});
P.on('drag', () => clampInsideCircle(P));
O.on('drag', () => clampInsideCircle(P));
I.on('drag', () => clampInsideCircle(P));
`,
        },
      ],
    },
    {
      name: '— Straight Edges',
      items: [
        {
          label: 'Segment',
          code: `var A = board.create('point', [-3, 0], { name: 'A' });
var B = board.create('point', [ 3, 0], { name: 'B' });
var s = board.create('segment', [A, B], {
  strokeColor: '#333', strokeWidth: 2,
});
`,
        },
        {
          label: 'Ray',
          code: `var A = board.create('point', [0, 0], { name: 'A' });
var B = board.create('point', [2, 1], { name: 'B' });
var r = board.create('ray', [A, B], {
  strokeColor: '#333', strokeWidth: 1.5,
});
`,
        },
        {
          label: 'Line (through 2 points)',
          code: `var P = board.create('point', [-2, 1], { name: 'P' });
var Q = board.create('point', [ 2, 3], { name: 'Q' });
var l = board.create('line', [P, Q], {
  strokeColor: '#1e3c96', strokeWidth: 1.5,
});
`,
        },
        {
          label: 'Line (equation ax+by+c=0)',
          code: `// Đường thẳng: 2x – y + 1 = 0  →  coefficients [a, b, c]
var l = board.create('line', [2, -1, 1], {
  strokeColor: '#1e3c96', strokeWidth: 2,
});
`,
        },
        {
          label: 'Parallel Line',
          code: `var l = board.create('line', [[-3, 1], [3, 3]], { strokeColor: '#555' });
var P = board.create('point', [0, -1], { name: 'P' });
var par = board.create('parallel', [l, P], {
  strokeColor: '#090', strokeWidth: 2,
  dash: 2,
});
`,
        },
        {
          label: 'Perpendicular Line',
          code: `var l = board.create('line', [[-3, 0], [3, 1]], { strokeColor: '#555' });
var P = board.create('point', [1, 2], { name: 'P' });
var perp = board.create('perpendicular', [l, P], {
  strokeColor: '#c00', strokeWidth: 2,
});
`,
        },
        {
          label: 'Angle Bisector',
          code: `var A = board.create('point', [-2, -2], { name: 'A' });
var B = board.create('point', [ 0,  0], { name: 'B' });
var C = board.create('point', [ 3, -1], { name: 'C' });
var bis = board.create('bisector', [A, B, C], {
  strokeColor: '#c80', strokeWidth: 1.5, dash: 3,
});
`,
        },
      ],
    },
    {
      name: '⭕ Circle & Arc',
      items: [
        {
          label: 'Circle (center + point on circle)',
          code: `var O = board.create('point', [0, 0], { name: 'O' });
var A = board.create('point', [3, 0], { name: 'A' });
var c = board.create('circle', [O, A], {
  strokeColor: '#1e3c96', fillColor: 'rgba(30,60,150,0.08)',
});
`,
        },
        {
          label: 'Circle (center + radius value)',
          code: `var O = board.create('point', [0, 0], { name: 'O' });
var c = board.create('circle', [O, 3], {
  strokeColor: '#1e3c96',
});
`,
        },
        {
          label: 'Circumcircle of triangle',
          code: `var A = board.create('point', [-3, -1], { name: 'A' });
var B = board.create('point', [ 3, -1], { name: 'B' });
var C = board.create('point', [ 0,  3], { name: 'C' });
board.create('polygon', [A, B, C], {
  fillColor: 'rgba(30,60,150,0.08)', strokeColor: '#1e3c96',
});
board.create('circumcircle', [A, B, C], {
  strokeColor: '#c83c3c', strokeWidth: 1.5, dash: 2,
});
board.create('circumcenter', [A, B, C], {
  name: 'O', size: 4, fillColor: '#c83c3c',
});
`,
        },
        {
          label: 'Incircle of triangle',
          code: `var A = board.create('point', [-3, -1], { name: 'A' });
var B = board.create('point', [ 3, -1], { name: 'B' });
var C = board.create('point', [ 0,  3], { name: 'C' });
board.create('polygon', [A, B, C], {
  fillColor: 'rgba(30,100,30,0.08)', strokeColor: '#1a6',
});
board.create('incircle', [A, B, C], {
  strokeColor: '#36a', strokeWidth: 1.5, dash: 2,
});
board.create('incenter', [A, B, C], {
  name: 'I', size: 4, fillColor: '#36a',
});
`,
        },
        {
          label: 'Arc (center, start, end)',
          code: `var O  = board.create('point', [0, 0], { name: 'O' });
var A  = board.create('point', [3, 0], { name: 'A' });
var B  = board.create('point', [0, 3], { name: 'B' });
var arc = board.create('arc', [O, A, B], {
  strokeColor: '#e44', strokeWidth: 2,
});
`,
        },
        {
          label: 'Sector',
          code: `var O = board.create('point', [0, 0], { name: 'O' });
var A = board.create('point', [3, 0], { name: 'A' });
var B = board.create('point', [0, 3], { name: 'B' });
var sector = board.create('sector', [O, A, B], {
  strokeColor: '#1e3c96',
  fillColor: 'rgba(30,60,150,0.2)',
  strokeWidth: 1.5,
});
`,
        },
        {
          label: 'Semicircle',
          code: `var A = board.create('point', [-2, 0], { name: 'A' });
var B = board.create('point', [ 2, 0], { name: 'B' });
var semi = board.create('semicircle', [A, B], {
  strokeColor: '#1e3c96', fillColor: 'rgba(30,60,150,0.1)',
});
`,
        },
      ],
    },
    {
      name: '🔺 Polygon',
      items: [
        {
          label: 'Triangle',
          code: `var A = board.create('point', [-3, -2], { name: 'A' });
var B = board.create('point', [ 3, -2], { name: 'B' });
var C = board.create('point', [ 0,  3], { name: 'C' });
board.create('polygon', [A, B, C], {
  fillColor: 'rgba(30,60,150,0.12)',
  strokeColor: '#1e3c96', strokeWidth: 2,
});
`,
        },
        {
          label: 'Quadrilateral',
          code: `var A = board.create('point', [-3, -2], { name: 'A' });
var B = board.create('point', [ 3, -2], { name: 'B' });
var C = board.create('point', [ 3,  2], { name: 'C' });
var D = board.create('point', [-3,  2], { name: 'D' });
board.create('polygon', [A, B, C, D], {
  fillColor: 'rgba(0,150,80,0.1)',
  strokeColor: '#096', strokeWidth: 2,
});
`,
        },
        {
          label: 'Regular Polygon',
          code: `var A = board.create('point', [3, 0], { name: 'A' });
var B = board.create('point', [1.5, 2.6], { name: 'B' });
// Số cạnh = 6 (lục giác)
var hex = board.create('regularpolygon', [A, B, 6], {
  fillColor: 'rgba(255,165,0,0.15)',
  strokeColor: '#c80', strokeWidth: 2,
});
`,
        },
        {
          label: 'Angle marker',
          code: `var A = board.create('point', [-2, 0], { name: 'A' });
var B = board.create('point', [ 0, 0], { name: 'B' });
var C = board.create('point', [ 1, 1.5], { name: 'C' });
board.create('angle', [A, B, C], {
  radius: 0.8, name: 'α',
  fillColor: 'rgba(200,0,0,0.1)',
  strokeColor: '#c00',
});
`,
        },
      ],
    },
  ],
};
