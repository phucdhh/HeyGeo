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
 */
import type { HeyGeoElement } from './designTypes';

/** The mark on the origin point: which point says how long a unit is. */
export interface CoordsysSpec {
  unit: string;
}

/** Both points a relative measurement is read against. */
export interface Coordsys {
  origin: string;
  unit: string;
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
    if (elements.some((e) => e.id === spec.unit)) return { origin: el.id, unit: spec.unit };
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

/** What the Graph menu's two frame items can do with this document and selection. */
export interface CoordsysRows {
  canNew: boolean;
  canDefine: boolean;
}

export function coordsysRows(elements: HeyGeoElement[], selection: string[]): CoordsysRows {
  const free = !hasCoordsys(elements);
  return { canNew: free, canDefine: free && frameSelection(elements, selection).length > 0 };
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
 * The five elements a coordinate system is made of, in construction order: the
 * two points that define it, the hidden point that gives the y-direction (the
 * unit point turned a quarter turn about the origin — the same shape the desktop
 * exporter writes, and what puts the arrow on the upper end of the y-axis), and
 * the two axes through them.
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

  const vertical: HeyGeoElement = {
    type: 'point',
    id: `${origin.id}_v`,
    parents: [unit.id],
    attrs: {
      ...POINT_STYLE, name: '', size: 1,
      visible: false, withLabel: false, fixed: true,
      image: { op: 'rotate', of: [origin.id], angle: 90 },
    },
  };

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
