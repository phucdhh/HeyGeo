// ══════════════════════════════════════════════════════════════════
// MathBox Snippets – InsertMenu groups
//
// Every snippet here is executed by the pixel harness (public/mb-snipcheck.html,
// generated from this file) and must add visible pixels on top of the base scene.
// MathBox 2.3.1 throws on unknown primitive properties, and its expr callbacks are
// index-space for `matrix` / range-space for `area`, `interval` and `array`.
//
// Deliberately NOT used (measured: zero pixels on screen):
//   • `strip`            – renders nothing with matrix/area data, use `surface`
//   • `label` / `format` – needs a text-atlas source chain, draws no pixels
//   • `spherical` / `polar` view nodes – grids and curves fall outside the camera
//        x ∈ [0, 1] in `interval` callbacks. `array.data` nesting is [width][items][channels],
//        and a two-point segment (vector, section outline) needs items: 2.
// ══════════════════════════════════════════════════════════════════
import type { Group } from './types';

export const mathboxBasicGroup: Group = {
  name: '🧊 MathBox Basic',
  categories: [
    {
      name: '⚙️ Khởi tạo',
      items: [
        {
          label: 'Sân khấu 3D (nền trong suốt)',
          code: `var mathbox = MathBox.mathBox({
  element: element,
  plugins: ['core', 'controls', 'cursor'],
  controls: { klass: THREE.OrbitControls },
  renderer: { parameters: { alpha: true, depth: true, stencil: true, preserveDrawingBuffer: true, antialias: true } },
});

var three = mathbox.three;
three.camera.position.set(-2, 2, 8);
`,
        },
        {
          label: 'Hệ tọa độ Oxyz (range + scale)',
          code: `var view = mathbox.cartesian({
  range: [[-1, 1], [-1, 1], [-1, 1]],
  scale: [1, 1, 1],
});
`,
        },
        {
          label: 'Khung nhìn 2D (mặt phẳng Oxy)',
          code: `var view = mathbox.cartesian({
  range: [[-2, 2], [-1.2, 1.2], [-1, 1]],
  scale: [2, 1.2, 1],
});
`,
        },
        {
          label: 'Tiêu điểm máy ảnh (focus)',
          code: `mathbox.set('focus', 3);
`,
        },
      ],
    },
    {
      name: '📏 Trục & Lưới',
      items: [
        {
          label: 'Ba trục xyz',
          code: `view.axis({ axis: 1, color: '#64748b', width: 3 })
  .axis({ axis: 2, color: '#64748b', width: 3 })
  .axis({ axis: 3, color: '#64748b', width: 3 });
`,
        },
        {
          label: 'Lưới ô vuông (mp Oxy)',
          code: `view.grid({ divideX: 10, divideY: 10, color: '#b6c2d2', opacity: 1 });
`,
        },
        {
          label: 'Lưới dựng đứng (mp Oxz)',
          code: `view.transform({ rotation: [Math.PI / 2, 0, 0] })
  .grid({ divideX: 10, divideY: 10, color: '#c8d3e0', opacity: 0.7 });
`,
        },
        {
          label: 'Vạch chia trên trục (ticks)',
          code: `view.scale({ divide: 8 });
view.ticks({ size: 25, width: 3, color: '#475569' });
`,
        },
        {
          label: 'Bộ trục + lưới + vạch chia',
          code: `view.axis({ axis: 1, color: '#dc2626', width: 4 })
  .axis({ axis: 2, color: '#2563eb', width: 4 })
  .axis({ axis: 3, color: '#059669', width: 4 });
view.grid({ divideX: 10, divideY: 10, color: '#dbe3ec', opacity: 1 });
view.scale({ divide: 10 });
view.ticks({ size: 20, width: 2, color: '#94a3b8' });
`,
        },
      ],
    },
    {
      name: '📈 Đường & Điểm',
      items: [
        {
          label: 'Đường sin (interval + line)',
          code: `view.interval({
  expr: function (emit, x, i, t) {
    emit(x, Math.sin(x + t), 0);
  },
  width: 64,
  channels: 3,
});
view.line({ width: 5, color: '#2563eb' });
`,
        },
        {
          label: 'Đường thẳng qua 2 điểm',
          code: `view.array({
  width: 2,
  channels: 3,
  data: [[-1, -0.5, 0], [1, 0.5, 0]],
});
view.line({ width: 4, color: '#dc2626' });
`,
        },
        {
          label: 'Điểm dữ liệu (point)',
          code: `view.interval({
  expr: function (emit, x, i, t) {
    emit(x, Math.sin(x * 2 + t), Math.cos(x));
  },
  width: 32,
  channels: 3,
});
view.point({ size: 10, shape: 'circle', color: '#dc2626' });
`,
        },
        {
          label: 'Đoạn véc-tơ (mũi tên)',
          code: `view.array({
  items: 2,
  width: 2,
  channels: 3,
  data: [
    [[0, 0, 0], [0.8, 0.2, 0]],
    [[0, 0, 0], [-0.3, 0.7, 0]],
  ],
});
view.vector({ width: 4, color: '#059669' });
`,
        },
        {
          label: 'Đường tròn (đóng kín)',
          code: `view.interval({
  width: 128,
  channels: 3,
  expr: function (emit, x, i, t) {
    var a = x * 6.283;
    emit(Math.cos(a), Math.sin(a), 0);
  },
});
view.line({ width: 4, color: '#2563eb', closed: true });
`,
        },
        {
          label: 'Elip (bán trục a, b)',
          code: `view.interval({
  width: 128,
  channels: 3,
  expr: function (emit, x, i, t) {
    var a = x * 6.283;
    emit(0.9 * Math.cos(a), 0.5 * Math.sin(a), 0);
  },
});
view.line({ width: 4, color: '#7c3aed', closed: true });
`,
        },
        {
          label: 'Parabol y = a·x²',
          code: `view.interval({
  width: 64,
  channels: 3,
  expr: function (emit, x, i, t) {
    var u = -1 + 2 * x;
    emit(u, 0.8 * u * u, 0);
  },
});
view.line({ width: 4, color: '#dc2626' });
`,
        },
        {
          label: 'Đường nét đứt (dashed)',
          code: `view.array({ width: 2, channels: 3, data: [[-0.9, -0.6, 0], [0.9, 0.6, 0]] });
view.line({ width: 5, color: '#334155', stroke: 'dashed' });
`,
        },
        {
          label: 'Hai đồ thị sin & cos',
          code: `view.interval({
  width: 96,
  channels: 3,
  expr: function (emit, x, i, t) { var u = -1 + 2 * x; emit(u, Math.sin(u * 6.283), 0); },
});
view.line({ width: 4, color: '#2563eb' });
view.interval({
  width: 96,
  channels: 3,
  expr: function (emit, x, i, t) { var u = -1 + 2 * x; emit(u, Math.cos(u * 6.283), 0); },
});
view.line({ width: 4, color: '#dc2626' });
`,
        },
      ],
    },
    {
      name: '🏔 Bề mặt',
      items: [
        {
          label: 'Mặt cao độ z = f(x, y) (area)',
          code: `view.area({
  expr: function (emit, x, y, i, j, t) {
    emit(x, y, Math.sin(x + t) * Math.cos(y - t));
  },
  width: 32,
  height: 32,
  channels: 3,
});
view.surface({ shaded: true, color: '#2563eb', opacity: 0.9 });
`,
        },
        {
          label: 'Mặt tham số (matrix, toạ độ chỉ số)',
          code: `view.matrix({
  width: 32,
  height: 32,
  channels: 3,
  expr: function (emit, i, j, t) {
    var u = -1 + 2 * i / 31;
    var v = -1 + 2 * j / 31;
    emit(u, v, Math.sin(u * 3 + t) * Math.cos(v * 3));
  },
});
view.surface({ shaded: true, color: '#7c3aed' });
`,
        },
        {
          label: 'Mặt chỉ khung (không tô)',
          code: `view.area({
  expr: function (emit, x, y, i, j, t) {
    emit(x, y, x * x - y * y);
  },
  width: 16,
  height: 16,
  channels: 3,
});
view.surface({ shaded: false, fill: false, lineX: true, lineY: true, width: 2, color: '#334155' });
`,
        },
        {
          label: 'Mặt cầu đơn vị (matrix + surface)',
          code: `view.matrix({
  width: 32,
  height: 16,
  channels: 3,
  expr: function (emit, i, j, t) {
    var u = i / 31 * 6.283;
    var v = -1.571 + j / 15 * 3.142;
    emit(Math.cos(v) * Math.cos(u), Math.sin(v), Math.cos(v) * Math.sin(u));
  },
});
view.surface({ shaded: true, color: '#0891b2', opacity: 0.85 });
`,
        },
      ],
    },
  ],
};

