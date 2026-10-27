'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { getJXG, whenJsxGraphReady } from '@/lib/jsxgraph';
import type {
  CanvasHandle,
  CursorCoords,
  HeyGeoData,
  HeyGeoElement,
  SelectedElementInfo,
  ToolMode,
  SliderConfig,
  SliderPos,
} from './designTypes';
import { emptyData } from './designTypes';
import { createElement } from './elementRegistry';
import { anchorClosures, type AnchorSpec, type MeasureSpec } from './measurement';
import { arrowDragMap, imageClosures, type ImageSpec } from './transforms';
import {
  applyScene,
  clearHistory,
  coordParents,
  gatherSelectionPoints,
  planScene,
  pushCapped,
  setSceneChrome,
  syncPositions,
  takeScene,
  withDependents,
  type SceneSnapshot,
} from './sceneModel';
import type { ArrowMode } from './toolboxModel';

// ─── JSXGraph accessor (engine global, loaded from /vendor by lib/jsxgraph;
//     extends the global declared in JSXGraphViewer) ────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const jxg = (): any => (window as any).JXG;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JXGBoard = any;

// ─── Counters for auto-naming ─────────────────────────────────────────────────
const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
let _ptIdx = 0;
let _elIdx = 0;
function resetCounters() { _ptIdx = 0; _elIdx = 0; }
function nextPointName() {
  const n = _ptIdx++;
  return ALPHA[n % 26] + (n >= 26 ? String(Math.floor(n / 26)) : '');
}
function nextElId(prefix: string) { return `${prefix}_${++_elIdx}`; }

const POINT_ELTS = ['point', 'glider', 'midpoint', 'intersection', 'slider'];

// ─── Serialise board → HeyGeoData ────────────────────────────────────────────
function boardToData(
  board: JXGBoard,
  meta: { title: string; axis: boolean; grid: boolean },
  elements: HeyGeoElement[],
): HeyGeoData {
  const bb = board.getBoundingBox() as [number, number, number, number];
  return {
    version: '1.0',
    title: meta.title,
    boundingbox: bb,
    axis: meta.axis,
    grid: meta.grid,
    elements: JSON.parse(JSON.stringify(elements)), // deep copy
  };
}

// ─── Deserialise HeyGeoData → board objects ───────────────────────────────────
// Elements are created through elementRegistry inside the scene model, so an
// unsupported type, a wrong parent count or a dangling reference is reported
// instead of vanishing. Out-of-order JSON is rebuilt by retrying the deferred
// elements until a pass makes no progress, which also ends a parent cycle.
function loadDataToBoard(
  board: JXGBoard,
  data: HeyGeoData,
): { loaded: HeyGeoElement[]; errors: string[] } {
  const out = applyScene(board, takeScene(data.elements, {
    axis: data.axis ?? false,
    grid: data.grid ?? false,
  }));
  return { loaded: out.elements, errors: out.errors };
}

// ─── Find a snap point near screen coords ────────────────────────────────────
function findSnapPoint(
  board: JXGBoard,
  sx: number,
  sy: number,
  snapPx = 15,
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): any | null {
  for (const id in board.objects) {
    const obj = board.objects[id];
    if (obj.elType !== 'point' && obj.elType !== 'glider' && obj.elType !== 'midpoint' && obj.elType !== 'intersection' && obj.elType !== 'slider') continue;
    if (obj.visProp?.visible === false) continue;
    const sc = obj.coords?.scrCoords;
    if (!sc) continue;
    const dx = sc[1] - sx, dy = sc[2] - sy;
    if (Math.sqrt(dx * dx + dy * dy) <= snapPx) return obj;
  }
  return null;
}

// ─── Find a curve near screen coords for glider creation ─────────────────────
// Returns the curve object and the projected screen position on the curve.
// Supports circles, segments, lines, rays, and arcs.
function findSnapCurve(
  board: JXGBoard,
  sx: number,
  sy: number,
  snapPx = 12,
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): { obj: any; projSx: number; projSy: number } | null {
  for (const id in board.objects) {
    const obj = board.objects[id];
    if (obj.visProp?.visible === false) continue;
    // Skip ghost/temporary elements and non-glidable types
    if (typeof obj.id === 'string' && obj.id.startsWith('ghost_')) continue;
    if (obj.elType === 'circle') {
      const csc = obj.center?.coords?.scrCoords;
      const p2sc = obj.point2?.coords?.scrCoords;
      if (!csc || !p2sc) continue;
      const screenRadius = Math.sqrt(
        (p2sc[1] - csc[1]) ** 2 + (p2sc[2] - csc[2]) ** 2,
      );
      const dx = sx - csc[1], dy = sy - csc[2];
      const distToCenter = Math.sqrt(dx * dx + dy * dy);
      if (distToCenter < 1) continue;
      if (Math.abs(distToCenter - screenRadius) <= snapPx) {
        const angle = Math.atan2(dy, dx);
        return {
          obj,
          projSx: csc[1] + screenRadius * Math.cos(angle),
          projSy: csc[2] + screenRadius * Math.sin(angle),
        };
      }
    } else if (obj.elType === 'arc') {
      // Arc: point1 = center, point2 = radius reference point
      const csc = obj.point1?.coords?.scrCoords;
      const p2sc = obj.point2?.coords?.scrCoords;
      if (!csc || !p2sc) continue;
      const screenRadius = Math.sqrt(
        (p2sc[1] - csc[1]) ** 2 + (p2sc[2] - csc[2]) ** 2,
      );
      const dx = sx - csc[1], dy = sy - csc[2];
      const distToCenter = Math.sqrt(dx * dx + dy * dy);
      if (distToCenter < 1) continue;
      if (Math.abs(distToCenter - screenRadius) <= snapPx) {
        const angle = Math.atan2(dy, dx);
        return {
          obj,
          projSx: csc[1] + screenRadius * Math.cos(angle),
          projSy: csc[2] + screenRadius * Math.sin(angle),
        };
      }
    } else if (['line','segment','ray','parallel','perpendicular','bisector'].includes(obj.elType)) {
      const p1sc = obj.point1?.coords?.scrCoords;
      const p2sc = obj.point2?.coords?.scrCoords;
      if (!p1sc || !p2sc) continue;
      const dx = p2sc[1] - p1sc[1], dy = p2sc[2] - p1sc[2];
      const len2 = dx * dx + dy * dy;
      if (len2 < 1) continue;
      const t = ((sx - p1sc[1]) * dx + (sy - p1sc[2]) * dy) / len2;
      // Clamp to [0,1] for segments; unclamped for infinite lines
      const tC = obj.elType === 'segment' ? Math.max(0, Math.min(1, t)) : t;
      const projSx = p1sc[1] + tC * dx;
      const projSy = p1sc[2] + tC * dy;
      const dist = Math.sqrt((sx - projSx) ** 2 + (sy - projSy) ** 2);
      if (dist <= snapPx) return { obj, projSx, projSy };
    }
  }
  return null;
}

// ─── Convert mouse event → board user coords ──────────────────────────────────
function eventToCoords(
  board: JXGBoard,
  canvasEl: HTMLElement,
  evt: MouseEvent | React.MouseEvent,
): { x: number; y: number; sx: number; sy: number } {
  const rect = canvasEl.getBoundingClientRect();
  const sx = evt.clientX - rect.left;
  const sy = evt.clientY - rect.top;
  const uc = new (jxg()).Coords((jxg()).COORDS_BY_SCREEN, [sx, sy], board).usrCoords;
  return { x: uc[1], y: uc[2], sx, sy };
}

// ─── Find geometric objects near screen coords (for construct tools) ──────────
// Returns objects of the requested types within `tolerance` pixels.
function findObjectsAt(
  board: JXGBoard,
  sx: number,
  sy: number,
  types: string[],
  tolerance = 12,
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): any[] {
  const result: unknown[] = [];
  for (const id in board.objects) {
    const obj = board.objects[id];
    if (obj.visProp?.visible === false) continue;
    if (typeof obj.id === 'string' && obj.id.startsWith('ghost_')) continue;
    if (!types.includes(obj.elType)) continue;
    if (['point', 'glider', 'midpoint', 'intersection', 'slider'].includes(obj.elType)) {
      const sc = obj.coords?.scrCoords;
      if (sc) {
        const d = Math.sqrt((sc[1] - sx) ** 2 + (sc[2] - sy) ** 2);
        if (d <= tolerance) result.push(obj);
      }
    } else if (['line','segment','ray','parallel','perpendicular','bisector'].includes(obj.elType)) {
      if (['parallel','perpendicular','bisector'].includes(obj.elType)) {
        // These elements have unreliable point1/point2 positions.
        // Use stdform (ax + by + c = 0 in user coords) for accurate distance.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sf = obj.stdform as number[] | undefined;
        if (sf && sf.length >= 3) {
          const [c, a, b] = sf;
          const nlen = Math.sqrt(a * a + b * b);
          if (nlen < 1e-10) continue;
          const ox = board.origin.scrCoords[1] as number;
          const oy = board.origin.scrCoords[2] as number;
          const uX = board.unitX as number, uY = board.unitY as number;
          const userX = (sx - ox) / uX;
          const userY = (oy - sy) / uY;
          const distUser = Math.abs(c + a * userX + b * userY) / nlen;
          // Convert user distance to screen pixels through the line's normal
          const distScr = distUser * Math.sqrt((a * uX) ** 2 + (b * uY) ** 2) / nlen;
          if (distScr <= tolerance) result.push(obj);
        }
      } else {
        const p1 = obj.point1?.coords?.scrCoords;
        const p2 = obj.point2?.coords?.scrCoords;
        if (p1 && p2) {
          const dx = p2[1] - p1[1], dy = p2[2] - p1[2];
          const len2 = dx * dx + dy * dy;
          if (len2 < 1) continue;
          const t = ((sx - p1[1]) * dx + (sy - p1[2]) * dy) / len2;
          const tC = obj.elType === 'segment' ? Math.max(0, Math.min(1, t)) : t;
          const dist = Math.sqrt((sx - (p1[1] + tC * dx)) ** 2 + (sy - (p1[2] + tC * dy)) ** 2);
          if (dist <= tolerance) result.push(obj);
        }
      }
    } else if (obj.elType === 'circle' || obj.elType === 'arc') {
      const csc = (obj.center ?? obj.point1)?.coords?.scrCoords;
      const p2sc = obj.point2?.coords?.scrCoords;
      if (csc && p2sc) {
        const screenR = Math.sqrt((p2sc[1] - csc[1]) ** 2 + (p2sc[2] - csc[2]) ** 2);
        const d = Math.sqrt((sx - csc[1]) ** 2 + (sy - csc[2]) ** 2);
        if (Math.abs(d - screenR) <= tolerance) result.push(obj);
      }
    } else if (obj.elType === 'text') {
      const sc = obj.coords?.scrCoords;
      if (sc) {
        const d = Math.sqrt((sc[1] - sx) ** 2 + (sc[2] - sy) ** 2);
        if (d <= tolerance * 2) result.push(obj);
      }
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return result as any[];
}

// ─── Rubber-band geometry helpers ────────────────────────────────────────────
/** Returns true iff finite segments (x1,y1)-(x2,y2) and (x3,y3)-(x4,y4) intersect. */
function segmentsIntersect(
  x1: number, y1: number, x2: number, y2: number,
  x3: number, y3: number, x4: number, y4: number,
): boolean {
  const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  if (Math.abs(denom) < 1e-10) return false;
  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;
  return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
}

/** Returns true iff segment (x1,y1)-(x2,y2) intersects or is partly inside the rect. */
function segmentTouchesRect(
  x1: number, y1: number, x2: number, y2: number,
  rx: number, ry: number, rw: number, rh: number,
): boolean {
  if (x1 >= rx && x1 <= rx + rw && y1 >= ry && y1 <= ry + rh) return true;
  if (x2 >= rx && x2 <= rx + rw && y2 >= ry && y2 <= ry + rh) return true;
  const r = rx + rw, b = ry + rh;
  return segmentsIntersect(x1, y1, x2, y2, rx, ry, r,  ry)  // top
      || segmentsIntersect(x1, y1, x2, y2, r,  ry, r,  b)   // right
      || segmentsIntersect(x1, y1, x2, y2, rx, b,  r,  b)   // bottom
      || segmentsIntersect(x1, y1, x2, y2, rx, ry, rx, b);  // left
}

/**
 * Returns true iff the infinite line through (x1,y1)-(x2,y2) intersects the rect.
 * Uses the half-plane sign test: if all 4 corners are on the same side, the line misses.
 */
function lineTouchesRect(
  x1: number, y1: number, x2: number, y2: number,
  rx: number, ry: number, rw: number, rh: number,
): boolean {
  const cross = (px: number, py: number) =>
    (x2 - x1) * (py - y1) - (y2 - y1) * (px - x1);
  const r = rx + rw, b = ry + rh;
  const signs = [cross(rx, ry), cross(r, ry), cross(rx, b), cross(r, b)];
  return !(signs.every(s => s > 0) || signs.every(s => s < 0));
}

// ─── Selection decoration shape (rendered as SVG overlay) ───────────────────
type SelDecoration =
  | { kind: 'point';   cx: number; cy: number; r: number }
  | { kind: 'line';    x1: number; y1: number; x2: number; y2: number;
      sfirst: boolean; slast: boolean }
  | { kind: 'circle';  cx: number; cy: number; r: number }
  | { kind: 'polygon'; points: string };

/** The marked centre in screen pixels; `key` is what the 60 fps loop compares. */
type CenterMark = { key: string; sx: number; sy: number };

// Compute two far screen-space points that define the direction of a JSXGraph
// line element whose point1/point2 may be unreliable (parallel/perpendicular/bisector).
// Uses the element's stdform: stdform[0] + stdform[1]*x + stdform[2]*y = 0 (user coords).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function lineVisibleScrPts(obj: any, board: any): [[number, number], [number, number]] | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sf = obj.stdform as number[] | undefined;
  if (!sf || sf.length < 3) return null;
  const [c, a, b] = sf;
  const nlen = Math.sqrt(a * a + b * b);
  if (nlen < 1e-10) return null;
  // Direction in user coords perpendicular to normal (a,b):
  const dirX = b / nlen, dirY = -a / nlen;
  // Project board center onto the line to get a point on it:
  const bb = board.getBoundingBox() as number[];
  const cx = (bb[0] + bb[2]) / 2, cy = (bb[1] + bb[3]) / 2;
  const t = -(c + a * cx + b * cy) / (a * a + b * b);
  const px = cx + a * t, py = cy + b * t;
  // Extend far enough to cover the viewport:
  const span = Math.hypot(bb[2] - bb[0], bb[1] - bb[3]) * 8;
  const ux1 = px - dirX * span, uy1 = py - dirY * span;
  const ux2 = px + dirX * span, uy2 = py + dirY * span;
  // User → screen:
  const ox = board.origin.scrCoords[1] as number;
  const oy = board.origin.scrCoords[2] as number;
  const uX = board.unitX as number, uY = board.unitY as number;
  return [
    [ox + ux1 * uX, oy - uy1 * uY],
    [ox + ux2 * uX, oy - uy2 * uY],
  ];
}

function computeDecorations(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  selected: any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  board?: any,
): SelDecoration[] {
  const decs: SelDecoration[] = [];
  for (const obj of selected) {
    try {
      if (['point','glider','midpoint','intersection'].includes(obj.elType)) {
        const sc = obj.coords?.scrCoords;
        if (sc) decs.push({ kind: 'point', cx: sc[1], cy: sc[2],
          r: (obj.visProp?.size ?? 4) + 1 });
      } else if (['line','segment','ray','parallel','perpendicular','bisector'].includes(obj.elType)) {
        if (['parallel','perpendicular','bisector'].includes(obj.elType) && board) {
          // Use stdform + board transform for accurate screen direction
          const ends = lineVisibleScrPts(obj, board);
          if (ends) decs.push({ kind: 'line',
            x1: ends[0][0], y1: ends[0][1], x2: ends[1][0], y2: ends[1][1],
            sfirst: false, slast: false, // already extended to screen edges
          });
        } else {
          const p1 = obj.point1?.coords?.scrCoords;
          const p2 = obj.point2?.coords?.scrCoords;
          const isInfinite = obj.elType === 'line';
          const isRayLike  = obj.elType === 'ray';
          if (p1 && p2) decs.push({ kind: 'line',
            x1: p1[1], y1: p1[2], x2: p2[1], y2: p2[2],
            sfirst: !!(obj.visProp?.straightfirst ?? isInfinite),
            slast:  !!(obj.visProp?.straightlast  ?? (isInfinite || isRayLike)),
          });
        }
      } else if (obj.elType === 'circle') {
        const csc = (obj.center ?? obj.point1)?.coords?.scrCoords;
        const p2sc = obj.point2?.coords?.scrCoords;
        if (csc && p2sc) {
          const r = Math.sqrt((p2sc[1]-csc[1])**2 + (p2sc[2]-csc[2])**2);
          decs.push({ kind: 'circle', cx: csc[1], cy: csc[2], r });
        }
      } else if (obj.elType === 'polygon') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const verts: any[] = obj.vertices ?? [];
        const pts = verts
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((v: any) => {
            const sc = v.coords?.scrCoords;
            return sc ? `${sc[1]},${sc[2]}` : null;
          })
          .filter(Boolean) as string[];
        if (pts.length >= 2) decs.push({ kind: 'polygon', points: pts.join(' ') });
      }
    } catch { /**/ }
  }
  return decs;
}

