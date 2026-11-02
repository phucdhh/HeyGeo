/**
 * The sketch coordinate system.
 *
 * Sketchpad measures a point in the frame the designer defines, not only in the
 * board's own: one point becomes the origin, a second says how long a unit is,
 * and from then on Measure | Coordinates reads numbers out of *that* frame. The
 * desktop keeps a G_COORDSYS object for it. Here a frame is not an object but a
 * mark on the origin point,
 *
 *   origin.attrs.coordsys = { unit: <id> }
 *
 * which keeps the fact in one place: it travels with the undo snapshots and the
 * saved document because both already copy the element it sits on, and a unit
 * point that gets deleted leaves the mark pointing at nothing — which reads as
 * no frame, not as a broken one.
 *
 * The frame's grid — its form, whether it is drawn, whether points snap to it —
 * hangs off the same mark, the way the desktop keeps those settings inside its
 * G_coordsys rather than as objects of their own.
 */
import type { HeyGeoElement } from './designTypes';

/**
 * The four grid forms Sketchpad draws for a coordinate system, named the way the
 * desktop's Graph | Grid Form submenu names them.
 */
export type GridForm = 'polar' | 'square' | 'rectangular' | 'trig';

export const GRID_FORMS: GridForm[] = ['polar', 'square', 'rectangular', 'trig'];

const GRID_FORM_SET = new Set<string>(GRID_FORMS);

function gridFormOf(value: unknown, fallback: GridForm): GridForm {
  return typeof value === 'string' && GRID_FORM_SET.has(value) ? (value as GridForm) : fallback;
}

/**
 * The mark on the origin point: which point says how long a unit is, and how the
 * frame is drawn and used on top of that. The three grid settings keep the
 * desktop's defaults — a square frame, no grid, no snapping — and stay out of a
 * document that never changed them.
 *
 * `marked` says which of several systems measures and plots go onto. Sketchpad
 * marks one at a time, and the newest one is the marked one, so a document with a
 * single frame leaves the flag out and reads the same as it always did.
 */
export interface CoordsysSpec {
  unit: string;
  grid?: GridForm;
  showGrid?: boolean;
  snap?: boolean;
  /** Graph | Dotted Grid: the grid drawn as dots where its lines cross. */
  dotted?: boolean;
  /** Graph | Hide Coordinate System: the grid, axes and origin off the page. */
  hidden?: boolean;
  marked?: boolean;
}

/** Both points a relative measurement is read against, and the frame's settings. */
export interface Coordsys {
  origin: string;
  unit: string;
  grid: GridForm;
  showGrid: boolean;
  snap: boolean;
  dotted: boolean;
  hidden: boolean;
}

export function isCoordsysSpec(value: unknown): value is CoordsysSpec {
  if (!value || typeof value !== 'object') return false;
  return typeof (value as Record<string, unknown>).unit === 'string';
}

/** One element's mark as a frame, or null when it carries none or points at nothing. */
function frameOf(el: HeyGeoElement, elements: HeyGeoElement[]): Coordsys & { marked: boolean } | null {
  const spec = el.attrs?.coordsys as CoordsysSpec | undefined;
  if (!isCoordsysSpec(spec) || spec.unit === el.id) return null;
  if (!elements.some((e) => e.id === spec.unit)) return null;
  return {
    origin: el.id,
    unit: spec.unit,
    grid: gridFormOf(spec.grid, 'square'),
    showGrid: spec.showGrid === true,
    snap: spec.snap === true,
    dotted: spec.dotted === true,
    hidden: spec.hidden === true,
    marked: spec.marked === true,
  };
}

/**
 * Every coordinate system the document holds, the marked one first: Sketchpad lets
 * a sketch carry several and puts each new measure or plot onto the marked one.
 * A frame whose unit point has gone is not in the list at all — JSXGraph's cascade
 * takes the axes away with the origin, and a caption has no scale without the unit.
 */