export const mathboxExamplesGroup: Group = {
  name: '📚 Ví dụ',
  categories: [
    {
      name: '🧊 Khối đa diện',
      items: [
        {
          label: 'Hình lập phương (tô + khung)',
          code: `var view = mathbox.cartesian({
  range: [[-1, 1], [-1, 1], [-1, 1]],
  scale: [1, 1, 1],
});

var s = 0.7;
view.array({
  items: 3,
  width: 12,
  channels: 3,
  data: [
    [[-s, -s,  s], [ s, -s,  s], [ s,  s,  s]],
    [[-s, -s,  s], [ s,  s,  s], [-s,  s,  s]],
    [[ s, -s, -s], [-s, -s, -s], [-s,  s, -s]],
    [[ s, -s, -s], [-s,  s, -s], [ s,  s, -s]],
    [[ s, -s,  s], [ s, -s, -s], [ s,  s, -s]],
    [[ s, -s,  s], [ s,  s, -s], [ s,  s,  s]],
    [[-s, -s, -s], [-s, -s,  s], [-s,  s,  s]],
    [[-s, -s, -s], [-s,  s,  s], [-s,  s, -s]],
    [[-s,  s,  s], [ s,  s,  s], [ s,  s, -s]],
    [[-s,  s,  s], [ s,  s, -s], [-s,  s, -s]],
    [[-s, -s, -s], [ s, -s, -s], [ s, -s,  s]],
    [[-s, -s, -s], [ s, -s,  s], [-s, -s,  s]],
  ],
});
view.face({ shaded: true, fill: true, line: true, width: 2, color: '#2563eb', opacity: 0.75 });

mathbox.set('focus', 3);
`,
        },
        {
          label: 'Tứ diện đều',
          code: `var view = mathbox.cartesian({
  range: [[-1, 1], [-1, 1], [-1, 1]],
  scale: [1, 1, 1],
});

view.array({
  items: 3,
  width: 4,
  channels: 3,
  data: [
    [[ 0.9, -0.5,  0.5], [-0.9, -0.5,  0.5], [ 0.0, -0.5, -0.9]],
    [[ 0.9, -0.5,  0.5], [ 0.0,  0.9,  0.0], [-0.9, -0.5,  0.5]],
    [[-0.9, -0.5,  0.5], [ 0.0,  0.9,  0.0], [ 0.0, -0.5, -0.9]],
    [[ 0.0, -0.5, -0.9], [ 0.0,  0.9,  0.0], [ 0.9, -0.5,  0.5]],
  ],
});
view.face({ shaded: true, fill: true, line: true, width: 2, color: '#7c3aed', opacity: 0.8 });

mathbox.set('focus', 3);
`,
        },
        {
          label: 'Chóp tứ giác đều',
          code: `var view = mathbox.cartesian({
  range: [[-1, 1], [-1, 1], [-1, 1]],
  scale: [1, 1, 1],
});

var a = 0.7, h = 0.9;
view.array({
  items: 3,
  width: 6,
  channels: 3,
  data: [
    [[-a, -h, -a], [ a, -h, -a], [0, h, 0]],
    [[ a, -h, -a], [ a, -h,  a], [0, h, 0]],
    [[ a, -h,  a], [-a, -h,  a], [0, h, 0]],
    [[-a, -h,  a], [-a, -h, -a], [0, h, 0]],
    [[-a, -h, -a], [ a, -h,  a], [ a, -h, -a]],
    [[-a, -h, -a], [-a, -h,  a], [ a, -h,  a]],
  ],
});
view.face({ shaded: true, fill: true, line: true, width: 2, color: '#059669', opacity: 0.8 });

mathbox.set('focus', 3);
`,
        },
        {
          label: 'Lăng trụ tam giác',
          code: `var view = mathbox.cartesian({
  range: [[-1, 1], [-1, 1], [-1, 1]],
  scale: [1, 1, 1],
});

var t = [[0, 0.6, -0.8], [0.7, -0.5, -0.8], [-0.7, -0.5, -0.8]];
var b = [[0, 0.6,  0.8], [0.7, -0.5,  0.8], [-0.7, -0.5,  0.8]];
view.array({
  items: 3,
  width: 8,
  channels: 3,
  data: [
    [t[0], t[1], t[2]],
    [b[2], b[1], b[0]],
    [t[0], t[1], b[1]], [t[0], b[1], b[0]],
    [t[1], t[2], b[2]], [t[1], b[2], b[1]],
    [t[2], t[0], b[0]], [t[2], b[0], b[2]],
  ],
});
view.face({ shaded: true, fill: true, line: true, width: 2, color: '#dc2626', opacity: 0.75 });

mathbox.set('focus', 3);
`,
        },
        {
          label: 'Bát diện đều (octahedron)',
          code: `var view = mathbox.cartesian({
  range: [[-1, 1], [-1, 1], [-1, 1]],
  scale: [1, 1, 1],
});

var u = 0.9;
view.array({
  items: 3,
  width: 8,
  channels: 3,
  data: [
    [[ u, 0, 0], [0,  u, 0], [0, 0,  u]],
    [[ u, 0, 0], [0,  u, 0], [0, 0, -u]],
    [[-u, 0, 0], [0,  u, 0], [0, 0, -u]],
    [[-u, 0, 0], [0,  u, 0], [0, 0,  u]],
    [[ u, 0, 0], [0, -u, 0], [0, 0, -u]],
    [[ u, 0, 0], [0, -u, 0], [0, 0,  u]],
    [[-u, 0, 0], [0, -u, 0], [0, 0,  u]],
    [[-u, 0, 0], [0, -u, 0], [0, 0, -u]],
  ],
});
view.face({ shaded: true, fill: true, line: true, width: 2, color: '#ea580c', opacity: 0.8 });

mathbox.set('focus', 3);
`,
        },
        {
          label: 'Hình hộp chữ nhật (scale một khối)',
          code: `var view = mathbox.cartesian({
  range: [[-1, 1], [-1, 1], [-1, 1]],
  scale: [1, 1, 1],
});

var s = 0.7;
var box = view.transform({ scale: [1.15, 0.7, 0.5] });
box.array({
  items: 3,
  width: 12,
  channels: 3,
  data: [
    [[-s, -s,  s], [ s, -s,  s], [ s,  s,  s]],
    [[-s, -s,  s], [ s,  s,  s], [-s,  s,  s]],
    [[ s, -s, -s], [-s, -s, -s], [-s,  s, -s]],
    [[ s, -s, -s], [-s,  s, -s], [ s,  s, -s]],
    [[ s, -s,  s], [ s, -s, -s], [ s,  s, -s]],
    [[ s, -s,  s], [ s,  s, -s], [ s,  s,  s]],
    [[-s, -s, -s], [-s, -s,  s], [-s,  s,  s]],
    [[-s, -s, -s], [-s,  s,  s], [-s,  s, -s]],
    [[-s,  s,  s], [ s,  s,  s], [ s,  s, -s]],
    [[-s,  s,  s], [ s,  s, -s], [-s,  s, -s]],
    [[-s, -s, -s], [ s, -s, -s], [ s, -s,  s]],
    [[-s, -s, -s], [ s, -s,  s], [-s, -s,  s]],
  ],
});
box.face({ shaded: true, fill: true, line: true, width: 2, color: '#0ea5e9', opacity: 0.8 });

mathbox.set('focus', 3);
`,
        },
        {
          label: 'Lăng trụ lục giác đều (vòng lặp)',
          code: `var view = mathbox.cartesian({
  range: [[-1, 1], [-1, 1], [-1, 1]],
  scale: [1, 1, 1],
});

var n = 6, r = 0.65, h = 0.5, tris = [];
for (var i = 0; i < n; i++) {
  var a1 = i / n * 6.283, a2 = (i + 1) / n * 6.283;
  var T1 = [r * Math.cos(a1), h, r * Math.sin(a1)];
  var T2 = [r * Math.cos(a2), h, r * Math.sin(a2)];
  var B1 = [r * Math.cos(a1), -h, r * Math.sin(a1)];
  var B2 = [r * Math.cos(a2), -h, r * Math.sin(a2)];
  tris.push([[0, h, 0], T2, T1]);
  tris.push([[0, -h, 0], B1, B2]);
  tris.push([T1, T2, B2]);
  tris.push([T1, B2, B1]);
}
view.array({ items: 3, width: tris.length, channels: 3, data: tris });
view.face({ shaded: true, fill: true, line: true, width: 2, color: '#7c3aed', opacity: 0.8 });

mathbox.set('focus', 3);
`,
        },
        {
          label: 'Chóp ngũ giác đều (vòng lặp)',
          code: `var view = mathbox.cartesian({
  range: [[-1, 1], [-1, 1], [-1, 1]],
  scale: [1, 1, 1],
});

var n = 5, r = 0.7, yb = -0.5, apex = [0, 0.85, 0], tris = [];
for (var i = 0; i < n; i++) {
  var a1 = i / n * 6.283, a2 = (i + 1) / n * 6.283;
  var P1 = [r * Math.cos(a1), yb, r * Math.sin(a1)];
  var P2 = [r * Math.cos(a2), yb, r * Math.sin(a2)];
  tris.push([apex, P1, P2]);
  tris.push([[0, yb, 0], P2, P1]);
}
view.array({ items: 3, width: tris.length, channels: 3, data: tris });
view.face({ shaded: true, fill: true, line: true, width: 2, color: '#059669', opacity: 0.85 });

mathbox.set('focus', 3);
`,
        },
        {
          label: 'Lập phương + đường chéo không gian',
          code: `var view = mathbox.cartesian({
  range: [[-1, 1], [-1, 1], [-1, 1]],
  scale: [1, 1, 1],
});

var s = 0.65;
view.array({
  items: 3,
  width: 12,
  channels: 3,
  data: [
    [[-s, -s,  s], [ s, -s,  s], [ s,  s,  s]],
    [[-s, -s,  s], [ s,  s,  s], [-s,  s,  s]],
    [[ s, -s, -s], [-s, -s, -s], [-s,  s, -s]],
    [[ s, -s, -s], [-s,  s, -s], [ s,  s, -s]],
    [[ s, -s,  s], [ s, -s, -s], [ s,  s, -s]],
    [[ s, -s,  s], [ s,  s, -s], [ s,  s,  s]],
    [[-s, -s, -s], [-s, -s,  s], [-s,  s,  s]],
    [[-s, -s, -s], [-s,  s,  s], [-s,  s, -s]],
    [[-s,  s,  s], [ s,  s,  s], [ s,  s, -s]],
    [[-s,  s,  s], [ s,  s, -s], [-s,  s, -s]],
    [[-s, -s, -s], [ s, -s, -s], [ s, -s,  s]],
    [[-s, -s, -s], [ s, -s,  s], [-s, -s,  s]],
  ],
});
view.face({ shaded: true, fill: true, line: true, width: 2, color: '#94a3b8', opacity: 0.3 });

view.array({ width: 2, channels: 3, data: [[-s, -s, -s], [s, s, s]] });
view.line({ width: 6, color: '#dc2626' });

view.array({
  width: 8,
  channels: 3,
  data: [
    [-s, -s, -s], [s, -s, -s], [s, s, -s], [-s, s, -s],
    [-s, -s, s], [s, -s, s], [s, s, s], [-s, s, s],
  ],
});
view.point({ size: 9, shape: 'circle', color: '#0f172a' });

mathbox.set('focus', 3);
`,
        },
        {
          label: 'Tứ diện + chiều cao (nét đứt)',
          code: `var view = mathbox.cartesian({
  range: [[-1, 1], [-1, 1], [-1, 1]],
  scale: [1, 1, 1],
});

var A = [0.9, -0.5, 0.5], B = [-0.9, -0.5, 0.5], C = [0, -0.5, -0.9], D = [0, 0.9, 0];
var G = [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3, (A[2] + B[2] + C[2]) / 3];

view.array({ items: 3, width: 4, channels: 3, data: [[A, B, C], [A, D, B], [B, D, C], [C, D, A]] });
view.face({ shaded: true, fill: true, line: true, width: 2, color: '#7c3aed', opacity: 0.7 });

view.array({ width: 2, channels: 3, data: [D, G] });
view.line({ width: 5, color: '#dc2626', stroke: 'dashed' });
view.array({ width: 1, channels: 3, data: [G] });
view.point({ size: 12, shape: 'square', color: '#dc2626' });

mathbox.set('focus', 3);
`,
        },
      ],
    },
    {
      name: '⚪ Khối tròn xoay',
      items: [
        {
          label: 'Mặt cầu (parametric)',
          code: `var view = mathbox.cartesian({
  range: [[-1, 1], [-1, 1], [-1, 1]],
  scale: [1, 1, 1],
});

view.matrix({
  width: 48,
  height: 24,
  channels: 3,
  expr: function (emit, i, j, t) {
    var u = i / 47 * 6.283;
    var v = -1.571 + j / 23 * 3.142;
    emit(Math.cos(v) * Math.cos(u), Math.sin(v), Math.cos(v) * Math.sin(u));
  },
});
view.surface({ shaded: true, color: '#2563eb', opacity: 0.85 });

mathbox.set('focus', 3);
`,
        },
        {
          label: 'Mặt cầu có kinh – vĩ tuyến',
          code: `var view = mathbox.cartesian({
  range: [[-1, 1], [-1, 1], [-1, 1]],
  scale: [1, 1, 1],
});

view.matrix({
  width: 24,
  height: 12,
  channels: 3,
  expr: function (emit, i, j, t) {
    var u = i / 23 * 6.283;
    var v = -1.571 + j / 11 * 3.142;
    emit(Math.cos(v) * Math.cos(u), Math.sin(v), Math.cos(v) * Math.sin(u));
  },
});
view.surface({ shaded: false, fill: false, lineX: true, lineY: true, width: 2, color: '#1d4ed8' });

mathbox.set('focus', 3);
`,
        },
        {
          label: 'Hình trụ',
          code: `var view = mathbox.cartesian({
  range: [[-1, 1], [-1, 1], [-1, 1]],
  scale: [1, 1, 1],
});

view.matrix({
  width: 48,
  height: 8,
  channels: 3,
  expr: function (emit, i, j, t) {
    var u = i / 47 * 6.283;
    var v = -0.8 + j / 7 * 1.6;
    emit(0.6 * Math.cos(u), v, 0.6 * Math.sin(u));
  },
});
view.surface({ shaded: true, color: '#059669', opacity: 0.85 });

mathbox.set('focus', 3);
`,
        },
        {
          label: 'Hình nón',
          code: `var view = mathbox.cartesian({
  range: [[-1, 1], [-1, 1], [-1, 1]],
  scale: [1, 1, 1],
});

view.matrix({
  width: 48,
  height: 16,
  channels: 3,
  expr: function (emit, i, j, t) {
    var u = i / 47 * 6.283;
    var v = j / 15;
    var r = 0.7 * (1 - v);
    emit(r * Math.cos(u), -0.8 + 1.6 * v, r * Math.sin(u));
  },
});
view.surface({ shaded: true, color: '#ea580c', opacity: 0.9 });

mathbox.set('focus', 3);
`,
        },
        {
          label: 'Hình xuyến (torus)',
          code: `var view = mathbox.cartesian({
  range: [[-1, 1], [-1, 1], [-1, 1]],
  scale: [1, 1, 1],
});

view.matrix({
  width: 48,
  height: 24,
  channels: 3,
  expr: function (emit, i, j, t) {
    var u = i / 47 * 6.283;
    var v = j / 23 * 6.283;
    var R = 0.6, r = 0.25;
    emit((R + r * Math.cos(v)) * Math.cos(u), r * Math.sin(v), (R + r * Math.cos(v)) * Math.sin(u));
  },
});
view.surface({ shaded: true, color: '#7c3aed', opacity: 0.9 });

mathbox.set('focus', 3);
`,
        },
        {
          label: 'Bán cầu + đường tròn đáy',
          code: `var view = mathbox.cartesian({
  range: [[-1, 1], [-1, 1], [-1, 1]],
  scale: [1, 1, 1],
});

view.matrix({
  width: 48,
  height: 12,
  channels: 3,
  expr: function (emit, i, j, t) {
    var u = i / 47 * 6.283;
    var v = j / 11 * 1.571;
    emit(Math.cos(v) * Math.cos(u), Math.sin(v), Math.cos(v) * Math.sin(u));
  },
});
view.surface({ shaded: true, color: '#2563eb', opacity: 0.8 });

view.interval({
  width: 96,
  channels: 3,
  expr: function (emit, x, i, t) {
    var a = x * 6.283;
    emit(Math.cos(a), 0, Math.sin(a));
  },
});
view.line({ width: 4, color: '#dc2626', closed: true });

mathbox.set('focus', 3);
`,
        },
        {
          label: 'Elipxoid (3 bán trục)',
          code: `var view = mathbox.cartesian({
  range: [[-1, 1], [-1, 1], [-1, 1]],
  scale: [1, 1, 1],
});

view.matrix({
  width: 48,
  height: 24,
  channels: 3,
  expr: function (emit, i, j, t) {
    var u = i / 47 * 6.283;
    var v = -1.571 + j / 23 * 3.142;
    emit(0.85 * Math.cos(v) * Math.cos(u), 0.5 * Math.sin(v), 0.65 * Math.cos(v) * Math.sin(u));
  },
});
view.surface({ shaded: true, color: '#0891b2', opacity: 0.85 });

mathbox.set('focus', 3);
`,
        },
        {
          label: 'Nón cụt (frustum)',
          code: `var view = mathbox.cartesian({
  range: [[-1, 1], [-1, 1], [-1, 1]],
  scale: [1, 1, 1],
});

view.matrix({
  width: 48,
  height: 16,
  channels: 3,
  expr: function (emit, i, j, t) {
    var u = i / 47 * 6.283;
    var v = j / 15;
    var r = 0.35 + 0.4 * v;
    emit(r * Math.cos(u), -0.7 + 1.4 * v, r * Math.sin(u));
  },
});
view.surface({ shaded: true, color: '#ea580c', opacity: 0.9 });

mathbox.set('focus', 3);
`,
        },
        {
          label: 'Mặt cầu cắt bởi mặt phẳng (thiết diện)',
          code: `var view = mathbox.cartesian({
  range: [[-1, 1], [-1, 1], [-1, 1]],
  scale: [1, 1, 1],
});

view.matrix({
  width: 48,
  height: 24,
  channels: 3,
  expr: function (emit, i, j, t) {
    var u = i / 47 * 6.283;
    var v = -1.571 + j / 23 * 3.142;
    emit(Math.cos(v) * Math.cos(u), Math.sin(v), Math.cos(v) * Math.sin(u));
  },
});
view.surface({ shaded: false, fill: true, color: '#94a3b8', opacity: 0.25 });

view.area({
  expr: function (emit, x, y, i, j, t) { emit(x, y, 0.45); },
  width: 12,
  height: 12,
  channels: 3,
});
view.surface({ shaded: false, fill: true, color: '#0891b2', opacity: 0.3 });

var rz = Math.sqrt(1 - 0.45 * 0.45);
view.interval({
  width: 96,
  channels: 3,
  expr: function (emit, x, i, t) {
    var a = x * 6.283;
    emit(rz * Math.cos(a), rz * Math.sin(a), 0.45);
  },
});
view.line({ width: 5, color: '#dc2626', closed: true });

mathbox.set('focus', 3);
`,
        },
        {
          label: 'Hình nón + thiết diện qua trục',
          code: `var view = mathbox.cartesian({
  range: [[-1, 1], [-1, 1], [-1, 1]],
  scale: [1, 1, 1],
});

view.matrix({
  width: 48,
  height: 16,
  channels: 3,
  expr: function (emit, i, j, t) {
    var u = i / 47 * 6.283;
    var v = j / 15;
    var r = 0.7 * (1 - v);
    emit(r * Math.cos(u), -0.8 + 1.6 * v, r * Math.sin(u));
  },
});
view.surface({ shaded: true, color: '#94a3b8', opacity: 0.35 });

view.array({ items: 3, width: 1, channels: 3, data: [[[0, 0.8, 0], [0.7, -0.8, 0], [-0.7, -0.8, 0]]] });
view.face({ shaded: false, fill: true, line: false, color: '#dc2626', opacity: 0.55 });

view.array({ width: 3, channels: 3, data: [[0.7, -0.8, 0], [0, 0.8, 0], [-0.7, -0.8, 0]] });
view.line({ width: 5, color: '#dc2626', closed: true });

mathbox.set('focus', 3);
`,
        },
        {
          label: 'Hình trụ + thiết diện chữ nhật',
          code: `var view = mathbox.cartesian({
  range: [[-1, 1], [-1, 1], [-1, 1]],
  scale: [1, 1, 1],
});

view.matrix({
  width: 48,
  height: 8,
  channels: 3,
  expr: function (emit, i, j, t) {
    var u = i / 47 * 6.283;
    var v = -0.8 + j / 7 * 1.6;
    emit(0.6 * Math.cos(u), v, 0.6 * Math.sin(u));
  },
});
view.surface({ shaded: true, color: '#94a3b8', opacity: 0.35 });

var R = 0.6, H = 0.8;
view.array({
  items: 3,
  width: 2,
  channels: 3,
  data: [
    [[-R, -H, 0], [R, -H, 0], [R, H, 0]],
    [[-R, -H, 0], [R, H, 0], [-R, H, 0]],
  ],
});
view.face({ shaded: false, fill: true, line: false, color: '#059669', opacity: 0.55 });

view.array({ width: 4, channels: 3, data: [[-R, -H, 0], [R, -H, 0], [R, H, 0], [-R, H, 0]] });
view.line({ width: 5, color: '#059669', closed: true });

mathbox.set('focus', 3);
`,
        },
      ],
    },
    {
      name: '📊 Giải tích & bề mặt',
      items: [
        {
          label: 'Paraboloid z = x² + y²',
          code: `var view = mathbox.cartesian({
  range: [[-1, 1], [-1, 1], [-1, 1]],
  scale: [1, 1, 1],
});

view.area({
  expr: function (emit, x, y, i, j, t) {
    emit(x, y, (x * x + y * y) - 0.8);
  },
  width: 32,
  height: 32,
  channels: 3,
});
view.surface({ shaded: true, color: '#2563eb', opacity: 0.9 });

mathbox.set('focus', 3);
`,
        },
        {
          label: 'Yên ngựa z = x² − y²',
          code: `var view = mathbox.cartesian({
  range: [[-1, 1], [-1, 1], [-1, 1]],
  scale: [1, 1, 1],
});

view.axis({ axis: 1, color: '#94a3b8' })
  .axis({ axis: 2, color: '#94a3b8' })
  .axis({ axis: 3, color: '#94a3b8' });

view.area({
  expr: function (emit, x, y, i, j, t) {
    emit(x, y, (x * x - y * y) * Math.cos(t / 3));
  },
  width: 32,
  height: 32,
  channels: 3,
});
view.surface({ shaded: true, color: '#2563eb', opacity: 0.9 });

mathbox.set('focus', 3);
`,
        },
        {
          label: 'Mặt phẳng 2x + y − z = 0',
          code: `var view = mathbox.cartesian({
  range: [[-1, 1], [-1, 1], [-1, 1]],
  scale: [1, 1, 1],
});

view.area({
  expr: function (emit, x, y, i, j, t) {
    emit(x, y, 2 * x + y);
  },
  width: 8,
  height: 8,
  channels: 3,
});
view.surface({ shaded: true, color: '#dc2626', opacity: 0.55 });

mathbox.set('focus', 3);
`,
        },
        {
          label: 'Sóng chồng (2 nguồn)',
          code: `var view = mathbox.cartesian({
  range: [[-1, 1], [-1, 1], [-1, 1]],
  scale: [1, 1, 1],
});

view.area({
  expr: function (emit, x, y, i, j, t) {
    var d1 = Math.sqrt((x - 0.4) * (x - 0.4) + y * y);
    var d2 = Math.sqrt((x + 0.4) * (x + 0.4) + y * y);
    emit(x, y, 0.25 * (Math.sin(12 * d1 - t) + Math.sin(12 * d2 - t)));
  },
  width: 48,
  height: 48,
  channels: 3,
});
view.surface({ shaded: true, color: '#0891b2', opacity: 0.95 });

mathbox.set('focus', 3);
`,
        },
        {
          label: 'Trường véc-tơ 2D (xoáy)',
          code: `var view = mathbox.cartesian({
  range: [[-1, 1], [-1, 1], [-1, 1]],
  scale: [1, 1, 1],
});

var n = 8, pairs = [];
for (var i = 0; i < n; i++) {
  for (var j = 0; j < n; j++) {
    var x = -0.9 + 1.8 * i / (n - 1);
    var y = -0.9 + 1.8 * j / (n - 1);
    pairs.push([[x, y, 0], [x - 0.18 * y, y + 0.18 * x, 0]]);
  }
}
view.array({ items: 2, width: pairs.length, channels: 3, data: pairs });
view.vector({ width: 3, color: '#7c3aed' });

mathbox.set('focus', 3);
`,
        },
        {
          label: 'Trường véc-tơ hướng tâm',
          code: `var view = mathbox.cartesian({
  range: [[-1, 1], [-1, 1], [-1, 1]],
  scale: [1, 1, 1],
});

var n = 24, pairs = [];
for (var i = 0; i < n; i++) {
  var a = i / n * 6.283;
  var x = 0.9 * Math.cos(a), y = 0.9 * Math.sin(a);
  pairs.push([[x, y, 0], [0.25 * x, 0.25 * y, 0]]);
}
view.array({ items: 2, width: pairs.length, channels: 3, data: pairs });
view.vector({ width: 3, color: '#ea580c' });

mathbox.set('focus', 3);
`,
        },
        {
          label: 'Mặt nón z = √(x² + y²)',
          code: `var view = mathbox.cartesian({
  range: [[-1, 1], [-1, 1], [-1, 1]],
  scale: [1, 1, 1],
});

view.area({
  expr: function (emit, x, y, i, j, t) {
    emit(x, y, 1.4 * Math.sqrt(x * x + y * y) - 0.7);
  },
  width: 32,
  height: 32,
  channels: 3,
});
view.surface({ shaded: true, color: '#ea580c', opacity: 0.9 });

mathbox.set('focus', 3);
`,
        },
        {
          label: 'Gợn sóng sin(r) / r',
          code: `var view = mathbox.cartesian({
  range: [[-1, 1], [-1, 1], [-1, 1]],
  scale: [1, 1, 1],
});

view.area({
  expr: function (emit, x, y, i, j, t) {
    var r = Math.sqrt(x * x + y * y) * 8 - t;
    emit(x, y, 0.5 * Math.sin(r) / (r + 0.4));
  },
  width: 48,
  height: 48,
  channels: 3,
});
view.surface({ shaded: true, color: '#7c3aed', opacity: 0.95 });

mathbox.set('focus', 3);
`,
        },
        {
          label: 'Mặt xoắn (helicoid)',
          code: `var view = mathbox.cartesian({
  range: [[-1, 1], [-1, 1], [-1, 1]],
  scale: [1, 1, 1],
});

view.matrix({
  width: 32,
  height: 32,
  channels: 3,
  expr: function (emit, i, j, t) {
    var a = j / 31 * 6.283;
    var r = -0.85 + 1.7 * i / 31;
    emit(r * Math.cos(a), 0.55 * (a - 3.142) + 0.1 * t, r * Math.sin(a));
  },
});
view.surface({ shaded: true, color: '#059669', opacity: 0.9 });

mathbox.set('focus', 3);
`,
        },
        {
          label: 'Paraboloid + mặt phẳng z = 0',
          code: `var view = mathbox.cartesian({
  range: [[-1, 1], [-1, 1], [-1, 1]],
  scale: [1, 1, 1],
});

view.area({
  expr: function (emit, x, y, i, j, t) { emit(x, y, 1.5 * (x * x + y * y) - 0.9); },
  width: 24,
  height: 24,
  channels: 3,
});
view.surface({ shaded: true, color: '#2563eb', opacity: 0.85 });

view.area({
  expr: function (emit, x, y, i, j, t) { emit(x, y, 0); },
  width: 8,
  height: 8,
  channels: 3,
});
view.surface({ shaded: false, fill: false, lineX: true, lineY: true, width: 2, color: '#94a3b8', opacity: 0.8 });

mathbox.set('focus', 3);
`,
        },
      ],
    },
    {
      name: '🌀 Đường tham số',
      items: [
        {
          label: 'Xoắn ốc 3D (helix)',
          code: `var view = mathbox.cartesian({
  range: [[-1, 1], [-1, 1], [-1, 1]],
  scale: [1, 1, 1],
});

view.interval({
  expr: function (emit, x, i, t) {
    var a = x * 6 * Math.PI + t / 2;
    emit(Math.cos(a) * x * 0.9, x * 1.8 - 0.9, Math.sin(a) * x * 0.9);
  },
  width: 128,
  channels: 3,
});
view.line({ width: 4, color: '#ea580c' });

mathbox.set('focus', 3);
`,
        },
        {
          label: 'Đường Lissajous 3D',
          code: `var view = mathbox.cartesian({
  range: [[-1, 1], [-1, 1], [-1, 1]],
  scale: [1, 1, 1],
});

view.interval({
  expr: function (emit, x, i, t) {
    var a = x * 6.283;
    emit(Math.sin(3 * a + t / 2), Math.sin(4 * a), Math.cos(5 * a));
  },
  width: 256,
  channels: 3,
});
view.line({ width: 4, color: '#0891b2' });

mathbox.set('focus', 3);
`,
        },
        {
          label: 'Hoa hồng cực r = sin(k·φ)',
          code: `var view = mathbox.cartesian({
  range: [[-1, 1], [-1, 1], [-1, 1]],
  scale: [1, 1, 1],
});

view.interval({
  expr: function (emit, x, i, t) {
    var a = x * 6.283;
    var r = Math.sin(4 * a + t / 3);
    emit(r * Math.cos(a), r * Math.sin(a), 0);
  },
  width: 256,
  channels: 3,
});
view.line({ width: 5, color: '#db2777' });

mathbox.set('focus', 3);
`,
        },
        {
          label: 'Xoáy ốc Archimedes + các điểm',
          code: `var view = mathbox.cartesian({
  range: [[-1, 1], [-1, 1], [-1, 1]],
  scale: [1, 1, 1],
});

view.interval({
  expr: function (emit, x, i, t) {
    var a = x * 8 * Math.PI;
    var r = 0.06 * a;
    emit(r * Math.cos(a), r * Math.sin(a), 0);
  },
  width: 256,
  channels: 3,
});
view.line({ width: 4, color: '#7c3aed' });
view.point({ size: 6, shape: 'circle', color: '#dc2626' });

mathbox.set('focus', 3);
`,
        },
        {
          label: 'Đường Viviani (cầu ∩ trụ)',
          code: `var view = mathbox.cartesian({
  range: [[-1, 1], [-1, 1], [-1, 1]],
  scale: [1, 1, 1],
});

view.matrix({
  width: 24,
  height: 12,
  channels: 3,
  expr: function (emit, i, j, t) {
    var u = i / 23 * 6.283;
    var v = -1.571 + j / 11 * 3.142;
    emit(Math.cos(v) * Math.cos(u), Math.sin(v), Math.cos(v) * Math.sin(u));
  },
});
view.surface({ shaded: false, fill: false, lineX: true, lineY: true, width: 1, color: '#cbd5e1' });

view.interval({
  expr: function (emit, x, i, t) {
    var a = x * 6.283;
    var c = Math.cos(a);
    emit(c * c - 0.5, c * Math.sin(a), Math.sin(a));
  },
  width: 256,
  channels: 3,
});
view.line({ width: 5, color: '#dc2626', closed: true });

mathbox.set('focus', 3);
`,
        },
        {
          label: 'Đường cubic xoắn (t, t², t³)',
          code: `var view = mathbox.cartesian({
  range: [[-1, 1], [-1, 1], [-1, 1]],
  scale: [1, 1, 1],
});

view.axis({ axis: 1, color: '#dc2626', width: 3 })
  .axis({ axis: 2, color: '#2563eb', width: 3 })
  .axis({ axis: 3, color: '#059669', width: 3 });

view.interval({
  expr: function (emit, x, i, t) {
    var u = -1 + 2 * x;
    emit(u, 0.9 * u * u - 0.45, 0.9 * u * u * u);
  },
  width: 128,
  channels: 3,
});
view.line({ width: 5, color: '#7c3aed' });

mathbox.set('focus', 3);
`,
        },
        {
          label: 'Xoáy ốc trên mặt cầu',
          code: `var view = mathbox.cartesian({
  range: [[-1, 1], [-1, 1], [-1, 1]],
  scale: [1, 1, 1],
});

view.interval({
  expr: function (emit, x, i, t) {
    var a = x * 10 * Math.PI + t / 4;
    var b = -1.5 + x * 3.0;
    emit(0.9 * Math.cos(b) * Math.cos(a), 0.9 * Math.sin(b), 0.9 * Math.cos(b) * Math.sin(a));
  },
  width: 512,
  channels: 3,
});
view.line({ width: 3, color: '#0891b2' });

mathbox.set('focus', 3);
`,
        },
        {
          label: 'Cycloid (đường bánh xe lăn)',
          code: `var view = mathbox.cartesian({
  range: [[-2, 2], [-1.2, 1.2], [-1, 1]],
  scale: [2, 1.2, 1],
});

view.axis({ axis: 1, color: '#94a3b8', width: 3 });
view.grid({ divideX: 12, divideY: 6, color: '#e2e8f0', opacity: 1 });

view.interval({
  expr: function (emit, x, i, t) {
    var a = x * 4 * Math.PI + t / 2;
    var r = 0.4;
    emit(r * (a - Math.sin(a)) - 1.2, r * (1 - Math.cos(a)) - 0.6, 0);
  },
  width: 256,
  channels: 3,
});
view.line({ width: 5, color: '#ea580c' });

mathbox.set('focus', 3);
`,
        },
      ],
    },
    {
      name: '📐 Hình phẳng & Conic',
      items: [
        {
          label: 'Tam giác + ba trung tuyến',
          code: `var view = mathbox.cartesian({
  range: [[-1.2, 1.2], [-1, 1], [-1, 1]],
  scale: [1.2, 1, 1],
});

var A = [-0.9, -0.5, 0], B = [0.95, -0.35, 0], C = [-0.1, 0.85, 0];
var mA = [(B[0] + C[0]) / 2, (B[1] + C[1]) / 2, 0];
var mB = [(A[0] + C[0]) / 2, (A[1] + C[1]) / 2, 0];
var mC = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, 0];

view.array({ width: 3, channels: 3, data: [A, B, C] });
view.line({ width: 4, color: '#334155', closed: true });
view.point({ size: 12, shape: 'circle', color: '#2563eb' });

view.array({ items: 2, width: 3, channels: 3, data: [[A, mA], [B, mB], [C, mC]] });
view.line({ width: 3, color: '#dc2626', stroke: 'dashed' });

mathbox.set('focus', 3);
`,
        },
        {
          label: 'Lục giác đều + tâm',
          code: `var view = mathbox.cartesian({
  range: [[-1.2, 1.2], [-1, 1], [-1, 1]],
  scale: [1.2, 1, 1],
});

var pts = [];
for (var i = 0; i < 6; i++) {
  var a = i / 6 * 6.283;
  pts.push([0.85 * Math.cos(a), 0.85 * Math.sin(a), 0]);
}
view.array({ width: 6, channels: 3, data: pts });
view.line({ width: 4, color: '#059669', closed: true });
view.point({ size: 10, shape: 'square', color: '#0f172a' });

var seg = [];
for (var k = 0; k < 6; k++) { seg.push([[0, 0, 0], pts[k]]); }
view.array({ items: 2, width: 6, channels: 3, data: seg });
view.line({ width: 3, color: '#94a3b8', stroke: 'dashed' });

mathbox.set('focus', 3);
`,
        },
        {
          label: 'Elip + hai tiêu điểm',
          code: `var view = mathbox.cartesian({
  range: [[-1.4, 1.4], [-1, 1], [-1, 1]],
  scale: [1.4, 1, 1],
});

view.axis({ axis: 1, color: '#94a3b8', width: 3 });
view.grid({ divideX: 14, divideY: 10, color: '#e2e8f0', opacity: 1 });

var a = 1.1, b = 0.6, c = Math.sqrt(a * a - b * b);
view.interval({
  width: 160,
  channels: 3,
  expr: function (emit, x, i, t) {
    var p = x * 6.283;
    emit(a * Math.cos(p), b * Math.sin(p), 0);
  },
});
view.line({ width: 4, color: '#7c3aed', closed: true });

view.array({ width: 2, channels: 3, data: [[-c, 0, 0], [c, 0, 0]] });
view.point({ size: 14, shape: 'diamond', color: '#dc2626' });

mathbox.set('focus', 3);
`,
        },
        {
          label: 'Hyperbol (hai nhánh) + tiệm cận',
          code: `var view = mathbox.cartesian({
  range: [[-1.6, 1.6], [-1.2, 1.2], [-1, 1]],
  scale: [1.6, 1.2, 1],
});

view.axis({ axis: 1, color: '#94a3b8', width: 3 })
  .axis({ axis: 2, color: '#94a3b8', width: 3 });

view.interval({
  width: 64,
  channels: 3,
  expr: function (emit, x, i, t) { var u = 0.15 + x * 0.85; emit(1.1 / u, 0.75 * u, 0); },
});
view.line({ width: 4, color: '#2563eb' });
view.interval({
  width: 64,
  channels: 3,
  expr: function (emit, x, i, t) { var u = 0.15 + x * 0.85; emit(-1.1 / u, -0.75 * u, 0); },
});
view.line({ width: 4, color: '#2563eb' });

view.array({ items: 2, width: 2, channels: 3, data: [ [[-1.6, -1.1, 0], [1.6, 1.1, 0]], [[-1.6, 1.1, 0], [1.6, -1.1, 0]] ] });
view.line({ width: 2, color: '#cbd5e1', stroke: 'dashed' });

mathbox.set('focus', 3);
`,
        },
        {
          label: 'Parabol + tiêu điểm + đường chuẩn',
          code: `var view = mathbox.cartesian({
  range: [[-1.4, 1.4], [-1.2, 1.2], [-1, 1]],
  scale: [1.4, 1.2, 1],
});

view.axis({ axis: 1, color: '#94a3b8', width: 3 });
view.grid({ divideX: 14, divideY: 12, color: '#eef2f7', opacity: 1 });

var p = 0.35;
view.interval({
  width: 128,
  channels: 3,
  expr: function (emit, x, i, t) { var u = -1.2 + 2.4 * x; emit(u, u * u / (4 * p) - 0.7, 0); },
});
view.line({ width: 4, color: '#059669' });

view.array({ width: 2, channels: 3, data: [[-1.4, p - 0.7, 0], [1.4, p - 0.7, 0]] });
view.line({ width: 3, color: '#dc2626', stroke: 'dashed' });

view.array({ width: 1, channels: 3, data: [[0, p - 0.7, 0]] });
view.point({ size: 14, shape: 'circle', color: '#dc2626' });

mathbox.set('focus', 3);
`,
        },
        {
          label: 'Đường tròn lượng giác + góc ở tâm',
          code: `var view = mathbox.cartesian({
  range: [[-1.4, 1.4], [-1.2, 1.2], [-1, 1]],
  scale: [1.4, 1.2, 1],
});

view.axis({ axis: 1, color: '#94a3b8', width: 3 });
view.grid({ divideX: 14, divideY: 12, color: '#eef2f7', opacity: 1 });

view.interval({
  width: 128,
  channels: 3,
  expr: function (emit, x, i, t) {
    var a = x * 6.283;
    emit(Math.cos(a), Math.sin(a), 0);
  },
});
view.line({ width: 4, color: '#2563eb', closed: true });

view.interval({
  width: 48,
  channels: 3,
  expr: function (emit, x, i, t) {
    var a = x * 1.05;
    emit(0.35 * Math.cos(a), 0.35 * Math.sin(a), 0);
  },
});
view.line({ width: 5, color: '#ea580c' });

view.array({ items: 2, width: 2, channels: 3, data: [ [[0, 0, 0], [1, 0, 0]], [[0, 0, 0], [Math.cos(1.05), Math.sin(1.05), 0]] ] });
view.vector({ width: 4, color: '#059669' });

mathbox.set('focus', 3);
`,
        },
      ],
    },
    {
      name: '✍️ Điểm, mũi tên & chuyển động',
      items: [
        {
          label: 'Ba đỉnh, ba màu (điểm đánh dấu)',
          code: `view.array({ width: 2, channels: 3, data: [[-0.8, -0.4, 0], [0.8, -0.4, 0]] });
view.point({ size: 14, shape: 'circle', color: '#dc2626' });

view.array({ width: 1, channels: 3, data: [[0, 0.8, 0]] });
view.point({ size: 16, shape: 'square', color: '#2563eb' });

view.array({ width: 1, channels: 3, data: [[0, -0.4, 0.6]] });
view.point({ size: 14, shape: 'diamond', color: '#059669' });
`,
        },
        {
          label: 'Mũi tên chỉ một điểm',
          code: `view.array({ width: 1, channels: 3, data: [[0.6, 0.6, 0]] });
view.point({ size: 16, shape: 'circle', color: '#dc2626' });

view.array({ items: 2, width: 1, channels: 3, data: [[[0, -0.8, -0.6], [0.55, 0.5, 0]]] });
view.vector({ width: 5, color: '#334155' });
`,
        },
        {
          label: 'Chấm chạy trên đường tròn (animation)',
          code: `view.interval({
  width: 1,
  channels: 3,
  expr: function (emit, x, i, t) {
    var a = t;
    emit(Math.cos(a), Math.sin(a), 0);
  },
});
view.point({ size: 22, shape: 'circle', color: '#dc2626' });

view.interval({
  width: 128,
  channels: 3,
  expr: function (emit, x, i, t) {
    var a = x * 6.283;
    emit(Math.cos(a), Math.sin(a), 0);
  },
});
view.line({ width: 3, color: '#cbd5e1', closed: true });
`,
        },
        {
          label: 'Quỹ đạo dấu chấm (dot trail)',
          code: `view.interval({
  width: 64,
  channels: 3,
  expr: function (emit, x, i, t) {
    var a = t - x * 3;
    emit(0.8 * Math.cos(a) * x, 0.8 * Math.sin(a) * x, x * 0.4 - 0.2);
  },
});
view.point({ size: 10, shape: 'circle', color: '#7c3aed' });
`,
        },
      ],
    },
  ],
};
