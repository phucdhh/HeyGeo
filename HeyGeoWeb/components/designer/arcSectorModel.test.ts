import { describe, expect, it } from 'vitest';
import { arcSectorPicks } from './arcSectorModel';

const arc = { id: 'ar', kind: 'arc', parents: ['A', 'S', 'E'] };

describe('Construct | Arc Sector Interior', () => {
  it('fills the wedge the picked arc already spans', () => {
    expect(arcSectorPicks([arc]))
      .toEqual({ arc: 'ar', type: 'sector', parents: ['A', 'S', 'E'] });
  });

  it('keeps the arc parents in order, because the first one is the centre', () => {
    expect(arcSectorPicks([{ id: 'ar2', kind: 'arc', parents: ['O', 'P', 'Q'] }]))
      .toEqual({ arc: 'ar2', type: 'sector', parents: ['O', 'P', 'Q'] });
  });

  it('fills a three-points arc about the centre that arc already implies', () => {
    expect(arcSectorPicks([{ id: 'ca', kind: 'circumcirclearc', parents: ['S', 'E', 'A'] }]))
      .toEqual({ arc: 'ca', type: 'circumcirclesector', parents: ['S', 'E', 'A'] });
  });

  it('refuses anything but one arc', () => {
    expect(arcSectorPicks([])).toBeNull();
    expect(arcSectorPicks([arc, { id: 'ar2', kind: 'arc', parents: ['A', 'S', 'E'] }])).toBeNull();
    expect(arcSectorPicks([{ id: 'c1', kind: 'circle', parents: ['A', 'B'] }])).toBeNull();
    expect(arcSectorPicks([{ id: 'sec', kind: 'sector', parents: ['A', 'S', 'E'] }])).toBeNull();
  });

  it('refuses an arc whose parents are not the three a sector needs', () => {
    expect(arcSectorPicks([{ id: 'ar', kind: 'arc', parents: ['A', 'S'] }])).toBeNull();
    expect(arcSectorPicks([{ id: 'ar', kind: 'arc', parents: ['A', 'S', 'E', 'X'] }])).toBeNull();
  });
});
