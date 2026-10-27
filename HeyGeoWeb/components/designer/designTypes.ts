// ─── Tool modes – mirrors HeyGeoView::ToolMode enum from Desktop ─────────────
export type ToolMode =
  | 'selection'
  | 'point'
  | 'point_on_object'  // click on a curve → creates glider (no free point)
  | 'midpoint'         // click segment OR 2 points → midpoint
  | 'intersection'     // click 2 lines/circles → intersection point(s)
  | 'circle_center'    // click circle/arc → reveal/create center point
  | 'compass'          // circle: click centre → click/drag radius point
  | 'arc'              // arc: (1) centre → (2) startPt → (3) endPt
  | 'segment'          // 2 clicks → segment
  | 'ray'              // 2 clicks → ray
  | 'line'             // 2 clicks → infinite line
  | 'polygon'          // GSP Polygon: interior + frame
  | 'polygon_and_edges' // polygon plus the segments that form its edges
  | 'polygon_edges'    // the closed ring of segments, no interior
  | 'text'             // click object to toggle/edit label
  | 'pen'              // mark segments / angles (GSP Pen tool)
  | 'info'             // click object to show info
  | 'slider';          // click+drag to place slider

// ─── HeyGeo JSON format (shared with Desktop via HeyGeoWebExporter) ──────────
export interface HeyGeoElement {
  type: string;
  id: string;
  parents: (string | number | boolean | (number | null)[])[];
  attrs: Record<string, unknown>;
}

export interface HeyGeoData {
  version: string;
  title: string;
  boundingbox: [number, number, number, number];
  axis: boolean;
  grid: boolean;
  elements: HeyGeoElement[];
  /** Code Mode: raw JSXGraph source code (set when saved from code editor) */
  codeMode?: boolean;
  code?: string;
}

// ─── CindyJS model ────────────────────────────────────────────────────────────
export interface CindyData {
  __type: 'cindy';
  version: string;
  title: string;
  code?: string;
}

export function emptyData(title = 'Chưa đặt tên'): HeyGeoData {
  return {
    version: '1.0',
    title,
    boundingbox: [-8, 8, 8, -8],
    axis: false,
    grid: false,
    elements: [],
  };
}

// ─── Tool metadata ────────────────────────────────────────────────────────────
export const TOOL_LABELS: Record<ToolMode, string> = {
  selection:       'Chọn / Di chuyển',
  point:           'Điểm',
  point_on_object: 'Điểm trên đối tượng',
  midpoint:        'Trung điểm',
  intersection:    'Giao điểm',
  circle_center:   'Tâm đường tròn',
  compass:         'Đường tròn',
  arc:             'Cung tròn',
  segment:         'Đoạn thẳng',
  ray:             'Tia',
  line:            'Đường thẳng',
  polygon:         'Đa giác',
  polygon_and_edges: 'Đa giác và các cạnh',
  polygon_edges:   'Các cạnh đa giác',
  text:            'Văn bản / Nhãn',
  pen:             'Bút đánh dấu',
  info:            'Thông tin',
  slider:          'Thanh trượt',
};

export const TOOL_HINTS: Record<ToolMode, string> = {
  selection:       'Nhấp để chọn, kéo để di chuyển',
  point:           'Nhấp để tạo điểm tự do; nhấp gần đường/tròn để tạo điểm trên đối tượng',
  point_on_object: 'Nhấp lên đường thẳng, đoạn, tia hoặc đường tròn để tạo điểm trên đối tượng',
  midpoint:        'Nhấp vào đoạn thẳng – hoặc nhấp 2 điểm – để tạo trung điểm',
  intersection:    'Nhấp đối tượng (1) rồi đối tượng (2) để tạo giao điểm',
  circle_center:   'Nhấp vào đường tròn hoặc cung để tạo điểm tâm',
  compass:         'Nhấp (1) tâm – nhấp (2) điểm trên đường tròn',
  arc:             'Nhấp (1) tâm – nhấp (2) điểm đầu cung – nhấp (3) điểm cuối cung',
  segment:         'Nhấp (1) điểm đầu – nhấp (2) điểm cuối',
  ray:             'Nhấp (1) gốc – nhấp (2) hướng',
  line:            'Nhấp (1) điểm A – nhấp (2) điểm B',
  polygon:         'Nhấp từ 3 đỉnh – nhấp lại đỉnh đầu tiên hoặc nhấp đúp đỉnh cuối để đóng',
  polygon_and_edges: 'Nhấp từ 3 đỉnh – tạo đa giác kèm các đoạn thẳng là cạnh của nó',
  polygon_edges:   'Nhấp từ 3 đỉnh – chỉ tạo các cạnh khép kín, không tạo phần trong',
  text:            'Nhấp vào đối tượng để ẩn/hiện nhãn',
  pen:             'Nhấp vào đoạn thẳng hoặc góc để đánh dấu (tính năng đang phát triển)',
  info:            'Nhấp vào đối tượng để xem thuộc tính',
  slider:          'Nhấp (1) điểm đầu – nhấp (2) điểm cuối thanh trượt',
};

