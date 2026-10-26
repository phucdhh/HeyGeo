/**
 * JSXGraph CodeMirror 6 autocomplete source.
 *
 * Provides completions for:
 *  - board.create(…) element types
 *  - board.create attributes (per element)
 *  - JXG.JSXGraph.* methods
 *  - Top-level JXG.* helpers
 *  - Global variable snippets (BOARDID, board, JXG)
 */

import { type CompletionContext, type Completion, snippetCompletion } from '@codemirror/autocomplete';

// ─── Element types ────────────────────────────────────────────────────────────
const ELEMENTS: Completion[] = [
  'point', 'line', 'segment', 'ray', 'arrow',
  'circle', 'ellipse', 'conic',
  'arc', 'sector', 'semicircle',
  'polygon', 'regularpolygon', 'triangle',
  'curve', 'functiongraph', 'parametric', 'polarplot',
  'text', 'image',
  'angle', 'nonreflexangle',
  'midpoint', 'perpendicular', 'perpendicularpoint',
  'parallel', 'parallelpoint',
  'bisector', 'anglebisector',
  'circumcircle', 'circumcenter',
  'incircle', 'incenter',
  'centroid', 'orthocenter',
  'circumcirclearc', 'circumcirclesector',
  'integral', 'derivative',
  'intersection', 'otherintersection',
  'glider', 'slider',
  'tapemeasure', 'slopetriangle',
  'locus',
  'transformation', 'reflection', 'rotate', 'translate', 'scale',
  'composition',
  'button', 'checkbox', 'input',
  'grid', 'axis',
  'boxplot', 'chart', 'ticks',
  'vector', 'stepfunction',
  'spline', 'cardinalspline',
  'riemannsum',
  'plot', 'polynomialregression',
  'view3d', 'plane3d', 'point3d', 'line3d', 'curve3d', 'sphere3d',
].map(label => ({ label, type: 'type', detail: 'element type', boost: 10 }));

// ─── Common attribute completions ─────────────────────────────────────────────
const COMMON_ATTRS: Completion[] = [
  'name', 'visible', 'fixed', 'frozen',
  'strokeColor', 'strokeWidth', 'strokeOpacity',
  'fillColor', 'fillOpacity',
  'highlightStrokeColor', 'highlightFillColor',
  'size', 'face',
  'label', 'withLabel', 'showInfobox',
  'dash', 'shadow',
  'color',
  'isDraggable', 'snapToGrid', 'snapSizeX', 'snapSizeY',
  'layer',
].map(label => ({ label, type: 'property', detail: 'attribute' }));

// ─── board.create snippets ────────────────────────────────────────────────────
const BOARD_CREATE_SNIPPETS: Completion[] = [
  snippetCompletion(
    "board.create('point', [${x}, ${y}], { name: '${A}', size: 4 })",
    { label: 'board.create point', detail: 'Tạo điểm', type: 'function', boost: 30 }
  ),
  snippetCompletion(
    "board.create('line', [${P1}, ${P2}], { strokeColor: '#333', strokeWidth: 1.5 })",
    { label: 'board.create line', detail: 'Tạo đường thẳng', type: 'function', boost: 29 }
  ),
  snippetCompletion(
    "board.create('segment', [${P1}, ${P2}], { strokeColor: '#333', strokeWidth: 2 })",
    { label: 'board.create segment', detail: 'Tạo đoạn thẳng', type: 'function', boost: 29 }
  ),
  snippetCompletion(
    "board.create('circle', [${center}, ${radius}], { strokeColor: '#1e3c96', fillColor: 'none' })",
    { label: 'board.create circle', detail: 'Tạo đường tròn', type: 'function', boost: 29 }
  ),
  snippetCompletion(
    "board.create('functiongraph', [function(x) { return ${expr}; }], { strokeColor: '#c00', strokeWidth: 2 })",
    { label: 'board.create functiongraph', detail: 'Đồ thị hàm số', type: 'function', boost: 29 }
  ),
  snippetCompletion(
    "board.create('polygon', [${A}, ${B}, ${C}], { fillColor: 'rgba(30,60,150,0.12)', strokeColor: '#1e3c96' })",
    { label: 'board.create polygon', detail: 'Tạo đa giác', type: 'function', boost: 28 }
  ),
  snippetCompletion(
    "board.create('arc', [${center}, ${P1}, ${P2}], { strokeColor: '#e44', strokeWidth: 2 })",
    { label: 'board.create arc', detail: 'Tạo cung tròn', type: 'function', boost: 28 }
  ),
  snippetCompletion(
    "board.create('angle', [${A}, ${B}, ${C}], { radius: 1, name: '${α}' })",
    { label: 'board.create angle', detail: 'Tạo góc', type: 'function', boost: 28 }
  ),
  snippetCompletion(
    "board.create('slider', [[${x1}, ${y1}], [${x2}, ${y2}], [${min}, ${val}, ${max}]], { name: '${n}' })",
    { label: 'board.create slider', detail: 'Thanh trượt', type: 'function', boost: 28 }
  ),
  snippetCompletion(
    "board.create('text', [${x}, ${y}, '${text}'], { fontSize: 16 })",
    { label: 'board.create text', detail: 'Chèn văn bản', type: 'function', boost: 28 }
  ),
  snippetCompletion(
    "board.create('glider', [${x}, ${y}, ${obj}], { name: '${G}' })",
    { label: 'board.create glider', detail: 'Điểm trên đối tượng', type: 'function', boost: 27 }
  ),
  snippetCompletion(
    "board.create('circumcircle', [${A}, ${B}, ${C}], { strokeColor: '#c83c3c', strokeWidth: 1.5 })",
    { label: 'board.create circumcircle', detail: 'Đường tròn ngoại tiếp', type: 'function', boost: 27 }
  ),
  snippetCompletion(
    "board.create('midpoint', [${A}, ${B}], { name: '${M}' })",
    { label: 'board.create midpoint', detail: 'Trung điểm', type: 'function', boost: 27 }
  ),
  snippetCompletion(
    "board.create('perpendicular', [${line}, ${point}], { strokeColor: '#555' })",
    { label: 'board.create perpendicular', detail: 'Đường vuông góc', type: 'function', boost: 27 }
  ),
  snippetCompletion(
    "board.create('bisector', [${A}, ${B}, ${C}], { strokeColor: '#090' })",
    { label: 'board.create bisector', detail: 'Đường phân giác', type: 'function', boost: 27 }
  ),
  snippetCompletion(
    "board.create('integral', [[${a}, ${b}], ${curve}], { fillColor: 'rgba(0,100,0,0.2)' })",
    { label: 'board.create integral', detail: 'Tích phân', type: 'function', boost: 26 }
  ),
  snippetCompletion(
    "board.create('curve', [${xs}, ${ys}, ${tMin}, ${tMax}], { strokeColor: '#00a', strokeWidth: 2 })",
    { label: 'board.create curve', detail: 'Đường cong tham số', type: 'function', boost: 26 }
  ),
];

