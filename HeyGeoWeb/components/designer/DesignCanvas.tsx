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
  NumberValue,
  SliderConfig,
  SliderPos,
} from './designTypes';
import { emptyData, elementKindLabel } from './designTypes';
import { DEFAULT_PREFERENCES, type Preferences } from './preferences';
import { LINE_WIDTH, SELECT_INK, pointStyle } from './designStyle';
import DesignContextMenu from './DesignContextMenu';
import {
  objectMenu,
  selectionFacts,
  sketchMenu,
  type ContextItem,
  type ContextRow,
} from './contextMenuModel';
import { createElement, syncPlotValues } from './elementRegistry';
import {
  LINE_LOCUS_TYPE, LOCUS_SAMPLES, locusSamples, refreshLineLocuses,
} from './lineLocusModel';
import {
  anchorClosures, captionAnchor, isAnchorSpec, isMeasureSpec, lengthValueOf, measureValue,
  numberValueOf, type MeasureSpec,
} from './measurement';
import { circleByRadiusPicks } from './circleByRadiusModel';
import { arcOnCirclePicks, isPointKind, type ArcOnCircle } from './arcOnCircleModel';
import { arcSectorPicks, type ArcSector } from './arcSectorModel';
import { centreOf, endpointIds } from './pointConstructModel';
import { measureItems, type MeasureItem } from './measureMenuModel';
import { defaultSlider, numberSources, parameterPlace } from './numberMenuModel';
import {
  decimalsForStep, isParameterSpec, parameterCaption, precisionOf,
  type ParameterConfig, type ParameterSpec,
} from './parameterModel';
import {
  coordsysOf,
  definePlan,
  defaultFrame,
  frameElements,
  framePoints,
  graphRows,
  originCarriesUnit,
  unitOnAxis,
  withGrid,
  withMark,
  withMarkOnly,
  type Coordsys,
  type FramePoints,
  type GridForm,
  type GraphRows,
} from './coordsysModel';
import {
  functionCaption,
  functionOf,
  functionPlace,
  functionRows,
  nextFunctionName,
  plotOfFunction,
  plotTarget,
  type FunctionRows,
  type FunctionSpec,
} from './functionMenuModel';
import {
  frameGeometry,
  gridInk,
  isMeasurable,
  planGrid,
  snapToGrid,
  type Viewbox,
} from './gridModel';
import type { PlotSpec } from './plotModel';
import {
  plotPair,
  plotPointProblem,
  plotPointRows,
  prunePlotPoint,
  type PlotPointRows,
  type PlotPointSpec,
} from './plotPointModel';
import {
  isValuePath,
  plotValueRows,
  valuePaths,
  type PlotValueChoice,
  type PlotValueRows,
} from './plotValueModel';
import {
  actionButtonRows,
  buttonCaption,
  buttonOf,
  buttonPlace,
  isMovablePoint,
  movePairs,
  newActionButton,
  type ActionButtonAction,
  type ActionButtonRows,
  type ActionButtonSpec,
  type MoveSpeed,
  type PresentSpec,
} from './actionButtonModel';
import { createButtonRuntime, type ButtonRuntime } from './buttonRuntime';
import {
  copyClosure,
  pasteElements,
  pasteOffset,
  type Clipboard,
} from './clipboardModel';
import {
  advanceAnimation,
  animationProblem,
  animationRows,
  animationSpeed,
  animatableKind,
  animatables,
  sliderRange,
  startState,
  withSliderValue,
  type AnimationRows,
  type AnimationSpec,
  type AnimationTargetState,
  type AnimatableKind,
} from './animationModel';
import { arrowDragMap, imageClosures, imageFixedPoint, imagePointIds, type ImageSpec, type RatioMark } from './transforms';
import {
  applyScene,
  clearHistory,
  coordParents,
  findObjectsAt,
  gatherSelectionPoints,
  planScene,
  polygonElements,
  parentsOf,
  childrenOf,
  pushCapped,
  setSceneChrome,
  syncPositions,
  takeScene,
  withDependents,
  type SceneSnapshot,
} from './sceneModel';
import { isPolygonTool, type ArrowMode } from './toolboxModel';
import {
  canChangeFont,
  fontAttrsOf,
  fontDocumentAttrs,
  isCssBold,
  isCssItalic,
  objectFontFamily,
  objectFontSize,
  sharedFontFamily,
  sharedFontSize,
  withFontWeight,
  withFontStyle,
  type FontChoice,
  type FontPick,
} from './fontModel';

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
/**
 * Continue the id and name counters past everything the loaded document already
 * uses, so the first element made after a reload cannot take an id the file
 * holds — or the letter a displayed point is already called by.
 */
function seedCounters(elements: HeyGeoElement[]) {
  for (const el of elements) {
    const m = /_(\d+)$/.exec(el.id);
    if (m) _elIdx = Math.max(_elIdx, Number(m[1]));
    const label = typeof el.attrs?.name === 'string' ? el.attrs.name : '';
    const n = /^([A-Z])(\d*)$/.exec(label);
    if (n) _ptIdx = Math.max(_ptIdx, ALPHA.indexOf(n[1]) + 26 * (n[2] ? Number(n[2]) : 0) + 1);
  }
}
function nextPointName() {
  const n = _ptIdx++;
  return ALPHA[n % 26] + (n >= 26 ? String(Math.floor(n / 26)) : '');
}
function nextElId(prefix: string) { return `${prefix}_${++_elIdx}`; }

const POINT_ELTS = ['point', 'glider', 'midpoint', 'circumcenter', 'intersection', 'slider'];

/** What a click or a drag can act on. */
const SELECTABLE_KINDS = [
  ...POINT_ELTS,
  'line', 'segment', 'ray', 'parallel', 'perpendicular', 'bisector',
  'circle', 'arc', 'polygon',
  // a locus is a curve, and Sketchpad lets a click land on one
  'curve', 'tracecurve',
];

/** Sketchpad also has a menu for a measurement or a caption, which a click
 *  cannot select, so the Context menu looks at these as well. */
const CONTEXT_MENU_KINDS = [...SELECTABLE_KINDS, 'text', 'angle'];

/** Straight objects a perpendicular or a parallel can be drawn to. */
const LINE_KINDS = ['line', 'segment', 'ray', 'parallel', 'perpendicular', 'bisector'];

/** How many more samples each press of + adds: a bundle of lines needs finer steps than a point path. */
const LOCUS_STEP = 8;
const TRACE_STEP = 20;

/** How far, in pixels, a dragged label's nearest edge may sit from its object. */
const LABEL_REACH = 15;

/** Points drawn as a coloured disc inside a black rim. */
const SOLID_POINTS = POINT_ELTS.filter((k) => k !== 'slider');

/** Display | Label Object… relabels one point or one curve, as the desktop's
 *  canEditChangeLabel does; a slider or a caption has no label of its own. */
const RELABEL_KINDS = SELECTABLE_KINDS.filter((k) => k !== 'slider');

/** Construct | Circle Interior: the filled disc alone, with no second outline
 *  drawn over the circle it fills. The desktop exports the interior as the same
 *  circle with fill attributes, so this is the shape a reload reads back. */
const INTERIOR_STYLE = {
  strokeColor: '#1e3c96', strokeOpacity: 0,
  fillColor: '#1e3c96', fillOpacity: 0.12,
  hasInnerPoints: true, withLabel: false,
};

// ─── The frame's grid, as it is painted on the page ─────────────────────────
// The desktop draws it inside G_coordsys::draw(): a grey pen for the lines and the
// axis ink for the ticks and their numbers. Where the picture goes is the grid
// model's business; this is only the ink it is painted with.
const SVG_NS = 'http://www.w3.org/2000/svg';
const GRID_INK = '#b4b4b4';
const TICK_INK = '#1e3c96';
const GRID_FONT = { size: 12, family: 'Helvetica, Arial, sans-serif' };

/** Which side of its axis a number hangs on, as the two SVG attributes that place it. */
const LABEL_PLACEMENT = {
  under: { anchor: 'middle', baseline: 'hanging' },
  left: { anchor: 'end', baseline: 'middle' },
  right: { anchor: 'start', baseline: 'middle' },
} as const;

/** The four nodes the grid is drawn with, kept so a redraw replaces rather than rebuilds. */
interface GridParts {
  layer: SVGSVGElement;
  furniture: SVGPathElement;
  ticks: SVGPathElement;
  labels: SVGGElement;
  /** What the picture was drawn from; the same fingerprint means the same picture. */
  key: string;
}

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
    if (obj.elType !== 'point' && obj.elType !== 'glider' && obj.elType !== 'midpoint'
      && obj.elType !== 'circumcenter' && obj.elType !== 'intersection'
      && obj.elType !== 'slider') continue;
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
  | { kind: 'polygon'; points: string }
  | { kind: 'path';    d: string }
  | { kind: 'text';    x: number; y: number; w: number; h: number };

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

/** A tick mark on a straight element, rendered as 1, 2, or 3 short perpendicular strokes. */
interface TickMarkDecoration {
  id: string;
  count: number;
  mx: number;
  my: number;
  px: number;
  py: number;
  dx: number;
  dy: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function computeTickDecorations(
  tickMap: Map<string, number>,
  board: any,
): TickMarkDecoration[] {
  if (!board || tickMap.size === 0) return [];
  const decs: TickMarkDecoration[] = [];
  for (const [id, count] of tickMap.entries()) {
    if (count <= 0) continue;
    const obj = board.objects?.[id];
    if (!obj || obj.visProp?.visible === false) continue;
    let p1sc: number[] | undefined;
    let p2sc: number[] | undefined;
    if (obj.point1?.coords?.scrCoords && obj.point2?.coords?.scrCoords) {
      p1sc = obj.point1.coords.scrCoords;
      p2sc = obj.point2.coords.scrCoords;
    } else if (['parallel', 'perpendicular', 'bisector'].includes(obj.elType)) {
      const ends = lineVisibleScrPts(obj, board);
      if (ends) {
        p1sc = [1, ends[0][0], ends[0][1]];
        p2sc = [1, ends[1][0], ends[1][1]];
      }
    }
    if (!p1sc || !p2sc) continue;
    const mx = (p1sc[1] + p2sc[1]) / 2;
    const my = (p1sc[2] + p2sc[2]) / 2;
    const vx = p2sc[1] - p1sc[1];
    const vy = p2sc[2] - p1sc[2];
    const len = Math.hypot(vx, vy);
    if (len < 1) continue;
    const dx = vx / len;
    const dy = vy / len;
    const px = -dy;
    const py = dx;
    decs.push({ id, count, mx, my, px, py, dx, dy });
  }
  return decs;
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
      if (['point','glider','midpoint','circumcenter','intersection'].includes(obj.elType)) {
        const sc = obj.coords?.scrCoords;
        if (sc) decs.push({ kind: 'point', cx: sc[1], cy: sc[2],
          r: (obj.visProp?.size ?? 3) + (obj.visProp?.strokewidth ?? 1.5) / 2 + 3 });
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
      } else if (obj.elType === 'curve' || obj.elType === 'tracecurve'
        || obj.elType === 'functiongraph') {
        // A locus is a bundle of strokes, so its outline follows every run of
        // points between the gaps that keep the strokes apart.
        const d = curvePath(obj);
        if (d) decs.push({ kind: 'path', d });
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
      } else if (obj.elType === 'text') {
        const sc = obj.coords?.scrCoords;
        const [w, h] = obj.size ?? [0, 0];
        if (sc && w > 0) {
          const side = obj.getAnchorX();
          const base = obj.getAnchorY();
          const left = side === 'right' ? sc[1] - w : side === 'middle' ? sc[1] - w / 2 : sc[1];
          const bottom = base === 'top' ? sc[2] + h : base === 'middle' ? sc[2] + h / 2 : sc[2];
          decs.push({ kind: 'text', x: left - 3, y: bottom - h - 2, w: w + 6, h: h + 4 });
        }
      }
    } catch { /**/ }
  }
  return decs;
}

// ─── Build SelectedElementInfo from board object ─────────────────────────────
/**
 * The screen-space outline of a curve, one run per stretch between its gaps.
 * A locus of a line is many strokes in one curve, and a NaN point between them is
 * what tells them apart.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function curvePath(obj: any): string {
  const pts = obj?.points ?? [];
  let d = '';
  let pen = false;
  for (const p of pts) {
    const sc = p?.scrCoords;
    if (!sc || Number.isNaN(sc[1]) || Number.isNaN(sc[2])) {
      pen = false;
      continue;
    }
    d += `${pen ? 'L' : 'M'}${sc[1]} ${sc[2]}`;
    pen = true;
  }
  return d;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toSelectedInfo(obj: any): SelectedElementInfo {
  const vp = obj.visProp ?? {};
  const parameter = obj.parameterSpec as
    { value: number; min: number; max: number; precision?: number; of?: string } | undefined;
  return {
    id:          obj.id,
    // a parameter is a text to the engine but a number to the designer
    type:        parameter ? 'parameter' : (obj.elType ?? 'unknown'),
    name:        obj.name ?? '',
    strokeColor: SOLID_POINTS.includes(obj.elType) ? (vp.fillcolor ?? '#000000') : (vp.strokecolor ?? '#000000'),
    fillColor:   vp.fillcolor    ?? 'none',
    fillOpacity: vp.fillopacity  ?? 0.1,
    strokeWidth: vp.strokewidth  ?? 2,
    dash:        vp.dash         ?? 0,
    visible:     vp.visible      !== false,
    fixed:       obj.isDraggable === false,
    coords:      obj.elType === 'point'
      ? [obj.X?.() ?? 0, obj.Y?.() ?? 0]
      : undefined,
    parameter:   parameter
      ? { value: parameter.value, min: parameter.min, max: parameter.max,
          precision: parameter.precision ?? 2, of: parameter.of }
      : undefined,
  };
}

// ─── Props & Ref ──────────────────────────────────────────────────────────────
interface Props {
  tool: ToolMode;
  /** While `tool === 'selection'`, this decides what a drag does. */
  arrow: ArrowMode;
  initialData?: HeyGeoData | null;
  /** Edit | Preferences — background, default ink and how a selection is marked. */
  preferences?: Preferences;
  onCursorMove: (c: CursorCoords) => void;
  onSelectionChange: (els: SelectedElementInfo[]) => void;
  onDirty: () => void;
  onOpenProperties?: (info: SelectedElementInfo) => void;
  onOpenSliderConfig?: (pos: SliderPos) => void;
  onNotify?: (msg: string) => void;
}