// ─── Build SelectedElementInfo from board object ─────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toSelectedInfo(obj: any): SelectedElementInfo {
  const vp = obj.visProp ?? {};
  return {
    id:          obj.id,
    type:        obj.elType ?? 'unknown',
    name:        obj.name ?? '',
    strokeColor: vp.strokecolor  ?? '#000000',
    fillColor:   vp.fillcolor    ?? 'none',
    fillOpacity: vp.fillopacity  ?? 0.1,
    strokeWidth: vp.strokewidth  ?? 2,
    dash:        vp.dash         ?? 0,
    visible:     vp.visible      !== false,
    fixed:       obj.isDraggable === false,
    coords:      obj.elType === 'point'
      ? [obj.X?.() ?? 0, obj.Y?.() ?? 0]
      : undefined,
  };
}

// ─── Props & Ref ──────────────────────────────────────────────────────────────
interface Props {
  tool: ToolMode;
  /** While `tool === 'selection'`, this decides what a drag does. */
  arrow: ArrowMode;
  initialData?: HeyGeoData | null;
  onCursorMove: (c: CursorCoords) => void;
  onSelectionChange: (els: SelectedElementInfo[]) => void;
  onDirty: () => void;
  onOpenProperties?: (info: SelectedElementInfo) => void;
  onOpenSliderConfig?: (pos: SliderPos) => void;
  onNotify?: (msg: string) => void;
}