export function coordsysList(elements: HeyGeoElement[]): Coordsys[] {
  const frames = elements
    .map((el) => frameOf(el, elements))
    .filter((s): s is Coordsys & { marked: boolean } => s !== null);
  const ordered = [...frames.filter((f) => f.marked), ...frames.filter((f) => !f.marked)];
  return ordered.map(({ origin, unit, grid, showGrid, snap, dotted, hidden }) =>
    ({ origin, unit, grid, showGrid, snap, dotted, hidden }));
}

/**
 * The marked frame, or null when the document has none. With one system there is
 * nothing to mark, so the first of them is the one everything reads.
 */
export function coordsysOf(elements: HeyGeoElement[]): Coordsys | null {
  return coordsysList(elements)[0] ?? null;
}

/** True when the designer already has a frame. */
export function hasCoordsys(elements: HeyGeoElement[]): boolean {
  return coordsysOf(elements) !== null;
}

/**
 * The frame an object belongs to, by the origin it was drawn from: the mark sits on
 * the origin, and its unit point, its y-direction point and its two axes are named
 * after it. Graph | Mark Coordinate System is chosen from any of them.
 */
export function frameOwner(elements: HeyGeoElement[], id: string): string | null {
  for (const sys of coordsysList(elements)) {
    if (id === sys.origin || id === sys.unit
      || id === `${sys.origin}_v` || id === `${sys.origin}_x` || id === `${sys.origin}_y`) {
      return sys.origin;
    }
  }
  return null;
}

/**
 * The document with exactly one frame carrying the mark. A sketch with a single
 * system needs no flag on it at all, so the mark only appears once there is a
 * choice to record — which keeps an ordinary document byte-for-byte what it was.
 */
export function withMarkOnly(elements: HeyGeoElement[], originId: string): HeyGeoElement[] {
  const several = coordsysList(elements).length > 1;
  return elements.map((el) => {
    const spec = el.attrs?.coordsys;
    if (!isCoordsysSpec(spec)) return el;
    const marked = several && el.id === originId;
    if ((spec.marked === true) === marked) return el;
    const next: CoordsysSpec = { ...spec };
    if (marked) next.marked = true;
    else delete next.marked;
    return { ...el, attrs: { ...el.attrs, coordsys: next } };
  });
}

/**
 * Graph | Mark Coordinate System: the frame the picked object belongs to becomes
 * the one measures and plots are read against. Nothing changes when the pick is not
 * part of a frame, or is already the marked one.
 */
export function withMark(elements: HeyGeoElement[], id: string): HeyGeoElement[] | null {
  const owner = frameOwner(elements, id);
  if (!owner || coordsysOf(elements)?.origin === owner) return null;
  return withMarkOnly(elements, owner);
}

/**
 * The three points a plot is measured against: the origin, its unit point and the
 * point that gives the y-direction. A curve drawn through the frame reads all
 * three, so a document that is missing the third has no frame to plot on even
 * though its origin still carries the mark.
 */
export function framePoints(elements: HeyGeoElement[]): [string, string, string] | null {
  const sys = coordsysOf(elements);
  if (!sys) return null;
  const vertical = `${sys.origin}_v`;
  return elements.some((e) => e.id === vertical) ? [sys.origin, sys.unit, vertical] : null;
}

/** Point types a frame can stand on — a slider is a number, not a place. */
const FRAME_POINT_TYPES = ['point', 'glider', 'midpoint', 'circumcenter', 'intersection'];

/**
 * The points Graph | Define Coordinate System would mark, in the order they were
 * picked: the first is the origin, the second says how long a unit is. A selection
 * of anything but one or two points defines nothing.
 */
export function frameSelection(elements: HeyGeoElement[], selection: string[]): string[] {
  const picked = selection
    .map((id) => elements.find((e) => e.id === id))
    .filter((e): e is HeyGeoElement => !!e && FRAME_POINT_TYPES.includes(e.type));
  const enough = picked.length > 0 && picked.length <= 2;
  return enough && picked.length === selection.length ? picked.map((e) => e.id) : [];
}

/**
 * What the first Graph row does with this selection. Sketchpad names the command
 * after the objects it finds picked — one point gives an origin, anything else
 * falls back to the default system — so the row says what it is about to do.
 */
export type DefineKind = 'system' | 'origin' | 'unit';

