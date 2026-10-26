// ══════════════════════════════════════════════════════════════════
// GROUP 3 – 3D
// ══════════════════════════════════════════════════════════════════
import type { Group } from './types';

export const threeDGroup: Group = {
  name: '🧊 3D',
  categories: [
    {
      name: '🗂️ Setup',
      items: [
        {
          label: 'View3D board + axes',
          code: `const board = JXG.JSXGraph.initBoard(BOARDID, {
  boundingbox: [-8, 8, 8, -8],
  keepaspectratio: true,
  showCopyright: false,
  showNavigation: true,
  axis: false,
});

const view = board.create('view3d', [
  [-6, -3], [8, 8],
  [[-5, 5], [-5, 5], [-5, 5]],
], {
  xPlaneRear:       { visible: true, fillOpacity: 0.06 },
  yPlaneRear:       { visible: true, fillOpacity: 0.06 },
  zPlaneRear:       { visible: true, fillOpacity: 0.06 },
  xPlaneRearYAxis:  { strokeColor: '#aaa' },
  xPlaneRearZAxis:  { strokeColor: '#aaa' },
  yPlaneRearXAxis:  { strokeColor: '#aaa' },
  yPlaneRearZAxis:  { strokeColor: '#aaa' },
});
`,
        },
      ],
    },
    {
      name: '• Shapes',
      items: [
        {
          label: 'Point3D',
          code: `// view phải được tạo trước (xem Setup)
var A = view.create('point3d', [1, 2, 3], {
  name: 'A', size: 4,
  strokeColor: '#1e3c96', fillColor: '#1e3c96',
});
`,
        },
        {
          label: 'Line3D',
          code: `var A = view.create('point3d', [0, 0, 0], { name: 'A' });
var B = view.create('point3d', [3, 2, 1], { name: 'B' });
view.create('line3d', [A, B], { strokeColor: '#1e3c96', strokeWidth: 2 });
`,
        },
        {
          label: 'Plane3D (parametric)',
          code: `// Plane: P(s,t) = [s, t, 0]  (the XY plane)
view.create('plane3d', [
  [0, 0, 0],  // origin point
  [1, 0, 0],  // direction u
  [0, 1, 0],  // direction v
  [-3, 3], [-3, 3], // s range, t range
], {
  fillColor: 'rgba(30,60,150,0.15)',
  strokeColor: '#1e3c96',
});
`,
        },
        {
          label: 'Sphere3D',
          code: `var O = view.create('point3d', [0, 0, 0], { name: 'O' });
view.create('sphere3d', [O, 2], {
  strokeColor: '#1e3c96',
  fillColor: 'rgba(30,60,150,0.12)',
});
`,
        },
        {
          label: 'Curve3D (parametric)',
          code: `// Helix
view.create('curve3d', [
  function(t) { return 2 * Math.cos(t); },  // x(t)
  function(t) { return 2 * Math.sin(t); },  // y(t)
  function(t) { return t / 2; },             // z(t)
  [0, 4 * Math.PI],                          // t range
], { strokeColor: '#c83c3c', strokeWidth: 2 });
`,
        },
        {
          label: 'Surface3D (parametric)',
          code: `// Saddle surface: z = x²-y²
view.create('parametricsurface3d', [
  function(u, v) { return u; },
  function(u, v) { return v; },
  function(u, v) { return u * u - v * v; },
  [-2, 2], [-2, 2],             // u range, v range
  [20, 20],                     // grid resolution
], {
  strokeColor: '#1e3c96', strokeWidth: 0.5,
  fillColor: 'rgba(30,60,150,0.15)',
});
`,
        },
      ],
    },
    {
      name: '📐 3D Geometry',
      items: [
        {
          label: 'Angle in 3D',
          code: `var A = view.create('point3d', [3, 0, 0], { name: 'A' });
var B = view.create('point3d', [0, 0, 0], { name: 'B' });
var C = view.create('point3d', [0, 3, 0], { name: 'C' });
var ang = view.create('angle3d', [A, B, C], {
  radius: 0.8, strokeColor: '#c00', fillColor: 'rgba(200,0,0,0.15)',
});
board.create('text', [-5, -5, function() {
  return '∠ABC = ' + (ang.Value() * 180 / Math.PI).toFixed(2) + '°';
}], { fontSize: 14 });
`,
        },
        {
          label: 'Polygon3D (triangle)',
          code: `var A = view.create('point3d', [-2,  0, 0], { name: 'A' });
var B = view.create('point3d', [ 2,  0, 0], { name: 'B' });
var C = view.create('point3d', [ 0,  2, 2], { name: 'C' });
view.create('polygon3d', [A, B, C], {
  fillColor: 'rgba(30,60,150,0.2)',
  strokeColor: '#1e3c96', strokeWidth: 2,
});
`,
        },
        {
          label: 'Distance 3D',
          code: `var A = view.create('point3d', [1, 2, 3], { name: 'A' });
var B = view.create('point3d', [4, 0, 1], { name: 'B' });
board.create('text', [-5, -4, function() {
  var dx = A.coords.usrCoords[1] - B.coords.usrCoords[1];
  var dy = A.coords.usrCoords[2] - B.coords.usrCoords[2];
  var dz = A.coords.usrCoords[3] - B.coords.usrCoords[3];
  return 'AB = ' + Math.sqrt(dx*dx + dy*dy + dz*dz).toFixed(3);
}], { fontSize: 14 });
`,
        },
      ],
    },
    {
      name: '∿ 3D Functions',
      items: [
        {
          label: 'Surface z = f(x, y)',
          code: `// Paraboloid: z = x²+y²
view.create('parametricsurface3d', [
  function(u, v) { return u; },
  function(u, v) { return v; },
  function(u, v) { return u * u + v * v; },
  [-2, 2], [-2, 2], [20, 20],
], {
  strokeColor: 'rgba(30,60,150,0.4)', strokeWidth: 0.5,
  fillColor: 'rgba(30,60,150,0.15)',
});
`,
        },
        {
          label: 'Function graph on slider',
          code: `var t = board.create('slider', [[-6, -5], [6, -5], [1, 1, 4]], { name: 't' });

view.create('parametricsurface3d', [
  function(u, v) { return u; },
  function(u, v) { return v; },
  function(u, v) { return t.Value() * Math.sin(Math.sqrt(u*u + v*v)); },
  [-4, 4], [-4, 4], [30, 30],
], {
  strokeColor: 'rgba(200,60,60,0.4)', strokeWidth: 0.5,
  fillColor: 'rgba(200,60,60,0.15)',
});
`,
        },
        {
          label: 'Vector field (arrows)',
          code: `// Example: F(x,y) = (-y, x)  →  rotational field
var n = 6; // grid density
for (var i = -n; i <= n; i++) {
  for (var j = -n; j <= n; j++) {
    var x = i * 0.7, y = j * 0.7;
    var vx = -y * 0.15, vy = x * 0.15;
    board.create('arrow', [[x, y], [x + vx, y + vy]], {
      strokeColor: '#1e3c96', strokeWidth: 1,
      lastArrow: { type: 1, size: 4 },
    });
  }
}
`,
        },
      ],
    },
    {
      name: '🎛️ 3D Interaction',
      items: [
        {
          label: 'Glider on 3D curve',
          code: `// Helix path
var helix = view.create('curve3d', [
  function(t) { return 2 * Math.cos(t); },
  function(t) { return 2 * Math.sin(t); },
  function(t) { return t * 0.4; },
  [0, 4 * Math.PI],
], { strokeColor: '#aaa', strokeWidth: 1.5 });

var G = view.create('glider', [0, helix], {
  name: 'G', size: 5,
  strokeColor: '#c00', fillColor: '#c00',
});
`,
        },
        {
          label: 'Rotation animation',
          code: `// Rotate the view programmatically
var angle = 0;
var timer = setInterval(function() {
  angle += 0.01;
  view.setAttribute({ az: { spoiler: angle } });
  board.update();
  if (angle > 2 * Math.PI) clearInterval(timer);
}, 30);
`,
        },
      ],
    },
  ],
};
