/**
 * Construct | Arc On Circle.
 *
 * The desktop's canNewArcOnCircle asks for exactly one circle and exactly two
 * points, in any order, and builds the arc from the first point to the second
 * going counterclockwise — the same direction JSXGraph's arc takes from its
 * second and third parents. The circle itself is only what makes the two points
 * mean something: the document stores the arc as [centre, start, end], which is
 * also how the desktop exporter writes this arc, so either side can read it.
 */

export interface ArcOnCirclePick {
  id: string;
  /** The document type, e.g. 'circle', 'point', 'glider'. */
  kind: string;
}

/** What Sketchpad counts as a point when the row asks for two of them. */
const POINT_KINDS = ['point', 'glider', 'midpoint', 'intersection'];

export function isPointKind(kind: string): boolean {
  return POINT_KINDS.includes(kind);
}

export interface ArcOnCircle {
  circle: string;
  start: string;
  end: string;
}

/**
 * The circle and the two endpoints the picks describe, or null when the
 * selection is not one circle plus two points. The endpoints keep the order
 * they were picked in, because that is the direction the arc sweeps.
 */
export function arcOnCirclePicks(picks: ArcOnCirclePick[]): ArcOnCircle | null {
  if (picks.length !== 3) return null;
  const circles = picks.filter((p) => p.kind === 'circle');
  const points = picks.filter((p) => isPointKind(p.kind));
  if (circles.length !== 1 || points.length !== 2) return null;
  return { circle: circles[0].id, start: points[0].id, end: points[1].id };
}