export interface DefinePlan {
  kind: DefineKind;
  /** The row's label, in Sketchpad's own words. */
  label: string;
  /** The points the frame stands on, empty when the default origin is used. */
  points: string[];
}

export function definePlan(elements: HeyGeoElement[], selection: string[]): DefinePlan {
  const picked = frameSelection(elements, selection);
  if (picked.length === 1) return { kind: 'origin', label: 'Define Origin', points: picked };
  if (picked.length === 2) return { kind: 'unit', label: 'Define Coordinate System', points: picked };
  return { kind: 'system', label: 'Define Coordinate System', points: [] };
}

/**
 * What the Graph menu can do with this document and this selection. Only the mark
 * row has a rule that can fail: Sketchpad's other rows make a default system for
 * themselves rather than going grey.
 */
export interface GraphRows {
  /** 'Define Coordinate System' or 'Define Origin', per what is picked. */
  defineLabel: string;
  /** Marking needs a second system to mark and a pick that says which one it is. */
  canMark: boolean;
  /** A sketch without a system reads the Shift row as Show, because it makes one. */
  hasFrame: boolean;
  grid: GridForm;
  showGrid: boolean;
  snap: boolean;
  dotted: boolean;
  hidden: boolean;
}

export function graphRows(elements: HeyGeoElement[], selection: string[]): GraphRows {
  const frames = coordsysList(elements);
  const marked = frames[0] ?? null;
  const picked = new Set(selection
    .map((id) => frameOwner(elements, id))
    .filter((o): o is string => o !== null));
  const only = picked.size === 1 ? [...picked][0] : null;
  return {
    defineLabel: definePlan(elements, selection).label,
    canMark: frames.length > 1 && only !== null && only !== marked?.origin,
    hasFrame: marked !== null,
    grid: marked?.grid ?? 'square',
    showGrid: marked?.showGrid ?? false,
    snap: marked?.snap ?? false,
    dotted: marked?.dotted ?? false,
    hidden: marked?.hidden ?? false,
  };
}

const POINT_STYLE = { size: 4, strokeColor: '#1e3c96', fillColor: '#1e3c96' };
/** An axis is a line with its arrow on the far end, the way the desktop exports one. */
const AXIS_STYLE = {
  strokeColor: '#1e3c96', strokeWidth: 1.5,
  straightFirst: true, straightLast: true,
  firstArrow: [0, 0], lastArrow: [1, 1],
  label: { fontSize: 14, strokeColor: '#1e3c96', position: 'rt' },
};

/** Where a frame's two points sit, for the ones the document does not have yet. */
export interface FramePoints {
  origin: { id: string; name: string; coords: [number, number] };
  unit: { id: string; name: string; coords: [number, number] };
}

/** A point of the frame that is not in the document yet. */
function framePoint(p: FramePoints['origin']): HeyGeoElement {
  return { type: 'point', id: p.id, parents: [...p.coords], attrs: { ...POINT_STYLE, name: p.name } };
}

/**
 * The point that gives the y-axis its direction. In every form but a rectangular
 * one it is welded to the x unit — the unit point turned a quarter turn about the
 * origin, hidden and unmovable, which is what puts the arrow on the upper end of
 * the y-axis. A rectangular frame is the desktop's exception: it shows this point
 * and lets the designer drag it, because its y spacing is its own and dragging
 * the point is how that spacing is set.
 */
export function verticalElement(
  originId: string,
  unitId: string,
  form: GridForm,
  coords: [number, number] | null,
): HeyGeoElement {
  const id = `${originId}_v`;
  if (form === 'rectangular' && coords) {
    return {
      type: 'point', id, parents: [...coords],
      attrs: {
        ...POINT_STYLE, name: 'y', size: 3,
        visible: true, withLabel: true, fixed: false,
      },
    };
  }
  return {
    type: 'point', id, parents: [unitId],
    attrs: {
      ...POINT_STYLE, name: '', size: 1,
      visible: false, withLabel: false, fixed: true,
      image: { op: 'rotate', of: [originId], angle: 90 },
    },
  };
}

