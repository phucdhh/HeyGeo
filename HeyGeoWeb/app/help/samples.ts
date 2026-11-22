/**
 * Sample figures shown (and actually run) on /help.
 * Kept in one module so the code blocks and the live demos never drift apart.
 */

/** A document as /design saves it (jsonData without __type → JSXGraph engine). */
export const DESIGN_DOC_SAMPLE = {
  version: '1.0',
  title: 'Tam giác, trung điểm và đường tròn',
  boundingbox: [-6, 6, 6, -6] as [number, number, number, number],
  axis: true,
  grid: false,
  elements: [
    { type: 'point', id: 'A', parents: [-3, 1], attrs: { name: 'A' } },
    { type: 'point', id: 'B', parents: [3, 1], attrs: { name: 'B' } },
    { type: 'point', id: 'C', parents: [0.5, 4.5], attrs: { name: 'C' } },
    { type: 'segment', id: 'AB', parents: ['A', 'B'], attrs: { strokeColor: '#1e3c96' } },
    { type: 'segment', id: 'BC', parents: ['B', 'C'], attrs: { strokeColor: '#1e3c96' } },
    { type: 'segment', id: 'CA', parents: ['C', 'A'], attrs: { strokeColor: '#1e3c96' } },
    { type: 'midpoint', id: 'M', parents: ['B', 'C'], attrs: { name: 'M', size: 4 } },
    { type: 'segment', id: 'AM', parents: ['A', 'M'], attrs: { strokeColor: '#16a34a', dash: 2 } },
    { type: 'circle', id: 'cA', parents: ['A', 'B'], attrs: { strokeColor: '#c83c3c', dash: 1 } },
  ],
};

/** Code Mode (/coding) — the same shape the editor starts a new model with. */
export const JSXGRAPH_CODE_SAMPLE = `// Tam giác + đường tròn ngoại tiếp + tâm ngoại tiếp
const board = JXG.JSXGraph.initBoard(BOARDID, {
  boundingbox: [-6, 6, 6, -6],
  keepaspectratio: true,
  showCopyright: false,
  showNavigation: true,
  axis: true,
});

var A = board.create('point', [-3, 1], { name: 'A', size: 4 });
var B = board.create('point', [3, 1], { name: 'B', size: 4 });
var C = board.create('point', [0, 4], { name: 'C', size: 4 });

board.create('polygon', [A, B, C], {
  fillColor: 'rgba(30,60,150,0.12)',
  strokeColor: '#1e3c96',
  strokeWidth: 2,
});
board.create('circumcircle', [A, B, C], { strokeColor: '#c83c3c', dash: 2 });
board.create('circumcenter', [A, B, C], { name: 'O', size: 4 });
`;

/** Shorter Code Mode snippet: the "board is already there" style. */
export const JSXGRAPH_CODE_SIMPLE = `// Không cần initBoard — HeyGeo đã tạo sẵn biến "board".
var P = board.create('point', [2, 3], { name: 'P' });
var Q = board.create('point', [-4, -2], { name: 'Q' });
board.create('line', [P, Q], { strokeColor: '#7c3aed', strokeWidth: 2 });
board.create('glider', [0, 0, board.create('segment', [P, Q])], { name: 'G' });
`;

/** CindyJS (/cindy) — trực tâm tam giác, code JavaScript. */
export const CINDY_CODE_SAMPLE = `var instance = CindyJS({
  ports: [{ id: BOARDID, width: 480, height: 360, background: "rgb(255,255,255)" }],
  defaultAppearance: { dimDependent: 0.7, lineSize: 1.5, pointSize: 5, textsize: 14 },
  angleUnit: "°",
  geometry: [
    { name: "A", type: "Free", pos: [4, -3, -1.5], color: [1, 0, 0], labeled: true },
    { name: "B", type: "Free", pos: [4,  3, -1.5], color: [1, 0, 0], labeled: true },
    { name: "C", type: "Free", pos: [4,  0,  3  ], color: [1, 0, 0], labeled: true },
    { name: "AB", type: "Segment", args: ["A", "B"], color: [0, 0, 0.8] },
    { name: "BC", type: "Segment", args: ["B", "C"], color: [0, 0, 0.8] },
    { name: "CA", type: "Segment", args: ["C", "A"], color: [0, 0, 0.8] },
    { name: "lBC", type: "Join", args: ["B", "C"], visible: false },
    { name: "lCA", type: "Join", args: ["C", "A"], visible: false },
    { name: "hA", type: "Orthogonal", args: ["lBC", "A"], color: [0.1, 0.7, 0.1] },
    { name: "hB", type: "Orthogonal", args: ["lCA", "B"], color: [0.1, 0.7, 0.1] },
    { name: "H", type: "Meet", args: ["hA", "hB"], color: [0.8, 0.2, 0.8], labeled: true },
  ],
  csconsole: false,
});
`;

/** MathBox (/mathbox) — đường sin chạy, có xoay bằng chuột. */
export const MATHBOX_CODE_SAMPLE = `var mathbox = MathBox.mathBox({
  element: element,
  plugins: ['core', 'controls', 'cursor'],
  controls: { klass: THREE.OrbitControls },
  renderer: { parameters: { alpha: true, depth: true, stencil: true, preserveDrawingBuffer: true, antialias: true } },
});

var three = mathbox.three;
three.camera.position.set(-2, 2, 8);

var view = mathbox.cartesian({
  range: [[-2, 2], [-1, 1], [-1, 1]],
  scale: [2, 1, 1],
});

view.grid({ divideX: 10, divideY: 10, color: '#cbd5e1', opacity: 1 });
view.axis({ axis: 1, color: '#64748b', width: 3 })
  .axis({ axis: 2, color: '#64748b', width: 3 });

// emit() mới là cách trả mẫu về máy vẽ — không phải return.
view.interval({
  expr: function (emit, x, i, t) { emit(x, Math.sin(x + t), 0); },
  width: 64,
  channels: 3,
});
view.line({ width: 5, color: '#2563eb' });

mathbox.set('focus', 3);
`;

/** A MathBox surface: the case people most often come to HeyGeo for. */
export const MATHBOX_SURFACE_SAMPLE = `var mathbox = MathBox.mathBox({
  element: element,
  plugins: ['core', 'controls', 'cursor'],
  controls: { klass: THREE.OrbitControls },
  renderer: { parameters: { alpha: true, depth: true, stencil: true, preserveDrawingBuffer: true, antialias: true } },
});
mathbox.three.camera.position.set(3.2, 3.2, 3.6);

var view = mathbox.cartesian({
  range: [[-3, 3], [-3, 3], [-1.5, 1.5]],
  scale: [1, 1, 0.6],
});
view.axis({ axis: 1 }); view.axis({ axis: 2 }); view.axis({ axis: 3 });

view.area({
  expr: function (emit, x, y, i, j, t) {
    emit(x, y, 0.8 * Math.sin(x * y));
  },
  width: 64, height: 64, channels: 3,
});
view.surface({ lineX: false, lineY: false, color: '#0ea5e9', pointSize: 0 });
`;

/** The JSON block of a WSP sketch, as exported by Web Sketchpad. */
export const WSP_JSON_NOTE = `{
  "metadata": { "width": 574, "height": 472, "wsp-version": "4.8.0", … },
  "pages": [ {
    "objects": {
      "1": { "kind": "Point", "constraint": "Free", "geom": { "loc": { "x": 80.5, "y": 360.5 } } },
      "4": { "kind": "Straight", "genus": "Segment", "constraint": "Segment",
             "parents": { "p0": "1", "p1": "2" } }
    }
  } ]
}`;