const DesignCanvas = forwardRef<CanvasHandle, Props>(function DesignCanvas(
  {
    tool, arrow, initialData, preferences = DEFAULT_PREFERENCES,
    onCursorMove, onSelectionChange, onDirty, onOpenProperties, onOpenSliderConfig, onNotify,
  },
  ref,
) {
  const BOARD_ID = 'heygeo-design-board';
  const boardRef   = useRef<JXGBoard | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [jxgLoaded, setJxgLoaded] = useState(() => getJXG() !== null);

  // Preferences reach the imperative handle, which is built once, through refs.
  const foregroundRef = useRef(preferences.foregroundColor);
  const backgroundRef = useRef(preferences.backgroundColor);
  useEffect(() => {
    foregroundRef.current = preferences.foregroundColor;
    backgroundRef.current = preferences.backgroundColor;
  }, [preferences]);

  /** The ink a newly drawn object takes. Saved objects keep the colour they have. */
  const ink = () => foregroundRef.current;

  // Marks stored for transformations (Center, Mirror, Vector, Angle)
  const marksRef = useRef<import('./designTypes').MarkInfo>({});
  const onNotifyRef = useRef(onNotify);
  useEffect(() => { onNotifyRef.current = onNotify; }, [onNotify]);
  const onDirtyRef = useRef(onDirty);
  useEffect(() => { onDirtyRef.current = onDirty; }, [onDirty]);

  // Snap indicator: screen position of snap target (null = none)
  // type: 'point' = snapping to existing point (red), 'curve' = snapping to curve (orange)
  const [snapPos, setSnapPos] = useState<{ sx: number; sy: number; type: 'point' | 'curve' } | null>(null);

  /** Slider values as they stood when the pointer went down: moving the
   *  control translates its range, it does not change the number it selects. */
  const sliderValuesRef = useRef<Record<string, number>>({});

  /** A parameter label being dragged: the document holds where it lands. */
  const paramDragRef = useRef<{ id: string; start: [number, number]; from: [number, number]; started: boolean } | null>(null);
  /** The inline value editor a double-click opens over a parameter label. */
  const [paramEdit, setParamEdit] = useState<{
    id: string; text: string; left: number; top: number; width: number;
  } | null>(null);

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
  // Set while a drag is moving something a locus follows, so the sampling loop
  // can catch up between pointer events instead of waiting for the drag to end.
  const locusDirtyRef = useRef(false);

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
    mode:   ArrowMode;
    /** The marked centre; null for the translate arrow, which pivots on nothing. */
    center: [number, number] | null;
    start:  [number, number];
    base:   { id: string; x: number; y: number }[];
  }
  const arrowDragRef = useRef<ArrowDrag | null>(null);
  /** Pointer position when the arrow drag began, in user coords. */
  const arrowStartRef = useRef<[number, number] | null>(null);
  /** Latest pointer event anywhere in the window, used to read the pointer. */
  const pointerRef = useRef<PointerEvent | null>(null);

  // ─── Pan state ────────────────────────────────────────────────────────────
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ sx: number; sy: number; originX: number; originY: number } | null>(null);
  const spaceHeldRef = useRef(false);

  // ─── Display | Animate Objects… ───────────────────────────────────────────
  // The run lives outside React state: every frame is a change to the board,
  // not a re-render, and stopping is what hands the final places to the document.
  interface RunningAnimation {
    raf: number;
    last: number;
    spec: AnimationSpec;
    targets: { el: HeyGeoElement; kind: AnimatableKind; state: AnimationTargetState }[];
  }
  const animationRef = useRef<RunningAnimation | null>(null);

  useEffect(() => {
    const onMove = (e: PointerEvent) => { pointerRef.current = e; };
    window.addEventListener('pointermove', onMove, true);
    return () => window.removeEventListener('pointermove', onMove, true);
  }, []);

  // Spacebar hold → pan cursor
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.code === 'Space' && !spaceHeldRef.current) {
        spaceHeldRef.current = true;
        e.preventDefault();
        if (containerRef.current) containerRef.current.style.cursor = 'grab';
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceHeldRef.current = false;
        if (containerRef.current) containerRef.current.style.cursor = '';
        if (isPanningRef.current) {
          isPanningRef.current = false;
          panStartRef.current = null;
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // A run left behind on an unmounted canvas would keep ticking on a dead board.
  useEffect(() => () => stopMotion(false), []); // eslint-disable-line react-hooks/exhaustive-deps

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

  // True right after a polygon closes, so the tail of its own double-click is ignored.
  const polygonClosedRef = useRef(false);

  // Selection
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const selectedRef = useRef<any[]>([]);
  // Set to true in element's 'down' handler so rubber-band onMouseDown knows an object was clicked
  const objectClickedRef = useRef(false);
  // A click on an unselected object adds it to the selection, so it is the one a
  // drag that starts on it must narrow the selection back to.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const justAddedRef = useRef<any>(null);
  // A click on a selected object deselects it, but only once the pointer is up
  // without having moved — a press that turns into a drag moves the group.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toggleOnUpRef = useRef<{ obj: any; x: number; y: number } | null>(null);
  // A measurement caption being dragged: where it started and the pointer grab.
  const captionDragRef = useRef<{
    id: string; startX: number; startY: number; dx0: number; dy0: number;
    shift: [number, number]; moved: boolean;
  } | null>(null);
  // GSP-style selection decorations rendered as SVG overlay
  const [selDecorations, setSelDecorations] = useState<SelDecoration[]>([]);
  // The Context menu: the rows Sketchpad would show, and where the pointer was.
  const [menu, setMenu] = useState<{ x: number; y: number; rows: ContextRow[] } | null>(null);
  const menuRef = useRef(menu);
  // The marked centre, left on the page as an open circle like Sketchpad does
  const [centerMark, setCenterMark] = useState<CenterMark | null>(null);
  const centerMarkRef = useRef<CenterMark | null>(null);
  // The frame's grid, painted on a layer of its own under JSXGraph's elements
  const gridPartsRef = useRef<GridParts | null>(null);
  // Pen tool tick marks on straight elements: segmentId -> count (1..3)
  const tickMarksRef = useRef<Map<string, number>>(new Map());
  // The reading each value plotted on a path was last moved to, so a point the
  // designer drags is left alone until the number under it changes.
  const plotValuesRef = useRef<Map<string, number>>(new Map());
  const [tickDecorations, setTickDecorations] = useState<TickMarkDecoration[]>([]);

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
    if (!board) return null;

    let center: [number, number] | null = null;
    if (mode !== 'translate') {
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
      center = [centerPt.X(), centerPt.Y()];
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
      if (mode !== 'translate') {
        onNotifyRef.current?.('Vùng chọn không có điểm tự do nào để biến đổi.');
      }
      return null;
    }
    return { mode, center, start, base };
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
    if (toolRef.current !== 'selection') return;
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
    // the objects a run was moving may be gone from the restored scene
    stopMotion(false);
    cancelTool();
    const { elements, errors } = applyScene(board, target, planScene(currentScene(), target));
    elementsRef.current = elements;
    metaRef.current = { ...metaRef.current, axis: target.axis, grid: target.grid };
    setSceneChrome(board, metaRef.current);
    reportLoadErrors(errors);
    syncLocusSamples(board);
    syncTickMarksFromElements(board);
    keepSelection(board);
    onDirty();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function syncTickMarksFromElements(board?: any) {
    const b = board ?? boardRef.current;
    tickMarksRef.current.clear();
    for (const el of elementsRef.current) {
      const tc = el.attrs?.tickCount;
      if (typeof tc === 'number' && tc > 0) {
        tickMarksRef.current.set(el.id, tc % 4);
      }
    }
    if (b) {
      setTickDecorations(computeTickDecorations(tickMarksRef.current, b));
    }
  }

  function toggleTickMark(id: string) {
    saveSnapshot();
    const current = tickMarksRef.current.get(id) ?? 0;
    const next = (current + 1) % 4; // 0 -> 1 -> 2 -> 3 -> 0
    if (next === 0) {
      tickMarksRef.current.delete(id);
    } else {
      tickMarksRef.current.set(id, next);
    }
    const el = elementsRef.current.find((e) => e.id === id);
    if (el) {
      if (next === 0) {
        delete el.attrs.tickCount;
      } else {
        el.attrs.tickCount = next;
      }
    }
    const board = boardRef.current;
    if (board) {
      setTickDecorations(computeTickDecorations(tickMarksRef.current, board));
    }
    onDirty();
  }

  /**
   * A family of lines draws what the document says, so an undo to a different
   * sample count has to be sampled again; the curve itself is never rebuilt.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function syncLocusSamples(board: any) {
    for (const el of elementsRef.current) {
      if (el.type !== LINE_LOCUS_TYPE) continue;
      const info = board.objects?.[el.id]?._locus;
      if (!info) continue;
      info.samples = locusSamples(el.attrs);
      info.sig = '';
    }
    if (refreshLineLocuses(board)) board.update();
  }

  /**
   * Display | Number of Samples… and Sketchpad's +/− keys: how many positions of
   * the driver a locus shows, as one undo step.
   */
  function applySamples(samples: number): boolean {
    const board = boardRef.current;
    const sel = selectedRef.current;
    if (!board || sel.length !== 1) return false;
    const rec = elementsRef.current.find((e) => e.id === sel[0].id);
    if (rec?.type === LINE_LOCUS_TYPE) {
      const obj = board.objects[rec.id];
      if (!obj?._locus) return false;
      const next = Math.max(2, Math.min(400, Math.round(samples)));
      saveSnapshot();
      rec.attrs.samples = next;
      obj._locus.samples = next;
      obj._locus.sig = '';
      if (refreshLineLocuses(board)) board.update();
      onDirty();
      return true;
    }
    const obj = board.objects[rec?.id ?? ''] as { setAttribute?: (a: Record<string, unknown>) => void } | undefined;
    if (rec?.type !== 'tracecurve' || !obj?.setAttribute) return false;
    const next = Math.max(10, Math.min(5000, Math.round(samples)));
    saveSnapshot();
    obj.setAttribute({ numberPoints: next });
    rec.attrs.numberPoints = next;
    board.update();
    onDirty();
    return true;
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
  // A measurement is ink, not the red a new object is drawn in.
  const measureStyle = () => ({ strokeColor: ink(), fontSize: 13, withLabel: false });

  /**
   * Write the captions a Measure menu item offers, beside the geometry each
   * measures, as one undo step.
   *
   * A caption is a text carrying descriptors: `attrs.measure` says what to
   * compute and `attrs.anchor` where to put it. The document stays data — no
   * JavaScript source is stored, so nothing has to be evaluated to open a file —
   * and the caption keeps following the figure because the registry hands
   * JSXGraph closures built from those descriptors.
   */
  function createMeasure(measures: MeasureSpec[]): boolean {
    const board = boardRef.current;
    if (!board) return false;
    const built: { el: HeyGeoElement; obj: unknown }[] = [];
    const errorMessage = (message: string) => {
      // half a row of captions is not a measurement the designer asked for
      built.forEach(({ obj }) => board.removeObject(obj as never));
      onNotifyRef.current?.(message);
      return false;
    };
    for (const measure of measures) {
      // a caption in this batch sees the ones already placed in it, so two of
      // the same row never print on top of each other
      const placed = captionAnchor(measure, [...elementsRef.current, ...built.map((b) => b.el)]);
      // The value stays where it is dropped when the figure moves, as in Sketchpad.
      const [bx, by] = anchorClosures(board, { ...placed, dx: 0, dy: 0 });
      const anchor = { ...placed, at: [Number(bx().toFixed(4)), Number(by().toFixed(4))] as [number, number] };
      const [x, y] = anchorClosures(board, anchor);
      const el: HeyGeoElement = {
        type: 'text',
        id: nextElId('meas'),
        parents: [Number(x().toFixed(4)), Number(y().toFixed(4)), measure.label ?? ''],
        attrs: { ...measureStyle(), anchor, measure },
      };
      const { obj, error } = createElement(board, el, {});
      if (!obj) return errorMessage(error ?? `Không tạo được ${el.type}`);
      built.push({ el, obj });
    }
    if (built.length === 0) return false;
    saveSnapshot();
    elementsRef.current.push(...built.map((b) => b.el));
    board.update();
    onDirty();
    return true;
  }

  /**
   * The centre and length Construct | Circle By Center+Radius would use, from
   * the picks. The board says what kind each pick is; the document says whether
   * a caption measures a length, which is what the desktop's isLengthMeasure
   * asks before it offers the row.
   */
  function circleRadiusPicks(): { center: string; radius: string } | null {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const picks = selectedRef.current.map((o: any) => {
      const measure = elementsRef.current.find((e) => e.id === o.id)?.attrs?.measure;
      return {
        id: o.id as string,
        kind: (o.elType ?? '') as string,
        measureOp: isMeasureSpec(measure) ? measure.op : undefined,
      };
    });
    return circleByRadiusPicks(picks);
  }

  /**
   * The circle and endpoints Construct | Arc On Circle would use, with the
   * centre point the circle is built from. The document stores the arc as
   * [centre, start, end] — the same shape the desktop exporter writes — and
   * the engine sweeps that counterclockwise, the way the desktop does.
   */
  function arcOnCircleSelection(): { arc: ArcOnCircle; centre: string } | null {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const picked = arcOnCirclePicks(selectedRef.current.map((o: any) => ({
      id: o.id as string,
      kind: (o.elType ?? '') as string,
    })));
    if (!picked) return null;
    const circle = elementsRef.current.find((e) => e.id === picked.circle);
    const centre = String(circle?.parents[0] ?? '');
    const centreEl = elementsRef.current.find((e) => e.id === centre);
    if (!centreEl || !isPointKind(centreEl.type)) return null;
    return { arc: picked, centre };
  }

  /**
   * The arc Construct | Arc Sector Interior would fill. The desktop hangs the
   * sector off the picked arc, and the exporter gives the sector the arc's own
   * parents, so the wedge is the arc's own wedge — about its centre when the
   * arc carries one, and about the circumcentre JSXGraph finds when it is an
   * arc through three points.
   */
  function arcSectorSelection(): ArcSector | null {
    if (selectedRef.current.length !== 1) return null;
    const id = selectedRef.current[0].id as string;
    const el = elementsRef.current.find((e) => e.id === id);
    if (!el) return null;
    return arcSectorPicks([{ id: el.id, kind: el.type, parents: el.parents.map(String) }]);
  }

  /**
   * The arc Construct | Arc Segment Interior would fill: the region bounded by
   * the arc and its straight chord.
   */
  function arcSegmentSelection(): { arc: string; parents: [string, string, string] } | null {
    if (selectedRef.current.length !== 1) return null;
    const id = selectedRef.current[0].id as string;
    const el = elementsRef.current.find((e) => e.id === id);
    if (!el || el.parents.length !== 3) return null;
    if (el.type === 'arc') {
      return { arc: el.id, parents: [String(el.parents[0]), String(el.parents[1]), String(el.parents[2])] };
    }
    if (el.type === 'circumcirclearc') {
      const obj = boardRef.current?.objects[el.id];
      const centerId = obj?.center?.id;
      if (centerId) {
        return { arc: el.id, parents: [centerId, String(el.parents[0]), String(el.parents[2])] };
      }
    }
    return null;
  }

  /** The one object Construct | Endpoints and Center Point read the pick from. */
  function pointConstructPick(): { id: string; kind: string; parents: string[] } | null {
    if (selectedRef.current.length !== 1) return null;
    const id = selectedRef.current[0].id as string;
    const el = elementsRef.current.find((e) => e.id === id);
    return el ? { id: el.id, kind: el.type, parents: el.parents.map(String) } : null;
  }

  /**
   * Construct | Endpoints / Center Point: make points the document already has
   * visible, under the name the object gives them. A point the document never
   * listed is stored where it stands, so the sketch reloads as it looks.
   */
  function revealPoints(ids: string[]): boolean {
    const board = boardRef.current;
    if (!board) return false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pts = ids.map((id) => (board.objects as any)[id]).filter(Boolean);
    if (pts.length === 0) return false;
    saveSnapshot();
    for (const pt of pts) {
      const el = elementsRef.current.find((e) => e.id === pt.id);
      const stored = typeof el?.attrs?.name === 'string' ? el.attrs.name : '';
      const name = stored || nextPointName();
      pt.setAttribute({ visible: true, name, ...pointStyle() });
      if (el) {
        el.attrs.visible = true;
        el.attrs.name = name;
      } else {
        elementsRef.current.push({
          type: 'point', id: pt.id,
          parents: [pt.X(), pt.Y()],
          attrs: { name, visible: true, ...pointStyle() },
        });
      }
    }
    board.update();
    onDirty();
    return true;
  }

  /**
   * The Measure menu for the objects the designer has picked. The menu draws its
   * greyed rows from this, so an item that looks dead and a measurement that
   * cannot be made are the same fact.
   */
  function measureRows(): MeasureItem[] {
    return measureItems(elementsRef.current, selectedRef.current.map((o) => o.id));
  }

  /**
   * Add Slider's control and its caption as one step.
   *
   * Sketchpad's slider carries its number as a label the designer can place on
   * its own; JSXGraph's label is glued to the handle instead. So the control is
   * drawn without that label, and the caption is a parameter bound to the
   * slider's live value — draggable by itself, while the handle still sets the
   * number and the baseline moves the whole slider.
   */
  function makeSlider(pos: SliderPos, cfg: SliderConfig, extra: Record<string, unknown> = {}): boolean {
    const board = boardRef.current;
    if (!board) return false;
    saveSnapshot();
    const id = nextElId('sl');
    const attrs: Record<string, unknown> = {
      name: cfg.name,
      snapWidth: cfg.step,
      withTicks: true,
      withLabel: false,
      strokeColor: ink(),
      fillColor: ink(),
      // The ends and the baseline answer the pointer, so the whole control can
      // be moved; the handle still sets the value.
      point1: { fixed: false },
      point2: { fixed: false },
      baseline: { fixed: false, needsRegularUpdate: true },
      ...extra,
    };
    board.create('slider',
      [[pos.x1, pos.y1], [pos.x2, pos.y2], [cfg.min, cfg.init, cfg.max]],
      { id, ...attrs });
    elementsRef.current.push({
      type: 'slider', id,
      parents: [
        [pos.x1, pos.y1] as (number | null)[],
        [pos.x2, pos.y2] as (number | null)[],
        [cfg.min, cfg.init, cfg.max] as (number | null)[],
      ],
      attrs: { ...attrs },
    });

    const labelId = nextElId('par');
    const spec: ParameterSpec = {
      value: cfg.init, min: cfg.min, max: cfg.max,
      precision: decimalsForStep(cfg.step), of: id,
    };
    const label: HeyGeoElement = {
      type: 'parameter', id: labelId,
      parents: [Number((pos.x2 + 0.25).toFixed(4)), pos.y2, parameterCaption(cfg.name, spec)],
      attrs: { name: cfg.name, fontSize: 14, strokeColor: ink(), parameter: spec },
    };
    const made = createElement(board, label, { ...board.objects });
    if (made.obj) elementsRef.current.push(label);

    board.update();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const slider = board.objects[id] as any;
    if (slider) {
      selectedRef.current = [slider];
      setSelDecorations(computeDecorations(selectedRef.current, board));
      onSelectionChange(selectedRef.current.map(toSelectedInfo));
    }
    onDirty();
    return true;
  }

  /**
   * Write what a pointer did to a slider back into the document: the ends it
   * was dragged by and the value the handle settled on. Both live only on the
   * board object until this runs.
   */
  function flushSliderChanges(): boolean {
    const board = boardRef.current;
    if (!board) return false;
    let changed = false;
    const round = (v: number) => Number(v.toFixed(4));
    for (const el of elementsRef.current) {
      if (el.type !== 'slider') continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const slider = board.objects[el.id] as any;
      if (!slider?.point1 || !slider?.point2) continue;
      const p1 = [round(slider.point1.X()), round(slider.point1.Y())];
      const p2 = [round(slider.point2.X()), round(slider.point2.Y())];
      const range = el.parents[2] as number[];
      const endsMoved = JSON.stringify(el.parents[0]) !== JSON.stringify(p1)
        || JSON.stringify(el.parents[1]) !== JSON.stringify(p2);
      // Moving the control must not change its number: JSXGraph re-projects the
      // handle as the baseline travels, and that projection is not the intent.
      const held = sliderValuesRef.current[el.id];
      const value = round(endsMoved && held !== undefined
        ? held
        : Number(slider.Value?.() ?? range[1]));
      if (endsMoved || Number(range[1]) !== value) {
        el.parents[0] = p1;
        el.parents[1] = p2;
        el.parents[2] = [Number(range[0]), value, Number(range[2])];
        // Put the handle back at the same fraction of the range: the glider
        // keeps that fraction across updates, whereas its raw coords do not.
        // The engine finishes its own pointer-up work after this listener, so
        // the correction lands on the next tick.
        if (endsMoved && held !== undefined) {
          const span = Number(range[2]) - Number(range[0]);
          const phase = span > 0 ? (held - Number(range[0])) / span : 0.5;
          setTimeout(() => {
            slider.highline?.point2?.setGliderPosition?.(phase);
            slider.setValue?.(value);
            board.update();
          }, 0);
        } else {
          slider.setValue?.(value);
        }
        changed = true;
      }
    }
    if (changed) onDirty();
    return changed;
  }

  /**
   * Number | New Parameter… — a value, not a control.
   *
   * Sketchpad keeps the two apart: a parameter is a number you type, drawn as
   * `name = value`, that a calculation or a marked map can read; a slider is the
   * JSXGraph handle Add Slider drops. The element stores the number and its
   * range, and the registry draws the caption from that descriptor.
   */
  function createParameter(cfg: ParameterConfig): boolean {
    const [x, y] = functionPlace(elementsRef.current);
    const spec: ParameterSpec = { value: cfg.value, min: cfg.min, max: cfg.max, precision: cfg.precision };
    return addObject({
      type: 'parameter',
      id: nextElId('par'),
      parents: [x, y, parameterCaption(cfg.name, spec)],
      attrs: {
        name: cfg.name,
        fontSize: 14,
        strokeColor: ink(),
        parameter: spec,
      },
    });
  }

  /** The properties dialog writes a parameter's number and range back. */
  function updateSelectedParameter(value: number, min: number, max: number, precision?: number): void {
    const board = boardRef.current;
    if (!board) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obj: any = selectedRef.current[0];
    const el = obj ? elementsRef.current.find((e) => e.id === obj.id) : null;
    const spec = el?.attrs?.parameter;
    if (!el || !isParameterSpec(spec)) return;
    saveSnapshot();
    // Keep the attrs object itself: the caption closure captured it, and reads
    // `attrs.parameter` on every update.
    const nextPrecision = precision !== undefined && Number.isFinite(precision)
      ? Math.min(6, Math.max(0, Math.round(precision)))
      : spec.precision;
    el.attrs.parameter = { ...spec, value, min, max, precision: nextPrecision };
    obj.parameterSpec = el.attrs.parameter;
    board.update();
    onSelectionChange(selectedRef.current.map(toSelectedInfo));
    onDirty();
  }

  /** Close the inline editor, keeping or dropping what was typed. */
  function commitParamEdit(commit: boolean) {
    const pe = paramEdit;
    setParamEdit(null);
    if (!pe || !commit) return;
    const board = boardRef.current;
    const el = elementsRef.current.find((e) => e.id === pe.id);
    const spec = el?.attrs?.parameter;
    if (!board || !el || !isParameterSpec(spec) || spec.of) return;
    const value = Number(pe.text.replace(',', '.'));
    if (!Number.isFinite(value)) return;
    const clamped = Math.min(spec.max, Math.max(spec.min, value));
    const precision = precisionOf(pe.text);
    if (clamped === spec.value && precision === spec.precision) return;
    saveSnapshot();
    el.attrs.parameter = { ...spec, value: clamped, precision };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (board.objects[pe.id] as any).parameterSpec = el.attrs.parameter;
    board.update();
    onSelectionChange(selectedRef.current.map(toSelectedInfo));
    onDirty();
  }

  /**
   * Number | Add Slider — the JSXGraph slider itself, dropped where New
   * Parameter would go and carrying the defaults its dialog opens on. It is
   * left picked, so the properties panel names the number it holds and the
   * designer can drag the knob straight away.
   */
  function addSlider(): boolean {
    const place = parameterPlace(elementsRef.current);
    const cfg = defaultSlider(elementsRef.current);
    return makeSlider(place, cfg);
  }

  /** The numbers the board shows, with what each one is worth right now. */
  function numberValues(): NumberValue[] {
    const board = boardRef.current;
    return numberSources(elementsRef.current).map((s) => {
      const measure = elementsRef.current
        .find((e) => e.id === s.id)?.attrs?.measure as MeasureSpec | undefined;
      const parameter = elementsRef.current
        .find((e) => e.id === s.id)?.attrs?.parameter;
      const slider = board?.objects[s.id] as { Value?: () => number } | undefined;
      const raw = measure ? measureValue(board, measure)
        : isParameterSpec(parameter) ? parameter.value
        : slider?.Value?.();
      return { ...s, value: typeof raw === 'number' && Number.isFinite(raw) ? raw : null };
    });
  }

  // ─── Coordinate system ──────────────────────────────────────────────────────
  /**
   * Draw the frame the two points describe, as one undo step.
   *
   * A frame is marked on its origin and drawn as two axes through it, so the
   * origin and unit point the designer already had keep their board objects and
   * gain only the mark in the document. Half a frame is not what was asked for,
   * so a failure takes the objects it made back with it.
   */
  function addFrame(board: JXGBoard, points: FramePoints): boolean {
    const made = frameElements(points, elementsRef.current);
    const live: Record<string, unknown> = { ...board.objects };
    const built: unknown[] = [];
    for (const el of made) {
      if (live[el.id]) continue;
      const { obj, error } = createElement(board, el, live);
      if (!obj) {
        built.forEach((o) => board.removeObject(o as never));
        onNotifyRef.current?.(error ?? `Không tạo được ${el.type}`);
        return false;
      }
      live[el.id] = obj;
      built.push(obj);
    }
    saveSnapshot();
    for (const el of made) {
      const at = elementsRef.current.findIndex((e) => e.id === el.id);
      if (at >= 0) elementsRef.current[at] = el;
      else elementsRef.current.push(el);
    }
    // the frame just made is the one measures and plots go onto, the way
    // Sketchpad marks the system it has just defined
    elementsRef.current = withMarkOnly(elementsRef.current, points.origin.id);
    board.update();
    onDirty();
    return true;
  }

  /** Where a board object stands, in the numbers the document keeps. */
  function liveCoords(id: string): [number, number] {
    const o = boardRef.current?.objects[id];
    return typeof o?.X === 'function'
      ? [Number(o.X().toFixed(4)), Number(o.Y().toFixed(4))]
      : [0, 0];
  }

  /**
   * The default frame: an origin in the middle of the page with its unit point one
   * board unit to the right. Sketchpad makes one for any Graph row that needs a
   * system and finds the sketch without one, so this is called from the rows that
   * plot as much as from Graph | Define Coordinate System.
   */
  /**
   * Sketchpad calls a default system’s origin O and its unit point 1. The unit
   * point is a datum of its system and keeps that name even when a second system
   * brings its own; the origin, which marks a place on the page, takes the next
   * free letter rather than putting a second O under the first.
   */
  function frameName(want: string): string {
    return elementsRef.current.some((e) => e.attrs?.name === want) ? nextPointName() : want;
  }

  function newCoordsys(): boolean {
    const board = boardRef.current;
    if (!board) return false;
    return addFrame(board, defaultFrame(
      nextElId('pt'), nextElId('pt'), frameName('O'), '1',
    ));
  }

  /**
   * Graph | Define Coordinate System, which is the row Sketchpad names after what
   * is picked: a point is an origin, two give the origin and the length of a unit
   * in the order they were clicked, a circle gives both its centre and its radius,
   * and one or two lengths set the scale on the page's own origin. Anything else —
   * a lone slider or nothing at all — takes the default system.
   */
  function defineCoordsys(): boolean {
    const board = boardRef.current;
    if (!board) return false;
    const plan = definePlan(elementsRef.current, selectedRef.current.map((o) => o.id));
    if (plan.kind === 'system') return newCoordsys();

    const nameOf = (id: string) => String(
      elementsRef.current.find((e) => e.id === id)?.attrs?.name ?? id);
    // a definition with no point in it stands on the middle of the page
    const originId = plan.points[0] ?? null;
    const origin: [number, number] = originId ? liveCoords(originId) : [0, 0];
    const originPoint = originId
      ? { id: originId, name: nameOf(originId), coords: origin }
      : { id: nextElId('pt'), name: frameName('O'), coords: origin };
    const newUnit = (coords: [number, number]) =>
      ({ id: nextElId('pt'), name: '1', coords });

    if (plan.kind === 'origin') {
      return addFrame(board, { origin: originPoint, unit: newUnit([origin[0] + 1, origin[1]]) });
    }
    if (plan.kind === 'unit') {
      const unitId = plan.points[1];
      return addFrame(board, {
        origin: originPoint,
        unit: { id: unitId, name: nameOf(unitId), coords: liveCoords(unitId) },
      });
    }
    if (plan.kind === 'circle') {
      const circle = elementsRef.current.find((e) => e.id === plan.circle);
      const radius = circleRadius(circle);
      const centreId = String(circle?.parents[0] ?? '');
      if (!radius || !centreId) return newCoordsys();
      const centre = liveCoords(centreId);
      return addFrame(board, {
        origin: { id: centreId, name: nameOf(centreId), coords: centre },
        unit: newUnit([centre[0] + radius, centre[1]]),
      });
    }
    // a picked length sets the horizontal unit, measured from the origin along it
    const across = plan.scale[0] ? lengthValueOf(board, plan.scale[0]) : null;
    if (!across) return newCoordsys();
    if (plan.kind === 'distance') {
      return addFrame(board, {
        origin: originPoint,
        unit: newUnit([origin[0] + across, origin[1]]),
      });
    }
    // two lengths make a rectangular frame: the second one is its own y spacing
    const up = plan.scale[1] ? lengthValueOf(board, plan.scale[1]) : null;
    if (!up) return newCoordsys();
    return addFrame(board, {
      origin: originPoint,
      unit: newUnit([origin[0] + across, origin[1]]),
      form: 'rectangular',
      vertical: [origin[0], origin[1] + up],
    });
  }

  /** The radius a circle draws right now: its rim point, or the length it was given. */
  function circleRadius(circle: HeyGeoElement | undefined): number | null {
    const board = boardRef.current;
    if (!board || !circle) return null;
    const [centreId, rimId] = circle.parents;
    if (typeof centreId !== 'string' || typeof rimId !== 'string') return null;
    const centre = liveCoords(centreId);
    const rim = board.objects[rimId];
    if (typeof rim?.X === 'function') {
      const reach = Math.hypot(rim.X() - centre[0], rim.Y() - centre[1]);
      return reach > 1e-9 ? reach : null;
    }
    return lengthValueOf(board, rimId);
  }

  /**
   * Graph | Mark Coordinate System: the frame the picked object belongs to is the
   * one the rest of the menu reads. The mark is document-only, so the board is told
   * to redraw its grid without the construction being rebuilt.
   */
  function markCoordsys(): boolean {
    const board = boardRef.current;
    if (!board) return false;
    const picked = selectedRef.current.map((o) => o.id);
    const updated = picked.reduce<HeyGeoElement[] | null>(
      (acc, id) => acc ?? withMark(elementsRef.current, id), null);
    if (!updated) return false;
    saveSnapshot();
    restoreScene({ ...currentScene(), elements: updated });
    return true;
  }

  // ─── Functions, their plots and plotted points ──────────────────────────────
  /** The desktop writes a function definition as a 14pt italic label. */
  const FUNCTION_STYLE = { strokeColor: '#333333', fontSize: 14, cssStyle: 'font-style: italic' };
  /** and plots it in purple, two units thick. */
  const PLOT_STYLE = { strokeColor: '#800080', strokeWidth: 2 };

  /**
   * Build one element, add it to the document as its own undo step and leave it
   * picked, the way the desktop's graph menu does: it ends with clearSel and
   * addSel, so the row that acts on what was just made is already answered.
   */
  function addObject(el: HeyGeoElement): boolean {
    const board = boardRef.current;
    if (!board) return false;
    const { obj, error } = createElement(board, el, { ...board.objects });
    if (!obj) {
      onNotifyRef.current?.(error ?? `Không tạo được ${el.type}`);
      return false;
    }
    saveSnapshot();
    elementsRef.current.push(el);
    board.update();
    selectedRef.current = [obj];
    setSelDecorations(computeDecorations(selectedRef.current, board));
    onSelectionChange(selectedRef.current.map(toSelectedInfo));
    onDirty();
    return true;
  }

  /**
   * Graph | New Function… — the definition the designer typed, shown on the page.
   *
   * What is stored is the formula as infix text plus its variable and domain, so
   * the caption reads back what was typed and Plot Function has something to draw
   * without the page ever compiling it.
   *
   * Graph | Plot New Function… is the same definition asked for as a curve: the
   * desktop plots it as soon as the Calculator closes, so `draw` goes on to draw
   * the definition the row was used to make.
   */
  function newFunction(expr: string, domain: [number, number], draw = false): boolean {
    const board = boardRef.current;
    if (!board) return false;
    const spec: FunctionSpec = { expr, variable: 'x', from: domain[0], to: domain[1] };
    const elements = elementsRef.current;
    const [x, y] = functionPlace(elements);
    const made = addObject({
      type: 'text',
      id: nextElId('fn'),
      parents: [x, y, functionCaption(nextFunctionName(elements), spec)],
      attrs: { ...FUNCTION_STYLE, func: spec },
    });
    // addObject leaves the new definition picked, which is what Plot Function reads
    return made && draw ? plotFunction() : made;
  }

  /**
   * Graph | Plot Function… — the picked definition drawn through the marked frame.
   *
   * The curve names the frame's three points as its parents and carries the
   * formula, so it is measured in the frame and re-scales when the designer drags
   * the unit point, exactly as Sketchpad's plot does.
   */
  function plotFunction(): boolean {
    const board = boardRef.current;
    if (!board) return false;
    const target = plotTarget(elementsRef.current, selectedRef.current.map((o) => o.id));
    const spec = target ? functionOf(elementsRef.current.find((e) => e.id === target)!) : null;
    if (!spec) {
      onNotifyRef.current?.('Cần một hàm số được chọn để vẽ.');
      return false;
    }
    // a curve has to be measured on something, and Sketchpad supplies the default
    // system rather than refusing the row
    if (!framePoints(elementsRef.current)) newCoordsys();
    const frame = framePoints(elementsRef.current);
    if (!frame) {
      onNotifyRef.current?.('Cần một hệ trục tọa độ để vẽ hàm số.');
      return false;
    }
    return addObject({
      type: 'plot',
      id: nextElId('plot'),
      parents: [...frame],
      attrs: { ...PLOT_STYLE, plot: plotOfFunction(spec) },
    });
  }

  /**
   * Graph | Plot Curve… — the pair x(t), y(t) the designer typed, drawn through
   * the marked frame.
   *
   * The desktop's graphPlotCurve makes a coordinate system when the page has none,
   * because the dialog carries everything else a parametric curve needs; the same
   * happens here through Graph | New Coordinate System, which is a document change
   * of its own and therefore an undo step beside the curve.
   */
  function plotCurve(spec: PlotSpec): boolean {
    if (!framePoints(elementsRef.current)) newCoordsys();
    const frame = framePoints(elementsRef.current);
    if (!frame) {
      onNotifyRef.current?.('Cần một hệ trục tọa độ để vẽ đường cong.');
      return false;
    }
    return addObject({
      type: 'plot',
      id: nextElId('plot'),
      parents: [...frame],
      attrs: { ...PLOT_STYLE, plot: spec },
    });
  }

  /**
   * Put a point where the frame says its two numbers are, as one undo step.
   *
   * The desktop's graphPlotAsXY reads the two picked values and translates a free
   * point to `mathToScreen(x, y)`. This keeps the same placing but writes the
   * dependency Sketchpad has: the point names the frame as its parents and its
   * `attrs.plotAt` keeps the two coordinates as the text that was typed or the
   * numbers that were picked, so it stays on the frame and follows the numbers
   * while the figure moves under them.
   */
  function addPlotPoint(spec: PlotPointSpec): boolean {
    // a point has to be measured on something, and Sketchpad supplies the default
    // system rather than refusing the row
    if (!framePoints(elementsRef.current)) newCoordsys();
    const frame = framePoints(elementsRef.current);
    if (!frame) {
      onNotifyRef.current?.('Cần một hệ trục tọa độ để vẽ điểm.');
      return false;
    }
    const problem = plotPointProblem(spec);
    if (problem) {
      onNotifyRef.current?.(`Không vẽ được điểm: ${problem}.`);
      return false;
    }
    // the desktop plots into a G_FREE_POINT, which is drawn like any other point
    return addObject({
      type: 'point',
      id: nextElId('pt'),
      parents: [...frame],
      attrs: {
        name: nextPointName(), ...pointStyle(),
        plotAt: spec,
      },
    });
  }

  /** Graph | Plot as (x, y)… with the two numbers the designer picked. */
  function plotPickedPair(): boolean {
    // on a polar system the same two numbers are a radius and a turn
    const shape = coordsysOf(elementsRef.current)?.grid === 'polar' ? 'polar' : 'rectangular';
    const pair = plotPair(
      numberSources(elementsRef.current), selectedRef.current.map((o) => o.id), shape);
    return pair === null ? false : addPlotPoint(pair);
  }

  /**
   * Graph | Plot Value on Path… — the value the dialog names, on the path it
   * names. A path makes the point a glider placed by the reading (a ratio along a
   * segment, a distance along a line, a whole turn round a circle), and the
   * document keeps the reading, so a parameter under it moves the point.
   */
  function plotValue(choice: PlotValueChoice): boolean {
    if (choice.path === null) {
      return addPlotPoint({ shape: 'rectangular', x: choice.value, y: '0', args: choice.args });
    }
    const path = elementsRef.current.find((e) => e.id === choice.path);
    if (!path || !isValuePath(path)) {
      onNotifyRef.current?.('Cần một đường để vẽ giá trị lên.');
      return false;
    }
    return addObject({
      type: 'glider',
      id: nextElId('pt'),
      // a glider names its path third; the first two are where it starts, which
      // the registry works out from the reading instead
      parents: [0, 0, path.id],
      attrs: {
        name: nextPointName(), ...pointStyle(),
        plotValue: {
          value: choice.value, args: choice.args,
          path: path.id, kind: path.type,
        },
      },
    });
  }

  /**
   * Graph | Plot Value on Path with what the designer picked: one value on one or
   * more paths, or several values on one path — Sketchpad plots the whole set.
   */
  function plotPickedValues(): boolean {
    const rows = plotValueRows(elementsRef.current, selectedRef.current.map((o) => o.id));
    if (!rows.immediate) return false;
    let made = false;
    if (rows.paths.length === 1) {
      for (const id of rows.values) {
        made = plotValue({ value: '#0', args: [id], path: rows.paths[0] }) || made;
      }
      return made;
    }
    for (const path of rows.paths) {
      made = plotValue({ value: '#0', args: [rows.values[0]], path }) || made;
    }
    return made;
  }

  /**
   * Graph | Plot as (x, y)… over the coordinates the designer typed.
   *
   * A number whose operand slot was deleted from a field is not a dependency of
   * the point, so the pair is pruned before it reaches the document.
   */
  function plotPoint(spec: PlotPointSpec): boolean {
    return addPlotPoint(prunePlotPoint(spec));
  }

  // ─── Action buttons ─────────────────────────────────────────────────────────
  /**
   * The press itself lives in the runtime the read-only viewer shares, so a
   * button a .gsp import brings in does the same thing on both pages. It is made
   * once and kept, because a move in flight has to go on running — and be
   * stoppable — while the designer carries on working.
   */
  const buttonRuntimeRef = useRef<ButtonRuntime | null>(null);
  function buttons(): ButtonRuntime {
    if (buttonRuntimeRef.current === null) {
      buttonRuntimeRef.current = createButtonRuntime({
        board: () => boardRef.current,
        elements: () => elementsRef.current,
        beginChange: saveSnapshot,
        changed: () => onDirtyRef.current(),
        animate: (spec, targets) => startAnimation(spec, targets),
        notify: (message) => onNotifyRef.current?.(message),
      });
    }
    return buttonRuntimeRef.current;
  }

  /**
   * Give up every clock that moves objects — the animation run and a button's
   * move or presentation — because a board about to be freed or restored cannot
   * have a frame still ticking on it.
   */
  function stopMotion(persist = true) {
    buttonRuntimeRef.current?.stop();
    stopAnimation(persist);
  }

  /** Drop a finished button into the sketch, in the column the others stand in. */
  function addButton(spec: ActionButtonSpec): boolean {
    const [x, y] = buttonPlace(elementsRef.current);
    return addObject({
      type: 'actionbutton',
      id: nextElId('btn'),
      parents: [x, y, buttonCaption(spec, false)],
      attrs: { button: spec },
    });
  }

  /**
   * Edit | Action Buttons | Hide/Show, Show or Hide — a button that changes the
   * visibility of what the designer selected.
   *
   * Sketchpad makes the button out of the selection and drops it in the sketch;
   * the button keeps the names of what it acts on, so the caption reads "Ẩn AB"
   * even after the point it names has been renamed away from its default. A
   * Hide/Show button flips, so it starts out about to hide what is on the page.
   */
  function createActionButton(action: ActionButtonAction = 'toggle'): boolean {
    const picked = new Set(selectedRef.current.map((o: { id: string }) => o.id));
    const targets = elementsRef.current.filter((e) => picked.has(e.id));
    if (targets.length === 0) {
      onNotifyRef.current?.('Cần chọn đối tượng cho nút hành động.');
      return false;
    }
    return addButton(newActionButton(action, targets));
  }

  /**
   * Edit | Action Buttons | Animation… — a button that sets its objects moving.
   *
   * The direction and speed the dialog was answered with are stored beside the
   * names, so pressing the button after a reload makes the same run. Only the
   * parts with a path or a range are named, because those are all a run can move.
   */
  function createAnimationButton(spec: AnimationSpec): boolean {
    const picked = new Set(selectedRef.current.map((o: { id: string }) => o.id));
    const targets = elementsRef.current.filter((e) => picked.has(e.id));
    if (!targets.some((t) => animatableKind(t) !== null)) {
      onNotifyRef.current?.('Cần chọn điểm trượt hoặc tham số cho nút chuyển động.');
      return false;
    }
    return addButton(newActionButton('animate', targets, { animation: spec }));
  }

  /**
   * Edit | Action Buttons | Movement… — Sketchpad takes the picked points in the
   * order they were picked and sends each one to the next, so four points are two
   * moves and an odd point out is left alone. The destination stays live: a move
   * towards a point that has since been dragged goes where it now is.
   */
  function createMovementButton(speed: MoveSpeed): boolean {
    const picked = new Set(selectedRef.current.map((o: { id: string }) => o.id));
    const points = elementsRef.current
      .filter((e) => picked.has(e.id) && isMovablePoint(e));
    const pairs = movePairs(points);
    if (pairs.length === 0) {
      onNotifyRef.current?.('Cần chọn ít nhất hai điểm cho nút di chuyển.');
      return false;
    }
    const movers = points.filter((_, i) => i % 2 === 0);
    const destinations = points.filter((_, i) => i % 2 === 1).map((p) => p.id);
    return addButton(newActionButton('move', movers, { move: { destinations, speed } }));
  }

  /**
   * Edit | Action Buttons | Presentation… — a button that presses the other
   * buttons in the order they were picked, one after another or all at once.
   */
  function createPresentButton(present: PresentSpec): boolean {
    const picked = new Set(selectedRef.current.map((o: { id: string }) => o.id));
    const targets = elementsRef.current.filter((e) => picked.has(e.id) && buttonOf(e) !== null);
    if (targets.length < 2) {
      onNotifyRef.current?.('Cần chọn từ hai nút hành động trở lên cho nút trình diễn.');
      return false;
    }
    return addButton(newActionButton('present', targets, { present }));
  }

  /** The button under these page pixels, if the click landed on one. */
  function actionButtonAt(sx: number, sy: number): { el: HeyGeoElement; obj: unknown } | null {
    const board = boardRef.current;
    if (!board) return null;
    for (const obj of findObjectsAt(board, sx, sy, ['text'], 10)) {
      const el = elementsRef.current.find((e) => e.id === obj.id);
      if (el && buttonOf(el)) return { el, obj };
    }
    return null;
  }

  // ─── Edit | Copy, Cut and Paste ─────────────────────────────────────────────
  // The clipboard is this page's own, not the system's: a copied sketch piece
  // is document data, and handing it to the OS would offer nothing useful back.
  const clipboardRef = useRef<Clipboard | null>(null);

  /** Remove the picked objects and everything built on them, as one undo step. */
  function deletePicked(): boolean {
    const board = boardRef.current;
    if (!board || selectedRef.current.length === 0) return false;
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
    return true;
  }

  /** Edit | Copy — the picks and everything they are built from go aside. */
  function copyPicked(): boolean {
    const ids = selectedRef.current.map((o: { id: string }) => o.id);
    if (ids.length === 0) {
      onNotifyRef.current?.('Cần chọn đối tượng để sao chép.');
      return false;
    }
    const elements = copyClosure(elementsRef.current, ids);
    clipboardRef.current = { elements, pastes: 0 };
    onNotifyRef.current?.(`Đã sao chép ${elements.length} đối tượng.`);
    return true;
  }

  /** Edit | Cut — the copy a paste would make, with the picks taken away. */
  function cutPicked(): boolean {
    return copyPicked() && deletePicked();
  }

  /**
   * Edit | Paste — build the clipboard's construction again under fresh ids, one
   * undo step for the whole paste, with the copies picked so a drag moves them.
   */
  function pasteClip(): boolean {
    const board = boardRef.current;
    const clip = clipboardRef.current;
    if (!board || !clip || clip.elements.length === 0) {
      onNotifyRef.current?.('Bộ nhớ tạm đang trống.');
      return false;
    }
    const pasted = pasteElements(clip.elements, (el) => nextElId(el.type || 'el'), pasteOffset(clip.pastes + 1));
    saveSnapshot();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const made: any[] = [];
    for (const el of pasted) {
      const { obj, error } = createElement(board, el, { ...board.objects });
      if (!obj) {
        onNotifyRef.current?.(error ?? `Không dán được ${el.type}`);
        break;
      }
      elementsRef.current.push(el);
      made.push(obj);
    }
    if (made.length === 0) {
      // nothing was made, so the step taken for the paste would undo nothing
      undoStack.current.pop();
      return false;
    }
    clip.pastes += 1;
    board.update();
    selectedRef.current = made;
    setSelDecorations(computeDecorations(selectedRef.current, board));
    onSelectionChange(selectedRef.current.map(toSelectedInfo));
    onDirty();
    return true;
  }

  // ─── Display | Animate Objects… ─────────────────────────────────────────────

  /** Put one object at the phase a tick just computed. */
  function applyAnimationPhase(board: JXGBoard, target: RunningAnimation['targets'][number]) {
    const obj = board.objects?.[target.el.id];
    if (!obj) {
      // the object went away mid-run (deleted or rebuilt): there is nothing left to move
      target.state = { ...target.state, done: true };
      return;
    }
    if (target.kind === 'glider') {
      obj.setGliderPosition?.(target.state.phase);
      return;
    }
    const range = sliderRange(target.el);
    if (!range) return;
    obj.setValue?.(range[0] + target.state.phase * (range[1] - range[0]));
  }

  /**
   * Stop the clock. A stopped run hands its final places to the document: a glider
   * through the coordinates syncPositions already writes, a parameter through its
   * stored `[min, value, max]`. Undo goes back to the whole run at once because
   * the snapshot was taken when it started, not once a frame.
   */
  function stopAnimation(persist = true) {
    const run = animationRef.current;
    if (!run) return;
    cancelAnimationFrame(run.raf);
    animationRef.current = null;
    if (!persist) return;
    const board = boardRef.current;
    if (board) {
      syncPositions(elementsRef.current, board);
      for (const target of run.targets) {
        if (target.kind !== 'slider') continue;
        const value = (board.objects?.[target.el.id] as { Value?: () => number } | undefined)?.Value?.();
        const parents = value === undefined ? null : withSliderValue(target.el, value);
        if (parents) target.el.parents = parents as HeyGeoElement['parents'];
      }
    }
    onDirtyRef.current();
  }

  /**
   * Display | Animate Objects… — set the selected gliders travelling along their
   * paths and the selected parameters sweeping their ranges. One undo step covers
   * the whole run; Stop (or the end of a once-only run) writes down where things
   * came to rest.
   */
  function startAnimation(spec: AnimationSpec, ids?: string[]): boolean {
    const board = boardRef.current;
    if (!board) return false;
    const problem = animationProblem(spec);
    if (problem) {
      onNotifyRef.current?.(problem);
      return false;
    }
    const els = animatables(
      elementsRef.current,
      ids ?? selectedRef.current.map((o: { id: string }) => o.id),
    );
    if (els.length === 0) {
      onNotifyRef.current?.('Cần chọn điểm trượt hoặc tham số để làm chuyển động.');
      return false;
    }

    const targets: RunningAnimation['targets'] = [];
    for (const el of els) {
      const obj = board.objects?.[el.id];
      if (!obj) continue;
      if (el.type === 'glider') {
        targets.push({
          el, kind: 'glider',
          state: startState(Number(obj.position), spec.direction),
        });
        continue;
      }
      const range = sliderRange(el);
      if (!range) continue;
      const value = (obj as { Value?: () => number }).Value?.() ?? range[0];
      targets.push({
        el, kind: 'slider',
        state: startState((value - range[0]) / (range[1] - range[0]), spec.direction),
      });
    }
    if (targets.length === 0) return false;

    // the run being replaced is read before it is dropped, so its last places
    // still seed this one; only then does it give the clock up
    stopAnimation(false);
    saveSnapshot();

    const run: RunningAnimation = {
      raf: 0, last: performance.now(),
      spec: { ...spec, speed: animationSpeed(spec.speed) },
      targets,
    };
    animationRef.current = run;

    const frame = (now: number) => {
      if (animationRef.current !== run) return;
      // a tab that was asleep hands back a huge gap; one frame is a tenth of a second at most
      const dt = Math.min(0.1, Math.max(0, (now - run.last) / 1000));
      run.last = now;
      let alive = false;
      for (const target of run.targets) {
        target.state = advanceAnimation(target.state, run.spec, dt);
        applyAnimationPhase(board, target);
        if (!target.state.done) alive = true;
      }
      board.update();
      if (!alive) { stopAnimation(true); return; }
      run.raf = requestAnimationFrame(frame);
    };
    run.raf = requestAnimationFrame(frame);
    onDirtyRef.current();
    return true;
  }

  /** Display | Increase Speed and Decrease Speed, while something is running. */
  function scaleAnimationSpeed(factor: number) {
    const run = animationRef.current;
    if (!run) return;
    run.spec = { ...run.spec, speed: animationSpeed(run.spec.speed * factor) };
  }

  // ─── The frame's grid ───────────────────────────────────────────────────────

  /**
   * The grid is furniture, not an object of the construction: JSXGraph's own grid
   * and ticks follow the board's axes, while a sketch coordinate system is drawn
   * about its marked origin. So it is painted as plain SVG, mounted as the board
   * container's first child — under JSXGraph's elements the way the desktop paints
   * it under the construction, and unable to take a click.
   */
  function gridParts(board: JXGBoard): GridParts | null {
    const container = board.containerObj as HTMLElement | undefined;
    if (!container) return null;
    const held = gridPartsRef.current;
    if (held && held.layer.parentNode === container) return held;

    let layer = container.querySelector('svg[data-frame-grid]') as SVGSVGElement | null;
    if (!layer) {
      layer = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
      layer.setAttribute('data-frame-grid', '');
      layer.setAttribute(
        'style',
        'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none',
      );
      container.insertBefore(layer, container.firstChild);
    }
    const path = (stroke: string, dash: string): SVGPathElement => {
      const p = document.createElementNS(SVG_NS, 'path') as SVGPathElement;
      p.setAttribute('stroke', stroke);
      p.setAttribute('stroke-width', '1');
      p.setAttribute('fill', 'none');
      p.setAttribute('stroke-dasharray', dash);
      return p;
    };
    const furniture = path(GRID_INK, 'none');
    const ticks = path(TICK_INK, 'none');
    const labels = document.createElementNS(SVG_NS, 'g') as SVGGElement;
    layer.replaceChildren(furniture, ticks, labels);
    // A layer this board has not seen yet has nothing drawn on it, so the first
    // picture always goes out.
    const parts: GridParts = { layer, furniture, ticks, labels, key: '\u0000' };
    gridPartsRef.current = parts;
    return parts;
  }

  /** The visible span, in the [minX, minY, maxX, maxY] order the grid model reads. */
  function viewboxOf(board: JXGBoard): Viewbox {
    const [x1, y1, x2, y2] = board.getBoundingBox() as number[];
    return [x1, Math.min(y1, y2), x2, Math.max(y1, y2)];
  }

  /** Where a frame's point stands on the board right now. */
  function boardCoords(board: JXGBoard, id: string): [number, number] | null {
    const o = board.objects[id];
    return typeof o?.X === 'function' ? [o.X(), o.Y()] : null;
  }

  /** The marked frame, its scale, and the grid it implies — null when there is none. */
  function frameOnBoard(board: JXGBoard) {
    const sys = coordsysOf(elementsRef.current);
    if (!sys) return null;
    const origin = boardCoords(board, sys.origin);
    const unit = boardCoords(board, sys.unit);
    if (!origin || !unit) return null;
    const geo = frameGeometry(origin, unit, boardCoords(board, `${sys.origin}_v`), sys.grid);
    if (!isMeasurable(geo)) return null;
    return {
      sys, geo,
      plan: planGrid(viewboxOf(board), geo, sys.grid, board.unitX, sys.showGrid),
    };
  }

  /**
   * Everything the picture is drawn from. Rounded to the pixel and to a hundredth
   * of a board unit, so the check that keeps a 60 fps loop off the DOM misses
   * nothing the eye can tell.
   */
  function frameSignature(board: JXGBoard): string {
    const sys = coordsysOf(elementsRef.current);
    if (!sys) return '';
    const at = (id: string) => {
      const c = boardCoords(board, id);
      return c ? `${c[0].toFixed(2)} ${c[1].toFixed(2)}` : '?';
    };
    return [
      sys.origin, sys.unit, sys.grid, sys.showGrid ? 1 : 0, sys.snap ? 1 : 0,
      sys.dotted ? 1 : 0, sys.hidden ? 1 : 0,
      at(sys.origin), at(sys.unit), at(`${sys.origin}_v`),
      ...(board.getBoundingBox() as number[]).map((v) => v.toFixed(2)),
      Math.round(board.unitX),
    ].join(' ');
  }

  /**
   * Keep the grid in step with its frame. The decoration loop calls this, so a
   * drag, a pan, a zoom, an undo or a resize redraws it without each of them
   * having to remember to.
   */
  function refreshFrameGrid(board: JXGBoard): void {
    const parts = gridParts(board);
    if (!parts) return;
    const key = `${frameSignature(board)} ${foregroundRef.current}`;
    if (key === parts.key) return;
    parts.key = key;

    const f = frameOnBoard(board);
    const zero = board.origin?.scrCoords as number[] | undefined;
    if (!f || !zero || f.sys.hidden) {
      parts.furniture.removeAttribute('d');
      parts.ticks.removeAttribute('d');
      parts.labels.replaceChildren();
      return;
    }

    const marks = gridInk(
      viewboxOf(board), f.geo, f.plan,
      [zero[1], zero[2]], [board.unitX, board.unitY], f.sys.dotted,
    );
    const tickInk = foregroundRef.current;
    // A dotted grid is the same path drawn with a round pen, so each zero-length
    // step of it is a dot where two grid lines would have crossed.
    parts.furniture.setAttribute('stroke-dasharray', 'none');
    parts.furniture.setAttribute('stroke-linecap', marks.dots ? 'round' : 'butt');
    parts.furniture.setAttribute('stroke-width', marks.dots ? '2.5' : '1');
    parts.furniture.setAttribute('d', marks.furniture);
    parts.ticks.setAttribute('stroke', tickInk);
    parts.ticks.setAttribute('d', marks.ticks);
    parts.labels.replaceChildren(...marks.labels.map((l) => {
      const place = LABEL_PLACEMENT[l.side];
      const text = document.createElementNS(SVG_NS, 'text') as SVGTextElement;
      text.setAttribute('x', String(l.x));
      text.setAttribute('y', String(l.y));
      text.setAttribute('text-anchor', place.anchor);
      text.setAttribute('dominant-baseline', place.baseline);
      text.setAttribute('fill', tickInk);
      text.setAttribute('font-size', String(GRID_FONT.size));
      text.setAttribute('font-family', GRID_FONT.family);
      text.textContent = l.text;
      return text;
    }));
  }

  /** Where Graph | Snap Points puts a point of the construction. */
  function snapToFrame(board: JXGBoard, point: [number, number]): [number, number] | null {
    if (!coordsysOf(elementsRef.current)?.snap) return null;
    const f = frameOnBoard(board);
    return f ? snapToGrid(point, f.geo, f.plan) : null;
  }

  /**
   * Graph | Snap Points: a dragged point stops on the grid rather than under the
   * cursor. The frame's own points are left free — a unit point held to its grid
   * crossing could not be dragged to a new length at all — and so is a transform
   * or a group drag, which moves its points from the pointer, not from one point.
   */
  function snapDuringDrag(board: JXGBoard, obj: { id: string; elType: string; X: () => number; Y: () => number })
    : [number, number] | null {
    const sys = coordsysOf(elementsRef.current);
    if (!sys?.snap || obj.elType !== 'point') return null;
    if (obj.id === sys.origin || obj.id === sys.unit || obj.id === `${sys.origin}_v`) return null;
    if (arrowRef.current !== 'translate' || selectedRef.current.length > 1) return null;
    return snapToFrame(board, [obj.X(), obj.Y()]);
  }

  /**
   * A frame held by the pointer keeps its shape. Dragging its unit point slides it
   * along the axis it was made on, so the drag changes the length of a unit and
   * nothing else; dragging its origin carries the unit point with it, so the system
   * travels without turning or rescaling. Both are held against the direction the
   * document states, which is the one every curve, grid and coordinate on the frame
   * is already measured by — a frame that swivelled under the cursor would leave
   * the plot of a function standing where it was while its axes turned away.
   */
  function holdFrameDrag(board: JXGBoard, obj: { id: string; moveTo: (p: [number, number]) => unknown }) {
    const live = (id: string) => board.objects[id];
    const onAxis = unitOnAxis(elementsRef.current, live, obj.id);
    if (onAxis) { obj.moveTo(onAxis); return; }
    const carry = originCarriesUnit(elementsRef.current, live, obj.id);
    if (carry) board.objects[carry.id]?.moveTo(carry.coords);
  }

  /**
   * The frame a grid row is about to change. Sketchpad makes a default system when
   * a grid command finds the sketch without one, so the row is never dead — it just
   * costs the designer one more undo step than a sketch that already has a frame.
   */
  function frameForGrid(): Coordsys | null {
    if (!coordsysOf(elementsRef.current)) newCoordsys();
    return coordsysOf(elementsRef.current);
  }

  /**
   * The grid settings live on the frame's mark, and a rectangular frame keeps its
   * own y-direction point, so changing the form rebuilds those two. The key of a
   * construction covers the mark, so the scene planner tears down and rebuilds the
   * frame subtree by itself — which is what a point that stops being welded to the
   * unit point needs.
   */
  function changeGrid(next: Partial<Pick<Coordsys, 'grid' | 'showGrid' | 'snap' | 'dotted' | 'hidden'>>): boolean {
    const board = boardRef.current;
    if (!board) return false;
    // A grid belongs to a system, so a grid command on a sketch without one gets
    // the default system first — which is what Sketchpad does.
    if (!coordsysOf(elementsRef.current) && !newCoordsys()) return false;
    const updated = withGrid(
      elementsRef.current,
      next,
      // The document keeps four decimals off the board, the way a drag writes back.
      (id) => {
        const at = boardCoords(board, id);
        return at ? [Number(at[0].toFixed(4)), Number(at[1].toFixed(4))] : null;
      },
    );
    if (!updated) return false;
    saveSnapshot();
    restoreScene({ ...currentScene(), elements: updated });
    return true;
  }

  /** Graph | Grid Form, one row per form; the current one is the checked row. */
  function setGridForm(form: GridForm): boolean {
    return changeGrid({ grid: form });
  }

  /** Graph | Hide Show Grid, for the frame's own grid — not the page's. */
  function toggleFrameGrid(): boolean {
    const sys = frameForGrid();
    return sys ? changeGrid({ showGrid: !sys.showGrid }) : false;
  }

  /** Graph | Dotted Grid: the same grid, drawn where its lines cross. */
  function toggleFrameDotted(): boolean {
    const sys = frameForGrid();
    return sys ? changeGrid({ dotted: !sys.dotted }) : false;
  }

  /**
   * Graph | Show/Hide Coordinate System — the row Shift shows in place of Show
   * Grid. It takes the whole system off the page: grid, axes, origin and names.
   */
  function toggleCoordsysShown(): boolean {
    const sys = coordsysOf(elementsRef.current);
    if (!sys) return newCoordsys();
    return changeGrid({ hidden: !sys.hidden });
  }

  /** Graph | Snap Points. */
  function toggleSnap(): boolean {
    const sys = frameForGrid();
    return sys ? changeGrid({ snap: !sys.snap }) : false;
  }

  // ─── Rebuild board from elements[] ────────────────────────────────────────
  // Used when a whole new document arrives; a snapshot restore goes through
  // restoreScene instead.
  function rebuildBoard(els: HeyGeoElement[], bb?: [number, number, number, number]) {
    const board = boardRef.current;
    if (!board) return;
    // the board about to be freed is what a run was moving objects on
    stopMotion(false);
    // Free & re-init
    jxg().JSXGraph.freeBoard(board);
    const meta = metaRef.current;
    const newBoard = jxg().JSXGraph.initBoard(BOARD_ID, {
      // a document that names its own view — a .gsp page spans hundreds of
      // units — is shown where it was drawn, not clipped to the default ±8
      boundingbox: bb ?? [-8, 8, 8, -8],
      axis: true,
      grid: true,
      showCopyright: false,
      showNavigation: true,
      keepaspectratio: true,
      resize: { enabled: true, throttle: 50 },
      pan: { enabled: false },
      zoom: { wheel: toolRef.current === 'selection', min: 0.1, max: 50 },
      showInfobox: false,
    });
    boardRef.current = newBoard;
    attachBoardEvents(newBoard); // must be before loadDataToBoard so events attach to all elements
    const { loaded, errors } = loadDataToBoard(newBoard, { ...emptyData(), elements: els });
    elementsRef.current = loaded;
    plotValuesRef.current.clear();
    seedCounters(loaded);
    reportLoadErrors(errors);
    setSceneChrome(newBoard, meta);
    selectedRef.current = [];
    onSelectionChange([]);
    setSelDecorations([]);
    pendingRef.current = { phase: 'idle' };
    syncTickMarksFromElements(newBoard);
  }

  // ─── Rubber-band selection + middle-mouse pan ────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Pan via middle mouse button (mirrors Desktop: e->button() == Qt::MiddleButton → PAN_DRAG)
    let panActive = false;
    let panStartX = 0, panStartY = 0;
    let panBB: [number, number, number, number] | null = null;

    function getLocalXY(evt: { clientX: number; clientY: number }): { sx: number; sy: number } {
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
      // On a Mac, Ctrl+click is the Context-menu gesture — GSP's own spelling of
      // right-click — so it must not clear the selection or start a rubber band.
      if (evt.ctrlKey && /Mac/.test(navigator.platform)) return;
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
      // A parameter label follows the pointer while it is dragged.
      const pd = paramDragRef.current;
      if (pd) {
        const board = boardRef.current;
        const el = elementsRef.current.find((e) => e.id === pd.id);
        const holder = el ? (el as unknown as { parameterPos?: { x: number; y: number } }).parameterPos : null;
        if (!board || !holder) return;
        const at = board.getUsrCoordsOfMouse(evt);
        const nx = pd.from[0] + (at[0] - pd.start[0]);
        const ny = pd.from[1] + (at[1] - pd.start[1]);
        if (!pd.started && Math.hypot(nx - pd.from[0], ny - pd.from[1]) > 0.01) {
          saveSnapshot();
          pd.started = true;
        }
        holder.x = nx;
        holder.y = ny;
        board.update();
        return;
      }

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
      // A parameter label that was dragged lands in the document.
      const pd = paramDragRef.current;
      if (pd) {
        paramDragRef.current = null;
        const board = boardRef.current;
        const el = elementsRef.current.find((e) => e.id === pd.id);
        const holder = el ? (el as unknown as { parameterPos?: { x: number; y: number } }).parameterPos : null;
        if (board && el && holder) {
          const nx = Number(holder.x.toFixed(4));
          const ny = Number(holder.y.toFixed(4));
          holder.x = nx;
          holder.y = ny;
          if (pd.started && (el.parents[0] !== nx || el.parents[1] !== ny)) {
            el.parents[0] = nx;
            el.parents[1] = ny;
            onDirty();
          }
        }
        return;
      }

      // Middle-mouse pan end
      if (evt.button === 1 && panActive) {
        panActive = false;
        panBB = null;
        container!.style.cursor = '';
        return;
      }

      // A click that stayed put on a selected object takes it out of the selection.
      const toggle = toggleOnUpRef.current;
      if (toggle) {
        toggleOnUpRef.current = null;
        if (Math.hypot(evt.clientX - toggle.x, evt.clientY - toggle.y) < 4) {
          deselectObject(toggle.obj);
        }
      }

      if (!rubberRef.current.active) return;
      finishRubberBand();
    }

    /** Finish the rubber band: everything inside it becomes the selection. */
    function finishRubberBand() {
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
            if (POINT_ELTS.includes(obj.elType)) {
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
            } else if (obj.elType === 'curve' || obj.elType === 'tracecurve'
              || obj.elType === 'functiongraph') {
              // a curve counts as caught when any stretch of it runs through the box
              const pts = obj.points ?? [];
              for (let k = 0; k < pts.length; k += 3) {
                const sc = pts[k]?.scrCoords;
                if (sc && sc[1] >= rb.x && sc[1] <= rb.x + rb.w &&
                          sc[2] >= rb.y && sc[2] <= rb.y + rb.h) { inside = true; break; }
              }
            } else if (obj.elType === 'text'
              && elementsRef.current.some((e) => e.id === obj.id && isAnchorSpec(e.attrs?.anchor))) {
              // a measurement caption is picked up by its own place
              const sc = obj.coords?.scrCoords;
              if (sc) inside = sc[1] >= rb.x && sc[1] <= rb.x + rb.w &&
                                        sc[2] >= rb.y && sc[2] <= rb.y + rb.h;
            } else if (obj.elType === 'arc') {
              // An arc is picked up by any of the three points that define it
              inside = [obj.center, obj.radiuspoint, obj.anglepoint].some((p) => {
                const sc = p?.coords?.scrCoords;
                return sc && sc[1] >= rb.x && sc[1] <= rb.x + rb.w &&
                             sc[2] >= rb.y && sc[2] <= rb.y + rb.h;
              });
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

    /**
     * Touch answers the same gestures as the mouse for the parts the browser
     * does not synthesise: a drag on empty canvas draws the rubber band instead
     * of scrolling the page, and two fingers are left to the board's own pinch
     * zoom. A touch that lands on a shape is left alone, so JSXGraph still
     * drags the point or line under the finger.
     */
    const onEmptyCanvas = (target: EventTarget | null): boolean => {
      const el = target as Element | null;
      if (!el || !el.tagName) return false;
      const tag = el.tagName.toLowerCase();
      // The board's own root SVG and the grid layer are the page; a shape is a
      // path, circle or text, and a label is an HTML label — never empty space.
      if (tag === 'svg') return true;
      if (tag === 'div') return el.id === BOARD_ID || el.classList.contains('jxgbox');
      return false;
    };

    function onTouchStart(evt: TouchEvent) {
      if (toolRef.current !== 'selection') return;
      if (evt.touches.length !== 1) return;
      if (!onEmptyCanvas(evt.target)) return;
      const t = evt.changedTouches[0];
      if (!t) return;
      const { sx, sy } = getLocalXY(t);
      clearSelection();
      rubberRef.current = { active: true, startX: sx, startY: sy, curX: sx, curY: sy };
      evt.preventDefault();
    }

    function onTouchMove(evt: TouchEvent) {
      if (!rubberRef.current.active) return;
      const t = evt.touches[0];
      if (!t) return;
      const { sx, sy } = getLocalXY(t);
      rubberRef.current.curX = sx;
      rubberRef.current.curY = sy;
      const x = Math.min(rubberRef.current.startX, sx);
      const y = Math.min(rubberRef.current.startY, sy);
      const w = Math.abs(sx - rubberRef.current.startX);
      const h = Math.abs(sy - rubberRef.current.startY);
      if (w > 3 || h > 3) setRubberBand({ x, y, w, h });
      evt.preventDefault();
    }

    function onTouchEnd(evt: TouchEvent) {
      if (!rubberRef.current.active) return;
      // Stopping the touch here also suppresses the mouse events the browser
      // would replay afterwards, which would clear what the band just picked.
      if (evt.cancelable) evt.preventDefault();
      finishRubberBand();
    }

    /**
     * A parameter's caption is an HTML label, and JSXGraph's labels are not
     * draggable; this press starts the drag, and stops the engine from treating
     * it as the start of a rubber band or a value change.
     */
    function labelElement(evt: Event): { div: HTMLElement; el: HeyGeoElement } | null {
      const div = (evt.target as Element | null)?.closest?.('.JXGtext') as HTMLElement | null;
      if (!div || !div.id.startsWith(`${BOARD_ID}_`)) return null;
      const id = div.id.slice(BOARD_ID.length + 1);
      const el = elementsRef.current.find((e) => e.id === id);
      return el ? { div, el } : null;
    }

    /** Open the in-place value editor over a parameter's caption. */
    function openParameterEditor(div: HTMLElement, el: HeyGeoElement) {
      const spec = el.attrs?.parameter;
      // A caption bound to a slider shows the slider's number; edit that there.
      if (!isParameterSpec(spec) || spec.of) return;
      const rect = div.getBoundingClientRect();
      const frame = container!.getBoundingClientRect();
      setParamEdit({
        id: el.id,
        text: String(spec.value),
        left: rect.left - frame.left,
        top: rect.bottom - frame.top + 2,
        width: Math.max(64, rect.width),
      });
    }

    function onParameterLabelDown(evt: MouseEvent) {
      if (toolRef.current !== 'selection' || evt.button !== 0) return;
      const hit = labelElement(evt);
      if (!hit || hit.el.type !== 'parameter') return;
      // JSXGraph's own pointerdown already ran and, seeing a picked object, armed
      // a toggle that would deselect on release. Taking the press over cancels it.
      toggleOnUpRef.current = null;
      justAddedRef.current = null;
      // The second press of a double-click edits the value. Detecting it from
      // the press itself is what works here: the engine's mousedown handlers
      // are kept out, and with them the browser's own dblclick synthesis.
      if (evt.detail >= 2) {
        evt.preventDefault();
        evt.stopPropagation();
        openParameterEditor(hit.div, hit.el);
        return;
      }
      const board = boardRef.current;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const obj = board?.objects[hit.el.id] as any;
      if (!board || !obj) return;
      evt.preventDefault();
      evt.stopPropagation();
      if (!selectedRef.current.includes(obj)) handleObjectClick(obj, true);
      // The text's place lives in a holder the registry builds from the
      // document's parent numbers; make sure it exists before the drag.
      const el = hit.el as unknown as { parameterPos?: { x: number; y: number } };
      if (!el.parameterPos) {
        el.parameterPos = {
          x: Number(obj.coords?.usrCoords?.[1] ?? 0),
          y: Number(obj.coords?.usrCoords?.[2] ?? 0),
        };
      }
      const at = board.getUsrCoordsOfMouse(evt);
      const from: [number, number] = [el.parameterPos.x, el.parameterPos.y];
      paramDragRef.current = { id: hit.el.id, start: [at[0], at[1]], from, started: false };
      objectClickedRef.current = true;
    }

    function onParameterLabelDblClick(evt: MouseEvent) {
      const hit = labelElement(evt);
      if (!hit || hit.el.type !== 'parameter') return;
      evt.preventDefault();
      evt.stopPropagation();
      openParameterEditor(hit.div, hit.el);
    }

    container.addEventListener('mousedown', onMouseDown);
    container.addEventListener('mousedown', onParameterLabelDown, true);
    container.addEventListener('dblclick', onParameterLabelDblClick, true);
    container.addEventListener('auxclick', (e) => { if (e.button === 1) e.preventDefault(); });
    container.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup',   onMouseUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend',  onTouchEnd);
    return () => {
      container.removeEventListener('mousedown', onMouseDown);
      container.removeEventListener('mousedown', onParameterLabelDown, true);
      container.removeEventListener('dblclick', onParameterLabelDblClick, true);
      container.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup',   onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend',  onTouchEnd);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep a ref to current rubberBand state for use inside mouseup event closure
  const rubberBandRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  useEffect(() => { rubberBandRef.current = rubberBand; }, [rubberBand]);

  useEffect(() => { menuRef.current = menu; }, [menu]);

  // A click anywhere outside the open Context menu dismisses it, as a native
  // menu would; the click that opened it arrived before this listener existed.
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      if (!(e.target as Element)?.closest('[data-context-menu]')) setMenu(null);
    };
    window.addEventListener('mousedown', onDown, true);
    return () => window.removeEventListener('mousedown', onDown, true);
  }, [menu]);

  // ─── Decoration interval loop ─────────────────────────────────────────────
  // Runs at ~60 fps to keep SVG decorators in sync as points are dragged / board panned.
  useEffect(() => {
    let tick = 0;
    const id = setInterval(() => {
      const board = boardRef.current;
      if (!board) return;
      if (selectedRef.current.length > 0) {
        setSelDecorations(computeDecorations(selectedRef.current, board));
      }
      // A family of lines follows its driver while the page changes. On the frame
      // after a drag event it is re-sampled at full quality, which is what makes
      // a drag look smooth; the slower sweep below catches changes no drag reported.
      tick += 1;
      if (locusDirtyRef.current) {
        locusDirtyRef.current = false;
        if (refreshLineLocuses(board)) board.update();
      } else if (tick % 10 === 0 && refreshLineLocuses(board)) {
        board.update();
      }
      const next = readCenterMark(board);
      if (next?.key !== centerMarkRef.current?.key) {
        centerMarkRef.current = next;
        setCenterMark(next);
      }
      // A value plotted on a path follows the number under it, which the engine
      // has no reason to know is a dependency of the point.
      if (syncPlotValues(board, elementsRef.current, plotValuesRef.current,
        (id) => numberValueOf(board, id))) {
        board.update();
      }
      refreshFrameGrid(board);
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

  // ─── Dragging captions and labels ─────────────────────────────────────────
  /** The measurement caption under a screen point, if there is one. */
  function captionAt(sx: number, sy: number): HeyGeoElement | null {
    const board = boardRef.current;
    if (!board) return null;
    for (const el of elementsRef.current) {
      if (el.type !== 'text' || !isAnchorSpec(el.attrs?.anchor)) continue;
      const obj = board.objects[el.id];
      if (!obj || obj.visProp?.visible === false) continue;
      if (obj.hasPoint?.(sx, sy)) return el;
    }
    return null;
  }

  /**
   * A caption's place is a closure over the figure it measures, so JSXGraph
   * cannot drag it. The pointer adds a live shift on top of that closure; on
   * release the shift is folded into the anchor offsets and the caption rebuilt.
   */
  function beginCaptionDrag(el: HeyGeoElement, evt: { clientX: number; clientY: number }) {
    const board = boardRef.current;
    const obj = board?.objects[el.id];
    const anchor = el.attrs?.anchor;
    if (!board || !obj || !isAnchorSpec(anchor)) return;
    const baseX = obj.XEval;
    const baseY = obj.YEval;
    const drag = {
      id: el.id, startX: evt.clientX, startY: evt.clientY,
      dx0: anchor.dx ?? 0, dy0: anchor.dy ?? 0,
      shift: [0, 0] as [number, number], moved: false,
    };
    captionDragRef.current = drag;
    obj.XEval = () => baseX.call(obj) + drag.shift[0];
    obj.YEval = () => baseY.call(obj) + drag.shift[1];

    const onMove = (e: PointerEvent) => {
      const px = e.clientX - drag.startX;
      const py = e.clientY - drag.startY;
      if (!drag.moved && Math.hypot(px, py) < 3) return;
      drag.moved = true;
      drag.shift = [px / board.unitX, -py / board.unitY];
      board.update();
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('pointerup', onUp, true);
      window.removeEventListener('pointercancel', onUp, true);
      captionDragRef.current = null;
      if (!drag.moved) {
        obj.XEval = baseX;
        obj.YEval = baseY;
        return;
      }
      const live = elementsRef.current.find((e) => e.id === drag.id);
      const liveAnchor = live?.attrs?.anchor;
      if (!live || !isAnchorSpec(liveAnchor)) return;
      const round = (v: number) => Number(v.toFixed(4));
      const before = currentScene();
      live.attrs.anchor = {
        ...liveAnchor,
        dx: round(drag.dx0 + drag.shift[0]),
        dy: round(drag.dy0 + drag.shift[1]),
      };
      const after = currentScene();
      pushCapped(undoStack.current, before);
      redoStack.current = [];
      const { elements, errors } = applyScene(board, after, planScene(before, after));
      elementsRef.current = elements;
      reportLoadErrors(errors);
      keepSelection(board);
      onDirty();
    };
    window.addEventListener('pointermove', onMove, true);
    window.addEventListener('pointerup', onUp, true);
    window.addEventListener('pointercancel', onUp, true);
  }

  /** The label under a screen point, if the designer can drag it. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function labelAt(sx: number, sy: number): any | null {
    const board = boardRef.current;
    if (!board) return null;
    for (const id in board.objects) {
      const o = board.objects[id];
      const lb = o?.hasLabel ? o.label : null;
      if (!lb || lb.visProp?.fixed !== false) continue;
      if (o.visProp?.visible === false || lb.visPropCalc?.visible === false) continue;
      if (!String(lb.plaintext ?? '').trim()) continue;
      if (lb.hasPoint?.(sx, sy)) {
        keepLabelNear(lb);
        return lb;
      }
    }
    return null;
  }

  /**
   * A label stays within LABEL_REACH pixels of the point (or the spot on the line
   * or circle) it names, as in Sketchpad: farther off it would read as belonging
   * to nothing. The distance is taken to the nearest edge of the label's box, so
   * the label can go all the way round the point, left side included. JSXGraph
   * moves a dragged label through setPositionDirectly, so the limit is applied
   * right after each move.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function keepLabelNear(lb: any) {
    if (lb._keptNear || typeof lb.setPositionDirectly !== 'function') return;
    lb._keptNear = true;
    const move = lb.setPositionDirectly;
    lb.setPositionDirectly = function (this: typeof lb, ...args: unknown[]) {
      const result = move.apply(this, args);
      const rel = this.relativeCoords?.scrCoords;
      const anchor = this.element?.getLabelAnchor?.()?.scrCoords;
      if (!rel || !anchor) return result;
      const off = this.visProp?.offset ?? [0, 0];
      const ax = anchor[1] + (parseFloat(off[0]) || 0) + rel[1];
      const ay = anchor[2] - (parseFloat(off[1]) || 0) + rel[2];
      const [w, h] = this.size ?? [0, 0];
      const side = this.getAnchorX();
      const base = this.getAnchorY();
      const left = side === 'right' ? ax - w : side === 'middle' ? ax - w / 2 : ax;
      const bottom = base === 'top' ? ay + h : base === 'middle' ? ay + h / 2 : ay;
      // the corner of the box nearest the point, and the way back to the point from it
      const vx = anchor[1] - Math.min(Math.max(anchor[1], left), left + w);
      const vy = anchor[2] - Math.min(Math.max(anchor[2], bottom - h), bottom);
      const gap = Math.hypot(vx, vy);
      if (gap > LABEL_REACH) {
        const k = (gap - LABEL_REACH) / gap;
        rel[1] += vx * k;
        rel[2] += vy * k;
      }
      return result;
    };
  }

  /**
   * JSXGraph keeps a dragged label as a screen-pixel displacement from its
   * offset. Fold that into the offset, which is what the document stores, so
   * the label keeps its place after a save, a reload or an undo.
   */
  function flushLabelDrags() {
    const board = boardRef.current;
    if (!board) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const moved: { o: any; lb: any; from: [number, number]; to: [number, number] }[] = [];
    for (const id in board.objects) {
      const o = board.objects[id];
      const lb = o?.hasLabel ? o.label : null;
      const rel = lb?.relativeCoords?.scrCoords;
      if (!lb || !rel || (Math.abs(rel[1]) < 1 && Math.abs(rel[2]) < 1)) continue;
      const cur = lb.visProp?.offset ?? [0, 0];
      const x = parseFloat(cur[0]) || 0;
      const y = parseFloat(cur[1]) || 0;
      moved.push({
        o, lb,
        from: [Math.round(x), Math.round(y)],
        to: [Math.round(x + rel[1]), Math.round(y - rel[2])],
      });
    }
    if (moved.length === 0) return;

    const stored = moved
      .map((m) => ({ ...m, el: elementsRef.current.find((e) => e.id === m.o.id) }));
    // Undo reads the old place from the document, so it is written before the snapshot.
    for (const m of stored) {
      if (m.el) m.el.attrs.label = { ...((m.el.attrs.label ?? {}) as object), offset: m.from };
    }
    saveSnapshot();
    for (const m of stored) {
      if (m.el) m.el.attrs.label = { ...((m.el.attrs.label ?? {}) as object), offset: m.to };
      m.lb.relativeCoords.scrCoords[1] = 0;
      m.lb.relativeCoords.scrCoords[2] = 0;
      m.lb.setAttribute({ offset: m.to });
    }
    board.update();
    onDirty();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function deselectObject(obj: any) {
    selectedRef.current = selectedRef.current.filter((o) => o !== obj);
    setSelDecorations(computeDecorations(selectedRef.current, boardRef.current));
    onSelectionChange(selectedRef.current.map(toSelectedInfo));
  }

  /**
   * The points Construct | Triangle / Quadrilateral Interior fills, in the order
   * they were picked, so the shape follows the click order as Sketchpad's does.
   */
  function interiorVertexIds(count: number): string[] | null {
    const ids = selectedRef.current
      .filter((o) => SOLID_POINTS.includes(o.elType ?? ''))
      .map((o) => o.id as string);
    return ids.length === count ? ids : null;
  }

  /** Construct | Triangle / Quadrilateral Interior — a filled polygon with no outline of its own. */
  function createPolygonInterior(count: number): boolean {
    const ids = interiorVertexIds(count);
    if (!ids) {
      onNotifyRef.current?.(`Hãy chọn ${count} điểm.`);
      return false;
    }
    return addObject({
      type: 'polygon', id: nextElId('int'),
      parents: [...ids],
      attrs: { ...INTERIOR_STYLE, strokeColor: ink(), fillColor: ink(), borders: { visible: false } },
    });
  }

  /** The point and the straight object a perpendicular or parallel is built from. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function pointAndLine(): { point: any; line: any } | null {
    const sel = selectedRef.current;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const point = sel.find((o: any) => POINT_ELTS.includes(o.elType));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const line = sel.find((o: any) => LINE_KINDS.includes(o.elType));
    if (!point || !line) {
      onNotifyRef.current?.('Hãy chọn một điểm và một đường thẳng (hoặc đoạn thẳng, tia).');
      return null;
    }
    return { point, line };
  }

  // ─── Attach board-level events (click on objects for selection/info) ──────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function attachBoardEvents(board: any) {
    // Override board.create to attach per-element events
    const origCreate = board.create.bind(board);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    board.create = (type: string, parents: any[], attrs: Record<string, unknown>) => {
      // JSXGraph pins labels in place; unpinning them lets the designer drag a name
      // around its object.
      const skipLabel = type === 'axis' || type === 'grid' || type === 'ticks';
      const withLabelDrag = skipLabel ? attrs : {
        ...attrs,
        label: { fixed: false, ...((attrs?.label as Record<string, unknown> | undefined) ?? {}) },
      };
      const obj = origCreate(type, parents, withLabelDrag);
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
          if (toolRef.current === 'pen') {
            const LINE_TYPES = ['segment', 'line', 'ray', 'parallel', 'perpendicular', 'bisector'];
            if (LINE_TYPES.includes(obj.elType)) {
              toggleTickMark(obj.id);
              return;
            }
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
          // Anything a locus is built from changes the family it sweeps, and the
          // sampling loop picks this up on the next frame.
          locusDirtyRef.current = true;
          if (dragBaseRef.current) {
            pushCapped(undoStack.current, dragBaseRef.current);
            redoStack.current = [];
            dragBaseRef.current = null;
          }
          if (toolRef.current !== 'selection') return;
          // Pressing an unselected object and dragging it moves that object alone.
          if (justAddedRef.current === obj && selectedRef.current.length > 1) {
            selectedRef.current = [obj];
            setSelDecorations(computeDecorations([obj], board));
            onSelectionChange(selectedRef.current.map(toSelectedInfo));
          }
          // Rotate and dilate always work on the whole selection. The translate
          // arrow joins them when more than one object is selected: dragging a
          // member of a group moves the group, which is what Sketchpad does.
          if (arrowRef.current !== 'translate' || selectedRef.current.length > 1) {
            if (!selectedRef.current.includes(obj)) {
              selectedRef.current = [obj];
              setSelDecorations(computeDecorations([obj], board));
              onSelectionChange(selectedRef.current.map(toSelectedInfo));
            }
            applyArrowDrag();
            return;
          }
          if (selectedRef.current.length === 1 && selectedRef.current[0] === obj) {
            const held = snapDuringDrag(board, obj);
            if (held) obj.moveTo(held);
            holdFrameDrag(board, obj);
            return;
          }
          selectedRef.current = [obj];
          setSelDecorations(computeDecorations([obj], board));
          onSelectionChange(selectedRef.current.map(toSelectedInfo));
          // Graph | Snap Points holds the point to the grid while it is dragged.
          const held = snapDuringDrag(board, obj);
          if (held) obj.moveTo(held);
          holdFrameDrag(board, obj);
        });
        // ── drop: a moved object has to land back in the document ───────────
        obj.on('up', () => {
          dragBaseRef.current = null;
          arrowDragRef.current = null;
          arrowStartRef.current = null;
          if (toolRef.current !== 'selection') return;
          // The point lands on the grid it was held to, so what the document keeps
          // is what the designer sees.
          const held = snapDuringDrag(board, obj);
          if (held) obj.moveTo(held);
          // A frame is rigid: dragging its origin carries its unit point along and
          // dragging the unit slides it along the axis, so the axes keep their angle.
          holdFrameDrag(board, obj);
          // A locus of a line follows what it was built from, so a drag ends by
          // sampling the family again at full quality.
          syncLocusSamples(board);
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
      // A press on a slider may move the control; remember what it was worth so
      // a move of the whole control can put the handle back where it rode.
      sliderValuesRef.current = {};
      for (const el of elementsRef.current) {
        if (el.type !== 'slider') continue;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const v = Number((board.objects[el.id] as any)?.Value?.());
        if (Number.isFinite(v)) sliderValuesRef.current[el.id] = v;
      }
      if (toolRef.current !== 'selection') return;
      if (typeof evt.button === 'number' && evt.button !== 0) return;
      const rect = (board.containerObj as HTMLElement).getBoundingClientRect();
      const sx = evt.clientX - rect.left;
      const sy = evt.clientY - rect.top;
      justAddedRef.current = null;
      toggleOnUpRef.current = null;
      // A button is pressed, not selected: a plain click acts on it, and a
      // shift-click is how the designer picks the button itself to move or delete.
      const button = actionButtonAt(sx, sy);
      if (button) {
        if (evt.shiftKey) handleObjectClick(button.obj, true);
        else buttons().press(button.el);
        objectClickedRef.current = true;
        return;
      }
      // A label is dragged by JSXGraph itself; here it only has to keep the press
      // from clearing the selection or starting a rubber band.
      if (labelAt(sx, sy)) {
        objectClickedRef.current = true;
        return;
      }
      // A measurement caption follows its figure, so it is dragged by hand.
      const caption = captionAt(sx, sy);
      if (caption) {
        const picked = board.objects[caption.id];
        if (evt.shiftKey) {
          handleObjectClick(picked, true);
        } else if (!selectedRef.current.includes(picked)) {
          handleObjectClick(picked, true);
          justAddedRef.current = picked;
        } else {
          toggleOnUpRef.current = { obj: picked, x: evt.clientX, y: evt.clientY };
        }
        beginCaptionDrag(caption, evt);
        objectClickedRef.current = true;
        return;
      }
      // Text is selectable only when it is part of the document: the frame's
      // tick labels are texts too, and they are furniture, not objects.
      const known = new Set(elementsRef.current.map((e) => e.id));
      const hits = findObjectsAt(board, sx, sy, [...SELECTABLE_KINDS, 'text'], 12)
        .filter((o: { id: string }) => known.has(o.id));
      // Prioritise point-like elements: if any point is within 12px, pick the
      // closest one instead of whatever came first in board.objects iteration.
      const ptHits  = hits.filter(o => POINT_ELTS.includes(o.elType));
      const best = ptHits.length > 0 ? ptHits[0] : hits[0];
      if (best) {
        const sel = selectedRef.current;
        if (evt.shiftKey) {
          handleObjectClick(best, true);
        } else if (!sel.includes(best)) {
          // Sketchpad adds every further click to the selection; no Shift needed.
          handleObjectClick(best, true);
          justAddedRef.current = best;
        } else {
          // Already selected: leave it for now, since this press may start a drag
          // of the whole group. A click that stays put deselects it on release.
          toggleOnUpRef.current = { obj: best, x: evt.clientX, y: evt.clientY };
        }
        objectClickedRef.current = true; // prevent container mousedown from clearing selection
      } else {
        objectClickedRef.current = false; // no object hit — allow single-click deselect
      }
    });

    // A dragged label has to land back in the document; so must a moved slider.
    board.on('up', () => {
      flushLabelDrags();
      if (flushSliderChanges()) sliderValuesRef.current = {};
    });

    // Board-level double-click → open Properties dialog for element under cursor
    board.containerObj?.addEventListener('dblclick', (evt: MouseEvent) => {
      if (toolRef.current !== 'selection') return;
      const rect = (board.containerObj as HTMLElement).getBoundingClientRect();
      const sx = evt.clientX - rect.left;
      const sy = evt.clientY - rect.top;
      const DBLCLICK_TYPES = [...POINT_ELTS,
                              'line', 'segment', 'ray', 'parallel', 'perpendicular', 'bisector',
                              'circle', 'arc', 'text', 'polygon'];
      const known = new Set(elementsRef.current.map((e) => e.id));
      const hits = findObjectsAt(board, sx, sy, DBLCLICK_TYPES, 15)
        .filter((o: { id: string }) => known.has(o.id));
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
    // The last rung of the Escape ladder is "do nothing", so an empty selection
    // must not churn the parents with a fresh empty array.
    if (selectedRef.current.length === 0) return;
    selectedRef.current = [];
    onSelectionChange([]);
    setSelDecorations([]);
  }

  // A click makes the object the whole selection, but lands harmlessly when it
  // hits a member of a group: the group has to stay selected to be dragged.
  // Shift+click adds an object to the selection or takes it back out.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleObjectClick(obj: any, additive: boolean) {
    const sel = selectedRef.current;
    if (additive) {
      const idx = sel.indexOf(obj);
      if (idx === -1) sel.push(obj);
      else sel.splice(idx, 1);
    } else if (!sel.includes(obj)) {
      selectedRef.current = [obj];
    }
    // Decorations updated by the interval loop; fire immediately too
    setSelDecorations(computeDecorations(selectedRef.current, boardRef.current));
    onSelectionChange(selectedRef.current.map(toSelectedInfo));
  }

  // ─── Context menu (Sketchpad's right-click, Ctrl+click on a Mac) ──────────
  /**
   * True when the object was built out of other objects. GSP only offers Select
   * Parents then: a free point has nothing above it.
   */
  function hasObjectParents(obj: { id: string }): boolean {
    const board = boardRef.current;
    const rec = elementsRef.current.find((e) => e.id === obj.id);
    if (!board || !rec) return false;
    return rec.parents.some((p) => typeof p === 'string' && !!board.objects[p as string]);
  }

  function handleContextMenu(evt: React.MouseEvent<HTMLDivElement>) {
    // Sketchpad never shows the browser's own menu, so neither does this.
    evt.preventDefault();
    const board = boardRef.current;
    const canvas = containerRef.current;
    if (!board || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = evt.clientX - rect.left;
    const sy = evt.clientY - rect.top;
    const hits = findObjectsAt(board, sx, sy, CONTEXT_MENU_KINDS, 12);
    const ptHits = hits.filter((o) => POINT_ELTS.includes(o.elType));
    const best = ptHits.length > 0 ? ptHits[0] : hits[0];
    if (!best) {
      // Empty space: the sketch menu, which GSP uses as a shortcut to the document.
      setMenu({
        x: sx, y: sy,
        rows: sketchMenu({ grid: metaRef.current.grid, axis: metaRef.current.axis }),
      });
      return;
    }
    // The menu acts on what it landed on, and a member of a group keeps the
    // whole group — the same rule a left click follows.
    if (!selectedRef.current.includes(best)) handleObjectClick(best, false);
    const targets = selectedRef.current;
    setMenu({
      x: sx, y: sy,
      rows: objectMenu(selectionFacts(targets, elementKindLabel, targets.every(hasObjectParents))),
    });
  }

  /** Run the command a menu row stands for; each row is a command the canvas has. */
  function runContextCommand(item: ContextItem) {
    setMenu(null);
    switch (item.id) {
      case 'select-parents': selectParentsOfSelection(); break;
      case 'properties': {
        const first = selectedRef.current[0];
        if (first) onOpenPropertiesRef.current?.(toSelectedInfo(first));
        break;
      }
      case 'point-style': attrToSelected({ size: Number(item.value) }); break;
      case 'line-style': attrToSelected({ strokeWidth: Number(item.value) }); break;
      case 'color': attrToSelected({ strokeColor: String(item.value) }); break;
      case 'visibility': attrToSelected({ visible: Boolean(item.value) }); break;
      case 'label': attrToSelected({ withLabel: Boolean(item.value) }); break;
      case 'trace': attrToSelected({ trace: Boolean(item.value) }); break;
      case 'layer': shiftSelectedLayer(item.value === 'front' ? 1 : -1); break;
      case 'select-all': selectAllObjects(); break;
      case 'grid': setGridVisible(!metaRef.current.grid); break;
      case 'axis': setAxisVisible(!metaRef.current.axis); break;
    }
  }

  /**
   * One attribute applied to every selected object, drawn, and written back into
   * the document so a reload keeps it. Every Display command is exactly this.
   * `pointAttrs` replaces `attrs` for a point, whose black rim must stay black.
   */
  function attrToSelected(attrs: Record<string, unknown>, pointAttrs?: Record<string, unknown>) {
    if (selectedRef.current.length === 0) return;
    saveSnapshot();
    const attrsFor = (o: { elType?: string }) =>
      pointAttrs && SOLID_POINTS.includes(o.elType ?? '') ? pointAttrs : attrs;
    selectedRef.current.forEach((o) => {
      const live: Record<string, unknown> = { ...attrsFor(o) };
      // A picked object is still highlighted, and a highlighted one is drawn in its highlight colours.
      if ('strokeColor' in live) live.highlightStrokeColor = live.strokeColor;
      if ('fillColor' in live) live.highlightFillColor = live.fillColor;
      o.setAttribute(live);
    });
    boardRef.current?.update();
    const byId = new Map<string, { elType?: string }>(
      selectedRef.current.map((o: { id: string; elType?: string }) => [o.id, o]),
    );
    elementsRef.current.forEach((e) => {
      const o = byId.get(e.id);
      if (o) Object.assign(e.attrs, attrsFor(o));
    });
    onSelectionChange(selectedRef.current.map(toSelectedInfo));
    onDirty();
  }

  /**
   * The picks as Display | Font reads them. The document type decides whether a
   * pick has a face at all — an action button is drawn as text but is a button —
   * and the live object answers the size and family it draws with now.
   */
  function fontPicks(): FontPick[] {
    return selectedRef.current.map((o) => {
      const el = elementsRef.current.find((e) => e.id === o.id);
      return {
        kind: el?.type ?? o.elType ?? '',
        size: objectFontSize(o),
        family: objectFontFamily(o),
      };
    });
  }

  /** Display | Font — the size and family the picks take, as one undo step. */
  function applyFont(font: FontChoice): boolean {
    const picks = fontPicks();
    if (!canChangeFont(picks)) return false;
    if (font.size === undefined && font.family === undefined) return false;
    saveSnapshot();
    selectedRef.current.forEach((o) => o.setAttribute?.(fontAttrsOf(o, font)));
    boardRef.current?.update();
    const ids = new Set(selectedRef.current.map((o: { id: string }) => o.id));
    elementsRef.current.forEach((el) => {
      if (ids.has(el.id)) Object.assign(el.attrs, fontDocumentAttrs(el, font));
    });
    onSelectionChange(selectedRef.current.map(toSelectedInfo));
    onDirty();
    return true;
  }

  function isSelectedBold(): boolean {
    const sel = selectedRef.current;
    if (sel.length === 0) return false;
    const first = sel[0];
    const css = first.elType === 'text'
      ? first.visProp?.cssstyle
      : first.label?.visProp?.cssstyle ?? first.visProp?.cssstyle;
    return isCssBold(css);
  }

  function toggleSelectedBold(): boolean {
    const picks = fontPicks();
    if (!canChangeFont(picks) || selectedRef.current.length === 0) return false;
    const current = isSelectedBold();
    const next = !current;
    saveSnapshot();
    selectedRef.current.forEach((o) => {
      if (o.elType === 'text') {
        const curCss = o.visProp?.cssstyle;
        const newCss = withFontWeight(curCss, next);
        o.setAttribute?.({ cssStyle: newCss, display: 'html' });
      } else {
        const curCss = o.label?.visProp?.cssstyle ?? o.visProp?.cssstyle;
        const newCss = withFontWeight(curCss, next);
        o.setAttribute?.({ label: { cssStyle: newCss, display: 'html' } });
      }
    });
    boardRef.current?.update();
    const ids = new Set(selectedRef.current.map((o: { id: string }) => o.id));
    elementsRef.current.forEach((el) => {
      if (ids.has(el.id)) {
        if (el.type === 'text') {
          const curCss = typeof el.attrs.cssStyle === 'string' ? el.attrs.cssStyle : undefined;
          el.attrs.cssStyle = withFontWeight(curCss, next);
        } else {
          const label = { ...(el.attrs.label as Record<string, unknown> | undefined) };
          const curCss = typeof label.cssStyle === 'string' ? label.cssStyle : undefined;
          label.cssStyle = withFontWeight(curCss, next);
          el.attrs.label = label;
        }
      }
    });
    onSelectionChange(selectedRef.current.map(toSelectedInfo));
    onDirty();
    return true;
  }

  function isSelectedItalic(): boolean {
    const sel = selectedRef.current;
    if (sel.length === 0) return false;
    const first = sel[0];
    const css = first.elType === 'text'
      ? first.visProp?.cssstyle
      : first.label?.visProp?.cssstyle ?? first.visProp?.cssstyle;
    return isCssItalic(css);
  }

  function toggleSelectedItalic(): boolean {
    const picks = fontPicks();
    if (!canChangeFont(picks) || selectedRef.current.length === 0) return false;
    const current = isSelectedItalic();
    const next = !current;
    saveSnapshot();
    selectedRef.current.forEach((o) => {
      if (o.elType === 'text') {
        const curCss = o.visProp?.cssstyle;
        const newCss = withFontStyle(curCss, next);
        o.setAttribute?.({ cssStyle: newCss, display: 'html' });
      } else {
        const curCss = o.label?.visProp?.cssstyle ?? o.visProp?.cssstyle;
        const newCss = withFontStyle(curCss, next);
        o.setAttribute?.({ label: { cssStyle: newCss, display: 'html' } });
      }
    });
    boardRef.current?.update();
    const ids = new Set(selectedRef.current.map((o: { id: string }) => o.id));
    elementsRef.current.forEach((el) => {
      if (ids.has(el.id)) {
        if (el.type === 'text') {
          const curCss = typeof el.attrs.cssStyle === 'string' ? el.attrs.cssStyle : undefined;
          el.attrs.cssStyle = withFontStyle(curCss, next);
        } else {
          const label = { ...(el.attrs.label as Record<string, unknown> | undefined) };
          const curCss = typeof label.cssStyle === 'string' ? label.cssStyle : undefined;
          label.cssStyle = withFontStyle(curCss, next);
          el.attrs.label = label;
        }
      }
    });
    onSelectionChange(selectedRef.current.map(toSelectedInfo));
    onDirty();
    return true;
  }

  function selectAllObjects() {
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
  }

  // Axes and the grid are always on the board; only their visibility changes.
  function setAxisVisible(v: boolean) {
    saveSnapshot();
    metaRef.current.axis = v;
    setSceneChrome(boardRef.current, metaRef.current);
    onDirty();
  }

  function setGridVisible(v: boolean) {
    saveSnapshot();
    metaRef.current.grid = v;
    setSceneChrome(boardRef.current, metaRef.current);
    onDirty();
  }

  /** Replace the selection with these objects, drawn and announced. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function selectObjects(objs: any[]) {
    clearSelection();
    selectedRef.current = objs;
    objs.forEach((o) => highlightObj(o, true));
    setSelDecorations(computeDecorations(objs, boardRef.current));
    onSelectionChange(objs.map(toSelectedInfo));
  }

  /** Sketchpad's Select Parents: the objects these were built from become the selection. */
  function selectParentsOfSelection() {
    const board = boardRef.current;
    if (!board) return;
    const ids = parentsOf(elementsRef.current, selectedRef.current.map((o: { id: string }) => o.id));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parents = ids.map((id) => board.objects[id]).filter(Boolean) as any[];
    if (parents.length === 0) {
      onNotifyRef.current?.('Những đối tượng này không được dựng từ đối tượng nào.');
      return;
    }
    selectObjects(parents);
  }

  /** Edit | Select Children: what is built directly on the picks becomes the selection. */
  function selectChildrenOfSelection() {
    const board = boardRef.current;
    if (!board) return;
    const ids = childrenOf(elementsRef.current, selectedRef.current.map((o: { id: string }) => o.id));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const children = ids.map((id) => board.objects[id]).filter(Boolean) as any[];
    if (children.length === 0) {
      onNotifyRef.current?.('Không có đối tượng nào được dựng từ những đối tượng này.');
      return;
    }
    selectObjects(children);
  }

  /**
   * Bring to Front and Send to Back, which GSP offers only for layered objects.
   * JSXGraph draws in `layer` order, so one step past the extremes is all the
   * command has to do, and the number rides along in the document so a reload
   * stacks the picture the same way.
   */
  function shiftSelectedLayer(dir: 1 | -1) {
    const board = boardRef.current;
    if (!board || selectedRef.current.length === 0) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const layers = Object.values(board.objects as Record<string, any>)
      .map((o) => Number(o?.visProp?.layer ?? 0));
    attrToSelected({ layer: dir === 1 ? Math.max(...layers) + 1 : Math.min(...layers) - 1 });
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
    const id   = nextElId('pt');
    const ptAttrs = { id, name, ...pointStyle() };

    // Priority 2: snap to a nearby curve → create a glider (point constrained to curve)
    const snapC = findSnapCurve(board, sx, sy);
    if (snapC) {
      const pt = board.create('glider', [x, y, snapC.obj], ptAttrs);
      elementsRef.current.push({
        type: 'glider', id,
        parents: [x, y, snapC.obj.id],
        attrs: { name, ...pointStyle() },
      });
      return pt;
    }

    // Priority 3: free point
    // Graph | Snap Points puts a new point on the grid, the way it holds a dragged one.
    const [gx, gy] = snapToFrame(board, [x, y]) ?? [x, y];
    const pt = board.create('point', [gx, gy], ptAttrs);
    elementsRef.current.push({
      type: 'point', id, parents: [gx, gy],
      attrs: { name, ...pointStyle() },
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
  // Answers whether a construction was actually in flight, which is how Escape
  // knows whether to stop here or step down to clearing the selection.
  function cancelTool(): boolean {
    const hadConstruction = pendingRef.current.phase !== 'idle';
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
    return hadConstruction;
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
          strokeColor: ink(),
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
          strokeColor: ink(), strokeWidth: LINE_WIDTH,
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
          strokeColor: ink(), strokeWidth: 1, dash: 2,
          fillColor: 'none', withLabel: false, fixed: true,
        });
        pendingRef.current = { phase: 'pt2', pt1: centre, ghostEl: ghost };
      } else if (p.phase === 'pt2' && p.pt1) {
        saveSnapshot();
        const radiusPt = createOrSnapPoint(x, y, sx, sy);
        removeGhost();
        const id = nextElId('circ');
        const attrs: Record<string, unknown> = {
          strokeColor: ink(), strokeWidth: LINE_WIDTH,
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
          strokeColor: ink(), strokeWidth: 1, dash: 2,
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
          strokeColor: ink(), strokeWidth: LINE_WIDTH, withLabel: false,
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
        const id   = nextElId('pt');
        board.create('glider', [x, y, snapC.obj], { id, name, ...pointStyle() });
        elementsRef.current.push({
          type: 'glider', id,
          parents: [x, y, snapC.obj.id],
          attrs: { name, ...pointStyle() },
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
          centerPt.setAttribute({ visible: true, name, ...pointStyle() });
          // Ensure the center point is recorded in elementsRef
          const existing = elementsRef.current.find(e => e.id === centerPt.id);
          if (existing) {
            existing.attrs.visible = true;
            existing.attrs.name    = name;
          } else {
            elementsRef.current.push({
              type: 'point', id: centerPt.id,
              parents: [centerPt.X(), centerPt.Y()],
              attrs: { name, visible: true, ...pointStyle() },
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
          board.create('midpoint', [a, b], { id, name, ...pointStyle() });
          elementsRef.current.push({
            type: 'midpoint', id,
            parents: [a.id, b.id],
            attrs: { name, ...pointStyle() },
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
        [...LINE_KINDS, 'circle', 'arc']);
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
            board.create('intersection', [obj1, geoObj, idx], { id, name, ...pointStyle() });
            elementsRef.current.push({
              type: 'intersection', id,
              parents: [obj1.id, geoObj.id, idx],
              attrs: { name, ...pointStyle() },
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

    if (isPolygonTool(curTool)) {
      const p = pendingRef.current;
      // The second click of the double-click that closed a polygon must not
      // open a new one.
      if (polygonClosedRef.current) {
        polygonClosedRef.current = false;
        if (evt.detail > 1) return;
      }
      const verts = p.polyVerts ?? [];
      const lines = p.polyLines ?? [];
      const pt = createOrSnapPoint(x, y, sx, sy);
      // Sketchpad closes a polygon when the first point is clicked again.
      if (verts.length >= 3 && pt === verts[0]) {
        finishPolygon(curTool);
        return;
      }
      // Re-clicking the last vertex is the first half of the double-click that closes.
      if (pt === verts[verts.length - 1]) return;
      if (verts.length > 0) {
        // Preview edge from last vertex to new
        const ghostLine = board.create('segment', [verts[verts.length - 1], pt], {
          id: `ghost_pe_${verts.length}`,
          strokeColor: ink(), strokeWidth: 1, dash: 2, withLabel: false,
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

    if (curTool === 'pen') {
      const LINE_TYPES = ['segment', 'line', 'ray', 'parallel', 'perpendicular', 'bisector'];
      const hits = findObjectsAt(board, sx, sy, LINE_TYPES, 15);
      if (hits.length > 0) {
        toggleTickMark(hits[0].id);
      }
      return;
    }
  }

  // ─── Polygon: build what the active tool asks for ─────────────────────────
  function finishPolygon(mode: ToolMode) {
    const p = pendingRef.current;
    const verts = p.polyVerts ?? [];
    pendingRef.current = { phase: 'idle' };
    polygonClosedRef.current = true;
    if (verts.length < 3) return;

    saveSnapshot();
    const board = boardRef.current!;
    // Remove all ghost lines
    (p.polyLines ?? []).forEach(l => {
      try { board.removeObject(l); } catch { /**/ }
    });

    const vertexIds = verts.map((v: { id: string }) => v.id);
    for (const rec of polygonElements(mode, vertexIds, nextElId('pg'))) {
      const { error } = createElement(board, rec, board.objects);
      if (error) { onNotifyRef.current?.(error); continue; }
      elementsRef.current.push(rec);
    }

    onDirty();
  }

  // ─── Double-click: finish polygon ─────────────────────────────────────────
  function handleOverlayDblClick() {
    const p = pendingRef.current;
    const curTool = toolRef.current;
    if (isPolygonTool(curTool) && p.phase === 'polygon' && (p.polyVerts?.length ?? 0) >= 3) {
      finishPolygon(curTool);
    }
  }

  /** A double tap is a double click on a touch screen; the browser may not send one. */
  const lastTapRef = useRef<{ at: number; x: number; y: number } | null>(null);
  function handleOverlayTouchEnd(evt: React.TouchEvent<HTMLDivElement>) {
    const t = evt.changedTouches[0];
    if (!t) return;
    const now = Date.now();
    const last = lastTapRef.current;
    lastTapRef.current = { at: now, x: t.clientX, y: t.clientY };
    if (last && now - last.at < 300 && Math.hypot(t.clientX - last.x, t.clientY - last.y) < 24) {
      lastTapRef.current = null;
      handleOverlayDblClick();
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

  // ─── Init board on JSXGraph load ─────────────────────────────────────────
  function initBoard() {
    if (boardRef.current) return;
    resetCounters();
    const board = jxg().JSXGraph.initBoard(BOARD_ID, {
      // same as rebuildBoard: open a document where it was drawn
      boundingbox: initialData?.boundingbox ?? [-8, 8, 8, -8],
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
      showInfobox: false,
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
      seedCounters(loaded);
      reportLoadErrors(errors);
      setSceneChrome(board, metaRef.current);
    }
    syncTickMarksFromElements(board);
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

  // ─── Pan via Space+Drag or Middle Mouse ───────────────────────────────────
  useEffect(() => {
    if (!jxgLoaded) return;
    const container = containerRef.current;
    if (!container) return;

    function doPanStart(clientX: number, clientY: number) {
      const board = boardRef.current;
      if (!board) return;
      const bb = board.getBoundingBox() as [number, number, number, number];
      isPanningRef.current = true;
      panStartRef.current = {
        sx: clientX,
        sy: clientY,
        originX: bb[0],
        originY: bb[1],
      };
      if (containerRef.current) containerRef.current.style.cursor = 'grabbing';
    }

    function doPanMove(clientX: number, clientY: number) {
      if (!isPanningRef.current || !panStartRef.current) return;
      const board = boardRef.current;
      if (!board || !containerRef.current) return;
      const dx = clientX - panStartRef.current.sx;
      const dy = clientY - panStartRef.current.sy;
      const bb = board.getBoundingBox() as [number, number, number, number];
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      const uPerPxX = (bb[2] - bb[0]) / w;
      const uPerPxY = (bb[1] - bb[3]) / h;
      const x0 = panStartRef.current.originX;
      const y0 = panStartRef.current.originY;
      const bw = bb[2] - bb[0];
      const bh = bb[1] - bb[3];
      const newBb: [number, number, number, number] = [
        x0 - dx * uPerPxX,
        y0 + dy * uPerPxY,
        x0 - dx * uPerPxX + bw,
        y0 + dy * uPerPxY - bh,
      ];
      board.setBoundingBox(newBb, false);
      board.update();
    }

    function doPanEnd() {
      if (!isPanningRef.current) return;
      isPanningRef.current = false;
      panStartRef.current = null;
      if (containerRef.current) containerRef.current.style.cursor = spaceHeldRef.current ? 'grab' : '';
    }

    function onMouseDown(e: MouseEvent) {
      // Middle mouse button (button === 1) always pans
      if (e.button === 1) {
        e.preventDefault();
        doPanStart(e.clientX, e.clientY);
        return;
      }
      // Space + left button pans
      if (e.button === 0 && spaceHeldRef.current) {
        e.preventDefault();
        doPanStart(e.clientX, e.clientY);
        return;
      }
    }

    function onMouseMove(e: MouseEvent) {
      if (!isPanningRef.current) return;
      e.preventDefault();
      doPanMove(e.clientX, e.clientY);
    }

    function onMouseUp(e: MouseEvent) {
      if (e.button === 1 || (e.button === 0 && isPanningRef.current)) {
        doPanEnd();
      }
    }

    function onContextMenu(e: MouseEvent) {
      // Prevent context menu on middle click
      if (e.button === 1) e.preventDefault();
    }

    container.addEventListener('mousedown', onMouseDown, { capture: true });
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('contextmenu', onContextMenu);

    return () => {
      container.removeEventListener('mousedown', onMouseDown, { capture: true });
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('contextmenu', onContextMenu);
    };
  }, [jxgLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

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

    // The centre of a rotate or dilate is its own image. A segment picked with
    // that centre for an end must keep the designer's point as its image end,
    // not stack an A' the designer never selected on top of A.
    const fixedId = imageFixedPoint(image);
    const moving = imagePointIds(basePoints.map((p) => p.id), image);

    if (moving.length === 0) {
      onNotifyRef.current?.(
        image.op === 'rotate'
          ? 'Tâm quay là điểm bất động — ảnh của nó trùng với chính nó. Hãy chọn thêm điểm hoặc đối tượng khác.'
          : 'Tâm vị tự là điểm bất động — ảnh của nó trùng với chính nó. Hãy chọn thêm điểm hoặc đối tượng khác.'
      );
      return false;
    }

    saveSnapshot();

    // 2. Create transformed points
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transformedPts = new Map<string, any>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newObjects: any[] = [];

    basePoints.forEach((origPt) => {
      if (origPt.id === fixedId) {
        transformedPts.set(origPt.id, origPt);
        return;
      }
      const [fnX, fnY] = imageClosures(board, origPt.id, image);
      const newId = nextElId('pt');
      const baseName = origPt.name ? `${origPt.name}'` : '';
      const ptAttrs = {
        id: newId,
        name: baseName,
        size: origPt.visProp?.size ?? 4,
        strokeColor: origPt.visProp?.strokecolor ?? ink(),
        fillColor: origPt.visProp?.fillcolor ?? ink(),
        highlightStrokeColor: '#c83c3c',
        highlightFillColor: '#c83c3c',
        withLabel: !!baseName,
        label: { fontSize: 14, strokeColor: origPt.visProp?.strokecolor ?? ink() },
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

    isReady: () => boardRef.current !== null,

    loadData: (data: HeyGeoData) => {
      resetCounters();
      clearHistory(undoStack.current, redoStack.current);
      dragBaseRef.current = null;
      metaRef.current = { title: data.title, axis: data.axis ?? true, grid: data.grid ?? false };
      rebuildBoard(data.elements, data.boundingbox);
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

    deleteSelected: deletePicked,

    copySelection: copyPicked,
    cutSelection: cutPicked,
    pasteClipboard: pasteClip,
    hasClipboard: () => (clipboardRef.current?.elements.length ?? 0) > 0,

    selectAll: selectAllObjects,

    setAxis: setAxisVisible,

    setGrid: setGridVisible,

    zoomIn:  () => boardRef.current?.zoomIn(0, 0),
    zoomOut: () => boardRef.current?.zoomOut(0, 0),
    zoomFit: () => boardRef.current?.zoomFit(),

    zoomReset: () => {
      const board = boardRef.current;
      if (!board) return;
      const container = containerRef.current;
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      // 1 unit = 50px at zoom 100%, centered on (0,0)
      const unitsX = w / 50;
      const unitsY = h / 50;
      board.setBoundingBox([-unitsX / 2, unitsY / 2, unitsX / 2, -unitsY / 2], false);
      board.update();
    },

    setTitle: (t: string) => { metaRef.current.title = t; },

    updateSelectedColor: (color: string) => attrToSelected(
      { strokeColor: color, fillColor: color },
      { fillColor: color },
    ),

    selectedColor: () => {
      const first = selectedRef.current[0] as
        { elType?: string; visProp?: { strokecolor?: string; fillcolor?: string } } | undefined;
      if (!first) return null;
      return SOLID_POINTS.includes(first.elType ?? '')
        ? (first.visProp?.fillcolor ?? '#000000')
        : (first.visProp?.strokecolor ?? '#000000');
    },

    updateSelectedStrokeColor: (color: string) => attrToSelected({ strokeColor: color }, { fillColor: color }),

    updateSelectedFillColor: (color: string) => attrToSelected({ fillColor: color }),

    updateSelectedFillOpacity: (opacity: number) => attrToSelected({ fillOpacity: opacity }),

    updateSelectedStrokeWidth: (w: number) => attrToSelected({ strokeWidth: w }),

    updateSelectedDash: (d: number) => attrToSelected({ dash: d }),

    updateSelectedVisible: (v: boolean) => attrToSelected({ visible: v }),

    updateSelectedPointSize: (size: number) => attrToSelected({ size }),

    fontInfo: () => {
      const picks = fontPicks();
      if (!canChangeFont(picks)) return null;
      return { size: sharedFontSize(picks), family: sharedFontFamily(picks) };
    },

    updateSelectedFont: applyFont,
    isSelectedBold: () => isSelectedBold(),
    toggleSelectedBold: () => toggleSelectedBold(),
    isSelectedItalic: () => isSelectedItalic(),
    toggleSelectedItalic: () => toggleSelectedItalic(),

    selectParents: selectParentsOfSelection,

    selectChildren: selectChildrenOfSelection,

    bringSelectedForward: () => shiftSelectedLayer(1),

    sendSelectedToBack: () => shiftSelectedLayer(-1),

    updateSelectedFixed: (f: boolean) => {
      saveSnapshot();
      selectedRef.current.forEach((o: { isDraggable: boolean }) => { o.isDraggable = !f; });
      boardRef.current?.update();
      const ids = new Set(selectedRef.current.map((o: { id: string }) => o.id));
      elementsRef.current.forEach(e => { if (ids.has(e.id)) e.attrs.fixed = f; });
      onSelectionChange(selectedRef.current.map(toSelectedInfo));
      onDirty();
    },

    labelObjectInfo: () => {
      const sel = selectedRef.current;
      if (sel.length !== 1) return null;
      const obj = sel[0] as { elType?: string; name?: string };
      if (!RELABEL_KINDS.includes(obj.elType ?? '')) return null;
      return obj.name ?? '';
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
    clearSelection,
    closeContextMenu: () => {
      if (!menuRef.current) return false;
      setMenu(null);
      return true;
    },

    confirmSlider: (cfg: SliderConfig) => {
      const board = boardRef.current;
      if (!board) return;
      const pos = sliderPosRef.current;
      if (!pos) return;
      makeSlider(pos, cfg);
      sliderPosRef.current = null;
      pendingRef.current = { phase: 'idle' };
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

      const TRACE_POINT_TYPES = ['point', 'glider', 'midpoint', 'circumcenter', 'intersection', 'slider'];

      const tracePoint = sel.find((o: any) => o !== glider && TRACE_POINT_TYPES.includes(o.elType));
      const traceLine  = sel.find((o: any) => o !== glider && LINE_KINDS.includes(o.elType));

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
        // A straight object sweeps out a family of lines, as Sketchpad's locus
        // does; one curve with the pen lifted between samples draws them all.
        const id = nextElId('lc');
        specs.push({
          type: LINE_LOCUS_TYPE, id,
          parents: [glider.id, traceLine.id],
          attrs: {
            strokeColor: ink(), strokeWidth: 1, strokeOpacity: 0.35,
            withLabel: false, highlight: false, samples: LOCUS_SAMPLES,
          },
        });
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
      const id   = nextElId('pt');
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
      const ptAttrs = { id, name, ...pointStyle() };
      try {
        board.create('glider', [defaultX, defaultY, curve], ptAttrs);
        elementsRef.current.push({
          type: 'glider', id,
          parents: [defaultX, defaultY, curve.id],
          attrs: { name, ...pointStyle() },
        });
        board.update();
        onDirty();
      } catch { /**/ }
    },

    createIntersection: () => {
      const board = boardRef.current;
      if (!board) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const geoSel = selectedRef.current.filter((o: any) =>
        [...LINE_KINDS, 'circle', 'arc'].includes(o.elType));
      if (geoSel.length < 2) {
        onNotifyRef.current?.('Hãy chọn hai đối tượng (đường thẳng, đoạn thẳng, tia hoặc đường tròn).');
        return;
      }
      const [a, b] = geoSel;
      const wantsTwo = ['circle', 'arc'].includes(a.elType) || ['circle', 'arc'].includes(b.elType);

      const made: { el: HeyGeoElement; obj: unknown }[] = [];
      for (const idx of wantsTwo ? [0, 1] : [0]) {
        const id   = nextElId('int');
        const name = nextPointName();
        const attrs = { name, ...pointStyle() };
        try {
          const obj = board.create('intersection', [a, b, idx], { id, ...attrs });
          // Two parallel lines, or two segments that stop short, meet nowhere;
          // JSXGraph answers with a point at infinity or NaN rather than an error.
          const u: number[] | undefined = obj.coords?.usrCoords;
          if (u && Math.abs(u[0]) > 1e-12 && Number.isFinite(u[1]) && Number.isFinite(u[2])) {
            made.push({ el: { type: 'intersection', id, parents: [a.id, b.id, idx], attrs }, obj });
          } else {
            board.removeObject(obj);
          }
        } catch { /**/ }
      }
      if (made.length === 0) {
        onNotifyRef.current?.('Hai đối tượng này không cắt nhau.');
        return;
      }
      // The snapshot is the document without the new points, so it is taken before they are written.
      saveSnapshot();
      elementsRef.current.push(...made.map((m) => m.el));
      board.update();
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
        board.create('midpoint', [a, b], { id, name, ...pointStyle() });
        elementsRef.current.push({
          type: 'midpoint', id,
          parents: [a.id, b.id],
          attrs: { name, ...pointStyle() },
        });
        onDirty();
      } catch { /**/ }
    },

    createPerpendicular: () => {
      const board = boardRef.current;
      const picked = pointAndLine();
      if (!board || !picked) return;
      saveSnapshot();
      const id = nextElId('perp');
      try {
        const attrs = { strokeColor: ink(), strokeWidth: LINE_WIDTH };
        board.create('perpendicular', [picked.line, picked.point], { id, ...attrs });
        elementsRef.current.push({
          type: 'perpendicular', id,
          parents: [picked.line.id, picked.point.id],
          attrs,
        });
        onDirty();
      } catch { /**/ }
    },

    createParallel: () => {
      const board = boardRef.current;
      const picked = pointAndLine();
      if (!board || !picked) return;
      saveSnapshot();
      const id = nextElId('par');
      try {
        const attrs = { strokeColor: ink(), strokeWidth: LINE_WIDTH };
        board.create('parallel', [picked.line, picked.point], { id, ...attrs });
        elementsRef.current.push({
          type: 'parallel', id,
          parents: [picked.line.id, picked.point.id],
          attrs,
        });
        onDirty();
      } catch { /**/ }
    },

    canCircleInterior: () => {
      const sel = selectedRef.current;
      if (sel.length !== 1) return false;
      return elementsRef.current.find((e) => e.id === sel[0].id)?.type === 'circle';
    },

    canTriangleInterior: () => interiorVertexIds(3) !== null,
    createTriangleInterior: () => createPolygonInterior(3),
    canQuadrilateralInterior: () => interiorVertexIds(4) !== null,
    createQuadrilateralInterior: () => createPolygonInterior(4),

    createCircleInterior: () => {
      const sel = selectedRef.current;
      if (sel.length !== 1) return false;
      const source = elementsRef.current.find((e) => e.id === sel[0].id);
      if (source?.type !== 'circle') return false;
      return addObject({
        type: 'circle', id: nextElId('int'),
        parents: [...source.parents],
        attrs: { ...INTERIOR_STYLE, strokeColor: ink(), fillColor: ink() },
      });
    },

    canCircleByRadius: () => circleRadiusPicks() !== null,

    createCircleByRadius: () => {
      const picked = circleRadiusPicks();
      if (!picked) return false;
      return addObject({
        type: 'circle', id: nextElId('circ'),
        parents: [picked.center, picked.radius],
        attrs: { strokeColor: ink(), strokeWidth: LINE_WIDTH, fillColor: 'none', withLabel: false },
      });
    },

    canArcOnCircle: () => arcOnCircleSelection() !== null,

    createArcOnCircle: () => {
      const picked = arcOnCircleSelection();
      if (!picked) return false;
      return addObject({
        type: 'arc', id: nextElId('arc'),
        parents: [picked.centre, picked.arc.start, picked.arc.end],
        attrs: { strokeColor: ink(), strokeWidth: LINE_WIDTH, withLabel: false },
      });
    },

    canArcSector: () => arcSectorSelection() !== null,

    createArcSector: () => {
      const picked = arcSectorSelection();
      if (!picked) return false;
      return addObject({
        type: picked.type, id: nextElId('sec'),
        parents: [...picked.parents],
        attrs: { ...INTERIOR_STYLE, strokeColor: ink(), fillColor: ink() },
      });
    },

    canArcSegment: () => arcSegmentSelection() !== null,

    createArcSegment: () => {
      const picked = arcSegmentSelection();
      if (!picked) return false;
      return addObject({
        type: 'arcsegment', id: nextElId('arcseg'),
        parents: [...picked.parents],
        attrs: { ...INTERIOR_STYLE, strokeColor: ink(), fillColor: ink() },
      });
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

    canEndpoint: () => endpointIds(pointConstructPick()) !== null,

    createEndpoint: () => {
      const ids = endpointIds(pointConstructPick());
      if (!ids) return false;
      return revealPoints(ids);
    },

    canCenterPoint: () => centreOf(pointConstructPick()) !== null,

    createCenterPoint: () => {
      const centre = centreOf(pointConstructPick());
      if (!centre) return false;
      if ('reveal' in centre) return revealPoints([centre.reveal]);
      return addObject({
        type: 'circumcenter', id: nextElId('cc'),
        parents: [...centre.circumcentre],
        attrs: { name: nextPointName(), visible: true, ...pointStyle() },
      });
    },

    measureRows,
    createMeasure,
    createParameter,
    updateSelectedParameter,
    setSelectedParameterPrecision: (precision) => {
      const board = boardRef.current;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const obj: any = selectedRef.current[0];
      const el = obj ? elementsRef.current.find((e) => e.id === obj.id) : null;
      const spec = el?.attrs?.parameter;
      if (!board || !obj || !el || !isParameterSpec(spec) || spec.of) return;
      const decimals = Math.min(6, Math.max(0, Math.round(precision)));
      if (decimals === spec.precision) return;
      saveSnapshot();
      el.attrs.parameter = { ...spec, precision: decimals };
      obj.parameterSpec = el.attrs.parameter;
      board.update();
      onSelectionChange(selectedRef.current.map(toSelectedInfo));
      onDirty();
    },
    stepSelectedParameter: (direction) => {
      const board = boardRef.current;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const obj: any = selectedRef.current[0];
      const el = obj ? elementsRef.current.find((e) => e.id === obj.id) : null;
      const spec = el?.attrs?.parameter;
      if (!board || !obj || !isParameterSpec(spec) || spec.of) return false;
      // GSP's keyboard adjustment is the least significant digit shown.
      const decimals = Math.max(0, Math.min(6, spec.precision));
      const step = Math.pow(10, -decimals);
      const next = Math.min(spec.max, Math.max(spec.min,
        Number((spec.value + direction * step).toFixed(decimals))));
      if (next === spec.value) return true;
      saveSnapshot();
      el!.attrs.parameter = { ...spec, value: next };
      obj.parameterSpec = el!.attrs.parameter;
      board.update();
      onSelectionChange(selectedRef.current.map(toSelectedInfo));
      onDirty();
      return true;
    },
    addSlider,
    numberValues,

    graphRows: (): GraphRows => (
      graphRows(elementsRef.current, selectedRef.current.map((o) => o.id))
    ),
    defineCoordsys,
    markCoordsys,
    functionRows: (): FunctionRows => (
      functionRows(elementsRef.current, selectedRef.current.map((o) => o.id))
    ),
    newFunction,
    plotFunction,
    plotCurve,
    plotValueRows: (): PlotValueRows => (
      plotValueRows(elementsRef.current, selectedRef.current.map((o) => o.id))
    ),
    valuePaths: () => valuePaths(elementsRef.current),
    plotPointRows: (): PlotPointRows => (
      plotPointRows(elementsRef.current, selectedRef.current.map((o) => o.id))
    ),
    plotPickedPair,
    plotValue,
    plotPickedValues,
    createActionButton,
    createAnimationButton,
    createMovementButton,
    createPresentButton,
    actionButtonRows: (): ActionButtonRows => (
      actionButtonRows(selectedRef.current.map((o) => o.id), elementsRef.current)
    ),
    startAnimation,
    stopAnimation: () => stopMotion(true),
    animationRows: (): AnimationRows => (
      animationRows(selectedRef.current.map((o) => o.id), elementsRef.current, animationRef.current !== null)
    ),
    increaseAnimationSpeed: () => scaleAnimationSpeed(1.5),
    decreaseAnimationSpeed: () => scaleAnimationSpeed(1 / 1.5),
    plotPoint,
    setGridForm,
    toggleFrameGrid,
    toggleFrameDotted,
    toggleCoordsysShown,
    toggleSnap,

    // ── Transform menu & marks ────────────────────────────────────────────────
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

    markRatio: () => {
      const board = boardRef.current;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const picked: any[] = selectedRef.current;

      // One number: a measurement or a parameter stands for its own value, so
      // the copy goes on following it. This is the desktop's G_VALUE branch.
      if (picked.length === 1) {
        const id = picked[0].id;
        const el = elementsRef.current.find((e) => e.id === id);
        const measure = el?.attrs?.measure as MeasureSpec | undefined;
        const parameter = el?.attrs?.parameter;
        const slider = board?.objects[id] as { Value?: () => number } | undefined;
        const raw = measure ? measureValue(board, measure)
          : isParameterSpec(parameter) ? parameter.value
          : slider?.Value?.();
        if (typeof raw === 'number' && Number.isFinite(raw)) {
          const label = measure?.label || (el?.attrs?.name as string | undefined) || id;
          marksRef.current.ratio = { valueId: id, label, value: raw };
          onNotifyRef.current?.(`Đã đánh dấu tỉ số: ${label} = ${raw.toFixed(3)}`);
          return label;
        }
      }

      // Two segments, in the order they were picked. The desktop's G_SCALED
      // reads the second over the first, so that is the ratio it marks.
      if (picked.length === 2 && picked.every((o) => o.elType === 'segment')) {
        const [first, second] = picked;
        const span = (o: { point1: { X: () => number; Y: () => number }; point2: { X: () => number; Y: () => number } }) =>
          Math.hypot(o.point2.X() - o.point1.X(), o.point2.Y() - o.point1.Y());
        const a = span(first), b = span(second);
        const name = (o: { name?: string; id: string }) => o.name || o.id;
        const label = `${name(second)}/${name(first)}`;
        const value = a > 0 ? b / a : 0;
        marksRef.current.ratio = {
          segments: [first.id, second.id], label, value,
        };
        onNotifyRef.current?.(`Đã đánh dấu tỉ số: ${label} = ${value.toFixed(3)}`);
        return label;
      }

      onNotifyRef.current?.('Hãy chọn 2 đoạn thẳng, hoặc 1 số đo, để đánh dấu tỉ số.');
      return null;
    },

    markDistance: () => {
      const board = boardRef.current;
      if (!board) return null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const picked: any[] = selectedRef.current;

      // 1 segment
      if (picked.length === 1 && picked[0].elType === 'segment') {
        const seg = picked[0];
        const span = Math.hypot(seg.point2.X() - seg.point1.X(), seg.point2.Y() - seg.point1.Y());
        const label = seg.name || `Đoạn ${seg.id}`;
        marksRef.current.distance = { segmentId: seg.id, label, value: span };
        onNotifyRef.current?.(`Đã đánh dấu khoảng cách: ${label} = ${span.toFixed(2)} cm`);
        return label;
      }

      // 2 points
      if (picked.length === 2 && picked.every((o) => POINT_ELTS.includes(o.elType))) {
        const [p1, p2] = picked;
        const dist = Math.hypot(p2.X() - p1.X(), p2.Y() - p1.Y());
        const label = `d(${p1.name || 'A'}, ${p2.name || 'B'})`;
        marksRef.current.distance = { points: [p1.id, p2.id], label, value: dist };
        onNotifyRef.current?.(`Đã đánh dấu khoảng cách: ${label} = ${dist.toFixed(2)} cm`);
        return label;
      }

      // 1 measurement or parameter
      if (picked.length === 1) {
        const id = picked[0].id;
        const el = elementsRef.current.find((e) => e.id === id);
        const measure = el?.attrs?.measure as MeasureSpec | undefined;
        const slider = board?.objects[id] as { Value?: () => number } | undefined;
        const raw = measure ? measureValue(board, measure) : slider?.Value?.();
        if (typeof raw === 'number' && Number.isFinite(raw)) {
          const label = measure?.label || (el?.attrs?.name as string | undefined) || id;
          marksRef.current.distance = { valueId: id, label, value: raw };
          onNotifyRef.current?.(`Đã đánh dấu khoảng cách: ${label} = ${raw.toFixed(2)} cm`);
          return label;
        }
      }

      onNotifyRef.current?.('Hãy chọn 1 đoạn thẳng, 2 điểm, hoặc 1 số đo độ dài để đánh dấu khoảng cách.');
      return null;
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
      const board = boardRef.current;
      const cInfo = marksRef.current.center;
      const centerPt = cInfo ? board?.objects[cInfo.id] : null;
      if (!centerPt) {
        onNotifyRef.current?.('Chưa đánh dấu tâm vị tự. Hãy chọn 1 điểm và chọn Mark Center trước.');
        return false;
      }
      if ('marked' in params) {
        const mark = marksRef.current.ratio;
        if (!mark) {
          onNotifyRef.current?.('Chưa đánh dấu tỉ số. Hãy chọn 2 đoạn thẳng hoặc 1 số đo và chọn Transform → Mark Ratio.');
          return false;
        }
        // The document keeps what the ratio is read from, so the copy goes on
        // following those segments or that measurement after a reload.
        const ratioMark: RatioMark | null = mark.segments
          ? { segments: mark.segments }
          : (() => {
            const el = elementsRef.current.find((e) => e.id === mark.valueId);
            const measure = el?.attrs?.measure;
            if (isMeasureSpec(measure)) return { measure };
            // a parameter reads through the element variant, like a slider
            if (isParameterSpec(el?.attrs?.parameter)) return { element: mark.valueId! };
            return mark.valueId ? { slider: mark.valueId } as RatioMark : null;
          })();
        if (!ratioMark) return false;
        return executeTransform({ op: 'dilate', of: [centerPt.id], ratioMark });
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

    samplesInfo: () => {
      const sel = selectedRef.current;
      if (sel.length !== 1) return null;
      const rec = elementsRef.current.find((e) => e.id === sel[0].id);
      if (rec?.type === LINE_LOCUS_TYPE) return locusSamples(rec.attrs);
      if (rec?.type !== 'tracecurve') return null;
      const obj = boardRef.current?.objects[rec.id] as { numberPoints?: number } | undefined;
      return typeof obj?.numberPoints === 'number' ? obj.numberPoints : null;
    },

    setSamples: (samples: number) => applySamples(samples),

    /** Sketchpad's + and − on a picked locus: more or fewer of what it is made of. */
    stepSamples: (delta: number) => {
      const board = boardRef.current;
      const sel = selectedRef.current;
      if (!board || sel.length !== 1) return false;
      const rec = elementsRef.current.find((e) => e.id === sel[0].id);
      if (rec?.type === LINE_LOCUS_TYPE) {
        return applySamples(locusSamples(rec.attrs) + delta * LOCUS_STEP);
      }
      if (rec?.type === 'tracecurve') {
        const obj = board.objects[rec.id] as { numberPoints?: number } | undefined;
        return applySamples((obj?.numberPoints ?? 300) + delta * TRACE_STEP);
      }
      return false;
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

    getZoom: () => (boardRef.current as unknown as { zoomX?: number })?.zoomX ?? 1,

    exportSVG: () => {
      const board = boardRef.current;
      const container = document.getElementById(BOARD_ID);
      if (!board || !container) return '';
      // The frame's grid is mounted as the container's first SVG, under the
      // board's own, so the drawing to export is the renderer's root — with the
      // grid layer painted into it, because it is part of the picture.
      const source = (board.renderer as unknown as { svgRoot?: SVGSVGElement }).svgRoot
        ?? container.querySelector<SVGSVGElement>('svg:not([data-frame-grid])');
      if (!source) return '';
      const svg = source.cloneNode(true) as SVGSVGElement;
      // JSXGraph keeps an empty, hidden <foreignObject> in its root. It draws
      // nothing, but Chrome taints any canvas that was painted from SVG holding
      // one, so the picture can be downloaded but never rasterised.
      svg.querySelectorAll('foreignObject[display="none"]').forEach((node) => node.remove());
      if (!svg.getAttribute('width')) svg.setAttribute('width', String(container.clientWidth));
      if (!svg.getAttribute('height')) svg.setAttribute('height', String(container.clientHeight));
      // The page colour is part of the picture: an SVG has no background of its
      // own, and a picture handed out should look like the one on screen.
      const backdrop = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      backdrop.setAttribute('x', '0');
      backdrop.setAttribute('y', '0');
      backdrop.setAttribute('width', String(container.clientWidth));
      backdrop.setAttribute('height', String(container.clientHeight));
      backdrop.setAttribute('fill', backgroundRef.current);
      svg.insertBefore(backdrop, svg.firstChild);
      const grid = container.querySelector<SVGSVGElement>('svg[data-frame-grid]');
      if (grid) {
        const under = document.createDocumentFragment();
        for (const node of Array.from(grid.childNodes)) under.appendChild(node.cloneNode(true));
        svg.insertBefore(under, svg.firstChild);
      }
      // Labels — point names, captions, the infobox — are HTML laid over the
      // board, so the renderer's root holds none of them. Put each visible one
      // into the picture as SVG text where the page shows it. The baseline is
      // measured rather than left to dominant-baseline, which most SVG readers
      // outside a browser ignore.
      const frame = container.getBoundingClientRect();
      const gauge = document.createElement('canvas').getContext('2d');
      const labels = container.querySelectorAll<HTMLElement>('.JXGtext');
      for (const label of Array.from(labels)) {
        const content = label.textContent?.trim();
        if (!content) continue;
        const style = window.getComputedStyle(label);
        if (style.display === 'none' || style.visibility === 'hidden') continue;
        const rect = label.getBoundingClientRect();
        if (!rect.width || !rect.height) continue;
        let ascent = (Number.parseFloat(style.fontSize) || 14) * 0.8;
        if (gauge) {
          gauge.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
          const metrics = gauge.measureText(content);
          ascent = metrics.fontBoundingBoxAscent || metrics.actualBoundingBoxAscent || ascent;
        }
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', String(rect.left - frame.left));
        text.setAttribute('y', String(rect.top - frame.top + ascent));
        text.setAttribute('font-family', style.fontFamily);
        text.setAttribute('font-size', style.fontSize);
        text.setAttribute('font-weight', style.fontWeight);
        text.setAttribute('font-style', style.fontStyle);
        text.setAttribute('fill', style.color);
        text.textContent = content;
        svg.appendChild(text);
      }
      for (const dec of tickDecorations) {
        const tickLen = 7;
        const spacing = 4;
        for (let i = 0; i < dec.count; i++) {
          const offset = (i - (dec.count - 1) / 2) * spacing;
          const cx = dec.mx + dec.dx * offset;
          const cy = dec.my + dec.dy * offset;
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', String(cx - dec.px * tickLen));
          line.setAttribute('y1', String(cy - dec.py * tickLen));
          line.setAttribute('x2', String(cx + dec.px * tickLen));
          line.setAttribute('y2', String(cy + dec.py * tickLen));
          line.setAttribute('stroke', '#1e3c96');
          line.setAttribute('stroke-width', '1.8');
          line.setAttribute('stroke-linecap', 'round');
          svg.appendChild(line);
        }
      }
      return new XMLSerializer().serializeToString(svg);
    },
  }), []);  // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* Engine + stylesheet are injected by lib/jsxgraph (self-hosted, no CDN) */}

      {/* Canvas container */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden"
        style={{ backgroundColor: preferences.backgroundColor }}
        onContextMenu={handleContextMenu}
      >
        {/* JSXGraph renders into this div */}
        <div id={BOARD_ID} className="w-full h-full" />

        {/* Interaction overlay – active for construction tools */}
        <div
          ref={overlayRef}
          onClick={handleOverlayClick}
          onDoubleClick={handleOverlayDblClick}
          onMouseMove={handleOverlayMove}
          onTouchEnd={handleOverlayTouchEnd}
          style={{
            position: 'absolute', inset: 0,
            pointerEvents: tool === 'selection' ? 'none' : 'auto',
            // A tap places a point; it must not also pan or zoom the page.
            touchAction: 'none',
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

        {/* Double-click on a parameter's caption edits its value in place. */}
        {paramEdit && (
          <input
            autoFocus
            value={paramEdit.text}
            onChange={(e) => setParamEdit({ ...paramEdit, text: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitParamEdit(true);
              if (e.key === 'Escape') commitParamEdit(false);
            }}
            onBlur={() => commitParamEdit(true)}
            style={{
              position: 'absolute',
              left: paramEdit.left, top: paramEdit.top, width: paramEdit.width,
              zIndex: 9,
            }}
            className="rounded border border-brand-400 bg-white px-1 py-0.5 text-sm
                       text-gray-800 shadow focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        )}

        {/* GSP-style selection decorations (purple outlines around selected objects) */}
        {selDecorations.length > 0 && (
          <svg
            className={preferences.selection === 'blinking' ? 'heygeo-blink' : undefined}
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              pointerEvents: 'none', overflow: 'visible', zIndex: 7,
            }}
          >
            {selDecorations.map((dec, i) => {
              if (dec.kind === 'point') {
                return (
                  <circle key={i}
                    cx={dec.cx} cy={dec.cy} r={dec.r}
                    fill="none" stroke={SELECT_INK} strokeWidth="2.5"
                  />
                );
              }
              if (dec.kind === 'line') {
                const dx = dec.x2 - dec.x1, dy = dec.y2 - dec.y1;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                const px = -dy / len * 3, py = dx / len * 3;
                const EXT = 8000; // extend far for infinite lines
                const ax1 = dec.sfirst ? dec.x1 - dx / len * EXT : dec.x1;
                const ay1 = dec.sfirst ? dec.y1 - dy / len * EXT : dec.y1;
                const ax2 = dec.slast  ? dec.x2 + dx / len * EXT : dec.x2;
                const ay2 = dec.slast  ? dec.y2 + dy / len * EXT : dec.y2;
                return (
                  <g key={i}>
                    <line x1={ax1 + px} y1={ay1 + py} x2={ax2 + px} y2={ay2 + py}
                      stroke={SELECT_INK} strokeWidth="1" fill="none" />
                    <line x1={ax1 - px} y1={ay1 - py} x2={ax2 - px} y2={ay2 - py}
                      stroke={SELECT_INK} strokeWidth="1" fill="none" />
                  </g>
                );
              }
              if (dec.kind === 'circle') {
                return (
                  <g key={i}>
                    <circle cx={dec.cx} cy={dec.cy} r={dec.r + 3}
                      fill="none" stroke={SELECT_INK} strokeWidth="1" />
                    <circle cx={dec.cx} cy={dec.cy} r={Math.max(0, dec.r - 3)}
                      fill="none" stroke={SELECT_INK} strokeWidth="1" />
                  </g>
                );
              }
              if (dec.kind === 'polygon') {
                return (
                  <polygon key={i}
                    points={dec.points}
                    fill="none" stroke={SELECT_INK} strokeWidth="2.5"
                  />
                );
              }
              if (dec.kind === 'path') {
                return (
                  <path key={i} d={dec.d} fill="none"
                    stroke={SELECT_INK} strokeWidth="3" strokeOpacity="0.55" />
                );
              }
              if (dec.kind === 'text') {
                return (
                  <rect key={i} x={dec.x} y={dec.y} width={dec.w} height={dec.h}
                    fill="#d98ee6" stroke="#000000" strokeWidth="1.5"
                    style={{ mixBlendMode: 'multiply' }} />
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

        {/* Tick marks placed by Pen tool */}
        {tickDecorations.length > 0 && (
          <svg
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              pointerEvents: 'none', overflow: 'visible', zIndex: 6,
            }}
          >
            {tickDecorations.map((dec) => {
              const tickLen = 7;
              const spacing = 4;
              const lines = [];
              for (let i = 0; i < dec.count; i++) {
                const offset = (i - (dec.count - 1) / 2) * spacing;
                const cx = dec.mx + dec.dx * offset;
                const cy = dec.my + dec.dy * offset;
                lines.push(
                  <line
                    key={i}
                    x1={cx - dec.px * tickLen}
                    y1={cy - dec.py * tickLen}
                    x2={cx + dec.px * tickLen}
                    y2={cy + dec.py * tickLen}
                    stroke="#1e3c96"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                );
              }
              return <g key={dec.id}>{lines}</g>;
            })}
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
        {/* Sketchpad's Context menu, from the right-click or Ctrl+click */}
        {menu && (
          <DesignContextMenu
            rows={menu.rows}
            x={menu.x}
            y={menu.y}
            onPick={runContextCommand}
          />
        )}
      </div>
    </>
  );
});

export default DesignCanvas;