const DesignCanvas = forwardRef<CanvasHandle, Props>(function DesignCanvas(
  { tool, arrow, initialData, onCursorMove, onSelectionChange, onDirty, onOpenProperties, onOpenSliderConfig, onNotify },
  ref,
) {
  const BOARD_ID = 'heygeo-design-board';
  const boardRef   = useRef<JXGBoard | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [jxgLoaded, setJxgLoaded] = useState(() => getJXG() !== null);

  // Marks stored for transformations (Center, Mirror, Vector, Angle)
  const marksRef = useRef<import('./designTypes').MarkInfo>({});
  const onNotifyRef = useRef(onNotify);
  useEffect(() => { onNotifyRef.current = onNotify; }, [onNotify]);

  // Snap indicator: screen position of snap target (null = none)
  // type: 'point' = snapping to existing point (red), 'curve' = snapping to curve (orange)
  const [snapPos, setSnapPos] = useState<{ sx: number; sy: number; type: 'point' | 'curve' } | null>(null);

  // Rubber-band rectangle selection state
  const [rubberBand, setRubberBand] = useState<{
    x: number; y: number; w: number; h: number
  } | null>(null);
  const rubberRef = useRef<{
    active: boolean;
    startX: number; startY: number;
    curX: number;   curY: number;
  }>({ active: false, startX: 0, startY: 0, curX: 0, curY: 0 });

  // Internal state (not React state – avoids re-renders on every move)
  const metaRef    = useRef({ title: 'Chưa đặt tên', axis: false, grid: false });
  const elementsRef = useRef<HeyGeoElement[]>([]);        // canonical element list
  const undoStack  = useRef<SceneSnapshot[]>([]);
  const redoStack  = useRef<SceneSnapshot[]>([]);
  // Document state captured on mouse-down, pushed to the undo stack only if the
  // pointer actually dragged something — a click must not become an undo step.
  const dragBaseRef = useRef<SceneSnapshot | null>(null);

  // Stable ref for onOpenProperties so the board dblclick closure is never stale
  const onOpenPropertiesRef = useRef(onOpenProperties);
  useEffect(() => { onOpenPropertiesRef.current = onOpenProperties; }, [onOpenProperties]);

  // Stable ref for onOpenSliderConfig
  const onOpenSliderConfigRef = useRef(onOpenSliderConfig);
  useEffect(() => { onOpenSliderConfigRef.current = onOpenSliderConfig; }, [onOpenSliderConfig]);

  // Stores pending two-click slider position until dialog confirms
  const sliderPosRef = useRef<SliderPos | null>(null);

  // Tool interaction state
  const toolRef     = useRef<ToolMode>(tool);
  const arrowRef    = useRef<ArrowMode>(arrow);

  // ─── Rotate / dilate arrow dragging ────────────────────────────────────────
  // Those two arrows select exactly like the translate arrow; only a drag
  // differs — it turns or scales the whole selection about the marked centre.
  // Everything is measured from the drag-start snapshot, never incrementally,
  // so the frame JSXGraph spends moving the grabbed object is overwritten
  // instead of compounding.
  interface ArrowDrag {
    mode:   'rotate' | 'dilate';
    center: [number, number];
    start:  [number, number];
    base:   { id: string; x: number; y: number }[];
  }
  const arrowDragRef = useRef<ArrowDrag | null>(null);
  /** Pointer position when the arrow drag began, in user coords. */
  const arrowStartRef = useRef<[number, number] | null>(null);
  /** Latest pointer event anywhere in the window, used to read the pointer. */
  const pointerRef = useRef<PointerEvent | null>(null);

  useEffect(() => {
    const onMove = (e: PointerEvent) => { pointerRef.current = e; };
    window.addEventListener('pointermove', onMove, true);
    return () => window.removeEventListener('pointermove', onMove, true);
  }, []);

  const pendingRef  = useRef<{
    phase: 'idle' | 'pt2' | 'pt3' | 'polygon' | 'slider_pt2';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pt1?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pt2?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    obj1?: any;   // first object for intersection/midpoint interactive modes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ghostEl?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    polyVerts?: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    polyLines?: any[];
    rawPt1?: { x: number; y: number };  // for slider first click (raw user coords)
  }>({ phase: 'idle' });

  // Selection
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const selectedRef = useRef<any[]>([]);
  // Set to true in element's 'down' handler so rubber-band onMouseDown knows an object was clicked
  const objectClickedRef = useRef(false);
  // GSP-style selection decorations rendered as SVG overlay
  const [selDecorations, setSelDecorations] = useState<SelDecoration[]>([]);
  // The marked centre, left on the page as an open circle like Sketchpad does
  const [centerMark, setCenterMark] = useState<CenterMark | null>(null);
  const centerMarkRef = useRef<CenterMark | null>(null);

  // Keep toolRef in sync with prop
  useEffect(() => {
    toolRef.current = tool;
    // Cancel pending when tool changes
    cancelTool();
    // Overlay never captures events — JSXGraph handles clicks in selection mode;
    // our custom rubber-band listener is attached directly to the container.
    if (overlayRef.current) {
      overlayRef.current.style.pointerEvents = tool === 'selection' ? 'none' : 'auto';
    }
    if (boardRef.current) {
      // In selection mode: disable pan (rubber-band replaces empty-drag), keep wheel zoom.
      // In construction modes: also disable pan/wheel so clicks build geometry.
      try {
        boardRef.current.setAttribute({ pan: { enabled: false }, zoom: { wheel: tool === 'selection' } });
      } catch { /* ignore */ }
      if (boardRef.current.options?.pan) boardRef.current.options.pan.enabled = false;
      if (boardRef.current.options?.zoom) boardRef.current.options.zoom.wheel = tool === 'selection';
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool]);

  // Switching the arrow mode mid-drag must not leave a frozen transform behind.
  useEffect(() => {
    arrowRef.current = arrow;
    arrowDragRef.current = null;
    arrowStartRef.current = null;
  }, [arrow]);

  // ─── Snapshot helpers ─────────────────────────────────────────────────────
  /**
   * The document plus the board's live positions. A drag moves the geometry
   * without touching the document, so a snapshot taken without the write-back
   * would undo a drag to the point's creation coordinates.
   */
  function currentScene(): SceneSnapshot {
    const board = boardRef.current;
    if (board) syncPositions(elementsRef.current, board);
    return takeScene(elementsRef.current, metaRef.current);
  }

  function saveSnapshot() {
    pushCapped(undoStack.current, currentScene());
    redoStack.current = [];
  }

  // ─── Arrow dragging (rotate / dilate about the marked centre) ──────────────
  /** Pointer position in user coords, from the tracked pointer events. */
  function pointerUserCoords(): [number, number] | null {
    const board = boardRef.current;
    const container = board?.containerObj as HTMLElement | undefined;
    const evt = pointerRef.current;
    if (!board || !container || !evt) return null;
    const c = eventToCoords(board, container, evt);
    return [c.x, c.y];
  }

  /**
   * Freeze what the drag works from: the centre, where the pointer was grabbed
   * and where every free point of the selection started. Null when the drag
   * cannot be a transform, which leaves it a plain translate.
   */
  function beginArrowDrag(): ArrowDrag | null {
    const board = boardRef.current;
    const mode = arrowRef.current;
    if (!board || mode === 'translate') return null;

    const cInfo = marksRef.current.center;
    const centerPt = cInfo ? board.objects[cInfo.id] : null;
    if (!centerPt) {
      onNotifyRef.current?.(
        mode === 'rotate'
          ? 'Chưa đánh dấu tâm quay. Nhấp đúp vào một điểm để đánh dấu tâm.'
          : 'Chưa đánh dấu tâm co giãn. Nhấp đúp vào một điểm để đánh dấu tâm.',
      );
      return null;
    }
    const start = arrowStartRef.current;
    if (!start) return null;

    // Only points the document places by coordinates can be moved; a midpoint or
    // an intersection follows whatever it was built from.
    const freeIds = new Set(
      elementsRef.current.filter((el) => coordParents(el) !== null).map((el) => el.id),
    );
    const base = gatherSelectionPoints(selectedRef.current)
      .filter((p) => freeIds.has(p.id))
      .map((p) => ({ id: p.id, x: p.X(), y: p.Y() }));
    if (base.length === 0) {
      onNotifyRef.current?.('Vùng chọn không có điểm tự do nào để biến đổi.');
      return null;
    }
    return { mode, center: [centerPt.X(), centerPt.Y()], start, base };
  }

  /** Move the frozen points so the pointer sits at the angle / ratio it reached. */
  function applyArrowDrag(): void {
    const board = boardRef.current;
    if (!board) return;
    if (!arrowDragRef.current) {
      arrowDragRef.current = beginArrowDrag();
      if (!arrowDragRef.current) return;
    }
    const { mode, center, start, base } = arrowDragRef.current;
    const p = pointerUserCoords();
    if (!p) return;

    const map = arrowDragMap(mode, center, start, p);
    for (const b of base) {
      const obj = board.objects[b.id];
      if (typeof obj?.moveTo === 'function') obj.moveTo(map(b.x, b.y));
    }
    board.update();
    setSelDecorations(computeDecorations(selectedRef.current, board));
  }

  /** Called from an element's 'down': remembers the grab point for a later drag. */
  function noteArrowDragStart(evt: MouseEvent): void {
    arrowDragRef.current = null;
    arrowStartRef.current = null;
    if (arrowRef.current === 'translate' || toolRef.current !== 'selection') return;
    const board = boardRef.current;
    const container = board?.containerObj as HTMLElement | undefined;
    if (!board || !container) return;
    // GSP turns the selection so that whatever is under the cursor follows it,
    // so the drag is measured from the pointer, not from the object's own point.
    const c = eventToCoords(board, container, evt);
    arrowStartRef.current = [c.x, c.y];
  }

  // Elements dropped while loading used to disappear without a trace, which made
  // a bad save round-trip look like a rendering bug.
  function reportLoadErrors(errors: string[]) {
    if (errors.length === 0) return;
    const shown = errors.slice(0, 3).join(' · ');
    onNotifyRef.current?.(
      `${errors.length} đối tượng không dựng lại được: ${shown}` +
      (errors.length > 3 ? ' …' : ''),
    );
  }

  // ─── Restore a snapshot onto the board that is already there ──────────────
  // Only the difference reaches the board, so zoom, pan, traced curves, running
  // animations and the selection all survive an undo.
  function restoreScene(target: SceneSnapshot) {
    const board = boardRef.current;
    if (!board) return;
    cancelTool();
    const { elements, errors } = applyScene(board, target, planScene(currentScene(), target));
    elementsRef.current = elements;
    metaRef.current = { ...metaRef.current, axis: target.axis, grid: target.grid };
    setSceneChrome(board, metaRef.current);
    reportLoadErrors(errors);
    keepSelection(board);
    onDirty();
  }

  /** Keep what is still on the board selected, by id. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function keepSelection(board: any) {
    const alive = selectedRef.current
      .map((o: { id: string }) => board.objects?.[o.id])
      .filter(Boolean);
    selectedRef.current = alive;
    onSelectionChange(alive.map(toSelectedInfo));
    setSelDecorations(computeDecorations(alive, board));
  }

  // ─── Measurements ─────────────────────────────────────────────────────────
  /**
   * A measurement is a text element carrying descriptors: `attrs.measure` says
   * what to compute and `attrs.anchor` where to put it. The document stays data
   * — no JavaScript source is stored, so nothing has to be evaluated to open a
   * file — and the caption keeps following the geometry because the registry
   * hands JSXGraph closures built from those descriptors.
   */
  function addMeasure(
    id: string,
    measure: MeasureSpec,
    anchor: AnchorSpec | null,
    style: Record<string, unknown>,
  ): boolean {
    const board = boardRef.current;
    if (!board) return false;
    const [x, y] = anchor
      ? anchorClosures(board, anchor)
      : [() => 0, () => 0];
    const el: HeyGeoElement = {
      type: 'text',
      id,
      parents: [Number(x().toFixed(4)), Number(y().toFixed(4)), measure.label ?? ''],
      attrs: anchor ? { ...style, anchor, measure } : { ...style, measure },
    };
    const { obj, error } = createElement(board, el, {});
    if (!obj) {
      onNotifyRef.current?.(error ?? `Không tạo được ${el.type}`);
      return false;
    }
    elementsRef.current.push(el);
    board.update();
    onDirty();
    return true;
  }

  // ─── Rebuild board from elements[] ────────────────────────────────────────
  // Used when a whole new document arrives; a snapshot restore goes through
  // restoreScene instead.
  function rebuildBoard(els: HeyGeoElement[]) {
    const board = boardRef.current;
    if (!board) return;
    // Free & re-init
    jxg().JSXGraph.freeBoard(board);
    const meta = metaRef.current;
    const newBoard = jxg().JSXGraph.initBoard(BOARD_ID, {
      boundingbox: [-8, 8, 8, -8],
      axis: true,
      grid: true,
      showCopyright: false,
      showNavigation: true,
      keepaspectratio: true,
      resize: { enabled: true, throttle: 50 },
      pan: { enabled: false },
      zoom: { wheel: toolRef.current === 'selection', min: 0.1, max: 50 },
    });
    boardRef.current = newBoard;
    attachBoardEvents(newBoard); // must be before loadDataToBoard so events attach to all elements
    const { loaded, errors } = loadDataToBoard(newBoard, { ...emptyData(), elements: els });
    elementsRef.current = loaded;
    reportLoadErrors(errors);
    setSceneChrome(newBoard, meta);
    selectedRef.current = [];
    onSelectionChange([]);
    setSelDecorations([]);
    pendingRef.current = { phase: 'idle' };
  }

  // ─── Rubber-band selection + middle-mouse pan ────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Pan via middle mouse button (mirrors Desktop: e->button() == Qt::MiddleButton → PAN_DRAG)
    let panActive = false;
    let panStartX = 0, panStartY = 0;
    let panBB: [number, number, number, number] | null = null;

    function getLocalXY(evt: MouseEvent): { sx: number; sy: number } {
      const rect = container!.getBoundingClientRect();
      return { sx: evt.clientX - rect.left, sy: evt.clientY - rect.top };
    }

    function onMouseDown(evt: MouseEvent) {
      // Middle-mouse pan (works in all tool modes)
      if (evt.button === 1) {
        const board = boardRef.current;
        if (!board) return;
        panActive = true;
        panStartX = evt.clientX;
        panStartY = evt.clientY;
        panBB = [...board.getBoundingBox()] as [number, number, number, number];
        container!.style.cursor = 'grab';
        evt.preventDefault();
        return;
      }

      if (toolRef.current !== 'selection') return;
      if (evt.button !== 0) return;
      // board.on('down') runs first (inside JSXGraph’s event loop) and sets
      // objectClickedRef when an object was hit — skip rubber-band in that case.
      if (objectClickedRef.current) {
        objectClickedRef.current = false;
        return;
      }
      // Empty-space click: clear selection and start rubber-band.
      const { sx, sy } = getLocalXY(evt);
      clearSelection();
      rubberRef.current = { active: true, startX: sx, startY: sy, curX: sx, curY: sy };
      if (container) container.style.cursor = 'crosshair';
      evt.preventDefault();
    }

    function onMouseMove(evt: MouseEvent) {
      // Middle-mouse pan move
      if (panActive && panBB) {
        const board = boardRef.current;
        if (!board) return;
        const rect = container!.getBoundingClientRect();
        const dx = (evt.clientX - panStartX) / rect.width  * (panBB[2] - panBB[0]);
        const dy = (evt.clientY - panStartY) / rect.height * (panBB[1] - panBB[3]);
        board.setBoundingBox([
          panBB[0] - dx, panBB[1] - dy,
          panBB[2] - dx, panBB[3] - dy,
        ], false);
        board.update();
        return;
      }

      if (!rubberRef.current.active) return;
      const { sx, sy } = getLocalXY(evt);
      rubberRef.current.curX = sx;
      rubberRef.current.curY = sy;
      const x = Math.min(rubberRef.current.startX, sx);
      const y = Math.min(rubberRef.current.startY, sy);
      const w = Math.abs(sx - rubberRef.current.startX);
      const h = Math.abs(sy - rubberRef.current.startY);
      if (w > 3 || h > 3) setRubberBand({ x, y, w, h });
    }

    function onMouseUp(evt: MouseEvent) {
      // Middle-mouse pan end
      if (evt.button === 1 && panActive) {
        panActive = false;
        panBB = null;
        container!.style.cursor = '';
        return;
      }

      if (!rubberRef.current.active) return;
      rubberRef.current.active = false;
      const rb = rubberBandRef.current;
      if (rb && (rb.w > 5 || rb.h > 5)) {
        // Select all objects whose screen coords fall inside the rect
        const board = boardRef.current;
        if (board) {
          const found: unknown[] = [];
          for (const id in board.objects) {
            const obj = board.objects[id];
            if (obj.visProp?.visible === false) continue;
            if (obj.elType === 'axis' || obj.elType === 'ticks' || obj.elType === 'grid') continue;
            let inside = false;
            if (obj.elType === 'point') {
              const sc = obj.coords?.scrCoords;
              if (sc) inside = sc[1] >= rb.x && sc[1] <= rb.x + rb.w &&
                                        sc[2] >= rb.y && sc[2] <= rb.y + rb.h;
            } else if (['line','segment','ray','parallel','perpendicular','bisector'].includes(obj.elType)) {
              // For parallel/perpendicular/bisector, point1/point2 screen coords are
              // unreliable — use stdform-based visible endpoints instead.
              let sp1: [number, number] | null = null;
              let sp2: [number, number] | null = null;
              if (['parallel','perpendicular','bisector'].includes(obj.elType)) {
                const ends = lineVisibleScrPts(obj, board);
                if (ends) { sp1 = ends[0]; sp2 = ends[1]; }
              } else {
                const p1 = obj.point1?.coords?.scrCoords;
                const p2 = obj.point2?.coords?.scrCoords;
                if (p1 && p2) { sp1 = [p1[1], p1[2]]; sp2 = [p2[1], p2[2]]; }
              }
              if (sp1 && sp2) {
                inside = obj.elType === 'segment'
                  ? segmentTouchesRect(sp1[0], sp1[1], sp2[0], sp2[1], rb.x, rb.y, rb.w, rb.h)
                  : lineTouchesRect(sp1[0], sp1[1], sp2[0], sp2[1], rb.x, rb.y, rb.w, rb.h);
              }
            } else if (obj.elType === 'circle') {
              const csc = obj.center?.coords?.scrCoords;
              if (csc) inside = csc[1] >= rb.x && csc[1] <= rb.x + rb.w &&
                                          csc[2] >= rb.y && csc[2] <= rb.y + rb.h;
            } else if (obj.elType === 'polygon') {
              // Polygon: check if centroid or any vertex is inside
              const verts = obj.vertices ?? [];
              inside = verts.some((v: { coords: { scrCoords: number[] } }) => {
                const sc = v.coords?.scrCoords;
                return sc && sc[1] >= rb.x && sc[1] <= rb.x + rb.w &&
                             sc[2] >= rb.y && sc[2] <= rb.y + rb.h;
              });
            }
            if (inside) found.push(obj);
          }
          clearSelection();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          selectedRef.current = found as any[];
          setSelDecorations(computeDecorations(selectedRef.current, boardRef.current));
          onSelectionChange(selectedRef.current.map(toSelectedInfo));
        }
      }
      setRubberBand(null);
      if (container) container.style.cursor = '';
    }

    container.addEventListener('mousedown', onMouseDown);
    container.addEventListener('auxclick', (e) => { if (e.button === 1) e.preventDefault(); });
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup',   onMouseUp);
    return () => {
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup',   onMouseUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep a ref to current rubberBand state for use inside mouseup event closure
  const rubberBandRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  useEffect(() => { rubberBandRef.current = rubberBand; }, [rubberBand]);

  // ─── Decoration interval loop ─────────────────────────────────────────────
  // Runs at ~60 fps to keep SVG decorators in sync as points are dragged / board panned.
  useEffect(() => {
    const id = setInterval(() => {
      const board = boardRef.current;
      if (!board) return;
      if (selectedRef.current.length > 0) {
        setSelDecorations(computeDecorations(selectedRef.current, board));
      }
      const next = readCenterMark(board);
      if (next?.key !== centerMarkRef.current?.key) {
        centerMarkRef.current = next;
        setCenterMark(next);
      }
    }, 16);
    return () => clearInterval(id);
  }, []);

  /** Screen position of the marked centre, refreshed by the decoration loop. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function readCenterMark(board: any): CenterMark | null {
    const cInfo = marksRef.current.center;
    if (!cInfo) return null;
    const sc = board.objects[cInfo.id]?.coords?.scrCoords;
    if (!sc) return null;
    return { key: `${cInfo.id}:${Math.round(sc[1])}:${Math.round(sc[2])}`, sx: sc[1], sy: sc[2] };
  }

  // ─── Attach board-level events (click on objects for selection/info) ──────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function attachBoardEvents(board: any) {
    // Override board.create to attach per-element events
    const origCreate = board.create.bind(board);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    board.create = (type: string, parents: any[], attrs: Record<string, unknown>) => {
      const obj = origCreate(type, parents, attrs);
      if (obj && typeof obj.on === 'function' && type !== 'axis' && type !== 'grid' && type !== 'ticks') {
        // ── info / text click ────────────────────────────────────────────
        obj.on('down', (evt: MouseEvent) => {
          if (toolRef.current === 'info') {
            onSelectionChange([toSelectedInfo(obj)]);
            return;
          }
          if (toolRef.current === 'text') {
            const vis = !(obj.label?.visProp?.visible ?? obj.visProp?.visible ?? true);
            if (obj.label) { obj.label.setAttribute({ visible: vis }); }
            else           { obj.setAttribute({ visible: vis }); }
            board.update();
            onDirty();
            return;
          }
          // Selection is handled by board.on('down') below using findObjectsAt.
          // objectClickedRef is set there; just stop DOM propagation here so
          // the container mousedown doesn’t also start rubber-band.
          if (toolRef.current === 'selection') {
            // Remember where the drag starts, but only spend an undo step on it
            // if the pointer actually moves something.
            dragBaseRef.current = currentScene();
            noteArrowDragStart(evt);
            evt.stopPropagation?.();
          }
        });
        // ── drag: dragging an unselected object makes it the sole selection ──
        obj.on('drag', () => {
          if (dragBaseRef.current) {
            pushCapped(undoStack.current, dragBaseRef.current);
            redoStack.current = [];
            dragBaseRef.current = null;
          }
          if (toolRef.current !== 'selection') return;
          if (arrowRef.current !== 'translate') {
            // An arrow drag transforms the whole selection, so it must not
            // collapse a multi-selection down to the object under the cursor.
            if (!selectedRef.current.includes(obj)) {
              selectedRef.current = [obj];
              setSelDecorations(computeDecorations([obj], board));
              onSelectionChange(selectedRef.current.map(toSelectedInfo));
            }
            applyArrowDrag();
            return;
          }
          if (selectedRef.current.length === 1 && selectedRef.current[0] === obj) return;
          selectedRef.current = [obj];
          setSelDecorations(computeDecorations([obj], board));
          onSelectionChange(selectedRef.current.map(toSelectedInfo));
        });
        // ── drop: a moved object has to land back in the document ───────────
        obj.on('up', () => {
          dragBaseRef.current = null;
          arrowDragRef.current = null;
          arrowStartRef.current = null;
          if (toolRef.current !== 'selection') return;
          if (syncPositions(elementsRef.current, board)) {
            setSelDecorations(computeDecorations(selectedRef.current, board));
            onSelectionChange(selectedRef.current.map(toSelectedInfo));
            onDirty();
          }
        });
        // ── hover: pointer cursor, no color change ──────────────────────────
        obj.on('over', () => {
          if (toolRef.current === 'selection' && containerRef.current) {
            containerRef.current.style.cursor = 'pointer';
          }
        });
        obj.on('out', () => {
          if (toolRef.current === 'selection' && containerRef.current) {
            containerRef.current.style.cursor = '';
          }
        });
        // ── prevent JSXGraph from changing color on hover ───────────────────
        try {
          const vp = obj.visProp ?? {};
          obj.setAttribute({
            highlightStrokeColor: vp.strokecolor  ?? vp.highlightstrokecolor  ?? 'auto',
            highlightFillColor:   vp.fillcolor    ?? vp.highlightfillcolor    ?? 'none',
            highlightStrokeWidth: vp.strokewidth  ?? vp.highlightstrokewidth  ?? 2,
          });
        } catch { /**/ }
      }
      return obj;
    };

    // Board-level down: fires inside JSXGraph’s own event loop (before native DOM bubble).
    // Using findObjectsAt here is more reliable than per-element obj.on('down') for thin
    // elements like segments whose JSXGraph hit area may be too small.
    board.on('down', (evt: MouseEvent) => {
      if (toolRef.current !== 'selection') return;
      if (typeof evt.button === 'number' && evt.button !== 0) return;
      const rect = (board.containerObj as HTMLElement).getBoundingClientRect();
      const sx = evt.clientX - rect.left;
      const sy = evt.clientY - rect.top;
      const SELECTABLE = [...POINT_ELTS,
                          'line', 'segment', 'ray', 'parallel', 'perpendicular', 'bisector',
                          'circle', 'arc'];
      const hits = findObjectsAt(board, sx, sy, SELECTABLE, 12);
      // Prioritise point-like elements: if any point is within 12px, pick the
      // closest one instead of whatever came first in board.objects iteration.
      const ptHits  = hits.filter(o => POINT_ELTS.includes(o.elType));
      const best = ptHits.length > 0 ? ptHits[0] : hits[0];
      if (best) {
        handleObjectClick(best);
        objectClickedRef.current = true; // prevent container mousedown from clearing selection
      } else {
        objectClickedRef.current = false; // no object hit — allow single-click deselect
      }
    });

    // Board-level double-click → open Properties dialog for element under cursor
    board.containerObj?.addEventListener('dblclick', (evt: MouseEvent) => {
      if (toolRef.current !== 'selection') return;
      const rect = (board.containerObj as HTMLElement).getBoundingClientRect();
      const sx = evt.clientX - rect.left;
      const sy = evt.clientY - rect.top;
      const DBLCLICK_TYPES = [...POINT_ELTS,
                              'line', 'segment', 'ray', 'parallel', 'perpendicular', 'bisector',
                              'circle', 'arc', 'text'];
      const hits = findObjectsAt(board, sx, sy, DBLCLICK_TYPES, 15);
      const ptHits = hits.filter(o => POINT_ELTS.includes(o.elType));
      const best = ptHits.length > 0 ? ptHits[0] : hits[0];
      if (best) {
        if (POINT_ELTS.includes(best.elType)) {
          const name = best.name || best.id;
          marksRef.current.center = { id: best.id, name };
          onNotifyRef.current?.(`Đã đánh dấu tâm: ${name}`);
        } else if (['line', 'segment', 'ray', 'parallel', 'perpendicular', 'bisector'].includes(best.elType)) {
          const name = best.name || best.id;
          marksRef.current.mirror = { id: best.id, name };
          onNotifyRef.current?.(`Đã đánh dấu trục đối xứng: ${name}`);
        }
        onOpenPropertiesRef.current?.(toSelectedInfo(best));
      }
    });
  }

  // ─── Selection helpers ────────────────────────────────────────────────────
  // Visual decoration is handled by the SVG overlay (selDecorations state);
  // highlightObj kept as no-op for any remaining callsites.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function highlightObj(_obj: any, _on: boolean) { /**/ }

  function clearSelection() {
    selectedRef.current = [];
    onSelectionChange([]);
    setSelDecorations([]);
  }

  // Click toggles the object in/out of selection (no Shift required).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleObjectClick(obj: any) {
    const idx = selectedRef.current.indexOf(obj);
    if (idx === -1) {
      selectedRef.current.push(obj);
    } else {
      selectedRef.current.splice(idx, 1);
    }
    // Decorations updated by the interval loop; fire immediately too
    setSelDecorations(computeDecorations(selectedRef.current, boardRef.current));
    onSelectionChange(selectedRef.current.map(toSelectedInfo));
  }

  // ─── Point creation ────────────────────────────────────────────────────────
  // Creates a new point at (x, y). If near an existing point, snaps to it.
  // If near a curve (circle/line/segment), creates a glider constrained to that curve.
  function createOrSnapPoint(
    x: number, y: number, sx: number, sy: number,
    namePt = true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): any {
    const board = boardRef.current!;

    // Priority 1: snap to an existing point
    const snap = findSnapPoint(board, sx, sy);
    if (snap) return snap;

    const name = namePt ? nextPointName() : '';
    const id   = `pt_${_elIdx++}`;
    const ptAttrs = {
      id, name, size: 4, face: 'o' as const,
      strokeColor: '#1e3c96', fillColor: '#1e3c96',
      highlightStrokeColor: '#c83c3c', highlightFillColor: '#c83c3c',
      label: { fontSize: 14, strokeColor: '#1e3c96' },
    };

    // Priority 2: snap to a nearby curve → create a glider (point constrained to curve)
    const snapC = findSnapCurve(board, sx, sy);
    if (snapC) {
      const pt = board.create('glider', [x, y, snapC.obj], ptAttrs);
      elementsRef.current.push({
        type: 'glider', id,
        parents: [x, y, snapC.obj.id],
        attrs: { name, size: 4, strokeColor: '#1e3c96', fillColor: '#1e3c96' },
      });
      return pt;
    }

    // Priority 3: free point
    const pt = board.create('point', [x, y], ptAttrs);
    elementsRef.current.push({
      type: 'point', id, parents: [x, y],
      attrs: { name, size: 4, strokeColor: '#1e3c96', fillColor: '#1e3c96' },
    });
    return pt;
  }

  // ─── Ghost (preview) element helpers ──────────────────────────────────────
  function removeGhost() {
    const g = pendingRef.current.ghostEl;
    if (g) {
      try { boardRef.current?.removeObject(g); } catch { /* ignore */ }
      pendingRef.current.ghostEl = undefined;
    }
  }

  // ─── Cancel current pending tool sequence ─────────────────────────────────
  function cancelTool() {
    removeGhost();
    // Remove ghost poly lines
    const pl = pendingRef.current.polyLines ?? [];
    pl.forEach(l => { try { boardRef.current?.removeObject(l); } catch { /**/ } });
    // Unhighlight first object in multi-click construct modes
    if (pendingRef.current.obj1) {
      try { highlightObj(pendingRef.current.obj1, false); } catch { /**/ }
    }
    if (pendingRef.current.pt1) {
      try { highlightObj(pendingRef.current.pt1, false); } catch { /**/ }
    }
    pendingRef.current = { phase: 'idle' };
    sliderPosRef.current = null;
    setSnapPos(null);
  }

  // ─── Tool interaction: overlay click ──────────────────────────────────────
  function handleOverlayClick(evt: React.MouseEvent<HTMLDivElement>) {
    const board = boardRef.current;
    const canvas = containerRef.current;
    if (!board || !canvas) return;
    const { x, y, sx, sy } = eventToCoords(board, canvas, evt as unknown as MouseEvent);
    const curTool = toolRef.current;

    if (curTool === 'point') {
      saveSnapshot();
      createOrSnapPoint(x, y, sx, sy);
      onDirty();
      return;
    }

    if (curTool === 'segment' || curTool === 'ray' || curTool === 'line') {
      const p = pendingRef.current;
      if (p.phase === 'idle') {
        const pt1 = createOrSnapPoint(x, y, sx, sy);
        removeGhost();
        // Create ghost preview
        const ghost = board.create('line', [pt1, [x, y]], {
          id: 'ghost_line',
          strokeColor: '#1e3c96',
          strokeWidth: 1,
          dash: 2,
          straightFirst: curTool === 'line',
          straightLast:  curTool === 'line' || curTool === 'ray',
          withLabel: false,
          fixed: true,
        });
        pendingRef.current = { phase: 'pt2', pt1, ghostEl: ghost };
      } else if (p.phase === 'pt2' && p.pt1) {
        saveSnapshot();
        const pt2 = createOrSnapPoint(x, y, sx, sy);
        removeGhost();
        const straight = curTool === 'line';
        const isRay    = curTool === 'ray';
        const jxgType  = straight || isRay ? 'line' : 'segment';
        const id = nextElId(straight ? 'ln' : isRay ? 'ray' : 'seg');
        const attrs: Record<string, unknown> = {
          strokeColor: '#1e3c96', strokeWidth: 2,
          straightFirst: straight,
          straightLast:  straight || isRay,
          withLabel: false,
        };
        board.create(jxgType, [p.pt1, pt2], { id, ...attrs });
        const el: HeyGeoElement = {
          type: curTool,  // 'segment', 'ray', or 'line' — preserve exact tool type
          id,
          parents: [p.pt1.id, pt2.id],
          attrs,
        };
        elementsRef.current.push(el);
        pendingRef.current = { phase: 'idle' };
        onDirty();
      }
      return;
    }

    if (curTool === 'compass') {
      const p = pendingRef.current;
      if (p.phase === 'idle') {
        const centre = createOrSnapPoint(x, y, sx, sy);
        const ghost = board.create('circle', [centre, 0.01], {
          id: 'ghost_circle',
          strokeColor: '#1e3c96', strokeWidth: 1, dash: 2,
          fillColor: 'none', withLabel: false, fixed: true,
        });
        pendingRef.current = { phase: 'pt2', pt1: centre, ghostEl: ghost };
      } else if (p.phase === 'pt2' && p.pt1) {
        saveSnapshot();
        const radiusPt = createOrSnapPoint(x, y, sx, sy);
        removeGhost();
        const id = nextElId('circ');
        const attrs: Record<string, unknown> = {
          strokeColor: '#1e3c96', strokeWidth: 2,
          fillColor: 'none', withLabel: false,
        };
        board.create('circle', [p.pt1, radiusPt], { id, ...attrs });
        const el: HeyGeoElement = {
          type: 'circle', id,
          parents: [p.pt1.id, radiusPt.id],
          attrs,
        };
        elementsRef.current.push(el);
        pendingRef.current = { phase: 'idle' };
        onDirty();
      }
      return;
    }

    if (curTool === 'arc') {
      const p = pendingRef.current;
      if (p.phase === 'idle') {
        const centre = createOrSnapPoint(x, y, sx, sy);
        const ghost = board.create('circle', [centre, 0.01], {
          id: 'ghost_arc',
          strokeColor: '#1e3c96', strokeWidth: 1, dash: 2,
          fillColor: 'none', withLabel: false, fixed: true,
        });
        pendingRef.current = { phase: 'pt2', pt1: centre, ghostEl: ghost };
      } else if (p.phase === 'pt2' && p.pt1) {
        const startPt = createOrSnapPoint(x, y, sx, sy);
        removeGhost();
        pendingRef.current = { phase: 'pt3', pt1: p.pt1, pt2: startPt };
      } else if (p.phase === 'pt3' && p.pt1 && p.pt2) {
        saveSnapshot();
        const endPt = createOrSnapPoint(x, y, sx, sy);
        const id = nextElId('arc');
        const attrs: Record<string, unknown> = {
          strokeColor: '#1e3c96', strokeWidth: 2, withLabel: false,
        };
        board.create('arc', [p.pt1, p.pt2, endPt], { id, ...attrs });
        elementsRef.current.push({
          type: 'arc', id,
          parents: [p.pt1.id, p.pt2.id, endPt.id],
          attrs,
        });
        pendingRef.current = { phase: 'idle' };
        onDirty();
      }
      return;
    }

    // ── Point on object ──────────────────────────────────────────────────────
    // Only creates a glider on a curve – ignores clicks on empty space.
    if (curTool === 'point_on_object') {
      const snapC = findSnapCurve(board, sx, sy);
      if (snapC) {
        saveSnapshot();
        const name = nextPointName();
        const id   = `pt_${_elIdx++}`;
        board.create('glider', [x, y, snapC.obj], {
          id, name, size: 4, face: 'o' as const,
          strokeColor: '#1e3c96', fillColor: '#1e3c96',
          highlightStrokeColor: '#c83c3c', highlightFillColor: '#c83c3c',
          label: { fontSize: 14, strokeColor: '#1e3c96' },
        });
        elementsRef.current.push({
          type: 'glider', id,
          parents: [x, y, snapC.obj.id],
          attrs: { name, size: 4, strokeColor: '#1e3c96', fillColor: '#1e3c96' },
        });
        board.update();
        onDirty();
      }
      return;
    }

    // ── Circle center ───────────────────────────────────────────────────────
    // Click on a circle/arc → reveal/create its center as a named point.
    if (curTool === 'circle_center') {
      const circles = findObjectsAt(board, sx, sy, ['circle', 'arc']);
      const circ = circles[0];
      if (circ) {
        saveSnapshot();
        // For compass circles the center IS an existing point (circ.center or circ.point1)
        const centerPt = circ.center ?? circ.point1;
        if (centerPt) {
          const name = nextPointName();
          centerPt.setAttribute({
            visible: true, name,
            size: 4, strokeColor: '#c83c3c', fillColor: '#c83c3c',
            label: { fontSize: 14, strokeColor: '#c83c3c' },
          });
          // Ensure the center point is recorded in elementsRef
          const existing = elementsRef.current.find(e => e.id === centerPt.id);
          if (existing) {
            existing.attrs.visible = true;
            existing.attrs.name    = name;
          } else {
            elementsRef.current.push({
              type: 'point', id: centerPt.id,
              parents: [centerPt.X(), centerPt.Y()],
              attrs: { name, visible: true, size: 4,
                       strokeColor: '#c83c3c', fillColor: '#c83c3c' },
            });
          }
          board.update();
          onDirty();
        }
      }
      return;
    }

    // ── Interactive midpoint ─────────────────────────────────────────────────
    // Phase 1 – click segment → immediate midpoint
    //         – click point   → wait for second point
    // Phase 2 – click second point → midpoint between them
    if (curTool === 'midpoint') {
      const p = pendingRef.current;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function makeMidpoint(a: any, b: any) {
        saveSnapshot();
        const id   = nextElId('mid');
        const name = nextPointName();
        try {
          board.create('midpoint', [a, b], {
            id, name, size: 4,
            strokeColor: '#c83c3c', fillColor: '#c83c3c',
            highlightStrokeColor: '#c83c3c', highlightFillColor: '#c83c3c',
            label: { fontSize: 14, strokeColor: '#c83c3c' },
          });
          elementsRef.current.push({
            type: 'midpoint', id,
            parents: [a.id, b.id],
            attrs: { name, size: 4, strokeColor: '#c83c3c', fillColor: '#c83c3c' },
          });
          onDirty();
        } catch { /**/ }
      }

      if (p.phase === 'idle') {
        // Try segment/line first
        const segs = findObjectsAt(board, sx, sy, ['segment', 'line']);
        if (segs.length > 0) {
          const seg = segs[0];
          makeMidpoint(seg.point1, seg.point2);
          return;
        }
        // Try point → phase 2
        const pts = findObjectsAt(board, sx, sy, ['point']);
        if (pts.length > 0) {
          highlightObj(pts[0], true);
          pendingRef.current = { phase: 'pt2', pt1: pts[0] };
        }
      } else if (p.phase === 'pt2' && p.pt1) {
        const pts = findObjectsAt(board, sx, sy, ['point']);
        const pt2 = pts.find((o) => o !== p.pt1);
        if (pt2) {
          highlightObj(p.pt1, false);
          makeMidpoint(p.pt1, pt2);
          pendingRef.current = { phase: 'idle' };
        }
      }
      return;
    }

    // ── Interactive intersection ──────────────────────────────────────────────
    // Phase 1 – click first line/circle → highlight
    // Phase 2 – click second → create intersection point(s)
    if (curTool === 'intersection') {
      const p = pendingRef.current;
      const geoObjs = findObjectsAt(board, sx, sy,
        ['line', 'segment', 'ray', 'circle', 'arc']);
      const geoObj = geoObjs[0];
      if (!geoObj) return;

      if (p.phase === 'idle') {
        highlightObj(geoObj, true);
        pendingRef.current = { phase: 'pt2', obj1: geoObj };
      } else if (p.phase === 'pt2' && p.obj1) {
        if (geoObj === p.obj1) return; // same object clicked again
        highlightObj(p.obj1, false);
        saveSnapshot();
        const obj1 = p.obj1;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        function createIntPt(idx: number): boolean {
          const id   = nextElId('int');
          const name = nextPointName();
          try {
            board.create('intersection', [obj1, geoObj, idx], {
              id, name, size: 4,
              strokeColor: '#c83c3c', fillColor: '#c83c3c',
              highlightStrokeColor: '#c83c3c', highlightFillColor: '#c83c3c',
              label: { fontSize: 14, strokeColor: '#c83c3c' },
            });
            elementsRef.current.push({
              type: 'intersection', id,
              parents: [obj1.id, geoObj.id, idx],
              attrs: { name, size: 4, strokeColor: '#c83c3c', fillColor: '#c83c3c' },
            });
            return true;
          } catch { return false; }
        }

        const ok = createIntPt(0);
        // For circle+circle or line+circle: also attempt 2nd intersection
        const hasCircle =
          ['circle', 'arc'].includes(obj1.elType) ||
          ['circle', 'arc'].includes(geoObj.elType);
        if (ok && hasCircle) createIntPt(1);

        pendingRef.current = { phase: 'idle' };
        onDirty();
      }
      return;
    }

    if (curTool === 'polygon' || curTool === 'polygon_filled' || curTool === 'polygon_open') {      const p = pendingRef.current;
      const verts = p.polyVerts ?? [];
      const lines = p.polyLines ?? [];
      const pt = createOrSnapPoint(x, y, sx, sy);
      if (verts.length > 0) {
        // Preview edge from last vertex to new
        const ghostLine = board.create('segment', [verts[verts.length - 1], pt], {
          id: `ghost_pe_${verts.length}`,
          strokeColor: '#1e3c96', strokeWidth: 1, dash: 2, withLabel: false,
        });
        lines.push(ghostLine);
      }
      verts.push(pt);
      pendingRef.current = { phase: 'polygon', polyVerts: verts, polyLines: lines };
      return;
    }

    if (curTool === 'slider') {
      handleSliderClick(x, y);
      return;
    }
  }

  // ─── Double-click: finish polygon ─────────────────────────────────────────
  function handleOverlayDblClick() {
    const p = pendingRef.current;
    const curTool = toolRef.current;
    if (
      (curTool === 'polygon' || curTool === 'polygon_filled' || curTool === 'polygon_open') &&
      p.phase === 'polygon' &&
      (p.polyVerts?.length ?? 0) >= 2
    ) {
      saveSnapshot();
      const board = boardRef.current!;
      // Remove all ghost lines
      (p.polyLines ?? []).forEach(l => {
        try { board.removeObject(l); } catch { /**/ }
      });
      const verts = p.polyVerts!;
      const open  = curTool === 'polygon_open';
      const filled = curTool === 'polygon_filled';
      const id = nextElId(open ? 'pl' : 'pg');

      if (open) {
        // Polyline = chain of segments
        for (let i = 0; i < verts.length - 1; i++) {
          const segId = `${id}_s${i}`;
          board.create('segment', [verts[i], verts[i + 1]], {
            id: segId, strokeColor: '#1e3c96', strokeWidth: 2, withLabel: false,
          });
          elementsRef.current.push({
            type: 'segment', id: segId,
            parents: [verts[i].id, verts[i + 1].id],
            attrs: { strokeColor: '#1e3c96', strokeWidth: 2, withLabel: false },
          });
        }
      } else {
        const attrs: Record<string, unknown> = {
          strokeColor: '#1e3c96', strokeWidth: 2,
          fillColor: filled ? '#1e3c9622' : 'none',
          withLabel: false, borders: { withLabel: false },
        };
        board.create('polygon', verts, { id, ...attrs });
        elementsRef.current.push({
          type: 'polygon', id,
          parents: verts.map((v: { id: string }) => v.id),
          attrs,
        });
      }

      pendingRef.current = { phase: 'idle' };
      onDirty();
    }
  }

  // ─── Slider tool handler (part of handleOverlayClick) ─────────────────────
  function handleSliderClick(x: number, y: number) {
    const p = pendingRef.current;
    if (p.phase === 'idle') {
      // First click: record start point
      pendingRef.current = { phase: 'slider_pt2', rawPt1: { x, y } };
    } else if (p.phase === 'slider_pt2' && p.rawPt1) {
      // Second click: open config dialog
      const pos: SliderPos = { x1: p.rawPt1.x, y1: p.rawPt1.y, x2: x, y2: y };
      sliderPosRef.current = pos;
      onOpenSliderConfigRef.current?.(pos);
      // Keep phase = slider_pt2 until dialog confirms/cancels
    }
  }

  // ─── Mousemove: move ghost element ────────────────────────────────────────
  function handleOverlayMove(evt: React.MouseEvent<HTMLDivElement>) {
    const board = boardRef.current;
    const canvas = containerRef.current;
    if (!board || !canvas) return;
    const { x, y, sx, sy } = eventToCoords(board, canvas, evt as unknown as MouseEvent);
    onCursorMove({ x, y });

    // ── Snap indicator ────────────────────────────────────────────────────────
    const snap = findSnapPoint(board, sx, sy);
    if (snap?.coords?.scrCoords) {
      const sc = snap.coords.scrCoords;
      setSnapPos({ sx: sc[1], sy: sc[2], type: 'point' });
    } else {
      // Show curve snap indicator when cursor is near a circle/line/segment
      const snapC = findSnapCurve(board, sx, sy);
      if (snapC && toolRef.current !== 'selection') {
        setSnapPos({ sx: snapC.projSx, sy: snapC.projSy, type: 'curve' });
      } else {
        setSnapPos(null);
      }
    }

    const p = pendingRef.current;
    const curTool = toolRef.current;

    if (
      (curTool === 'segment' || curTool === 'ray' || curTool === 'line') &&
      p.phase === 'pt2' && p.ghostEl
    ) {
      try {
        p.ghostEl.point2.moveTo([x, y]);
        board.update();
      } catch { /**/ }
    }

    if ((curTool === 'compass' || curTool === 'arc') && p.phase === 'pt2' && p.pt1 && p.ghostEl) {
      try {
        const dx = x - p.pt1.X();
        const dy = y - p.pt1.Y();
        const r  = Math.sqrt(dx * dx + dy * dy);
        p.ghostEl.setRadius(r);
        board.update();
      } catch { /**/ }
    }
  }

  // ─── Key handler (Escape = cancel, Delete = remove selected) ──────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') cancelTool();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Init board on JSXGraph load ─────────────────────────────────────────
  function initBoard() {
    if (boardRef.current) return;
    resetCounters();
    const board = jxg().JSXGraph.initBoard(BOARD_ID, {
      boundingbox: [-8, 8, 8, -8],
      // Axes and grid are always created because JSXGraph cannot bring hidden
      // ones back; setSceneChrome then applies what the document asks for.
      axis: true,
      grid: true,
      showCopyright: false,
      showNavigation: true,
      keepaspectratio: true,
      resize: { enabled: true, throttle: 50 },
      pan:  { enabled: false },
      zoom: { wheel: true, min: 0.1, max: 50 },
    });
    boardRef.current = board;
    attachBoardEvents(board);

    setSceneChrome(board, metaRef.current);

    if (initialData) {
      metaRef.current = {
        title: initialData.title ?? 'Chưa đặt tên',
        axis:  initialData.axis  ?? true,
        grid:  initialData.grid  ?? false,
      };
      const { loaded, errors } = loadDataToBoard(board, initialData);
      elementsRef.current = loaded;
      reportLoadErrors(errors);
      setSceneChrome(board, metaRef.current);
    }
  }

  // Load the self-hosted engine (already-in-memory JXG resolves immediately)
  useEffect(() => {
    let cancelled = false;
    whenJsxGraphReady()
      .then(() => { if (!cancelled) setJxgLoaded(true); })
      .catch(() => {
        if (!cancelled) onNotifyRef.current?.('Không tải được engine JSXGraph. Kiểm tra kết nối mạng.');
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (jxgLoaded) initBoard();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jxgLoaded]);

  // ─── ResizeObserver: keep JSXGraph dimensions correct on window/layout resize ──
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => {
      const board = boardRef.current;
      if (!board) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 0 && h > 0) {
        try {
          board.resizeContainer(w, h, true);
          board.update();
        } catch { /**/ }
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // ─── Transformation engine ────────────────────────────────────────────────
  /**
   * Copy the selection through one map. `image` is the declarative description
   * of that map, so the document stores data and the board gets the closures
   * transforms.ts builds from it — the same pair for every reload.
   */
  function executeTransform(image: ImageSpec): boolean {
    const board = boardRef.current;
    if (!board) return false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sel: any[] = selectedRef.current;
    if (sel.length === 0) {
      onNotifyRef.current?.('Hãy chọn các đối tượng cần biến hình.');
      return false;
    }

    // 1. Gather all unique points that need to be transformed
    const basePoints = gatherSelectionPoints(sel);

    if (basePoints.length === 0) {
      onNotifyRef.current?.('Không tìm thấy đối tượng nào có thể biến hình.');
      return false;
    }

    saveSnapshot();

    // 2. Create transformed points
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transformedPts = new Map<string, any>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newObjects: any[] = [];

    basePoints.forEach((origPt) => {
      const [fnX, fnY] = imageClosures(board, origPt.id, image);
      const newId = nextElId('pt');
      const baseName = origPt.name ? `${origPt.name}'` : '';
      const ptAttrs = {
        id: newId,
        name: baseName,
        size: origPt.visProp?.size ?? 4,
        strokeColor: origPt.visProp?.strokecolor ?? '#1e3c96',
        fillColor: origPt.visProp?.fillcolor ?? '#1e3c96',
        highlightStrokeColor: '#c83c3c',
        highlightFillColor: '#c83c3c',
        withLabel: !!baseName,
        label: { fontSize: 14, strokeColor: origPt.visProp?.strokecolor ?? '#1e3c96' },
      };

      const newPt = board.create('point', [fnX, fnY], ptAttrs);
      transformedPts.set(origPt.id, newPt);
      elementsRef.current.push({
        type: 'point',
        id: newId,
        parents: [origPt.id],
        attrs: { ...ptAttrs, image },
      });
      newObjects.push(newPt);
    });

    // 3. Create transformed higher-order elements
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sel.forEach((o: any) => {
      if (['segment', 'line', 'ray'].includes(o.elType)) {
        const p1 = transformedPts.get(o.point1?.id);
        const p2 = transformedPts.get(o.point2?.id);
        if (p1 && p2) {
          const isRay = o.elType === 'ray';
          const isLine = o.elType === 'line';
          const prefix = isLine ? 'ln' : isRay ? 'ray' : 'seg';
          const newId = nextElId(prefix);
          const attrs = {
            id: newId,
            strokeColor: o.visProp?.strokecolor ?? '#000000',
            strokeWidth: o.visProp?.strokewidth ?? 2,
            dash: o.visProp?.dash ?? 0,
            straightFirst: isLine,
            straightLast: isLine || isRay,
          };
          const newCurve = board.create('line', [p1, p2], attrs);
          elementsRef.current.push({
            type: isRay ? 'ray' : isLine ? 'line' : 'segment',
            id: newId,
            parents: [p1.id, p2.id],
            attrs: { ...attrs },
          });
          newObjects.push(newCurve);
        }
      } else if (o.elType === 'circle') {
        const c = transformedPts.get((o.center ?? o.point1)?.id);
        const p2 = transformedPts.get(o.point2?.id);
        if (c && p2) {
          const newId = nextElId('circ');
          const attrs = {
            id: newId,
            strokeColor: o.visProp?.strokecolor ?? '#000000',
            strokeWidth: o.visProp?.strokewidth ?? 2,
            dash: o.visProp?.dash ?? 0,
          };
          const newCirc = board.create('circle', [c, p2], attrs);
          elementsRef.current.push({
            type: 'circle',
            id: newId,
            parents: [c.id, p2.id],
            attrs: { ...attrs },
          });
          newObjects.push(newCirc);
        }
      } else if (o.elType === 'polygon') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const verts: any[] = (o.vertices ?? [])
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((v: any) => transformedPts.get(v?.id))
          .filter(Boolean);
        if (verts.length >= 3) {
          const newId = nextElId('pg');
          const attrs = {
            id: newId,
            fillColor: o.visProp?.fillcolor ?? '#3b82f6',
            fillOpacity: o.visProp?.fillopacity ?? 0.2,
            strokeColor: o.visProp?.strokecolor ?? '#1d4ed8',
            strokeWidth: o.visProp?.strokewidth ?? 2,
          };
          const newPoly = board.create('polygon', verts, attrs);
          elementsRef.current.push({
            type: 'polygon',
            id: newId,
            parents: verts.map((v: any) => v.id),
            attrs: { ...attrs },
          });
          newObjects.push(newPoly);
        }
      }
    });

    // 4. Update selection to newly created objects
    selectedRef.current = newObjects;
    onSelectionChange(newObjects.map(toSelectedInfo));
    setSelDecorations(computeDecorations(newObjects, board));
    board.update();
    onDirty();
    return true;
  }

  // ─── Imperative handle ────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    getHeyGeoData: () => {
      const board = boardRef.current!;
      syncPositions(elementsRef.current, board);
      return boardToData(board, metaRef.current, elementsRef.current);
    },

    loadData: (data: HeyGeoData) => {
      resetCounters();
      clearHistory(undoStack.current, redoStack.current);
      dragBaseRef.current = null;
      metaRef.current = { title: data.title, axis: data.axis ?? true, grid: data.grid ?? false };
      rebuildBoard(data.elements);
    },

    undo: () => {
      if (undoStack.current.length === 0) return;
      pushCapped(redoStack.current, currentScene());
      restoreScene(undoStack.current.pop()!);
    },

    redo: () => {
      if (redoStack.current.length === 0) return;
      pushCapped(undoStack.current, currentScene());
      restoreScene(redoStack.current.pop()!);
    },

    canUndo: () => undoStack.current.length > 0,
    canRedo: () => redoStack.current.length > 0,

    deleteSelected: () => {
      const board = boardRef.current;
      if (!board || selectedRef.current.length === 0) return;
      saveSnapshot();
      // JSXGraph removes an element with everything built from it, so the
      // document has to drop the same set or it drifts from the board.
      const doomed = withDependents(
        elementsRef.current,
        selectedRef.current.map((o: { id: string }) => o.id),
      );
      [...elementsRef.current].reverse()
        .filter(e => doomed.has(e.id))
        .forEach(e => { try { board.removeObject(board.objects[e.id]); } catch { /**/ } });
      elementsRef.current = elementsRef.current.filter(e => !doomed.has(e.id));
      selectedRef.current = [];
      onSelectionChange([]);
      setSelDecorations([]);
      onDirty();
    },

    selectAll: () => {
      clearSelection();
      const board = boardRef.current;
      if (!board) return;
      const objs = Object.values(board.objects).filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (o: any) => o.elType && o.elType !== 'axis' && o.elType !== 'ticks'
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      selectedRef.current = objs as any[];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      objs.forEach((o: any) => highlightObj(o, true));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onSelectionChange((objs as any[]).map(toSelectedInfo));
    },

    setAxis: (v: boolean) => {
      saveSnapshot();
      metaRef.current.axis = v;
      // Axes are always on the board; only their visibility changes.
      setSceneChrome(boardRef.current, metaRef.current);
      onDirty();
    },

    setGrid: (v: boolean) => {
      saveSnapshot();
      metaRef.current.grid = v;
      setSceneChrome(boardRef.current, metaRef.current);
      onDirty();
    },

    zoomIn:  () => boardRef.current?.zoomIn(0, 0),
    zoomOut: () => boardRef.current?.zoomOut(0, 0),
    zoomFit: () => boardRef.current?.zoomFit(),

    setTitle: (t: string) => { metaRef.current.title = t; },

    updateSelectedColor: (color: string) => {
      saveSnapshot();
      selectedRef.current.forEach((o: { setAttribute: (a: Record<string,unknown>) => void }) => {
        o.setAttribute({ strokeColor: color, fillColor: color });
      });
      boardRef.current?.update();
      // Sync to elements
      const ids = new Set(selectedRef.current.map((o: { id: string }) => o.id));
      elementsRef.current.forEach(e => {
        if (ids.has(e.id)) { e.attrs.strokeColor = color; e.attrs.fillColor = color; }
      });
      onSelectionChange(selectedRef.current.map(toSelectedInfo));
      onDirty();
    },

    updateSelectedStrokeColor: (color: string) => {
      saveSnapshot();
      selectedRef.current.forEach((o: { setAttribute: (a: Record<string,unknown>) => void }) =>
        o.setAttribute({ strokeColor: color }));
      boardRef.current?.update();
      const ids = new Set(selectedRef.current.map((o: { id: string }) => o.id));
      elementsRef.current.forEach(e => { if (ids.has(e.id)) e.attrs.strokeColor = color; });
      onSelectionChange(selectedRef.current.map(toSelectedInfo));
      onDirty();
    },

    updateSelectedFillColor: (color: string) => {
      saveSnapshot();
      selectedRef.current.forEach((o: { setAttribute: (a: Record<string,unknown>) => void }) =>
        o.setAttribute({ fillColor: color }));
      boardRef.current?.update();
      const ids = new Set(selectedRef.current.map((o: { id: string }) => o.id));
      elementsRef.current.forEach(e => { if (ids.has(e.id)) e.attrs.fillColor = color; });
      onSelectionChange(selectedRef.current.map(toSelectedInfo));
      onDirty();
    },

    updateSelectedFillOpacity: (opacity: number) => {
      saveSnapshot();
      selectedRef.current.forEach((o: { setAttribute: (a: Record<string,unknown>) => void }) =>
        o.setAttribute({ fillOpacity: opacity }));
      boardRef.current?.update();
      const ids = new Set(selectedRef.current.map((o: { id: string }) => o.id));
      elementsRef.current.forEach(e => { if (ids.has(e.id)) e.attrs.fillOpacity = opacity; });
      onSelectionChange(selectedRef.current.map(toSelectedInfo));
      onDirty();
    },

    updateSelectedStrokeWidth: (w: number) => {
      saveSnapshot();
      selectedRef.current.forEach((o: { setAttribute: (a: Record<string,unknown>) => void }) =>
        o.setAttribute({ strokeWidth: w }));
      boardRef.current?.update();
      const ids = new Set(selectedRef.current.map((o: { id: string }) => o.id));
      elementsRef.current.forEach(e => { if (ids.has(e.id)) e.attrs.strokeWidth = w; });
      onSelectionChange(selectedRef.current.map(toSelectedInfo));
      onDirty();
    },

    updateSelectedDash: (d: number) => {
      saveSnapshot();
      selectedRef.current.forEach((o: { setAttribute: (a: Record<string,unknown>) => void }) =>
        o.setAttribute({ dash: d }));
      boardRef.current?.update();
      const ids = new Set(selectedRef.current.map((o: { id: string }) => o.id));
      elementsRef.current.forEach(e => { if (ids.has(e.id)) e.attrs.dash = d; });
      onSelectionChange(selectedRef.current.map(toSelectedInfo));
      onDirty();
    },

    updateSelectedVisible: (v: boolean) => {
      saveSnapshot();
      selectedRef.current.forEach((o: { setAttribute: (a: Record<string,unknown>) => void }) =>
        o.setAttribute({ visible: v }));
      boardRef.current?.update();
      const ids = new Set(selectedRef.current.map((o: { id: string }) => o.id));
      elementsRef.current.forEach(e => { if (ids.has(e.id)) e.attrs.visible = v; });
      onSelectionChange(selectedRef.current.map(toSelectedInfo));
      onDirty();
    },

    updateSelectedFixed: (f: boolean) => {
      saveSnapshot();
      selectedRef.current.forEach((o: { isDraggable: boolean }) => { o.isDraggable = !f; });
      boardRef.current?.update();
      const ids = new Set(selectedRef.current.map((o: { id: string }) => o.id));
      elementsRef.current.forEach(e => { if (ids.has(e.id)) e.attrs.fixed = f; });
      onSelectionChange(selectedRef.current.map(toSelectedInfo));
      onDirty();
    },

    updateSelectedName: (n: string) => {
      saveSnapshot();
      selectedRef.current.forEach((o: { name: string; setAttribute?: (a: Record<string,unknown>) => void }) => {
        o.name = n;
        o.setAttribute?.({ name: n });
      });
      boardRef.current?.update();
      const ids = new Set(selectedRef.current.map((o: { id: string }) => o.id));
      elementsRef.current.forEach(e => { if (ids.has(e.id)) e.attrs.name = n; });
      onSelectionChange(selectedRef.current.map(toSelectedInfo));
      onDirty();
    },

    updateSelectedCoords: (x: number, y: number) => {
      const board = boardRef.current;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pt = selectedRef.current.find((o: any) => o.elType === 'point');
      if (!board || !pt) return;
      saveSnapshot();
      try {
        pt.moveTo([x, y]);
        board.update();
        const existing = elementsRef.current.find(e => e.id === pt.id);
        if (existing) existing.parents = [x, y];
        onSelectionChange(selectedRef.current.map(toSelectedInfo));
        onDirty();
      } catch { /* ignore */ }
    },

    cancelCurrentTool: cancelTool,

    confirmSlider: (cfg: SliderConfig) => {
      const board = boardRef.current;
      if (!board) return;
      const pos = sliderPosRef.current;
      if (!pos) return;
      saveSnapshot();
      const id = nextElId('sl');
      const attrs: Record<string, unknown> = {
        name: cfg.name,
        snapWidth: cfg.step,
        withTicks: true,
        withLabel: true,
        strokeColor: '#1e3c96',
        fillColor: '#1e3c96',
        label: { fontSize: 14, strokeColor: '#1e3c96' },
      };
      board.create('slider',
        [[pos.x1, pos.y1], [pos.x2, pos.y2], [cfg.min, cfg.init, cfg.max]],
        { id, ...attrs }
      );
      elementsRef.current.push({
        type: 'slider', id,
        parents: [
          [pos.x1, pos.y1] as (number | null)[],
          [pos.x2, pos.y2] as (number | null)[],
          [cfg.min, cfg.init, cfg.max] as (number | null)[],
        ],
        attrs: { ...attrs },
      });
      sliderPosRef.current = null;
      pendingRef.current = { phase: 'idle' };
      board.update();
      onDirty();
    },

    startAnimation: (id: string) => {
      const board = boardRef.current;
      if (!board) return;
      const obj = board.objects[id];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (obj && typeof (obj as any).startAnimation === 'function') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (obj as any).startAnimation(1, 3, 40);
        board.update();
      }
    },

    stopAnimation: (id: string) => {
      const board = boardRef.current;
      if (!board) return;
      const obj = board.objects[id];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (obj && typeof (obj as any).stopAnimation === 'function') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (obj as any).stopAnimation();
        board.update();
      }
    },

    createLocus: (): import('./designTypes').LocusResult => {
      const board = boardRef.current;
      if (!board) return { ok: false, reason: 'need_2_items' };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sel: any[] = selectedRef.current;
      if (sel.length < 2) return { ok: false, reason: 'need_2_items' };

      // Driver must be a glider (OBJECT_TYPE_GLIDER)
      const glider = sel.find((o: any) => o.elType === 'glider');
      if (!glider) return { ok: false, reason: 'no_glider' };

      const TRACE_POINT_TYPES = ['point', 'glider', 'midpoint', 'intersection', 'slider'];
      const TRACE_LINE_TYPES  = ['line', 'segment', 'ray'];

      const tracePoint = sel.find((o: any) => o !== glider && TRACE_POINT_TYPES.includes(o.elType));
      const traceLine  = sel.find((o: any) => o !== glider && TRACE_LINE_TYPES.includes(o.elType));

      if (!tracePoint && !traceLine) return { ok: false, reason: 'no_trace' };

      const baseAttrs = {
        strokeColor: '#c83c3c', strokeWidth: 1.5,
        withLabel: false, numberpoints: 300,
        highlight: false,
      };

      const specs: HeyGeoElement[] = [];
      if (tracePoint) {
        const id = nextElId('lc');
        specs.push({ type: 'tracecurve', id, parents: [glider.id, tracePoint.id], attrs: { ...baseAttrs } });
      } else if (traceLine) {
        // Locus of a line: trace its two defining points
        const lineAttrs = { ...baseAttrs, dash: 1 };
        specs.push(
          { type: 'tracecurve', id: nextElId('lc'), parents: [glider.id, traceLine.point1.id], attrs: { ...lineAttrs } },
          { type: 'tracecurve', id: nextElId('lc'), parents: [glider.id, traceLine.point2.id], attrs: { ...lineAttrs } },
        );
      }

      // JSXGraph recurses to stack depth when the traced object does not depend
      // on the driver, so a failed locus must be reported rather than thrown.
      const live: Record<string, unknown> = {};
      for (const o of sel) live[o.id] = o;
      const built: { spec: HeyGeoElement; obj: unknown }[] = [];
      for (const sp of specs) {
        const outcome = createElement(board, sp, live);
        if (!outcome.obj) break;
        live[sp.id!] = outcome.obj;
        built.push({ spec: sp, obj: outcome.obj });
      }
      if (built.length !== specs.length) {
        built.forEach(({ obj }) => board.removeObject(obj as never));
        onNotifyRef.current?.('Không dựng được quỹ tích: điểm được chọn phải phụ thuộc vào điểm dẫn.');
        return { ok: false, reason: 'trace_failed' };
      }
      saveSnapshot();
      built.forEach(({ spec }) => elementsRef.current.push(spec));

      board.update();
      onDirty();
      return { ok: true };
    },

    // ── Construct menu helpers (all operate on currently selected objects – Select-then-act) ──────
    createPointOnObject: () => {
      const board = boardRef.current;
      if (!board) return;
      // Find the first curve-like object in selection
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const curve = selectedRef.current.find((o: any) =>
        ['line', 'segment', 'ray', 'circle', 'arc'].includes(o.elType));
      if (!curve) return;
      saveSnapshot();
      const name = nextPointName();
      const id   = `pt_${_elIdx++}`;
      // Default position: midpoint of segment/line, or angle=0 for circle/arc
      let defaultX = 0, defaultY = 0;
      try {
        if (curve.elType === 'circle') {
          defaultX = curve.center.X() + curve.Radius();
          defaultY = curve.center.Y();
        } else if (curve.elType === 'arc') {
          defaultX = curve.point2.X();
          defaultY = curve.point2.Y();
        } else {
          // segment / line / ray → place at midpoint
          defaultX = (curve.point1.X() + curve.point2.X()) / 2;
          defaultY = (curve.point1.Y() + curve.point2.Y()) / 2;
        }
      } catch { /**/ }
      const ptAttrs = {
        id, name, size: 4, face: 'o' as const,
        strokeColor: '#1e3c96', fillColor: '#1e3c96',
        highlightStrokeColor: '#c83c3c', highlightFillColor: '#c83c3c',
        label: { fontSize: 14, strokeColor: '#1e3c96' },
      };
      try {
        board.create('glider', [defaultX, defaultY, curve], ptAttrs);
        elementsRef.current.push({
          type: 'glider', id,
          parents: [defaultX, defaultY, curve.id],
          attrs: { name, size: 4, strokeColor: '#1e3c96', fillColor: '#1e3c96' },
        });
        board.update();
        onDirty();
      } catch { /**/ }
    },

    createIntersection: () => {
      const board = boardRef.current;
      if (!board || selectedRef.current.length < 2) return;
      saveSnapshot();
      // Find 2 line-like or circle-like objects in selection
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const geoSel = selectedRef.current.filter((o: any) =>
        ['line', 'segment', 'ray', 'circle', 'arc'].includes(o.elType));
      if (geoSel.length < 2) return;
      const [a, b] = geoSel;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function createIntPt(idx: number): boolean {
        const id   = nextElId('int');
        const name = nextPointName();
        try {
          board!.create('intersection', [a, b, idx], {
            id, name, size: 4,
            strokeColor: '#c83c3c', fillColor: '#c83c3c',
            highlightStrokeColor: '#c83c3c', highlightFillColor: '#c83c3c',
            label: { fontSize: 14, strokeColor: '#c83c3c' },
          });
          elementsRef.current.push({
            type: 'intersection', id,
            parents: [a.id, b.id, idx],
            attrs: { name, size: 4, strokeColor: '#c83c3c', fillColor: '#c83c3c' },
          });
          return true;
        } catch { return false; }
      }

      const ok = createIntPt(0);
      const hasCircle =
        ['circle', 'arc'].includes(a.elType) ||
        ['circle', 'arc'].includes(b.elType);
      if (ok && hasCircle) createIntPt(1);
      onDirty();
    },

    createMidpoint: () => {
      const board = boardRef.current;
      if (!board) return;
      const sel = selectedRef.current;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let a: any, b: any;

      if (sel.length >= 2 && sel[0].elType === 'point' && sel[1].elType === 'point') {
        // Two points selected → midpoint between them
        [a, b] = sel;
      } else {
        // Try to find a segment/line in selection
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const seg = sel.find((o: any) => o.elType === 'segment' || o.elType === 'line');
        if (seg) {
          a = seg.point1;
          b = seg.point2;
        }
      }

      if (!a || !b) return;
      saveSnapshot();
      const id   = nextElId('mid');
      const name = nextPointName();
      try {
        board.create('midpoint', [a, b], {
          id, name, size: 4,
          strokeColor: '#c83c3c', fillColor: '#c83c3c',
          highlightStrokeColor: '#c83c3c', highlightFillColor: '#c83c3c',
          label: { fontSize: 14, strokeColor: '#c83c3c' },
        });
        elementsRef.current.push({
          type: 'midpoint', id,
          parents: [a.id, b.id],
          attrs: { name, size: 4, strokeColor: '#c83c3c', fillColor: '#c83c3c' },
        });
        onDirty();
      } catch { /**/ }
    },

    createPerpendicular: () => {
      const board = boardRef.current;
      if (!board || selectedRef.current.length < 2) return;
      saveSnapshot();
      const id = nextElId('perp');
      try {
        board.create('perpendicular', selectedRef.current.slice(0, 2), {
          id, strokeColor: '#1e3c96', strokeWidth: 2,
        });
        elementsRef.current.push({
          type: 'perpendicular', id,
          parents: [selectedRef.current[0].id, selectedRef.current[1].id],
          attrs: {},
        });
        onDirty();
      } catch { /**/ }
    },

    createParallel: () => {
      const board = boardRef.current;
      if (!board || selectedRef.current.length < 2) return;
      saveSnapshot();
      const id = nextElId('par');
      try {
        board.create('parallel', selectedRef.current.slice(0, 2), {
          id, strokeColor: '#1e3c96', strokeWidth: 2,
        });
        elementsRef.current.push({
          type: 'parallel', id,
          parents: [selectedRef.current[0].id, selectedRef.current[1].id],
          attrs: {},
        });
        onDirty();
      } catch { /**/ }
    },

    createBisector: () => {
      const board = boardRef.current;
      if (!board || selectedRef.current.length < 3) return;
      saveSnapshot();
      const id = nextElId('bis');
      try {
        board.create('bisector', selectedRef.current.slice(0, 3), {
          id, strokeColor: '#388e3c', strokeWidth: 1, dash: 2,
        });
        elementsRef.current.push({
          type: 'bisector', id,
          parents: [
            selectedRef.current[0].id,
            selectedRef.current[1].id,
            selectedRef.current[2].id,
          ],
          attrs: {},
        });
        onDirty();
      } catch { /**/ }
    },

    createCenter: () => {
      const board = boardRef.current;
      if (!board) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const circ = selectedRef.current.find((o: any) =>
        o.elType === 'circle' || o.elType === 'arc');
      if (!circ) return;
      saveSnapshot();
      const centerPt = circ.center ?? circ.point1;
      if (!centerPt) return;
      const name = nextPointName();
      centerPt.setAttribute({
        visible: true, name,
        size: 4, strokeColor: '#c83c3c', fillColor: '#c83c3c',
        label: { fontSize: 14, strokeColor: '#c83c3c' },
      });
      const existing = elementsRef.current.find(e => e.id === centerPt.id);
      if (existing) {
        existing.attrs.visible = true;
        existing.attrs.name    = name;
      } else {
        elementsRef.current.push({
          type: 'point', id: centerPt.id,
          parents: [centerPt.X(), centerPt.Y()],
          attrs: { name, visible: true, size: 4,
                   strokeColor: '#c83c3c', fillColor: '#c83c3c' },
        });
      }
      board.update();
      onDirty();
    },

    createEndpoint: () => {
      const board = boardRef.current;
      if (!board) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const seg = selectedRef.current.find((o: any) =>
        o.elType === 'segment' || o.elType === 'line' || o.elType === 'arc');
      if (!seg) return;
      saveSnapshot();
      const pts = [seg.point1, seg.point2].filter(Boolean);
      pts.forEach((pt: { setAttribute: (a: Record<string, unknown>) => void;
                         id: string; X: () => number; Y: () => number; }) => {
        if (!pt) return;
        const name = nextPointName();
        pt.setAttribute({
          visible: true, name,
          size: 4, strokeColor: '#c83c3c', fillColor: '#c83c3c',
          label: { fontSize: 14, strokeColor: '#c83c3c' },
        });
        const existing = elementsRef.current.find(e => e.id === pt.id);
        if (existing) { existing.attrs.visible = true; existing.attrs.name = name; }
        else {
          elementsRef.current.push({
            type: 'point', id: pt.id,
            parents: [pt.X(), pt.Y()],
            attrs: { name, visible: true, size: 4,
                     strokeColor: '#c83c3c', fillColor: '#c83c3c' },
          });
        }
      });
      board.update();
      onDirty();
    },

    measureDistance: () => {
      if (selectedRef.current.length < 2) return;
      saveSnapshot();
      const [a, b] = selectedRef.current;
      addMeasure(nextElId('meas'),
        { op: 'distance', args: [a.id, b.id], label: 'd', precision: 3 },
        { of: [a.id, b.id], dy: 0.5 },
        { strokeColor: '#c83c3c', fontSize: 14, withLabel: false });
    },

    measureLength: () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const seg = selectedRef.current.find((o: any) => o.elType === 'segment' || o.elType === 'line');
      if (!seg) return;
      saveSnapshot();
      addMeasure(nextElId('len'),
        { op: 'length', args: [seg.id], label: 'L', precision: 3 },
        { of: [seg.id], dy: 0.5 },
        { strokeColor: '#c83c3c', fontSize: 14, withLabel: false });
    },

    measureRadius: () => {
      const sel = selectedRef.current.find((o: { elType: string }) => o.elType === 'circle');
      if (!sel) return;
      saveSnapshot();
      addMeasure(nextElId('meas'),
        { op: 'radius', args: [sel.id], label: 'r', precision: 3 },
        { of: [sel.id], radiusFactor: 1.1 },
        { strokeColor: '#c83c3c', fontSize: 14 });
    },
    measureAngle: () => {
      const board = boardRef.current;
      if (!board || selectedRef.current.length < 3) return;
      saveSnapshot();
      const [a, v, b] = selectedRef.current;
      const id = nextElId('ang');
      try {
        board.create('angle', [a, v, b], { id, strokeColor: '#c83c3c', withLabel: true });
        elementsRef.current.push({
          type: 'angle', id, parents: [a.id, v.id, b.id], attrs: {},
        });
        onDirty();
      } catch { /**/ }
    },
    measureArea: () => {
      const poly = selectedRef.current.find((o: { elType: string }) => o.elType === 'polygon');
      if (!poly) return;
      saveSnapshot();
      addMeasure(nextElId('meas'),
        { op: 'area', args: [poly.id], label: 'A', precision: 3 },
        { of: [poly.id] },
        { strokeColor: '#c83c3c', fontSize: 14 });
    },

    // ── Transform menu & marks ───────────────────────────────────────────────
    markCenter: () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pt = selectedRef.current.find((o: any) => POINT_ELTS.includes(o.elType));
      if (!pt) {
        onNotifyRef.current?.('Hãy chọn một điểm để đánh dấu làm tâm.');
        return null;
      }
      const name = pt.name || pt.id;
      marksRef.current.center = { id: pt.id, name };
      onNotifyRef.current?.(`Đã đánh dấu tâm: ${name}`);
      return name;
    },

    markMirror: () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const line = selectedRef.current.find((o: any) =>
        ['line', 'segment', 'ray', 'parallel', 'perpendicular', 'bisector'].includes(o.elType));
      if (!line) {
        onNotifyRef.current?.('Hãy chọn một đường thẳng hoặc đoạn thẳng để đánh dấu làm trục đối xứng.');
        return null;
      }
      const name = line.name || line.id;
      marksRef.current.mirror = { id: line.id, name };
      onNotifyRef.current?.(`Đã đánh dấu trục đối xứng: ${name}`);
      return name;
    },

    markVector: () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pts = selectedRef.current.filter((o: any) => POINT_ELTS.includes(o.elType));
      if (pts.length >= 2) {
        const from = pts[0], to = pts[1];
        const fromName = from.name || 'P1', toName = to.name || 'P2';
        marksRef.current.vector = { fromId: from.id, fromName, toId: to.id, toName };
        onNotifyRef.current?.(`Đã đánh dấu vectơ: ${fromName}${toName}`);
        return `${fromName}${toName}`;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const seg = selectedRef.current.find((o: any) => o.elType === 'segment');
      if (seg && seg.point1 && seg.point2) {
        const from = seg.point1, to = seg.point2;
        const fromName = from.name || 'P1', toName = to.name || 'P2';
        marksRef.current.vector = { fromId: from.id, fromName, toId: to.id, toName };
        onNotifyRef.current?.(`Đã đánh dấu vectơ: ${fromName}${toName}`);
        return `${fromName}${toName}`;
      }
      onNotifyRef.current?.('Hãy chọn 2 điểm hoặc 1 đoạn thẳng để đánh dấu vectơ.');
      return null;
    },

    markAngle: () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pts = selectedRef.current.filter((o: any) => POINT_ELTS.includes(o.elType));
      if (pts.length < 3) {
        onNotifyRef.current?.('Hãy chọn 3 điểm (A, đỉnh B, C) để đánh dấu góc.');
        return null;
      }
      const [p1, vertex, p2] = pts;
      const a1 = Math.atan2(p1.Y() - vertex.Y(), p1.X() - vertex.X());
      const a2 = Math.atan2(p2.Y() - vertex.Y(), p2.X() - vertex.X());
      let diff = ((a2 - a1) * 180) / Math.PI;
      if (diff < 0) diff += 360;
      const deg = Math.round(diff * 10) / 10;
      marksRef.current.angle = {
        p1Name: p1.name || 'A',
        vertexName: vertex.name || 'B',
        p2Name: p2.name || 'C',
        deg,
      };
      onNotifyRef.current?.(`Đã đánh dấu góc: ∠${p1.name || 'A'}${vertex.name || 'B'}${p2.name || 'C'} (${deg}°)`);
      return `${deg}°`;
    },

    clearMarks: () => {
      marksRef.current = {};
      onNotifyRef.current?.('Đã xóa tất cả các đánh dấu.');
    },

    getMarks: () => ({ ...marksRef.current }),

    applyTranslate: (params) => {
      const board = boardRef.current;
      if (!board) return false;
      if (params.type === 'vector') {
        const v = marksRef.current.vector;
        if (!v) {
          onNotifyRef.current?.('Chưa đánh dấu vectơ tịnh tiến. Hãy chọn 2 điểm rồi chọn Mark Vector.');
          return false;
        }
        if (!board.objects[v.fromId] || !board.objects[v.toId]) return false;
        return executeTransform({ op: 'translate', of: [v.fromId, v.toId] });
      } else {
        let dx = 0, dy = 0;
        if (params.type === 'rect') {
          dx = params.dx;
          dy = params.dy;
        } else {
          const rad = (params.angleDeg * Math.PI) / 180;
          dx = params.distance * Math.cos(rad);
          dy = params.distance * Math.sin(rad);
        }
        return executeTransform({ op: 'translate', of: [], dx, dy });
      }
    },

    applyRotate: (params) => {
      const cInfo = marksRef.current.center;
      const centerPt = cInfo ? boardRef.current?.objects[cInfo.id] : null;
      if (!centerPt) {
        onNotifyRef.current?.('Chưa đánh dấu tâm quay. Hãy chọn 1 điểm và chọn Mark Center trước.');
        return false;
      }
      return executeTransform({ op: 'rotate', of: [centerPt.id], angle: params.angleDeg });
    },

    applyDilate: (params) => {
      const cInfo = marksRef.current.center;
      const centerPt = cInfo ? boardRef.current?.objects[cInfo.id] : null;
      if (!centerPt) {
        onNotifyRef.current?.('Chưa đánh dấu tâm vị tự. Hãy chọn 1 điểm và chọn Mark Center trước.');
        return false;
      }
      return executeTransform({ op: 'dilate', of: [centerPt.id], k: params.ratio });
    },

    applyReflect: () => {
      const board = boardRef.current;
      if (!board) return false;
      const mInfo = marksRef.current.mirror;
      const mirrorLine = mInfo ? board.objects[mInfo.id] : null;
      if (!mirrorLine || !mirrorLine.point1 || !mirrorLine.point2) {
        onNotifyRef.current?.('Chưa đánh dấu trục đối xứng. Hãy chọn 1 đường thẳng và chọn Mark Mirror trước.');
        return false;
      }
      return executeTransform({ op: 'reflect', of: [mirrorLine.id] });
    },

    // ── Display menu helpers ─────────────────────────────────────────────────
    toggleSelectedLabel: () => {
      saveSnapshot();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      selectedRef.current.forEach((o: any) => {
        const cur = o.visProp?.withlabel ?? false;
        o.setAttribute({ withLabel: !cur });
      });
      boardRef.current?.update();
      onDirty();
    },

    toggleSelectedTrace: () => {
      saveSnapshot();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      selectedRef.current.forEach((o: any) => {
        const cur = o.visProp?.trace ?? false;
        o.setAttribute({ trace: !cur });
      });
      boardRef.current?.update();
      onDirty();
    },

    clearAllTraces: () => {
      boardRef.current?.clearTraces();
    },

    showAllHidden: () => {
      const board = boardRef.current;
      if (!board) return;
      saveSnapshot();
      for (const id in board.objects) {
        const obj = board.objects[id];
        if (obj.visProp?.visible === false) {
          obj.setAttribute({ visible: true });
        }
      }
      board.update();
      onDirty();
    },

    // ── Measure menu additions ───────────────────────────────────────────────
    measureCoordinates: () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pts = selectedRef.current.filter((o: any) => POINT_ELTS.includes(o.elType));
      if (pts.length === 0) return;
      saveSnapshot();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pts.forEach((p: any) => addMeasure(nextElId('meas'),
        { op: 'coordinates', args: [p.id], label: p.name || 'P', precision: 2 },
        { of: [p.id], dx: 0.3, dy: -0.3 },
        { strokeColor: '#1e3c96', fontSize: 13, withLabel: false }));
    },

    measureAbscissa: () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pts = selectedRef.current.filter((o: any) => POINT_ELTS.includes(o.elType));
      if (pts.length === 0) return;
      saveSnapshot();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pts.forEach((p: any) => addMeasure(nextElId('meas'),
        { op: 'abscissa', args: [p.id], label: `x_{${p.name || 'P'}}`, precision: 2 },
        { of: [p.id], dx: 0.3, dy: -0.3 },
        { strokeColor: '#1e3c96', fontSize: 13, withLabel: false }));
    },

    measureOrdinate: () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pts = selectedRef.current.filter((o: any) => POINT_ELTS.includes(o.elType));
      if (pts.length === 0) return;
      saveSnapshot();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pts.forEach((p: any) => addMeasure(nextElId('meas'),
        { op: 'ordinate', args: [p.id], label: `y_{${p.name || 'P'}}`, precision: 2 },
        { of: [p.id], dx: 0.3, dy: -0.3 },
        { strokeColor: '#1e3c96', fontSize: 13, withLabel: false }));
    },

    measureSlope: () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const line = selectedRef.current.find((o: any) => ['line', 'segment', 'ray'].includes(o.elType));
      if (!line || !line.point1 || !line.point2) return;
      saveSnapshot();
      addMeasure(nextElId('slope'),
        { op: 'slope', args: [line.id], label: 'm', precision: 2 },
        { of: [line.id], dy: 0.4 },
        { strokeColor: '#1e3c96', fontSize: 13, withLabel: false });
    },

    measureEquation: () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const obj = selectedRef.current.find((o: any) => ['line', 'segment', 'circle'].includes(o.elType));
      if (!obj) return;
      saveSnapshot();
      if (obj.elType === 'circle') {
        addMeasure(nextElId('eq'),
          { op: 'equationCircle', args: [obj.id], precision: 1 },
          { of: [obj.id], dx: 0.5, dy: -0.5 },
          { strokeColor: '#1e3c96', fontSize: 13 });
      } else {
        addMeasure(nextElId('eq'),
          { op: 'equationLine', args: [obj.id], precision: 1 },
          { of: [obj.id], dy: 0.4 },
          { strokeColor: '#1e3c96', fontSize: 13 });
      }
    },

    measurePerimeter: () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const poly = selectedRef.current.find((o: any) => o.elType === 'polygon');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const circ = selectedRef.current.find((o: any) => o.elType === 'circle');
      if (!poly && !circ) return;
      saveSnapshot();
      if (circ) {
        addMeasure(nextElId('meas'),
          { op: 'circumference', args: [circ.id], label: 'C', precision: 3 },
          { of: [circ.id], radiusFactor: 1.1 },
          { strokeColor: '#c83c3c', fontSize: 14 });
      } else {
        addMeasure(nextElId('meas'),
          { op: 'perimeter', args: [poly!.id], label: 'P', precision: 3 },
          { of: [poly!.id] },
          { strokeColor: '#c83c3c', fontSize: 14 });
      }
    },

    getZoom: () => (boardRef.current as unknown as { zoomX?: number })?.zoomX ?? 1,

    exportSVG: () => {
      const container = document.getElementById(BOARD_ID);
      const svg = container?.querySelector('svg');
      if (!svg) return '';
      if (!svg.getAttribute('width') && containerRef.current) {
        svg.setAttribute('width', String(containerRef.current.clientWidth));
        svg.setAttribute('height', String(containerRef.current.clientHeight));
      }
      return new XMLSerializer().serializeToString(svg);
    },
  }), []);  // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* Engine + stylesheet are injected by lib/jsxgraph (self-hosted, no CDN) */}

      {/* Canvas container */}
      <div ref={containerRef} className="relative flex-1 overflow-hidden bg-white">
        {/* JSXGraph renders into this div */}
        <div id={BOARD_ID} className="w-full h-full" />

        {/* Interaction overlay – active for construction tools */}
        <div
          ref={overlayRef}
          onClick={handleOverlayClick}
          onDoubleClick={handleOverlayDblClick}
          onMouseMove={handleOverlayMove}
          style={{
            position: 'absolute', inset: 0,
            pointerEvents: tool === 'selection' ? 'none' : 'auto',
            cursor: tool === 'selection'      ? 'default'
              : tool === 'point'              ? 'crosshair'
              : tool === 'point_on_object'    ? 'cell'
              : tool === 'midpoint'           ? 'crosshair'
              : tool === 'intersection'       ? 'crosshair'
              : tool === 'circle_center'      ? 'crosshair'
              : tool === 'text'               ? 'text'
              : tool === 'info'               ? 'help'
              : 'crosshair',
            zIndex: 5,
          }}
        />

        {/* GSP-style selection decorations (pink outlines around selected objects) */}
        {selDecorations.length > 0 && (
          <svg style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            pointerEvents: 'none', overflow: 'visible', zIndex: 7,
          }}>
            {selDecorations.map((dec, i) => {
              if (dec.kind === 'point') {
                return (
                  <circle key={i}
                    cx={dec.cx} cy={dec.cy} r={dec.r}
                    fill="none" stroke="#e91e63" strokeWidth="1.5"
                  />
                );
              }
              if (dec.kind === 'line') {
                const dx = dec.x2 - dec.x1, dy = dec.y2 - dec.y1;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                const px = -dy / len * 2, py = dx / len * 2;
                const EXT = 8000; // extend far for infinite lines
                const ax1 = dec.sfirst ? dec.x1 - dx / len * EXT : dec.x1;
                const ay1 = dec.sfirst ? dec.y1 - dy / len * EXT : dec.y1;
                const ax2 = dec.slast  ? dec.x2 + dx / len * EXT : dec.x2;
                const ay2 = dec.slast  ? dec.y2 + dy / len * EXT : dec.y2;
                return (
                  <g key={i}>
                    <line x1={ax1 + px} y1={ay1 + py} x2={ax2 + px} y2={ay2 + py}
                      stroke="#e91e63" strokeWidth="1" fill="none" />
                    <line x1={ax1 - px} y1={ay1 - py} x2={ax2 - px} y2={ay2 - py}
                      stroke="#e91e63" strokeWidth="1" fill="none" />
                  </g>
                );
              }
              if (dec.kind === 'circle') {
                return (
                  <g key={i}>
                    <circle cx={dec.cx} cy={dec.cy} r={dec.r + 1}
                      fill="none" stroke="#e91e63" strokeWidth="1" />
                    <circle cx={dec.cx} cy={dec.cy} r={Math.max(0, dec.r - 1)}
                      fill="none" stroke="#e91e63" strokeWidth="1" />
                  </g>
                );
              }
              if (dec.kind === 'polygon') {
                return (
                  <polygon key={i}
                    points={dec.points}
                    fill="none" stroke="#e91e63" strokeWidth="1.5"
                  />
                );
              }
              return null;
            })}
          </svg>
        )}

        {/* The marked centre: the point a rotate/dilate arrow turns around.
            Sketchpad leaves an open circle on it so the page says what a drag
            will pivot on before the drag happens. */}
        {centerMark && (
          <svg style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            pointerEvents: 'none', overflow: 'visible', zIndex: 7,
          }}>
            <circle cx={centerMark.sx} cy={centerMark.sy} r="8"
              fill="none" stroke="#1e3c96" strokeWidth="1.2" strokeDasharray="3 2" />
          </svg>
        )}

        {/* Snap indicator:
              red crosshair  = snapping to an existing point
              orange diamond = snapping to a curve (glider will be created) */}
        {snapPos && tool !== 'selection' && (
          <svg
            style={{
              position: 'absolute',
              left: snapPos.sx - 10,
              top:  snapPos.sy - 10,
              width: 20,
              height: 20,
              pointerEvents: 'none',
              zIndex: 6,
            }}
          >
            {snapPos.type === 'point' ? (
              /* Red crosshair for point snap */
              <>
                <circle cx="10" cy="10" r="7" fill="none" stroke="#c83c3c" strokeWidth="1.5" />
                <line x1="10" y1="3"  x2="10" y2="17" stroke="#c83c3c" strokeWidth="1" />
                <line x1="3"  y1="10" x2="17" y2="10" stroke="#c83c3c" strokeWidth="1" />
              </>
            ) : (
              /* Orange diamond for curve snap */
              <>
                <polygon points="10,2 18,10 10,18 2,10" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
                <line x1="10" y1="2"  x2="10" y2="18" stroke="#f59e0b" strokeWidth="0.8" strokeDasharray="2,2" />
                <line x1="2"  y1="10" x2="18" y2="10" stroke="#f59e0b" strokeWidth="0.8" strokeDasharray="2,2" />
              </>
            )}
          </svg>
        )}

        {/* Loading indicator */}
        {!jxgLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
            <span className="text-gray-500 text-sm animate-pulse">Đang tải JSXGraph…</span>
          </div>
        )}

        {/* Rubber-band selection rectangle (mirrors Desktop RECTANGLE_DRAG) */}
        {rubberBand && (
          <svg
            style={{
              position: 'absolute',
              left: rubberBand.x,
              top:  rubberBand.y,
              width: rubberBand.w,
              height: rubberBand.h,
              pointerEvents: 'none',
              zIndex: 8,
            }}
          >
            <rect
              x="0" y="0"
              width={rubberBand.w} height={rubberBand.h}
              fill="rgba(30,60,150,0.08)"
              stroke="#1e3c96"
              strokeWidth="1"
              strokeDasharray="4 3"
            />
          </svg>
        )}
      </div>
    </>
  );
});

export default DesignCanvas;