// ─── Element kind vocabulary, shared by the panel and the Context menu ────────
export const ELEMENT_KIND_LABELS: Record<string, string> = {
  point: 'Điểm', glider: 'Điểm trên đối tượng', segment: 'Đoạn thẳng',
  line: 'Đường thẳng', ray: 'Tia', circle: 'Đường tròn', arc: 'Cung tròn',
  polygon: 'Đa giác', angle: 'Góc', text: 'Văn bản', midpoint: 'Trung điểm',
  intersection: 'Giao điểm', perpendicular: 'Vuông góc',
  parallel: 'Song song', bisector: 'Phân giác', slider: 'Thanh trượt',
  functiongraph: 'Đồ thị hàm số',
};

export function elementKindLabel(kind: string): string {
  return ELEMENT_KIND_LABELS[kind] ?? kind;
}

// Key shortcuts (lowercase)
export const TOOL_SHORTCUTS: Partial<Record<string, ToolMode>> = {
  s: 'selection',
  p: 'point',
  c: 'compass',
  d: 'segment',
  r: 'ray',
  l: 'line',
  g: 'polygon',
  f: 'polygon_and_edges',
  o: 'polygon_edges',
  t: 'text',
  x: 'pen',
  i: 'info',
  v: 'slider',
};

// ─── Slider config (dialog → canvas) ────────────────────────────────────────
export interface SliderConfig {
  name: string;
  min: number;
  max: number;
  init: number;
  step: number;
}

export interface SliderPos {
  x1: number; y1: number;
  x2: number; y2: number;
}

// ─── Selected element info surfaced to Properties Panel ───────────────────────
export interface SelectedElementInfo {
  id: string;
  type: string;
  name: string;
  strokeColor: string;
  fillColor: string;
  fillOpacity: number;   // 0–1
  strokeWidth: number;
  dash: number;
  visible: boolean;
  fixed: boolean;
  coords?: [number, number]; // for points
}

// ─── Locus result (returned by createLocus) ──────────────────────────────────
export type LocusResult =
  | { ok: true }
  | { ok: false; reason: 'no_glider' | 'no_trace' | 'need_2_items' | 'trace_failed' };

// ─── Mark info for transformations ────────────────────────────────────────────
export interface MarkInfo {
  center?: { id: string; name: string };
  mirror?: { id: string; name?: string };
  vector?: { fromId: string; fromName: string; toId: string; toName: string };
  angle?: { p1Name: string; vertexName: string; p2Name: string; deg: number };
}

// ─── Cursor coords shown in status bar ────────────────────────────────────────
export interface CursorCoords {
  x: number;
  y: number;
}

// ─── Imperative handle exposed by DesignCanvas via ref ───────────────────────
export interface CanvasHandle {
  getHeyGeoData: () => HeyGeoData;
  loadData: (data: HeyGeoData) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  deleteSelected: () => void;
  selectAll: () => void;
  setAxis: (v: boolean) => void;
  setGrid: (v: boolean) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomFit: () => void;
  setTitle: (t: string) => void;
  updateSelectedColor: (color: string) => void;
  updateSelectedStrokeWidth: (w: number) => void;
  updateSelectedDash: (d: number) => void;
  updateSelectedVisible: (v: boolean) => void;
  updateSelectedFixed: (f: boolean) => void;
  updateSelectedName: (n: string) => void;
  updateSelectedCoords?: (x: number, y: number) => void;
  updateSelectedStrokeColor?: (color: string) => void;
  updateSelectedFillColor?: (color: string) => void;
  updateSelectedFillOpacity?: (opacity: number) => void;
  confirmSlider?: (cfg: SliderConfig) => void;
  startAnimation?: (id: string) => void;
  stopAnimation?: (id: string) => void;
  cancelCurrentTool: () => boolean;
  clearSelection: () => void;
  /** True when Escape dismissed an open Context menu rather than something below it. */
  closeContextMenu: () => boolean;
  // Display commands the Context menu reaches directly
  selectParents: () => void;
  updateSelectedPointSize: (size: number) => void;
  bringSelectedForward: () => void;
  sendSelectedToBack: () => void;
  // Construct menu (all selection-based: Select-then-act)
  createPointOnObject: () => void;
  createIntersection: () => void;
  createMidpoint: () => void;
  createPerpendicular: () => void;
  createParallel: () => void;
  createBisector: () => void;
  createCenter: () => void;
  createEndpoint: () => void;
  createLocus: () => LocusResult;
  // Transform menu & marks
  markCenter: () => string | null;
  markMirror: () => string | null;
  markVector: () => string | null;
  markAngle: () => string | null;
  clearMarks: () => void;
  getMarks: () => MarkInfo;
  applyTranslate: (params: { type: 'vector' } | { type: 'rect'; dx: number; dy: number } | { type: 'polar'; distance: number; angleDeg: number }) => boolean;
  applyRotate: (params: { angleDeg: number }) => boolean;
  applyDilate: (params: { ratio: number }) => boolean;
  applyReflect: () => boolean;
  // Display menu
  toggleSelectedLabel: () => void;
  toggleSelectedTrace: () => void;
  clearAllTraces: () => void;
  showAllHidden: () => void;
  // Measure menu
  measureDistance: () => void;
  measureAngle: () => void;
  measureLength: () => void;
  measureRadius: () => void;
  measureArea: () => void;
  measureCoordinates: () => void;
  measureAbscissa: () => void;
  measureOrdinate: () => void;
  measureSlope: () => void;
  measureEquation: () => void;
  measurePerimeter: () => void;
  // Zoom & export
  getZoom: () => number;
  exportSVG: () => string;
}