/**
 * The five elements a coordinate system is made of, in construction order: the
 * two points that define it, the hidden point that gives the y-direction, and the
 * two axes through them.
 *
 * A point the designer already had keeps its own attributes and gains only the
 * mark, so defining a system on an existing point does not rename or restyle it.
 */
export function frameElements(points: FramePoints, elements: HeyGeoElement[]): HeyGeoElement[] {
  const { origin, unit } = points;
  const find = (id: string) => elements.find((e) => e.id === id) ?? null;
  const existingOrigin = find(origin.id);
  const existingUnit = find(unit.id);

  const originBase = existingOrigin ?? framePoint(origin);
  const originEl: HeyGeoElement = {
    ...originBase,
    attrs: { ...originBase.attrs, coordsys: { unit: unit.id } },
  };
  const unitEl = existingUnit ?? framePoint(unit);
  const vertical = verticalElement(origin.id, unit.id, 'square', null);

  return [
    originEl,
    unitEl,
    vertical,
    { type: 'line', id: `${origin.id}_x`, parents: [origin.id, unit.id], attrs: { ...AXIS_STYLE, name: 'x', withLabel: true } },
    { type: 'line', id: `${origin.id}_y`, parents: [origin.id, vertical.id], attrs: { ...AXIS_STYLE, name: 'y', withLabel: true } },
  ];
}

/** A frame point's position, when the document states it as numbers. */
function coords(el: HeyGeoElement | null): [number, number] | null {
  const [x, y] = el?.parents ?? [];
  return typeof x === 'number' && typeof y === 'number' ? [x, y] : null;
}

/**
 * The frame is rigid: dragging its origin carries the unit point along, so the
 * unit stays the same distance away and the axes keep their angle — which is what
 * Sketchpad does and what keeps a measurement from silently changing its scale
 * while the designer is only moving the origin.
 *
 * The drag moves the board object, not the document, so the delta is measured
 * against the position the document still holds. When the unit point has already
 * travelled with the origin — because the whole selection was dragged — there is
 * nothing to carry, and null means the caller can write the drag back as usual.
 */
