/**
 * Construct | Arc Sector Interior.
 *
 * The desktop's canNewArcSector asks for exactly one picked arc: newArcSector
 * hangs a G_ARCSECTOR off it, and the exporter turns that into the same three
 * parents the arc itself has — centre, start, end — with fill attributes. So
 * the sector here is the wedge the arc already spans; nothing new has to be
 * measured, only filled.
 *
 * An arc through three points would need its circumcentre as the sector's
 * first parent, and this document has no element for that point, so the row
 * stays greyed for those instead of drawing a wedge round the wrong point.
 */

export interface ArcSectorPick {
  id: string;
  /** The document type; only 'arc' stores its parents as [centre, start, end]. */
  kind: string;
  /** The picked element's parents. */
  parents: string[];
}

export interface ArcSector {
  arc: string;
  /** The arc's own parents, in the order the sector needs them. */
  parents: [string, string, string];
}

/** The sector one picked arc defines, or null when the pick is not such an arc. */
export function arcSectorPicks(picks: ArcSectorPick[]): ArcSector | null {
  if (picks.length !== 1) return null;
  const [arc] = picks;
  if (arc.kind !== 'arc') return null;
  if (arc.parents.length !== 3) return null;
  return { arc: arc.id, parents: [arc.parents[0], arc.parents[1], arc.parents[2]] };
}