// ─── JXG.JSXGraph method snippets ────────────────────────────────────────────
const JXG_SNIPPETS: Completion[] = [
  snippetCompletion(
    "JXG.JSXGraph.initBoard(BOARDID, {\n  boundingbox: [-${6}, ${6}, ${6}, -${6}],\n  keepaspectratio: true,\n  showCopyright: false,\n  showNavigation: true,\n  axis: ${false},\n})",
    { label: 'JXG.JSXGraph.initBoard', detail: 'Khởi tạo board', type: 'function', boost: 40 }
  ),
  snippetCompletion(
    "JXG.JSXGraph.freeBoard(${board})",
    { label: 'JXG.JSXGraph.freeBoard', detail: 'Giải phóng board', type: 'function', boost: 20 }
  ),
  snippetCompletion(
    "JXG.Math.Geometry.distance(${A.coords.usrCoords}, ${B.coords.usrCoords})",
    { label: 'JXG.Math.Geometry.distance', detail: 'Khoảng cách 2 điểm', type: 'function', boost: 15 }
  ),
];

// ─── Board method snippets ────────────────────────────────────────────────────
const BOARD_METHOD_SNIPPETS: Completion[] = [
  snippetCompletion(
    "board.create('${type}', [${parents}], { ${attrs} })",
    { label: 'board.create', detail: 'Tạo đối tượng', type: 'function', boost: 35 }
  ),
  snippetCompletion(
    "board.on('${event}', function(e) {\n  ${}\n})",
    { label: 'board.on', detail: 'Lắng nghe sự kiện', type: 'function', boost: 20 }
  ),
  snippetCompletion(
    "board.update()",
    { label: 'board.update', detail: 'Cập nhật board', type: 'function', boost: 15 }
  ),
  snippetCompletion(
    "board.setBoundingBox([${-6}, ${6}, ${6}, ${-6}])",
    { label: 'board.setBoundingBox', detail: 'Đặt vùng hiển thị', type: 'function', boost: 15 }
  ),
  snippetCompletion(
    "board.removeObject(${obj})",
    { label: 'board.removeObject', detail: 'Xoá đối tượng', type: 'function', boost: 12 }
  ),
  snippetCompletion(
    "board.suspendUpdate()",
    { label: 'board.suspendUpdate', detail: 'Tạm dừng cập nhật', type: 'function', boost: 10 }
  ),
  snippetCompletion(
    "board.unsuspendUpdate()",
    { label: 'board.unsuspendUpdate', detail: 'Tiếp tục cập nhật', type: 'function', boost: 10 }
  ),
];

// ─── Main completions function ────────────────────────────────────────────────
export function jsxgraphCompletions(context: CompletionContext) {
  const word = context.matchBefore(/[\w.'"]+/);
  if (!word || (word.from === word.to && !context.explicit)) return null;
  const text = word.text.toLowerCase();

  // After board.create( → suggest element types
  const beforeCursor = context.state.doc.sliceString(0, context.pos);
  const createMatch = beforeCursor.match(/board\.create\s*\(\s*['"](\w*)$/);
  if (createMatch) {
    return {
      from: word.from,
      options: ELEMENTS,
      validFor: /^\w*$/,
    };
  }

  // JXG. → suggest JXG methods
  if (text.startsWith('jxg.')) {
    return { from: word.from, options: JXG_SNIPPETS, validFor: /^[\w.]*$/ };
  }

  // board. → suggest board methods
  if (text.startsWith('board.')) {
    return { from: word.from, options: [...BOARD_METHOD_SNIPPETS, ...BOARD_CREATE_SNIPPETS], validFor: /^[\w.]*$/ };
  }

  // General: filter by prefix
  const all = [
    ...BOARD_CREATE_SNIPPETS,
    ...JXG_SNIPPETS,
    ...BOARD_METHOD_SNIPPETS,
    ...COMMON_ATTRS,
    { label: 'BOARDID', type: 'variable', detail: 'id của <div> board preview', boost: 5 } as Completion,
  ];
  const filtered = all.filter(c => c.label.toLowerCase().startsWith(text));
  if (filtered.length === 0 && !context.explicit) return null;
  return { from: word.from, options: context.explicit ? all : filtered, validFor: /^[\w.'"]*$/ };
}
