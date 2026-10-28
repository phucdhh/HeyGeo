/**
 * Construct | Endpoints and Construct | Center Point.
 *
 * The desktop's canNewEndpoints accepts one segment, ray or arc, and
 * canNewCenterpoint one circle or arc. For the objects this document draws, the
 * points those rows name already exist: a segment is built on its two
 * endpoints, a ray on its fixed end and the point it points through, an arc on
 * its centre and its two ends. So the row reveals the points the document
 * already lists, and they keep moving with the object instead of becoming
 * fixed copies of where they stood.
 *
 * An arc through three points names no centre, so Center Point gives it the
 * circumcentre those three points imply — a point JSXGraph builds and this
 * document can store, named 'circumcenter'.
 */

export interface PointConstructPick {
  id: string;
  /** The document type, e.g. 'segment', 'circle', 'arc'. */
  kind: string;
  parents: string[];
}

/** What each parent of a picked object means to these two rows. */
const ENDPOINTS_OF: Record<string, (parents: string[]) => string[]> = {
  segment: (p) => [p[0], p[1]],
  // a ray has one end: the second point only says which way it points
  ray: (p) => [p[0]],
  // [centre, start, end]
  arc: (p) => [p[1], p[2]],
  // [start, through, end]
  circumcirclearc: (p) => [p[0], p[2]],
};

/**
 * The points Construct | Endpoints would reveal, or null when the pick is not
 * something the desktop offers the row for.
 */
export function endpointIds(pick: PointConstructPick | null): string[] | null {
  if (!pick) return null;
  const of = ENDPOINTS_OF[pick.kind];
  if (!of) return null;
  const ids = of(pick.parents);
  if (ids.some((id) => typeof id !== 'string' || id === '')) return null;
  return ids;
}

export type CentrePoint =
  /** An existing point of the document, to be made visible. */
  | { reveal: string }
  /** The centre three points on a circle imply, to be built. */
  | { circumcentre: [string, string, string] };

/** What Construct | Center Point would make of the pick. */
export function centreOf(pick: PointConstructPick | null): CentrePoint | null {
  if (!pick) return null;
  if (pick.kind === 'circle' || pick.kind === 'arc') {
    const centre = pick.parents[0];
    return centre ? { reveal: String(centre) } : null;
  }
  if (pick.kind === 'circumcirclearc' && pick.parents.length === 3) {
    return {
      circumcentre: [String(pick.parents[0]), String(pick.parents[1]), String(pick.parents[2])],
    };
  }
  return null;
}
