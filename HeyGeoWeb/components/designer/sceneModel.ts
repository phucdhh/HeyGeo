'use client';

// ─── Scene model ──────────────────────────────────────────────────────────────
// The board is live geometry; `HeyGeoElement[]` is the document. Undo used to
// tear the whole board down and rebuild it, which threw away zoom, pan, traced
// curves, running animations and the selection, and re-created every object
// identity. The document stays canonical and restoring a snapshot applies only
// the difference between two snapshots to the board that is already there.
//
// Snapshots are whole-document copies: small JSON, and self-healing, because a
// board that drifted away from the document is pulled back by the same diff.
// It is the application that had to become incremental.

import {
  createElement,
  isReferenceParent,
  normalizeElement,
  unresolvedParentId,
} from './elementRegistry';
import { measureDeps } from './measurement';
import { imageDeps } from './transforms';
import type { HeyGeoElement, ToolMode } from './designTypes';

export const UNDO_LIMIT = 100;

export interface SceneSnapshot {
  elements: HeyGeoElement[];
  axis: boolean;
  grid: boolean;
}

export function takeScene(
  elements: HeyGeoElement[],
  meta: { axis: boolean; grid: boolean },
): SceneSnapshot {
  return {
    elements: JSON.parse(JSON.stringify(elements)) as HeyGeoElement[],
    axis: meta.axis,
    grid: meta.grid,
  };
}

/** Undo history is bounded so a long session cannot grow without limit. */
export function pushCapped(stack: SceneSnapshot[], snap: SceneSnapshot, limit = UNDO_LIMIT): void {
  stack.push(snap);
  if (stack.length > limit) stack.splice(0, stack.length - limit);
}

export function clearHistory(...stacks: SceneSnapshot[][]): void {
  stacks.forEach((s) => { s.length = 0; });
}

const j = (v: unknown) => JSON.stringify(v ?? null);
const round = (v: number) => (Number.isFinite(v) ? Number(v.toFixed(6)) : v);

/** The board element types that have a position of their own. */
const POINT_ELTS = ['point', 'glider', 'midpoint', 'intersection', 'slider'];

// ─── Dependency graph ────────────────────────────────────────────────────────

/**
 * Ids this element is constructed from; coordinate parents are not references.
 * A measurement reads its parents from its descriptor instead, and has to be in
 * the graph too — deleting a segment should take the length caption with it.
 * The same goes for an image point: its vector, centre or mirror is a parent.
 */
export function parentIds(el: HeyGeoElement): string[] {
  const out: string[] = [];
  for (let i = 0; i < el.parents.length; i++) {
    if (isReferenceParent(el, i)) out.push(String(el.parents[i]));
  }
  for (const id of [...measureDeps(el), ...imageDeps(el)]) {
    if (!out.includes(id)) out.push(id);
  }
  return out;
}

/** id → the ids constructed from it. */
export function dependentsOf(els: HeyGeoElement[]): Record<string, string[]> {
  const children: Record<string, string[]> = {};
  for (const el of els) {
    for (const p of parentIds(el)) (children[p] ??= []).push(el.id);
  }
  return children;
}

/** `seed` plus everything that transitively depends on it. */
export function withDependents(els: HeyGeoElement[], seed: Iterable<string>): Set<string> {
  const children = dependentsOf(els);
  const seeds = new Set(seed);
  const out = new Set<string>();
  const queue: string[] = [];
  for (const el of els) if (seeds.has(el.id)) queue.push(el.id);
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (out.has(id)) continue;
    out.add(id);
    for (const c of children[id] ?? []) if (!out.has(c)) queue.push(c);
  }
  return out;
}

// ─── What counts as a change ──────────────────────────────────────────────────

/**
 * What makes an element the construction it is: its referenced parents plus its
 * measurement and transform descriptors. Equal keys can be patched in place;
 * different keys mean the board object has to be re-created, because a caption
 * or an image point is bound to its descriptor when it is created and
 * setAttribute cannot rebind it.
 */
