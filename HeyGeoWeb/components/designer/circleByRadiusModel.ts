import type { MeasureOp } from './measurement';

export interface RadiusPick {
  id: string;
  /** The element kind the board reports, e.g. 'point', 'segment', 'text'. */
  kind: string;
  /** The operation a measurement caption carries, when it is one. */
  measureOp?: MeasureOp;
}

const POINT_KINDS = ['point', 'glider', 'midpoint', 'circumcenter', 'intersection'];

/** The measurements the desktop's isLengthMeasure accepts as a radius. */
const LENGTH_OPS: MeasureOp[] = ['distance', 'pointSegmentDistance', 'length', 'radius'];

/** True when this pick is a length Sketchpad can draw a circle with. */
export function isRadiusSource(pick: RadiusPick): boolean {
  if (pick.kind === 'segment') return true;
  return pick.kind === 'text' && !!pick.measureOp && LENGTH_OPS.includes(pick.measureOp);
}

/**
 * Construct | Circle By Center+Radius — the centre and the length Sketchpad
 * would build from these two picks.
 *
 * The desktop's canNewCircleCenterRadius accepts one point and one segment, or
 * one point and one distance/length/radius measurement, in either order; two
 * points are the other construction, Circle By Center+Point.
 */
export function circleByRadiusPicks(
  picks: RadiusPick[],
): { center: string; radius: string } | null {
  if (picks.length !== 2) return null;
  const center = picks.find((p) => POINT_KINDS.includes(p.kind));
  if (!center) return null;
  const radius = picks.find((p) => p !== center && isRadiusSource(p));
  if (!radius) return null;
  return { center: center.id, radius: radius.id };
}
