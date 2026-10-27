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
 */
export interface CoordsysSpec {
  unit: string;
  grid?: GridForm;
  showGrid?: boolean;
  snap?: boolean;
}

/** Both points a relative measurement is read against, and the frame's settings. */
export interface Coordsys {
  origin: string;
  unit: string;
  grid: GridForm;
  showGrid: boolean;
  snap: boolean;
}

export function isCoordsysSpec(value: unknown): value is CoordsysSpec {
  if (!value || typeof value !== 'object') return false;
  return typeof (value as Record<string, unknown>).unit === 'string';
}

/**
 * The marked frame, or null when the document has none. Both points have to still
 * be in the document: JSXGraph's cascade takes the axes away with the origin, and
 * a caption has no scale to read without the unit point.
 */
export function coordsysOf(elements: HeyGeoElement[]): Coordsys | null {
  for (const el of elements) {
    const spec = el.attrs?.coordsys as CoordsysSpec | undefined;
    if (!isCoordsysSpec(spec) || spec.unit === el.id) continue;
    if (!elements.some((e) => e.id === spec.unit)) continue;
    return {
      origin: el.id,
      unit: spec.unit,
      grid: gridFormOf(spec.grid, 'square'),
      showGrid: spec.showGrid === true,
      snap: spec.snap === true,
    };
  }
  return null;
}

/** True when the designer already has a frame; Sketchpad marks only one. */
export function hasCoordsys(elements: HeyGeoElement[]): boolean {
  return coordsysOf(elements) !== null;
}

/** Point types a frame can stand on — a slider is a number, not a place. */
const FRAME_POINT_TYPES = ['point', 'glider', 'midpoint', 'intersection'];

/**
 * The points Graph | Define Coordinate System… would mark, in the order they
 * were picked: the first is the origin, the second says how long a unit is. A
 * selection of anything but one or two points defines nothing.
 */
export function frameSelection(elements: HeyGeoElement[], selection: string[]): string[] {
  const picked = selection
    .map((id) => elements.find((e) => e.id === id))
    .filter((e): e is HeyGeoElement => !!e && FRAME_POINT_TYPES.includes(e.type));
  const enough = picked.length > 0 && picked.length <= 2;
  return enough && picked.length === selection.length ? picked.map((e) => e.id) : [];
}

/** What the Graph menu can do with this document and this selection. */
export interface GraphRows {
  canNew: boolean;
  canDefine: boolean;
  /** The desktop greys the whole grid group out until a frame is marked. */
  canGrid: boolean;
  grid: GridForm;
  showGrid: boolean;
  snap: boolean;
}

export function graphRows(elements: HeyGeoElement[], selection: string[]): GraphRows {
  const sys = coordsysOf(elements);
  return {
    canNew: sys === null,
    canDefine: sys === null && frameSelection(elements, selection).length > 0,
    canGrid: sys !== null,
    grid: sys?.grid ?? 'square',
    showGrid: sys?.showGrid ?? false,
    snap: sys?.snap ?? false,
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
function coords(el: HeyGeoElement): [number, number] | null {
  const [x, y] = el.parents;
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
  next: Partial<Pick<Coordsys, 'grid' | 'showGrid' | 'snap'>>,
  live: (id: string) => [number, number] | null,
): HeyGeoElement[] | null {
  const sys = coordsysOf(elements);
  if (!sys) return null;
  const settings = {
    grid: next.grid ?? sys.grid,
    showGrid: next.showGrid ?? sys.showGrid,
    snap: next.snap ?? sys.snap,
  };
  if (settings.grid === sys.grid && settings.showGrid === sys.showGrid && settings.snap === sys.snap) {
    return null;
  }

  const verticalId = `${sys.origin}_v`;
  return elements.map((el) => {
    if (el.id === sys.origin) {
      return { ...el, attrs: { ...el.attrs, coordsys: { unit: sys.unit, ...settings } } };
    }
    if (el.id === verticalId) {
      return verticalElement(
        sys.origin,
        sys.unit,
        settings.grid,
        settings.grid === 'rectangular' ? live(el.id) : null,
      );
    }
    return el;
  });
}