export function constructionKey(el: HeyGeoElement): string {
  return JSON.stringify([
    parentIds(el),
    el.attrs?.measure ?? null,
    el.attrs?.anchor ?? null,
    el.attrs?.image ?? null,
    el.attrs?.coordsys ?? null,
    el.attrs?.plot ?? null,
  ]);
}

/** Types whose position lives in numeric parents, so a change is a move. */
const COORD_COUNT: Record<string, number> = { point: 2, glider: 2 };

export function coordParents(el: HeyGeoElement): number[] | null {
  const n = COORD_COUNT[el.type];
  if (n === undefined || el.parents.length < n) return null;
  const coords = el.parents.slice(0, n);
  return coords.every((c) => typeof c === 'number' && Number.isFinite(c))
    ? (coords as number[])
    : null;
}

/** Descriptors this app reads; JSXGraph never sees them, so they are not style. */
const APP_ATTRS = new Set(['measure', 'anchor', 'image', 'coordsys', 'plot']);

export function attrsDiffer(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const keys = new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})]);
  for (const k of keys) {
    if (APP_ATTRS.has(k)) continue;
    if (j(a?.[k]) !== j(b?.[k])) return true;
  }
  return false;
}

// ─── Plan ─────────────────────────────────────────────────────────────────────

export interface ScenePlan {
  /** Board objects to delete, children before parents. */
  removeIds: string[];
  /** Target elements this change has to build again. */
  rebuildIds: Set<string>;
  /** Points to reposition in place instead of re-creating. */
  moves: { id: string; coords: number[] }[];
  /** Elements to hand a full attribute update to. */
  attrUpdates: { id: string; attrs: Record<string, unknown> }[];
}

/**
 * Diff two snapshots of one document. A deleted or re-parented element is
 * removed together with everything built from it, because JSXGraph cascades on
 * removal, and `rebuildIds` lists what the target still wants from that pile so
 * it gets created again.
 */
export function planScene(prev: SceneSnapshot, next: SceneSnapshot): ScenePlan {
  const nextById = new Map(next.elements.map((e) => [e.id, e]));
  const moves: ScenePlan['moves'] = [];
  const attrUpdates: ScenePlan['attrUpdates'] = [];
  const dirty: string[] = [];

  for (const el of prev.elements) {
    const target = nextById.get(el.id);
    if (!target) { dirty.push(el.id); continue; }
    if (constructionKey(el) !== constructionKey(target)) { dirty.push(el.id); continue; }
    const from = coordParents(el);
    const to = coordParents(target);
    if (from && to && j(from) !== j(to)) { moves.push({ id: target.id, coords: to }); continue; }
    if (attrsDiffer(el.attrs ?? {}, target.attrs ?? {})) {
      const attrs = { ...(target.attrs ?? {}) };
      for (const k of APP_ATTRS) delete attrs[k];
      attrUpdates.push({ id: target.id, attrs });
    }
  }

  const destroyed = withDependents(prev.elements, dirty);
  // Everything the target still wants from that pile has to be built again,
  // including the re-parented element the cascade started from.
  const rebuildIds = new Set(
    next.elements.filter((e) => destroyed.has(e.id)).map((e) => e.id),
  );

  return {
    // The document is kept in construction order, so reversed it is children
    // before parents and every cascade starts from a leaf.
    removeIds: prev.elements.filter((e) => destroyed.has(e.id)).map((e) => e.id).reverse(),
    rebuildIds,
    moves: moves.filter((m) => !destroyed.has(m.id)),
    attrUpdates: attrUpdates.filter((a) => !destroyed.has(a.id)),
  };
}

// ─── Apply ────────────────────────────────────────────────────────────────────

