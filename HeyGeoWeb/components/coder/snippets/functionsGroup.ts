// ══════════════════════════════════════════════════════════════════
// GROUP 2 – FUNCTIONS
// ══════════════════════════════════════════════════════════════════
import type { Group } from './types';

export const functionsGroup: Group = {
  name: '∫ Functions',
  categories: [
    {
      name: '📏 Basic Measures',
      items: [
        {
          label: 'Length of segment',
          code: `var A = board.create('point', [-2, 1], { name: 'A' });
var B = board.create('point', [ 3, 4], { name: 'B' });
var s = board.create('segment', [A, B], { strokeColor: '#333' });
// Length displayed as dynamic text
board.create('text', [-3, 5, function() {
  return 'AB = ' + s.L().toFixed(3);
}], { fontSize: 16, strokeColor: '#1e3c96' });
`,
        },
        {
          label: 'Distance between two points',
          code: `var A = board.create('point', [-2, 0], { name: 'A' });
var B = board.create('point', [ 3, 4], { name: 'B' });
board.create('text', [-4, 5, function() {
  return 'd(A,B) = ' + JXG.Math.Geometry.distance(
    A.coords.usrCoords, B.coords.usrCoords
  ).toFixed(3);
}], { fontSize: 15 });
`,
        },
        {
          label: 'Perimeter of polygon',
          code: `var A = board.create('point', [-3, -2], { name: 'A' });
var B = board.create('point', [ 3, -2], { name: 'B' });
var C = board.create('point', [ 0,  3], { name: 'C' });
var poly = board.create('polygon', [A, B, C], { fillColor: 'rgba(30,60,150,0.1)', strokeColor: '#1e3c96' });
board.create('text', [-4, 4, function() {
  return 'Perimeter = ' + poly.L().toFixed(3);
}], { fontSize: 15 });
`,
        },
        {
          label: 'Circumference of circle',
          code: `var O = board.create('point', [0, 0], { name: 'O' });
var A = board.create('point', [2, 0], { name: 'A' });
var c = board.create('circle', [O, A], { strokeColor: '#1e3c96' });
board.create('text', [-4, 3, function() {
  return 'C = ' + (2 * Math.PI * c.Radius()).toFixed(3);
}], { fontSize: 15 });
`,
        },
        {
          label: 'Angle measure (degrees)',
          code: `var A = board.create('point', [-3, 0], { name: 'A' });
var B = board.create('point', [ 0, 0], { name: 'B' });
var C = board.create('point', [ 2, 2], { name: 'C' });
var ang = board.create('angle', [A, B, C], { radius: 1, name: '' });
board.create('text', [-4, 4, function() {
  return '∠ABC = ' + (ang.Value() * 180 / Math.PI).toFixed(2) + '°';
}], { fontSize: 15 });
`,
        },
        {
          label: 'Area of polygon',
          code: `var A = board.create('point', [-3, -2], { name: 'A' });
var B = board.create('point', [ 3, -2], { name: 'B' });
var C = board.create('point', [ 0,  3], { name: 'C' });
var poly = board.create('polygon', [A, B, C], { fillColor: 'rgba(30,60,150,0.1)', strokeColor: '#1e3c96' });
board.create('text', [-4, 5, function() {
  return 'Area = ' + Math.abs(poly.Area()).toFixed(3);
}], { fontSize: 15 });
`,
        },
        {
          label: 'Area of circle',
          code: `var O = board.create('point', [0, 0], { name: 'O' });
var A = board.create('point', [2, 0], { name: 'A' });
var c = board.create('circle', [O, A], { strokeColor: '#1e3c96', fillColor: 'rgba(30,60,150,0.1)' });
board.create('text', [-4, 3, function() {
  return 'Area = ' + (Math.PI * c.Radius() * c.Radius()).toFixed(3);
}], { fontSize: 15 });
`,
        },
      ],
    },
    {
      name: '🔬 Advanced Measures',
      items: [
        {
          label: 'Arc angle (radians & degrees)',
          code: `var O  = board.create('point', [0, 0], { name: 'O' });
var A  = board.create('point', [3, 0], { name: 'A' });
var B  = board.create('point', [0, 3], { name: 'B' });
var arc = board.create('arc', [O, A, B], { strokeColor: '#e44', strokeWidth: 2 });
board.create('text', [-4, 4, function() {
  var rad = arc.Value();
  return 'Arc angle = ' + rad.toFixed(3) + ' rad = ' + (rad * 180 / Math.PI).toFixed(2) + '°';
}], { fontSize: 14 });
`,
        },
        {
          label: 'Arc length',
          code: `var O  = board.create('point', [0, 0], { name: 'O' });
var A  = board.create('point', [3, 0], { name: 'A' });
var B  = board.create('point', [0, 3], { name: 'B' });
var arc = board.create('arc', [O, A, B], { strokeColor: '#e44', strokeWidth: 2 });
board.create('text', [-4, 4, function() {
  return 'Arc length = ' + (arc.Value() * arc.Radius()).toFixed(3);
}], { fontSize: 14 });
`,
        },
        {
          label: 'Radius of circle',
          code: `var O = board.create('point', [0, 0], { name: 'O' });
var A = board.create('point', [2.5, 0], { name: 'A' });
var c = board.create('circle', [O, A], { strokeColor: '#1e3c96' });
board.create('text', [-4, 3, function() {
  return 'r = ' + c.Radius().toFixed(3);
}], { fontSize: 15 });
`,
        },
        {
          label: 'Ratio of two segments',
          code: `var A  = board.create('point', [-4, 0], { name: 'A' });
var B  = board.create('point', [ 0, 0], { name: 'B' });
var C  = board.create('point', [ 4, 0], { name: 'C' });
var s1 = board.create('segment', [A, B], { strokeColor: '#1e3c96', strokeWidth: 2 });
var s2 = board.create('segment', [B, C], { strokeColor: '#c00',    strokeWidth: 2 });
board.create('text', [-4, 2, function() {
  return 'AB / BC = ' + (s1.L() / s2.L()).toFixed(3);
}], { fontSize: 15 });
`,
        },
      ],
    },
    {
      name: '📍 Coordinates',
      items: [
        {
          label: 'Abscissa x of a point',
          code: `var A = board.create('point', [2, 3], { name: 'A' });
board.create('text', [-4, 4, function() {
  return 'x_A = ' + A.X().toFixed(3);
}], { fontSize: 15 });
`,
        },
        {
          label: 'Ordinate y of a point',
          code: `var A = board.create('point', [2, 3], { name: 'A' });
board.create('text', [-4, 4, function() {
  return 'y_A = ' + A.Y().toFixed(3);
}], { fontSize: 15 });
`,
        },
        {
          label: 'Slope of a line',
          code: `var P = board.create('point', [-2, 0], { name: 'P' });
var Q = board.create('point', [ 2, 3], { name: 'Q' });
var l = board.create('line', [P, Q], { strokeColor: '#1e3c96' });
board.create('text', [-4, 4, function() {
  return 'slope = ' + l.Slope().toFixed(3);
}], { fontSize: 15 });
`,
        },
        {
          label: 'Equation of a line',
          code: `var P = board.create('point', [-2, 1], { name: 'P' });
var Q = board.create('point', [ 2, 3], { name: 'Q' });
var l = board.create('line', [P, Q], { strokeColor: '#1e3c96' });
// Line stored as ax + by + c = 0
board.create('text', [-4, -3, function() {
  var a = l.stdform[1].toFixed(2);
  var b = l.stdform[2].toFixed(2);
  var c = l.stdform[0].toFixed(2);
  return a + 'x + ' + b + 'y + ' + c + ' = 0';
}], { fontSize: 14 });
`,
        },
      ],
    },
    {
      name: '📈 Plot',
      items: [
        {
          label: 'Function graph f(x)',
          code: `board.create('functiongraph', [
  function(x) { return Math.sin(x); },
  -Math.PI * 2, Math.PI * 2,
], { strokeColor: '#c00', strokeWidth: 2 });
`,
        },
        {
          label: 'Function graph with slider',
          code: `var a = board.create('slider', [[-4, -4], [4, -4], [0.5, 1, 3]], { name: 'a' });
board.create('functiongraph', [
  function(x) { return a.Value() * Math.sin(x); },
  -Math.PI * 2, Math.PI * 2,
], { strokeColor: '#c00', strokeWidth: 2 });
`,
        },
        {
          label: 'Parametric curve',
          code: `// Lissajous figure: x=cos(t), y=sin(2t)
board.create('curve', [
  function(t) { return 3 * Math.cos(t); },
  function(t) { return 3 * Math.sin(2 * t); },
  0, 2 * Math.PI,
], { strokeColor: '#6a0dad', strokeWidth: 2 });
`,
        },
        {
          label: 'Polar curve',
          code: `// Rose: r = cos(3θ)
board.create('curve', [
  function(t) { return Math.cos(3 * t) * Math.cos(t); },
  function(t) { return Math.cos(3 * t) * Math.sin(t); },
  0, 2 * Math.PI,
], { strokeColor: '#c83c3c', strokeWidth: 2 });
`,
        },
        {
          label: 'Definite integral (area)',
          code: `var f = board.create('functiongraph', [
  function(x) { return x * x; },
], { strokeColor: '#00a', strokeWidth: 2 });

board.create('integral', [[0, 2], f], {
  fillColor: 'rgba(0,100,200,0.2)',
  strokeColor: '#00a',
  withLabel: true,
  label: { fontSize: 14 },
});
`,
        },
      ],
    },
    {
      name: '🌀 Locus',
      items: [
        {
          label: 'Trace Point',
          code: `var tracepoint = board.create('point', [1, 1], {
  name: 'trP', size: 4, trace: true,
  strokeColor: '#090', label: { offset: [0, 20] },
  traceAttributes: {
    strokeColor:   '#4caf50',
    fillColor:     '#4caf50',
    strokeOpacity: 0.2,
    fillOpacity:   0.2,
    strokeWidth:   1,
    size:          2,
  },
});
`,
        },
        {
          label: 'Locus of a point',
          code: `var c = board.create('circle', [[0, 0], 3], { strokeColor: '#ccc' });
var G = board.create('glider', [3, 0, c], { name: 'G', size: 4 });

// Trace point: midpoint between G and a fixed point
var F = board.create('point', [1, 0], { name: 'F', fixed: true });
var M = board.create('midpoint', [G, F], { name: 'M', size: 3, color: '#c00', trace: false });

var locus = board.create('locus', [M], {
  strokeColor: '#c00', strokeWidth: 2,
});
`,
        },
      ],
    },
    {
      name: '🔄 Transformations',
      items: [
        {
          label: 'Translation (Phép tịnh tiến)',
          code: `// Kéo slider dx/dy → A' cập nhật ngay
var dx = board.create('slider', [[-4, -4.5], [4, -4.5], [-5, 2, 5]], { name: 'dx' });
var dy = board.create('slider', [[-4, -5.5], [4, -5.5], [-5, 1, 5]], { name: 'dy' });

var A = board.create('point', [0, 1], {
  name: 'A', size: 5, strokeColor: '#1e3c96', fillColor: '#1e3c96',
});

var T  = board.create('transform', [() => dx.Value(), () => dy.Value()], { type: 'translate' });
var A1 = board.create('point', [A, T], {
  name: "A'", size: 5, strokeColor: '#c00', fillColor: '#c00', fixed: true,
});

board.create('arrow', [A, A1], { strokeColor: '#090', strokeWidth: 2 });
board.create('text', [-4, 3.5, () =>
  \`T(\${dx.Value().toFixed(1)} , \${dy.Value().toFixed(1)})\`
], { fontSize: 14 });
`,
        },
        {
          label: 'Rotation (Phép quay)',
          code: `// Kéo slider α hoặc tâm O → A' cập nhật ngay
var alpha = board.create('slider', [[-4, -4.5], [4, -4.5], [0, 90, 360]], {
  name: 'α (°)', snapWidth: 1,
});

var O = board.create('point', [0, 0], { name: 'O', size: 4, strokeColor: '#555', fillColor: '#555' });
var A = board.create('point', [3, 0], { name: 'A', size: 5, strokeColor: '#1e3c96', fillColor: '#1e3c96' });

var R  = board.create('transform', [() => alpha.Value() * Math.PI / 180, O], { type: 'rotate' });
var A1 = board.create('point', [A, R], {
  name: "A'", size: 5, strokeColor: '#c00', fillColor: '#c00', fixed: true,
});

board.create('segment', [O, A],  { strokeColor: '#1e3c96', strokeWidth: 1.5 });
board.create('segment', [O, A1], { strokeColor: '#c00',    strokeWidth: 1.5 });
board.create('text', [-4, 3.5, () =>
  \`Quay \${alpha.Value().toFixed(0)}° quanh O\`
], { fontSize: 14 });
`,
        },
        {
          label: 'Dilation (Phép vị tự)',
          code: `// Kéo slider k hoặc tâm O → A' cập nhật ngay
var k = board.create('slider', [[-4, -4.5], [4, -4.5], [-3, 2, 4]], { name: 'k' });

var O = board.create('point', [0, 0], { name: 'O', size: 4, strokeColor: '#555', fillColor: '#555' });
var A = board.create('point', [2, 1], { name: 'A', size: 5, strokeColor: '#1e3c96', fillColor: '#1e3c96' });

// A' = O + k·(A − O)
var A1 = board.create('point', [
  () => O.X() + k.Value() * (A.X() - O.X()),
  () => O.Y() + k.Value() * (A.Y() - O.Y()),
], { name: "A'", size: 5, strokeColor: '#c00', fillColor: '#c00', fixed: true });

board.create('line', [O, A], { strokeColor: '#aaa', strokeWidth: 1, dash: 2, straightFirst: false, straightLast: true });
board.create('text', [-4, 3.5, () => \`k = \${k.Value().toFixed(2)}\`], { fontSize: 14 });
`,
        },
        {
          label: 'Reflection over line (Đối xứng qua đường thẳng)',
          code: `// Kéo P, Q (trục) hoặc A → A' cập nhật ngay
var P = board.create('point', [-3, 0], { name: 'P', strokeColor: '#555' });
var Q = board.create('point', [ 3, 1], { name: 'Q', strokeColor: '#555' });
var axis = board.create('line', [P, Q], { strokeColor: '#555', dash: 2 });

var A  = board.create('point', [1, 2], { name: 'A', size: 5, strokeColor: '#1e3c96', fillColor: '#1e3c96' });
var A1 = board.create('reflection', [A, axis], {
  name: "A'", size: 5, strokeColor: '#c00', fillColor: '#c00',
});

board.create('segment', [A, A1], { strokeColor: '#aaa', strokeWidth: 1, dash: 3 });
`,
        },
        {
          label: 'Reflection over point (Đối xứng qua điểm)',
          code: `// Kéo O hoặc A → A' cập nhật ngay (A' = 2O − A)
var O = board.create('point', [0, 0], {
  name: 'O', size: 5, strokeColor: '#555', fillColor: '#555',
});
var A = board.create('point', [2, 1], {
  name: 'A', size: 5, strokeColor: '#1e3c96', fillColor: '#1e3c96',
});

var A1 = board.create('point', [
  () => 2 * O.X() - A.X(),
  () => 2 * O.Y() - A.Y(),
], { name: "A'", size: 5, strokeColor: '#c00', fillColor: '#c00', fixed: true });

board.create('segment', [A, A1], { strokeColor: '#aaa', strokeWidth: 1, dash: 3 });
`,
        },
        {
          label: 'Composite transform (Tổ hợp biến hình)',
          code: `// T1: tịnh tiến  →  T2: quay  →  A'' = T2(T1(A))
var tx    = board.create('slider', [[-4, -4.5], [4, -4.5], [-4, 2, 4]], { name: 'tx' });
var ty    = board.create('slider', [[-4, -5.5], [4, -5.5], [-4, 0, 4]], { name: 'ty' });
var alpha = board.create('slider', [[-4, -6.5], [4, -6.5], [0, 60, 360]], { name: 'α (°)' });

var O = board.create('point', [0, 0], { name: 'O', fixed: true, size: 3, strokeColor: '#555' });
var A = board.create('point', [2, 0], { name: 'A', size: 5, strokeColor: '#1e3c96', fillColor: '#1e3c96' });

var T1 = board.create('transform', [() => tx.Value(), () => ty.Value()], { type: 'translate' });
var T2 = board.create('transform', [() => alpha.Value() * Math.PI / 180, O], { type: 'rotate' });

var A1 = board.create('point', [A,  T1], { name: "A'",  size: 4, strokeColor: '#090', fillColor: '#090', fixed: true });
var A2 = board.create('point', [A1, T2], { name: "A''", size: 5, strokeColor: '#c00', fillColor: '#c00', fixed: true });
`,
        },
      ],
    },
    {
      name: '�🔘 Buttons',
      items: [
        {
          label: 'Button – Hide / Show object',
          code: `var A = board.create('point', [1, 2], { name: 'A' });
var c = board.create('circle', [A, 2], { strokeColor: '#1e3c96' });

board.create('button', [0, -4, 'Hide / Show circle', function() {
  c.setAttribute({ visible: !c.getAttribute('visible') });
  board.update();
}], {});
`,
        },
        {
          label: 'Button – Start / Stop animation',
          code: `var alpha = board.create('slider', [[-4, -4], [4, -4], [0, 0, 2 * Math.PI]], {
  name: 'α', snapWidth: 0,
});
var A = board.create('point', [
  function() { return 3 * Math.cos(alpha.Value()); },
  function() { return 3 * Math.sin(alpha.Value()); },
], { name: 'A', size: 5, color: '#c00' });

var running = false;
var timer = null;

board.create('button', [-2, -5.5, 'Start', function() {
  if (running) return;
  running = true;
  timer = setInterval(function() {
    var v = (alpha.Value() + 0.04) % (2 * Math.PI);
    alpha.setValue(v);
    board.update();
  }, 30);
}], {});

board.create('button', [2, -5.5, 'Stop', function() {
  running = false;
  if (timer) { clearInterval(timer); timer = null; }
}], {});
`,
        },
        {
          label: 'Button – Move point to position',
          code: `var A = board.create('point', [0, 0], { name: 'A', size: 5, color: '#1e3c96' });

// Move A smoothly to [3, 2] in 800 ms
board.create('button', [0, -4, 'Move A → (3, 2)', function() {
  A.moveTo([3, 2], 800);
}], {});

board.create('button', [0, -5.5, 'Reset', function() {
  A.moveTo([0, 0], 600);
}], {});
`,
        },
        {
          label: 'Button – Reset board',
          code: `board.create('button', [0, -4, 'Reset', function() {
  board.fullUpdate();
}], {});
`,
        },
        {
          label: 'Button – Clear Traces',
          code: `const clearBtn = board.create('text', [-5.5, 4, '\\\\text{Xóa vết}'], {
  fontSize: 15,
  fixed: true,
  highlight: true,
  strokeColor: 'darkblue',
  useKatex: true,
  cssStyle: \`
    background-color: #f0f0f0;
    border: 1px solid #777;
    border-radius: 4px;
    padding: 4px 6px;
    cursor: pointer;
    box-shadow: 2px 2px 5px rgba(0,0,0,0.2);
    color: #c00;
    user-select: none;
  \`,
});

clearBtn.on('down', function() {
  for (let el in board.objects) {
    if (board.objects[el].clearTrace) {
      board.objects[el].clearTrace();
    }
  }
  board.update();
});
`,
        },
      ],
    },
    {
      name: '✏️ TextBox',
      items: [
        {
          label: 'Static text',
          code: `board.create('text', [1, 4, 'Hello, HeyGeo!'], {
  fontSize: 18,
  strokeColor: '#1e3c96',
  fixed: true,
});
`,
        },
        {
          label: 'KaTeX – inline formula',
          code: `// HeyGeo Web dùng KaTeX để render công thức (useKatex: true).
board.create('text', [0, 3, '\\\\( ax^2 + bx + c = 0 \\\\)'], {
  fontSize: 20,
  useKatex: true,
  fixed: true,
});
`,
        },
        {
          label: 'KaTeX – fraction',
          code: `board.create('text', [0, 3, '\\\\( \\\\dfrac{-b \\\\pm \\\\sqrt{b^2 - 4ac}}{2a} \\\\)'], {
  fontSize: 22,
  useKatex: true,
  fixed: true,
});
`,
        },
        {
          label: 'KaTeX – integral',
          code: `board.create('text', [0, 3, '\\\\( \\\\int_a^b f(x)\\\\,dx = F(b) - F(a) \\\\)'], {
  fontSize: 20,
  useKatex: true,
  fixed: true,
});
`,
        },
        {
          label: 'KaTeX – summation',
          code: `board.create('text', [0, 3, '\\\\( \\\\sum_{k=1}^{n} k = \\\\dfrac{n(n+1)}{2} \\\\)'], {
  fontSize: 20,
  useKatex: true,
  fixed: true,
});
`,
        },
        {
          label: 'Dynamic text (variable value)',
          code: `var A = board.create('point', [2, 2], { name: 'A' });
board.create('text', [3, 4, function() {
  return 'A = (' + A.X().toFixed(2) + ', ' + A.Y().toFixed(2) + ')';
}], { fontSize: 14, fixed: true });
`,
        },
        {
          label: 'Dynamic KaTeX (variable value)',
          code: `var A = board.create('point', [2, 1], { name: 'A' });
board.create('text', [-4, 5, function() {
  return '\\\\( x_A = ' + A.X().toFixed(2) + ',\\\\; y_A = ' + A.Y().toFixed(2) + ' \\\\)';
}], { fontSize: 16, useKatex: true });
`,
        },
      ],
    },
  ],
};
