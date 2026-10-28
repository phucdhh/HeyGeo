/**
 * Construct | Arc Sector Interior.
 *
 * The desktop's canNewArcSector asks for exactly one picked arc: newArcSector
 * hangs a G_ARCSECTOR off it, and the exporter turns that into the same parents
 * the arc itself has, filled. So the sector here is the wedge the arc already
 * spans; nothing new has to be measured, only filled.
 *
 * An arc on a circle carries [centre, start, end], which JSXGraph's `sector`
 * takes as it stands. An arc through three points carries the three points and
 * no centre — JSXGraph's `circumcirclesector` finds that centre itself and fills
 * p1 → p2 → p3, the same span `circumcirclearc` draws.
 */

export interface ArcSectorPick {
  id: string;
  /** The document type, e.g. 'arc', 'circumcirclearc'. */
  kind: string;
  /** The picked element's parents. */
  parents: string[];
}

export interface ArcSector {
  arc: string;
  /** The element that fills the wedge: the arc's own parents, as a sector. */
  type: 'sector' | 'circumcirclesector';
  parents: [string, string, string];
}

const SECTOR_OF_ARC: Record<string, ArcSector['type']> = {
  arc: 'sector',
  circumcirclearc: 'circumcirclesector',
};

/** The sector one picked arc defines, or null when the pick is not such an arc. */
export function arcSectorPicks(picks: ArcSectorPick[]): ArcSector | null {
  if (picks.length !== 1) return null;
  const [arc] = picks;
  const type = SECTOR_OF_ARC[arc.kind];
  if (!type) return null;
  if (arc.parents.length !== 3) return null;
  return { arc: arc.id, type, parents: [arc.parents[0], arc.parents[1], arc.parents[2]] };
}