export interface ApplyResult {
  /** The target elements that ended up on the board: the new document. */
  elements: HeyGeoElement[];
  errors: string[];
  /** ids whose board object this call created, so callers can re-attach state. */
  createdIds: string[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type LiveBoard = any;

/**
 * Bring the board to `next`. Removals run children first, then every target
 * element with no live board object is created parents-first — retried until a
 * pass makes no progress, so a rebuilt subtree cannot be blocked by ordering —
 * and finally the in-place moves and attribute updates are applied. Untouched
 * elements keep their board object, which is what preserves traces, animations,
 * zoom and the selection.
 */
export function applyScene(board: LiveBoard, next: SceneSnapshot, plan?: ScenePlan): ApplyResult {
  const errors: string[] = [];
  const createdIds: string[] = [];
  if (!board) return { elements: [], errors: ['board chưa sẵn sàng'], createdIds };

  const p = plan ?? emptyPlan();
  const wasLive = new Set(Object.keys(board.objects ?? {}));
  // Documents written before measurement descriptors existed are upgraded on the
  // way in: nothing below has to know the old format, and the next save writes
  // the new one.
  const target = { ...next, elements: next.elements.map((e) => normalizeElement(e) as HeyGeoElement) };

  for (const id of p.removeIds) {
    const obj = board.objects[id];
    if (!obj) continue;
    try { board.removeObject(obj); } catch { /* the cascade already took it */ }
  }

  // Anything the board lost — planned rebuilds, and drift no plan predicted.
  let pending = target.elements.filter((e) => !wasLive.has(e.id) || p.rebuildIds.has(e.id));
  const made = new Map<string, unknown>();
  while (pending.length > 0) {
    const deferred: HeyGeoElement[] = [];
    for (const el of pending) {
      const missing = unresolvedParentId(el, new Set([...wasLive, ...made.keys()]));
      if (missing !== null) { deferred.push(el); continue; }
      const outcome = createElement(board, el, liveMap(board, made));
      if (outcome.obj) { made.set(el.id, outcome.obj); createdIds.push(el.id); }
      else errors.push(outcome.error ?? `${el.type} "${el.id}"`);
    }
    if (deferred.length === pending.length) {
      for (const el of deferred) {
        errors.push(`${el.type} "${el.id}": cha không tồn tại (${el.parents.join(', ')})`);
      }
      break;
    }
    pending = deferred;
  }

  for (const m of p.moves) {
    const obj = board.objects[m.id];
    if (!obj?.moveTo) continue;
    try { obj.moveTo(m.coords); } catch { errors.push(`không di chuyển được "${m.id}"`); }
  }

  for (const a of p.attrUpdates) {
    const obj = board.objects[a.id];
    if (!obj?.setAttribute) continue;
    try { obj.setAttribute(a.attrs); } catch { errors.push(`không cập nhật được "${a.id}"`); }
  }

  board.update?.();

  return { elements: target.elements.filter((e) => !!board.objects?.[e.id]), errors, createdIds };
}

function emptyPlan(): ScenePlan {
  return { removeIds: [], rebuildIds: new Set<string>(), moves: [], attrUpdates: [] };
}

function liveMap(board: LiveBoard, made: Map<string, unknown>): Record<string, unknown> {
  return { ...(board.objects ?? {}), ...Object.fromEntries(made) };
}

// ─── Live geometry → document ─────────────────────────────────────────────────

/**
 * The points a selection is made of. A line, circle or polygon has no geometry
 * of its own: moving its defining points moves the object, which is what both
 * the Transform menu and the rotate/dilate arrows need to know.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function gatherSelectionPoints(sel: any[]): any[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out = new Map<string, any>();
  for (const o of sel) {
    if (POINT_ELTS.includes(o.elType)) {
      out.set(o.id, o);
    } else if (['segment', 'line', 'ray'].includes(o.elType)) {
      if (o.point1) out.set(o.point1.id, o.point1);
      if (o.point2) out.set(o.point2.id, o.point2);
    } else if (o.elType === 'circle') {
      const c = o.center ?? o.point1;
      if (c) out.set(c.id, c);
      if (o.point2) out.set(o.point2.id, o.point2);
    } else if (o.elType === 'polygon') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const v of o.vertices ?? []) if (v && v.id) out.set(v.id, v);
    }
  }
  return [...out.values()];
}

/**
 * The objects a polygon tool leaves on the board. Sketchpad's three rows differ
 * only here (Reference Center/tools_polygon.htm): the polygon, the polygon plus
 * the segments that form its edges, or the edges alone. The edges close the ring
 * — every vertex has two neighbours — and when real segments draw the frame the
 * polygon hides its own borders so nothing is drawn twice.
 */
export function polygonElements(
  mode: ToolMode,
  vertexIds: string[],
  baseId: string,
): HeyGeoElement[] {
  const out: HeyGeoElement[] = [];
  if (mode !== 'polygon_edges') {
    out.push({
      type: 'polygon',
      id: baseId,
      parents: [...vertexIds],
      attrs: {
        strokeColor: '#1e3c96', strokeWidth: 2, fillColor: '#1e3c9622',
        withLabel: false,
        borders: { withLabel: false, visible: mode === 'polygon' },
      },
    });
  }
  if (mode !== 'polygon') {
    vertexIds.forEach((_, i) => {
      out.push({
        type: 'segment',
        id: `${baseId}_s${i}`,
        parents: [vertexIds[i], vertexIds[(i + 1) % vertexIds.length]],
        attrs: { strokeColor: '#1e3c96', strokeWidth: 2, withLabel: false },
      });
    });
  }
  return out;
}

/**
 * Objects of the requested types within `tolerance` pixels of a screen point.
 * The construct tools and the selection arrow both ask the board what is under
 * the cursor, and JSXGraph's own hit areas are too thin for a segment to be a
 * reliable answer.
 */
export function findObjectsAt(
  board: LiveBoard,
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
    // A polygon's border lines are not objects of the document; clicking one
    // selects the polygon in Sketchpad, so it does here too.
    if (obj.parentPolygon) continue;
    if (!types.includes(obj.elType)) continue;
    if (POINT_ELTS.includes(obj.elType)) {
      const sc = obj.coords?.scrCoords;
      if (sc) {
        const d = Math.sqrt((sc[1] - sx) ** 2 + (sc[2] - sy) ** 2);
        if (d <= tolerance) result.push(obj);
      }
    } else if (['line','segment','ray','parallel','perpendicular','bisector'].includes(obj.elType)) {
      if (['parallel','perpendicular','bisector'].includes(obj.elType)) {
        // These elements have unreliable point1/point2 positions.
        // Use stdform (ax + by + c = 0 in user coords) for accurate distance.
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
    } else if (obj.elType === 'polygon') {
      // hasPoint is written in screen coords, like everything else here, and
      // answers for the whole interior because the registry gives a polygon
      // hasInnerPoints — which is how Sketchpad lets a click inside select it.
      if (obj.hasPoint?.(sx, sy)) result.push(obj);
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

/**
 * Dragging moves the board object, not the document. Without this write-back a
 * dragged point is saved at its creation coordinates and undo snaps it straight
 * back there. Coordinates are rounded because a drag hands back float noise.
 */
export function syncPositions(
  elements: HeyGeoElement[],
  board: LiveBoard,
): boolean {
  let changed = false;
  for (const el of elements) {
    if (coordParents(el) === null) continue;
    const obj = board?.objects?.[el.id];
    if (typeof obj?.X !== 'function' || typeof obj?.Y !== 'function') continue;
    const coords = [round(obj.X()), round(obj.Y())];
    const rest = el.parents.slice(coords.length);
    if (j([...coords, ...rest]) !== j(el.parents)) {
      el.parents = [...coords, ...rest] as HeyGeoElement['parents'];
      changed = true;
    }
  }
  return changed;
}

// ─── Axis & grid without rebuilding the board ─────────────────────────────────

/**
 * JSXGraph only creates axes and grid when asked at init, and
 * `board.setAttribute({axis: false})` hides them but never brings them back.
 * The designer therefore boots with both present and toggles visibility, which
 * is also what lets the board keep its zoom while the document changes.
 */
export function setSceneChrome(
  board: LiveBoard,
  meta: { axis: boolean; grid: boolean },
): void {
  if (!board) return;
  for (const a of [board.defaultAxes?.x, board.defaultAxes?.y]) {
    try { a?.setAttribute({ visible: meta.axis }); } catch { /* no axes on this board */ }
  }
  for (const id in board.objects ?? {}) {
    const obj = board.objects[id];
    if (obj?.elType !== 'grid') continue;
    try { obj.setAttribute({ visible: meta.grid }); } catch { /* already detached */ }
  }
  board.update?.();
}