export function originCarriesUnit(
  elements: HeyGeoElement[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  live: (id: string) => any,
  movedId: string,
): { id: string; coords: [number, number] } | null {
  const sys = coordsysOf(elements);
  if (!sys || sys.origin !== movedId) return null;
  const originEl = elements.find((e) => e.id === sys.origin);
  const unitEl = elements.find((e) => e.id === sys.unit);
  if (!originEl || !unitEl) return null;
  const before = coords(originEl);
  const unit = coords(unitEl);
  if (!before || !unit) return null;

  const origin = live(sys.origin);
  const unitObj = live(sys.unit);
  if (!origin?.X || !unitObj?.X) return null;

  const dx = origin.X() - before[0];
  const dy = origin.Y() - before[1];
  const ux = unitObj.X() - unit[0];
  const uy = unitObj.Y() - unit[1];
  const moved = Math.hypot(dx, dy) > 1e-6;
  const cameAlong = Math.hypot(dx - ux, dy - uy) < 1e-6;
  if (!moved || cameAlong) return null;

  return { id: sys.unit, coords: [unit[0] + dx, unit[1] + dy] };
}

/**
 * The unit point held to the axis it was made on. Dragging it is how a designer
 * changes the length of a unit, not how the system turns: a curve already plotted
 * is measured on the angle the document holds, so a frame that swivelled under the
 * pointer would leave every curve, grid and coordinate behind. The point keeps its
 * distance along the stored direction and loses whatever the drag took sideways.
 *
 * null means the drag is not the unit point’s, or the frame states no direction to
 * hold it to.
 */
export function unitOnAxis(
  elements: HeyGeoElement[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  live: (id: string) => any,
  movedId: string,
): [number, number] | null {
  const sys = coordsysOf(elements);
  if (!sys || sys.unit !== movedId) return null;
  const from = coords(elements.find((e) => e.id === sys.origin) ?? null);
  const to = coords(elements.find((e) => e.id === sys.unit) ?? null);
  if (!from || !to) return null;
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const squared = dx * dx + dy * dy;
  if (squared < 1e-12) return null;
  const origin = live(sys.origin);
  const unit = live(sys.unit);
  if (!origin?.X || !unit?.X) return null;
  const along = ((unit.X() - origin.X()) * dx + (unit.Y() - origin.Y()) * dy) / squared;
  const held: [number, number] = [origin.X() + along * dx, origin.Y() + along * dy];
  return Math.hypot(unit.X() - held[0], unit.Y() - held[1]) < 1e-9 ? null : held;
}

/**
 * Where a frame the designer did not pick goes: an origin in the middle of the
 * page with its unit point one centimetre to the right, which is the default
 * Sketchpad gives a new system.
 */
export function defaultFrame(
  originId: string,
  unitId: string,
  originName: string,
  unitName: string,
): FramePoints {
  return {
    origin: { id: originId, name: originName, coords: [0, 0] },
    unit: { id: unitId, name: unitName, coords: [1, 0] },
  };
}

/**
 * The document with the frame's grid changed, or null when there is nothing to
 * change: no frame, or settings that already say that.
 *
 * Two elements move. The origin carries the settings, written out in full so a
 * document states its frame the way the desktop stores one. The y-direction point
 * changes shape with the form, because a rectangular frame has to be draggable
 * and the others welded; `live` is where the board says it currently stands, so
 * the point the designer sees stays put as it stops being derived.
 */
export function withGrid(
  elements: HeyGeoElement[],
  next: Partial<Pick<Coordsys, 'grid' | 'showGrid' | 'snap' | 'dotted' | 'hidden'>>,
  live: (id: string) => [number, number] | null,
): HeyGeoElement[] | null {
  const sys = coordsysOf(elements);
  if (!sys) return null;
  const settings = {
    grid: next.grid ?? sys.grid,
    showGrid: next.showGrid ?? sys.showGrid,
    snap: next.snap ?? sys.snap,
    dotted: next.dotted ?? sys.dotted,
    hidden: next.hidden ?? sys.hidden,
  };
  if (settings.grid === sys.grid && settings.showGrid === sys.showGrid
    && settings.snap === sys.snap && settings.dotted === sys.dotted
    && settings.hidden === sys.hidden) {
    return null;
  }

  // Show/Hide Coordinate System is the only row that takes the frame's own
  // objects off the page; a grid row leaves what the designer hid alone.
  const shown = next.hidden === undefined ? null : !settings.hidden;
  return elements.map((el) => withSettings(el, sys, settings, live, shown));
}

/**
 * One element of the document as these settings leave it: the origin carries the
 * mark, the y-direction point takes the shape its form needs, and Show/Hide
 * Coordinate System puts every object of the frame on or off the page.
 */
function withSettings(
  el: HeyGeoElement,
  sys: Coordsys,
  settings: Pick<Coordsys, 'grid' | 'showGrid' | 'snap' | 'dotted' | 'hidden'>,
  live: (id: string) => [number, number] | null,
  shown: boolean | null,
): HeyGeoElement {
  const verticalId = `${sys.origin}_v`;
  const member = el.id === sys.origin || el.id === sys.unit
    || el.id === verticalId || el.id === `${sys.origin}_x` || el.id === `${sys.origin}_y`;
  let out = el;
  if (el.id === sys.origin) {
    // Which of several systems is marked is the designer's answer, not the grid's,
    // so the flag rides along when a grid row rewrites the rest of the mark.
    const spec = (el.attrs.coordsys ?? {}) as CoordsysSpec;
    out = { ...el, attrs: { ...el.attrs, coordsys: { ...spec, unit: sys.unit, ...settings } } };
  } else if (el.id === verticalId) {
    out = verticalElement(
      sys.origin,
      sys.unit,
      settings.grid,
      settings.grid === 'rectangular' ? live(el.id) : null,
    );
  }
  if (shown === null || !member) return out;
  // The welded y-direction point is hidden by design; showing the system only
  // shows it when the rectangular form draws it as a draggable handle, while the
  // origin, the unit point and the two axes come back with their names.
  const wanted = el.id === verticalId ? shown && settings.grid === 'rectangular' : shown;
  return { ...out, attrs: { ...out.attrs, visible: wanted, withLabel: wanted } };
}
